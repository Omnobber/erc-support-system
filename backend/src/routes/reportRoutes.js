const express = require("express");
const {
  reportAnalytics,
  reportCompare,
  exportPdf,
  exportExcel
} = require("../controllers/reportController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect, authorize("admin"));
router.get("/", reportAnalytics);
router.get("/summary", reportAnalytics);
router.get("/compare", reportCompare);
router.get("/export", exportPdf);
router.get("/export/pdf", exportPdf);
router.get("/export/excel", exportExcel);

module.exports = router;
