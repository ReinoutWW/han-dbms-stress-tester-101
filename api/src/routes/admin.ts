import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

/**
 * Simple data status check
 * GET /api/admin/data-status
 */
router.get('/data-status', async (req: Request, res: Response) => {
  try {
    const { MongoClient } = require('mongodb');
    const { Client: ElasticsearchClient } = require('@elastic/elasticsearch');
    const { config } = require('../config');
    
    const status = {
      mongodb: {
        connected: false,
        collections: {} as Record<string, number>,
        totalRecords: 0
      },
      elasticsearch: {
        connected: false,
        indices: {} as Record<string, number>,
        totalRecords: 0
      }
    };

    // Check MongoDB
    try {
      const mongoClient = new MongoClient(config.databases.mongodb.url);
      await mongoClient.connect();
      const db = mongoClient.db('showdown_benchmark');
      
      const collections = ['users', 'cards', 'transactions'];
      for (const collName of collections) {
        const count = await db.collection(collName).countDocuments();
        status.mongodb.collections[collName] = count;
        status.mongodb.totalRecords += count;
      }
      
      status.mongodb.connected = true;
      await mongoClient.close();
    } catch (error) {
      console.error('MongoDB status check failed:', error);
    }

    // Check Elasticsearch
    try {
      const elasticsearchClient = new ElasticsearchClient({
        node: config.databases.elasticsearch.url
      });
      
      await elasticsearchClient.ping();
      status.elasticsearch.connected = true;
      
      const indices = ['users', 'cards', 'transactions'];
      for (const indexName of indices) {
        try {
          const countResult = await elasticsearchClient.count({ index: indexName });
          status.elasticsearch.indices[indexName] = countResult.count;
          status.elasticsearch.totalRecords += countResult.count;
        } catch (error) {
          status.elasticsearch.indices[indexName] = 0;
        }
      }
    } catch (error) {
      console.error('Elasticsearch status check failed:', error);
    }

    res.json({
      success: true,
      status: status,
      dataLoaded: status.mongodb.totalRecords > 0 || status.elasticsearch.totalRecords > 0,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      success: false,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Pi system information
 * GET /api/admin/pi-info
 */
router.get('/pi-info', async (req: Request, res: Response) => {
  try {
    const os = require('os');
    
    const info = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: {
        total: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100, // GB
        free: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100,   // GB
        used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024 * 100) / 100
      },
      uptime: Math.round(os.uptime() / 3600 * 100) / 100, // hours
      loadAverage: os.loadavg(),
      dataPath: process.env.DATA_PATH || '/data/kaggle-finance',
      dataFiles: [] as string[]
    };

    res.json({
      success: true,
      pi_info: info,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      success: false,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Data loading endpoint - loads Kaggle dataset
 * POST /api/admin/load-data
 */
router.post('/load-data', async (req: Request, res: Response) => {
  try {
    const axios = require('axios');
    const { 
      databases = ['mongodb', 'elasticsearch'], 
      batchSize = 10000, // Increased for better performance
      dataPath = '/data/kaggle-finance'
    } = req.body;

    // Get the socket.io instance if available
    const io = req.app.get('io');
    
    // Emit loading started event
    if (io) {
      io.emit('data:loading:started', {
        databases,
        batchSize,
        dataPath,
        timestamp: Date.now()
      });
    }

    // Call the actual Kaggle data loading endpoint
    const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
    const response = await axios.post(`${baseUrl}/api/stress-test/load-kaggle-data`, {
      batchSize,
      dataPath
    });

    // Emit loading completed event
    if (io && response.data.success) {
      io.emit('data:loading:completed', {
        stats: response.data.stats,
        timestamp: Date.now()
      });
    }

    res.json(response.data);

  } catch (error: any) {
    // Emit loading error event
    const io = req.app.get('io');
    if (io) {
      io.emit('data:loading:error', {
        error: error.message,
        timestamp: Date.now()
      });
    }

    res.status(500).json({
      error: error.message,
      success: false,
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 