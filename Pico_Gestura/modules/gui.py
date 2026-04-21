import uasyncio as asyncio
from modules import ssd1306

class GauntletGUI:
    def __init__(self, i2c, state_store, width=128, height=64, enabled=True):
        self.width = width
        self.height = height
        self._store = state_store
        self.enabled = enabled and i2c is not None
        self.oled = None

        if self.enabled:
            try:
                self.oled = ssd1306.SSD1306_I2C(self.width, self.height, i2c)
                print("OLED initialized.")
            except Exception as e:
                self.enabled = False
                print(f"OLED not initialized: {e}")

    def update_state(self, **kwargs):
        self._store.update(**kwargs)

    def render(self):
        if not self.enabled or self.oled is None:
            return

        state = self._store.snapshot()
        try:
            self.oled.fill(0)

            # Top Status Bar
            mode = state["mode"].upper()
            self.oled.text(f"MODE: {mode}", 0, 0)

            # ACTION CENTER (Rows 25-40)
            action_text = state.get("action", "").upper()
            if action_text:
                self.oled.text(">> " + action_text, 0, 25)

            # SENSOR DATA (Bottom)
            if mode == "PASSIVE":
                self.oled.text(f"X:{state['accel_x']:>5.2f} Y:{state['accel_y']:>5.2f}", 0, 45)
                self.oled.text(f"Z:{state['accel_z']:>5.2f}", 0, 55)
            elif mode == "ACTIVE":
                self.oled.text("GAUNTLET ACTIVE", 0, 50)

            self.oled.show()
        except Exception as e:
            self.enabled = False
            self.oled = None
            print(f"OLED disabled after render error: {e}")

    async def display_task(self):
        """Runs continuously to refresh the screen."""
        while True:
            if self.enabled and self.oled is not None:
                self.render()
            await asyncio.sleep_ms(100) # 10 FPS
