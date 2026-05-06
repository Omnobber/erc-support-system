const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Tenant = require("../models/Tenant");
const User = require("../models/User");
const Camera = require("../models/Camera");
const Call = require("../models/Call");
const InventoryItem = require("../models/InventoryItem");

dotenv.config();

const users = (tenantId) => [
  {
    tenant: tenantId,
    name: "ERC Admin",
    email: "admin@erc.local",
    password: "Admin@123",
    role: "admin",
    phone: "+91-9000000000"
  },
  {
    tenant: tenantId,
    name: "Krishna Mahato",
    email: "krishna@erc.local",
    password: "Engineer@123",
    role: "engineer",
    phone: "+91-9000000001"
  },
  {
    tenant: tenantId,
    name: "Santosh Singh Munda",
    email: "santosh@erc.local",
    password: "Engineer@123",
    role: "engineer",
    phone: "+91-9000000002"
  },
  {
    tenant: tenantId,
    name: "ERC Client User",
    email: "client@erc.local",
    password: "Client@123",
    role: "client",
    phone: "+91-9000000003"
  }
];

const buildCameras = (tenantId) => {
  const rows = [];
  for (let i = 1; i <= 37; i += 1) {
    let status = "active";
    if (i >= 30 && i <= 34) status = "faulty";
    if (i >= 35) status = "maintenance";
    rows.push({
      tenant: tenantId,
      cameraId: `CAM-${String(i).padStart(3, "0")}`,
      name: `Camera ${i}`,
      location: `Zone ${Math.ceil(i / 4)} - Pole ${i}`,
      status,
      notes: ""
    });
  }
  return rows;
};

const run = async () => {
  await connectDB();

  await Promise.all([
    Tenant.deleteMany({}),
    User.deleteMany({}),
    Camera.deleteMany({}),
    Call.deleteMany({}),
    InventoryItem.deleteMany({})
  ]);

  const tenant = await Tenant.create({
    name: "ERC Main Facility",
    code: "ERC-001"
  });

  const createdUsers = await User.create(users(tenant._id));
  const createdCameras = await Camera.insertMany(buildCameras(tenant._id));

  const admin = createdUsers.find((u) => u.role === "admin");
  const client = createdUsers.find((u) => u.role === "client");
  const engineers = createdUsers.filter((u) => u.role === "engineer");

  await InventoryItem.insertMany([
    { tenant: tenant._id, name: "CCTV Camera", sku: "CAM-SP-01", quantity: 12, threshold: 5 },
    { tenant: tenant._id, name: "Network Wire (m)", sku: "WIRE-100", quantity: 280, threshold: 100 },
    { tenant: tenant._id, name: "Power Adapter", sku: "PWR-ADP", quantity: 9, threshold: 4 },
    { tenant: tenant._id, name: "DVR Unit", sku: "DVR-4CH", quantity: 3, threshold: 2 }
  ]);

  await Call.insertMany([
    {
      tenant: tenant._id,
      camera: createdCameras[29]._id,
      issueDescription: "No video feed detected from DVR sync.",
      raisedBy: client._id,
      assignedEngineer: engineers[0]._id,
      status: "assigned",
      priority: "high",
      faultCategory: "network_issue",
      assignedAt: new Date()
    },
    {
      tenant: tenant._id,
      camera: createdCameras[30]._id,
      issueDescription: "Intermittent blackout during night hours.",
      raisedBy: admin._id,
      assignedEngineer: engineers[1]._id,
      status: "in_progress",
      priority: "high",
      faultCategory: "power_failure",
      assignedAt: new Date(Date.now() - 1000 * 60 * 50),
      startedAt: new Date(Date.now() - 1000 * 60 * 35)
    },
    {
      tenant: tenant._id,
      camera: createdCameras[31]._id,
      issueDescription: "Video stream disconnected from switch.",
      raisedBy: client._id,
      assignedEngineer: engineers[0]._id,
      status: "completed",
      priority: "medium",
      faultCategory: "wiring_issue",
      assignedAt: new Date(Date.now() - 1000 * 60 * 600),
      startedAt: new Date(Date.now() - 1000 * 60 * 560),
      completedAt: new Date(Date.now() - 1000 * 60 * 520),
      resolutionMinutes: 80
    }
  ]);

  console.log("Seed completed.");
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
