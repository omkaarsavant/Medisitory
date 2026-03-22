const mongoose = require('mongoose');

async function test() {
  try {
    const mongoUrl = 'mongodb://localhost:27017/medvault';
    await mongoose.connect(mongoUrl);
    console.log('Connected');

    const collection = mongoose.connection.db.collection('medicalrecords');
    const records = await collection.find({}).sort({ createdAt: -1 }).limit(5).toArray();

    console.log('Last 5:');
    records.forEach(r => {
      console.log(`ID: ${r._id}`);
      console.log(`CAT: [${r.category}]`);
      console.log(`STATUS: ${r.status}`);
      console.log('---');
    });

    const uniqueCats = await collection.distinct('category');
    console.log('Unique categories:', uniqueCats);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
