import Cart from '../models/cartModel.js';
import FoodItem from '../models/foodItemModel.js';
import Restaurant from '../models/restaurantModel.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';

// @desc    Get or create user cart
// @route   GET /api/cart
// @access  Private
export const getCart = asyncHandler(async (req, res) => {
  // Find user's cart or create a new one
  let cart = await Cart.findOne({ user: req.user._id })
    .populate({
      path: 'items.foodItem',
      select: 'name price discountedPrice image veg isAvailable restaurant',
      populate: {
        path: 'restaurant',
        select: 'name',
      },
    })
    .populate('restaurant', 'name deliveryFee minOrderAmount');

  // If no cart exists, create one
  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      items: [],
      totalItems: 0,
      subtotal: 0,
      taxAmount: 0,
      deliveryFee: 0,
      finalAmount: 0,
    });
  }

  // Check if any items in cart are no longer available
  const unavailableItems = [];
  
  if (cart.items && cart.items.length > 0) {
    for (const item of cart.items) {
      if (!item.foodItem || !item.foodItem.isAvailable) {
        unavailableItems.push(item._id);
      }
    }
    
    // If any items are unavailable, remove them
    if (unavailableItems.length > 0) {
      await Cart.updateOne(
        { _id: cart._id },
        { $pull: { items: { _id: { $in: unavailableItems } } } }
      );
      
      // Refetch cart
      cart = await Cart.findById(cart._id)
        .populate({
          path: 'items.foodItem',
          select: 'name price discountedPrice image veg isAvailable restaurant',
          populate: {
            path: 'restaurant',
            select: 'name',
          },
        })
        .populate('restaurant', 'name deliveryFee minOrderAmount');
        
      // Recalculate cart totals
      await recalculateCart(cart._id);
      cart = await Cart.findById(cart._id)
        .populate({
          path: 'items.foodItem',
          select: 'name price discountedPrice image veg isAvailable restaurant',
          populate: {
            path: 'restaurant',
            select: 'name',
          },
        })
        .populate('restaurant', 'name deliveryFee minOrderAmount');
    }
  }

  res.json({
    success: true,
    data: cart,
    unavailableItems: unavailableItems.length > 0,
  });
});

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
export const addToCart = asyncHandler(async (req, res) => {
  const { foodItemId, quantity, customizations } = req.body;

  // Validate food item exists
  const foodItem = await FoodItem.findById(foodItemId);
  
  if (!foodItem) {
    res.status(404);
    throw new Error('Food item not found');
  }

  // Check if food item is available
  if (!foodItem.isAvailable) {
    res.status(400);
    throw new Error('Food item is currently unavailable');
  }

  // Get restaurant details
  const restaurant = await Restaurant.findById(foodItem.restaurant);
  
  if (!restaurant) {
    res.status(404);
    throw new Error('Restaurant not found');
  }

  // Find user's cart
  let cart = await Cart.findOne({ user: req.user._id });

  // If no cart exists, create one
  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      restaurant: restaurant._id,
      items: [],
      totalItems: 0,
      subtotal: 0,
      taxAmount: 0,
      deliveryFee: restaurant.deliveryFee,
      finalAmount: 0,
    });
  }

  // Check if item is from a different restaurant
  if (cart.restaurant && cart.restaurant.toString() !== restaurant._id.toString() && cart.items.length > 0) {
    res.status(400);
    throw new Error('Cannot add items from different restaurants. Please clear your cart first.');
  }

  // Set restaurant if cart is empty
  if (!cart.restaurant || cart.items.length === 0) {
    cart.restaurant = restaurant._id;
    cart.deliveryFee = restaurant.deliveryFee;
  }

  // Calculate item price
  const itemPrice = foodItem.discountedPrice || foodItem.price;
  
  // Calculate additional price from customizations
  let customizationPrice = 0;
  if (customizations && customizations.length > 0) {
    customizations.forEach(customization => {
      if (customization.options && customization.options.length > 0) {
        customization.options.forEach(option => {
          customizationPrice += option.additionalPrice || 0;
        });
      }
    });
  }

  // Calculate total price for this item
  const totalPrice = (itemPrice + customizationPrice) * quantity;

  // Check if the item already exists in cart
  const existingItemIndex = cart.items.findIndex(
    item => item.foodItem.toString() === foodItemId
  );

  if (existingItemIndex > -1) {
    // Update existing item
    cart.items[existingItemIndex].quantity = quantity;
    cart.items[existingItemIndex].customizations = customizations || [];
    cart.items[existingItemIndex].itemPrice = itemPrice + customizationPrice;
    cart.items[existingItemIndex].totalPrice = totalPrice;
  } else {
    // Add new item
    cart.items.push({
      foodItem: foodItemId,
      quantity,
      customizations: customizations || [],
      itemPrice: itemPrice + customizationPrice,
      totalPrice,
    });
  }

  // Recalculate cart totals
  await recalculateCart(cart._id);
  
  // Fetch updated cart with populated data
  const updatedCart = await Cart.findById(cart._id)
    .populate({
      path: 'items.foodItem',
      select: 'name price discountedPrice image veg',
    })
    .populate('restaurant', 'name deliveryFee minOrderAmount');

  logger.info(`Item added to cart: ${req.user._id} - ${foodItemId}`);

  res.status(200).json({
    success: true,
    data: updatedCart,
  });
});

// @desc    Update cart item quantity
// @route   PATCH /api/cart/:itemId
// @access  Private
export const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity, customizations } = req.body;
  const { itemId } = req.params;

  // Find user's cart
  const cart = await Cart.findOne({ user: req.user._id });
  
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  // Find the item in the cart
  const cartItem = cart.items.id(itemId);
  
  if (!cartItem) {
    res.status(404);
    throw new Error('Item not found in cart');
  }

  // Get food item details to calculate price
  const foodItem = await FoodItem.findById(cartItem.foodItem);
  
  if (!foodItem) {
    res.status(404);
    throw new Error('Food item not found');
  }

  // Check if food item is available
  if (!foodItem.isAvailable) {
    res.status(400);
    throw new Error('Food item is currently unavailable');
  }

  // Calculate item price
  const itemPrice = foodItem.discountedPrice || foodItem.price;
  
  // Calculate additional price from customizations
  let customizationPrice = 0;
  if (customizations && customizations.length > 0) {
    customizations.forEach(customization => {
      if (customization.options && customization.options.length > 0) {
        customization.options.forEach(option => {
          customizationPrice += option.additionalPrice || 0;
        });
      }
    });
  }

  // Update cart item
  cartItem.quantity = quantity;
  if (customizations) {
    cartItem.customizations = customizations;
  }
  cartItem.itemPrice = itemPrice + customizationPrice;
  cartItem.totalPrice = cartItem.itemPrice * quantity;

  await cart.save();
  
  // Recalculate cart totals
  await recalculateCart(cart._id);
  
  // Fetch updated cart with populated data
  const updatedCart = await Cart.findById(cart._id)
    .populate({
      path: 'items.foodItem',
      select: 'name price discountedPrice image veg',
    })
    .populate('restaurant', 'name deliveryFee minOrderAmount');

  logger.info(`Cart item updated: ${req.user._id} - ${itemId}`);

  res.status(200).json({
    success: true,
    data: updatedCart,
  });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
// @access  Private
export const removeCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  // Find user's cart
  const cart = await Cart.findOne({ user: req.user._id });
  
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  // Find the item in the cart
  const cartItem = cart.items.id(itemId);
  
  if (!cartItem) {
    res.status(404);
    throw new Error('Item not found in cart');
  }

  // Remove item from cart
  cart.items.pull(itemId);
  
  // If cart is now empty, remove restaurant reference
  if (cart.items.length === 0) {
    cart.restaurant = null;
  }
  
  await cart.save();
  
  // Recalculate cart totals
  await recalculateCart(cart._id);
  
  // Fetch updated cart with populated data
  const updatedCart = await Cart.findById(cart._id)
    .populate({
      path: 'items.foodItem',
      select: 'name price discountedPrice image veg',
    })
    .populate('restaurant', 'name deliveryFee minOrderAmount');

  logger.info(`Item removed from cart: ${req.user._id} - ${itemId}`);

  res.status(200).json({
    success: true,
    data: updatedCart,
  });
});

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = asyncHandler(async (req, res) => {
  // Find and update user's cart
  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id },
    {
      $set: {
        items: [],
        restaurant: null,
        totalItems: 0,
        subtotal: 0,
        taxAmount: 0,
        deliveryFee: 0,
        packagingCharges: 0,
        discountAmount: 0,
        couponApplied: null,
        finalAmount: 0,
      }
    },
    { new: true }
  );

  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  logger.info(`Cart cleared: ${req.user._id}`);

  res.status(200).json({
    success: true,
    message: 'Cart cleared successfully',
    data: cart,
  });
});

// @desc    Apply coupon to cart
// @route   POST /api/cart/apply-coupon
// @access  Private
export const applyCoupon = asyncHandler(async (req, res) => {
  const { couponCode } = req.body;

  // Find user's cart
  const cart = await Cart.findOne({ user: req.user._id });
  
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  // Check if cart has items
  if (!cart.items || cart.items.length === 0) {
    res.status(400);
    throw new Error('Cart is empty');
  }

  // This would be where you validate the coupon against a Coupon model
  // For now, we'll simulate a discount
  
  // Example coupon logic:
  let discountAmount = 0;
  if (couponCode === 'WELCOME10') {
    // 10% discount
    discountAmount = cart.subtotal * 0.1;
  } else if (couponCode === 'FLAT100') {
    // Flat 100 off
    discountAmount = 100;
  } else {
    res.status(400);
    throw new Error('Invalid coupon code');
  }

  // Apply discount to cart
  cart.discountAmount = discountAmount;
  cart.finalAmount = cart.subtotal + cart.taxAmount + cart.deliveryFee + cart.packagingCharges - discountAmount;
  cart.couponApplied = couponCode; // In a real app, this would be the coupon document ID
  
  await cart.save();

  logger.info(`Coupon applied to cart: ${req.user._id} - ${couponCode}`);

  // Fetch updated cart with populated data
  const updatedCart = await Cart.findById(cart._id)
    .populate({
      path: 'items.foodItem',
      select: 'name price discountedPrice image veg',
    })
    .populate('restaurant', 'name deliveryFee minOrderAmount');

  res.status(200).json({
    success: true,
    message: 'Coupon applied successfully',
    data: updatedCart,
  });
});

// Helper function to recalculate cart totals
const recalculateCart = async (cartId) => {
  const cart = await Cart.findById(cartId);
  
  if (!cart) {
    return;
  }

  // Calculate total items and subtotal
  let totalItems = 0;
  let subtotal = 0;
  
  cart.items.forEach(item => {
    totalItems += item.quantity;
    subtotal += item.totalPrice;
  });

  // Get restaurant for updated delivery fee and packaging charges
  if (cart.restaurant && cart.items.length > 0) {
    const restaurant = await Restaurant.findById(cart.restaurant);
    
    if (restaurant) {
      cart.deliveryFee = restaurant.deliveryFee || 0;
      // Simulated packaging charges (could be from restaurant model)
      cart.packagingCharges = Math.round(subtotal * 0.02); // 2% of subtotal
    }
  } else {
    cart.deliveryFee = 0;
    cart.packagingCharges = 0;
  }

  // Calculate tax (example: 5% GST)
  const taxRate = 0.05;
  const taxAmount = Math.round(subtotal * taxRate);

  // Update cart
  cart.totalItems = totalItems;
  cart.subtotal = subtotal;
  cart.taxAmount = taxAmount;
  
  // Recalculate final amount with any applied discounts
  cart.finalAmount = subtotal + taxAmount + cart.deliveryFee + cart.packagingCharges - cart.discountAmount;
  
  await cart.save();
};