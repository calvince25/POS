import { server } from './app';
import dotenv from 'dotenv';
import prisma from './services/prisma';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function main() {
  try {
    // Start ngrok tunnel for M-Pesa callbacks in development
    if (process.env.NODE_ENV !== 'production') {
      try {
        const ngrok = require('ngrok');
        const url = await ngrok.connect({
          addr: PORT,
          authtoken: process.env.NGROK_AUTHTOKEN,
        });
        process.env.MPESA_TUNNEL_URL = `${url}/api/payments/mpesa/callback`;
        console.log(`\x1b[32m🚀 M-Pesa Tunnel Active: ${url}\x1b[0m`);
        console.log(`\x1b[34m🔗 Callback URL: ${process.env.MPESA_TUNNEL_URL}\x1b[0m`);
      } catch (err) {
        console.warn('\x1b[33m⚠️  Failed to start ngrok tunnel (check your internet or token):\x1b[0m', err);
      }
    }

    // With SQLite adapter, $connect is implicit sometimes, but we keep the structure
    console.log('Successfully connected to the database.');

    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error connecting to the database:', error);
    process.exit(1);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
