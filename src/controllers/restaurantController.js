import Restaurant from '../models/restaurantModel.js';
import FoodItem from '../models/foodItemModel.js';
import Review from '../models/reviewModel.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';

export const getRestaurants = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const keyword = req.query.keyword
    ? {
        $or: [
          { name: { $regex: req.query.keyword, $options: 'i' } },
          { 'address.city': { $regex: req.query.keyword, $options: 'i' } },
          { tags: { $regex: req.query.keyword, $options: 'i' } },
        ],
      }
    : {};

  // Filter options
  const filter = { ...keyword, isActive: true };

  // Cuisine filter
  if (req.query.cuisine) {
    filter.cuisine = { $in: req.query.cuisine.split(',') };
  }

  // Price range filter
  if (req.query.priceRange) {
    filter.priceRange = { $in: req.query.priceRange.split(',') };
  }

  // Rating filter
  if (req.query.minRating) {
    filter['ratings.average'] = { $gte: parseFloat(req.query.minRating) };
  }

  // Location-based filter (if coordinates provided)
  if (req.query.lat && req.query.lng && req.query.maxDistance) {
    filter.location = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(req.query.lng), parseFloat(req.query.lat)],
        },
        $maxDistance: parseInt(req.query.maxDistance) * 1000, // Convert km to meters
      },
    };
  }

  // Sorting options
  let sort = {};
  if (req.query.sort) {
    switch (req.query.sort) {
      case 'rating':
        sort = { 'ratings.average': -1 };
        break;
      case 'deliveryTime':
        sort = { avgDeliveryTime: 1 };
        break;
      case 'priceLowToHigh':
        sort = { minOrderAmount: 1 };
        break;
      case 'priceHighToLow':
        sort = { minOrderAmount: -1 };
        break;
      default:
        sort = { 'ratings.average': -1 };
    }
  } else {
    // Default sort by rating
    sort = { 'ratings.average': -1 };
  }

  const restaurants = await Restaurant.find(filter)
    .populate('cuisine', 'name')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const totalRestaurants = await Restaurant.countDocuments(filter);

  res.json({
    success: true,
    data: restaurants,
    page,
    pages: Math.ceil(totalRestaurants / limit),
    total: totalRestaurants,
  });
});

export const getRestaurantById = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id)
    .populate('cuisine', 'name')
    .populate({
      path: 'reviews',
      options: { sort: { createdAt: -1 }, limit: 5 },
      populate: {
        path: 'user',
        select: 'name profilePicture',
      },
    });

  if (restaurant) {
    res.json({
      success: true,
      data: restaurant,
    });
  } else {
    res.status(404);
    throw new Error('Restaurant not found');
  }
});

export const createRestaurant = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    address,
    location,
    contact,
    cuisine,
    timings,
    priceRange,
    serviceOptions,
    deliveryRadius,
    minOrderAmount,
    avgDeliveryTime,
    deliveryFee,
    tags,
  } = req.body;

  const restaurant = await Restaurant.create({
    name,
    description,
    owner: req.user._id,
    address,
    location,
    contact,
    cuisine,
    timings,
    priceRange,
    serviceOptions,
    deliveryRadius,
    minOrderAmount,
    avgDeliveryTime,
    deliveryFee,
    tags,
  });

  if (restaurant) {
    logger.info(`New restaurant created: ${restaurant._id}`);
    
    res.status(201).json({
      success: true,
      data: restaurant,
    });
  } else {
    res.status(400);
    throw new Error('Invalid restaurant data');
  }
});

export const updateRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    res.status(404);
    throw new Error('Restaurant not found');
  }

  // Check if user is the restaurant owner or admin
  if (
    restaurant.owner.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(403);
    throw new Error('Not authorized to update this restaurant');
  }

  // Update fields
  const updatedRestaurant = await Restaurant.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  logger.info(`Restaurant updated: ${restaurant._id}`);

  res.json({
    success: true,
    data: updatedRestaurant,
  });
});

export const deleteRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    res.status(404);
    throw new Error('Restaurant not found');
  }

  await Restaurant.deleteOne({ _id: req.params.id });
  logger.info(`Restaurant deleted: ${restaurant._id}`);

  res.json({ success: true, message: 'Restaurant removed' });
});

export const getRestaurantMenu = asyncHandler(async (req, res) => {
  const foodItems = await FoodItem.find({
    restaurant: req.params.id,
    isAvailable: true,
  }).populate('category', 'name');

  res.json({
    success: true,
    data: foodItems,
  });
});

export const getRestaurantReviews = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const reviews = await Review.find({ restaurant: req.params.id })
    .populate('user', 'name profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalReviews = await Review.countDocuments({
    restaurant: req.params.id,
  });

  res.json({
    success: true,
    data: reviews,
    page,
    pages: Math.ceil(totalReviews / limit),
    total: totalReviews,
  });
});

export const getNearbyRestaurants = asyncHandler(async (req, res) => {
  const { lat, lng, distance = 5 } = req.query; // distance in km, default 5km

  if (!lat || !lng) {
    res.status(400);
    throw new Error('Latitude and longitude are required');
  }

  const restaurants = await Restaurant.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        $maxDistance: parseInt(distance) * 1000, // Convert km to meters
      },
    },
    isActive: true,
  })
    .populate('cuisine', 'name')
    .sort({ 'ratings.average': -1 })
    .limit(20);

  res.json({
    success: true,
    data: restaurants,
  });
});

export const updateRestaurantImages = asyncHandler(async (req, res) => {
  const { images, coverImage } = req.body;
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    res.status(404);
    throw new Error('Restaurant not found');
  }

  // Check ownership
  if (
    restaurant.owner.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(403);
    throw new Error('Not authorized to update this restaurant');
  }

  // Update images
  if (images) {
    restaurant.images = images;
  }

  if (coverImage) {
    restaurant.coverImage = coverImage;
  }

  await restaurant.save();
  logger.info(`Restaurant images updated: ${restaurant._id}`);

  res.json({
    success: true,
    data: {
      images: restaurant.images,
      coverImage: restaurant.coverImage,
    },
  });
});