const mongoose = require("mongoose");

const callSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true
    },
    camera: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Camera",
      required: true
    },
    issueDescription: {
      type: String,
      required: true,
      trim: true
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    assignedEngineer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    status: {
      type: String,
      enum: [
        "pending",
        "assigned",
        "in_progress",
        "awaiting_customer_approval",
        "approved",
        "completed",
        "rejected",
        "rejected_on_hold"
      ],
      default: "pending"
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },
    faultCategory: {
      type: String,
      enum: ["camera_not_working", "wiring_issue", "power_failure", "network_issue"],
      required: true
    },
    feedback: {
      type: String,
      default: ""
    },
    images: {
      before: {
        type: String,
        default: ""
      },
      after: {
        type: String,
        default: ""
      }
    },
    gps: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      visitedAt: { type: Date, default: null }
    },
    assignedAt: {
      type: Date,
      default: null
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    resolutionMinutes: {
      type: Number,
      default: null
    },
    slaDueAt: {
      type: Date,
      default: null
    },
    partsUsed: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InventoryItem",
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        }
      }
    ],
    updates: [
      {
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: { type: String },
        note: { type: String, default: "" },
        at: { type: Date, default: Date.now }
      }
    ],
    approval: {
      required: {
        type: Boolean,
        default: false
      },
      status: {
        type: String,
        enum: ["none", "awaiting", "approved", "rejected"],
        default: "none"
      },
      requestNote: {
        type: String,
        default: ""
      },
      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      requestedAt: {
        type: Date,
        default: null
      },
      decisionBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      decisionAt: {
        type: Date,
        default: null
      },
      decisionNote: {
        type: String,
        default: ""
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

callSchema.virtual("slaMinutes").get(function getSlaMinutes() {
  const end = this.completedAt || new Date();
  const diff = end.getTime() - this.createdAt.getTime();
  return Math.max(1, Math.round(diff / 60000));
});

callSchema.virtual("isOverdue").get(function getIsOverdue() {
  if (!this.slaDueAt) return false;
  if (this.status === "completed" || this.status === "rejected" || this.status === "rejected_on_hold") return false;
  return new Date() > this.slaDueAt;
});

callSchema.pre("save", function applySla(next) {
  if (!this.slaDueAt) {
    const mins = this.priority === "high" ? 120 : this.priority === "medium" ? 240 : 480;
    const base = this.createdAt || new Date();
    this.slaDueAt = new Date(base.getTime() + mins * 60000);
  }
  next();
});

callSchema.index({ tenant: 1, createdAt: -1 });

module.exports = mongoose.model("Call", callSchema);
