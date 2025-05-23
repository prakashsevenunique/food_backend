import mongoose from "mongoose";

const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Point"],
    default: "Point",
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});

const timingSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    required: true,
  },
  opening: {
    type: String,
    required: true,
  },
  closing: {
    type: String,
    required: true,
  },
  closed: {
    type: Boolean,
    default: false,
  },
});

// Restaurant schema
const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a restaurant name"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please provide a description"],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true, default: "India" },
    },
    location: {
      type: locationSchema,
      required: true,
      index: "2dsphere",
    },
    contact: {
      phone: { type: String, required: true },
      alternatePhone: { type: String },
      email: { type: String, required: true },
    },
    cuisine: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    menu: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FoodItem",
      },
    ],
    images: [
      {
        type: String,
      },
    ],
    coverImage: {
      type: String,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    timings: [timingSchema],
    serviceOptions: {
      dineIn: { type: Boolean, default: true },
      takeaway: { type: Boolean, default: true },
      delivery: { type: Boolean, default: true },
    },
    deliveryRadius: {
      type: Number,
      default: 5,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    avgDeliveryTime: {
      type: Number,
      default: 30,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    packagingCharges: {
      type: Number,
      default: 0,
    },
    tags: [
      {
        type: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isPromoted: {
      type: Boolean,
      default: false,
    },
    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      ifscCode: String,
    },
    documents: {
      fssaiLicense: {
        number: String,
        expiryDate: Date,
        image: String,
      },
      gstNumber: String,
      panCard: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual populate for reviews
restaurantSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "restaurant",
  justOne: false,
});

// Full-text index
restaurantSchema.index({
  name: "text",
  "address.city": "text",
  tags: "text",
});

const Restaurant = mongoose.model("Restaurant", restaurantSchema);

export default Restaurant;
