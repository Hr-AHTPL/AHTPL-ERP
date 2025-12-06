// backend/scripts/createAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

// Admin credentials - CHANGE THESE!
const ADMIN_CREDENTIALS = {
  username: 'admin',
  email: 'hr@ahtpl.in',
  password: 'Admin@123',  // Change this to a secure password
  role: 'Admin'
};

async function createAdmin() {
  try {
    // Connect to database
    await mongoose.connect(process.env.DBURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      $or: [
        { username: ADMIN_CREDENTIALS.username },
        { email: ADMIN_CREDENTIALS.email }
      ]
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log('Username:', existingAdmin.username);
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      process.exit(0);
    }

    // Create admin user
    const admin = new User(ADMIN_CREDENTIALS);
    await admin.save();

    console.log('✅ Admin user created successfully!');
    console.log('═══════════════════════════════════');
    console.log('Username:', ADMIN_CREDENTIALS.username);
    console.log('Email:', ADMIN_CREDENTIALS.email);
    console.log('Password:', ADMIN_CREDENTIALS.password);
    console.log('Role:', ADMIN_CREDENTIALS.role);
    console.log('═══════════════════════════════════');
    console.log('⚠️  IMPORTANT: Change the password after first login!');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();