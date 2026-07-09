const mongoose = require('mongoose');

const env = require('./env');

let connectionPromise;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
mongodb://deepakit031:<db_password>@ac-cpp7uoq-shard-00-00.kyeygzd.mongodb.net:27017,ac-cpp7uoq-shard-00-01.kyeygzd.mongodb.net:27017,ac-cpp7uoq-shard-00-02.kyeygzd.mongodb.net:27017/?ssl=true&replicaSet=atlas-dzjg67-shard-0&authSource=admin&appName=Cluster0
  if (!connectionPromise) {
    connectionPromise = mongoose.connect('mongodb://deepakit031:1234@ac-cpp7uoq-shard-00-00.kyeygzd.mongodb.net:27017,ac-cpp7uoq-shard-00-01.kyeygzd.mongodb.net:27017,ac-cpp7uoq-shard-00-02.kyeygzd.mongodb.net:27017/?ssl=true&replicaSet=atlas-dzjg67-shard-0&authSource=admin&appName=Cluster0', {
      dbName: 'ground-booking',
      maxPoolSize: 10,
      minPoolSize: 2,
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