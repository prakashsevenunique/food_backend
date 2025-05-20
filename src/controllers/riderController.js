import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Rider from "../models/riderModel.js";

export const registerRider = asyncHandler(async (req, res) => {
  const { name, mobile, email, vehicleNumber } = req.body;

  const existingRider = await Rider.findOne({ mobile });
  if (existingRider) {
    res.status(400);
    throw new Error("Rider with this mobile already exists");
  }

  const rider = await Rider.create({
    name,
    mobile,
    email,
    vehicleNumber,
  });

  res.status(201).json({
    success: true,
    data: rider,
  });
});

export const getAllRiders = asyncHandler(async (req, res) => {
  const riders = await Rider.find().sort({ createdAt: -1 });
  res.json({ success: true, data: riders });
});

export const getRiderById = asyncHandler(async (req, res) => {
  const rider = await Rider.findById(req.params.id);
  if (!rider) {
    res.status(404);
    throw new Error("Rider not found");
  }
  res.json({ success: true, data: rider });
});

export const updateRider = asyncHandler(async (req, res) => {
  const rider = await Rider.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!rider) {
    res.status(404);
    throw new Error("Rider not found");
  }
  res.json({ success: true, data: rider });
});

export const deleteRider = asyncHandler(async (req, res) => {
  const rider = await Rider.findByIdAndDelete(req.params.id);
  if (!rider) {
    res.status(404);
    throw new Error("Rider not found");
  }
  res.json({ success: true, message: "Rider deleted" });
});
