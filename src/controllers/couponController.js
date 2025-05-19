import Coupon from '../models/Coupon.js';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// do convert photo from frontend 
export const createCoupon = async (req, res) => {
  try {
    const { description, couponType, discountValue, expiryDate, couponPhoto } = req.body;

    // Validation
    if (!description || !couponType || !discountValue) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    let photoUrl = '';
    if (couponPhoto) {
      const result = await cloudinary.uploader.upload(couponPhoto, {
        folder: 'coupons',
      });


      photoUrl = result.secure_url;
      console.log('📸 Photo URL saved in DB:', photoUrl);
    } else {
      console.log('⚠️ No image (couponPhoto) provided in request body');
    }

    const expiry = expiryDate ? new Date(expiryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const newCoupon = new Coupon({
      description,
      couponType,
      discountValue,
      expiryDate: expiry,
      couponPhoto: photoUrl,
    });

    await newCoupon.save();

    console.log('✅ Coupon saved to DB:', newCoupon);

    res.status(201).json({ message: 'Coupon created successfully', coupon: newCoupon });

  } catch (error) {
    console.error('❌ Error creating coupon:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    const { description, couponType, discountValue } = req.body;

    if (description) coupon.description = description;
    if (couponType) coupon.couponType = couponType;
    if (discountValue) coupon.discountValue = discountValue;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      coupon.couponPhoto = result.secure_url;
    }

    await coupon.save();
    res.json({ message: 'Coupon updated successfully', coupon });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    coupon.active = false;
    coupon.expiryDate = new Date();

    await coupon.save();

    res.json({ message: 'Coupon ended (soft deleted) successfully', coupon });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};