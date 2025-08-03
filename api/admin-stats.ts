import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// Admin user IDs (add your Telegram user ID here)
const ADMIN_USER_IDS = process.env['ADMIN_USER_IDS']?.split(',').map(id => id.trim()) || [];

interface DatabaseStats {
  totalUsers: number;
  totalWorkouts: number;
  activeUsersThisWeek: number;
  activeUsersLastWeek: number;
  averageWorkoutsPerUser: number;
  averageDurationPerWorkout: number;
  mostPopularWorkoutType: string;
  recentRegistrations: number;
}

async function getDatabaseStats(): Promise<DatabaseStats> {
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

  return {
    totalUsers,
    totalWorkouts,
    activeUsersThisWeek,
    activeUsersLastWeek,
    averageWorkoutsPerUser: parseFloat(averageWorkoutsPerUser),
    averageDurationPerWorkout: parseFloat(averageDurationPerWorkout),
    mostPopularWorkoutType,
    recentRegistrations
  };
}

// Vercel API handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Check if it's a GET request (for browser access) or POST (for bot command)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // For POST requests, verify admin access
    if (req.method === 'POST') {
      const telegramUserId = req.body?.from?.id?.toString();
      
      if (!telegramUserId || !ADMIN_USER_IDS.includes(telegramUserId)) {
        return res.status(403).json({ 
          error: 'Access denied. Admin privileges required.',
          message: 'Only authorized admin users can access this endpoint.'
        });
      }
    }

    console.log('📊 Fetching admin statistics...');

    const stats = await getDatabaseStats();

    const statsMessage = `
📊 Bot Statistics Report

👥 Users:
   • Total Registered: ${stats.totalUsers}
   • Active This Week: ${stats.activeUsersThisWeek}
   • Active Last Week: ${stats.activeUsersLastWeek}
   • New Users (7 days): ${stats.recentRegistrations}

🏃‍♂️ Workouts:
   • Total Workouts: ${stats.totalWorkouts}
   • Avg per User: ${stats.averageWorkoutsPerUser}
   • Avg Duration: ${stats.averageDurationPerWorkout} min
   • Most Popular: ${stats.mostPopularWorkoutType}

📈 Engagement:
   • Weekly Active Rate: ${stats.totalUsers > 0 ? ((stats.activeUsersThisWeek / stats.totalUsers) * 100).toFixed(1) : '0'}%
   • Growth Rate: ${stats.activeUsersLastWeek > 0 ? (((stats.activeUsersThisWeek - stats.activeUsersLastWeek) / stats.activeUsersLastWeek) * 100).toFixed(1) : '0'}%
    `;

    // For POST requests (bot command), return formatted message
    if (req.method === 'POST') {
      return res.status(200).json({
        success: true,
        message: statsMessage.trim(),
        stats: stats
      });
    }

    // For GET requests (browser access), return JSON
    return res.status(200).json({
      success: true,
      message: statsMessage.trim(),
      stats: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin statistics'
    });
  }
} 