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
  email: String,
  vehicleNumber: String,
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
}, {
  timestamps: true,
});

riderSchema.index({ currentLocation: "2dsphere" });

const Rider = mongoose.model("Rider", riderSchema);
export default Rider;
