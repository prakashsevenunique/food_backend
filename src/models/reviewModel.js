import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Please provide a rating'],
      min: 1,
      max: 5,
    },
    review: {
      type: String,
    },
    foodRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    deliveryRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    photos: [{
      type: String,
    }],
    likes: {
      type: Number,
      default: 0,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    reply: {
      text: String,
      createdAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one review per user per order
reviewSchema.index({ user: 1, order: 1 }, { unique: true });

// Index for restaurant to quickly fetch all reviews for a restaurant
reviewSchema.index({ restaurant: 1, createdAt: -1 });

const Review = mongoose.model('Review', reviewSchema);

export default Review;