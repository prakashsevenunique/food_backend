import express from 'express';
import { body, param } from 'express-validator';
import {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon, 
} from '../controllers/couponController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.post(
  '/',
  protect,
  admin,
  [
    body('code').notEmpty().withMessage('Coupon code is required'),
    body('discount').isFloat({ min: 0 }).withMessage('Discount must be a valid number'),
    body('type').isIn(['percentage', 'flat']).withMessage('Type must be percentage or flat'),
    validateRequest,
  ],
  createCoupon
);

router.get('/', getCoupons);

router.get(
  '/:id',
  [param('id').notEmpty().withMessage('Coupon ID is required'), validateRequest],
  getCouponById
);

router.put(
  '/:id',
  protect,
  admin,
  [
    param('id').notEmpty().withMessage('Coupon ID is required'),
    validateRequest,
  ],
  updateCoupon
);

router.delete(
  '/:id',
  protect,
  admin,
  [
    param('id').notEmpty().withMessage('Coupon ID is required'),
    validateRequest,
  ],
  deleteCoupon
);

export default router;
