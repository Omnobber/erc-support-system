const notFound = (req, res, _next) => {
  res.status(404).json({ message: `Not found: ${req.originalUrl}` });
};

const errorHandler = (err, _req, res, _next) => {
  if (err.isJoi || err.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation error",
      details: err.details?.map((d) => d.message) || [err.message]
    });
  }

  const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  res.status(statusCode).json({
    message: err.message || "Server error"
  });
};

module.exports = { notFound, errorHandler };
