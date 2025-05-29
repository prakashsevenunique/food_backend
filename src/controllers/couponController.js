import Coupon from '../models/Coupon.js';
import fs from 'fs';

export const createCoupon = async (req, res) => {
  try {
    const { description, couponType, discountValue, expiryDate, active } = req.body;
    let couponPhoto = '';

    if (req.file) {
      couponPhoto = req.file.path;
    }

    const coupon = new Coupon({
      description,
      couponType,
      discountValue,
      couponPhoto,
      expiryDate,
      active
    });

    await coupon.save();
    res.status(201).json({ message: 'Coupon created successfully', coupon });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.status(200).json(coupons);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.status(200).json(coupon);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const { description, couponType, discountValue, expiryDate, active } = req.body;
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    if (req.file) {
      // Delete the old image file
      if (coupon.couponPhoto && fs.existsSync(coupon.couponPhoto)) {
        fs.unlinkSync(coupon.couponPhoto);
      }
      coupon.couponPhoto = req.file.path;
    }

    coupon.description = description || coupon.description;
    coupon.couponType = couponType || coupon.couponType;
    coupon.discountValue = discountValue || coupon.discountValue;
    coupon.expiryDate = expiryDate || coupon.expiryDate;
    coupon.active = active !== undefined ? active : coupon.active;

    await coupon.save();
    res.status(200).json({ message: 'Coupon updated successfully', coupon });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // Delete the image file
    if (coupon.couponPhoto && fs.existsSync(coupon.couponPhoto)) {
      fs.unlinkSync(coupon.couponPhoto);
    }

    await coupon.remove();
    res.status(200).json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
