import os
import sys
import json
import webbrowser
import threading
import datetime
from http.server import SimpleHTTPRequestHandler, HTTPServer

PORT = 8081

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


class SafeStream:
    def __init__(self, stream, log_path):
        self.stream = stream
        self.log_path = log_path

    def write(self, s):
        try:
            with open(self.log_path, 'a', encoding='utf-8') as f:
                f.write(s)
        except Exception:
            pass
        try:
            if self.stream:
                self.stream.write(s)
        except Exception:
            pass

    def flush(self):
        try:
            if self.stream:
                self.stream.flush()
        except Exception:
            pass

log_path = os.path.join(base_dir, "server_log.txt")
sys.stdout = SafeStream(sys.stdout, log_path)
sys.stderr = SafeStream(sys.stderr, log_path)

db_path = os.path.join(base_dir, "database.json")
web_dir = os.path.join(base_dir, "web")

# Default seeding data
DEFAULT_DATA = {
    "db_id": "reset_20260601",
    "users": [
        { "username": "superadmin", "password": "superadmin123", "name": "Super Admin", "role": "superadmin", "allowedModules": ["dashboard","clientes","ots","taller","logistica","proveedores","usuarios"] },
        { "username": "admin",      "password": "123",           "name": "Administrador", "role": "admin",      "allowedModules": ["dashboard","clientes","ots","taller","logistica","proveedores"] },
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
    "proveedores": [],
    "facturas_proveedores": [],
    "pagos_proveedores": [],
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

def get_backup_destinations():
    destinations = []
    user_home = os.environ.get('USERPROFILE', r"C:\Users\ENZO")
    
    # 1. Primary local backups folder
    local_backup_dir = os.path.join(base_dir, "backups")
    destinations.append({"name": "Local (FlexoERP)", "path": local_backup_dir, "type": "local"})

    # 2. Secondary local drive D:
    if os.path.exists("D:\\"):
        destinations.append({"name": "Disco Secundario (D:)", "path": r"D:\FlexoERP_Backups", "type": "secondary_drive"})

    # 3. Google Drive (auto-detect)
    possible_gdrive = [
        r"G:\Mi unidad\FlexoERP_Backups",
        r"G:\My Drive\FlexoERP_Backups",
        os.path.join(user_home, "Google Drive", "FlexoERP_Backups"),
        os.path.join(user_home, "GoogleDrive", "FlexoERP_Backups"),
        os.path.join(user_home, "Mi unidad", "FlexoERP_Backups")
    ]
    gdrive_detected = False
    for p in possible_gdrive:
        parent = os.path.dirname(p)
        if os.path.exists(parent):
            destinations.append({"name": "Google Drive", "path": p, "type": "google_drive"})
            gdrive_detected = True
            break
            
    if not gdrive_detected:
        for drive_letter in ["G", "H", "I"]:
            root = f"{drive_letter}:\\"
            if os.path.exists(root):
                p = os.path.join(root, "Mi unidad", "FlexoERP_Backups")
                destinations.append({"name": "Google Drive", "path": p, "type": "google_drive"})
                gdrive_detected = True
                break

    # 4. Microsoft OneDrive
    onedrive_base = os.path.join(user_home, "OneDrive")
    if os.path.exists(onedrive_base):
        onedrive_docs = os.path.join(onedrive_base, "Documentos", "FlexoERP_Backups")
        destinations.append({"name": "Microsoft OneDrive", "path": onedrive_docs, "type": "onedrive"})

    return destinations

def realizar_backup_diario(data):
    def run_backup():
        try:
            today_str = datetime.date.today().strftime("%Y-%m-%d")
            destinations = get_backup_destinations()
            
            for dest in destinations:
                b_dir = dest["path"]
                try:
                    os.makedirs(b_dir, exist_ok=True)
                    backup_file = os.path.join(b_dir, f"database_backup_{today_str}.json")
                    
                    if not os.path.exists(backup_file):
                        with open(backup_file, 'w', encoding='utf-8') as f:
                            json.dump(data, f, indent=4, ensure_ascii=False)
                        print(f"[{dest['name']}] Backup permanente diario creado: {backup_file}")
                    
                    # Rotacion de seguridad: mantener los ultimos 30 backups en cada carpeta
                    archivos = [os.path.join(b_dir, f) for f in os.listdir(b_dir) if f.startswith("database_backup_") and f.endswith(".json")]
                    if len(archivos) > 30:
                        archivos.sort(key=os.path.getmtime)
                        for viejo in archivos[:-30]:
                            try:
                                os.remove(viejo)
                            except Exception:
                                pass
                except Exception as ex_dir:
                    print(f"Aviso al respaldar en {b_dir}: {ex_dir}")
        except Exception as e:
            print(f"Error general al realizar backup diario: {e}")

    threading.Thread(target=run_backup, daemon=True).start()

def load_db():
    if not os.path.exists(db_path):
        with open(db_path, 'w', encoding='utf-8') as f:
            json.dump(DEFAULT_DATA, f, indent=4, ensure_ascii=False)
        realizar_backup_diario(DEFAULT_DATA)
        return DEFAULT_DATA
    try:
        with open(db_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        realizar_backup_diario(data)
        return data
    except Exception as e:
        print(f"Error reading database, using default: {e}")
        realizar_backup_diario(DEFAULT_DATA)
        return DEFAULT_DATA

def save_db(data):
    try:
        with open(db_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        realizar_backup_diario(data)
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

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        # Override to prevent OSError: [Errno 22] Invalid argument on Windows hidden consoles
        pass

    def do_GET(self):
        req_path = self.path.split('?', 1)[0]
        if req_path == '/api/data':
            data = load_db()
            response_bytes = json.dumps(data, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(response_bytes)))
            self.end_headers()
            self.wfile.write(response_bytes)
        elif req_path == '/api/backup/download':
            try:
                data = load_db()
                response_bytes = json.dumps(data, indent=2, ensure_ascii=False).encode('utf-8')
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")
                filename = f"FlexoERP_BaseDeDatos_{timestamp}.json"
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(response_bytes)))
                self.end_headers()
                self.wfile.write(response_bytes)
            except Exception as e:
                err_resp = json.dumps({"status": "error", "message": str(e)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(err_resp)
        elif req_path == '/api/backup/status':
            try:
                dests = get_backup_destinations()
                dest_info = []
                gdrive_found = False
                for d in dests:
                    exists = os.path.exists(d["path"])
                    count = 0
                    if exists:
                        try:
                            count = len([f for f in os.listdir(d["path"]) if f.endswith(".json")])
                        except Exception:
                            count = 0
                    if d["type"] == "google_drive" and exists:
                        gdrive_found = True
                    dest_info.append({
                        "name": d["name"],
                        "path": d["path"],
                        "type": d["type"],
                        "active": exists,
                        "file_count": count
                    })
                
                local_dir = os.path.join(base_dir, "backups")
                local_count = len([f for f in os.listdir(local_dir) if f.endswith(".json")]) if os.path.exists(local_dir) else 0

                resp_obj = {
                    "status": "success",
                    "google_drive_detected": gdrive_found,
                    "destinations": dest_info,
                    "local_count": local_count,
                    "today": datetime.date.today().strftime("%Y-%m-%d")
                }
                resp_bytes = json.dumps(resp_obj, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(resp_bytes)))
                self.end_headers()
                self.wfile.write(resp_bytes)
            except Exception as e:
                err_resp = json.dumps({"status": "error", "message": str(e)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(err_resp)
        else:
            super().do_GET()

    def do_POST(self):
        req_path = self.path.split('?', 1)[0]
        if req_path == '/api/save':
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
        elif req_path == '/api/backup/upload':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                
                if not isinstance(data, dict):
                    raise ValueError("El archivo no contiene un objeto JSON válido.")
                
                required_any = ["clients", "remitos", "todas_las_ots", "users", "ots_pendientes"]
                if not any(k in data for k in required_any):
                    raise ValueError("El archivo no parece ser una base de datos válida de FlexoERP.")

                # Automatic pre-restore rollback backup
                local_backups = os.path.join(base_dir, "backups")
                os.makedirs(local_backups, exist_ok=True)
                rollback_ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                rollback_file = os.path.join(local_backups, f"rollback_before_upload_{rollback_ts}.json")
                if os.path.exists(db_path):
                    with open(db_path, 'r', encoding='utf-8') as f_orig:
                        current_db = json.load(f_orig)
                    with open(rollback_file, 'w', encoding='utf-8') as f_rb:
                        json.dump(current_db, f_rb, indent=4, ensure_ascii=False)
                    print(f"Respaldo de seguridad previo creado en: {rollback_file}")

                success = save_db(data)
                if success:
                    counts = {
                        "clients": len(data.get("clients", [])),
                        "ots": len(data.get("todas_las_ots", {})) if isinstance(data.get("todas_las_ots"), dict) else len(data.get("todas_las_ots", [])),
                        "remitos": len(data.get("remitos", [])),
                        "proveedores": len(data.get("proveedores", []))
                    }
                    response = {
                        "status": "success",
                        "message": "Base de datos restaurada con éxito",
                        "counts": counts,
                        "rollback_file": os.path.basename(rollback_file)
                    }
                else:
                    response = {"status": "error", "message": "No se pudo escribir el archivo de base de datos en el disco."}
            except Exception as e:
                response = {"status": "error", "message": str(e)}

            response_bytes = json.dumps(response).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
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
