const express = require("express");
const {
  listInventory,
  createInventoryItem,
  updateInventoryItem
} = require("../controllers/inventoryController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  createInventoryItemSchema,
  updateInventoryItemSchema
} = require("../validators/inventoryValidator");

const router = express.Router();

router.use(protect);
router.get("/", listInventory);
router.post("/", authorize("admin"), validate(createInventoryItemSchema), createInventoryItem);
router.patch("/:id", authorize("admin"), validate(updateInventoryItemSchema), updateInventoryItem);

module.exports = router;
