import axios from 'axios';

async function inspectRecords() {
  const baseUrl = 'http://localhost:5000';
  try {
    const res = await axios.get(`${baseUrl}/api/records`);
    const records = res.data.data.records;
    if (records.length > 0) {
      console.log('Record Sample Keys:', Object.keys(records[0]));
      console.log('Record _id:', records[0]._id);
      console.log('Record id:', records[0].id);
    } else {
      console.log('No records found.');
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

inspectRecords();
