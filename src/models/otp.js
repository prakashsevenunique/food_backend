// models/Otp.js
import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    mobileNumber: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Otp = mongoose.model('Otp', otpSchema);

export default Otp;
