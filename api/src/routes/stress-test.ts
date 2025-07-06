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

// Manual data loading endpoint for testing
router.post('/load-test-data', async (req, res) => {
  try {
    console.log('🚀 Starting manual transaction data loading...');
    
    // Generate sample transaction data
    const sampleTransactions = [];
    const transactionTypes = ['CASH_IN', 'CASH_OUT', 'DEBIT', 'PAYMENT', 'TRANSFER'];
    
    for (let i = 0; i < 1000; i++) {
      const step = Math.floor(Math.random() * 744);
      const amount = Math.random() * 10000 + 10;
      const isFraud = Math.random() < 0.05;
      
      const transaction = {
        step,
        type: transactionTypes[Math.floor(Math.random() * transactionTypes.length)],
        amount: Math.round(amount * 100) / 100,
        nameOrig: `C${Math.floor(Math.random() * 100000)}`,
        oldbalanceOrg: Math.round(Math.random() * 50000 * 100) / 100,
        newbalanceOrig: 0,
        nameDest: Math.random() < 0.3 ? `M${Math.floor(Math.random() * 10000)}` : `C${Math.floor(Math.random() * 100000)}`,
        oldbalanceDest: Math.round(Math.random() * 50000 * 100) / 100,
        newbalanceDest: 0,
        isFraud,
        isFlaggedFraud: isFraud && amount > 200000,
        timestamp: new Date(Date.now() + (step * 60 * 60 * 1000)),
        hourOfDay: step % 24,
        dayOfMonth: Math.floor(step / 24) + 1
      };
      
      transaction.newbalanceOrig = transaction.oldbalanceOrg - transaction.amount;
      transaction.newbalanceDest = transaction.oldbalanceDest + transaction.amount;
      
      sampleTransactions.push(transaction);
    }
    
    console.log(`📋 Generated ${sampleTransactions.length} sample transactions`);
    
    // Load into Elasticsearch
    try {
      await elasticsearchClient.indices.delete({ index: 'transactions' });
    } catch (error) {
      // Index doesn't exist, which is fine
    }
    
    // Create index
    await elasticsearchClient.indices.create({
      index: 'transactions',
      body: {
        mappings: {
          properties: {
            step: { type: 'integer' },
            type: { type: 'keyword' },
            amount: { type: 'double' },
            nameOrig: { type: 'keyword' },
            oldbalanceOrg: { type: 'double' },
            newbalanceOrig: { type: 'double' },
            nameDest: { type: 'keyword' },
            oldbalanceDest: { type: 'double' },
            newbalanceDest: { type: 'double' },
            isFraud: { type: 'boolean' },
            isFlaggedFraud: { type: 'boolean' },
            timestamp: { type: 'date' },
            hourOfDay: { type: 'integer' },
            dayOfMonth: { type: 'integer' }
          }
        }
      }
    });
    
    // Insert in batches
    const batchSize = 100;
    let loaded = 0;
    
    for (let i = 0; i < sampleTransactions.length; i += batchSize) {
      const batch = sampleTransactions.slice(i, i + batchSize);
      
      const bulkOps = batch.flatMap(t => [
        { index: { _index: 'transactions', _id: `${t.nameOrig}-${t.step}-${Math.random()}` } },
        t
      ]);
      
      await elasticsearchClient.bulk({ body: bulkOps });
      loaded += batch.length;
    }
    
    await elasticsearchClient.indices.refresh({ index: 'transactions' });
    
    const fraudCount = sampleTransactions.filter(t => t.isFraud).length;
    const fraudRate = (fraudCount / sampleTransactions.length) * 100;
    
    console.log(`✅ Loaded ${loaded} transactions into Elasticsearch`);
    console.log(`📈 Fraud rate: ${fraudRate.toFixed(2)}%`);
    
    return res.json({
      success: true,
      message: `Successfully loaded ${loaded} sample transactions into Elasticsearch`,
      stats: {
        totalTransactions: loaded,
        fraudTransactions: fraudCount,
        fraudRate: Math.round(fraudRate * 100) / 100
      }
    });
    
  } catch (error) {
    console.error('❌ Manual data loading failed:', error);
    return res.status(500).json({ 
      error: 'Failed to load test data',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Load Kaggle CSV data endpoint
router.post('/load-kaggle-data', async (req, res) => {
  try {
    const { createReadStream, existsSync, readdirSync } = require('fs');
    const { parse } = require('csv-parse');
    const path = require('path');
    
    console.log('🚀 Starting Kaggle data loading...');
    const dataPath = '/data/kaggle-finance';
    
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
    
    let totalTransactions = 0;
    let totalFraud = 0;
    let loadedFiles = 0;
    
    for (const file of files) {
      const filePath = path.join(dataPath, file);
      console.log(`📊 Processing: ${file}`);
      
      const transactions: any[] = [];
      
      await new Promise((resolve, reject) => {
        createReadStream(filePath)
          .pipe(parse({
            columns: true,
            delimiter: ',',
            skip_empty_lines: true
          }))
          .on('data', (row: any) => {
            try {
              const transaction = {
                step: parseInt(row.step) || 0,
                type: row.type || 'PAYMENT',
                amount: parseFloat(row.amount) || 0,
                nameOrig: row.nameOrig || '',
                oldbalanceOrg: parseFloat(row.oldbalanceOrg) || 0,
                newbalanceOrig: parseFloat(row.newbalanceOrig) || 0,
                nameDest: row.nameDest || '',
                oldbalanceDest: parseFloat(row.oldbalanceDest) || 0,
                newbalanceDest: parseFloat(row.newbalanceDest) || 0,
                isFraud: row.isFraud === '1' || row.isFraud === 1 || row.isFraud === true,
                isFlaggedFraud: row.isFlaggedFraud === '1' || row.isFlaggedFraud === 1 || row.isFlaggedFraud === true,
                timestamp: new Date(Date.now() + (parseInt(row.step) * 60 * 60 * 1000)),
                hourOfDay: parseInt(row.step) % 24,
                dayOfMonth: Math.floor(parseInt(row.step) / 24) + 1
              };
              
              if (transaction.amount > 0 && transaction.nameOrig && transaction.nameDest) {
                transactions.push(transaction);
                if (transaction.isFraud) totalFraud++;
              }
            } catch (error) {
              // Skip invalid rows
            }
          })
          .on('end', () => {
            console.log(`✅ Parsed ${transactions.length} transactions from ${file}`);
            resolve(transactions);
          })
          .on('error', reject);
      });
      
      // Load into Elasticsearch
      if (transactions.length > 0) {
        try {
          // Create/recreate index on first file
          if (loadedFiles === 0) {
            try {
              await elasticsearchClient.indices.delete({ index: 'transactions' });
            } catch (error) {
              // Index doesn't exist
            }
            
            await elasticsearchClient.indices.create({
              index: 'transactions',
              body: {
                mappings: {
                  properties: {
                    step: { type: 'integer' },
                    type: { type: 'keyword' },
                    amount: { type: 'double' },
                    nameOrig: { type: 'keyword' },
                    oldbalanceOrg: { type: 'double' },
                    newbalanceOrig: { type: 'double' },
                    nameDest: { type: 'keyword' },
                    oldbalanceDest: { type: 'double' },
                    newbalanceDest: { type: 'double' },
                    isFraud: { type: 'boolean' },
                    isFlaggedFraud: { type: 'boolean' },
                    timestamp: { type: 'date' },
                    hourOfDay: { type: 'integer' },
                    dayOfMonth: { type: 'integer' }
                  }
                }
              }
            });
          }
          
          // Bulk load transactions
          const batchSize = 1000;
          for (let i = 0; i < transactions.length; i += batchSize) {
            const batch = transactions.slice(i, i + batchSize);
            const bulkOps = batch.flatMap(t => [
              { index: { _index: 'transactions', _id: `${t.nameOrig}-${t.step}-${Math.random()}` } },
              t
            ]);
            
            await elasticsearchClient.bulk({ body: bulkOps });
          }
          
          totalTransactions += transactions.length;
          loadedFiles++;
          
          console.log(`📥 Loaded ${transactions.length} transactions from ${file} into Elasticsearch`);
        } catch (error) {
          console.error(`❌ Failed to load ${file} into Elasticsearch:`, error);
        }
      }
      
      // Load into MongoDB if auth is working
      try {
        const mongoClient = new MongoClient(config.databases.mongodb.url);
        await mongoClient.connect();
        
        const db = mongoClient.db('showdown_benchmark');
        const collection = db.collection('transactions');
        
        if (loadedFiles === 0) {
          // Clear existing data on first file
          await collection.deleteMany({});
          
          // Create indexes
          await collection.createIndex({ type: 1 });
          await collection.createIndex({ amount: 1 });
          await collection.createIndex({ isFraud: 1 });
          await collection.createIndex({ step: 1 });
          await collection.createIndex({ nameOrig: 1 });
          await collection.createIndex({ nameDest: 1 });
        }
        
        if (transactions.length > 0) {
          const batchSize = 1000;
          for (let i = 0; i < transactions.length; i += batchSize) {
            const batch = transactions.slice(i, i + batchSize);
            await collection.insertMany(batch);
          }
          console.log(`📥 Loaded ${transactions.length} transactions from ${file} into MongoDB`);
        }
        
        await mongoClient.close();
      } catch (error) {
        console.error(`❌ Failed to load ${file} into MongoDB:`, error);
      }
    }
    
    // Refresh Elasticsearch index
    await elasticsearchClient.indices.refresh({ index: 'transactions' });
    
    const fraudRate = totalTransactions > 0 ? (totalFraud / totalTransactions) * 100 : 0;
    
    console.log(`✅ Kaggle data loading completed!`);
    console.log(`📊 Total: ${totalTransactions} transactions, ${totalFraud} fraud (${fraudRate.toFixed(2)}%)`);
    
    return res.json({
      success: true,
      message: `Successfully loaded Kaggle fraud transaction data`,
      stats: {
        filesProcessed: loadedFiles,
        totalTransactions,
        fraudTransactions: totalFraud,
        fraudRate: Math.round(fraudRate * 100) / 100
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
    const collection = mongoClient.db('showdown_benchmark').collection('transactions');
    
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
        // Randomly select operation type for variety
        const operationType = i % 5;
        
        switch (operationType) {
          case 0:
            operationName = 'Find fraud transactions';
            await collection.find({ isFraud: true }).limit(10).toArray();
            break;
          case 1:
            operationName = 'Aggregate by transaction type';
            await collection.aggregate([
              { $group: { _id: '$type', count: { $sum: 1 }, avgAmount: { $avg: '$amount' } } }
            ]).toArray();
            break;
          case 2:
            operationName = 'Find high-value transactions';
            await collection.find({ 
              amount: { $gte: 10000 },
              isFraud: false
            }).limit(20).toArray();
            break;
          case 3:
            operationName = 'Search by customer';
            const randomCustomers = await collection.distinct('nameOrig', { type: 'TRANSFER' });
            if (randomCustomers.length > 0) {
              const randomCustomer = randomCustomers[Math.floor(Math.random() * Math.min(randomCustomers.length, 100))];
              await collection.find({ nameOrig: randomCustomer }).limit(5).toArray();
            }
            break;
          case 4:
            operationName = 'Time-based analysis';
            await collection.find({
              step: { $gte: 100, $lte: 200 }
            }).limit(15).toArray();
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
    const indexName = 'transactions';
    
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
        // Randomly select operation type for variety
        const operationType = i % 5;
        
        switch (operationType) {
          case 0:
            operationName = 'Search fraud transactions';
            await elasticsearchClient.search({
              index: indexName,
              body: {
                query: { term: { isFraud: true } },
                size: 10
              }
            });
            break;
          case 1:
            operationName = 'Aggregate by transaction type';
            await elasticsearchClient.search({
              index: indexName,
              body: {
                size: 0,
                aggs: {
                  transaction_types: {
                    terms: { field: 'type' },
                    aggs: {
                      avg_amount: { avg: { field: 'amount' } }
                    }
                  }
                }
              }
            });
            break;
          case 2:
            operationName = 'Range query high-value transactions';
            await elasticsearchClient.search({
              index: indexName,
              body: {
                query: {
                  bool: {
                    must: [
                      { range: { amount: { gte: 10000 } } },
                      { term: { isFraud: false } }
                    ]
                  }
                },
                size: 20
              }
            });
            break;
          case 3:
            operationName = 'Search customer pattern';
            await elasticsearchClient.search({
              index: indexName,
              body: {
                query: {
                  bool: {
                    must: [
                      { wildcard: { nameOrig: 'C*' } },
                      { term: { type: 'TRANSFER' } }
                    ]
                  }
                },
                size: 5
              }
            });
            break;
          case 4:
            operationName = 'Time-based search';
            await elasticsearchClient.search({
              index: indexName,
              body: {
                query: {
                  range: { step: { gte: 100, lte: 200 } }
                },
                size: 15
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
    const collection = db.collection('transactions');
    
    // Get comprehensive transaction statistics
    const stats = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          fraudTransactions: { $sum: { $cond: ['$isFraud', 1, 0] } },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
          maxAmount: { $max: '$amount' },
          minAmount: { $min: '$amount' }
        }
      }
    ]).toArray();
    
    // Get transaction type distribution
    const typeStats = await collection.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
          fraudCount: { $sum: { $cond: ['$isFraud', 1, 0] } }
        }
      }
    ]).toArray();
    
    // Get hourly distribution
    const hourlyStats = await collection.aggregate([
      {
        $group: {
          _id: '$hourOfDay',
          count: { $sum: 1 },
          fraudCount: { $sum: { $cond: ['$isFraud', 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    await mongoClient.close();
    
    const mainStats = stats[0];
    const fraudRate = (mainStats.fraudTransactions / mainStats.totalTransactions) * 100;
    
    return res.json({
      success: true,
      stats: {
        overview: {
          totalTransactions: mainStats.totalTransactions,
          fraudTransactions: mainStats.fraudTransactions,
          fraudRate: Math.round(fraudRate * 100) / 100,
          totalAmount: Math.round(mainStats.totalAmount * 100) / 100,
          avgAmount: Math.round(mainStats.avgAmount * 100) / 100,
          maxAmount: Math.round(mainStats.maxAmount * 100) / 100,
          minAmount: Math.round(mainStats.minAmount * 100) / 100
        },
        byType: typeStats.map(type => ({
          type: type._id,
          count: type.count,
          avgAmount: Math.round(type.avgAmount * 100) / 100,
          fraudCount: type.fraudCount,
          fraudRate: Math.round((type.fraudCount / type.count) * 10000) / 100
        })),
        byHour: hourlyStats.map(hour => ({
          hour: hour._id,
          count: hour.count,
          fraudCount: hour.fraudCount,
          fraudRate: Math.round((hour.fraudCount / hour.count) * 10000) / 100
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