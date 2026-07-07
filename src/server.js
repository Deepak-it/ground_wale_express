// const serverless = require('serverless-http');
// const app = require('./app');
// const { connectToDatabase } = require('./config/db');

// let isConnected = false;

// async function initialize() {
//   if (!isConnected) {
//     await connectToDatabase();
//     isConnected = true;
//     console.log('MongoDB connected');
//   }
// }

// module.exports.handler = async (event, context) => {
//   context.callbackWaitsForEmptyEventLoop = false;

//   await initialize();

//   const handler = serverless(app);

//   return handler(event, context);
// };

const app = require('./app');
const env = require('./config/env');
const { connectToDatabase } = require('./config/db');

async function startServer() {
  await connectToDatabase();

  app.listen(env.port, () => {
    console.log(`Ground Wale API listening on port ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start API', error);
  process.exit(1);
});