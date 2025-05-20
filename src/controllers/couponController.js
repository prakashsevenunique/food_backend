import Coupon from '../models/Coupon.js';
import fs from 'fs';
import upload from '../config/multer.js';


export const updateCouponTextOnly = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    const { description, couponType, discountValue } = req.body;

    if (description) coupon.description = description;
    if (couponType) coupon.couponType = couponType;
    if (discountValue) coupon.discountValue = discountValue;

    await coupon.save();
    res.status(200).json({ message: 'Coupon updated successfully', coupon });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCouponImageOnly = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    if (!req.file) return res.status(400).json({ message: 'No image file uploaded' });

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'coupons'
    });

    fs.unlinkSync(req.file.path);

    coupon.couponPhoto = result.secure_url;
    await coupon.save();

    res.status(200).json({
      message: 'Coupon image updated successfully',
      imageUrl: result.secure_url,
      coupon,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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