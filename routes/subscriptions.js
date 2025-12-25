const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const UserSubscription = require('../models/UserSubscription');
const User = require('../models/User');
const { auth, isAdmin } = require('../middleware/auth');

// Get all subscription plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await Subscription.find({ isActive: true }).sort({ price: 1 });
    res.json(plans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create subscription plan (Admin only)
router.post('/plans', auth, isAdmin, async (req, res) => {
  try {
    const subscription = new Subscription(req.body);
    await subscription.save();
    res.status(201).json(subscription);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Subscribe to a plan
router.post('/subscribe/:planId', auth, async (req, res) => {
  try {
    const plan = await Subscription.findById(req.params.planId);
    
    if (!plan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    const user = await User.findById(req.user._id);

    // Calculate end date
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    // Create user subscription
    const userSubscription = new UserSubscription({
      user: user._id,
      subscription: plan._id,
      endDate,
      paymentMethod: req.body.paymentMethod || 'pending',
      transactionId: req.body.transactionId || ''
    });

    await userSubscription.save();

    // Update user
    user.subscription = plan._id;
    user.subscriptionStatus = 'active';
    user.subscriptionExpiry = endDate;
    user.propertyLimit = plan.propertyLimit;
    
    await user.save();

    res.json({ 
      message: 'Subscription activated successfully',
      subscription: userSubscription,
      user: {
        subscriptionStatus: user.subscriptionStatus,
        propertyLimit: user.propertyLimit,
        subscriptionExpiry: user.subscriptionExpiry
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's current subscription
router.get('/my-subscription', auth, async (req, res) => {
  try {
    const userSubscription = await UserSubscription.findOne({ 
      user: req.user._id,
      status: 'active'
    }).populate('subscription');

    res.json(userSubscription);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel subscription
router.post('/cancel', auth, async (req, res) => {
  try {
    const userSubscription = await UserSubscription.findOne({ 
      user: req.user._id,
      status: 'active'
    });

    if (!userSubscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    userSubscription.status = 'cancelled';
    await userSubscription.save();

    const user = await User.findById(req.user._id);
    user.subscriptionStatus = 'cancelled';
    await user.save();

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
