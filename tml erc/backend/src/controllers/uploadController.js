const cloudinary = require("../config/cloudinary");
const asyncHandler = require("../utils/asyncHandler");

const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("Image file is required");
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    res.status(500);
    throw new Error("Cloudinary is not configured");
  }

  const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  const folder = req.body.folder || "erc-support";

  const result = await cloudinary.uploader.upload(dataUrl, {
    folder,
    transformation: [{ width: 1600, crop: "limit" }]
  });

  res.status(201).json({
    message: "Upload successful",
    url: result.secure_url,
    publicId: result.public_id
  });
});

module.exports = { uploadImage };
