import Cart from '../models/cartModel.js';
import Coupon from '../models/Coupon.js';
import FoodItem from '../models/foodItemModel.js';
import Restaurant from '../models/restaurantModel.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import ErrorResponse from'../utils/errorResponse.js';

export const getCart = asyncHandler(async (req, res) => {
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

  const unavailableItems = [];
  
  if (cart.items && cart.items.length > 0) {
    for (const item of cart.items) {
      if (!item.foodItem || !item.foodItem.isAvailable) {
        unavailableItems.push(item._id);
      }
    }
    
    if (unavailableItems.length > 0) {
      await Cart.updateOne(
        { _id: cart._id },
        { $pull: { items: { _id: { $in: unavailableItems } } } }
      );
      
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
        
      // await recalculateCart(cart._id);
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

export const addToCart = asyncHandler(async (req, res) => {
  const { foodItemId, quantity, customizations } = req.body;

  // 1. Validate food item exists and is available
  const foodItem = await FoodItem.findById(foodItemId);
  if (!foodItem) throw new ErrorResponse('Food item not found', 404);
  if (!foodItem.isAvailable) throw new ErrorResponse('Food item unavailable', 400);

  // 2. Get associated restaurant
  const restaurant = await Restaurant.findById(foodItem.restaurant);
  if (!restaurant) throw new ErrorResponse('Restaurant not found', 404);

  // 3. Find or create cart
  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    // New cart
    cart = await Cart.create({
      user: req.user._id,
      restaurant: restaurant._id,
      items: [],
      deliveryFee: restaurant.deliveryFee,
      subtotal: 0,
      finalAmount: restaurant.deliveryFee
    });
  } else {
    // Existing cart
    if (!cart.restaurant) {
      // If restaurant was cleared earlier (e.g., after removing all items)
      cart.restaurant = restaurant._id;
      cart.deliveryFee = restaurant.deliveryFee;
    } else if (cart.restaurant.toString() !== restaurant._id.toString()) {
      throw new ErrorResponse('Clear cart to order from different restaurant', 400);
    }
  }

  // 4. Calculate item pricing
  const basePrice = foodItem.discountedPrice || foodItem.price;
  const customizationPrice = (customizations || []).reduce((total, custom) => (
    total + (custom.options || []).reduce((sum, opt) => (
      sum + (opt.additionalPrice || 0)
    ), 0)
  ), 0);

  const totalPrice = (basePrice + customizationPrice) * quantity;

  // 5. Add or update cart item
  const itemIndex = cart.items.findIndex(item => (
    item.foodItem.toString() === foodItemId
  ));

  if (itemIndex > -1) {
    cart.items[itemIndex] = {
      foodItem: foodItemId,
      quantity,
      customizations: customizations || [],
      itemPrice: basePrice + customizationPrice,
      totalPrice
    };
  } else {
    cart.items.push({
      foodItem: foodItemId,
      quantity,
      customizations: customizations || [],
      itemPrice: basePrice + customizationPrice,
      totalPrice
    });
  }

  // 6. Update cart totals
  cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  cart.subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
  cart.finalAmount = cart.subtotal + cart.deliveryFee;

  // 7. Save and respond
  const savedCart = await cart.save();

  const result = await Cart.findById(savedCart._id)
    .populate('restaurant', '_id name deliveryFee')
    .populate('items.foodItem', 'name price image');

  res.status(200).json({
    success: true,
    data: result
  });
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity, customizations } = req.body;
  const { itemId } = req.params;

  // 1. Find user's cart
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  // 2. Manually find the item in the cart.items array
  const cartItemIndex = cart.items.findIndex(
    (item) => item.foodItem.toString() === itemId
  );
  console.log(cartItemIndex)

  if (cartItemIndex == -1) {
    res.status(404);
    throw new Error('Item not found in cart');
  }

  const cartItem = cart.items[cartItemIndex];

  // 3. Check food item availability
  const foodItem = await FoodItem.findById(cartItem.foodItem);
  if (!foodItem) {
    res.status(404);
    throw new Error('Food item not found');
  }
  if (!foodItem.isAvailable) {
    res.status(400);
    throw new Error('Food item is currently unavailable');
  }

  // 4. Calculate new prices
  const itemPrice = foodItem.discountedPrice || foodItem.price;
  let customizationPrice = 0;

  if (customizations && customizations.length > 0) {
    for (const customization of customizations) {
      if (customization.options && customization.options.length > 0) {
        for (const option of customization.options) {
          customizationPrice += option.additionalPrice || 0;
        }
      }
    }
  }

  // 5. Update the cart item
  cart.items[cartItemIndex].quantity = quantity;
  if (customizations) {
    cart.items[cartItemIndex].customizations = customizations;
  }
  cart.items[cartItemIndex].itemPrice = itemPrice + customizationPrice;
  cart.items[cartItemIndex].totalPrice =
    cart.items[cartItemIndex].itemPrice * quantity;

  await cart.save();

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

export const removeCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  const cartItem = cart.items.id(itemId);
  
  if (!cartItem) {
    res.status(404);
    throw new Error('Item not found in cart');
  }

  cart.items.pull(itemId);
  
  if (cart.items.length === 0) {
    cart.restaurant = null;
  }
  
  await cart.save();
  
  
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

export const clearCart = asyncHandler(async (req, res) => {
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

export const applyCoupon = asyncHandler(async (req, res) => {
  const { couponCode } = req.body;

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  if (!cart.items || cart.items.length === 0) {
    res.status(400);
    throw new Error('Cart is empty');
  }

  if (!cart.subtotal || cart.subtotal <= 0) {
    res.status(400);
    throw new Error('Invalid subtotal. Cannot apply coupon.');
  }

  if (cart.couponApplied) {
    res.status(400);
    throw new Error('Coupon already applied. Please clear cart to apply a new one.');
  }

  const coupon = await Coupon.findOne({ code: couponCode });

  if (!coupon) {
    res.status(400);
    throw new Error('Invalid coupon code');
  }

  if (cart.subtotal < coupon.minimumAmount) {
    res.status(400);
    throw new Error(`Minimum order amount should be ₹${coupon.minimumAmount}`);
  }

  let discountAmount = 0;

  if (coupon.discountType === 'flat') {
    discountAmount = coupon.discountValue;
  } else if (coupon.discountType === 'percent') {
    discountAmount = (cart.subtotal * coupon.discountValue) / 100;
  }

  if (discountAmount > cart.subtotal) {
    discountAmount = cart.subtotal;
  }

  cart.discountAmount = discountAmount;
  cart.couponApplied = coupon._id; 
  cart.finalAmount =
    cart.subtotal + cart.taxAmount + cart.deliveryFee + (cart.packagingCharges || 0) - discountAmount;

  await cart.save();

  const updatedCart = await Cart.findById(cart._id)
    .populate({
      path: 'items.foodItem',
      select: 'name price discountedPrice image veg',
    })
    .populate('restaurant', 'name deliveryFee minOrderAmount')
    .populate('couponApplied');

  logger.info(`Coupon applied: ${couponCode} by user ${req.user._id}`);

  res.status(200).json({
    success: true,
    message: `Coupon '${coupon.code}' applied successfully.`,
    data: updatedCart,
  });
});

