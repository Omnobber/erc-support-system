const mongoose = require("mongoose");

const inventoryItemSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    sku: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    threshold: {
      type: Number,
      required: true,
      min: 0,
      default: 5
    },
    unit: {
      type: String,
      default: "pcs",
      trim: true
    }
  },
  { timestamps: true }
);

inventoryItemSchema.index({ tenant: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model("InventoryItem", inventoryItemSchema);
