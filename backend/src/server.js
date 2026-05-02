const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"); // ✅ added

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

const app = express();
const server = http.createServer(app);


// ===================== SOCKET.IO =====================
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
setIO(io);


// ===================== DATABASE =====================
connectDB();


// ===================== CORS =====================
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options("*", cors());


// ===================== MIDDLEWARE =====================
app.use(express.json({ limit: "8mb" }));
app.use(morgan("dev"));


// ===================== SOCKET AUTH =====================
io.on("connection", async (socket) => {
  const token = socket.handshake.auth?.token;
  if (!token) return;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id tenant");

    if (user?.tenant) {
      socket.join(`tenant:${user.tenant.toString()}`);
    }
  } catch (error) {
    socket.disconnect(true);
  }
});


// ===================== HEALTH ROUTE =====================
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "erc-support-api" });
});


// ===================== 🔥 FINAL SEED ROUTE =====================
app.get("/api/seed", async (req, res) => {
  try {
    const Tenant = require("./models/Tenant");
    const Camera = require("./models/Camera");

    // clear old data
    await Tenant.deleteMany();
    await User.deleteMany();
    await Camera.deleteMany();

    // create tenant
    const tenant = await Tenant.create({
      name: "SGS"
    });

    // hash password (VERY IMPORTANT)
    const hashedPassword = await bcrypt.hash("123456", 10);

    // create user
    const user = await User.create({
      name: "Admin",
      email: "admin@erc.local",
      password: hashedPassword,
      role: "admin",
      tenant: tenant._id
    });

    // create cameras
    await Camera.insertMany([
      {
        name: "Front Gate Camera",
        location: "Gate",
        status: "working",
        tenant: tenant._id,
        createdBy: user._id
      },
      {
        name: "Office Camera",
        location: "Office",
        status: "not_working",
        tenant: tenant._id,
        createdBy: user._id
      },
      {
        name: "Parking Camera",
        location: "Parking",
        status: "working",
        tenant: tenant._id,
        createdBy: user._id
      }
    ]);

    res.json({
      message: "🔥 Seed successful",
      login: {
        email: "admin@erc.local",
        password: "123456"
      }
    });

  } catch (err) {
    console.error("❌ SEED ERROR FULL:", err);
    res.status(500).json({
      error: err.message,
      details: err.stack
    });
  }
});


// ===================== ROUTES =====================
app.use("/api/auth", authRoutes);
app.use("/api/cameras", cameraRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/uploads", uploadRoutes);


// ===================== ERROR HANDLING =====================
app.use(notFound);
app.use(errorHandler);


// ===================== SERVER =====================
const port = process.env.PORT || 5000;

server.listen(port, "0.0.0.0", () => {
  console.log(`API running on port ${port}`);
});
