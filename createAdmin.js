const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@realestate.com' });
    
    if (existingAdmin) {
      console.log('Admin already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      process.exit(0);
    }

    // Create admin user
    const admin = new User({
      name: 'Admin',
      email: 'admin@realestate.com',
      password: 'Admin@123',
      phone: '03262238653',
      role: 'admin',
      subscriptionStatus: 'active',
      propertyLimit: 999999,
      isVerified: true
    });

    await admin.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@realestate.com');
    console.log('Password: Admin@123');
    console.log('Phone: +1234567890');
    console.log('Role: admin');
    console.log('\nNow you can login with these credentials!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();
