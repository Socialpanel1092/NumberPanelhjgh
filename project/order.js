// order.js - Order model and API for MongoDB
const { ObjectId } = require('mongodb');

module.exports = {
  // Create a new order
  async createOrder(db, { userId, service, country, price, paymentId }) {
    const order = { userId, service, country, price, paymentId, status: 'pending', createdAt: new Date() };
    const result = await db.collection('orders').insertOne(order);
    return result.insertedId;
  },

  // Fulfill order with number/code
  async fulfillOrder(db, orderId, number, code) {
    await db.collection('orders').updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { number, code, status: 'fulfilled', fulfilledAt: new Date() } }
    );
    return true;
  },

  // Get order by ID
  async getOrder(db, orderId) {
    return db.collection('orders').findOne({ _id: new ObjectId(orderId) });
  },

  // List all orders (admin)
  async listOrders(db, filter = {}) {
    return db.collection('orders').find(filter).toArray();
  }
};
