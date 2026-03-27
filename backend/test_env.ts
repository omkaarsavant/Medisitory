import path from 'path';
import dotenv from 'dotenv';
const dotEnvPath = path.join(__dirname, '../.env');
dotenv.config({ path: dotEnvPath });

console.log('--- RAZORPAY CONFIG CHECK ---');
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (keyId === 'rzp_test_placeholder') {
    console.log('KEY_ID: IS_PLACEHOLDER');
} else if (keyId) {
    console.log('KEY_ID: CUSTOM_VALUE_LENGTH_' + keyId.length);
} else {
    console.log('KEY_ID: UNDEFINED');
}

if (keySecret === 'placeholder_secret') {
    console.log('SECRET: IS_PLACEHOLDER');
} else if (keySecret) {
    console.log('SECRET: CUSTOM_VALUE_LENGTH_' + keySecret.length);
} else {
    console.log('SECRET: UNDEFINED');
}
console.log('----------------------------');
