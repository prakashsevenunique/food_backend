import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    mobileNumber: {
      type: String,
      required: true,
      unique: true,
    },
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // TTL index: automatically deletes document 0 seconds after this time
      // The TTL delay itself is set here by the application (3 minutes after creation)
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  }
);

const Otp = mongoose.model('Otp', otpSchema);

export default Otp;
