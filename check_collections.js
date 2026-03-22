const mongoose = require('mongoose');

async function test() {
  try {
    const mongoUrl = 'mongodb://localhost:27017/medvault';
    await mongoose.connect(mongoUrl);
    console.log('Connected');

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections List:');
    collections.forEach(c => console.log(`- ${c.name}`));

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
