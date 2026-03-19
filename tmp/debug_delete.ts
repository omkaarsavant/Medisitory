import axios from 'axios';

async function testDelete() {
  const baseUrl = 'http://localhost:5000';
  
  try {
    // 1. Get all records to find one to delete
    console.log('Fetching records...');
    const listRes = await axios.get(`${baseUrl}/api/records`);
    const records = listRes.data.data.records;
    
    if (records.length === 0) {
      console.log('No records found to delete.');
      return;
    }
    
    const recordToDelete = records[0];
    const id = recordToDelete._id || recordToDelete.id;
    console.log(`Attempting to delete record: ${id} (${recordToDelete.category})`);
    
    // 2. Perform delete
    const deleteRes = await axios.delete(`${baseUrl}/api/records/${id}`);
    console.log('Delete response:', JSON.stringify(deleteRes.data, null, 2));
    
    // 3. Verify deletion
    const verifyRes = await axios.get(`${baseUrl}/api/records/${id}`).catch(err => err.response);
    if (verifyRes.status === 404) {
      console.log('SUCCESS: Record is gone.');
    } else {
      console.log('FAILURE: Record still exists or returned status:', verifyRes.status);
    }
    
  } catch (error: any) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testDelete();
