import mongoose from 'mongoose';

const foodItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a food item name'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
    },
    price: {
      type: Number,
      required: [true, 'Please provide a price'],
      min: 0,
    },
    discountedPrice: {
      type: Number,
      min: 0,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    image: {
      type: String,
    },
    veg: {
      type: Boolean,
      default: false,
    },
    spicyLevel: {
      type: String,
      enum: ['Mild', 'Medium', 'Hot', 'Extra Hot'],
      default: 'Medium',
    },
    ingredients: [{
      type: String,
    }],
    allergens: [{
      type: String,
    }],
    nutritionalInfo: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
      fiber: Number,
    },
    preparationTime: {
      type: Number, // in minutes
      default: 15,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    isRecommended: {
      type: Boolean,
      default: false,
    },
    serveSize: {
      type: String,
    },
    customizations: [{
      name: {
        type: String,
        required: true,
      },
      options: [{
        name: {
          type: String,
          required: true,
        },
        additionalPrice: {
          type: Number,
          default: 0,
        },
      }],
      required: {
        type: Boolean,
        default: false,
      },
      multiSelect: {
        type: Boolean,
        default: false,
      },
    }],
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for search
foodItemSchema.index({ name: 'text', description: 'text', 'ingredients': 'text' });

const FoodItem = mongoose.model('FoodItem', foodItemSchema);

export default FoodItem;