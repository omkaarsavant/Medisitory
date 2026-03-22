const mongoose = require('mongoose');

async function checkMetrics() {
  try {
    await mongoose.connect('mongodb://localhost:27017/medvault');
    const db = mongoose.connection.db;
    const metrics = await db.collection('extractedmetrics').find({}).sort({ measuredDate: -1 }).limit(10).toArray();
    console.log(JSON.stringify(metrics, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkMetrics();
