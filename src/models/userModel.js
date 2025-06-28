import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: false,
      trim: true,
    },
    email: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/,
        "Please provide a valid email",
      ],
    },
    mobileNumber: {
      type: String,
      required: false,
      unique: true,
      match: [/^\d{10}$/, "Mobile number must be 10 digits"],
    },
    role: {
      type: String,
      enum: ["user", "admin", "restaurant", "delivery"],
      default: "user",
    },
    addresses: [
      {
        label: { type: String },
        address: { type: String },
        latitude: { type: Number },
        longitude: { type: Number },
      },
    ],
    defaultAddress: {
      label: { type: String },
      address: { type: String },
      latitude: { type: Number },
      longitude: { type: Number },
    },
    profilePicture: {
      type: String,
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurant",
      },
    ],

    // ✅ Soft delete flag
    isActive: {
      type: Boolean,
      default: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    refreshToken: {
      type: String,
    },

    wallet: {
      type: Number,
      default: 0,
    },

    walletLastUpdated: {
      type: Date,
      default: Date.now,
    },

    password: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Hash password before saving (if modified)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ✅ Method to match hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ✅ Optional: Exclude inactive users from default queries
// userSchema.pre(/^find/, function (next) {
//   this.find({ isActive: { $ne: false } });
//   next();
// });

const User = mongoose.model("User", userSchema);

export default User;
