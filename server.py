from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import ipaddress
import json
import os
from pathlib import Path
import threading
import time


RETENTION = timedelta(days=7)
DATA_FILE = Path.home() / ".fotobox" / "visit_metrics.jsonl"
DATA_LOCK = threading.Lock()


def purge_expired_visits():
    if not DATA_FILE.exists():
        return

    cutoff = datetime.now(timezone.utc) - RETENTION
    with DATA_LOCK:
        retained = []
        with DATA_FILE.open("r", encoding="utf-8") as data_file:
            for line in data_file:
                try:
                    record = json.loads(line)
                    visited_at = datetime.fromisoformat(record["timestamp"])
                except (json.JSONDecodeError, KeyError, TypeError, ValueError):
                    continue
                if visited_at >= cutoff:
                    retained.append(line)

        temporary_file = DATA_FILE.with_suffix(".jsonl.tmp")
        with temporary_file.open("w", encoding="utf-8") as data_file:
            os.chmod(temporary_file, 0o600)
            data_file.writelines(retained)
        os.replace(temporary_file, DATA_FILE)
        os.chmod(DATA_FILE, 0o600)


def retention_worker():
    while True:
        time.sleep(3600)
        try:
            purge_expired_visits()
        except OSError as error:
            print(f"Gagal menghapus data kunjungan kedaluwarsa: {error}", flush=True)


class PhotoboothHandler(SimpleHTTPRequestHandler):
    def log_message(self, format_string, *args):
        # Avoid writing visitor IPs to the default HTTP access log.
        return

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/api/visit":
            self.send_json(404, {"error": "Endpoint tidak ditemukan"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0 or content_length > 4096:
                self.send_json(400, {"error": "Ukuran data permintaan tidak valid"})
                return
            request_data = json.loads(self.rfile.read(content_length))
            if not isinstance(request_data, dict):
                raise ValueError("Format permintaan tidak valid")
            performance = request_data.get("performance", {})
            if not isinstance(performance, dict):
                raise ValueError("Format metrik performa tidak valid")

            load_time = performance.get("loadTimeMs")
            dom_content_loaded = performance.get("domContentLoadedMs")
            transfer_size = performance.get("transferSizeBytes")
            connection_type = performance.get("connectionType")
            for value in (load_time, dom_content_loaded, transfer_size):
                if value is not None and (isinstance(value, bool) or not isinstance(value, (int, float))):
                    raise ValueError("Nilai metrik performa tidak valid")
            if connection_type is not None and not isinstance(connection_type, str):
                raise ValueError("Jenis koneksi tidak valid")

            address = ipaddress.ip_address(self.client_address[0])
            if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
                address = address.ipv4_mapped
            timestamp = datetime.now(timezone.utc).isoformat()
            record = {
                "timestamp": timestamp,
                "ip": str(address),
                "performance": {
                    "loadTimeMs": load_time,
                    "domContentLoadedMs": dom_content_loaded,
                    "transferSizeBytes": transfer_size,
                    "connectionType": connection_type[:32] if connection_type else None,
                },
            }

            DATA_FILE.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
            os.chmod(DATA_FILE.parent, 0o700)
            purge_expired_visits()
            with DATA_LOCK:
                descriptor = os.open(DATA_FILE, os.O_APPEND | os.O_CREAT | os.O_WRONLY, 0o600)
                with os.fdopen(descriptor, "a", encoding="utf-8") as data_file:
                    os.chmod(DATA_FILE, 0o600)
                    data_file.write(json.dumps(record) + "\n")

            self.send_json(200, {"ip": record["ip"], "timestamp": timestamp})
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError) as error:
            self.send_json(400, {"error": str(error)})
        except OSError as error:
            print(f"Gagal menyimpan data kunjungan: {error}", flush=True)
            self.send_json(500, {"error": "Server gagal menyimpan data kunjungan"})


if __name__ == "__main__":
    purge_expired_visits()
    threading.Thread(target=retention_worker, daemon=True).start()
    server = ThreadingHTTPServer(("0.0.0.0", 4173), PhotoboothHandler)
    print("Fotobox aktif di http://0.0.0.0:4173")
    server.serve_forever()
