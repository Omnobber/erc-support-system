const express = require("express");
const { summary, engineerPerformance } = require("../controllers/dashboardController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.get("/summary", summary);
router.get("/engineer-performance", authorize("admin"), engineerPerformance);

module.exports = router;
