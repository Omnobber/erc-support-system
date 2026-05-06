const dotenv = require("dotenv");
const connectDB = require("./config/db");
const Camera = require("./models/Camera");

dotenv.config();

const seed = async () => {
  try {
    await connectDB();

    await Camera.deleteMany();

    await Camera.insertMany([
      { name: "Camera 1", location: "Gate", status: "working" },
      { name: "Camera 2", location: "Office", status: "not_working" }
    ]);

    console.log("✅ Data inserted");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
