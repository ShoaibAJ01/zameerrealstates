const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { auth } = require('../middleware/auth');

// Get all approved feedback (public)
router.get('/', async (req, res) => {
  try {
    const feedback = await Feedback.find({ approved: true })
      .populate('user', 'name role')
      .sort('-createdAt')
      .limit(50);
    res.json(feedback);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get random feedback for display
router.get('/random', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 6;
    const feedback = await Feedback.aggregate([
      { $match: { approved: true } },
      { $sample: { size: count } },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          rating: 1,
          message: 1,
          createdAt: 1,
          'user.name': 1,
          'user.role': 1
        }
      }
    ]);
    res.json(feedback);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit feedback (authenticated users only)
router.post('/', auth, async (req, res) => {
  try {
    const { rating, message } = req.body;

    if (!rating || !message) {
      return res.status(400).json({ message: 'Rating and message are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Check if user already submitted feedback
    const existingFeedback = await Feedback.findOne({ user: req.user._id });
    if (existingFeedback) {
      return res.status(400).json({ message: 'You have already submitted feedback' });
    }

    const feedback = new Feedback({
      user: req.user._id,
      rating,
      message: message.trim()
    });

    await feedback.save();
    await feedback.populate('user', 'name role');

    res.status(201).json(feedback);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update own feedback
router.put('/:id', auth, async (req, res) => {
  try {
    const { rating, message } = req.body;
    const feedback = await Feedback.findOne({ _id: req.params.id, user: req.user._id });

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found or unauthorized' });
    }

    if (rating) feedback.rating = rating;
    if (message) feedback.message = message.trim();

    await feedback.save();
    await feedback.populate('user', 'name role');

    res.json(feedback);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete own feedback
router.delete('/:id', auth, async (req, res) => {
  try {
    const feedback = await Feedback.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found or unauthorized' });
    }

    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
