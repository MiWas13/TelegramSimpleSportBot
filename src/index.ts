import { Telegraf, Context } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize bot
const bot = new Telegraf(process.env['TELEGRAM_BOT_TOKEN']!);

// Extend context to include user data and session
interface BotContext extends Context {
  user?: {
    id: string;
    telegramId: string;
    name?: string;
  };
  session?: {
    selectedWorkoutType?: string;
  };
  match?: RegExpMatchArray;
}

// Simple in-memory session store (in production, use Redis or database)
const sessions = new Map<string, any>();

// Middleware to handle user registration
bot.use(async (ctx: BotContext, next) => {
  if (ctx.from) {
    const { id, username, first_name, last_name } = ctx.from;
    
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { telegramId: id.toString() }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: id.toString(),
          name: username || first_name || last_name || null,
        }
      });
    }

    ctx.user = {
      id: user.id,
      telegramId: user.telegramId,
      name: user.name || undefined
    };
    
    // Get session
    const sessionKey = `session_${id}`;
    ctx.session = sessions.get(sessionKey) || {};
  }
  
  await next();
});

// Start command
bot.start(async (ctx: BotContext) => {
  const welcomeMessage = `
🏃‍♂️ Welcome to Sport Tracker Bot!

Track your workouts easily with inline buttons. Here's what you can do:

📊 /stats - View your workout statistics
📋 /history - View recent workouts
❓ /help - Show this help message

Let's get started! Use the "Add Workout" button below to record your first workout.
  `;
  
  await ctx.reply(welcomeMessage.trim(), {
    reply_markup: {
      inline_keyboard: [
        [{ text: '➕ Add Workout', callback_data: 'add_workout' }],
        [{ text: '📈 My Stats', callback_data: 'my_stats' }],
        [{ text: '🏆 Leaderboard', callback_data: 'leaderboard' }]
      ]
    }
  });
});

// Help command
bot.command('help', async (ctx: BotContext) => {
  const helpMessage = `
🏃‍♂️ Sport Tracker Bot Commands:

📊 /stats - View your workout statistics
📋 /history - View recent workouts
🏆 /leaderboard - View weekly leaderboard
👨‍💼 /admin - Admin statistics (admin only)
❓ /help - Show this help message

The bot will guide you through logging workouts using easy-to-use buttons!
  `;
  
  await ctx.reply(helpMessage.trim(), {
    reply_markup: {
      inline_keyboard: [
        [{ text: '➕ Add Workout', callback_data: 'add_workout' }],
        [{ text: '📈 My Stats', callback_data: 'my_stats' }],
        [{ text: '🏆 Leaderboard', callback_data: 'leaderboard' }]
      ]
    }
  });
});

// Also keep the help handler for /help command
bot.help(async (ctx: BotContext) => {
  const helpMessage = `
🏃‍♂️ Sport Tracker Bot Commands:

📊 /stats - View your workout statistics
📋 /history - View recent workouts
❓ /help - Show this help message

The bot will guide you through logging workouts using easy-to-use buttons!
  `;
  
  await ctx.reply(helpMessage.trim(), {
    reply_markup: {
      inline_keyboard: [
        [{ text: '➕ Add Workout', callback_data: 'add_workout' }],
        [{ text: '📈 My Stats', callback_data: 'my_stats' }],
        [{ text: '🏆 Leaderboard', callback_data: 'leaderboard' }]
      ]
    }
  });
});

// Handle "Add Workout" button click
bot.action('add_workout', async (ctx: BotContext) => {
  const workoutTypes = [
    { text: '💪 Gym', callback_data: 'workout_type_GYM' },
    { text: '🎾 Tennis', callback_data: 'workout_type_TENNIS' },
    { text: '🏃‍♂️ Running', callback_data: 'workout_type_RUNNING' },
    { text: '⚽ Football', callback_data: 'workout_type_FOOTBALL' },
    { text: '🏀 Basketball', callback_data: 'workout_type_BASKETBALL' },
    { text: '🧘‍♀️ Yoga', callback_data: 'workout_type_YOGA' },
    { text: '🏊‍♂️ Swimming', callback_data: 'workout_type_SWIMMING' },
    { text: '🚴‍♂️ Cycling', callback_data: 'workout_type_CYCLING' },
    { text: '🏃‍♂️ Other', callback_data: 'workout_type_OTHER' },
  ];

  await ctx.editMessageText(
    '🏃‍♂️ Choose your workout type:',
    {
      reply_markup: {
        inline_keyboard: [
          workoutTypes.slice(0, 3),
          workoutTypes.slice(3, 6),
          workoutTypes.slice(6, 9)
        ]
      }
    }
  );
});

// Handle workout type selection
bot.action(/workout_type_(.+)/, async (ctx: any) => {
  const workoutType = ctx.match[1];
  
  // Store selected workout type in session
  if (ctx.from) {
    const sessionKey = `session_${ctx.from.id}`;
    const session = sessions.get(sessionKey) || {};
    session.selectedWorkoutType = workoutType;
    sessions.set(sessionKey, session);
    ctx.session = session;
  }
  
  const durationOptions = [
    { text: '30 min', callback_data: 'duration_30' },
    { text: '45 min', callback_data: 'duration_45' },
    { text: '60 min', callback_data: 'duration_60' },
    { text: '90 min', callback_data: 'duration_90' },
    { text: 'Custom', callback_data: 'duration_custom' },
  ];

  await ctx.editMessageText(
    `🏃‍♂️ ${workoutType.charAt(0).toUpperCase() + workoutType.slice(1).toLowerCase()} workout selected!\n\nHow long was your workout?`,
    {
      reply_markup: {
        inline_keyboard: [
          durationOptions.slice(0, 2),
          durationOptions.slice(2, 4),
          [durationOptions[4]]
        ]
      }
    }
  );
});

// Handle duration selection
bot.action(/duration_(\d+)/, async (ctx: any) => {
  const duration = parseInt(ctx.match?.[1] || '0');
  
  if (!ctx.user) {
    await ctx.editMessageText('❌ Error: Please try adding your workout again.');
    return;
  }

  // Get session data
  let workoutType = '';
  if (ctx.from) {
    const sessionKey = `session_${ctx.from.id}`;
    const session = sessions.get(sessionKey) || {};
    workoutType = session.selectedWorkoutType;
  }
  
  if (!workoutType) {
    await ctx.editMessageText('❌ Error: Please try adding your workout again.');
    return;
  }

  // Create the workout
  try {
    const workout = await prisma.workout.create({
      data: {
        userId: ctx.user.id,
        type: workoutType as any,
        duration: duration,
        createdAt: new Date(),
      }
    });

    const emoji = {
      GYM: '💪',
      TENNIS: '🎾',
      RUNNING: '🏃‍♂️',
      FOOTBALL: '⚽',
      BASKETBALL: '🏀',
      YOGA: '🧘‍♀️',
      SWIMMING: '🏊‍♂️',
      CYCLING: '🚴‍♂️',
      OTHER: '🏃‍♂️'
    }[workoutType] || '🏃‍♂️';

    await ctx.editMessageText(
      `✅ Workout logged successfully!\n\n${emoji} ${workoutType.charAt(0).toUpperCase() + workoutType.slice(1).toLowerCase()}\n⏱️ Duration: ${duration} minutes\n📅 Date: ${new Date().toLocaleDateString()}\n\nGreat job! Check your progress below:`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📈 View Stats', callback_data: 'my_stats' }],
            [{ text: '➕ Add Another Workout', callback_data: 'add_workout' }],
            [{ text: '🏠 Home', callback_data: 'home' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Error logging workout:', error);
    await ctx.editMessageText('❌ Error logging workout. Please try again.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Try Again', callback_data: 'add_workout' }]
        ]
      }
    });
  }
});

// Handle custom duration selection
bot.action('duration_custom', async (ctx: BotContext) => {
  // Store that custom duration was selected
  if (ctx.from) {
    const sessionKey = `session_${ctx.from.id}`;
    const session = sessions.get(sessionKey) || {};
    session.waitingForCustomDuration = true;
    sessions.set(sessionKey, session);
  }

  await ctx.editMessageText(
    '⏱️ Please enter the duration in minutes (e.g., 75):',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '❌ Cancel', callback_data: 'add_workout' }]
        ]
      }
    }
  );
});

// Handle custom duration text input
bot.on('text', async (ctx: BotContext) => {
  if (!ctx.from || !ctx.user) return;

  const sessionKey = `session_${ctx.from.id}`;
  const session = sessions.get(sessionKey) || {};

  if (session.waitingForCustomDuration) {
    const durationText = (ctx.message as any)?.text;
    const duration = parseInt(durationText);

    if (isNaN(duration) || duration <= 0 || duration > 1440) {
      await ctx.reply('❌ Please enter a valid duration between 1 and 1440 minutes.');
      return;
    }

    const workoutType = session.selectedWorkoutType;
    
    if (!workoutType) {
      await ctx.reply('❌ Error: Please try adding your workout again.');
      return;
    }

    // Create the workout
    try {
      const workout = await prisma.workout.create({
        data: {
          userId: ctx.user.id,
          type: workoutType as any,
          duration: duration,
          createdAt: new Date(),
        }
      });

      const emoji = {
        GYM: '💪',
        TENNIS: '🎾',
        RUNNING: '🏃‍♂️',
        FOOTBALL: '⚽',
        BASKETBALL: '🏀',
        YOGA: '🧘‍♀️',
        SWIMMING: '🏊‍♂️',
        CYCLING: '🚴‍♂️',
        OTHER: '🏃‍♂️'
      }[workoutType] || '🏃‍♂️';

      await ctx.reply(
        `✅ Workout logged successfully!\n\n${emoji} ${workoutType.charAt(0).toUpperCase() + workoutType.slice(1).toLowerCase()}\n⏱️ Duration: ${duration} minutes\n📅 Date: ${new Date().toLocaleDateString()}\n\nGreat job! Check your progress below:`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📈 View Stats', callback_data: 'my_stats' }],
              [{ text: '➕ Add Another Workout', callback_data: 'add_workout' }],
              [{ text: '🏠 Home', callback_data: 'home' }]
            ]
          }
        }
      );

      // Clear session
      session.waitingForCustomDuration = false;
      session.selectedWorkoutType = undefined;
      sessions.set(sessionKey, session);

    } catch (error) {
      console.error('Error logging workout:', error);
      await ctx.reply('❌ Error logging workout. Please try again.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Try Again', callback_data: 'add_workout' }]
          ]
        }
      });
    }
  }
});

// Stats command
bot.command('stats', async (ctx: BotContext) => {
  await showWeeklyStats(ctx);
});

// Handle "My Stats" button click
bot.action('my_stats', async (ctx: BotContext) => {
  await showWeeklyStats(ctx);
});

async function showWeeklyStats(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.reply('❌ Error: User not found');
    return;
  }

  try {
    // Get current week (Monday to Sunday)
    const now = new Date();
    const currentWeekStart = new Date(now);
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so we need 6 days back
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
        userId: ctx.user.id,
        createdAt: {
          gte: currentWeekStart,
          lte: currentWeekEnd
        }
      }
    });

    // Fetch previous week workouts
    const previousWeekWorkouts = await prisma.workout.findMany({
      where: {
        userId: ctx.user.id,
        createdAt: {
          gte: previousWeekStart,
          lte: previousWeekEnd
        }
      }
    });

    // Calculate current week stats
    const currentWeekCount = currentWeekWorkouts.length;
    const currentWeekDuration = currentWeekWorkouts.reduce((sum, w) => sum + w.duration, 0);

    // Calculate previous week stats
    const previousWeekCount = previousWeekWorkouts.length;
    const previousWeekDuration = previousWeekWorkouts.reduce((sum, w) => sum + w.duration, 0);

    // Calculate differences
    const countDiff = currentWeekCount - previousWeekCount;
    const durationDiff = currentWeekDuration - previousWeekDuration;

    // Format differences
    const countDiffText = countDiff > 0 ? `+${countDiff}` : countDiff.toString();
    const durationDiffText = durationDiff > 0 ? `+${durationDiff}` : durationDiff.toString();

    // Get current week date range
    const weekStartStr = currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekEndStr = currentWeekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    let statsMessage = `
📈 Weekly Workout Statistics
📅 ${weekStartStr} - ${weekEndStr}

🏃‍♂️ This Week:
   • Workouts: ${currentWeekCount}
   • Duration: ${currentWeekDuration} minutes

📊 vs Last Week:
   • Workouts: ${countDiffText} (${previousWeekCount} → ${currentWeekCount})
   • Duration: ${durationDiffText} min (${previousWeekDuration} → ${currentWeekDuration} min)
`;

    // Add motivational message based on performance
    if (currentWeekCount > previousWeekCount || currentWeekDuration > previousWeekDuration) {
      statsMessage += '\n🎉 Great job! You\'re improving! 💪';
    } else if (currentWeekCount === 0 && previousWeekCount === 0) {
      statsMessage += '\n🚀 Ready to start your fitness journey?';
    } else if (currentWeekCount === 0) {
      statsMessage += '\n💪 Time to get back on track!';
    } else {
      statsMessage += '\n💪 Keep up the consistency!';
    }

    // If no workouts this week, show different message
    if (currentWeekCount === 0) {
      statsMessage = `
📈 Weekly Workout Statistics
📅 ${weekStartStr} - ${weekEndStr}

🏃‍♂️ This Week: No workouts yet
📊 vs Last Week: ${countDiffText} workouts, ${durationDiffText} minutes

💪 Ready to start your fitness journey? Use the button below!
      `;
    }

    await ctx.reply(statsMessage.trim(), {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Add Workout', callback_data: 'add_workout' }],
          [{ text: '📋 View History', callback_data: 'view_history' }],
          [{ text: '🏆 Leaderboard', callback_data: 'leaderboard' }]
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching weekly stats:', error);
    await ctx.reply('❌ Error fetching statistics. Please try again.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Add Workout', callback_data: 'add_workout' }]
        ]
      }
    });
  }
}

// History command
bot.command('history', async (ctx: BotContext) => {
  await showWorkoutHistory(ctx);
});

// Handle "View History" button click
bot.action('view_history', async (ctx: BotContext) => {
  await showWorkoutHistory(ctx);
});

// Leaderboard command
bot.command('leaderboard', async (ctx: BotContext) => {
  await showLeaderboard(ctx);
});

// Handle "Leaderboard" button click
bot.action('leaderboard', async (ctx: BotContext) => {
  await showLeaderboard(ctx);
});

// Handle "Home" button click
bot.action('home', async (ctx: BotContext) => {
  await showHome(ctx);
});

// Admin command for bot statistics
bot.command('admin', async (ctx: BotContext) => {
  console.log('Admin command triggered by user:', ctx.user?.telegramId);
  console.log('Admin IDs from env:', process.env['ADMIN_USER_IDS']);
  await showAdminStats(ctx);
});

async function showAdminStats(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.reply('❌ Error: User not found');
    return;
  }

  // Check if user is admin
  const adminUserIds = process.env['ADMIN_USER_IDS']?.split(',').map(id => id.trim()) || [];
  const isAdmin = adminUserIds.includes(ctx.user.telegramId);

  if (!isAdmin) {
    await ctx.reply('❌ Access denied. Admin privileges required.');
    return;
  }

  try {
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

    // Get last 7 days for recent registrations
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 7);

    // Get all stats in parallel
    const [
      totalUsers,
      totalWorkouts,
      activeUsersThisWeek,
      activeUsersLastWeek,
      recentRegistrations,
      workoutTypes
    ] = await Promise.all([
      prisma.user.count(),
      prisma.workout.count(),
      prisma.user.count({
        where: {
          workouts: {
            some: {
              createdAt: {
                gte: currentWeekStart,
                lte: currentWeekEnd
              }
            }
          }
        }
      }),
      prisma.user.count({
        where: {
          workouts: {
            some: {
              createdAt: {
                gte: previousWeekStart,
                lte: previousWeekEnd
              }
            }
          }
        }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: lastWeekStart
          }
        }
      }),
      prisma.workout.groupBy({
        by: ['type'],
        _count: {
          type: true
        },
        orderBy: {
          _count: {
            type: 'desc'
          }
        },
        take: 1
      })
    ]);

    // Calculate averages
    const averageWorkoutsPerUser = totalUsers > 0 ? (totalWorkouts / totalUsers).toFixed(1) : '0';
    
    // Get average duration
    const avgDurationResult = await prisma.workout.aggregate({
      _avg: {
        duration: true
      }
    });
    const averageDurationPerWorkout = avgDurationResult._avg.duration?.toFixed(1) || '0';

    // Get most popular workout type
    const mostPopularWorkoutType = workoutTypes.length > 0 ? workoutTypes[0].type : 'None';

    // Calculate engagement metrics
    const weeklyActiveRate = totalUsers > 0 ? ((activeUsersThisWeek / totalUsers) * 100).toFixed(1) : '0';
    const growthRate = activeUsersLastWeek > 0 ? (((activeUsersThisWeek - activeUsersLastWeek) / activeUsersLastWeek) * 100).toFixed(1) : '0';

    const statsMessage = `
📊 Bot Statistics Report

👥 Users:
   • Total Registered: ${totalUsers}
   • Active This Week: ${activeUsersThisWeek}
   • Active Last Week: ${activeUsersLastWeek}
   • New Users (7 days): ${recentRegistrations}

🏃‍♂️ Workouts:
   • Total Workouts: ${totalWorkouts}
   • Avg per User: ${averageWorkoutsPerUser}
   • Avg Duration: ${averageDurationPerWorkout} min
   • Most Popular: ${mostPopularWorkoutType}

📈 Engagement:
   • Weekly Active Rate: ${weeklyActiveRate}%
   • Growth Rate: ${growthRate}%
    `;

    await ctx.reply(statsMessage.trim());
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    await ctx.reply('❌ Error fetching admin statistics. Please try again.');
  }
}

async function showHome(ctx: BotContext) {
  const welcomeMessage = `
🏃‍♂️ Welcome to Sport Tracker Bot!

Track your workouts easily with inline buttons. Here's what you can do:

📊 /stats - View your workout statistics
📋 /history - View recent workouts
❓ /help - Show this help message

Let's get started! Use the "Add Workout" button below to record your first workout.
  `;
  
  await ctx.editMessageText(welcomeMessage.trim(), {
    reply_markup: {
      inline_keyboard: [
        [{ text: '➕ Add Workout', callback_data: 'add_workout' }],
        [{ text: '📈 My Stats', callback_data: 'my_stats' }],
        [{ text: '🏆 Leaderboard', callback_data: 'leaderboard' }]
      ]
    }
  });
}

async function showLeaderboard(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.reply('❌ Error: User not found');
    return;
  }

  try {
    // Get current week (Monday to Sunday)
    const now = new Date();
    const currentWeekStart = new Date(now);
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so we need 6 days back
    currentWeekStart.setDate(now.getDate() - daysToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);

    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);

    // Get current week date range for display
    const weekStartStr = currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekEndStr = currentWeekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Get all users with their workout stats for the current week
    const usersWithWorkouts = await prisma.user.findMany({
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

    // Calculate stats for each user and filter out users with no workouts
    const userStats = usersWithWorkouts
      .map(user => {
        const totalDuration = user.workouts.reduce((sum, w) => sum + w.duration, 0);
        const workoutCount = user.workouts.length;
        return {
          id: user.id,
          telegramId: user.telegramId,
          name: user.name || 'Anonymous',
          totalDuration,
          workoutCount
        };
      })
      .filter(user => user.totalDuration > 0)
      .sort((a, b) => b.totalDuration - a.totalDuration)
      .slice(0, 5); // Get top 5

    if (userStats.length === 0) {
      await ctx.reply(`🏆 Weekly Leaderboard\n📅 ${weekStartStr} - ${weekEndStr}\n\nNo workouts recorded this week yet! Be the first to log a workout! 💪`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Add Workout', callback_data: 'add_workout' }]
          ]
        }
      });
      return;
    }

    // Find current user's position
    const currentUserIndex = userStats.findIndex(user => user.id === ctx.user!.id);
    const currentUserRank = currentUserIndex >= 0 ? currentUserIndex + 1 : null;

    let leaderboardMessage = `🏆 Weekly Leaderboard\n📅 ${weekStartStr} - ${weekEndStr}\n\n`;

    userStats.forEach((user, index) => {
      const rank = index + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
      const displayName = user.id === ctx.user!.id ? 'You' : user.name;
      
      leaderboardMessage += `${medal} ${displayName} — ${user.totalDuration} min (${user.workoutCount} session${user.workoutCount !== 1 ? 's' : ''})\n`;
    });

    // Add current user's position if not in top 5
    if (currentUserRank === null) {
      // Get current user's stats
      const currentUserWorkouts = await prisma.workout.findMany({
        where: {
          userId: ctx.user.id,
          createdAt: {
            gte: currentWeekStart,
            lte: currentWeekEnd
          }
        }
      });

      const currentUserDuration = currentUserWorkouts.reduce((sum, w) => sum + w.duration, 0);
      const currentUserCount = currentUserWorkouts.length;

      if (currentUserDuration > 0) {
        // Find how many users are ahead of current user
        const usersAhead = usersWithWorkouts
          .map(user => {
            const totalDuration = user.workouts.reduce((sum, w) => sum + w.duration, 0);
            return { id: user.id, totalDuration };
          })
          .filter(user => user.totalDuration > currentUserDuration).length;

        const actualRank = usersAhead + 1;
        leaderboardMessage += `\n...\n${actualRank}. You — ${currentUserDuration} min (${currentUserCount} session${currentUserCount !== 1 ? 's' : ''})`;
      }
    }

    await ctx.reply(leaderboardMessage.trim(), {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Add Workout', callback_data: 'add_workout' }],
          [{ text: '📈 My Stats', callback_data: 'my_stats' }]
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    await ctx.reply('❌ Error fetching leaderboard. Please try again.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Add Workout', callback_data: 'add_workout' }]
        ]
      }
    });
  }
}

async function showWorkoutHistory(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.reply('❌ Error: User not found');
    return;
  }

  try {
    const recentWorkouts = await prisma.workout.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    if (recentWorkouts.length === 0) {
      await ctx.reply('📋 No workouts found. Use the button below to record your first workout!', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Add Workout', callback_data: 'add_workout' }]
          ]
        }
      });
      return;
    }

    const emoji = {
      GYM: '💪',
      TENNIS: '🎾',
      RUNNING: '🏃‍♂️',
      FOOTBALL: '⚽',
      BASKETBALL: '🏀',
      YOGA: '🧘‍♀️',
      SWIMMING: '🏊‍♂️',
      CYCLING: '🚴‍♂️',
      OTHER: '🏃‍♂️'
    };

    let historyMessage = '📋 Recent Workouts:\n\n';
    
    recentWorkouts.forEach((workout, index) => {
      const workoutEmoji = emoji[workout.type as keyof typeof emoji] || '🏃‍♂️';
      const date = new Date(workout.createdAt).toLocaleDateString();
      historyMessage += `${index + 1}. ${workoutEmoji} ${workout.type.charAt(0).toUpperCase() + workout.type.slice(1).toLowerCase()} - ${workout.duration}min (${date})\n`;
    });

    await ctx.reply(historyMessage.trim(), {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Add Workout', callback_data: 'add_workout' }],
          [{ text: '📈 My Stats', callback_data: 'my_stats' }],
          [{ text: '🏆 Leaderboard', callback_data: 'leaderboard' }]
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    await ctx.reply('❌ Error fetching workout history. Please try again.');
  }
}

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Start the bot
bot.launch().then(() => {
  console.log('🏃‍♂️ Sport Tracker Bot is running!');
}).catch((error) => {
  console.error('Error starting bot:', error);
});

export default bot; 