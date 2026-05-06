const express = require("express");
const {
  listCameras,
  createCamera,
  updateCamera,
  deleteCamera,
  cameraDetails
} = require("../controllers/cameraController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { createCameraSchema, updateCameraSchema } = require("../validators/cameraValidator");

const router = express.Router();

router.use(protect);
router.get("/", listCameras);
router.get("/:id/details", cameraDetails);
router.post("/", authorize("admin"), validate(createCameraSchema), createCamera);
router.patch("/:id", authorize("admin"), validate(updateCameraSchema), updateCamera);
router.delete("/:id", authorize("admin"), deleteCamera);

module.exports = router;
