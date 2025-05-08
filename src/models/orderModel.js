import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  foodItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodItem',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
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
  }],
  subtotal: {
    type: Number,
    required: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
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
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
    },
    taxAmount: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      required: true,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    packagingCharges: {
      type: Number,
      default: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
    },
    couponApplied: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
    },
    paymentMethod: {
      type: String,
      enum: ['COD', 'CARD', 'UPI', 'WALLET'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
    },
    paymentId: {
      type: String,
    },
    deliveryAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
      required: true,
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    orderStatus: {
      type: String,
      enum: [
        'PLACED',
        'CONFIRMED',
        'PREPARING',
        'READY_FOR_PICKUP',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
      ],
      default: 'PLACED',
    },
    cancelReason: {
      type: String,
    },
    cancelledBy: {
      type: String,
      enum: ['USER', 'RESTAURANT', 'DELIVERY_PARTNER', 'ADMIN', 'SYSTEM'],
    },
    estimatedDeliveryTime: {
      type: Date,
    },
    actualDeliveryTime: {
      type: Date,
    },
    specialInstructions: {
      type: String,
    },
    orderStatusTimeline: [{
      status: {
        type: String,
        enum: [
          'PLACED',
          'CONFIRMED',
          'PREPARING',
          'READY_FOR_PICKUP',
          'OUT_FOR_DELIVERY',
          'DELIVERED',
          'CANCELLED',
        ],
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      note: {
        type: String,
      },
    }],
    isRated: {
      type: Boolean,
      default: false,
    },
    deliveryOTP: {
      type: String,
      length: 4,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ restaurant: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ deliveryPartner: 1, orderStatus: 1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;