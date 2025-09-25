// --- MongoDB Setup ---
// --- Twilio WhatsApp Setup ---
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM; // e.g. 'whatsapp:+14155238886'
const ADMIN_WHATSAPP_TO = process.env.ADMIN_WHATSAPP_TO; // e.g. 'whatsapp:+234xxxxxxxxxx'
let twilioClient;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}
const { MongoClient, ObjectId } = require('mongodb');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'numberpanel';
let db;
MongoClient.connect(MONGO_URI, { useUnifiedTopology: true })
  .then(client => {
    db = client.db(DB_NAME);
    console.log('MongoDB connected');
  })
  .catch(err => console.error('MongoDB connection error:', err));

// --- Order API ---
// Create order after payment (called by frontend)
app.post('/api/orders', async (req, res) => {
  const { userId, service, country, price, paymentId } = req.body;
  if (!userId || !service || !country || !price || !paymentId) return res.status(400).json({ error: 'Missing fields' });
  try {
    const order = { userId, service, country, price, paymentId, status: 'pending', createdAt: new Date() };
    const result = await db.collection('orders').insertOne(order);
    // WhatsApp notification to admin
    if (twilioClient && TWILIO_WHATSAPP_FROM && ADMIN_WHATSAPP_TO) {
      const msg = `New order placed!\nOrder ID: ${result.insertedId}\nUser: ${userId}\nService: ${service}\nCountry: ${country}\nPrice: ₦${price}`;
      twilioClient.messages.create({
        from: TWILIO_WHATSAPP_FROM,
        to: ADMIN_WHATSAPP_TO,
        body: msg
      }).then(() => console.log('WhatsApp notification sent to admin')).catch(err => console.error('WhatsApp error:', err.message));
    }
    res.json({ orderId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin POST real number/code to order
app.post('/api/orders/:orderId/number', async (req, res) => {
  const { number, code } = req.body;
  if (!number || !code) return res.status(400).json({ error: 'Missing number or code' });
  try {
    await db.collection('orders').updateOne(
      { _id: new ObjectId(req.params.orderId) },
      { $set: { number, code, status: 'fulfilled', fulfilledAt: new Date() } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Frontend GET order status/number
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const order = await db.collection('orders').findOne({ _id: new ObjectId(req.params.orderId) });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
const fs = require('fs');
const BALANCE_FILE = 'balance.json';

// Helper to read balance.json
function getBalanceData() {
  if (!fs.existsSync(BALANCE_FILE)) {
    fs.writeFileSync(BALANCE_FILE, JSON.stringify({ balance: 0, transactions: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(BALANCE_FILE));
}

// Helper to write balance.json
function setBalanceData(data) {
  fs.writeFileSync(BALANCE_FILE, JSON.stringify(data, null, 2));
}

// Endpoint to get current balance
app.get('/api/balance', (req, res) => {
  const data = getBalanceData();
  res.json({ balance: data.balance });
});

// Endpoint to get transaction history
app.get('/api/transactions', (req, res) => {
  const data = getBalanceData();
  res.json({ transactions: data.transactions });
});

// Endpoint to deduct from balance for order
app.post('/api/deduct', (req, res) => {
  const { amount, description } = req.body;
  let data = getBalanceData();
  if (amount > data.balance) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }
  data.balance -= amount;
  data.transactions.push({
    type: 'Order',
    amount: -amount,
    description: description || 'Order submitted',
    date: new Date().toISOString()
  });
  setBalanceData(data);
  res.json({ balance: data.balance });
});
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 5050;

const FLW_PUBLIC_KEY = process.env.FLW_PUBLIC_KEY;
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const FLW_ENCRYPTION_KEY = process.env.FLW_ENCRYPTION_KEY;

app.use(cors());
app.use(express.json());

// Flutterwave payment endpoint
app.post('/api/flutterwave-pay', async (req, res) => {
  try {
    const { amount, payment_type = 'card' } = req.body;
    // Supported payment types: card, bank_transfer, ussd, etc.
    const response = await axios.post(
      `https://api.flutterwave.com/v3/charges?type=${payment_type}`,
      {
        tx_ref: 'tx-' + Date.now(),
        amount,
        currency: 'NGN',
        redirect_url: 'https://your-frontend-url.com/payment-success',
        payment_type,
        customer: {
          email: '',
          phonenumber: '',
          name: ''
        },
        customizations: {
          title: 'Wallet Funding',
          description: 'Fund your wallet with Flutterwave',
        },
        public_key: FLW_PUBLIC_KEY,
        encryption_key: FLW_ENCRYPTION_KEY
      },
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Flutterwave payment failed', details: err.message });
  }
});

// Flutterwave webhook endpoint for payment verification
app.post('/api/flutterwave-webhook', (req, res) => {
  const event = req.body;
  if (event.event === 'charge.completed' && event.data.status === 'successful') {
    // Update balance and record transaction
    let data = getBalanceData();
    data.balance += Number(event.data.amount);
    data.transactions.push({
      type: 'Deposit',
      amount: Number(event.data.amount),
      description: 'Flutterwave funding',
      date: new Date().toISOString()
    });
    setBalanceData(data);
    console.log(`Wallet funded: ₦${event.data.amount}`);
    res.status(200).send('Webhook received');
  } else {
    res.status(200).send('Ignored');
  }
});

app.listen(PORT, () => {
  console.log(`Funding backend running on http://localhost:${PORT}`);
});
