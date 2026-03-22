const mongoose = require('mongoose');
const fs = require('fs');

async function checkMetrics() {
  try {
    await mongoose.connect('mongodb://localhost:27017/medvault');
    const db = mongoose.connection.db;
    const metrics = await db.collection('extractedmetrics').find({}).sort({ measuredDate: -1 }).limit(10).toArray();
    fs.writeFileSync('scripts/metrics_output_utf8.json', JSON.stringify(metrics, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkMetrics();
