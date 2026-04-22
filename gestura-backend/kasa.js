/**
 * Compatibility entrypoint for Kasa integration code.
 *
 * Kasa devices are now owned by the native Kasa manager. The server no longer
 * reads fixed device IP variables or exposes app-specific bulb presets here.
 */

module.exports = require('./runtime/managers/kasaManager');
