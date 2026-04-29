const { randomUUID } = require('crypto');
const { clone } = require('../utils');

class TelemetryService {
  constructor({ persistence, telemetrySink, maxBuffered = 1000, deviceRegistry } = {}) {
    this.persistence = persistence;
    this.telemetrySink = telemetrySink;
    this.maxBuffered = maxBuffered;
    this.deviceRegistry = deviceRegistry;
    this.events = [];
  }

  async ingestBatch(events = []) {
    const normalized = (Array.isArray(events) ? events : []).map((event) => normalizeTelemetryEvent(event));
    if (normalized.length === 0) return { ok: true, accepted: 0 };

    this.events.push(...normalized);
    if (this.events.length > this.maxBuffered) {
      this.events.splice(0, this.events.length - this.maxBuffered);
    }

    try {
      await this.persistence?.saveTelemetryEvents?.(normalized);
    } catch (err) {
      console.error(`[Telemetry] Event persistence failed: ${err.message}`);
    }
    for (const event of normalized) {
      if (event.eventType === 'route_attempt') {
        const metric = this.normalizeRouteMetric({
          id: event.id,
          ts: event.ts,
          ...(event.payload || {}),
          nodeId: event.nodeId || event.payload?.nodeId,
          managerId: event.managerId || event.payload?.managerId,
        });
        try {
          await this.persistence?.saveRouteAttemptMetric?.(metric);
        } catch (err) {
          console.error('[Telemetry] Route metric persistence failed:', compactMetricError(err, metric));
        }
      }
    }

    try {
      await this.telemetrySink?.publishBatch?.(normalized);
    } catch (err) {
      if (this.telemetrySink) this.telemetrySink.lastError = err.message;
      console.error(`[Telemetry] External telemetry upload failed: ${err.message}`);
    }

    return { ok: true, accepted: normalized.length };
  }

  list({ nodeId, managerId, eventType } = {}) {
    return this.events
      .filter((event) => !nodeId || event.nodeId === nodeId)
      .filter((event) => !managerId || event.managerId === managerId)
      .filter((event) => !eventType || event.eventType === eventType)
      .map(clone);
  }

  normalizeRouteMetric(metric = {}) {
    const deviceId = metric.deviceId || metric.target_device_id || metric.targetDeviceId || metric.payload?.deviceId;
    const device = deviceId ? this.deviceRegistry?.getById?.(deviceId) : null;
    return {
      ...metric,
      deviceId,
      managerId: metric.managerId || metric.manager_id || metric.payload?.managerId || device?.managerId || 'unknown',
    };
  }
}

function normalizeTelemetryEvent(event = {}) {
  return {
    id: event.id || randomUUID(),
    ts: event.ts || event.timestamp || Date.now(),
    nodeId: event.nodeId,
    managerId: event.managerId,
    eventType: event.eventType || event.type || 'telemetry',
    payload: event.payload || event,
  };
}

module.exports = { TelemetryService, normalizeTelemetryEvent };

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
