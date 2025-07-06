import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, university } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if user already exists by name (for reuse of accounts)
    let existingUser = await prisma.user.findFirst({
      where: { name }
    });

    // If no user found by name but email provided, check by email
    if (!existingUser && email) {
      existingUser = await prisma.user.findUnique({
        where: { email }
      });
    }

    if (existingUser) {
      // Calculate enhanced stats for existing user (same logic as leaderboard)
      const userWithResults = await prisma.user.findUnique({
        where: { id: existingUser.id },
        include: {
          testResults: {
            where: {
              success: true
            },
            select: {
              responseTime: true,
              database: true,
              operationType: true,
              createdAt: true
            }
          }
        }
      });

      if (userWithResults) {
        // Calculate enhanced stats
        const totalTests = userWithResults.testResults.length;
        const avgResponseTime = totalTests > 0 
          ? userWithResults.testResults.reduce((sum, result) => sum + result.responseTime, 0) / totalTests
          : 0;
        
        const mongoTests = userWithResults.testResults.filter(r => r.database === 'MONGODB').length;
        const elasticTests = userWithResults.testResults.filter(r => r.database === 'ELASTICSEARCH').length;
        
        // Calculate database-specific averages
        const mongoResults = userWithResults.testResults.filter(r => r.database === 'MONGODB');
        const elasticResults = userWithResults.testResults.filter(r => r.database === 'ELASTICSEARCH');
        
        const mongoAvgTime = mongoResults.length > 0 
          ? Math.round(mongoResults.reduce((sum, r) => sum + r.responseTime, 0) / mongoResults.length)
          : 0;
        
        const elasticAvgTime = elasticResults.length > 0 
          ? Math.round(elasticResults.reduce((sum, r) => sum + r.responseTime, 0) / elasticResults.length)
          : 0;

        // Calculate recent activity (last 24 hours)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const recentTests = userWithResults.testResults.filter(r => r.createdAt > yesterday).length;
        
        // Performance rating based on response times
        const performanceRating = avgResponseTime === 0 ? 'Not Rated' : 
          avgResponseTime < 50 ? 'Excellent' :
          avgResponseTime < 100 ? 'Good' :
          avgResponseTime < 200 ? 'Average' :
          avgResponseTime < 500 ? 'Poor' : 'Poor';

        const enhancedUser = {
          id: userWithResults.id,
          name: userWithResults.name,
          email: userWithResults.email,
          score: userWithResults.score,
          totalTests,
          avgResponseTime: Math.round(avgResponseTime),
          mongoTests,
          elasticTests,
          mongoAvgTime,
          elasticAvgTime,
          recentTests,
          performanceRating,
          preferredDatabase: mongoAvgTime < elasticAvgTime ? 'MongoDB' : 'Elasticsearch',
          efficiency: totalTests > 0 ? Math.round((userWithResults.score / totalTests) * 100) : 0,
          createdAt: userWithResults.createdAt,
          updatedAt: userWithResults.updatedAt,
          lastActive: userWithResults.testResults.length > 0 
            ? Math.max(...userWithResults.testResults.map(r => r.createdAt.getTime()))
            : userWithResults.createdAt.getTime()
        };

        return res.json({ 
          success: true, 
          user: enhancedUser,
          message: 'Welcome back! Using your existing account.' 
        });
      }

      // Fallback to basic user if enhanced stats calculation fails
      return res.json({ 
        success: true, 
        user: existingUser,
        message: 'Welcome back! Using your existing account.' 
      });
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        name,
        email: email || null,
      }
    });

    return res.json({ 
      success: true, 
      user,
      message: 'User registered successfully' 
    });
  } catch (error) {
    console.error('User registration error:', error);
    return res.status(500).json({ error: 'Failed to register user' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        testResults: {
          where: {
            success: true
          },
          select: {
            responseTime: true,
            database: true,
            operationType: true,
            createdAt: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate enhanced stats (same logic as leaderboard and registration)
    const totalTests = user.testResults.length;
    const avgResponseTime = totalTests > 0 
      ? user.testResults.reduce((sum, result) => sum + result.responseTime, 0) / totalTests
      : 0;
    
    const mongoTests = user.testResults.filter(r => r.database === 'MONGODB').length;
    const elasticTests = user.testResults.filter(r => r.database === 'ELASTICSEARCH').length;
    
    // Calculate database-specific averages
    const mongoResults = user.testResults.filter(r => r.database === 'MONGODB');
    const elasticResults = user.testResults.filter(r => r.database === 'ELASTICSEARCH');
    
    const mongoAvgTime = mongoResults.length > 0 
      ? Math.round(mongoResults.reduce((sum, r) => sum + r.responseTime, 0) / mongoResults.length)
      : 0;
    
    const elasticAvgTime = elasticResults.length > 0 
      ? Math.round(elasticResults.reduce((sum, r) => sum + r.responseTime, 0) / elasticResults.length)
      : 0;

    // Calculate recent activity (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentTests = user.testResults.filter(r => r.createdAt > yesterday).length;
    
    // Performance rating based on response times
    const performanceRating = avgResponseTime === 0 ? 'Not Rated' : 
      avgResponseTime < 50 ? 'Excellent' :
      avgResponseTime < 100 ? 'Good' :
      avgResponseTime < 200 ? 'Average' :
      avgResponseTime < 500 ? 'Poor' : 'Poor';

    const enhancedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      score: user.score,
      totalTests,
      avgResponseTime: Math.round(avgResponseTime),
      mongoTests,
      elasticTests,
      mongoAvgTime,
      elasticAvgTime,
      recentTests,
      performanceRating,
      preferredDatabase: mongoAvgTime < elasticAvgTime ? 'MongoDB' : 'Elasticsearch',
      efficiency: totalTests > 0 ? Math.round((user.score / totalTests) * 100) : 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastActive: user.testResults.length > 0 
        ? Math.max(...user.testResults.map(r => r.createdAt.getTime()))
        : user.createdAt.getTime(),
      rank: 0, // Will be calculated by frontend if needed
      isTopPerformer: false // Will be calculated by frontend if needed
    };

    return res.json({ success: true, user: enhancedUser });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Failed to get user' });
  }
});

// Get leaderboard
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { score: 'desc' },
      take: 50,
      include: {
        testResults: {
          where: {
            success: true
          },
          select: {
            responseTime: true,
            database: true,
            operationType: true,
            createdAt: true
          }
        }
      }
    });

    // Calculate enhanced stats for each user
    const leaderboard = users.map(user => {
      const totalTests = user.testResults.length;
      const avgResponseTime = totalTests > 0 
        ? user.testResults.reduce((sum, result) => sum + result.responseTime, 0) / totalTests
        : 0;
      
      const mongoTests = user.testResults.filter(r => r.database === 'MONGODB').length;
      const elasticTests = user.testResults.filter(r => r.database === 'ELASTICSEARCH').length;
      
      // Calculate database-specific averages
      const mongoResults = user.testResults.filter(r => r.database === 'MONGODB');
      const elasticResults = user.testResults.filter(r => r.database === 'ELASTICSEARCH');
      
      const mongoAvgTime = mongoResults.length > 0 
        ? Math.round(mongoResults.reduce((sum, r) => sum + r.responseTime, 0) / mongoResults.length)
        : 0;
      
      const elasticAvgTime = elasticResults.length > 0 
        ? Math.round(elasticResults.reduce((sum, r) => sum + r.responseTime, 0) / elasticResults.length)
        : 0;

      // Calculate recent activity (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const recentTests = user.testResults.filter(r => r.createdAt > yesterday).length;
      
      // Performance rating based on response times
      const performanceRating = avgResponseTime === 0 ? 0 : 
        avgResponseTime < 50 ? 'A' :
        avgResponseTime < 100 ? 'B' :
        avgResponseTime < 200 ? 'C' :
        avgResponseTime < 500 ? 'D' : 'F';

      return {
        id: user.id,
        name: user.name,
        score: user.score,
        totalTests,
        avgResponseTime: Math.round(avgResponseTime),
        mongoTests,
        elasticTests,
        mongoAvgTime,
        elasticAvgTime,
        recentTests,
        performanceRating,
        preferredDatabase: mongoAvgTime < elasticAvgTime ? 'MongoDB' : 'Elasticsearch',
        efficiency: totalTests > 0 ? Math.round((user.score / totalTests) * 100) : 0,
        createdAt: user.createdAt,
        lastActive: user.testResults.length > 0 
          ? Math.max(...user.testResults.map(r => r.createdAt.getTime()))
          : user.createdAt.getTime()
      };
    });

    // Add ranking
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1,
      isTopPerformer: index < 3
    }));

    return res.json({ 
      success: true, 
      leaderboard: rankedLeaderboard,
      totalUsers: users.length,
      totalTests: users.reduce((sum, user) => sum + user.testResults.length, 0),
      avgScore: users.length > 0 
        ? Math.round(users.reduce((sum, user) => sum + user.score, 0) / users.length)
        : 0
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

export default router; 