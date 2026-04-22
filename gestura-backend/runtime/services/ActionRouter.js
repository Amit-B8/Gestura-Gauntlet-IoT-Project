class ActionRouter {
  constructor(managerService, deviceRegistry) {
    this.managerService = managerService;
    this.deviceRegistry = deviceRegistry;
  }

  async execute(action) {
    const device = this.deviceRegistry.getById(action.deviceId);
    if (!device) {
      return {
        ok: false,
        deviceId: action.deviceId,
        capabilityId: action.capabilityId,
        message: 'Device not found in registry',
      };
    }

    const capability = device.capabilities.find((item) => item.id === action.capabilityId);
    if (!capability) {
      return {
        ok: false,
        deviceId: action.deviceId,
        capabilityId: action.capabilityId,
        message: 'Capability not found',
      };
    }

    const manager = this.managerService.get(device.managerId);
    if (!manager) {
      return {
        ok: false,
        deviceId: action.deviceId,
        capabilityId: action.capabilityId,
        message: `Manager ${device.managerId} not found`,
      };
    }

    return manager.executeAction(action);
  }
}

module.exports = { ActionRouter };
