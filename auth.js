// auth.js - Authentication routes for users
const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const userModel = require('./user');

// Assume db is passed in from main server file
let db;
function setDb(database) { db = database; }

// Register route
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });
  const existing = await userModel.findUserByEmail(db, email);
  if (existing) return res.status(409).json({ error: 'Email already exists' });
  const userId = await userModel.createUser(db, { email, password, name });
  res.json({ userId });
});

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = await userModel.authenticate(db, email, password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ userId: user._id, name: user.name, email: user.email });
});

module.exports = { router, setDb };
