const { clone } = require('../../../gestura-backend/runtime/utils');

class LocalNodeCache {
  constructor() {
    this.configSnapshot = null;
    this.deviceInventory = new Map();
    this.deviceStates = new Map();
    this.pendingTelemetry = [];
  }

  setConfigSnapshot(snapshot) {
    this.configSnapshot = clone(snapshot);
    this.hydrateInventoryFromSnapshot(snapshot);
  }

  getConfigSnapshot() {
    return clone(this.configSnapshot);
  }

  setManagerDevices(managerId, devices = []) {
    this.deviceInventory.set(managerId, devices.map(clone));
  }

  hydrateInventoryFromSnapshot(snapshot = {}) {
    const devicesByManager = new Map();
    for (const device of snapshot.devices || []) {
      const managerId = device.managerId || device.provenance?.managerId;
      if (!managerId) continue;
      if (!devicesByManager.has(managerId)) devicesByManager.set(managerId, []);
      devicesByManager.get(managerId).push(clone({ ...device, managerId }));
    }
    for (const [managerId, devices] of devicesByManager.entries()) {
      this.deviceInventory.set(managerId, devices);
    }
  }

  getAllDevices() {
    return Array.from(this.deviceInventory.values()).flat().map(clone);
  }

  getDeviceById(deviceId) {
    return this.getAllDevices().find((device) => device.id === deviceId) || null;
  }

  setDeviceState(deviceId, state) {
    this.deviceStates.set(deviceId, clone(state));
  }

  enqueueTelemetry(metric) {
    this.pendingTelemetry.push({ ts: Date.now(), ...metric });
  }

  drainTelemetry() {
    const drained = this.pendingTelemetry.map(clone);
    this.pendingTelemetry = [];
    return drained;
  }
}

module.exports = { LocalNodeCache };
