import express from 'express';
import { body, param } from 'express-validator';
import {
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
  updateCouponTextOnly
);

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
