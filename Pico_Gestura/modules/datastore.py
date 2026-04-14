class StateStore:
    def __init__(self):
        self._state = {
            "connected": False,
            "mode": "INIT",
            "action": "BOOTING...",
            "calibrate_req": False,
            "accel_x": 0.0,
            "accel_y": 0.0,
            "accel_z": 0.0,
            "gyro_x": 0.0,
            "gyro_y": 0.0,
            "gyro_z": 0.0,
        }

    def update(self, **kwargs):
        for key, value in kwargs.items():
            # Support dynamic creation of keys just in case, or ensure they exist
            self._state[key] = value

    def get(self, key, default=None):
        return self._state.get(key, default)

    def snapshot(self):
        return dict(self._state)
