import express from 'express';
import Session from '../models/Session.js';

const router = express.Router();

// GET /api/sessions - Get all sessions
router.get('/', async (req, res) => {
  try {
    const { archived, limit, offset, label } = req.query;
    
    let query = {};
    if (archived !== undefined) {
      query.archived = archived === 'true';
    }
    if (label) {
      query.label = label;
    }

    const sessions = await Session.find(query)
      .sort({ end: -1 })
      .limit(limit ? parseInt(limit) : 1000)
      .skip(offset ? parseInt(offset) : 0);

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// POST /api/sessions - Create new session
router.post('/', async (req, res) => {
  try {
    const sessionData = {
      ...req.body,
      end: new Date(req.body.end || Date.now())
    };

    const session = new Session(sessionData);
    await session.save();

    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    if (error.code === 11000) {
      res.status(409).json({ error: 'Session with this ID already exists' });
    } else {
      res.status(400).json({ error: 'Failed to create session' });
    }
  }
});

// PUT /api/sessions/:id - Update session
router.put('/:id', async (req, res) => {
  try {
    const session = await Session.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(400).json({ error: 'Failed to update session' });
  }
});

// DELETE /api/sessions/:id - Delete session
router.delete('/:id', async (req, res) => {
  try {
    const session = await Session.findOneAndDelete({ id: req.params.id });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// GET /api/sessions/stats - Get session statistics
router.get('/stats', async (req, res) => {
  try {
    const pipeline = [
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
          averageSessionDuration: { $avg: '$duration' }
        }
      }
    ];

    const stats = await Session.aggregate(pipeline);
    
    const result = stats[0] || {
      totalSessions: 0,
      focusSessions: 0,
      breakSessions: 0,
      totalFocusTime: 0,
      totalBreakTime: 0,
      averageSessionDuration: 0
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// POST /api/sessions/bulk - Bulk create sessions (for sync)
router.post('/bulk', async (req, res) => {
  try {
    const { sessions } = req.body;
    
    if (!Array.isArray(sessions)) {
      return res.status(400).json({ error: 'Sessions must be an array' });
    }

    const results = await Session.insertMany(
      sessions.map(session => ({
        ...session,
        end: new Date(session.end || Date.now())
      })),
      { ordered: false } // Continue even if some fail
    );

    res.json({
      inserted: results.length,
      sessions: results
    });
  } catch (error) {
    console.error('Error bulk creating sessions:', error);
    res.status(400).json({ error: 'Failed to create sessions' });
  }
});

export default router;