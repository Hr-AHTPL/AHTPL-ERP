// ✅ backend/server.js
require('dotenv').config(); // Load environment variables

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ MongoDB Atlas Connection with fallback
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DBURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB Atlas (Company DB)");
  } catch (err) {
    console.error("❌ Primary DB connection error:", err);
    console.log("⚠️ Attempting backup database...");
    try {
      await mongoose.connect(process.env.DBURL2, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("✅ Connected to Backup MongoDB Atlas");
    } catch (err2) {
      console.error("❌ CRITICAL: Cannot connect to any database!");
      process.exit(1);
    }
  }
};

connectDB();

// ✅ API Routes
app.use("/api/items", require("./routes/itemRoutes"));
app.use("/api/machines", require("./routes/machineRoutes"));
app.use("/api/production", require("./routes/productionRoutes"));
app.use("/api/purchases", require("./routes/purchaseRoutes"));
app.use("/api/manufacturing-items", require("./routes/manufacturingItemRoutes"));
app.use("/api/issue-to-wip", require("./routes/issueRoutes"));
app.use("/api/dispatches", require("./routes/dispatchRoutes"));

// ✅ Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// ✅ Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Inventory Management System API is running',
    database: mongoose.connection.name,
    timestamp: new Date().toISOString()
  });
});

// ✅ 404 handler
app.use(/^\/api\/.*$/, (req, res) => {
  res.status(404).json({ 
    message: 'API endpoint not found',
    path: req.path 
  });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
<<<<<<< HEAD
});
=======
});
>>>>>>> 9adb2910dc5a1e98129a9208e688e50992f9d7ce
