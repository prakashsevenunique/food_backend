import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      required: [false, "Please provide a name"],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [
        /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
        "Please provide a valid email",
      ],
    },
    mobileNumber: {
      type: String,
      required: [true, "Please provide a mobile number"],
      unique: true,
    },
    role: {
      type: String,
      enum: ["user", "admin", "restaurant", "delivery"],
      default: "user",
    },
    addresses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address",
      },
    ],
    defaultAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
    },
    profilePicture: {
      type: String,
      default: "default-profile.jpg",
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurant",
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
    refreshToken: String,

    wallet: {
      type: Number,
      default: 0,
    },
    walletLastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  } else {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
