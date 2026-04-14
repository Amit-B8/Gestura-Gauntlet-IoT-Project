import machine
import uasyncio as asyncio
import time

class GauntletButton:
    def __init__(self, pin_num=13, pull_up=True, debounce_ms=50):
        self.pin = machine.Pin(pin_num, machine.Pin.IN,
                               machine.Pin.PULL_UP if pull_up else machine.Pin.PULL_DOWN)
        self.debounce_ms = debounce_ms
        self._last_state = self.pin.value()
        self._last_change = time.ticks_ms()
        self._pressed = False

    async def monitor(self, gui, mqtt_client):
        """Monitors button state and toggles ACTIVE/PASSIVE on press."""
        while True:
            current = self.pin.value()
            now = time.ticks_ms()

            if current != self._last_state:
                # Debounce: only accept state after it stays stable
                if time.ticks_diff(now, self._last_change) > self.debounce_ms:
                    self._last_state = current
                    self._last_change = now

                    # Button pressed (for pull-up wiring, pressed == 0)
                    if current == 0 and not self._pressed:
                        self._pressed = True
                        state = gui._store.get("mode", "PASSIVE")
                        new_mode = "ACTIVE" if state != "ACTIVE" else "PASSIVE"
                        gui.update_state(mode=new_mode)

                        try:
                            mqtt_client.publish(b"gauntlet/mode", new_mode.encode())
                        except Exception as e:
                            print("Button MQTT publish failed:", e)

                    elif current == 1:
                        self._pressed = False

            await asyncio.sleep_ms(10)
