const mongoose = require('mongoose');

const env = require('./env');

let connectionPromise;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.mongoUri, {
      dbName: env.dbName,
      maxPoolSize: env.maxPoolSize,
      minPoolSize: env.minPoolSize,
      serverSelectionTimeoutMS: 5000,
    });

    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected');
    });

    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error', error);
    });

    mongoose.connection.on('disconnected', () => {
      connectionPromise = undefined;
      console.warn('MongoDB disconnected');
    });
  }

  await connectionPromise;
  return mongoose.connection;
}

module.exports = {
  connectToDatabase,
};