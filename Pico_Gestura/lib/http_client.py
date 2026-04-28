import ujson
import usocket


try:
    import ssl
except ImportError:
    try:
        import ussl as ssl
    except ImportError:
        ssl = None

from lib.env import parse_ws_url


def get_json(url, headers=None, ca_der_path=None, timeout=5):
    parsed = parse_http_url(url)
    sock = open_socket(parsed, ca_der_path=ca_der_path, timeout=timeout)
    try:
        host = parsed["host"]
        if parsed["port"] not in (80, 443):
            host = "{}:{}".format(parsed["host"], parsed["port"])

        request = [
            "GET {} HTTP/1.1".format(parsed["path"]),
            "Host: {}".format(host),
            "Connection: close",
            "Accept: application/json",
        ]

        for key, value in (headers or {}).items():
            request.append("{}: {}".format(key, value))

        request.append("")
        request.append("")

        sock.write("\r\n".join(request).encode("utf-8"))

        status, body = read_response(sock)

        if status < 200 or status >= 300:
            raise RuntimeError("GET {} failed with {}".format(url, status))

        return ujson.loads(body)

    finally:
        sock.close()


def open_socket(parsed, ca_der_path=None, timeout=5):
    if parsed["secure"] and ssl is None:
        raise RuntimeError("SSL/TLS not available in this firmware")

    addr = usocket.getaddrinfo(parsed["host"], parsed["port"])[0][-1]
    raw_sock = usocket.socket()
    raw_sock.settimeout(timeout)

    try:
        raw_sock.connect(addr)

        if not parsed["secure"]:
            return raw_sock

        # NOTE: MicroPython often has limited SSL support.
        # Avoid advanced kwargs like cadata/cert_reqs unless you know they're supported.
        try:
            return ssl.wrap_socket(raw_sock, server_hostname=parsed["host"])
        except TypeError:
            # server_hostname not supported
            return ssl.wrap_socket(raw_sock)

    except Exception:
        raw_sock.close()
        raise


def parse_http_url(url):
    secure = url.startswith("https://")
    if not secure and not url.startswith("http://"):
        raise ValueError("Expected http:// or https:// URL")

    parsed = parse_ws_url(
        url.replace("https://", "wss://", 1).replace("http://", "ws://", 1)
    )

    parsed["scheme"] = "https" if secure else "http"
    parsed["secure"] = secure

    return parsed


def load_ca(ca_der_path):
    if not ca_der_path:
        return None
    try:
        with open(ca_der_path, "rb") as f:
            return f.read()
    except OSError:
        print("CA DER not found:", ca_der_path)
        return None


def read_response(sock):
    raw = b""

    # Read headers
    while b"\r\n\r\n" not in raw:
        chunk = sock.read(256)
        if not chunk:
            break
        raw += chunk

    header, _, body = raw.partition(b"\r\n\r\n")

    status_line = header.split(b"\r\n", 1)[0].decode("utf-8")

    try:
        status = int(status_line.split(" ")[1])
    except Exception:
        raise RuntimeError("Invalid HTTP response: {}".format(status_line))

    # Read rest of body
    while True:
        chunk = sock.read(512)
        if not chunk:
            break
        body += chunk

    return status, body.decode("utf-8")