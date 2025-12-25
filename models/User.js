const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: false
  },
  role: {
    type: String,
    enum: ['user', 'agent', 'admin'],
    default: 'user'
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null
  },
  subscriptionStatus: {
    type: String,
    enum: ['free', 'active', 'expired', 'cancelled'],
    default: 'free'
  },
  subscriptionExpiry: {
    type: Date,
    default: null
  },
  propertiesPosted: {
    type: Number,
    default: 0
  },
  propertyLimit: {
    type: Number,
    default: 1 // Free users can post 1 property
  },
  avatar: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  blocked: {
    type: Boolean,
    default: false
  },
  blockedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
