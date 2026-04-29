import network
import time


class StatusState:
    def __init__(self, wifi_ssid=""):
        self.wifi_ssid = wifi_ssid or "unknown"
        self.route = "OFFLINE"
        self.node_name = "none"
        self.battery = None
        self.rtt_ms = None
        self.connected = False
        self.wifi_connected = False
        self.ws_connected = False
        self.degraded = False
        self.mapping_count = 0
        self.device_count = 0
        self.manager_count = 0
        self.last_error = ""
        self.rotation_index = 0
        self.last_rotation_ms = time.ticks_ms()

    def update(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    def rotate_if_due(self, interval_ms=2500):
        now = time.ticks_ms()
        if time.ticks_diff(now, self.last_rotation_ms) < interval_ms:
            return False
        self.rotation_index = (self.rotation_index + 1) % 4
        self.last_rotation_ms = now
        return True

    def status_label(self):
        items = [
            "WiFi {}".format(short_text(self.wifi_ssid, 12)),
            "Route {}".format(self.route),
        ]
        if self.battery is not None:
            items.append("Batt {}".format(self.battery))
        if self.rtt_ms is not None:
            items.append("RTT {}ms".format(self.rtt_ms))
        return items[self.rotation_index % len(items)]

    def wifi_rssi(self):
        try:
            wlan = network.WLAN(network.STA_IF)
            if hasattr(wlan, "status"):
                return wlan.status("rssi")
        except Exception:
            pass
        return None

    def full_rows(self):
        rows = [
            ("WiFi", short_text(self.wifi_ssid, 14)),
            ("Route", self.route),
            ("Node", short_text(self.node_name, 14)),
            ("WiFi", "ONLINE" if self.wifi_connected else "OFFLINE"),
            ("WSS", "ONLINE" if self.ws_connected else "OFFLINE"),
            ("Conn", "ONLINE" if self.connected else "OFFLINE"),
            ("Maps", str(self.mapping_count)),
            ("Devices", str(self.device_count)),
            ("Managers", str(self.manager_count)),
            ("Error", short_text(self.last_error or "none", 14)),
        ]
        insert_at = 3
        if self.battery is not None:
            rows.insert(insert_at, ("Battery", self.battery))
            insert_at += 1
        if self.rtt_ms is not None:
            rows.insert(insert_at, ("RTT", "{}ms".format(self.rtt_ms)))
        return rows


def route_label(active_endpoint, source, connected, degraded=False):
    if not connected:
        return "OFFLINE"
    endpoint = str(active_endpoint or "")
    src = str(source or "").lower()
    if degraded:
        return "OFFLINE"
    if (src == "edge" or src == "websocket") and (endpoint.startswith("ws://") or endpoint.startswith("http://")):
        return "LAN EDGE"
    if (src == "edge" or src == "websocket"):
        return "PUB EDGE"
    if endpoint.startswith("wss://") or endpoint.startswith("https://"):
        return "CLOUD"
    return "PUB EDGE"


def short_text(value, max_chars):
    text = str(value or "")
    if len(text) <= max_chars:
        return text
    if max_chars <= 1:
        return text[:max_chars]
    return text[: max_chars - 1] + "~"
