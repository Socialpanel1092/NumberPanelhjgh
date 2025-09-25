// Create payment link endpoint for redirect mode
app.post('/api/flutterwave-pay', async (req, res) => {
  const { amount, email, phone, name } = req.body;
  console.log('Received add funds request:', { amount, email, name });
  if (!amount || !email || !name) {
    console.log('Missing required fields:', { amount, email, name });
    return res.status(400).json({ status: 'error', message: 'Missing required fields.' });
  }
  try {
    const tx_ref = 'NP-' + Date.now();
    const paymentPayload = {
      tx_ref,
      amount,
      currency: 'NGN',
      redirect_url: req.headers.origin ? req.headers.origin + '/project/payment-success.html' : 'http://localhost:5000/project/payment-success.html',
      payment_options: 'card,banktransfer,ussd',
      customer: { email, phonenumber: phone, name },
      customizations: {
        title: 'NUMBERPANEL Add Funds',
        description: 'Fund your account',
        logo: 'https://www.flutterwave.com/images/logo-colored.svg'
      }
    };
    console.log('Sending payment payload to Flutterwave:', paymentPayload);
    const response = await axios.post('https://api.flutterwave.com/v3/payments', paymentPayload, {
      headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` }
    });
    console.log('Flutterwave API response:', response.data);
    if (response.data && response.data.status === 'success' && response.data.data && response.data.data.link) {
      console.log('Payment link created:', response.data.data.link);
      return res.json({ status: 'success', data: response.data.data });
    } else {
      console.log('Failed to create payment link:', response.data);
      return res.status(400).json({ status: 'failed', message: 'Could not create payment link.' });
    }
  } catch (err) {
    console.log('Error creating payment link:', err.message);
    return res.status(500).json({ status: 'error', message: 'Payment link creation failed.', error: err.message });
  }
});
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

// Flutterwave config from .env
const FLW_PUBLIC_KEY = process.env.FLW_PUBLIC_KEY;
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
console.log('FLW_PUBLIC_KEY:', FLW_PUBLIC_KEY ? '[LOADED]' : '[NOT FOUND]');
console.log('FLW_SECRET_KEY:', FLW_SECRET_KEY ? '[LOADED]' : '[NOT FOUND]');

// Placeholder endpoint for frontend to get public key
app.get('/api/flutterwave-key', (req, res) => {
  res.json({ publicKey: FLW_PUBLIC_KEY });
});


// Real endpoint for verifying payment with Flutterwave
const axios = require('axios');
app.post('/api/verify-payment', async (req, res) => {
  const { transaction_id } = req.body;
  if (!transaction_id) return res.status(400).json({ status: 'error', message: 'No transaction_id provided.' });
  try {
    const flwRes = await axios.get(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` }
    });
    if (flwRes.data && flwRes.data.status === 'success' && flwRes.data.data.status === 'successful') {
      return res.json({ status: 'success', data: flwRes.data.data });
    } else {
      return res.status(400).json({ status: 'failed', message: 'Payment not successful.' });
    }
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Verification failed.', error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
