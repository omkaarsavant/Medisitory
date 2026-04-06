const mongoose = require('mongoose');
const mongoUrl = 'mongodb://localhost:27017/medvault';

async function fix() {
  try {
    await mongoose.connect(mongoUrl);
    const db = mongoose.connection.db;
    const result = await db.collection('doctorrequests').updateMany(
      { status: 'Accepted' }, 
      { $set: { status: 'Rejected', respondedAt: new Date() } }
    );
    // Also revoke any remaining shares for a truly clean slate if the user is testing
    await db.collection('doctoraccesses').updateMany(
      { revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    console.log(`Successfully reset ${result.modifiedCount} requests and all active shares.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
