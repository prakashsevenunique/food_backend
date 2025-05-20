import express from "express";
import {
  registerRider,
  getAllRiders,
  getRiderById,
  updateRider,
  deleteRider,
} from "../controllers/riderController.js";

const router = express.Router();

router.post("/register", registerRider);
router.get("/", getAllRiders);
router.get("/:id", getRiderById);
router.put("/:id", updateRider);
router.delete("/:id", deleteRider);

export default router;
