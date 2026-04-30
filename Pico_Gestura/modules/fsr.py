import machine
import time

class FSR:
    # State constants
    STATE_NONE = 0
    STATE_HALF = 1
    STATE_FULL = 2

    # Event constants
    EVENT_HARD_PRESS = "hard_press"
    EVENT_HARD_DOUBLE_PRESS = "hard_double_press"

    def __init__(
        self,
        pin_number,
        v_min=0.005,
        v_max=0.4,
        half_ratio=0.25,
        full_ratio=0.55,
        smoothing_samples=3,
    ):
        self.pin_number = pin_number
        self.adc = machine.ADC(pin_number)

        self.v_min = float(v_min)
        self.v_max = float(v_max)
        self.half_ratio = float(half_ratio)
        self.full_ratio = float(full_ratio)
        self.smoothing_samples = max(1, int(smoothing_samples))

        self.buffer = []
        self.callbacks = {}
        
        # Internal state for event detection
        self.last_state = self.STATE_NONE
        self.last_hard_press_time = 0
        self.double_press_window_ms = 600 # ms window for double press
        
        self.current_v_smoothed = 0.0
        self.current_raw = 0
        self.current_voltage = 0.0

    def subscribe(self, event_type, callback):
        """Register a callback for a specific event."""
        if event_type not in self.callbacks:
            self.callbacks[event_type] = []
        self.callbacks[event_type].append(callback)

    def _trigger_event(self, event_type):
        """Execute all callbacks registered for an event."""
        if event_type in self.callbacks:
            for callback in self.callbacks[event_type]:
                try:
                    callback()
                except Exception as e:
                    print(f"Error in FSR callback for {event_type}: {e}")

    def read_raw(self):
        return self.adc.read_u16()

    def read_voltage(self):
        self.current_raw = self.read_raw()
        self.current_voltage = (self.current_raw / 65535) * 3.3
        return self.current_voltage

    # optional smoothing (important for stability)
    def _smooth(self, v):
        self.buffer.append(v)
        if len(self.buffer) > self.smoothing_samples:
            self.buffer.pop(0)
        return sum(self.buffer) / len(self.buffer)

    def tick(self):
        """
        Polls the sensor state and triggers events if necessary.
        Should be called frequently (e.g., in a loop).
        """
        v = self.read_voltage()
        self.current_v_smoothed = self._smooth(v)
        
        current_state = self.get_state()
        now = time.ticks_ms()

        # Detection logic for hard press (transition to STATE_FULL)
        if current_state == self.STATE_FULL and self.last_state != self.STATE_FULL:
            # Check if this is a double press
            if time.ticks_diff(now, self.last_hard_press_time) < self.double_press_window_ms:
                # Double press detected
                self._trigger_event(self.EVENT_HARD_DOUBLE_PRESS)
                # Reset timer to prevent triple-press from triggering another double-press immediately
                self.last_hard_press_time = 0
            else:
                # First hard press
                self.last_hard_press_time = now
                self._trigger_event(self.EVENT_HARD_PRESS)

        self.last_state = current_state
        return current_state

    def get_pressure_percentage(self):
        v = self.current_v_smoothed

        # clamp to real measured range
        v = min(max(v, self.v_min), self.v_max)

        # normalize
        norm = (v - self.v_min) / (self.v_max - self.v_min)

        # curve for better feel
        norm = norm ** 1.5

        return norm * 100

    def debug_snapshot(self):
        state = self.get_state()
        return {
            "pin": self.pin_number,
            "raw": self.current_raw,
            "voltage": self.current_voltage,
            "smoothed_voltage": self.current_v_smoothed,
            "pressure": self.get_pressure_percentage(),
            "state": state,
            "state_label": self.state_label(state),
            "half_threshold": self.half_threshold(),
            "full_threshold": self.full_threshold(),
        }

    def get_state(self):
        """3-level button style output based on current smoothed voltage"""
        v = self.current_v_smoothed

        if v < self.half_threshold():
            return self.STATE_NONE
        if v < self.full_threshold():
            return self.STATE_HALF
        return self.STATE_FULL

    def half_threshold(self):
        return self.v_max * self.half_ratio

    def full_threshold(self):
        return self.v_max * self.full_ratio

    def state_label(self, state=None):
        if state is None:
            state = self.get_state()
        if state == self.STATE_FULL:
            return "FULL"
        if state == self.STATE_HALF:
            return "HALF"
        return "NONE"
