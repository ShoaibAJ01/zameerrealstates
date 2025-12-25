const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Property = require('../models/Property');
const { auth, isAdmin } = require('../middleware/auth');

// Get admin info for contact display
router.get('/admin-info', async (req, res) => {
  try {
    const admin = await User.findOne({ role: 'admin' })
      .select('name email phone');
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json(admin);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (for admin assignment)
router.get('/all', auth, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('subscription');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (Admin only)
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('subscription');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -email')
      .populate('subscription');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const properties = await Property.find({ owner: user._id, status: 'available' });

    res.json({ user, properties });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, avatar },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (Admin only)
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Property.deleteMany({ owner: req.params.id });
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Block user (Admin only)
router.patch('/:id/block', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot block admin users' });
    }

    user.blocked = true;
    user.blockedAt = new Date();
    await user.save();

    res.json({ message: 'User blocked successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unblock user (Admin only)
router.patch('/:id/unblock', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.blocked = false;
    user.blockedAt = null;
    await user.save();

    res.json({ message: 'User unblocked successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
