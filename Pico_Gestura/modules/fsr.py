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

    def __init__(self, pin_number):
        self.adc = machine.ADC(pin_number)

        # your real measured range
        self.v_min = 0.005
        self.v_max = 0.4

        self.buffer = []
        self.callbacks = {}
        
        # Internal state for event detection
        self.last_state = self.STATE_NONE
        self.last_hard_press_time = 0
        self.double_press_window_ms = 600 # ms window for double press
        
        self.current_v_smoothed = 0.0

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
        return (self.read_raw() / 65535) * 3.3

    # optional smoothing (important for stability)
    def _smooth(self, v):
        self.buffer.append(v)
        if len(self.buffer) > 5:
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

    def get_state(self):
        """3-level button style output based on current smoothed voltage"""
        v = self.current_v_smoothed

        if 0 <= v < self.v_max * .4:
            return self.STATE_NONE
        elif self.v_max * .4 < v < self.v_max * .85:
            return self.STATE_HALF
        else:
            return self.STATE_FULL
