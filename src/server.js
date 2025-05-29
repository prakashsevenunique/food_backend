import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';

import userRoutes from './routes/userRoutes.js';
import restaurantRoutes from './routes/restaurantRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import riderRoutes from "./routes/riderRoutes.js";
import paymentRoutes from './routes/paymentRoutes.js';

import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import { logger } from './utils/logger.js';
import connectDB from './config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import https from 'https';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4080;

connectDB()

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(compression());


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/users', userRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/wallet', walletRoutes);
app.use("/api/riders", riderRoutes);
app.use('/api/payment', paymentRoutes);

app.get('/', (req, res) => {
  res.send('Food Delivery API is running...');
});

const RD_SERVICE_BASE = "http://127.0.0.1:11100";

// Get RD device info
async function getDeviceInfo() {
  try {
    const response = await axios.get(`${RD_SERVICE_BASE}/getinfo`);
    return response.data;
  } catch (err) {
    console.error("Error fetching device info:", err.message);
    return null;
  }
}

// Create PID options XML
function createPidOptionsXML() {
  return `
  <PidOptions ver="1.0">
      <Opts fCount="1" fType="0" iCount="0" pCount="0"
            format="0" pidVer="2.0" timeout="20000"
            env="P" wadh="" posh="UNKNOWN"/>
  </PidOptions>
  `.trim();
}

// Capture fingerprint data
async function captureFingerprint(pidOptionsXml) {
  try {
    const response = await axios.post(`${RD_SERVICE_BASE}/capture`, pidOptionsXml, {
      headers: { "Content-Type": "text/xml" },
    });
    return response.data;
  } catch (err) {
    console.error("Error during capture:", err.message);
    return null;
  }
}

// // Extract PID block (base64 encoded) from capture response
// function extractPidBlock(xmlResponse) {
//   try {
//     const parser = new XMLParser({ ignoreAttributes: false });
//     const json = parser.parse(xmlResponse);
//     const pidData = json?.PidData?.Data;
//     return pidData || "PID Data not found.";
//   } catch (err) {
//     console.error("Error parsing PID response:", err.message);
//     return null;
//   }
// }

// Main runner
(async () => {
  console.log("Getting RD device info...");
  const deviceInfo = await getDeviceInfo();
  console.log("Device Info:\n", deviceInfo);

  console.log("\nCreating PID Options XML...");
  const pidOptions = createPidOptionsXML();
  console.log(pidOptions);

  console.log("\nCapturing fingerprint...");
  const captureResponse = await captureFingerprint(pidOptions);
  console.log("Capture Response:\n", captureResponse);

  // console.log("\nExtracting PID Block...");
  // const pidBlock = extractPidBlock(captureResponse);
  // console.log("PID Block:\n", pidBlock);
})();



app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;