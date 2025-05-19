import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a category name'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
    },
    image: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    type: {
      type: String,
      enum: ['cuisine', 'food-type', 'meal-time'],
      default: 'food-type',
    }
  },
  {
    timestamps: true,
  }
);


const Category = mongoose.model('Category', categorySchema);

export default Category;