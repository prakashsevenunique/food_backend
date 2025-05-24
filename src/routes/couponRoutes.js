import express from 'express';
import upload from '../config/multer.js';
import {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon
} from '../controllers/couponController.js';

const router = express.Router();

router.post('/',upload.single('couponPhoto'), createCoupon);

router.get('/', getCoupons);

router.get('/:id', getCouponById);

router.put('/:id', upload.single('couponPhoto'), updateCoupon);

router.delete('/:id', deleteCoupon);

export default router;
