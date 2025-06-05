import jwt from "jsonwebtoken";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import Restaurant from "../models/restaurantModel.js";
import dotenv from "dotenv"
dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET;

export const getDashboardSummary = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token missing or malformed" });
    }

    const token = authHeader.split(" ")[1];
    console.log("token and secret key", token, SECRET_KEY)
    let decoded;
    try {
      decoded = jwt.verify(token, SECRET_KEY);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Instead of checking role inside token, check from DB
    // e.g., fetch user and check if user.role === 'admin'

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }

    // Continue with the dashboard summary aggregation
    const [orderStats, customerStats, restaurantStats] = await Promise.all([
      Order.aggregate([{ $match: { status: "completed" } }, {
        $group: { _id: null, totalRevenue: { $sum: "$amount" }, totalOrders: { $sum: 1 } },
      }]),
      User.aggregate([{ $group: { _id: null, totalCustomers: { $sum: 1 } } }]),
      Restaurant.aggregate([{ $group: { _id: null, totalRestaurants: { $sum: 1 } } }]),
    ]);

    const revenueData = orderStats[0] ?? { totalRevenue: 0, totalOrders: 0 };
    const customerData = customerStats[0] ?? { totalCustomers: 0 };
    const restaurantData = restaurantStats[0] ?? { totalRestaurants: 0 };

    return res.status(200).json({
      totalRevenue: revenueData.totalRevenue,
      totalOrders: revenueData.totalOrders,
      totalCustomers: customerData.totalCustomers,
      totalRestaurants: restaurantData.totalRestaurants,
    });

  } catch (err) {
    console.error("Dashboard Summary Error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};
