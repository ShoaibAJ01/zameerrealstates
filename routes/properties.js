const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const User = require('../models/User');
const { auth, isAgent } = require('../middleware/auth');

// Get all properties with filters
router.get('/', async (req, res) => {
  try {
    const {
      propertyType,
      listingType,
      minPrice,
      maxPrice,
      city,
      bedrooms,
      bathrooms,
      minArea,
      maxArea,
      search,
      page = 1,
      limit = 12
    } = req.query;

    let query = { status: 'available' };

    if (propertyType) query.propertyType = propertyType;
    if (listingType) query.listingType = listingType;
    if (city) query['address.city'] = new RegExp(city, 'i');
    if (bedrooms) query.bedrooms = { $gte: parseInt(bedrooms) };
    if (bathrooms) query.bathrooms = { $gte: parseInt(bathrooms) };
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }

    if (minArea || maxArea) {
      query.area = {};
      if (minArea) query.area.$gte = parseInt(minArea);
      if (maxArea) query.area.$lte = parseInt(maxArea);
    }

    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { 'address.city': new RegExp(search, 'i') }
      ];
    }

    const properties = await Property.find(query)
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Property.countDocuments(query);

    res.json({
      properties,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single property
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('owner', 'name email phone avatar');
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Increment views
    property.views += 1;
    await property.save();

    res.json(property);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create property (protected route)
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Check if user has reached property limit
    if (user.propertiesPosted >= user.propertyLimit) {
      return res.status(403).json({ 
        message: 'Property limit reached. Please upgrade your subscription.' 
      });
    }

    const property = new Property({
      ...req.body,
      owner: req.user._id
    });

    await property.save();

    // Update user's property count
    user.propertiesPosted += 1;
    await user.save();

    res.status(201).json(property);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update property
router.put('/:id', auth, async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check ownership
    if (property.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    property = await Property.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );

    res.json(property);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete property
router.delete('/:id', auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check ownership
    if (property.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Property.findByIdAndDelete(req.params.id);

    // Update user's property count
    const user = await User.findById(req.user._id);
    user.propertiesPosted = Math.max(0, user.propertiesPosted - 1);
    await user.save();

    res.json({ message: 'Property deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's properties
router.get('/user/my-properties', auth, async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user._id })
      .sort({ createdAt: -1 });
    res.json(properties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get all properties
router.get('/admin/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const properties = await Property.find()
      .populate('owner', 'name email role')
      .sort({ createdAt: -1 });
    res.json(properties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Update property status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { status } = req.body;
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('owner', 'name email');

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.json(property);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
