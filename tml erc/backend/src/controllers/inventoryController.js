const InventoryItem = require("../models/InventoryItem");
const asyncHandler = require("../utils/asyncHandler");

const listInventory = asyncHandler(async (req, res) => {
  const items = await InventoryItem.find({ tenant: req.tenantId }).sort({ createdAt: -1 });
  const lowStock = items.filter((item) => item.quantity <= item.threshold);
  res.json({ items, lowStock, total: items.length });
});

const createInventoryItem = asyncHandler(async (req, res) => {
  const exists = await InventoryItem.findOne({ tenant: req.tenantId, sku: req.body.sku });
  if (exists) {
    res.status(409);
    throw new Error("SKU already exists");
  }

  const item = await InventoryItem.create({
    ...req.body,
    tenant: req.tenantId
  });
  res.status(201).json({ message: "Item created", item });
});

const updateInventoryItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findOne({ _id: req.params.id, tenant: req.tenantId });
  if (!item) {
    res.status(404);
    throw new Error("Inventory item not found");
  }

  Object.assign(item, req.body);
  await item.save();
  res.json({ message: "Item updated", item });
});

module.exports = { listInventory, createInventoryItem, updateInventoryItem };
