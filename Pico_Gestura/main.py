import machine
import uasyncio as asyncio
import time
import ujson
from lib.env import load_env
from lib.websocket_client import SimpleWebSocketClient
from system_init import hardware_check, connect_wifi
from modules.gui import GauntletGUI
from modules.mpu6050 import MPU6050
from modules.button import GauntletButton
from modules.datastore import StateStore
from modules.fsr import FSR

env = load_env()

WIFI_SSID = env.get("WIFI_SSID")
WIFI_PASS = env.get("WIFI_PASS")
GLOVE_WS_URL = env.get("GLOVE_WS_URL", "ws://localhost:3001/glove")
GLOVE_ID = env.get("GLOVE_ID", "primary_glove")
PICO_API_TOKEN = env.get("PICO_API_TOKEN", "")

led = machine.Pin("LED", machine.Pin.OUT)
global_gui = None


def trigger_hardware_panic(error_code):
    print("FATAL ERROR:", error_code)
    while True:
        led.toggle()
        time.sleep(0.1)


def build_glove_ws_url():
    separator = "&" if "?" in GLOVE_WS_URL else "?"
    url = "{}{}gloveId={}".format(GLOVE_WS_URL, separator, GLOVE_ID)
    if PICO_API_TOKEN:
        url = "{}&api_key={}".format(url, PICO_API_TOKEN)
    return url


async def network_task(gui, store):
    reconnect_delay_ms = 500
    max_delay_ms = 5000
    transport = None

    while True:
        try:
            transport = SimpleWebSocketClient(build_glove_ws_url())
            transport.connect()
            transport.send_json({
                "type": "hello",
                "gloveId": GLOVE_ID,
                "ts": time.ticks_ms(),
            })
            store.update(connected=True, transport=transport)
            gui.update_state(connected=True)
            print("Connected to Gestura websocket:", build_glove_ws_url())
            reconnect_delay_ms = 500
        except Exception as e:
            print("WebSocket connection failed:", e)
            store.update(connected=False, transport=None)
            gui.update_state(connected=False)
            await asyncio.sleep_ms(reconnect_delay_ms)
            reconnect_delay_ms = min(max_delay_ms, reconnect_delay_ms * 2)
            continue

        while True:
            try:
                incoming = transport.receive_json(timeout=0.01)
                if incoming:
                    handle_server_message(incoming, gui, store)

                state = store.snapshot()
                payload = {
                    "type": "sensor_update",
                    "gloveId": GLOVE_ID,
                    "ts": time.ticks_ms(),
                    "mode": state.get("mode", "PASSIVE").lower(),
                    "x": state.get("accel_x", 0.0),
                    "y": state.get("accel_y", 0.0),
                    "z": state.get("accel_z", 0.0),
                    "gx": state.get("gyro_x", 0.0),
                    "gy": state.get("gyro_y", 0.0),
                    "gz": state.get("gyro_z", 0.0),
                    "pressure": state.get("pressure", 0.0),
                }
                transport.send_json(payload)
            except Exception as e:
                print("WebSocket error:", e)
                gui.update_state(connected=False)
                store.update(connected=False, transport=None)
                try:
                    transport.close()
                except Exception:
                    pass
                break

            await asyncio.sleep_ms(20)


def handle_server_message(message, gui, store):
    message_type = message.get("type")
    if message_type in ("welcome", "config_snapshot", "mode_update"):
        mode = str(message.get("mode", "")).upper()
        if mode in ("ACTIVE", "PASSIVE"):
            store.update(mode=mode)
            gui.update_state(mode=mode)


async def sensor_task(gui, mpu, fsr, store):
    last_print_time = time.ticks_ms()

    while True:
        try:
            state = store.snapshot()
            if state.get("calibrate_req"):
                print("Sensor task: Starting calibration...")
                gui.update_state(action="CALIBRATING...")
                mpu.calibrate(samples=100)
                store.update(calibrate_req=False)
                gui.update_state(action="READY")
                print("Sensor task: Calibration finished.")

            accel_data = mpu.get_accel()
            gyro_data = mpu.get_gyro()

            fsr.tick()
            pressure = fsr.get_pressure_percentage()

            mpu.runtime_re_zero(gyro_data["x"], gyro_data["y"], gyro_data["z"], alpha=0.999)

            store.update(
                accel_x=accel_data["x"],
                accel_y=accel_data["y"],
                accel_z=accel_data["z"],
                gyro_x=gyro_data["x"],
                gyro_y=gyro_data["y"],
                gyro_z=gyro_data["z"],
                pressure=pressure,
            )

            current_time = time.ticks_ms()
            if time.ticks_diff(current_time, last_print_time) >= 500:
                raw_v = fsr.read_voltage()
                smoothed_v = fsr.current_v_smoothed
                state = fsr.get_state()
                print(
                    "FSR -> Raw:{:.3f}V Smoothed:{:.3f}V STATE:{} P:{:.1f}%".format(
                        raw_v, smoothed_v, state, pressure
                    )
                )
                last_print_time = current_time
        except Exception as e:
            print("Sensor Task Error:", e)

        await asyncio.sleep_ms(20)


async def main():
    print("--- Booting Gestura Gauntlet OS ---")

    try:
        i2c, devices = hardware_check()
        connect_wifi(WIFI_SSID, WIFI_PASS)

        mpu_addr = 0x68 if 0x68 in devices else 0x69 if 0x69 in devices else None
        if mpu_addr is None:
            raise Exception("MPU6050 not found on I2C (expected 0x68 or 0x69). Check wiring/AD0.")
        mpu = MPU6050(i2c, addr=mpu_addr)
        fsr = FSR(26)

        global global_gui
        state_store = StateStore()
        global_gui = GauntletGUI(i2c, state_store)

        def on_fsr_double_press():
            current_mode = state_store.get("mode")
            new_mode = "ACTIVE" if current_mode == "PASSIVE" else "PASSIVE"
            state_store.update(mode=new_mode)
            global_gui.update_state(mode=new_mode)
            print("!!! FSR DOUBLE PRESS: Toggling mode to {} !!!".format(new_mode))
            transport = state_store.get("transport")
            if transport:
                try:
                    transport.send_json({
                        "type": "mode_set",
                        "gloveId": GLOVE_ID,
                        "mode": new_mode.lower(),
                        "button": "fsr_double_press",
                    })
                except Exception as e:
                    print("WebSocket FSR send error:", e)

        fsr.subscribe(FSR.EVENT_HARD_DOUBLE_PRESS, on_fsr_double_press)
    except Exception as e:
        trigger_hardware_panic(str(e))

    global_gui.update_state(connected=False, mode="PASSIVE", action="Boot Calibrate")
    global_gui.render()

    print("Performing Initial Calibration (Hold Steady)...")
    mpu.calibrate(samples=50)
    global_gui.update_state(action="Ready")

    action_button = GauntletButton(pin_num=13, name="Action")
    mode_button = GauntletButton(pin_num=12, name="Mode Toggle")
    time.sleep(1)

    print("Starting Parallel Tasks...")
    await asyncio.gather(
        global_gui.display_task(),
        sensor_task(global_gui, mpu, fsr, state_store),
        network_task(global_gui, state_store),
        action_button.monitor(global_gui, state_store),
        mode_button.monitor(global_gui, state_store),
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("System halted manually.")
