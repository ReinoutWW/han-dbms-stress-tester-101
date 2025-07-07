import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { MongoClient } from 'mongodb';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { Server } from 'socket.io';
import { config } from '../config';

// Create stress test routes with Socket.io integration
export function createStressTestRoutes(io?: Server) {
  const router = Router();
  const prisma = new PrismaClient();

  // Initialize database clients
  const mongoClient = new MongoClient(config.databases.mongodb.url);
  const elasticsearchClient = new ElasticsearchClient({
    node: config.databases.elasticsearch.url
  });

  // Database status endpoint
  router.get('/database/status', async (req, res) => {
  try {
    const status = {
      postgres: { connected: false, responseTime: 0 },
      mongodb: { connected: false, responseTime: 0 },
      elasticsearch: { connected: false, responseTime: 0 }
    };

    // Test PostgreSQL
    const pgStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      status.postgres.connected = true;
      status.postgres.responseTime = Date.now() - pgStart;
    } catch (error) {
      console.error('PostgreSQL health check failed:', error);
    }

    // Test MongoDB
    const mongoStart = Date.now();
    try {
      await mongoClient.db().admin().ping();
      status.mongodb.connected = true;
      status.mongodb.responseTime = Date.now() - mongoStart;
    } catch (error) {
      console.error('MongoDB health check failed:', error);
    }

    // Test Elasticsearch
    const esStart = Date.now();
    try {
      await elasticsearchClient.ping();
      status.elasticsearch.connected = true;
      status.elasticsearch.responseTime = Date.now() - esStart;
    } catch (error) {
      console.error('Elasticsearch health check failed:', error);
    }

    return res.json({ success: true, status });
  } catch (error) {
    console.error('Database status error:', error);
    return res.status(500).json({ error: 'Failed to check database status' });
  }
});

  // Run stress test
  router.post('/run', async (req, res) => {
  try {
    const { userId, testType = 'STRESS_TEST', operations = 100 } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const testStartTime = Date.now();

    // Emit test started event
    if (io) {
      console.log('🚀 Emitting test:started event for user:', userId);
      io.emit('test:started', {
        userId,
        database: 'BOTH', // Testing both databases
        operationType: 'STRESS_TEST',
        userName: user.name,
        startTime: testStartTime
      });
      
      // IMMEDIATELY emit a test operation:completed event to verify the flow
      console.log('🧪 Emitting test operation:completed event for debugging');
      io.emit('operation:completed', {
        userId,
        database: 'MONGODB',
        operationName: 'TEST DEBUG OPERATION',
        operationNumber: 0,
        totalOperations: operations,
        responseTime: 42,
        success: true,
        errorMessage: null,
        timestamp: Date.now()
      });
    }

    // Generate test data
    const testData = Array.from({ length: operations }, (_, i) => ({
      id: `test-${userId}-${Date.now()}-${i}`,
      name: `Test Document ${i}`,
      description: `Stress test document for performance comparison`,
      timestamp: new Date().toISOString(),
      userId: userId,
      metadata: {
        testRun: Date.now(),
        operation: i,
        randomValue: Math.random()
      }
    }));

    // Run MongoDB test
    const mongoResults = await runMongoDBTest(testData, userId, testType, io);
    
    // Run Elasticsearch test
    const elasticResults = await runElasticsearchTest(testData, userId, testType, io);

    // Calculate user score based on results
    const totalSuccessful = mongoResults.filter(r => r.success).length + 
                          elasticResults.filter(r => r.success).length;
    const scoreIncrease = Math.floor(totalSuccessful / 10); // 1 point per 10 successful operations

    // Update user score
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        score: {
          increment: scoreIncrease
        }
      }
    });

    const testEndTime = Date.now();

    // Emit test completed and leaderboard update events
    if (io) {
      io.emit('test:completed', {
        userId,
        userName: user.name,
        scoreEarned: scoreIncrease,
        newScore: updatedUser.score,
        testDuration: testEndTime - testStartTime,
        mongoResults: mongoResults.length,
        elasticResults: elasticResults.length
      });

      io.emit('leaderboard:updated', {
        userId,
        userName: user.name,
        newScore: updatedUser.score,
        scoreIncrease
      });
    }

    // Calculate enhanced statistics
    const mongoStats = calculateEnhancedStats(mongoResults);
    const elasticStats = calculateEnhancedStats(elasticResults);

    // Get error details
    const mongoErrors = mongoResults.filter(r => !r.success).map(r => r.errorMessage).filter(e => e !== null) as string[];
    const elasticErrors = elasticResults.filter(r => !r.success).map(r => r.errorMessage).filter(e => e !== null) as string[];

    // Enhanced response with detailed UI data
    const enhancedStats = {
      testInfo: {
        testId: `${userId}-${Date.now()}`,
        userId,
        userName: user.name,
        startTime: testStartTime,
        endTime: testEndTime,
        duration: testEndTime - testStartTime,
        operationsRequested: operations,
        totalOperations: operations * 2,
        scoreEarned: scoreIncrease
      },
      mongodb: {
        ...mongoStats,
        database: 'MongoDB',
        errors: mongoErrors.slice(0, 5), // First 5 errors for UI
        errorTypes: getErrorTypes(mongoErrors),
        latencyBreakdown: getLatencyBreakdown(mongoResults.filter(r => r.success))
      },
      elasticsearch: {
        ...elasticStats,
        database: 'Elasticsearch',
        errors: elasticErrors.slice(0, 5), // First 5 errors for UI
        errorTypes: getErrorTypes(elasticErrors),
        latencyBreakdown: getLatencyBreakdown(elasticResults.filter(r => r.success))
      },
      comparison: {
        winner: mongoStats.avgResponseTime < elasticStats.avgResponseTime ? 'MongoDB' : 'Elasticsearch',
        mongoAdvantage: elasticStats.avgResponseTime - mongoStats.avgResponseTime,
        successRateDiff: mongoStats.successRate - elasticStats.successRate,
        performanceRatio: elasticStats.avgResponseTime / mongoStats.avgResponseTime || 1
      }
    };

    return res.json({ 
      success: true, 
      stats: enhancedStats,
      message: `Stress test completed! You earned ${scoreIncrease} points.`
    });
  } catch (error) {
    console.error('Stress test error:', error);
    return res.status(500).json({ error: 'Failed to run stress test' });
  }
});

// Deprecated: Old test data endpoint removed
// Use /load-kaggle-data for loading the actual transaction dataset

// Load Kaggle CSV data endpoint
router.post('/load-kaggle-data', async (req, res) => {
  try {
    const { createReadStream, existsSync, readdirSync } = require('fs');
    const { parse } = require('csv-parse');
    const path = require('path');
    
    // Get optional parameters from request
    const { batchSize = 10000, dataPath: customDataPath } = req.body;
    
    console.log('🚀 Starting Kaggle data loading...');
    const dataPath = customDataPath || '/data/kaggle-finance';
    
    // Emit loading started event
    if (io) {
      io.emit('data:loading:progress', {
        stage: 'started',
        message: 'Starting Kaggle data loading',
        totalStages: 4, // users, cards, transactions, indexing
        currentStage: 0,
        timestamp: Date.now()
      });
    }
    
    if (!existsSync(dataPath)) {
      return res.status(404).json({ 
        error: 'Kaggle data path not found', 
        path: dataPath,
        message: 'Please ensure /data/kaggle-finance/*.csv files are mounted' 
      });
    }
    
    const files = readdirSync(dataPath).filter((file: string) => file.endsWith('.csv'));
    
    if (files.length === 0) {
      return res.status(404).json({ 
        error: 'No CSV files found',
        path: dataPath 
      });
    }
    
    console.log(`📁 Found ${files.length} CSV files: ${files.join(', ')}`);
    
    // Load data in proper order: users -> cards -> transactions
    const users = new Map();
    const cards = new Map();
    let totalTransactions = 0;
    let totalUsers = 0;
    let totalCards = 0;
    
    // Helper function to clean amount strings
    const cleanAmount = (amountStr: string): number => {
      if (!amountStr) return 0;
      // Remove $ and commas, then parse
      const cleaned = amountStr.replace(/[$,]/g, '');
      return parseFloat(cleaned) || 0;
    };
    
    // Load users first
    const usersFile = files.find((f: string) => f.includes('users'));
    if (usersFile) {
      const usersPath = path.join(dataPath, usersFile);
      console.log(`👤 Loading users from ${usersFile}...`);
      
      await new Promise((resolve, reject) => {
        createReadStream(usersPath)
          .pipe(parse({
            columns: true,
            delimiter: ',',
            skip_empty_lines: true
          }))
          .on('data', (row: any) => {
            const user = {
              id: row.id,
              current_age: parseInt(row.current_age) || 0,
              retirement_age: parseInt(row.retirement_age) || 0,
              birth_year: parseInt(row.birth_year) || 0,
              birth_month: parseInt(row.birth_month) || 0,
              gender: row.gender || '',
              address: row.address || '',
              latitude: parseFloat(row.latitude) || 0,
              longitude: parseFloat(row.longitude) || 0,
              per_capita_income: parseFloat(row.per_capita_income) || 0
            };
            users.set(user.id, user);
            totalUsers++;
            
            // Emit progress update every 100 users
            if (totalUsers % 100 === 0 && io) {
              io.emit('data:loading:progress', {
                stage: 'users',
                message: `Loading users: ${totalUsers.toLocaleString()} processed`,
                currentStage: 1,
                totalStages: 4,
                itemsProcessed: totalUsers,
                timestamp: Date.now()
              });
            }
          })
          .on('end', () => {
            console.log(`✅ Loaded ${totalUsers} users`);
            if (io) {
              io.emit('data:loading:progress', {
                stage: 'users_complete',
                message: `Completed loading ${totalUsers.toLocaleString()} users`,
                currentStage: 1,
                totalStages: 4,
                itemsProcessed: totalUsers,
                timestamp: Date.now()
              });
            }
            resolve(users);
          })
          .on('error', reject);
      });
    }
    
    // Load cards
    const cardsFile = files.find((f: string) => f.includes('cards'));
    if (cardsFile) {
      const cardsPath = path.join(dataPath, cardsFile);
      console.log(`💳 Loading cards from ${cardsFile}...`);
      
      await new Promise((resolve, reject) => {
        createReadStream(cardsPath)
          .pipe(parse({
            columns: true,
            delimiter: ',',
            skip_empty_lines: true
          }))
          .on('data', (row: any) => {
            const card = {
              id: row.id,
              client_id: row.client_id,
              card_brand: row.card_brand || '',
              card_type: row.card_type || '',
              card_number: row.card_number || '',
              expires: row.expires || '',
              cvv: row.cvv || '',
              has_chip: row.has_chip === 'TRUE' || row.has_chip === 'true' || row.has_chip === '1',
              num_cards: parseInt(row.num_cards) || 0,
              credit_limit: parseFloat(row.credit_limit) || 0
            };
            cards.set(card.id, card);
            totalCards++;
            
            // Emit progress update every 500 cards
            if (totalCards % 500 === 0 && io) {
              io.emit('data:loading:progress', {
                stage: 'cards',
                message: `Loading cards: ${totalCards.toLocaleString()} processed`,
                currentStage: 2,
                totalStages: 4,
                itemsProcessed: totalCards,
                timestamp: Date.now()
              });
            }
          })
          .on('end', () => {
            console.log(`✅ Loaded ${totalCards} cards`);
            if (io) {
              io.emit('data:loading:progress', {
                stage: 'cards_complete',
                message: `Completed loading ${totalCards.toLocaleString()} cards`,
                currentStage: 2,
                totalStages: 4,
                itemsProcessed: totalCards,
                timestamp: Date.now()
              });
            }
            resolve(cards);
          })
          .on('error', reject);
      });
    }
    
    // Create indices for Elasticsearch and MongoDB
    // Delete existing indices/collections
    try {
      await elasticsearchClient.indices.delete({ index: 'transactions' });
      await elasticsearchClient.indices.delete({ index: 'users' });
      await elasticsearchClient.indices.delete({ index: 'cards' });
    } catch (error) {
      // Indices might not exist
    }
    
    // Create new indices with proper mappings
    await elasticsearchClient.indices.create({
      index: 'users',
      body: {
        mappings: {
          properties: {
            id: { type: 'keyword' },
            current_age: { type: 'integer' },
            retirement_age: { type: 'integer' },
            birth_year: { type: 'integer' },
            birth_month: { type: 'integer' },
            gender: { type: 'keyword' },
            address: { type: 'text' },
            latitude: { type: 'float' },
            longitude: { type: 'float' },
            per_capita_income: { type: 'float' }
          }
        }
      }
    });
    
    await elasticsearchClient.indices.create({
      index: 'cards',
      body: {
        mappings: {
          properties: {
            id: { type: 'keyword' },
            client_id: { type: 'keyword' },
            card_brand: { type: 'keyword' },
            card_type: { type: 'keyword' },
            card_number: { type: 'keyword' },
            expires: { type: 'keyword' },
            cvv: { type: 'keyword' },
            has_chip: { type: 'boolean' },
            num_cards: { type: 'integer' },
            credit_limit: { type: 'float' }
          }
        }
      }
    });
    
    await elasticsearchClient.indices.create({
      index: 'transactions',
      body: {
        mappings: {
          properties: {
            id: { type: 'keyword' },
            date: { type: 'date' },
            client_id: { type: 'keyword' },
            card_id: { type: 'keyword' },
            amount: { type: 'float' },
            use_chip: { type: 'boolean' },
            merchant_id: { type: 'keyword' },
            merchant_city: { type: 'keyword' },
            merchant_state: { type: 'keyword' },
            zip: { type: 'keyword' },
            mcc: { type: 'keyword' }
          }
        }
      }
    });
    
    // Connect to MongoDB first
    const mongoClient = new MongoClient(config.databases.mongodb.url);
    await mongoClient.connect();
    const db = mongoClient.db('showdown_benchmark');
    
    // Clear and recreate MongoDB collections
    try {
      await db.collection('users').drop();
      await db.collection('cards').drop();
      await db.collection('transactions').drop();
    } catch (error) {
      // Collections might not exist
    }
    
    // Create MongoDB collections
    const usersCollection = db.collection('users');
    const cardsCollection = db.collection('cards');
    const transactionsCollection = db.collection('transactions');
    
    // Load users and cards into both databases in parallel
    const dataLoadPromises = [];
    
    if (users.size > 0) {
      // Elasticsearch users
      const userBulkOps = Array.from(users.values()).flatMap(u => [
        { index: { _index: 'users', _id: u.id } },
        u
      ]);
      dataLoadPromises.push(
        elasticsearchClient.bulk({ body: userBulkOps })
          .then(() => console.log(`📥 Loaded ${users.size} users into Elasticsearch`))
      );
      
      // MongoDB users
      dataLoadPromises.push(
        usersCollection.insertMany(Array.from(users.values()))
          .then(() => usersCollection.createIndex({ id: 1 }))
          .then(() => console.log(`📥 Loaded ${users.size} users into MongoDB`))
      );
    }
    
    if (cards.size > 0) {
      // Elasticsearch cards
      const cardBulkOps = Array.from(cards.values()).flatMap(c => [
        { index: { _index: 'cards', _id: c.id } },
        c
      ]);
      dataLoadPromises.push(
        elasticsearchClient.bulk({ body: cardBulkOps })
          .then(() => console.log(`📥 Loaded ${cards.size} cards into Elasticsearch`))
      );
      
      // MongoDB cards
      dataLoadPromises.push(
        cardsCollection.insertMany(Array.from(cards.values()))
          .then(() => Promise.all([
            cardsCollection.createIndex({ id: 1 }),
            cardsCollection.createIndex({ client_id: 1 }),
            cardsCollection.createIndex({ card_brand: 1 })
          ]))
          .then(() => console.log(`📥 Loaded ${cards.size} cards into MongoDB`))
      );
    }
    
    // Wait for all parallel operations to complete
    await Promise.all(dataLoadPromises);
    
    // Load transactions
    const transactionsFile = files.find((f: string) => f.includes('transactions'));
    if (transactionsFile) {
      const transactionsPath = path.join(dataPath, transactionsFile);
      console.log(`💰 Loading transactions from ${transactionsFile}...`);
      console.log('⏳ This may take a few minutes due to file size...');
      
      // Emit transaction loading start
      if (io) {
        io.emit('data:loading:progress', {
          stage: 'transactions_start',
          message: 'Starting to load 13.3 million transactions',
          currentStage: 3,
          totalStages: 4,
          timestamp: Date.now()
        });
      }
      
      let batch: any[] = [];
      const actualBatchSize = batchSize || 10000; // Use the batchSize from request or default to 10000
      let processedCount = 0;
      
      await new Promise((resolve, reject) => {
        const parser = createReadStream(transactionsPath)
          .pipe(parse({
            columns: true,
            delimiter: ',',
            skip_empty_lines: true
          }));
        
        // Use pause mode for proper backpressure handling
        parser.pause();
        
        const processBatch = async (currentBatch: any[]) => {
          // Process MongoDB and Elasticsearch in parallel for better performance
          const promises = [];
          
          // Elasticsearch bulk operation
          const bulkOps = currentBatch.flatMap(t => [
            { index: { _index: 'transactions', _id: t.id } },
            t
          ]);
          promises.push(elasticsearchClient.bulk({ body: bulkOps }));
          
          // MongoDB bulk operation
          promises.push(transactionsCollection.insertMany(currentBatch));
          
          // Wait for both operations to complete
          await Promise.all(promises);
        };
        
        const processRow = async () => {
          let row;
          while ((row = parser.read()) !== null) {
            try {
              const transaction = {
                id: row.id,
                date: new Date(row.date),
                client_id: row.client_id,
                card_id: row.card_id,
                amount: cleanAmount(row.amount),
                use_chip: row.use_chip === 'Chip Transaction' || row.use_chip === 'true',
                merchant_id: row.merchant_id || '',
                merchant_city: row.merchant_city || '',
                merchant_state: row.merchant_state || '',
                zip: row.zip || '',
                mcc: row.mcc || ''
              };
              
              batch.push(transaction);
              
              // Process batch when it reaches the size limit
              if (batch.length >= actualBatchSize) {
                const currentBatch = [...batch];
                batch = [];
                
                await processBatch(currentBatch);
                
                processedCount += currentBatch.length;
                totalTransactions += currentBatch.length;
                
                // Emit progress update every 50000 transactions
                if (processedCount % 50000 === 0) {
                  console.log(`⏳ Processed ${processedCount.toLocaleString()} transactions...`);
                  if (io) {
                    io.emit('data:loading:progress', {
                      stage: 'transactions',
                      message: `Loading transactions: ${processedCount.toLocaleString()} / ~13.3M processed`,
                      currentStage: 3,
                      totalStages: 4,
                      itemsProcessed: processedCount,
                      percentComplete: Math.round((processedCount / 13300000) * 100),
                      timestamp: Date.now()
                    });
                  }
                }
              }
            } catch (error) {
              // Skip invalid rows
            }
          }
        };
        
        parser.on('readable', processRow);
        
        parser.on('end', async () => {
          // Process remaining batch
          if (batch.length > 0) {
            await processBatch(batch);
            totalTransactions += batch.length;
          }
          
          console.log(`✅ Loaded ${totalTransactions.toLocaleString()} transactions`);
          if (io) {
            io.emit('data:loading:progress', {
              stage: 'transactions_complete',
              message: `Completed loading ${totalTransactions.toLocaleString()} transactions`,
              currentStage: 3,
              totalStages: 4,
              itemsProcessed: totalTransactions,
              percentComplete: 100,
              timestamp: Date.now()
            });
          }
          resolve(totalTransactions);
        });
        
        parser.on('error', reject);
        
        // Start processing
        parser.resume();
      });
      
      // Create indexes for MongoDB transactions
      if (io) {
        io.emit('data:loading:progress', {
          stage: 'indexing',
          message: 'Creating database indexes for optimal performance',
          currentStage: 4,
          totalStages: 4,
          timestamp: Date.now()
        });
      }
      
      await transactionsCollection.createIndex({ client_id: 1 });
      await transactionsCollection.createIndex({ card_id: 1 });
      await transactionsCollection.createIndex({ merchant_city: 1 });
      await transactionsCollection.createIndex({ merchant_state: 1 });
      await transactionsCollection.createIndex({ amount: 1 });
      await transactionsCollection.createIndex({ date: 1 });
      await transactionsCollection.createIndex({ mcc: 1 });
      console.log('✅ Created MongoDB indexes');
    }
    
    // Refresh Elasticsearch indices
    await elasticsearchClient.indices.refresh({ index: 'users' });
    await elasticsearchClient.indices.refresh({ index: 'cards' });
    await elasticsearchClient.indices.refresh({ index: 'transactions' });
    
    await mongoClient.close();
    
    console.log(`✅ Kaggle data loading completed!`);
    console.log(`📊 Loaded: ${totalUsers} users, ${totalCards} cards, ${totalTransactions.toLocaleString()} transactions`);
    
    return res.json({
      success: true,
      message: `Successfully loaded Kaggle credit card transaction data`,
      stats: {
        filesProcessed: files.length,
        totalUsers,
        totalCards,
        totalTransactions,
        databases: ['MongoDB', 'Elasticsearch']
      }
    });
    
  } catch (error) {
    console.error('❌ Kaggle data loading failed:', error);
    return res.status(500).json({ 
      error: 'Failed to load Kaggle data',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

  // Run MongoDB test operations with real transaction data
  async function runMongoDBTest(testData: any[], userId: string, testType: string, io?: Server) {
    const results = [];
    const db = mongoClient.db('showdown_benchmark');
    const transactionsCollection = db.collection('transactions');
    const cardsCollection = db.collection('cards');
    const usersCollection = db.collection('users');
    
    for (let i = 0; i < testData.length; i++) {
      const startTime = Date.now();
      let success = false;
      let errorMessage = null;
      let operationName = '';

      // Emit progress for MongoDB test
      if (io && i % 5 === 0) { // Emit every 5 operations to avoid spam
        io.emit('test:progress', {
          userId,
          database: 'MONGODB',
          progress: Math.round((i / testData.length) * 100),
          currentOperation: i + 1,
          totalOperations: testData.length
        });
      }
      
      try {
        // Rotate between 3 simple operations
        const operationType = i % 3;
        
        switch (operationType) {
          case 0:
            operationName = 'Get all transactions';
            // Get a batch of transactions with limit to avoid memory issues
            await transactionsCollection.find({}).limit(100).toArray();
            break;
          case 1:
            operationName = 'Calculate sum of all transactions';
            await transactionsCollection.aggregate([
              { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]).toArray();
            break;
          case 2:
            operationName = 'Find largest transaction';
            await transactionsCollection.find({}).sort({ amount: -1 }).limit(1).toArray();
            break;
        }
        
        success = true;
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }
      
      const responseTime = Date.now() - startTime;
      
      // Emit individual operation result in real-time
      if (io) {
        const operationData = {
          userId,
          database: 'MONGODB',
          operationName,
          operationNumber: i + 1,
          totalOperations: testData.length,
          responseTime,
          success,
          errorMessage,
          timestamp: Date.now()
        };
        console.log('🔥 Emitting MongoDB operation:completed event:', operationData);
        // Emit to all clients (global broadcast)
        io.emit('operation:completed', operationData);
        // Also emit to specific user room
        io.to(`user:${userId}`).emit('operation:completed', operationData);
      } else {
        console.log('❌ No Socket.io instance available for MongoDB operation');
      }
      
      // Store result in PostgreSQL
      await prisma.testResult.create({
        data: {
          userId,
          testType: testType as any,
          database: 'MONGODB',
          operationType: 'READ',
          responseTime,
          success,
          errorMessage
        }
      });
      
      results.push({ success, responseTime, errorMessage });
    }
    
    return results;
  }

  // Run Elasticsearch test operations with real transaction data
  async function runElasticsearchTest(testData: any[], userId: string, testType: string, io?: Server) {
    const results = [];
    
    for (let i = 0; i < testData.length; i++) {
      const startTime = Date.now();
      let success = false;
      let errorMessage = null;
      let operationName = '';

      // Emit progress for Elasticsearch test
      if (io && i % 5 === 0) { // Emit every 5 operations to avoid spam
        io.emit('test:progress', {
          userId,
          database: 'ELASTICSEARCH',
          progress: Math.round((i / testData.length) * 100),
          currentOperation: i + 1,
          totalOperations: testData.length
        });
      }
      
      try {
        // Simplified operations - just 3 simple queries
        const operationType = i % 3;
        
        switch (operationType) {
          case 0:
            operationName = 'Get all transactions';
            await elasticsearchClient.search({
              index: 'transactions',
              body: {
                query: { match_all: {} },
                size: 100
              }
            });
            break;
          case 1:
            operationName = 'Calculate sum of all transactions';
            await elasticsearchClient.search({
              index: 'transactions',
              body: {
                size: 0,
                aggs: {
                  total_amount: { sum: { field: 'amount' } },
                  count: { value_count: { field: 'amount' } }
                }
              }
            });
            break;
          case 2:
            operationName = 'Find largest transaction';
            await elasticsearchClient.search({
              index: 'transactions',
              body: {
                query: { match_all: {} },
                sort: [{ amount: { order: 'desc' } }],
                size: 1
              }
            });
            break;
        }
        
        success = true;
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }
      
      const responseTime = Date.now() - startTime;
      
      // Emit individual operation result in real-time
      if (io) {
        const operationData = {
          userId,
          database: 'ELASTICSEARCH',
          operationName,
          operationNumber: i + 1,
          totalOperations: testData.length,
          responseTime,
          success,
          errorMessage,
          timestamp: Date.now()
        };
        console.log('🔥 Emitting Elasticsearch operation:completed event:', operationData);
        // Emit to all clients (global broadcast)
        io.emit('operation:completed', operationData);
        // Also emit to specific user room
        io.to(`user:${userId}`).emit('operation:completed', operationData);
      } else {
        console.log('❌ No Socket.io instance available for Elasticsearch operation');
      }
      
      // Store result in PostgreSQL
      await prisma.testResult.create({
        data: {
          userId,
          testType: testType as any,
          database: 'ELASTICSEARCH',
          operationType: 'SEARCH',
          responseTime,
          success,
          errorMessage
        }
      });
      
      results.push({ success, responseTime, errorMessage });
    }
    
    return results;
  }

// Enhanced statistics calculation
function calculateEnhancedStats(results: any[]) {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const responseTimes = successful.map(r => r.responseTime);
  
  return {
    totalOperations: results.length,
    successful: successful.length,
    failed: failed.length,
    successRate: (successful.length / results.length) * 100,
    avgResponseTime: successful.length > 0 
      ? Math.round(successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length)
      : 0,
    minResponseTime: successful.length > 0 
      ? Math.min(...responseTimes) 
      : 0,
    maxResponseTime: successful.length > 0 
      ? Math.max(...responseTimes) 
      : 0,
    medianResponseTime: successful.length > 0 
      ? getMedian(responseTimes) 
      : 0,
    p95ResponseTime: successful.length > 0 
      ? getPercentile(responseTimes, 95) 
      : 0,
    p99ResponseTime: successful.length > 0 
      ? getPercentile(responseTimes, 99) 
      : 0,
    totalResponseTime: successful.reduce((sum, r) => sum + r.responseTime, 0),
    opsPerSecond: successful.length > 0 
      ? Math.round(successful.length / (Math.max(...responseTimes) / 1000)) 
      : 0
  };
}

// Get error types for UI display
function getErrorTypes(errors: string[]) {
  const errorCounts: { [key: string]: number } = {};
  errors.forEach(error => {
    if (error) {
      // Simplify error messages for UI
      const errorType = error.split(':')[0] || 'Unknown Error';
      errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
    }
  });
  return errorCounts;
}

// Get latency breakdown for UI charts
function getLatencyBreakdown(results: any[]) {
  const times = results.map(r => r.responseTime);
  return {
    'under_50ms': times.filter(t => t < 50).length,
    '50_100ms': times.filter(t => t >= 50 && t < 100).length,
    '100_500ms': times.filter(t => t >= 100 && t < 500).length,
    '500_1000ms': times.filter(t => t >= 500 && t < 1000).length,
    'over_1000ms': times.filter(t => t >= 1000).length
  };
}

// Utility functions for statistics
function getMedian(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getPercentile(arr: number[], percentile: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index] || 0;
}

// Add transaction data stats endpoint
router.get('/transaction/stats', async (req, res) => {
  try {
    const mongoClient = new MongoClient(config.databases.mongodb.url);
    await mongoClient.connect();
    
    const db = mongoClient.db('showdown_benchmark');
    const transactionsCollection = db.collection('transactions');
    const cardsCollection = db.collection('cards');
    const usersCollection = db.collection('users');
    
    // Get comprehensive transaction statistics
    const stats = await transactionsCollection.aggregate([
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
          maxAmount: { $max: '$amount' },
          minAmount: { $min: '$amount' },
          chipTransactions: { $sum: { $cond: ['$use_chip', 1, 0] } }
        }
      }
    ]).toArray();
    
    // Get merchant city distribution (top 10)
    const cityStats = await transactionsCollection.aggregate([
      {
        $group: {
          _id: '$merchant_city',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    // Get merchant state distribution
    const stateStats = await transactionsCollection.aggregate([
      {
        $group: {
          _id: '$merchant_state',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    // Get MCC distribution (top merchant categories)
    const mccStats = await transactionsCollection.aggregate([
      {
        $group: {
          _id: '$mcc',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    // Get card brand distribution by joining with cards collection
    const cardBrandStats = await transactionsCollection.aggregate([
      {
        $lookup: {
          from: 'cards',
          localField: 'card_id',
          foreignField: 'id',
          as: 'card'
        }
      },
      { $unwind: '$card' },
      {
        $group: {
          _id: '$card.card_brand',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]).toArray();
    
    // Get chip vs swipe statistics
    const chipStats = await transactionsCollection.aggregate([
      {
        $group: {
          _id: '$use_chip',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]).toArray();
    
    // Count unique entities
    const uniqueClients = await transactionsCollection.distinct('client_id');
    const uniqueCards = await transactionsCollection.distinct('card_id');
    const uniqueMerchants = await transactionsCollection.distinct('merchant_id');
    
    await mongoClient.close();
    
    const mainStats = stats[0] || {
      totalTransactions: 0,
      totalAmount: 0,
      avgAmount: 0,
      maxAmount: 0,
      minAmount: 0,
      chipTransactions: 0
    };
    
    const chipRate = mainStats.totalTransactions > 0 
      ? (mainStats.chipTransactions / mainStats.totalTransactions) * 100 
      : 0;
    
    return res.json({
      success: true,
      stats: {
        overview: {
          totalTransactions: mainStats.totalTransactions,
          totalAmount: Math.round(mainStats.totalAmount * 100) / 100,
          avgAmount: Math.round(mainStats.avgAmount * 100) / 100,
          maxAmount: Math.round(mainStats.maxAmount * 100) / 100,
          minAmount: Math.round(mainStats.minAmount * 100) / 100,
          chipTransactions: mainStats.chipTransactions,
          chipRate: Math.round(chipRate * 100) / 100,
          uniqueClients: uniqueClients.length,
          uniqueCards: uniqueCards.length,
          uniqueMerchants: uniqueMerchants.length
        },
        byCity: cityStats.map(city => ({
          city: city._id || 'Unknown',
          count: city.count,
          totalAmount: Math.round(city.totalAmount * 100) / 100,
          avgAmount: Math.round(city.avgAmount * 100) / 100
        })),
        byState: stateStats.map(state => ({
          state: state._id || 'Unknown',
          count: state.count,
          totalAmount: Math.round(state.totalAmount * 100) / 100
        })),
        byMCC: mccStats.map(mcc => ({
          mcc: mcc._id || 'Unknown',
          count: mcc.count,
          totalAmount: Math.round(mcc.totalAmount * 100) / 100,
          avgAmount: Math.round(mcc.avgAmount * 100) / 100
        })),
        byCardBrand: cardBrandStats.map(brand => ({
          brand: brand._id || 'Unknown',
          count: brand.count,
          totalAmount: Math.round(brand.totalAmount * 100) / 100,
          avgAmount: Math.round(brand.avgAmount * 100) / 100
        })),
        chipVsSwipe: chipStats.map(chip => ({
          type: chip._id ? 'Chip' : 'Swipe',
          count: chip.count,
          totalAmount: Math.round(chip.totalAmount * 100) / 100,
          avgAmount: Math.round(chip.avgAmount * 100) / 100
        }))
      }
    });
  } catch (error) {
    console.error('Transaction stats error:', error);
    return res.status(500).json({ error: 'Failed to get transaction statistics' });
  }
  });

  return router;
}

// For backward compatibility
export default createStressTestRoutes(); 