const { normalizeSensorPayload } = require('./utils');

class SensorStore {
  constructor({ historySize = 200 } = {}) {
    this.historySize = historySize;
    this.history = [];
    this.state = {
      latest: null,
      sampleCount: 0,
      lastUpdatedAt: null,
      source: null,
    };
  }

  record(data, source = 'unknown') {
    const payload = normalizeSensorPayload(data);
    const timestamp = new Date().toISOString();
    const latest = { ...payload, timestamp };

    this.state = {
      latest,
      sampleCount: this.state.sampleCount + 1,
      lastUpdatedAt: timestamp,
      source,
    };

    this.history.push(latest);
    while (this.history.length > this.historySize) this.history.shift();

    return latest;
  }

  getState() {
    return {
      ...this.state,
      latest: this.state.latest ? { ...this.state.latest } : null,
    };
  }

  getHistory() {
    return this.history.map((sample) => ({ ...sample }));
  }
}

module.exports = { SensorStore };
