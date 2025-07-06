import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

/**
 * Simple data status check
 * GET /api/admin/data-status
 */
router.get('/data-status', async (req: Request, res: Response) => {
  try {
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

    // Simple status response for now
    res.json({
      success: true,
      status: status,
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
 * Simple data loading endpoint (placeholder)
 * POST /api/admin/load-data
 */
router.post('/load-data', async (req: Request, res: Response) => {
  try {
    const { 
      databases = ['mongodb', 'elasticsearch'], 
      batchSize = 500,
      dataPath = '/data/kaggle-finance'
    } = req.body;

    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Data loading endpoint ready (implementation pending)',
      databases: databases,
      batchSize: batchSize,
      dataPath: dataPath,
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

export default router; 