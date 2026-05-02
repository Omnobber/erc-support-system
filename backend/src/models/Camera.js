const mongoose = require("mongoose");

const cameraSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true
    },
    cameraId: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["active", "faulty", "maintenance"],
      default: "active"
    },
    lastCheckedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      default: ""
    },
    lastIssue: {
      type: String,
      default: ""
    },
    lastServiceDate: {
      type: Date,
      default: null
    },
    lastFaultCategory: {
      type: String,
      enum: ["camera_not_working", "wiring_issue", "power_failure", "network_issue", ""],
      default: ""
    },
    assignedEngineer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { timestamps: true }
);

cameraSchema.index({ tenant: 1, cameraId: 1 }, { unique: true });

module.exports = mongoose.model("Camera", cameraSchema);
