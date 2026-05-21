import os
import sys
import json
import webbrowser
import threading
from http.server import SimpleHTTPRequestHandler, HTTPServer

PORT = 8080

# Determine base directory
# If compiled, sys.executable is the path to the exe.
if getattr(sys, 'frozen', False):
    exe_dir = os.path.dirname(sys.executable)
else:
    exe_dir = os.path.dirname(os.path.abspath(__file__))

# Prefer E:\FlexoERP, fallback to exe_dir
base_dir = r"E:\FlexoERP"
if not os.path.exists(base_dir):
    try:
        os.makedirs(base_dir, exist_ok=True)
    except Exception:
        base_dir = exe_dir

db_path = os.path.join(base_dir, "database.json")
web_dir = os.path.join(base_dir, "web")

# Default seeding data
DEFAULT_DATA = {
    "users": [
        { "username": "superadmin", "password": "superadmin123", "name": "Super Admin", "role": "superadmin", "allowedModules": ["dashboard","clientes","ots","taller","logistica","usuarios"] },
        { "username": "admin",      "password": "123",           "name": "Administrador", "role": "admin",      "allowedModules": ["dashboard","clientes","ots","taller","logistica"] },
        { "username": "operador",   "password": "123",           "name": "Juan Perez",     "role": "operador",   "allowedModules": ["taller"] }
    ],
    "clients": [
        { "nombre": "Bodega Norton", "cuit": "30-12345678-9", "factura": "SI", "email": "compras@norton.com.ar", "telefono": "+54 9 261 444-1111", "domicilio": "Ruta 15 Km 23.5", "localidad": "Luján de Cuyo", "provincia": "Mendoza", "moneda": "Pesos", "saldo": 0 },
        { "nombre": "Catena Zapata", "cuit": "30-98765432-1", "factura": "SI", "email": "administracion@catenazapata.com.ar", "telefono": "+54 9 261 444-2222", "domicilio": "Cobos s/n", "localidad": "Agrelo", "provincia": "Mendoza", "moneda": "Pesos", "saldo": 0 },
        { "nombre": "Salentein", "cuit": "30-44556677-8", "factura": "SI", "email": "logistica@salentein.com", "telefono": "+54 9 261 555-9999", "domicilio": "Ruta 89 Km 14", "localidad": "Tunuyán", "provincia": "Mendoza", "moneda": "Pesos", "saldo": 0 }
    ],
    "remitos": [],
    "ultimo_remito": 8000,
    "ots_pendientes": [
        { "numero": 1042, "cliente": "Bodega Norton", "fechaAlta": "05/05/2026", "items": [
            { "varietal": "Malbec Reserva", "cantidad": "50000", "precio": "12", "colores": "4", "barniz": "SI", "fecha": "2026-06-01", "imagenB64": None, "status": "pendiente" },
            { "varietal": "Cabernet Sauvignon", "cantidad": "30000", "precio": "12", "colores": "4", "barniz": "NO", "fecha": "2026-06-01", "imagenB64": None, "status": "pendiente" }
        ]},
        { "numero": 1044, "cliente": "Salentein", "fechaAlta": "08/05/2026", "items": [
            { "varietal": "Chardonnay", "cantidad": "10000", "precio": "15", "colores": "3", "barniz": "NO", "fecha": "2026-06-15", "imagenB64": None, "status": "pendiente" }
        ]}
    ],
    "ots_logistica": [],
    "ultimo_numero_ot": 1044,
    "todas_las_ots": {
        "1042": { "numero": 1042, "cliente": "Bodega Norton", "fechaAlta": "05/05/2026", "items": [
            { "varietal": "Malbec Reserva", "cantidad": "50000", "precio": "12", "colores": "4", "barniz": "SI", "fecha": "2026-06-01", "imagenB64": None, "status": "pendiente" },
            { "varietal": "Cabernet Sauvignon", "cantidad": "30000", "precio": "12", "colores": "4", "barniz": "NO", "fecha": "2026-06-01", "imagenB64": None, "status": "pendiente" }
        ]},
        "1044": { "numero": 1044, "cliente": "Salentein", "fechaAlta": "08/05/2026", "items": [
            { "varietal": "Chardonnay", "cantidad": "10000", "precio": "15", "colores": "3", "barniz": "NO", "fecha": "2026-06-15", "imagenB64": None, "status": "pendiente" }
        ]}
    }
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

def main():
    os.makedirs(web_dir, exist_ok=True)
    load_db()
    
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, ERPRequestHandler)
    print(f"FlexoERP local server started on http://localhost:{PORT}")
    print(f"Web folder: {web_dir}")
    print(f"Database path: {db_path}")
    
    threading.Timer(1.0, open_browser).start()
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("Server shutting down.")
        httpd.server_close()

if __name__ == '__main__':
    main()
