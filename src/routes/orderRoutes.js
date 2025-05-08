import express from 'express';
import { body } from 'express-validator';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  assignDeliveryPartner,
  getRestaurantOrders,
  getAllOrders,
  getDeliveryOrders,
} from '../controllers/orderController.js';
import { protect, admin, restaurant, deliveryPartner } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.route('/')
  .post(
    protect,
    [
      body('cartId').notEmpty().withMessage('Cart ID is required'),
      body('deliveryAddress')
        .notEmpty()
        .withMessage('Delivery address ID is required'),
      body('paymentMethod')
        .notEmpty()
        .withMessage('Payment method is required')
        .isIn(['COD', 'CARD', 'UPI', 'WALLET'])
        .withMessage('Invalid payment method'),
      validateRequest,
    ],
    createOrder
  )
  .get(protect, admin, getAllOrders);

router.get('/myorders', protect, getMyOrders);
router.get('/restaurant', protect, restaurant, getRestaurantOrders);
router.get('/delivery', protect, deliveryPartner, getDeliveryOrders);

router.route('/:id')
  .get(protect, getOrderById);

router.patch(
  '/:id/status',
  protect,
  [
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn([
        'PLACED',
        'CONFIRMED',
        'PREPARING',
        'READY_FOR_PICKUP',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
      ])
      .withMessage('Invalid order status'),
    validateRequest,
  ],
  updateOrderStatus
);

router.patch(
  '/:id/cancel',
  protect,
  [
    body('reason').notEmpty().withMessage('Cancel reason is required'),
    validateRequest,
  ],
  cancelOrder
);

router.patch(
  '/:id/assign-delivery',
  protect,
  [
    body('deliveryPartnerId')
      .notEmpty()
      .withMessage('Delivery partner ID is required'),
    validateRequest,
  ],
  assignDeliveryPartner
);

export default router;