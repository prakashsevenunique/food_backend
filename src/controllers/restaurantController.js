import Restaurant from '../models/restaurantModel.js';
import FoodItem from '../models/foodItemModel.js';
import Review from '../models/reviewModel.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';

export const getRestaurants = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    keyword,
    cuisine,
    priceRange,
    minRating,
    lat,
    lng,
    maxDistance,
    sort,
  } = req.query;

  const pageNumber = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const skip = (pageNumber - 1) * pageSize;

  const filter = { isActive: true };

  if (keyword) {
    filter.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { 'address.city': { $regex: keyword, $options: 'i' } },
      { tags: { $regex: keyword, $options: 'i' } },
    ];
  }

  if (cuisine) {
    filter.cuisine = { $in: cuisine.split(',') };
  }

  if (priceRange) {
    filter.priceRange = { $in: priceRange.split(',') };
  }

  if (minRating) {
    filter['ratings.average'] = { $gte: parseFloat(minRating) };
  }

  const pipeline = [];

  // Step 1: Geo filter or simple match
  if (lat && lng) {
    const geoNearStage = {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        distanceField: 'distance',
        spherical: true,
        query: filter,
      },
    };

    if (maxDistance) {
      geoNearStage.$geoNear.maxDistance = parseInt(maxDistance, 10) * 1000;
    }

    pipeline.push(geoNearStage);
  } else {
    pipeline.push({ $match: filter });
  }

  // Step 2: Populate cuisine using $lookup
  pipeline.push({
    $lookup: {
      from: 'categories',
      localField: 'cuisine',
      foreignField: '_id',
      as: 'cuisine',
    },
  });

  // Optional: only return specific fields from cuisine (name, _id)
  pipeline.push({
    $project: {
      name: 1,
      description: 1,
      address: 1,
      location: 1,
      rating: 1,
      avgDeliveryTime: 1,
      minOrderAmount: 1,
      deliveryFee: 1,
      distance: 1,
      tags: 1,
      coverImage: 1,
      cuisine: {
        $map: {
          input: '$cuisine',
          as: 'c',
          in: { _id: '$$c._id', name: '$$c.name' },
        },
      },
    },
  });

  // Step 3: Sorting
  let sortStage = {};
  switch (sort) {
    case 'rating':
      sortStage = { 'ratings.average': -1 };
      break;
    case 'deliveryTime':
      sortStage = { avgDeliveryTime: 1 };
      break;
    case 'priceLowToHigh':
      sortStage = { minOrderAmount: 1 };
      break;
    case 'priceHighToLow':
      sortStage = { minOrderAmount: -1 };
      break;
    default:
      sortStage = { 'ratings.average': -1 };
  }

  pipeline.push({ $sort: sortStage });
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: pageSize });

  // Step 4: Execute aggregation
  const restaurants = await Restaurant.aggregate(pipeline);

  // Step 5: Count total documents for pagination
  const countPipeline = [];

  if (lat && lng) {
    const geoNearStage = {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        distanceField: 'distance',
        spherical: true,
        query: filter,
      },
    };

    if (maxDistance) {
      geoNearStage.$geoNear.maxDistance = parseInt(maxDistance, 10) * 1000;
    }

    countPipeline.push(geoNearStage);
  } else {
    countPipeline.push({ $match: filter });
  }

  countPipeline.push({ $count: 'total' });
  const countResult = await Restaurant.aggregate(countPipeline);
  const totalRestaurants = countResult[0]?.total || 0;

  // Step 6: Send response
  res.json({
    success: true,
    data: restaurants,
    page: pageNumber,
    pages: Math.ceil(totalRestaurants / pageSize),
    total: totalRestaurants,
  });
});

export const getRestaurantById = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id)
    .populate('owner', 'name email profilePicture') 
    .populate('cuisine', 'name')
    .populate({
      path: 'menu',
      populate: {
        path: 'category',
        select: 'name'
      }
    })
    .populate({
      path: 'reviews',
      options: { sort: { createdAt: -1 }, limit: 5 },
      populate: {
        path: 'user',
        select: 'name profilePicture',
      },
    });

  if (restaurant) {
    if (restaurant.reviews && restaurant.reviews.length > 0) {
      const total = restaurant.reviews.reduce((sum, review) => sum + review.rating, 0);
      restaurant.rating = parseFloat((total / restaurant.reviews.length).toFixed(1));
    }
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
    image,
    distance,
    deliveryTime,
    rating,
    offers,
    discount,
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
    image,
    distance,
    deliveryTime,
    rating,
    offers,
    discount,
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

  if (
    restaurant.owner.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(403);
    throw new Error('Not authorized to update this restaurant');
  }

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
  const { lat, lng, distance = 5 } = req.query; 

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
        $maxDistance: parseInt(distance) * 1000,
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

  if (
    restaurant.owner.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(403);
    throw new Error('Not authorized to update this restaurant');
  }

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