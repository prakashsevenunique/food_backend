import mongoose from "mongoose";

const riderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
  },
  vehicleNumber: {
    type: String,
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },
  status: {
    type: String,
    enum: ["available", "unavailable", "on_delivery"],
    default: "unavailable",
  },
  assignedOrders: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  ],
  totalDeliveries: {
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    default: 0,
  },
  earnings: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

riderSchema.index({ currentLocation: "2dsphere" });

const Rider = mongoose.model("Rider", riderSchema);
export default Rider;