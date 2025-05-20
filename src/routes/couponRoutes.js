import express from 'express';
import { body, param } from 'express-validator';
import {
  // createCoupon,
  getCoupons,
  getCouponById,
  updateCouponTextOnly,
  updateCouponImageOnly,
  deleteCoupon,
} from '../controllers/couponController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';
import upload from '../config/multer.js';

const router = express.Router();

// Create coupon with text details
// router.post(
//   '/',
//   protect,
//   admin,
//   [
//     body('code').notEmpty().withMessage('Coupon code is required'),
//     body('discount').isFloat({ min: 0 }).withMessage('Discount must be a valid number'),
//     body('type').isIn(['percentage', 'flat']).withMessage('Type must be percentage or flat'),
//     validateRequest,
//   ],
//   createCoupon
// );

// Get all coupons
router.get('/', getCoupons);

// Get coupon by ID
router.get(
  '/:id',
  [param('id').notEmpty().withMessage('Coupon ID is required'), validateRequest],
  getCouponById
);

// Update coupon text/details only
router.put(
  '/:id',
  protect,
  admin,
  [
    param('id').notEmpty().withMessage('Coupon ID is required'),
    validateRequest,
  ],
  updateCouponTextOnly
);

// Update coupon photo only
router.put(
  '/:id/photo',
  protect,
  admin,
  upload.single('couponPhoto'),
  [
    param('id').notEmpty().withMessage('Coupon ID is required'),
    validateRequest,
  ],
  updateCouponImageOnly
);

// Delete coupon
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
