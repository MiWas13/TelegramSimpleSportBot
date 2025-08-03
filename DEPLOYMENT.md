# Deployment Guide

This guide will walk you through deploying your Sport Tracker Telegram Bot to Vercel.

## Prerequisites

1. **Telegram Bot Token**
   - Message [@BotFather](https://t.me/botfather) on Telegram
   - Create a new bot with `/newbot`
   - Save the token

2. **PostgreSQL Database**
   - **Neon** (Recommended): [neon.tech](https://neon.tech)
   - **Railway**: [railway.app](https://railway.app)
   - Save the connection string

## Step 1: Local Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Edit .env with your values
# TELEGRAM_BOT_TOKEN=your_token_here
# DATABASE_URL=your_database_url_here
```

## Step 2: Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

## Step 3: Deploy to Vercel

### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Set project name
# - Confirm deployment
```

### Option B: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Create new project
3. Connect your GitHub repository
4. Configure build settings:
   - Build Command: `npm run vercel-build`
   - Output Directory: `dist`
   - Install Command: `npm install`

## Step 4: Configure Environment Variables

In your Vercel dashboard:

1. Go to Project Settings → Environment Variables
2. Add the following variables:
   ```
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   DATABASE_URL=your_postgresql_connection_string
   NODE_ENV=production
   ADMIN_USER_IDS=your_telegram_user_id
   ```
   
   **Note**: To get your Telegram user ID, send a message to [@userinfobot](https://t.me/userinfobot) on Telegram.

## Step 5: Set Webhook URL

After deployment, set your webhook URL:

```bash
# Using the provided script
npm run setup-webhook https://your-app.vercel.app

# Or manually with curl
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-app.vercel.app/api/webhook"}'
```

## Step 6: Verify Cron Function

The weekly summary cron function is automatically configured to run every Sunday at 20:00 UTC. You can verify it's working by:

1. **Check Vercel Dashboard**: Go to your project → Functions → cron-weekly-summary
2. **Manual Test**: Visit `https://your-app.vercel.app/api/cron-weekly-summary` to test manually
3. **Monitor Logs**: Check function logs in Vercel dashboard for execution status

## Step 7: Test Your Bot

1. Find your bot on Telegram
2. Send `/start`
3. Try logging a workout with `/log`
4. Check your stats with `/stats`
5. Test admin access with `/admin` (if you're an admin)

## Troubleshooting

### Bot Not Responding

1. **Check Vercel Logs**
   - Go to Vercel dashboard → Functions → api/webhook
   - Check for errors in the logs

2. **Verify Webhook URL**
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
   ```

3. **Check Environment Variables**
   - Ensure `TELEGRAM_BOT_TOKEN` is set correctly
   - Ensure `DATABASE_URL` is accessible

### Database Connection Issues

1. **Test Database Connection**
   ```bash
   # Test locally first
   npm run db:studio
   ```

2. **Check Database URL**
   - Ensure the connection string is correct
   - Verify the database is accessible from Vercel

3. **Run Migrations**
   ```bash
   npm run db:migrate:deploy
   ```

### Build Errors

1. **Check TypeScript Errors**
   ```bash
   npm run build
   ```

2. **Verify Dependencies**
   ```bash
   npm install
   ```

## Monitoring

### Vercel Analytics
- Monitor function execution times
- Check for cold starts
- Review error rates

### Database Monitoring
- Monitor connection pool usage
- Check query performance
- Set up alerts for high usage

## Scaling Considerations

1. **Database Connection Pool**
   - Consider using connection pooling for high traffic
   - Monitor connection limits

2. **Function Timeout**
   - Default timeout is 30 seconds
   - Optimize database queries if needed

3. **Rate Limiting**
   - Telegram has rate limits
   - Implement proper error handling

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use Vercel's environment variable encryption

2. **Database Security**
   - Use SSL connections
   - Restrict database access

3. **Bot Security**
   - Validate all user inputs
   - Implement proper error handling

## Support

If you encounter issues:

1. Check the [Vercel documentation](https://vercel.com/docs)
2. Review [Telegraf documentation](https://telegraf.js.org/)
3. Check [Prisma documentation](https://www.prisma.io/docs)
4. Open an issue in the repository 