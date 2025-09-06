import express from 'express';
import TimerProfile from '../models/TimerProfile.js';

const router = express.Router();

// GET /api/timer-profiles - Get all timer profiles
router.get('/', async (req, res) => {
  try {
    const profiles = await TimerProfile.find({})
      .sort({ createdAt: 1 });

    res.json(profiles);
  } catch (error) {
    console.error('Error fetching timer profiles:', error);
    res.status(500).json({ error: 'Failed to fetch timer profiles' });
  }
});

// POST /api/timer-profiles - Create new timer profile
router.post('/', async (req, res) => {
  try {
    const profile = new TimerProfile(req.body);
    await profile.save();

    res.status(201).json(profile);
  } catch (error) {
    console.error('Error creating timer profile:', error);
    if (error.code === 11000) {
      res.status(409).json({ error: 'Timer profile with this name already exists' });
    } else {
      res.status(400).json({ error: 'Failed to create timer profile' });
    }
  }
});

// PUT /api/timer-profiles/:name - Update timer profile
router.put('/:name', async (req, res) => {
  try {
    const profile = await TimerProfile.findOneAndUpdate(
      { name: req.params.name },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({ error: 'Timer profile not found' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error updating timer profile:', error);
    res.status(400).json({ error: 'Failed to update timer profile' });
  }
});

// DELETE /api/timer-profiles/:name - Delete timer profile
router.delete('/:name', async (req, res) => {
  try {
    // Don't allow deleting the default profile
    if (req.params.name === '72/5' || req.params.name === '25/5') {
      return res.status(400).json({ error: 'Cannot delete default timer profile' });
    }

    const profile = await TimerProfile.findOneAndDelete({ name: req.params.name });

    if (!profile) {
      return res.status(404).json({ error: 'Timer profile not found' });
    }

    res.json({ message: 'Timer profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting timer profile:', error);
    res.status(500).json({ error: 'Failed to delete timer profile' });
  }
});

// POST /api/timer-profiles/bulk - Bulk create timer profiles (for sync)
router.post('/bulk', async (req, res) => {
  try {
    const { profiles } = req.body;
    
    if (!Array.isArray(profiles)) {
      return res.status(400).json({ error: 'Profiles must be an array' });
    }

    const results = await TimerProfile.insertMany(profiles, { ordered: false });

    res.json({
      inserted: results.length,
      profiles: results
    });
  } catch (error) {
    console.error('Error bulk creating timer profiles:', error);
    res.status(400).json({ error: 'Failed to create timer profiles' });
  }
});

export default router;