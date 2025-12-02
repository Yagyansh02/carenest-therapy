/**
 * Migration script to add isActive field to existing users
 * Run this once to update all existing users in the database
 * 
 * Usage: node src/scripts/migrateUserActiveStatus.js
 */

import mongoose from 'mongoose';
import { User } from '../models/user.models.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function migrateUserActiveStatus() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Update all users without isActive field
    const result = await User.updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );

    console.log(`Migration completed: ${result.modifiedCount} users updated`);
    
    // Display summary
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });
    const totalUsers = await User.countDocuments();
    
    console.log('\nUser Status Summary:');
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Active Users: ${activeUsers}`);
    console.log(`Inactive Users: ${inactiveUsers}`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
}

migrateUserActiveStatus();
