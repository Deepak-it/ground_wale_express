const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || 'mongodb+srv://deepakit031:1234@cluster0.kyeygzd.mongodb.net/',
  dbName: process.env.DB_NAME || 'ground-booking',
  maxPoolSize: Number(process.env.MAX_POOL_SIZE || 10),
  minPoolSize: Number(process.env.MIN_POOL_SIZE || 2),
  corsOrigin: process.env.CORS_ORIGIN || '*',
};