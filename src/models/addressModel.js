import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
    required: true
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true
  }
});

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    addressType: {
      type: String,
      enum: ['HOME', 'WORK', 'OTHER'],
      default: 'HOME',
    },
    addressLine1: {
      type: String,
      required: [true, 'Please provide address line 1'],
    },
    addressLine2: {
      type: String,
    },
    landmark: {
      type: String,
    },
    city: {
      type: String,
      required: [true, 'Please provide city'],
    },
    state: {
      type: String,
      required: [true, 'Please provide state'],
    },
    country: {
      type: String,
      required: [true, 'Please provide country'],
      default: 'India',
    },
    postalCode: {
      type: String,
      required: [true, 'Please provide postal code'],
    },
    contactPhone: {
      type: String,
      required: [true, 'Please provide contact phone'],
    },
    contactName: {
      type: String,
      required: [true, 'Please provide contact name'],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    location: {
      type: locationSchema,
      index: '2dsphere',
    },
    deliveryInstructions: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

addressSchema.index({ user: 1, isDefault: 1 });

const Address = mongoose.model('Address', addressSchema);

export default Address;