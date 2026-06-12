import os
import sys
import json
import webbrowser
import threading
from http.server import SimpleHTTPRequestHandler, HTTPServer

PORT = 8080

# Determine base directory
if getattr(sys, 'frozen', False):
    exe_dir = os.path.dirname(sys.executable)
else:
    exe_dir = os.path.dirname(os.path.abspath(__file__))

# If compiled and inside a 'dist' folder, move up one level
if getattr(sys, 'frozen', False) and os.path.basename(exe_dir).lower() == 'dist':
    base_dir = os.path.dirname(exe_dir)
else:
    base_dir = exe_dir

# Fallback: if E:\FlexoERP exists, prioritize it
if os.path.exists(r"E:\FlexoERP"):
    base_dir = r"E:\FlexoERP"

class LogWriter:
    def __init__(self, filepath):
        self.filepath = filepath
    def write(self, s):
        try:
            with open(self.filepath, 'a', encoding='utf-8') as f:
                f.write(s)
        except Exception:
            pass
    def flush(self):
        pass

if getattr(sys, 'frozen', False) or sys.stdout is None or sys.stderr is None:
    log_path = os.path.join(base_dir, "server_log.txt")
    sys.stdout = LogWriter(log_path)
    sys.stderr = LogWriter(log_path)

db_path = os.path.join(base_dir, "database.json")
web_dir = os.path.join(base_dir, "web")

# Default seeding data
DEFAULT_DATA = {
    "db_id": "reset_20260601",
    "users": [
        { "username": "superadmin", "password": "superadmin123", "name": "Super Admin", "role": "superadmin", "allowedModules": ["dashboard","clientes","ots","taller","logistica","usuarios"] },
        { "username": "admin",      "password": "123",           "name": "Administrador", "role": "admin",      "allowedModules": ["dashboard","clientes","ots","taller","logistica"] },
        { "username": "operador",   "password": "123",           "name": "Juan Perez",     "role": "operador",   "allowedModules": ["taller"] }
    ],
    "clients": [],
    "remitos": [],
    "ultimo_remito": 0,
    "ots_pendientes": [],
    "ots_logistica": [],
    "ultimo_numero_ot": 0,
    "todas_las_ots": {},
    "pagos": [],
    "price_lists": [
        {
            "id": "list-reimpresiones-bobina",
            "nombre": "Reimpresiones en Bobina",
            "polimero": 12000.0,
            "escalas": [
                { "cantidad": 1000, "pasada1": 19000.00, "pasada2": 32813.83, "pasada3": 44301.24 },
                { "cantidad": 2000, "pasada1": 15400.33, "pasada2": 20231.73, "pasada3": 27161.82 },
                { "cantidad": 3000, "pasada1": 12470.52, "pasada2": 13743.77, "pasada3": 20051.97 },
                { "cantidad": 4000, "pasada1": 9843.99,  "pasada2": 10936.49, "pasada3": 15237.40 },
                { "cantidad": 5000, "pasada1": 8050.20,  "pasada2": 9974.71,  "pasada3": 13468.05 },
                { "cantidad": 6000, "pasada1": 6922.77,  "pasada2": 9228.75,  "pasada3": 12454.16 },
                { "cantidad": 7000, "pasada1": 6028.04,  "pasada2": 8750.18,  "pasada3": 11812.08 },
                { "cantidad": 8000, "pasada1": 5888.95,  "pasada2": 8477.10,  "pasada3": 11441.56 },
                { "cantidad": 9000, "pasada1": 5492.90,  "pasada2": 8236.19,  "pasada3": 11124.43 },
                { "cantidad": 10000, "pasada1": 5381.32, "pasada2": 7781.72,  "pasada3": 10100.50 },
                { "cantidad": 11000, "pasada1": 5040.54, "pasada2": 7118.39,  "pasada3": 9611.48 },
                { "cantidad": 12000, "pasada1": 5029.87, "pasada2": 7111.05,  "pasada3": 9598.14 },
                { "cantidad": 13000, "pasada1": 5012.65, "pasada2": 7106.63,  "pasada3": 9595.26 },
                { "cantidad": 14000, "pasada1": 5011.32, "pasada2": 7090.96,  "pasada3": 9575.95 },
                { "cantidad": 15000, "pasada1": 5001.02, "pasada2": 7086.25,  "pasada3": 9567.80 },
                { "cantidad": 20000, "pasada1": 4652.00, "pasada2": 6410.71,  "pasada3": 8652.68 },
                { "cantidad": 30000, "pasada1": 4190.24, "pasada2": 5956.37,  "pasada3": 8040.88 },
                { "cantidad": 40000, "pasada1": 4179.48, "pasada2": 5947.26,  "pasada3": 8016.22 },
                { "cantidad": 50000, "pasada1": 4174.85, "pasada2": 5937.61,  "pasada3": 8014.98 },
                { "cantidad": 60000, "pasada1": 4172.16, "pasada2": 5931.20,  "pasada3": 8007.52 },
                { "cantidad": 70000, "pasada1": 4164.22, "pasada2": 5728.02,  "pasada3": 7976.19 },
                { "cantidad": 80000, "pasada1": 4155.69, "pasada2": 5899.23,  "pasada3": 7968.12 },
                { "cantidad": 90000, "pasada1": 4153.47, "pasada2": 5896.46,  "pasada3": 7965.52 },
                { "cantidad": 100000, "pasada1": 4045.43, "pasada2": 5861.09, "pasada3": 7913.87 }
            ]
        }
    ]
}

def load_db():
    if not os.path.exists(db_path):
        with open(db_path, 'w', encoding='utf-8') as f:
            json.dump(DEFAULT_DATA, f, indent=4, ensure_ascii=False)
        return DEFAULT_DATA
    try:
        with open(db_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading database, using default: {e}")
        return DEFAULT_DATA

def save_db(data):
    try:
        with open(db_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving database: {e}")
        return False

class ERPRequestHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        req_path = path.split('?', 1)[0]
        req_path = req_path.split('#', 1)[0]
        normalized = os.path.normpath(req_path)
        parts = normalized.split(os.sep)
        clean_parts = [p for p in parts if p and p != '..']
        res_path = os.path.join(web_dir, *clean_parts)
        if os.path.isdir(res_path):
            res_path = os.path.join(res_path, "index.html")
        return res_path

    def do_GET(self):
        if self.path == '/api/data':
            data = load_db()
            response_bytes = json.dumps(data, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(response_bytes)))
            self.end_headers()
            self.wfile.write(response_bytes)
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/save':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                success = save_db(data)
                response = {"status": "success" if success else "error"}
            except Exception as e:
                response = {"status": "error", "message": str(e)}
            
            response_bytes = json.dumps(response).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(response_bytes)))
            self.end_headers()
            self.wfile.write(response_bytes)
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def open_browser():
    webbrowser.open(f'http://localhost:{PORT}')

import traceback

def main():
    try:
        os.makedirs(web_dir, exist_ok=True)
        load_db()
        
        server_address = ('', PORT)
        try:
            httpd = HTTPServer(server_address, ERPRequestHandler)
        except OSError as e:
            # Port already in use: server is already running. Just open browser and exit.
            if getattr(e, 'winerror', None) == 10048 or "already in use" in str(e).lower():
                open_browser()
                return
            raise e

        print(f"FlexoERP local server started on http://localhost:{PORT}")
        print(f"Web folder: {web_dir}")
        print(f"Database path: {db_path}")
        
        # Start browser automatically
        threading.Timer(1.0, open_browser).start()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("Server shutting down.")
            httpd.server_close()
    except Exception as e:
        with open(os.path.join(base_dir, "crash_log.txt"), "w") as f:
            f.write(f"Exception in main: {e}\n")
            traceback.print_exc(file=f)

if __name__ == '__main__':
    main()
