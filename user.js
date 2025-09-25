// user.js - User model and API for MongoDB
const { ObjectId } = require('mongodb');

module.exports = {
  // Create a new user
  async createUser(db, { email, password, name }) {
    const user = { email, password, name, createdAt: new Date() };
    const result = await db.collection('users').insertOne(user);
    return result.insertedId;
  },

  // Find user by email
  async findUserByEmail(db, email) {
    return db.collection('users').findOne({ email });
  },

  // Find user by ID
  async findUserById(db, id) {
    return db.collection('users').findOne({ _id: new ObjectId(id) });
  },

  // Update user info
  async updateUser(db, id, update) {
    await db.collection('users').updateOne({ _id: new ObjectId(id) }, { $set: update });
    return true;
  },

  // Authenticate user (simple password check)
  async authenticate(db, email, password) {
    const user = await db.collection('users').findOne({ email, password });
    return user || null;
  }
};
