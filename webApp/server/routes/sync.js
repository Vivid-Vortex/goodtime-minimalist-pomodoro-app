import express from 'express';
import Session from '../models/Session.js';
import Label from '../models/Label.js';
import TimerProfile from '../models/TimerProfile.js';

const router = express.Router();

// POST /api/sync - Sync data from client to server
router.post('/', async (req, res) => {
  try {
    const { sessions, labels, timerProfiles } = req.body;
    const results = {
      sessions: { inserted: 0, updated: 0, errors: [] },
      labels: { inserted: 0, updated: 0, errors: [] },
      timerProfiles: { inserted: 0, updated: 0, errors: [] }
    };

    // Sync sessions
    if (Array.isArray(sessions)) {
      for (const sessionData of sessions) {
        try {
          const existingSession = await Session.findOne({ id: sessionData.id });
          if (existingSession) {
            await Session.updateOne(
              { id: sessionData.id },
              { 
                ...sessionData,
                end: new Date(sessionData.endTime || sessionData.end),
                updatedAt: new Date() 
              }
            );
            results.sessions.updated++;
          } else {
            const session = new Session({
              ...sessionData,
              end: new Date(sessionData.endTime || sessionData.end),
              label: sessionData.labelId || sessionData.label,
              is_break: sessionData.timerType === 'BREAK' || sessionData.timerType === 'LONG_BREAK' || sessionData.is_break,
              duration: sessionData.duration || 0
            });
            await session.save();
            results.sessions.inserted++;
          }
        } catch (error) {
          console.error('Error syncing session:', sessionData.id, error);
          results.sessions.errors.push({
            id: sessionData.id,
            error: error.message
          });
        }
      }
    }

    // Sync labels
    if (Array.isArray(labels)) {
      for (const labelData of labels) {
        try {
          const existingLabel = await Label.findOne({ id: labelData.id });
          if (existingLabel) {
            await Label.updateOne(
              { id: labelData.id },
              { ...labelData, updatedAt: new Date() }
            );
            results.labels.updated++;
          } else {
            const label = new Label(labelData);
            await label.save();
            results.labels.inserted++;
          }
        } catch (error) {
          console.error('Error syncing label:', labelData.id, error);
          results.labels.errors.push({
            id: labelData.id,
            error: error.message
          });
        }
      }
    }

    // Sync timer profiles
    if (Array.isArray(timerProfiles)) {
      for (const profileData of timerProfiles) {
        try {
          const existingProfile = await TimerProfile.findOne({ name: profileData.name });
          if (existingProfile) {
            await TimerProfile.updateOne(
              { name: profileData.name },
              { ...profileData, updatedAt: new Date() }
            );
            results.timerProfiles.updated++;
          } else {
            const profile = new TimerProfile(profileData);
            await profile.save();
            results.timerProfiles.inserted++;
          }
        } catch (error) {
          console.error('Error syncing timer profile:', profileData.name, error);
          results.timerProfiles.errors.push({
            name: profileData.name,
            error: error.message
          });
        }
      }
    }

    res.json({
      success: true,
      results,
      message: `Sync completed: ${results.sessions.inserted + results.sessions.updated} sessions, ${results.labels.inserted + results.labels.updated} labels, ${results.timerProfiles.inserted + results.timerProfiles.updated} profiles`
    });

  } catch (error) {
    console.error('Error during sync:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Sync failed',
      details: error.message 
    });
  }
});

// GET /api/sync/changes - Get changes since timestamp
router.get('/changes', async (req, res) => {
  try {
    const { since, deviceId } = req.query;
    const sinceDate = since ? new Date(parseInt(since)) : new Date(0);

    // Get all changes since the given timestamp, excluding changes from the same device
    const [sessions, labels, timerProfiles] = await Promise.all([
      Session.find({
        updatedAt: { $gt: sinceDate },
        deviceId: { $ne: deviceId }
      }).sort({ updatedAt: 1 }),
      
      Label.find({
        updatedAt: { $gt: sinceDate },
        deviceId: { $ne: deviceId }
      }).sort({ updatedAt: 1 }),
      
      TimerProfile.find({
        updatedAt: { $gt: sinceDate },
        deviceId: { $ne: deviceId }
      }).sort({ updatedAt: 1 })
    ]);

    const changes = [];

    // Add session changes
    sessions.forEach(session => {
      changes.push({
        type: 'SESSION_UPDATED',
        data: session,
        timestamp: session.updatedAt.getTime(),
        deviceId: session.deviceId
      });
    });

    // Add label changes
    labels.forEach(label => {
      changes.push({
        type: 'LABEL_UPDATED',
        data: label,
        timestamp: label.updatedAt.getTime(),
        deviceId: label.deviceId
      });
    });

    // Add timer profile changes
    timerProfiles.forEach(profile => {
      changes.push({
        type: 'PROFILE_UPDATED',
        data: profile,
        timestamp: profile.updatedAt.getTime(),
        deviceId: profile.deviceId
      });
    });

    // Sort by timestamp
    changes.sort((a, b) => a.timestamp - b.timestamp);

    res.json(changes);

  } catch (error) {
    console.error('Error fetching changes:', error);
    res.status(500).json({ error: 'Failed to fetch changes' });
  }
});

export default router;