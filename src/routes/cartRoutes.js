import express from 'express';
import { body, param } from 'express-validator';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  applyCoupon,
} from '../controllers/cartController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getCart)
  .post(
    protect,
    [
      body('foodItemId').notEmpty().withMessage('Food item ID is required'),
      body('quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity must be at least 1'),
      validateRequest,
    ],
    addToCart
  )
  .delete(protect, clearCart);

router.route('/:itemId')
  .patch(
    protect,
    [
      param('itemId').notEmpty().withMessage('Item ID is required'),
      body('quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity must be at least 1'),
      validateRequest,
    ],
    updateCartItem
  )
  .delete(
    protect,
    [
      param('itemId').notEmpty().withMessage('Item ID is required'),
      validateRequest,
    ],
    removeCartItem
  );

router.post(
  '/apply-coupon',
  protect,
  [
    body('couponCode').notEmpty().withMessage('Coupon code is required'),
    validateRequest,
  ],
  applyCoupon
);

export default router;