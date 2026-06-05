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
    "pagos": []
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
