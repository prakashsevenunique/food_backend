import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  couponType: {
    type: String,
    enum: ['flat', 'percent'],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
  },
  couponPhoto: {
    type: String,
  },
  expiryDate: {
    type: Date,
    default: () => new Date(Date.now() + 30*24*60*60*1000),
  },
  active: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
