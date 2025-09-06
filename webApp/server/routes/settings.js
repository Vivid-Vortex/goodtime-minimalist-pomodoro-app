import express from 'express';
import AppSetting from '../models/AppSetting.js';

const router = express.Router();

// GET /api/settings/:key - Get specific setting
router.get('/:key', async (req, res) => {
  try {
    const setting = await AppSetting.findOne({ key: req.params.key });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ key: setting.key, value: setting.value });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// PUT /api/settings/:key - Update setting
router.put('/:key', async (req, res) => {
  try {
    const { value } = req.body;

    const setting = await AppSetting.findOneAndUpdate(
      { key: req.params.key },
      { 
        key: req.params.key, 
        value, 
        updatedAt: new Date() 
      },
      { 
        new: true, 
        upsert: true, 
        runValidators: true 
      }
    );

    res.json({ key: setting.key, value: setting.value });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(400).json({ error: 'Failed to update setting' });
  }
});

// GET /api/settings - Get all settings
router.get('/', async (req, res) => {
  try {
    const settings = await AppSetting.find({})
      .sort({ key: 1 });

    const settingsObject = {};
    settings.forEach(setting => {
      settingsObject[setting.key] = setting.value;
    });

    res.json(settingsObject);
  } catch (error) {
    console.error('Error fetching all settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST /api/settings/bulk - Bulk update settings
router.post('/bulk', async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings must be an object' });
    }

    const operations = Object.entries(settings).map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { 
          key, 
          value, 
          updatedAt: new Date() 
        },
        upsert: true
      }
    }));

    const result = await AppSetting.bulkWrite(operations);

    res.json({
      modified: result.modifiedCount,
      inserted: result.upsertedCount,
      total: result.modifiedCount + result.upsertedCount
    });
  } catch (error) {
    console.error('Error bulk updating settings:', error);
    res.status(400).json({ error: 'Failed to update settings' });
  }
});

// DELETE /api/settings/:key - Delete setting
router.delete('/:key', async (req, res) => {
  try {
    const setting = await AppSetting.findOneAndDelete({ key: req.params.key });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

export default router;