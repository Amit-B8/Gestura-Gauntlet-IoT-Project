import time
from modules.fsr import FSR

# Initialize FSR on GP26 (ADC0)
fsr_sensor = FSR(26)

print("--- FSR Module Test ---")
print("Reading from GP26...")

try:
    while True:
        raw = fsr_sensor.read_raw()
        voltage = fsr_sensor.read_voltage()
        percent = fsr_sensor.get_pressure_percentage()
        
        print(f"Raw: {raw:5d} | Voltage: {voltage:.2f}V | Pressure: {percent:.1f}%")
        time.sleep(0.2)
except KeyboardInterrupt:
    print("\nTest stopped.")
