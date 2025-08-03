import { VercelRequest, VercelResponse } from '@vercel/node';
import { Telegraf } from 'telegraf';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

interface WeeklyStats {
  workoutCount: number;
  totalDuration: number;
  previousWeekCount: number;
  previousWeekDuration: number;
  leaderboardPosition: number;
  totalUsers: number;
}

async function getWeeklyStats(userId: string): Promise<WeeklyStats> {
  // Get current week (Monday to Sunday)
  const now = new Date();
  const currentWeekStart = new Date(now);
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  currentWeekStart.setDate(now.getDate() - daysToMonday);
  currentWeekStart.setHours(0, 0, 0, 0);

  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
  currentWeekEnd.setHours(23, 59, 59, 999);

  // Get previous week
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(currentWeekStart.getDate() - 7);

  const previousWeekEnd = new Date(currentWeekStart);
  previousWeekEnd.setDate(currentWeekStart.getDate() - 1);
  previousWeekEnd.setHours(23, 59, 59, 999);

  // Fetch current week workouts
  const currentWeekWorkouts = await prisma.workout.findMany({
    where: {
      userId: userId,
      createdAt: {
        gte: currentWeekStart,
        lte: currentWeekEnd
      }
    }
  });

  // Fetch previous week workouts
  const previousWeekWorkouts = await prisma.workout.findMany({
    where: {
      userId: userId,
      createdAt: {
        gte: previousWeekStart,
        lte: previousWeekEnd
      }
    }
  });

  // Calculate current week stats
  const workoutCount = currentWeekWorkouts.length;
  const totalDuration = currentWeekWorkouts.reduce((sum, w) => sum + w.duration, 0);

  // Calculate previous week stats
  const previousWeekCount = previousWeekWorkouts.length;
  const previousWeekDuration = previousWeekWorkouts.reduce((sum, w) => sum + w.duration, 0);

  // Get leaderboard position
  const allUsersWithWorkouts = await prisma.user.findMany({
    include: {
      workouts: {
        where: {
          createdAt: {
            gte: currentWeekStart,
            lte: currentWeekEnd
          }
        }
      }
    }
  });

  const userStats = allUsersWithWorkouts
    .map(user => {
      const totalDuration = user.workouts.reduce((sum, w) => sum + w.duration, 0);
      return { id: user.id, totalDuration };
    })
    .filter(user => user.totalDuration > 0)
    .sort((a, b) => b.totalDuration - a.totalDuration);

  const leaderboardPosition = userStats.findIndex(user => user.id === userId) + 1;
  const totalUsers = userStats.length;

  return {
    workoutCount,
    totalDuration,
    previousWeekCount,
    previousWeekDuration,
    leaderboardPosition,
    totalUsers
  };
}

function formatProgressMessage(stats: WeeklyStats): string {
  const countDiff = stats.workoutCount - stats.previousWeekCount;
  const durationDiff = stats.totalDuration - stats.previousWeekDuration;

  let progressMessage = '';

  if (countDiff > 0) {
    progressMessage += `📈 +${countDiff} more workout${countDiff !== 1 ? 's' : ''}`;
  } else if (countDiff < 0) {
    progressMessage += `📉 ${countDiff} fewer workout${countDiff !== -1 ? 's' : ''}`;
  } else if (stats.workoutCount > 0) {
    progressMessage += `📊 Same number of workouts`;
  }

  if (durationDiff > 0) {
    progressMessage += `\n⏱️ +${durationDiff} more minutes`;
  } else if (durationDiff < 0) {
    progressMessage += `\n⏱️ ${durationDiff} fewer minutes`;
  } else if (stats.totalDuration > 0) {
    progressMessage += `\n⏱️ Same total time`;
  }

  if (stats.workoutCount === 0 && stats.previousWeekCount === 0) {
    progressMessage = '🚀 Ready to start your fitness journey!';
  } else if (stats.workoutCount === 0) {
    progressMessage = '💪 Time to get back on track!';
  }

  return progressMessage;
}

function getMotivationalMessage(stats: WeeklyStats): string {
  if (stats.workoutCount === 0) {
    return '💪 Start your fitness journey this week!';
  }

  if (stats.workoutCount > stats.previousWeekCount || stats.totalDuration > stats.previousWeekDuration) {
    return '🎉 Amazing progress! Keep up the great work!';
  }

  if (stats.leaderboardPosition <= 3) {
    return '🏆 You\'re in the top 3! Incredible performance!';
  }

  if (stats.leaderboardPosition <= 5) {
    return '🥇 Great job! You\'re in the top 5!';
  }

  return '💪 Keep pushing! Every workout counts!';
}

async function sendWeeklySummary(userId: string, userName: string): Promise<boolean> {
  try {
    const stats = await getWeeklyStats(userId);

    // Get week date range for display
    const now = new Date();
    const currentWeekStart = new Date(now);
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    currentWeekStart.setDate(now.getDate() - daysToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);

    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);

    const weekStartStr = currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekEndStr = currentWeekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    let summaryMessage = `
📊 Weekly Summary Report
📅 ${weekStartStr} - ${weekEndStr}

🏃‍♂️ This Week:
   • Workouts: ${stats.workoutCount}
   • Total Time: ${stats.totalDuration} minutes

📈 Progress from Last Week:
${formatProgressMessage(stats)}

🏆 Leaderboard Position: ${stats.leaderboardPosition > 0 ? `${stats.leaderboardPosition}/${stats.totalUsers}` : 'Not ranked'}

${getMotivationalMessage(stats)}
    `;

    // Add special message for first-time users
    if (stats.workoutCount === 0 && stats.previousWeekCount === 0) {
      summaryMessage = `
📊 Weekly Summary Report
📅 ${weekStartStr} - ${weekEndStr}

Welcome to Sport Tracker Bot! 🎉

This is your first weekly summary. Start logging your workouts to see your progress and compete on the leaderboard!

💪 Ready to begin your fitness journey?
      `;
    }

    await bot.telegram.sendMessage(userId, summaryMessage.trim(), {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Add Workout', callback_data: 'add_workout' }],
          [{ text: '📈 My Stats', callback_data: 'my_stats' }],
          [{ text: '🏆 Leaderboard', callback_data: 'leaderboard' }]
        ]
      }
    });

    return true;
  } catch (error) {
    console.error(`Error sending weekly summary to user ${userId}:`, error);
    return false;
  }
}

// Vercel cron handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this is a cron request (optional security check)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🕐 Starting weekly summary cron job...');

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        telegramId: true,
        name: true
      }
    });

    console.log(`📧 Sending weekly summaries to ${users.length} users...`);

    let successCount = 0;
    let errorCount = 0;

    // Send weekly summary to each user
    for (const user of users) {
      const success = await sendWeeklySummary(user.telegramId, user.name || 'User');
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Weekly summary completed: ${successCount} sent, ${errorCount} failed`);

    res.status(200).json({
      success: true,
      message: 'Weekly summaries sent',
      stats: {
        totalUsers: users.length,
        successCount,
        errorCount
      }
    });
  } catch (error) {
    console.error('❌ Error in weekly summary cron:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send weekly summaries'
    });
  }
} 