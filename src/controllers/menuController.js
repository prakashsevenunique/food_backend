import FoodItem from '../models/foodItemModel.js';
import Restaurant from '../models/restaurantModel.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';

export const createFoodItem = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    price,
    discountedPrice,
    restaurant: restaurantId,
    category,
    veg,
    spicyLevel,
    ingredients,
    allergens,
    nutritionalInfo,
    preparationTime,
    serveSize,
    customizations,
  } = req.body;

  const restaurant = await Restaurant.findById(restaurantId);

  if (!restaurant) {
    res.status(404);
    throw new Error('Restaurant not found');
  }

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


export const uploadFoodImage = asyncHandler(async (req, res) => {
  const foodItemId = req.params.id.trim();
  const foodItem = await FoodItem.findById(foodItemId);

  if (!foodItem) {
    res.status(404);
    throw new Error('Food item not found');
  }

  // Authorization check
  if (
    foodItem.restaurant?.toString() !== req.user._id.toString() &&
    req.user.role !== 'restaurant'
  ) {
    res.status(403);
    throw new Error('Not authorized to update image for this food item');
  }

  if (!req.file) {
    res.status(400);
    throw new Error('No image file uploaded');
  }

  foodItem.image = req.file.path;
  await foodItem.save();

  res.status(200).json({
    success: true,
    message: 'Image uploaded successfully',
    data: foodItem,
  });
});

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

  const filter = { ...keyword, isAvailable: true };

  if (req.query.category) {
    filter.category = req.query.category;
  }

  if (req.query.veg === 'true') {
    filter.veg = true;
  }

  if (req.query.minPrice || req.query.maxPrice) {
    filter.price = {};
    if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
    if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
  }

  if (req.query.restaurant) {
    filter.restaurant = req.query.restaurant;
  }

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

export const updateFoodItem = asyncHandler(async (req, res) => {
  const foodItem = await FoodItem.findById(req.params.id);

  if (!foodItem) {
    res.status(404);
    throw new Error('Food item not found');
  }

  const restaurant = await Restaurant.findById(foodItem.restaurant);

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

export const deleteFoodItem = asyncHandler(async (req, res) => {
  const foodItem = await FoodItem.findById(req.params.id);

  if (!foodItem) {
    res.status(404);
    throw new Error('Food item not found');
  }

  const restaurant = await Restaurant.findById(foodItem.restaurant);

  if (
    restaurant.owner.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(403);
    throw new Error('Not authorized to delete this food item');
  }

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

export const updateAvailability = asyncHandler(async (req, res) => {
  const { isAvailable } = req.body;
  const foodItem = await FoodItem.findById(req.params.id);

  if (!foodItem) {
    res.status(404);
    throw new Error('Food item not found');
  }

  const restaurant = await Restaurant.findById(foodItem.restaurant);

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

export const getPopularFoodItems = asyncHandler(async (req, res) => {
  const popularItems = await FoodItem.find({
    isPopular: true,
    isAvailable: true,
  })
    .sort({ 'ratings.average': -1 })
    .limit(10)
    .populate('restaurant', 'name')
    .populate('category', 'name')
    .populate('quantity', 1)

  res.json({
    success: true,
    data: popularItems,
  });
});