import axios from "axios";
import User from "../models/userModel.js";
import Otp from "../models/otp.js";
import asyncHandler from "../utils/asyncHandler.js";
import generateToken from "../utils/generateToken.js";
import { logger } from "../utils/logger.js";
import Address from "../models/addressModel.js";

export const generateOtp = () => {
  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return otp;
};

export const sendSMSController = async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    // Save or update OTP in the database
    await Otp.findOneAndUpdate(
      { mobileNumber },
      { code: otp, expiresAt },
      { upsert: true, new: true }
    );

    // Send SMS via Fast2SMS
    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "q",
        sender_id: "FINUNI",
        message: `Dear user, Your OTP for login is ${otp}. Do not share with anyone - Finunique Small Pvt. Ltd.`,
        language: "english",
        numbers: mobileNumber,
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
        },
      }
    );

    const user = await User.findOne({ phone: mobileNumber });

    return res.json({
      message: "OTP sent successfully",
      existing: !!user,
    });
  } catch (error) {
    console.error("Error in sendSMSController:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyOTP = asyncHandler(async (req, res) => {
  const { mobileNumber, otp, role } = req.body;

  const otpEntry = await Otp.findOne({ mobileNumber });

  if (!otpEntry || otpEntry.expiresAt < Date.now()) {
    return res.status(400).json({ message: "OTP expired or not found" });
  }

  if (otpEntry.code !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  // Delete OTP entry
  await Otp.deleteOne({ mobileNumber });

  // Find or create user
  let user = await User.findOne({ mobileNumber });

  if (!user) {
    user = await User.create({
      mobileNumber,
      role: ["user", "restaurant", "delivery", "admin"].includes(role) ? role : "user",
      isVerified: true,
      wallet: 0,
      walletLastUpdated: new Date(),
    });
  } else {
    user.isVerified = true;

    // Initialize wallet if not already present
    if (!user.wallet || typeof user.wallet !== "number") {
      user.wallet = 0;
      user.walletLastUpdated = new Date();
    }

    await user.save();
  }

  res.json({
    success: true,
    data: {
      _id: user._id,
      mobileNumber: user.mobileNumber,
      role: user.role,
      token: generateToken(user._id),
    },
  });
});

export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("addresses");

  if (user) {
    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        mobileNumber: user.mobileNumber,
        role: user.role,
        addresses: user.addresses,
        defaultAddress: user.defaultAddress,
        profilePicture: user.profilePicture,
        favorites: user.favorites,
      },
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

export const updateUserProfile = asyncHandler(async (req, res) => {
  const { name, mobileNumber, profilePicture, addresses } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Handle mobileNumber update with OTP verification
  if (mobileNumber && mobileNumber !== user.mobileNumber) {
    if (!otp) {
      return res
        .status(400)
        .json({ message: "OTP is required to update mobile number" });
    }

    const otpEntry = await Otp.findOne({ mobileNumber });

    if (!otpEntry || otpEntry.expiresAt < Date.now()) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    if (otpEntry.code !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const existingUser = await User.findOne({ mobileNumber });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res
        .status(400)
        .json({ message: "Mobile number already in use by another user" });
    }

    user.mobileNumber = mobileNumber;
    await Otp.deleteOne({ mobileNumber });
  }

  // Update other profile fields
  if (name) user.name = name;
  if (profilePicture) user.profilePicture = profilePicture;
  if (Array.isArray(addresses)) user.addresses = addresses;

  const updatedUser = await user.save();
  logger.info(`User profile updated: ${user._id}`);

  res.json({
    success: true,
    data: {
      _id: updatedUser._id,
      name: updatedUser.name,
      mobileNumber: updatedUser.mobileNumber,
      role: updatedUser.role,
      profilePicture: updatedUser.profilePicture,
      addresses: updatedUser.addresses,
      token: generateToken(updatedUser._id),
    },
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({});
  res.json({
    success: true,
    data: users,
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    await user.deleteOne();
    logger.info(`User deleted: ${user._id}`);

    res.json({ success: true, message: "User removed" });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

export const addFavorite = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const restaurantId = req.params.id;

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.favorites.includes(restaurantId)) {
    res.status(400);
    throw new Error("Restaurant already in favorites");
  }

  user.favorites.push(restaurantId);
  await user.save();

  res.status(200).json({
    success: true,
    message: "Restaurant added to favorites",
    data: user.favorites,
  });
});

export const removeFavorite = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const restaurantId = req.params.id;

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!user.favorites.includes(restaurantId)) {
    res.status(400);
    throw new Error("Restaurant not in favorites");
  }

  user.favorites = user.favorites.filter(
    (favorite) => favorite.toString() !== restaurantId
  );
  await user.save();

  res.status(200).json({
    success: true,
    message: "Restaurant removed from favorites",
    data: user.favorites,
  });
});

export const getFavorites = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("favorites");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json({
    success: true,
    data: user.favorites,
  });
});
