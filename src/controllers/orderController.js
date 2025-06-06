import Order from '../models/orderModel.js';
import Cart from '../models/cartModel.js';
import Restaurant from '../models/restaurantModel.js';
import FoodItem from '../models/foodItemModel.js';
import User from '../models/userModel.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import Address from '../models/Address.js';
import Rider from '../models/riderModel.js';


const generateOrderNumber = () => {
  const timestamp = new Date().getTime().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${timestamp}-${random}`;
};

import WalletTransaction from '../models/walletModel.js'; // ensure correct path

export const createOrder = asyncHandler(async (req, res) => {
  const {
    cartId,
    deliveryAddress,
    paymentMethod,
    specialInstructions,
  } = req.body;

  const cart = await Cart.findById(cartId);
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  if (cart.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Unauthorized access to cart');
  }

  if (!cart.items || cart.items.length === 0) {
    res.status(400);
    throw new Error('Cart is empty');
  }

  const restaurant = await Restaurant.findById(cart.restaurant);
  if (!restaurant) {
    res.status(404);
    throw new Error('Restaurant not found');
  }

  const orderItems = cart.items.map(item => ({
    foodItem: item.foodItem,
    quantity: item.quantity,
    price: item.itemPrice,
    customizations: item.customizations,
    subtotal: item.totalPrice,
  }));

  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    user: req.user._id,
    restaurant: restaurant._id,
    items: orderItems,
    totalAmount: cart.subtotal,
    taxAmount: cart.taxAmount,
    deliveryFee: cart.deliveryFee,
    discountAmount: cart.discountAmount,
    packagingCharges: cart.packagingCharges,
    finalAmount: cart.finalAmount,
    couponApplied: cart.couponApplied,
    paymentMethod,
    paymentStatus: paymentMethod === 'WALLET' ? 'PAID' : 'PENDING',
    deliveryAddress,
    specialInstructions,
    orderStatus: 'PLACED',
    estimatedDeliveryTime: new Date(Date.now() + restaurant.avgDeliveryTime * 60000),
    orderStatusTimeline: [{
      status: 'PLACED',
      timestamp: new Date(),
      note: 'Order placed successfully',
    }],
  });

  if (!order) {
    res.status(400);
    throw new Error('Invalid order data');
  }

  // 💰 Handle Wallet Payment
  if (paymentMethod === 'WALLET') {
    const user = await User.findById(req.user._id);

    if (user.walletBalance < order.finalAmount) {
      await order.remove(); // Rollback order
      res.status(400);
      throw new Error('Insufficient wallet balance');
    }

    // Deduct from wallet
    user.walletBalance -= order.finalAmount;
    await user.save();

    // Create wallet transaction
    await WalletTransaction.create({
      userId: user._id,
      type: 'debit',
      amount: order.finalAmount,
      status: 'completed',
      paymentMethod: 'wallet',
      description: `Payment for Order #${order.orderNumber}`,
      orderId: order._id,
    });
  }

  // 🛒 Clear Cart
  await Cart.findByIdAndDelete(cartId);

  logger.info(`New order created: ${order._id}`);

  res.status(201).json({
    success: true,
    data: order,
  });
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const orders = await Order.find({ user: req.user._id })
    .populate('restaurant', 'name')
    .populate('deliveryAddress')
    .populate('user', 'name email') // ✅ Add this line
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalOrders = await Order.countDocuments({ user: req.user._id });

  res.json({
    success: true,
    data: orders,
    page,
    pages: Math.ceil(totalOrders / limit),
    total: totalOrders,
  });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('restaurant', 'name address contact')
    .populate('deliveryAddress')
    .populate('deliveryPartner', 'name phone')
    .populate({
      path: 'items.foodItem',
      select: 'name image veg',
    });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const restaurant = await Restaurant.findById(order.restaurant);

  if (
    order.user.toString() !== req.user._id.toString() &&
    (restaurant && restaurant.owner.toString() !== req.user._id.toString()) &&
    req.user.role !== 'admin' &&
    (order.deliveryPartner && order.deliveryPartner.toString() !== req.user._id.toString())
  ) {
    res.status(403);
    throw new Error('Not authorized to view this order');
  }

  res.json({
    success: true,
    data: order,
  });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const restaurant = await Restaurant.findById(order.restaurant);
  
  const isDeliveryPartner = 
    order.deliveryPartner && 
    order.deliveryPartner.toString() === req.user._id.toString() && 
    req.user.role === 'delivery';

  if (
    restaurant.owner.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin' &&
    !isDeliveryPartner
  ) {
    res.status(403);
    throw new Error('Not authorized to update this order');
  }

  order.orderStatus = status;
  
  order.orderStatusTimeline.push({
    status,
    timestamp: new Date(),
    note: note || `Order status updated to ${status}`,
  });

  if (status === 'DELIVERED') {
    order.actualDeliveryTime = new Date();
  }

  await order.save();
  logger.info(`Order status updated: ${order._id} - ${status}`);

  res.json({
    success: true,
    data: order,
  });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (['DELIVERED', 'CANCELLED'].includes(order.orderStatus)) {
    res.status(400);
    throw new Error(`Order cannot be cancelled as it is ${order.orderStatus}`);
  }

  if (['PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(order.orderStatus)) {
    if (req.user.role !== 'admin' && order.user.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error('Cannot cancel order at this stage');
    }
  }

  let cancelledBy = 'USER';
  if (req.user.role === 'admin') {
    cancelledBy = 'ADMIN';
  } else if (req.user.role === 'restaurant') {
    cancelledBy = 'RESTAURANT';
  } else if (req.user.role === 'delivery') {
    cancelledBy = 'DELIVERY_PARTNER';
  }

  order.orderStatus = 'CANCELLED';
  order.cancelReason = reason;
  order.cancelledBy = cancelledBy;
  
  order.orderStatusTimeline.push({
    status: 'CANCELLED',
    timestamp: new Date(),
    note: reason || 'Order cancelled',
  });

  if (order.paymentStatus === 'PAID') {
    order.paymentStatus = 'REFUNDED';
  }

  await order.save();
  logger.info(`Order cancelled: ${order._id}`);

  res.json({
    success: true,
    message: 'Order cancelled successfully',
    data: order,
  });
});

export const assignDeliveryPartner = asyncHandler(async (req, res) => {
  const { deliveryPartnerId } = req.body;
  const orderId = req.params.id;

  // 1. Find order
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // 2. Validate restaurant ownership
  const restaurant = await Restaurant.findById(order.restaurant);
  if (!restaurant) {
    res.status(404);
    throw new Error("Restaurant not found");
  }

  const isOwner = restaurant.owner.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    res.status(403);
    throw new Error("Not authorized to assign delivery partner");
  }

  // 3. Validate delivery partner (from Rider model)
  const deliveryPartner = await Rider.findById(deliveryPartnerId);
  if (!deliveryPartner) {
    res.status(400);
    throw new Error("Invalid delivery partner ID");
  }

  // 4. Assign and update order status
  order.deliveryPartner = deliveryPartnerId;

  if (order.orderStatus === "READY_FOR_PICKUP") {
    order.orderStatus = "OUT_FOR_DELIVERY";
    order.orderStatusTimeline.push({
      status: "OUT_FOR_DELIVERY",
      timestamp: new Date(),
      note: "Order picked up by delivery partner",
    });
  }

  // 5. Save and respond
  await order.save();
  logger.info(`Delivery partner assigned to order ${orderId}`);

  res.json({
    success: true,
    message: "Delivery partner assigned successfully",
    data: order,
  });
});

export const getRestaurantOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const restaurants = await Restaurant.find({ owner: req.user._id });
  const restaurantIds = restaurants.map(rest => rest._id);

  const filter = { restaurant: { $in: restaurantIds } };
  
  if (req.query.status) {
    filter.orderStatus = req.query.status;
  }
  
  if (req.query.startDate && req.query.endDate) {
    filter.createdAt = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate),
    };
  }

  const orders = await Order.find(filter)
    .populate('user', 'name email phone')
    .populate('restaurant', 'name')
    .populate('deliveryAddress')
    .populate('deliveryPartner', 'name phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalOrders = await Order.countDocuments(filter);

  res.json({
    success: true,
    data: orders,
    page,
    pages: Math.ceil(totalOrders / limit),
    total: totalOrders,
  });
});

export const getAllOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  
  if (req.query.status) {
    filter.orderStatus = req.query.status;
  }
  
  if (req.query.restaurant) {
    filter.restaurant = req.query.restaurant;
  }
  
  if (req.query.startDate && req.query.endDate) {
    filter.createdAt = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate),
    };
  }

  const orders = await Order.find(filter)
    .populate('user', 'name email phone')
    .populate('restaurant', 'name')
    .populate('deliveryAddress')
    .populate('deliveryPartner', 'name phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalOrders = await Order.countDocuments(filter);

  res.json({
    success: true,
    data: orders,
    page,
    pages: Math.ceil(totalOrders / limit),
    total: totalOrders,
  });
});

export const getDeliveryOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = { deliveryPartner: req.user._id };
  
  if (req.query.status) {
    filter.orderStatus = req.query.status;
  } else {
    filter.orderStatus = { $nin: ['DELIVERED', 'CANCELLED'] };
  }
  
  if (req.query.date) {
    const start = new Date(req.query.date);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(req.query.date);
    end.setHours(23, 59, 59, 999);
    
    filter.createdAt = { $gte: start, $lte: end };
  }

  const orders = await Order.find(filter)
    .populate('user', 'name email phone')
    .populate('restaurant', 'name address contact')
    .populate('deliveryAddress')
    .sort(req.query.sort ? { createdAt: -1 } : { estimatedDeliveryTime: 1 })
    .skip(skip)
    .limit(limit);

  const totalOrders = await Order.countDocuments(filter);

  res.json({
    success: true,
    data: orders,
    page,
    pages: Math.ceil(totalOrders / limit),
    total: totalOrders,
  });
});