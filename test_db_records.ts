import mongoose from 'mongoose';

async function test() {
  try {
    const mongoUrl = 'mongodb://localhost:27017/medvault';
    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.db.collection('medicalrecords');
    const records = await collection.find({}).sort({ createdAt: -1 }).limit(10).toArray();

    console.log('\nLast 10 records:');
    records.forEach(r => {
      console.log(`- ID: ${r._id}, Category: ${r.category}, Status: ${r.status}, visitDate: ${r.visitDate}, uploadDate: ${r.uploadDate}`);
    });

    const bpRecords = await collection.find({ category: 'bp' }).toArray();
    console.log(`\nTotal 'bp' records: ${bpRecords.length}`);

    const bloodPressureRecords = await collection.find({ category: 'blood_pressure' }).toArray();
    console.log(`Total 'blood_pressure' records: ${bloodPressureRecords.length}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
