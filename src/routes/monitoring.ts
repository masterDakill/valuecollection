/**
 * Monitoring Routes
 * API pour suivre l'utilisation des services
 */

import { Hono } from 'hono';
import { createLogger } from '../lib/logger';
import { createMonitoringService } from '../services/monitoring.service';

type Bindings = {
  DB: D1Database;
};

export const monitoringRouter = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/monitoring
 * Snapshot complet de tous les services
 */
monitoringRouter.get('/', async (c) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    const db = c.env.DB;
    const monitoringService = createMonitoringService(db);

    logger.info('Fetching monitoring snapshot');

    const snapshot = await monitoringService.getSnapshot();

    return c.json({
      success: true,
      data: snapshot
    });

  } catch (error: any) {
    logger.error('Failed to fetch monitoring data', { error: error.message });

    return c.json({
      success: false,
      error: {
        code: 'MONITORING_ERROR',
        message: error.message
      }
    }, 500);
  }
});

/**
 * GET /api/monitoring/:service
 * Historique d'un service spécifique
 */
monitoringRouter.get('/:service', async (c) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    const serviceName = c.req.param('service');
    const hours = parseInt(c.req.query('hours') || '24');
    const db = c.env.DB;

    const monitoringService = createMonitoringService(db);

    logger.info('Fetching service history', { serviceName, hours });

    const history = await monitoringService.getServiceHistory(serviceName, hours);

    return c.json({
      success: true,
      service: serviceName,
      hours,
      data: history
    });

  } catch (error: any) {
    logger.error('Failed to fetch service history', { error: error.message });

    return c.json({
      success: false,
      error: {
        code: 'MONITORING_ERROR',
        message: error.message
      }
    }, 500);
  }
});

/**
 * POST /api/monitoring/track
 * Enregistre manuellement un événement (pour debug)
 */
monitoringRouter.post('/track', async (c) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    const db = c.env.DB;
    const body = await c.req.json();

    const { serviceName, success, responseTime, cost, details } = body;

    if (!serviceName) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'serviceName is required'
        }
      }, 400);
    }

    const monitoringService = createMonitoringService(db);

    await monitoringService.trackServiceCall(
      serviceName,
      success !== false,
      responseTime || 0,
      cost || 0,
      details
    );

    logger.info('Service call tracked', { serviceName });

    return c.json({
      success: true,
      message: 'Event tracked successfully'
    });

  } catch (error: any) {
    logger.error('Failed to track event', { error: error.message });

    return c.json({
      success: false,
      error: {
        code: 'MONITORING_ERROR',
        message: error.message
      }
    }, 500);
  }
});

/**
 * GET /api/monitoring/stats/summary
 * Résumé rapide pour dashboard
 */
monitoringRouter.get('/stats/summary', async (c) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    const db = c.env.DB;

    // Stats des dernières 24h
    const stats = await db.prepare(`
      SELECT
        COUNT(*) as total_calls,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_calls,
        SUM(cost_usd) as total_cost,
        AVG(response_time_ms) as avg_response_time
      FROM service_monitoring
      WHERE created_at >= datetime('now', '-24 hours')
    `).first();

    // Services les plus utilisés
    const topServices = await db.prepare(`
      SELECT
        service_name,
        COUNT(*) as calls,
        SUM(cost_usd) as cost
      FROM service_monitoring
      WHERE created_at >= datetime('now', '-24 hours')
      GROUP BY service_name
      ORDER BY calls DESC
      LIMIT 5
    `).all();

    // Services en erreur
    const errorServices = await db.prepare(`
      SELECT
        service_name,
        COUNT(*) as errors
      FROM service_monitoring
      WHERE success = 0
        AND created_at >= datetime('now', '-24 hours')
      GROUP BY service_name
      ORDER BY errors DESC
      LIMIT 5
    `).all();

    return c.json({
      success: true,
      summary: {
        totalCalls: stats?.total_calls || 0,
        successCalls: stats?.success_calls || 0,
        successRate: stats?.total_calls > 0
          ? ((stats.success_calls / stats.total_calls) * 100).toFixed(2)
          : 0,
        totalCost: parseFloat(stats?.total_cost || 0).toFixed(4),
        avgResponseTime: parseFloat(stats?.avg_response_time || 0).toFixed(2)
      },
      topServices: topServices.results || [],
      errorServices: errorServices.results || []
    });

  } catch (error: any) {
    logger.error('Failed to fetch summary', { error: error.message });

    return c.json({
      success: false,
      error: {
        code: 'MONITORING_ERROR',
        message: error.message
      }
    }, 500);
  }
});
