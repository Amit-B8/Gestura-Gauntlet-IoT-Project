import machine
import uasyncio as asyncio
from modules import ssd1306

class GauntletGUI:
    def __init__(self, i2c, width=128, height=64):
        self.width = width
        self.height = height
        self.oled = ssd1306.SSD1306_I2C(self.width, self.height, i2c)
        
        # State Variables
        self.state = {
            "connected": False,
            "mode": "INIT", 
            "x_val": 0.00
        }

    def update_state(self, **kwargs):
        for key, value in kwargs.items():
            if key in self.state:
                self.state[key] = value

    def render(self):
        self.oled.fill(0) 
        
        # Top Status Bar
        conn_text = "WIFI: OK" if self.state["connected"] else "WIFI: X"
        self.oled.text(conn_text, 0, 0)
        
        mode = self.state["mode"].upper()
        self.oled.text(f"MODE: {mode}", 0, 16)
        
        # Center Content (Conditional based on mode)
        if mode == "PASSIVE":
            self.oled.text("Streaming Data:", 0, 32)
            self.oled.text(f"X: {self.state['x_val']:.2f}", 0, 48)
        elif mode == "ACTIVE":
            self.oled.text(">>> ACTIVE <<<", 16, 40)
            
        self.oled.show()

    async def display_task(self):
        """Runs continuously to refresh the screen."""
        while True:
            self.render()
            await asyncio.sleep_ms(100) # 10 FPS