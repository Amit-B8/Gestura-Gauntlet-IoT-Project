import machine
import uasyncio as asyncio
import time
import ujson
from umqtt.simple import MQTTClient
from system_init import hardware_check, connect_wifi
from modules.gui import GauntletGUI
from modules.mpu6050 import MPU6050
from modules.button import GauntletButton

# --- CONFIGURATION ---
WIFI_SSID = "UI-DeviceNet"
WIFI_PASS = "UI-DeviceNet"
MQTT_SERVER = "172.17.53.95" # Your Node.js server IP
CLIENT_ID = "GesturaPico"

led = machine.Pin("LED", machine.Pin.OUT)

def trigger_hardware_panic(error_code):
    print(f"FATAL ERROR: {error_code}")
    while True:
        led.toggle()
        time.sleep(0.1)

# Global MQTT Client
mqtt_client = MQTTClient(CLIENT_ID, MQTT_SERVER, keepalive=60)

def mqtt_callback(topic, msg):
    if topic == b'gauntlet/mode':
        new_mode = msg.decode('utf-8').upper()
        global_gui.update_state(mode=new_mode)
        print(f"Mode instantly changed to: {new_mode}")

async def network_task(gui):
    mqtt_client.set_callback(mqtt_callback)
    try:
        mqtt_client.connect()
        mqtt_client.subscribe(b"gauntlet/mode")
        gui.update_state(connected=True)
        print("Connected to MQTT Broker!")
    except Exception as e:
        print("MQTT Connection Failed:", e)
        gui.update_state(connected=False)
        return

    while True:
        try:
            mqtt_client.check_msg()
            if gui.state.get("mode") == "PASSIVE":
                payload = ujson.dumps({
                    "x": gui.state.get("x_val", 0.0),
                    "y": gui.state.get("y_val", 0.0),
                    "z": gui.state.get("z_val", 0.0)
                })
                mqtt_client.publish(b"gauntlet/sensors", payload)
        except Exception as e:
            pass
        await asyncio.sleep_ms(20)

async def sensor_task(gui, mpu):
    while True:
        try:
            accel_data = mpu.get_accel()
            gui.update_state(
                x_val=accel_data['x'],
                y_val=accel_data['y'],
                z_val=accel_data['z']
            )
        except Exception as e:
            pass
        await asyncio.sleep_ms(20)

async def main():
    print("--- Booting Gestura Gauntlet OS ---")
    
    try:
        # Get separate buses for OLED and Sensor
        i2c_oled, i2c_mpu = hardware_check() 
        ip = connect_wifi(WIFI_SSID, WIFI_PASS)
        
        mpu = MPU6050(i2c_mpu)
        
        global global_gui
        global_gui = GauntletGUI(i2c_oled)
        
    except Exception as e:
        trigger_hardware_panic(str(e))

    global_gui.update_state(connected=True, mode="PASSIVE")
    global_gui.render()
    
    # Initialize the physical button on GP14
    action_button = GauntletButton(pin_num=14)
    time.sleep(1)

    print("Starting Parallel Tasks...")
    await asyncio.gather(
        global_gui.display_task(),
        sensor_task(global_gui, mpu),
        action_button.monitor(global_gui, mqtt_client),
        network_task(global_gui)
    )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("System halted manually.")