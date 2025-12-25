const mongoose = require('mongoose');
const Subscription = require('./models/Subscription');
require('dotenv').config();

const seedSubscriptions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Delete existing plans
    await Subscription.deleteMany({});
    console.log('Cleared existing plans');

    // Create subscription plans
    const plans = [
      {
        name: 'Free',
        price: 0,
        duration: 365,
        propertyLimit: 1,
        description: 'Perfect for getting started',
        features: [
          '1 Property Listing',
          'Basic Support',
          '30 Days Listing Duration',
          'Standard Visibility'
        ],
        isActive: true
      },
      {
        name: 'Basic',
        price: 29,
        duration: 30,
        propertyLimit: 5,
        description: 'Great for individual sellers',
        features: [
          '5 Property Listings',
          'Priority Support',
          '60 Days Listing Duration',
          'Enhanced Visibility',
          'Featured Badge'
        ],
        isActive: true
      },
      {
        name: 'Professional',
        price: 79,
        duration: 30,
        propertyLimit: 20,
        description: 'Ideal for real estate agents',
        features: [
          '20 Property Listings',
          '24/7 Premium Support',
          '90 Days Listing Duration',
          'Maximum Visibility',
          'Featured Badge',
          'Analytics Dashboard',
          'Priority Placement'
        ],
        isActive: true
      },
      {
        name: 'Enterprise',
        price: 199,
        duration: 30,
        propertyLimit: 100,
        description: 'For real estate agencies',
        features: [
          '100 Property Listings',
          'Dedicated Account Manager',
          'Unlimited Listing Duration',
          'Premium Visibility',
          'Featured Badge',
          'Advanced Analytics',
          'API Access',
          'White Label Options',
          'Custom Branding'
        ],
        isActive: true
      }
    ];

    const createdPlans = await Subscription.insertMany(plans);
    
    console.log('\n✅ Subscription plans created successfully!\n');
    createdPlans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.name} - $${plan.price}/month`);
      console.log(`   ID: ${plan._id}`);
      console.log(`   Property Limit: ${plan.propertyLimit}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding subscriptions:', error);
    process.exit(1);
  }
};

seedSubscriptions();
