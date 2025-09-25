// admin-api.js - Admin routes for order management
const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const orderModel = require('./order');

let db;
function setDb(database) { db = database; }

// List all orders
router.get('/orders', async (req, res) => {
  const orders = await orderModel.listOrders(db);
  res.json(orders);
});

// Fulfill order
router.post('/orders/:orderId/number', async (req, res) => {
  const { number, code } = req.body;
  if (!number || !code) return res.status(400).json({ error: 'Missing number or code' });
  await orderModel.fulfillOrder(db, req.params.orderId, number, code);
  res.json({ success: true });
});

module.exports = { router, setDb };
