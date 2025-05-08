import Order from '../models/orderModel.js';
import Cart from '../models/cartModel.js';
import Restaurant from '../models/restaurantModel.js';
import FoodItem from '../models/foodItemModel.js';
import User from '../models/userModel.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';

// Helper function to generate order number
const generateOrderNumber = () => {
  const timestamp = new Date().getTime().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${timestamp}-${random}`;
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder = asyncHandler(async (req, res) => {
  const {
    cartId,
    deliveryAddress,
    paymentMethod,
    specialInstructions,
  } = req.body;

  // Get cart details
  const cart = await Cart.findById(cartId);
  
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  // Verify cart belongs to user
  if (cart.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Unauthorized access to cart');
  }

  // Check if cart is empty
  if (!cart.items || cart.items.length === 0) {
    res.status(400);
    throw new Error('Cart is empty');
  }

  // Get restaurant details
  const restaurant = await Restaurant.findById(cart.restaurant);
  
  if (!restaurant) {
    res.status(404);
    throw new Error('Restaurant not found');
  }

  // Create order items and calculate totals
  const orderItems = cart.items.map(item => ({
    foodItem: item.foodItem,
    quantity: item.quantity,
    price: item.itemPrice,
    customizations: item.customizations,
    subtotal: item.totalPrice,
  }));

  // Create new order
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
    paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
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

  if (order) {
    // Clear the cart after successful order
    await Cart.findByIdAndDelete(cartId);
    
    logger.info(`New order created: ${order._id}`);

    res.status(201).json({
      success: true,
      data: order,
    });
  } else {
    res.status(400);
    throw new Error('Invalid order data');
  }
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const orders = await Order.find({ user: req.user._id })
    .populate('restaurant', 'name')
    .populate('deliveryAddress')
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

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
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

  // Check if the order belongs to the logged in user or restaurant owner or admin
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

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private/Restaurant/Admin
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Check permissions - only restaurant owner, admin or assigned delivery partner can update
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

  // Update order status
  order.orderStatus = status;
  
  // Add to status timeline
  order.orderStatusTimeline.push({
    status,
    timestamp: new Date(),
    note: note || `Order status updated to ${status}`,
  });

  // Special handling for certain statuses
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

// @desc    Cancel order
// @route   PATCH /api/orders/:id/cancel
// @access  Private
export const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Check if the order is already delivered or cancelled
  if (['DELIVERED', 'CANCELLED'].includes(order.orderStatus)) {
    res.status(400);
    throw new Error(`Order cannot be cancelled as it is ${order.orderStatus}`);
  }

  // Check if it's beyond the cancellation window (e.g. already preparing)
  if (['PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(order.orderStatus)) {
    // Check who is cancelling
    if (req.user.role !== 'admin' && order.user.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error('Cannot cancel order at this stage');
    }
  }

  // Determine who cancelled
  let cancelledBy = 'USER';
  if (req.user.role === 'admin') {
    cancelledBy = 'ADMIN';
  } else if (req.user.role === 'restaurant') {
    cancelledBy = 'RESTAURANT';
  } else if (req.user.role === 'delivery') {
    cancelledBy = 'DELIVERY_PARTNER';
  }

  // Update order
  order.orderStatus = 'CANCELLED';
  order.cancelReason = reason;
  order.cancelledBy = cancelledBy;
  
  // Add to status timeline
  order.orderStatusTimeline.push({
    status: 'CANCELLED',
    timestamp: new Date(),
    note: reason || 'Order cancelled',
  });

  // Handle payment status if needed
  if (order.paymentStatus === 'PAID') {
    order.paymentStatus = 'REFUNDED';
    // Here you would trigger actual refund process
  }

  await order.save();
  logger.info(`Order cancelled: ${order._id}`);

  res.json({
    success: true,
    message: 'Order cancelled successfully',
    data: order,
  });
});

// @desc    Assign delivery partner
// @route   PATCH /api/orders/:id/assign-delivery
// @access  Private/Admin/Restaurant
export const assignDeliveryPartner = asyncHandler(async (req, res) => {
  const { deliveryPartnerId } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Check permissions
  const restaurant = await Restaurant.findById(order.restaurant);
  
  if (
    restaurant.owner.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(403);
    throw new Error('Not authorized to assign delivery partner');
  }

  // Verify delivery partner exists and has delivery role
  const deliveryPartner = await User.findById(deliveryPartnerId);
  
  if (!deliveryPartner || deliveryPartner.role !== 'delivery') {
    res.status(400);
    throw new Error('Invalid delivery partner');
  }

  // Assign delivery partner
  order.deliveryPartner = deliveryPartnerId;
  
  // Update order status if needed
  if (order.orderStatus === 'READY_FOR_PICKUP') {
    order.orderStatus = 'OUT_FOR_DELIVERY';
    
    // Add to status timeline
    order.orderStatusTimeline.push({
      status: 'OUT_FOR_DELIVERY',
      timestamp: new Date(),
      note: 'Order picked up by delivery partner',
    });
  }

  await order.save();
  logger.info(`Delivery partner assigned to order: ${order._id}`);

  res.json({
    success: true,
    message: 'Delivery partner assigned successfully',
    data: order,
  });
});

// @desc    Get restaurant orders
// @route   GET /api/orders/restaurant
// @access  Private/Restaurant
export const getRestaurantOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Find restaurants owned by user
  const restaurants = await Restaurant.find({ owner: req.user._id });
  const restaurantIds = restaurants.map(rest => rest._id);

  // Filter options
  const filter = { restaurant: { $in: restaurantIds } };
  
  // Status filter
  if (req.query.status) {
    filter.orderStatus = req.query.status;
  }
  
  // Date range filter
  if (req.query.startDate && req.query.endDate) {
    filter.createdAt = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate),
    };
  }

  const orders = await Order.find(filter)
    .populate('user', 'name phone')
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

// @desc    Get all orders (admin only)
// @route   GET /api/orders
// @access  Private/Admin
export const getAllOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Filter options
  const filter = {};
  
  // Status filter
  if (req.query.status) {
    filter.orderStatus = req.query.status;
  }
  
  // Restaurant filter
  if (req.query.restaurant) {
    filter.restaurant = req.query.restaurant;
  }
  
  // Date range filter
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

// @desc    Get delivery partner orders
// @route   GET /api/orders/delivery
// @access  Private/Delivery
export const getDeliveryOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Filter options
  const filter = { deliveryPartner: req.user._id };
  
  // Status filter
  if (req.query.status) {
    filter.orderStatus = req.query.status;
  } else {
    // By default, exclude delivered and cancelled orders
    filter.orderStatus = { $nin: ['DELIVERED', 'CANCELLED'] };
  }
  
  // Date filter
  if (req.query.date) {
    const start = new Date(req.query.date);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(req.query.date);
    end.setHours(23, 59, 59, 999);
    
    filter.createdAt = { $gte: start, $lte: end };
  }

  const orders = await Order.find(filter)
    .populate('user', 'name phone')
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