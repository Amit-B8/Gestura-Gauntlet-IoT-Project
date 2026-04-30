const { randomUUID } = require('crypto');
const { clone } = require('../utils');

class RouteMetricsService {
  constructor({ maxMetrics = 500, persistence, telemetryService, deviceRegistry } = {}) {
    this.maxMetrics = maxMetrics;
    this.persistence = persistence;
    this.telemetryService = telemetryService;
    this.deviceRegistry = deviceRegistry;
    this.metrics = [];
  }

  async record(metric) {
    const next = this.normalizeMetric({
      id: metric.id || randomUUID(),
      ts: metric.ts || Date.now(),
      ...metric,
    });
    this.remember(next);
    try {
      await this.persistence?.saveRouteAttemptMetric?.(next);
    } catch (err) {
      console.error('[RouteMetrics] save failed:', compactMetricError(err, next));
    }
    try {
      await this.telemetryService?.ingestBatch?.([
        {
          id: next.id,
          ts: next.ts,
          nodeId: next.nodeId,
          managerId: next.managerId,
          eventType: 'route_attempt',
          payload: next,
        },
      ]);
    } catch (err) {
      console.error('[RouteMetrics] telemetry ingest failed:', compactMetricError(err, next));
    }
    return clone(next);
  }

  normalizeMetric(metric = {}) {
    const deviceId = metric.deviceId || metric.target_device_id || metric.targetDeviceId || metric.payload?.deviceId;
    const device = deviceId ? this.deviceRegistry?.getById?.(deviceId) : null;
    return {
      ...metric,
      deviceId,
      managerId: metric.managerId || metric.manager_id || metric.payload?.managerId || device?.managerId || 'unknown',
    };
  }

  remember(metric) {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.splice(0, this.metrics.length - this.maxMetrics);
    }
    return clone(metric);
  }

  list({ managerId, deviceId } = {}) {
    return this.metrics
      .filter((metric) => !managerId || metric.managerId === managerId)
      .filter((metric) => !deviceId || metric.deviceId === deviceId)
      .map(clone);
  }
}

module.exports = { RouteMetricsService };

function compactMetricError(err, metric = {}) {
  return {
    error: err.message,
    managerId: metric.managerId,
    nodeId: metric.nodeId,
    deviceId: metric.deviceId,
    attemptedRoute: metric.attemptedRoute,
    finalRoute: metric.finalRoute,
  };
}
