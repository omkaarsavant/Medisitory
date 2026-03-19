
import { validateMedicalRecord } from './backend/src/utils/validators';

const testData = {
  fasting: 120,
  post_meal: 84.3,
  random: 45.6,
  hba1c: 20
};

console.log('Testing Blood Sugar Validation with extreme values (HbA1c = 20)...');
const result = validateMedicalRecord('blood_sugar', testData);

console.log('Result:', JSON.stringify(result, null, 2));

if (result.valid) {
  console.log('SUCCESS: Extreme values are now ACCEPTED (valid: true).');
} else {
  console.log('FAILURE: Extreme values are still BLOCKED (valid: false).');
}

if (result.warnings && result.warnings.length > 0) {
    console.log('Warnings generated:', result.warnings);
}
