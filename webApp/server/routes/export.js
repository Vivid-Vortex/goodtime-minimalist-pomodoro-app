import express from 'express';
import Session from '../models/Session.js';
import Label from '../models/Label.js';

const router = express.Router();

// GET /api/export - Export data in the specified format
router.get('/', async (req, res) => {
  try {
    const { format = 'json', archived = 'false' } = req.query;
    
    // Get sessions and labels
    const [sessions, labels] = await Promise.all([
      Session.find({ 
        archived: archived === 'true' ? true : { $ne: true }
      }).sort({ end: -1 }),
      Label.find({})
    ]);

    // Create label lookup map
    const labelMap = new Map();
    labels.forEach(label => {
      labelMap.set(label.id, label.title);
    });

    // Transform sessions to match the desired Android format
    const transformedSessions = sessions.map(session => ({
      archived: session.archived || false,
      duration: Math.round(session.duration / 60), // Convert seconds to minutes if needed
      end: session.end.toISOString(),
      interruptions: session.interruptions || 0,
      is_break: session.is_break,
      label: labelMap.get(session.label) || session.label || 'Default',
      notes: session.notes || ""
    }));

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader = 'archived,duration,end,interruptions,is_break,label,notes\n';
      const csvRows = transformedSessions.map(session => 
        `${session.archived},${session.duration},"${session.end}",${session.interruptions},${session.is_break},"${session.label}","${session.notes}"`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="goodtime-sessions.csv"');
      res.send(csvHeader + csvRows);
    } else {
      // Default JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="goodtime-sessions.json"');
      res.json(transformedSessions);
    }

  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// GET /api/export/stats - Export detailed statistics
router.get('/stats', async (req, res) => {
  try {
    const [sessionStats, labelStats] = await Promise.all([
      // Overall session statistics
      Session.aggregate([
        {
          $match: { archived: { $ne: true } }
        },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            focusSessions: {
              $sum: { $cond: [{ $eq: ['$is_break', false] }, 1, 0] }
            },
            breakSessions: {
              $sum: { $cond: [{ $eq: ['$is_break', true] }, 1, 0] }
            },
            totalFocusTime: {
              $sum: { $cond: [{ $eq: ['$is_break', false] }, '$duration', 0] }
            },
            totalBreakTime: {
              $sum: { $cond: [{ $eq: ['$is_break', true] }, '$duration', 0] }
            },
            averageSessionDuration: { $avg: '$duration' },
            totalInterruptions: { $sum: '$interruptions' }
          }
        }
      ]),

      // Statistics by label
      Session.aggregate([
        {
          $match: { archived: { $ne: true } }
        },
        {
          $group: {
            _id: '$label',
            sessionsCount: { $sum: 1 },
            focusTime: {
              $sum: { $cond: [{ $eq: ['$is_break', false] }, '$duration', 0] }
            },
            breakTime: {
              $sum: { $cond: [{ $eq: ['$is_break', true] }, '$duration', 0] }
            },
            totalInterruptions: { $sum: '$interruptions' },
            avgSessionDuration: { $avg: '$duration' }
          }
        },
        {
          $sort: { focusTime: -1 }
        }
      ])
    ]);

    const stats = {
      overall: sessionStats[0] || {
        totalSessions: 0,
        focusSessions: 0,
        breakSessions: 0,
        totalFocusTime: 0,
        totalBreakTime: 0,
        averageSessionDuration: 0,
        totalInterruptions: 0
      },
      byLabel: labelStats,
      exportDate: new Date().toISOString()
    };

    res.json(stats);

  } catch (error) {
    console.error('Error exporting stats:', error);
    res.status(500).json({ error: 'Failed to export statistics' });
  }
});

export default router;