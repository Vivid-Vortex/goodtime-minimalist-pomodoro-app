import express from 'express';
import Label from '../models/Label.js';

const router = express.Router();

// GET /api/labels - Get all labels
router.get('/', async (req, res) => {
  try {
    const { archived } = req.query;
    
    let query = {};
    if (archived !== undefined) {
      query.archived = archived === 'true';
    }

    const labels = await Label.find(query)
      .sort({ orderIndex: 1 });

    console.log('🏷️ Server: Returning labels to client:', JSON.stringify(labels, null, 2));
    console.log('🏷️ Server: Total labels count:', labels.length);
    
    res.json(labels);
  } catch (error) {
    console.error('Error fetching labels:', error);
    res.status(500).json({ error: 'Failed to fetch labels' });
  }
});

// POST /api/labels - Create new label
router.post('/', async (req, res) => {
  try {
    const label = new Label(req.body);
    await label.save();

    res.status(201).json(label);
  } catch (error) {
    console.error('Error creating label:', error);
    if (error.code === 11000) {
      res.status(409).json({ error: 'Label with this ID already exists' });
    } else {
      res.status(400).json({ error: 'Failed to create label' });
    }
  }
});

// PUT /api/labels/:id - Update label
router.put('/:id', async (req, res) => {
  try {
    const label = await Label.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }

    res.json(label);
  } catch (error) {
    console.error('Error updating label:', error);
    res.status(400).json({ error: 'Failed to update label' });
  }
});

// DELETE /api/labels/:id - Delete label
router.delete('/:id', async (req, res) => {
  try {
    // Don't allow deleting the default label
    if (req.params.id === 'default') {
      return res.status(400).json({ error: 'Cannot delete default label' });
    }

    const label = await Label.findOneAndDelete({ id: req.params.id });

    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }

    res.json({ message: 'Label deleted successfully' });
  } catch (error) {
    console.error('Error deleting label:', error);
    res.status(500).json({ error: 'Failed to delete label' });
  }
});

// POST /api/labels/bulk - Bulk create labels (for sync)
router.post('/bulk', async (req, res) => {
  try {
    const { labels } = req.body;
    
    if (!Array.isArray(labels)) {
      return res.status(400).json({ error: 'Labels must be an array' });
    }

    const results = await Label.insertMany(labels, { ordered: false });

    res.json({
      inserted: results.length,
      labels: results
    });
  } catch (error) {
    console.error('Error bulk creating labels:', error);
    res.status(400).json({ error: 'Failed to create labels' });
  }
});

export default router;