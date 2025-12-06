// ✅ backend/server.js
require('dotenv').config();

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
app.use("/api/auth", require("./routes/authRoutes"));

// ✅ Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Inventory Management System API is running',
    database: mongoose.connection.name,
    timestamp: new Date().toISOString()
  });
});

// ✅ Serve static files from frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// ✅ Root route - serve auth.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/auth.html'));
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:5000`);
  console.log(`📂 Serving static files from: ${path.join(__dirname, '../frontend')}`);
});