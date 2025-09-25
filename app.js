// app.js - Main server entry point
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { router: authRouter, setDb: setAuthDb } = require('./auth');
const { router: adminRouter, setDb: setAdminDb } = require('./admin-api');
const userModel = require('./user');
const orderModel = require('./order');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'numberpanel';
let db;
MongoClient.connect(MONGO_URI, { useUnifiedTopology: true })
  .then(client => {
    db = client.db(DB_NAME);
    setAuthDb(db);
    setAdminDb(db);
    console.log('MongoDB connected');
  })
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
