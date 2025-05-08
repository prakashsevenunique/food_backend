import FoodItem from '../models/foodItemModel.js';
import Restaurant from '../models/restaurantModel.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';

// @desc    Create a new food item
// @route   POST /api/menus
// @access  Private/Restaurant
export const createFoodItem = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    price,
    discountedPrice,
    restaurant: restaurantId,
    category,
    image,
    veg,
    spicyLevel,
    ingredients,
    allergens,
    nutritionalInfo,
    preparationTime,
    serveSize,
    customizations,
  } = req.body;

  // Check if restaurant exists and if user is the owner
  const restaurant = await Restaurant.findById(restaurantId);
  
  if (!restaurant) {
    res.status(404);
    throw new Error('Restaurant not found');
  }

  // Verify ownership or admin rights
  if (
    restaurant.owner.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(403);
    throw new Error('Not authorized to add items to this restaurant');
  }

  const foodItem = await FoodItem.create({
    name,
    description,
    price,
    discountedPrice,
    restaurant: restaurantId,
    category,
    image,
    veg,
    spicyLevel,
    ingredients,
    allergens,
    nutritionalInfo,
    preparationTime,
    serveSize,
    customizations,
  });

  if (foodItem) {
    // Add food item to restaurant's menu array
    await Restaurant.findByIdAndUpdate(restaurantId, {
      $push: { menu: foodItem._id },
    });

    logger.info(`New food item created: ${foodItem._id}`);
    
    res.status(201).json({
      success: true,
      data: foodItem,
    });
  } else {
    res.status(400);
    throw new Error('Invalid food item data');
  }
});

// @desc    Get all food items
// @route   GET /api/menus
// @access  Public
export const getFoodItems = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const keyword = req.query.keyword
    ? {
        $or: [
          { name: { $regex: req.query.keyword, $options: 'i' } },
          { description: { $regex: req.query.keyword, $options: 'i' } },
          { ingredients: { $regex: req.query.keyword, $options: 'i' } },
        ],
      }
    : {};

  // Filter options
  const filter = { ...keyword, isAvailable: true };

  // Category filter
  if (req.query.category) {
    filter.category = req.query.category;
  }

  // Veg filter
  if (req.query.veg === 'true') {
    filter.veg = true;
  }

  // Price range filter
  if (req.query.minPrice || req.query.maxPrice) {
    filter.price = {};
    if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
    if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
  }

  // Restaurant filter
  if (req.query.restaurant) {
    filter.restaurant = req.query.restaurant;
  }

  // Spicy level filter
  if (req.query.spicyLevel) {
    filter.spicyLevel = req.query.spicyLevel;
  }

  const foodItems = await FoodItem.find(filter)
    .populate('restaurant', 'name')
    .populate('category', 'name')
    .sort(req.query.sort ? { [req.query.sort]: 1 } : { createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalFoodItems = await FoodItem.countDocuments(filter);

  res.json({
    success: true,
    data: foodItems,
    page,
    pages: Math.ceil(totalFoodItems / limit),
    total: totalFoodItems,
  });
});

// @desc    Get food item by ID
// @route   GET /api/menus/:id
// @access  Public
export const getFoodItemById = asyncHandler(async (req, res) => {
  const foodItem = await FoodItem.findById(req.params.id)
    .populate('restaurant', 'name address contact')
    .populate('category', 'name');

  if (foodItem) {
    res.json({
      success: true,
      data: foodItem,
    });
  } else {
    res.status(404);
    throw new Error('Food item not found');
  }
});

// @desc    Update a food item
// @route   PUT /api/menus/:id
// @access  Private/Restaurant
export const updateFoodItem = asyncHandler(async (req, res) => {
  const foodItem = await FoodItem.findById(req.params.id);

  if (!foodItem) {
    res.status(404);
    throw new Error('Food item not found');
  }

  const restaurant = await Restaurant.findById(foodItem.restaurant);

  // Verify ownership or admin rights
  if (
    restaurant.owner.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(403);
    throw new Error('Not authorized to update this food item');
  }

  const updatedFoodItem = await FoodItem.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  logger.info(`Food item updated: ${foodItem._id}`);

  res.json({
    success: true,
    data: updatedFoodItem,
  });
});

// @desc    Delete a food item
// @route   DELETE /api/menus/:id
// @access  Private/Restaurant
export const deleteFoodItem = asyncHandler(async (req, res) => {
  const foodItem = await FoodItem.findById(req.params.id);

  if (!foodItem) {
    res.status(404);
    throw new Error('Food item not found');
  }

  const restaurant = await Restaurant.findById(foodItem.restaurant);

  // Verify ownership or admin rights
  if (
    restaurant.owner.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(403);
    throw new Error('Not authorized to delete this food item');
  }

  // Remove food item from restaurant's menu array
  await Restaurant.findByIdAndUpdate(foodItem.restaurant, {
    $pull: { menu: foodItem._id },
  });

  await FoodItem.deleteOne({ _id: req.params.id });
  logger.info(`Food item deleted: ${foodItem._id}`);

  res.json({
    success: true,
    message: 'Food item removed',
  });
});

// @desc    Update food item availability
// @route   PATCH /api/menus/:id/availability
// @access  Private/Restaurant
export const updateAvailability = asyncHandler(async (req, res) => {
  const { isAvailable } = req.body;
  const foodItem = await FoodItem.findById(req.params.id);

  if (!foodItem) {
    res.status(404);
    throw new Error('Food item not found');
  }

  const restaurant = await Restaurant.findById(foodItem.restaurant);

  // Verify ownership or admin rights
  if (
    restaurant.owner.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(403);
    throw new Error('Not authorized to update this food item');
  }

  foodItem.isAvailable = isAvailable;
  await foodItem.save();

  logger.info(`Food item availability updated: ${foodItem._id}`);

  res.json({
    success: true,
    data: {
      _id: foodItem._id,
      name: foodItem.name,
      isAvailable: foodItem.isAvailable,
    },
  });
});

// @desc    Get popular food items
// @route   GET /api/menus/popular
// @access  Public
export const getPopularFoodItems = asyncHandler(async (req, res) => {
  const popularItems = await FoodItem.find({
    isPopular: true,
    isAvailable: true,
  })
    .sort({ 'ratings.average': -1 })
    .limit(10)
    .populate('restaurant', 'name')
    .populate('category', 'name');

  res.json({
    success: true,
    data: popularItems,
  });
});