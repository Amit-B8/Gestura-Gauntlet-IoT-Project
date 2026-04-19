import time
from modules.fsr import FSR

# Initialize FSR on GP26 (ADC0)
fsr_sensor = FSR(26)

# Example callback
def on_double_press():
    print("\n>>> EVENT: HARD DOUBLE PRESS DETECTED! <<<\n")

fsr_sensor.subscribe(FSR.EVENT_HARD_DOUBLE_PRESS, on_double_press)

print("--- FSR Module Test (OOP & Events) ---")
print("Reading from GP26...")

try:
    while True:
        # Tick the sensor to process events and update smoothed values
        state = fsr_sensor.tick()
        
        raw = fsr_sensor.read_raw()
        voltage = fsr_sensor.read_voltage()
        percent = fsr_sensor.get_pressure_percentage()
        
        # State: 0=None, 1=Half, 2=Full
        state_str = ["NONE", "HALF", "FULL"][state]
        
        print(f"State: {state_str:4s} | Voltage: {voltage:.2f}V | Pressure: {percent:5.1f}%", end="\r")
        time.sleep(0.05) # Higher frequency for event detection
except KeyboardInterrupt:
    print("\nTest stopped.")
