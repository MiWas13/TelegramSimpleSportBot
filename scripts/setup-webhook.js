#!/usr/bin/env node

/**
 * Script to set up Telegram webhook after Vercel deployment
 * Usage: node scripts/setup-webhook.js <vercel-url>
 */

const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const VERCEL_URL = process.argv[2];

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN environment variable is required');
  process.exit(1);
}

if (!VERCEL_URL) {
  console.error('❌ Vercel URL is required');
  console.log('Usage: node scripts/setup-webhook.js <vercel-url>');
  console.log('Example: node scripts/setup-webhook.js https://your-app.vercel.app');
  process.exit(1);
}

const webhookUrl = `${VERCEL_URL}/api/webhook`;

console.log('🤖 Setting up Telegram webhook...');
console.log(`📡 Webhook URL: ${webhookUrl}`);

const postData = JSON.stringify({
  url: webhookUrl,
  allowed_updates: ['message', 'callback_query']
});

const options = {
  hostname: 'api.telegram.org',
  port: 443,
  path: `/bot${BOT_TOKEN}/setWebhook`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (response.ok) {
        console.log('✅ Webhook set successfully!');
        console.log(`📊 Webhook info: ${JSON.stringify(response.result, null, 2)}`);
      } else {
        console.error('❌ Failed to set webhook:', response.description);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error parsing response:', error);
      console.log('Raw response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error);
  process.exit(1);
});

req.write(postData);
req.end(); 