# Sport Tracker Telegram Bot

A TypeScript Telegram bot for logging sports workouts with inline buttons, built with Telegraf, Prisma, and PostgreSQL. Deployable on Vercel.

## Features

- 🏃‍♂️ Log workouts with easy-to-use inline buttons
- 📊 View workout statistics and progress
- 📋 Check workout history
- 🗄️ PostgreSQL database with Prisma ORM
- 🚀 Ready for Vercel deployment
- 📱 User-friendly Telegram interface

## Tech Stack

- **TypeScript** - Type-safe JavaScript
- **Telegraf 4.x** - Modern Telegram Bot API framework
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Reliable database (Neon/Railway)
- **Vercel** - Serverless deployment platform

## Prerequisites

- Node.js 18+ 
- PostgreSQL database (Neon or Railway)
- Telegram Bot Token (from @BotFather)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo>
cd sport-tg-bot
npm install
```

### 2. Environment Configuration

Copy the environment example and configure your variables:

```bash
cp env.example .env
```

Edit `.env` with your actual values:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
DATABASE_URL=postgresql://username:password@hostname:port/database
NODE_ENV=development
```

### 3. Database Setup

#### Option A: Neon (Recommended)
1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string to your `.env`

#### Option B: Railway
1. Go to [railway.app](https://railway.app)
2. Create a new PostgreSQL database
3. Copy the connection string to your `.env`

### 4. Database Migration

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Create and apply migrations
npm run db:migrate
```

### 5. Local Development

```bash
# Start development server
npm run dev
```

The bot will start in polling mode for local development.

## Deployment to Vercel

### 1. Prepare for Deployment

```bash
# Build the project
npm run build
```

### 2. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### 3. Configure Environment Variables

In your Vercel dashboard:
1. Go to your project settings
2. Add environment variables:
   - `TELEGRAM_BOT_TOKEN`
   - `DATABASE_URL`

### 4. Set Webhook URL

After deployment, set your webhook URL:

```bash
# Replace with your actual Vercel URL
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-app.vercel.app/api/webhook"}'
```

## Bot Commands

- `/start` - Welcome message and introduction
- `/help` - Show available commands
- `/log` - Log a new workout with inline buttons
- `/stats` - View your weekly workout statistics
- `/history` - View recent workouts
- `/leaderboard` - View weekly leaderboard
- `/admin` - View bot statistics (admin only)

## Features

### 📊 Weekly Statistics
- View your workout count and duration for the current week
- Compare progress with the previous week
- See your leaderboard position

### 🏆 Weekly Leaderboard
- Compete with other users based on total workout time
- See top 5 performers for the current week
- Track your position in the rankings

### 📧 Weekly Summary (Automatic)
- Receive a detailed summary every Sunday at 20:00 UTC
- Includes workout count, total time, progress comparison, and leaderboard position
- Motivational messages based on your performance

### 🔧 Admin Features
- `/admin` command for bot administrators
- View total user count, workout statistics, and engagement metrics
- Access via Telegram command or web endpoint
- Secure access control via environment variables

## Database Schema

### Users Table
- `id` - Unique identifier
- `telegramId` - Telegram user ID
- `name` - User's name (optional)
- `createdAt` - Account creation timestamp

### Workouts Table
- `id` - Unique identifier
- `userId` - Reference to user
- `type` - Workout type (enum: GYM, TENNIS, RUNNING, FOOTBALL, BASKETBALL, YOGA, SWIMMING, CYCLING, OTHER)
- `duration` - Duration in minutes
- `createdAt` - Record creation timestamp

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
npm run db:migrate   # Create and apply migrations
```

### Project Structure

```
sport-tg-bot/
├── api/
│   └── webhook.ts          # Vercel API handler
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   └── index.ts           # Main bot file (for local development)
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

If you encounter any issues:
1. Check the logs in Vercel dashboard
2. Verify your environment variables
3. Ensure your database is accessible
4. Check that your webhook URL is correctly set 