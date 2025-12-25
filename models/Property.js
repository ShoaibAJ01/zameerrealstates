const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  propertyType: {
    type: String,
    required: true,
    enum: ['house', 'apartment', 'villa', 'land', 'commercial', 'office']
  },
  listingType: {
    type: String,
    required: true,
    enum: ['sale', 'rent']
  },
  bedrooms: {
    type: Number,
    default: 0
  },
  bathrooms: {
    type: Number,
    default: 0
  },
  area: {
    type: Number,
    required: true // in square feet or meters
  },
  width: {
    type: Number,
    default: 0 // width in feet
  },
  height: {
    type: Number,
    default: 0 // height/length in feet
  },
  facing: {
    type: String,
    enum: ['front', 'corner', 'main-road', 'back', 'side'],
    default: 'front'
  },
  address: {
    street: String,
    city: { type: String, required: true },
    state: String,
    country: { type: String, required: true },
    zipCode: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  images: [{
    type: String
  }],
  videos: [{
    type: String
  }],
  features: [{
    type: String
  }],
  amenities: [{
    type: String
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'sold', 'rented', 'pending'],
    default: 'available'
  },
  featured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for geospatial queries
propertySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Property', propertySchema);
