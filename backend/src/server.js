const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const cameraRoutes = require("./routes/cameraRoutes");
const callRoutes = require("./routes/callRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const reportRoutes = require("./routes/reportRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const User = require("./models/User");
const { setIO } = require("./utils/socket");
const { notFound, errorHandler } = require("./middleware/errorHandler");

dotenv.config();

const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://sgssupport.in",
  "https://www.sgssupport.in"
];
const allowedOrigins = new Set(
  [
    ...defaultOrigins,
    ...(process.env.CORS_ORIGIN || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  ]
);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [...allowedOrigins],
    credentials: true
  }
});
setIO(io);

connectDB();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  })
);

app.use(express.json({ limit: "8mb" }));
app.use(morgan("dev"));

io.on("connection", async (socket) => {
  const token = socket.handshake.auth?.token;
  if (!token) return;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id tenant");
    if (user?.tenant) {
      socket.join(`tenant:${user.tenant.toString()}`);
    }
  } catch (_error) {
    socket.disconnect(true);
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "erc-support-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/cameras", cameraRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/uploads", uploadRoutes);

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
server.listen(port, "0.0.0.0", () => {
  console.log(`API running on port ${port}`);
});
