import axios from "axios";
import User from "../models/userModel.js";
import Otp from "../models/otp.js";
import asyncHandler from "../utils/asyncHandler.js";
import generateToken from "../utils/generateToken.js";
import { logger } from "../utils/logger.js";
// import Address from "../models/addressModel.js";
import upload from "../config/multer.js";

export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendSMSController = async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({ message: "Mobile number is required" });
    }
    if (mobileNumber.length != 10) {
      return res
        .status(400)
        .json({ message: "Mobile number must be 10 digit" });
    }
    const otp = generateOtp();

    await Otp.findOneAndUpdate(
      { mobileNumber },
      {
        code: otp,
        expiresAt: new Date(Date.now() + 4 * 60 * 1000),
      },
      { upsert: true, new: true }
    );

    await axios.post(
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

    const user = await User.findOne({ mobileNumber });

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
  const { mobileNumber, otp, fullName, role } = req.body;

  const otpEntry = await Otp.findOne({ mobileNumber });

  if (!otpEntry || otpEntry.expiresAt < Date.now()) {
    return res.status(400).json({ message: "OTP expired or not found" });
  }

  if (otpEntry.code !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  await Otp.deleteOne({ mobileNumber });

  let user = await User.findOne({ mobileNumber });

  if (!user) {
    user = await User.create({
      mobileNumber,
      role: "user",
      isVerified: true,
      wallet: 0,
      walletLastUpdated: new Date(),
    });
  } else {
    user.isVerified = true;

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
      user,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-otp -otpExpires");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json(user);
});

export const updateUserTextOnly = asyncHandler(async (req, res) => {
  const { name, email, addresses, defaultAddress, favorite } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (name) user.fullName = name;
  if (Array.isArray(addresses)) user.addresses = addresses;
  if (defaultAddress) user.defaultAddress = defaultAddress;
  if (favorite) user.favorite = favorite;
  if (email) user.email = email;

  const updatedUser = await user.save();

  res.json({
    success: true,
    data: {
      _id: updatedUser._id,
      name: updatedUser.fullName,
      mobileNumber: updatedUser.mobileNumber,
      email: updatedUser.email,
      role: updatedUser.role,
      profilePicture: updatedUser.profilePicture,
    },
  });
});

export const updateUserProfileImage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!req.file) {
    res.status(400);
    throw new Error("No profile picture uploaded");
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  user.profilePicture = fileUrl;

  const updatedUser = await user.save();

  res.json({
    success: true,
    data: {
      _id: updatedUser._id,
      name: updatedUser.name,
      mobileNumber: updatedUser.mobileNumber,
      role: updatedUser.role,
      profilePicture: updatedUser.profilePicture,
      addresses: updatedUser.addresses,
      defaultAddress: updatedUser.defaultAddress || null,
      favorite: updatedUser.favorite || [],
      token: generateToken(updatedUser._id),
    },
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    order = 'desc',
    name,
    email,
    role,
  } = req.query;

  const filter = {};
  if (name) filter.name = { $regex: name, $options: 'i' };
  if (email) filter.email = { $regex: email, $options: 'i' };
  if (role) filter.role = role;

  const pageNumber = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const skip = (pageNumber - 1) * pageSize;
  const sortOrder = order === 'asc' ? 1 : -1;

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(pageSize),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: users,
    pagination: {
      total,
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
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

  // Check if restaurant is already in favorites
  if (user.favorites.includes(restaurantId)) {
    res.status(400);
    throw new Error("Restaurant already in favorites");
  }

  // Add restaurant to favorites
  user.favorites.push(restaurantId);
  await user.save();

  // Populate favorites with full restaurant data
  const populatedUser = await User.findById(user._id).populate({
    path: 'favorites',
    model: 'Restaurant',
    select: 'name address image rating', // Optional: select specific fields
  });

  res.status(200).json({
    success: true,
    message: "Restaurant added to favorites",
    data: populatedUser.favorites,
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
  const user = await User.findById(req.user._id).populate("favorites").populate({
    path: "favorites", populate: {
      path: "cuisine", select: "name"
    }
  });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const favoritesWithFlag = user.favorites.map((restaurant) => ({
    ...restaurant.toObject(),
    favorite: true,
  }));

  res.status(200).json({
    success: true,
    data: favoritesWithFlag,
  });
});

export const addAddress = async (req, res) => {
  try {
    const userId = req.user._id; // assuming user ID from auth middleware
    const { label, address, latitude, longitude } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.addresses.push({ label, address, latitude, longitude });
    await user.save();

    res.status(200).json({ message: "Address added successfully", addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const addressId = req.params.addressId;
    const { label, address, latitude, longitude } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const addressToUpdate = user.addresses.id(addressId);
    if (!addressToUpdate) return res.status(404).json({ message: "Address not found" });

    addressToUpdate.label = label ?? addressToUpdate.label;
    addressToUpdate.address = address ?? addressToUpdate.address;
    addressToUpdate.latitude = latitude ?? addressToUpdate.latitude;
    addressToUpdate.longitude = longitude ?? addressToUpdate.longitude;

    await user.save();
    res.status(200).json({ message: "Address updated successfully", addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getAddresses = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("addresses defaultAddress");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ addresses: user.addresses, defaultAddress: user.defaultAddress });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const addressId = req.params.addressId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const address = user.addresses.id(addressId);
    if (!address) return res.status(404).json({ message: "Address not found" });

    address.remove();
    await user.save();

    res.status(200).json({ message: "Address deleted successfully", addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteUserByIdNoToken = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!user.isActive) {
    return res.status(400).json({
      success: false,
      message: "User profile is already deactivated",
    });
  }

  user.isActive = false;
  await user.save();

  res.status(200).json({
    success: true,
    message: "User profile deactivated (soft deleted)",
    data: {
      _id: user._id,
      fullName: user.fullName,
      mobileNumber: user.mobileNumber,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      profilePicture: user.profilePicture,
    },
  });
});