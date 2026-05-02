app.get("/api/seed", async (req, res) => {
  try {
    const Tenant = require("./models/Tenant");
    const Camera = require("./models/Camera");

    // clear old data
    await Tenant.deleteMany();
    await User.deleteMany();
    await Camera.deleteMany();

    // ✅ FIXED tenant (added code)
    const tenant = await Tenant.create({
      name: "SGS",
      code: "SGS001"
    });

    // hash password
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
      error: err.message
    });
  }
});
