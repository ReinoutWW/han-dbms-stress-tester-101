import { Express } from 'express';
import { register, collectDefaultMetrics, Counter, Histogram } from 'prom-client';
import { createServer } from 'http';
import { config } from '../config';

// Collect default metrics
collectDefaultMetrics({ prefix: 'nosql_showdown_' });

// Custom metrics
export const httpRequestDuration = new Histogram({
  name: 'nosql_showdown_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

export const dbOperationCounter = new Counter({
  name: 'nosql_showdown_db_operations_total',
  help: 'Total number of database operations',
  labelNames: ['database', 'operation', 'status'],
});

export const activeConnections = new Counter({
  name: 'nosql_showdown_active_connections',
  help: 'Number of active WebSocket connections',
});

export function setupMetrics(app: Express) {
  // Metrics endpoint
  app.get('/metrics', (req, res) => {
    res.set('Content-Type', register.contentType);
    register.metrics().then(metrics => {
      res.end(metrics);
    });
  });
  
  // Start separate metrics server
  const metricsServer = createServer((req, res) => {
    if (req.url === '/metrics') {
      res.setHeader('Content-Type', register.contentType);
      register.metrics().then(metrics => {
        res.end(metrics);
      });
    } else {
      res.statusCode = 404;
      res.end();
    }
  });
  
  metricsServer.listen(config.monitoring.metricsPort, () => {
    console.log(`Metrics server listening on port ${config.monitoring.metricsPort}`);
  });
} 