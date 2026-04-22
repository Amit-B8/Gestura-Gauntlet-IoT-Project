const express = require('express');

function createDevicesRouter({ managerService, deviceRegistry, actionRouter }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(deviceRegistry.getAll(req.query.managerId));
  });

  router.get('/:deviceId', (req, res) => {
    const device = deviceRegistry.getById(req.params.deviceId);
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }
    res.json(device);
  });

  router.get('/:deviceId/state', async (req, res) => {
    const device = deviceRegistry.getById(req.params.deviceId);
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    const manager = managerService.get(device.managerId);
    if (!manager?.getDeviceState) {
      res.status(404).json({ error: 'Device state not available' });
      return;
    }

    try {
      const state = await manager.getDeviceState(req.params.deviceId);
      if (!state) {
        res.status(404).json({ error: 'Device state not found' });
        return;
      }
      res.json(state);
    } catch (err) {
      res.status(502).json({ error: err.message });
    }
  });

  router.post('/:deviceId/actions/:capabilityId', async (req, res) => {
    res.json(
      await actionRouter.execute({
        ...req.body,
        deviceId: req.params.deviceId,
        capabilityId: req.params.capabilityId,
      })
    );
  });

  return router;
}

module.exports = { createDevicesRouter };
