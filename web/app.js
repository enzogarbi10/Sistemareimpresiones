document.addEventListener('DOMContentLoaded', () => {

    // ── AUTH ──────────────────────────────────────────────────
    let USERS = JSON.parse(localStorage.getItem('flexoERP_users')) || [
        { username: 'superadmin', password: 'superadmin123', name: 'Super Admin',    role: 'superadmin', allowedModules: ['dashboard','clientes','ots','taller','logistica','usuarios'] },
        { username: 'admin',      password: '123',           name: 'Administrador',  role: 'admin',      allowedModules: ['dashboard','clientes','ots','taller','logistica'] },
        { username: 'operador',   password: '123',           name: 'Juan Perez',     role: 'operador',   allowedModules: ['taller'] }
    ];
    localStorage.setItem('flexoERP_users', JSON.stringify(USERS));

    const loginScreen  = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    const loginForm    = document.getElementById('login-form');
    const loginError   = document.getElementById('login-error');
    const btnLogout    = document.getElementById('btn-logout');
    let currentUser    = JSON.parse(localStorage.getItem('flexoERP_user'));

    if (loginForm) {
        loginForm.addEventListener('submit', e => {
            e.preventDefault();
            const u    = document.getElementById('login-user').value;
            const p    = document.getElementById('login-pass').value;
            const user = USERS.find(x => x.username === u && x.password === p);
            if (user) {
                localStorage.setItem('flexoERP_user', JSON.stringify(user));
                currentUser = user;
                loginScreen.style.display  = 'none';
                appContainer.style.display = 'flex';
                applyRBAC(currentUser);
                loginError.style.display = 'none';
            } else {
                loginError.style.display = 'block';
            }
        });
    }

    if (btnLogout) btnLogout.addEventListener('click', () => { localStorage.removeItem('flexoERP_user'); window.location.reload(); });

    // ── NAV ───────────────────────────────────────────────────
    const navItems = document.querySelectorAll('.nav-item');
    const modules  = document.querySelectorAll('.module');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            modules.forEach(m => m.classList.remove('active'));
            item.classList.add('active');
            const t = document.getElementById(item.getAttribute('data-target'));
            if (t) t.classList.add('active');
        });
    });

    // ── SHARED OT STATE ───────────────────────────────────────
    const DEFAULT_CLIENTS = [
        { nombre: 'Bodega Norton', cuit: '30-12345678-9', factura: 'SI', email: 'compras@norton.com.ar', telefono: '+54 9 261 444-1111', domicilio: 'Ruta 15 Km 23.5', localidad: 'Luján de Cuyo', provincia: 'Mendoza', moneda: 'Pesos', saldo: 0 },
        { nombre: 'Catena Zapata', cuit: '30-98765432-1', factura: 'SI', email: 'administracion@catenazapata.com.ar', telefono: '+54 9 261 444-2222', domicilio: 'Cobos s/n', localidad: 'Agrelo', provincia: 'Mendoza', moneda: 'Pesos', saldo: 0 },
        { nombre: 'Salentein', cuit: '30-44556677-8', factura: 'SI', email: 'logistica@salentein.com', telefono: '+54 9 261 555-9999', domicilio: 'Ruta 89 Km 14', localidad: 'Tunuyán', provincia: 'Mendoza', moneda: 'Pesos', saldo: 0 }
    ];
    let CLIENTS = JSON.parse(localStorage.getItem('flexoERP_clients')) || DEFAULT_CLIENTS;
    // Only seed defaults if no saved data exists
    if (!localStorage.getItem('flexoERP_clients')) {
        localStorage.setItem('flexoERP_clients', JSON.stringify(CLIENTS));
    }

    let REMITOS = JSON.parse(localStorage.getItem('flexoERP_remitos')) || [];
    let ultimoRemitoNumero = parseInt(localStorage.getItem('flexoERP_ultimo_remito')) || 8000;

    let otsPendientes  = JSON.parse(localStorage.getItem('flexoERP_ots_pendientes')) || [
        { numero: 1042, cliente: 'Bodega Norton', fechaAlta: '05/05/2026', items: [
            { varietal: 'Malbec Reserva', cantidad: '50000', precio: '12', colores: '4', barniz: 'SI', fecha: '2026-06-01', imagenB64: null, status: 'pendiente' },
            { varietal: 'Cabernet Sauvignon', cantidad: '30000', precio: '12', colores: '4', barniz: 'NO', fecha: '2026-06-01', imagenB64: null, status: 'pendiente' }
        ]},
        { numero: 1044, cliente: 'Salentein', fechaAlta: '08/05/2026', items: [
            { varietal: 'Chardonnay', cantidad: '10000', precio: '15', colores: '3', barniz: 'NO', fecha: '2026-06-15', imagenB64: null, status: 'pendiente' }
        ]}
    ];
    let otsLogistica   = JSON.parse(localStorage.getItem('flexoERP_ots_logistica')) || [];
    let ultimoNumeroOt = parseInt(localStorage.getItem('flexoERP_ultimo_numero_ot')) || 1044;
    let todasLasOts    = JSON.parse(localStorage.getItem('flexoERP_todas_las_ots')) || {
        1042: otsPendientes.find(o => o.numero === 1042) || otsPendientes[0],
        1044: otsPendientes.find(o => o.numero === 1044) || otsPendientes[1]
    };

    async function saveToServer() {
        const payload = {
            users: USERS,
            clients: CLIENTS,
            remitos: REMITOS,
            ultimo_remito: ultimoRemitoNumero,
            ots_pendientes: otsPendientes,
            ots_logistica: otsLogistica,
            ultimo_numero_ot: ultimoNumeroOt,
            todas_las_ots: todasLasOts
        };
        
        // Always mirror to localStorage as local fallback
        localStorage.setItem('flexoERP_users', JSON.stringify(USERS));
        localStorage.setItem('flexoERP_clients', JSON.stringify(CLIENTS));
        localStorage.setItem('flexoERP_remitos', JSON.stringify(REMITOS));
        localStorage.setItem('flexoERP_ultimo_remito', ultimoRemitoNumero);
        localStorage.setItem('flexoERP_ots_pendientes', JSON.stringify(otsPendientes));
        localStorage.setItem('flexoERP_ots_logistica', JSON.stringify(otsLogistica));
        localStorage.setItem('flexoERP_todas_las_ots', JSON.stringify(todasLasOts));
        localStorage.setItem('flexoERP_ultimo_numero_ot', ultimoNumeroOt);

        try {
            await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.warn("Could not save to Python server, using LocalStorage fallback:", e);
        }
    }

    function saveClients() {
        saveToServer();
    }

    function saveRemitos() {
        saveToServer();
    }

    function saveOts() {
        saveToServer();
    }

    async function initApp() {
        try {
            const res = await fetch('/api/data');
            if (!res.ok) throw new Error('API response not OK');
            const data = await res.json();
            
            USERS = data.users || USERS;
            CLIENTS = data.clients || CLIENTS;
            REMITOS = data.remitos || REMITOS;
            ultimoRemitoNumero = data.ultimo_remito !== undefined ? data.ultimo_remito : ultimoRemitoNumero;
            otsPendientes = data.ots_pendientes || otsPendientes;
            otsLogistica = data.ots_logistica || otsLogistica;
            ultimoNumeroOt = data.ultimo_numero_ot !== undefined ? data.ultimo_numero_ot : ultimoNumeroOt;
            todasLasOts = data.todas_las_ots || todasLasOts;
            
            console.log("Data loaded successfully from Python server database.");
        } catch (e) {
            console.warn("Could not connect to Python server API, loading from LocalStorage:", e);
            // LocalStorage loading (fallback)
            USERS = JSON.parse(localStorage.getItem('flexoERP_users')) || USERS;
            CLIENTS = JSON.parse(localStorage.getItem('flexoERP_clients')) || CLIENTS;
            REMITOS = JSON.parse(localStorage.getItem('flexoERP_remitos')) || REMITOS;
            
            const savedLastRemito = localStorage.getItem('flexoERP_ultimo_remito');
            if (savedLastRemito) ultimoRemitoNumero = parseInt(savedLastRemito);
            
            otsPendientes = JSON.parse(localStorage.getItem('flexoERP_ots_pendientes')) || otsPendientes;
            otsLogistica = JSON.parse(localStorage.getItem('flexoERP_ots_logistica')) || otsLogistica;
            
            const savedLastOt = localStorage.getItem('flexoERP_ultimo_numero_ot');
            if (savedLastOt) ultimoNumeroOt = parseInt(savedLastOt);
            
            todasLasOts = JSON.parse(localStorage.getItem('flexoERP_todas_las_ots')) || todasLasOts;
        }
        
        // Refresh & render everything with loaded data
        refreshTallerSelector();
        renderClientes();
        populateClientesDropdown();
        renderDashboard();
        renderLogistica();
        renderHistorialRemitos();
        renderOts();
        renderUsuarios();
        
        if (currentUser) {
            loginScreen.style.display  = 'none';
            appContainer.style.display = 'flex';
            applyRBAC(currentUser);
        } else {
            loginScreen.style.display  = 'flex';
            appContainer.style.display = 'none';
        }
    }

    function renderClientes() {
        const tbody = document.getElementById('tbody-clientes');
        if (!tbody) return;
        tbody.innerHTML = '';
        const isPriv = currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin');
        CLIENTS.forEach(cli => {
            const tr = document.createElement('tr');
            const actionsHtml = isPriv ? `
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn btn-icon btn-editar-cliente" data-nombre="${cli.nombre}" style="color:var(--secondary);" title="Editar Cliente"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn btn-icon btn-eliminar-cliente" data-nombre="${cli.nombre}" style="color:var(--danger);" title="Eliminar Cliente"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            ` : `
                <span style="color:#6c757d; font-size:11.5px; font-style:italic;">Sin permisos</span>
            `;
            tr.innerHTML = `
                <td><strong>${cli.nombre}</strong><br><small style="color:#adb5bd;">${cli.email || cli.telefono} | ${cli.moneda}</small></td>
                <td>${cli.cuit}</td>
                <td>${cli.factura === 'SI' ? 'Con Factura' : 'Sin Factura'}</td>
                <td style="font-family:monospace; font-weight:700; color:var(--secondary); font-size:14px;">$ ${Number(cli.saldo).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td>${actionsHtml}</td>
            `;
            tbody.appendChild(tr);
        });

        // Event listeners para eliminar y editar clientes
        tbody.querySelectorAll('.btn-eliminar-cliente').forEach(btn => {
            btn.addEventListener('click', () => {
                const nombre = btn.getAttribute('data-nombre');
                if (confirm(`¿Está seguro de que desea eliminar a la bodega "${nombre}"?\nEsto no afectará los remitos históricos ya emitidos.`)) {
                    CLIENTS = CLIENTS.filter(c => c.nombre !== nombre);
                    saveClients();
                    renderClientes();
                    populateClientesDropdown();
                }
            });
        });

        tbody.querySelectorAll('.btn-editar-cliente').forEach(btn => {
            btn.addEventListener('click', () => {
                const nombre = btn.getAttribute('data-nombre');
                const cli = CLIENTS.find(c => c.nombre === nombre);
                if (!cli) return;

                clientEdicionNombre = nombre;
                formNuevoCliente.style.display = 'flex';
                document.getElementById('form-cliente-title').innerHTML = `<i class="fa-solid fa-pen-to-square" style="color:var(--secondary);"></i> Editar Bodega: ${nombre}`;
                document.getElementById('new-cli-nombre').value = cli.nombre;
                document.getElementById('new-cli-cuit').value = cli.cuit || '';
                document.getElementById('new-cli-domicilio').value = cli.domicilio || '';
                document.getElementById('new-cli-factura').value = cli.factura || 'SI';
                document.getElementById('new-cli-email').value = cli.email || '';
                document.getElementById('new-cli-telefono').value = cli.telefono || '';
                document.getElementById('new-cli-moneda').value = cli.moneda || 'Pesos';

                btnGuardarCliente.innerHTML = '<i class="fa-solid fa-save"></i> Guardar Cambios';
                formNuevoCliente.scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    function populateClientesDropdown() {
        const select = document.getElementById('new-ot-cliente');
        if (!select) return;
        select.innerHTML = '<option value="">Seleccione un cliente...</option>';
        CLIENTS.forEach(cli => {
            const opt = document.createElement('option');
            opt.value = cli.nombre;
            opt.textContent = cli.nombre;
            select.appendChild(opt);
        });
    }

    function showEmailToast(email, num) {
        const toast = document.createElement('div');
        toast.className = 'email-toast';
        toast.innerHTML = `
            <div style="font-size: 1.5rem; color: var(--success);"><i class="fa-solid fa-paper-plane"></i></div>
            <div>
                <strong style="color:var(--success);">¡Duplicado de Remito Enviado!</strong>
                <p style="margin: 3px 0 0; font-size: 11.5px; color: #ced4da;">Se envió el duplicado del Remito <strong>R-${num}</strong> a <strong>${email}</strong>.</p>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }
    
    function showEmailToastBulk(count, emails) {
        const toast = document.createElement('div');
        toast.className = 'email-toast';
        toast.innerHTML = `
            <div style="font-size: 1.5rem; color: var(--success);"><i class="fa-solid fa-truck-ramp-box"></i></div>
            <div>
                <strong style="color:var(--success);">¡Despacho Masivo Procesado!</strong>
                <p style="margin: 3px 0 0; font-size: 11.5px; color: #ced4da;">Se generaron <strong>${count} remitos</strong> de forma automática.<br>Correos duplicados enviados a: <strong>${emails}</strong>.</p>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 6000);
    }

    function renderDashboard() {
        const dashIngresos = document.getElementById('dash-ingresos');
        const dashCostos = document.getElementById('dash-costos');
        const dashRentabilidad = document.getElementById('dash-rentabilidad');
        const tbodyRentabilidad = document.getElementById('tbody-rentabilidad');

        let totalIngresos = 0;
        REMITOS.forEach(r => {
            totalIngresos += parseFloat(r.total) || 0;
        });

        let totalCostos = totalIngresos * 0.55;
        let totalRentabilidadNetaPercent = totalIngresos > 0 ? ((totalIngresos - totalCostos) / totalIngresos) * 100 : 0;

        if (dashIngresos) {
            dashIngresos.innerText = `$ ${totalIngresos.toLocaleString('es-AR', {minimumFractionDigits: 0})}`;
        }
        if (dashCostos) {
            dashCostos.innerText = `$ ${totalCostos.toLocaleString('es-AR', {minimumFractionDigits: 0})}`;
        }
        if (dashRentabilidad) {
            dashRentabilidad.innerText = `${totalRentabilidadNetaPercent.toFixed(1)}%`;
        }

        if (tbodyRentabilidad) {
            tbodyRentabilidad.innerHTML = '';
            
            const clientStats = {};
            CLIENTS.forEach(c => {
                clientStats[c.nombre] = { remitosCount: 0, ingresos: 0, costos: 0 };
            });

            REMITOS.forEach(r => {
                if (!clientStats[r.cliente]) {
                    clientStats[r.cliente] = { remitosCount: 0, ingresos: 0, costos: 0 };
                }
                const ing = parseFloat(r.total) || 0;
                clientStats[r.cliente].remitosCount++;
                clientStats[r.cliente].ingresos += ing;
                clientStats[r.cliente].costos += ing * 0.55;
            });

            const sortedClients = Object.keys(clientStats)
                .map(name => ({ name, ...clientStats[name] }))
                .filter(c => c.ingresos > 0)
                .sort((a, b) => b.ingresos - a.ingresos);

            if (sortedClients.length === 0) {
                tbodyRentabilidad.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No se registran remitos emitidos.</td></tr>`;
            } else {
                sortedClients.forEach(c => {
                    const margin = c.ingresos > 0 ? ((c.ingresos - c.costos) / c.ingresos) * 100 : 0;
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${c.name}</strong></td>
                        <td>${c.remitosCount}</td>
                        <td style="font-family:monospace; color:#00f5d4;">$ ${c.ingresos.toLocaleString('es-AR', {minimumFractionDigits: 0})}</td>
                        <td style="font-family:monospace; color:var(--danger);">$ ${c.costos.toLocaleString('es-AR', {minimumFractionDigits: 0})}</td>
                        <td><span class="badge ${margin >= 45 ? 'success' : 'warning'}">${margin.toFixed(0)}%</span></td>
                    `;
                    tbodyRentabilidad.appendChild(tr);
                });
            }
        }
    }



    function refreshTallerSelector() {
        const sel = document.getElementById('ot-selector-taller');
        if (!sel) return;
        const prev = sel.value;
        sel.innerHTML = '<option value="">-- Sin OT seleccionada --</option>';
        otsPendientes.forEach(ot => {
            const opt = document.createElement('option');
            opt.value       = ot.numero;
            opt.textContent = `OT #${ot.numero} - ${ot.cliente}`;
            sel.appendChild(opt);
        });
        if (prev && otsPendientes.find(o => String(o.numero) === String(prev))) sel.value = prev;
    }

    // Los componentes se inicializan tras cargar los datos en initApp()

    function addToLogistica(ot, tipo, tiempoProd, tiempoImprod) {
        const now = new Date().toLocaleString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
        otsLogistica.push({ ...ot, tipo, tiempoProd, tiempoImprod, fechaFin: now });
        saveOts();
        renderLogistica();
    }

    function renderLogistica() {
        const tbody = document.getElementById('tbody-logistica');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!otsLogistica.length) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#adb5bd;padding:2rem;">No hay órdenes finalizadas aún.</td></tr>';
            return;
        }
        otsLogistica.forEach(ot => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${ot.numero}</td>
                <td>${ot.cliente}</td>
                <td>${ot.fechaAlta}</td>
                <td>${ot.fechaFin}</td>
                <td><span class="badge ${ot.tipo === 'completo' ? 'success' : 'warning'}">${ot.tipo === 'completo' ? 'Completo' : 'Parcial'}</span></td>
                <td>${ot.tiempoProd}</td>
                <td>${ot.tiempoImprod}</td>
                <td><button class="btn btn-icon btn-despacho-ot" data-numero="${ot.numero}" style="color:var(--secondary);" title="Despachar y Generar Remito"><i class="fa-solid fa-truck"></i></button></td>`;
            tbody.appendChild(tr);
        });
    }

    function renderOts() {
        const tbody = document.querySelector('#tabla-ots tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!otsPendientes.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#adb5bd;padding:2rem;">No hay órdenes de trabajo activas.</td></tr>';
            return;
        }
        otsPendientes.forEach(ot => {
            const resumen = ot.items.map(i => `${i.tipo ? i.tipo + ' ' : ''}${i.marca ? i.marca + ' ' : ''}${i.varietal} (${Number(i.cantidad).toLocaleString()}u)`).join(', ');
            const algunProcesado = ot.items.some(i => i.status === 'finalizado' || i.status === 'parcial');
            const estadoBadge = algunProcesado 
                ? '<span class="badge warning">En Producción</span>' 
                : '<span class="badge neutral">Pendiente</span>';
            const tr = document.createElement('tr');
            const isPriv = currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin');
            const actionsHtml = isPriv
                ? `<button class="btn btn-icon btn-ver-ot" data-numero="${ot.numero}" style="color:var(--primary);" title="Ver Detalle"><i class="fa-solid fa-eye"></i></button>
                   <button class="btn btn-icon btn-editar-ot" data-numero="${ot.numero}" style="color:var(--secondary);" title="Editar Orden"><i class="fa-solid fa-pen-to-square"></i></button>
                   <button class="btn btn-icon btn-eliminar-ot" data-numero="${ot.numero}" style="color:var(--danger);" title="Eliminar Orden"><i class="fa-solid fa-trash-can"></i></button>
                   <button class="btn btn-icon" style="color:#ff4d6d;" onclick="imprimirPDF(${ot.otEdicionNumero || ot.numero})" title="Descargar PDF"><i class="fa-solid fa-file-pdf"></i></button>`
                : `<button class="btn btn-icon btn-ver-ot" data-numero="${ot.numero}" style="color:var(--primary);" title="Ver Detalle"><i class="fa-solid fa-eye"></i></button>
                   <button class="btn btn-icon" style="color:#ff4d6d;" onclick="imprimirPDF(${ot.otEdicionNumero || ot.numero})" title="Descargar PDF"><i class="fa-solid fa-file-pdf"></i></button>`;

            tr.innerHTML = `
                <td>${ot.numero}</td>
                <td>${ot.fechaAlta}</td>
                <td>${ot.cliente}</td>
                <td><small>${resumen}</small></td>
                <td>${estadoBadge}</td>
                <td>${actionsHtml}</td>`;
            tbody.appendChild(tr);
        });

        // Note: Event listeners for delete, edit, and view details are handled via event delegation on the table.
    }

    // Las vistas se inicializan en initApp()

    // ── PDF ───────────────────────────────────────────────────
    window.imprimirPDF = function(numero) {
        const ot = todasLasOts[numero];
        if (!ot) return;
        const div = document.createElement('div');
        div.style.cssText = 'background:#fff;color:#000;';
        div.innerHTML = `
            <div style="font-family:'Outfit', Arial, sans-serif; color:#1a1921; max-width:800px; margin:0 auto; padding:20px;">
                <!-- Header -->
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #9d4edd; padding-bottom:15px; margin-bottom:20px;">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <img src="mlf_logo.png" style="max-height:60px; width:auto;" alt="Logo">
                        <div>
                            <h1 style="margin:0; font-size:24px; color:#9d4edd; font-weight:800;">MLF Soluciones Gráficas</h1>
                            <p style="margin:2px 0 0; font-size:12px; color:#666;">Sistema FlexoERP</p>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <h2 style="margin:0; font-size:20px; color:#111; font-weight:700;">ORDEN DE TRABAJO</h2>
                        <p style="margin:5px 0 0; font-size:14px; font-weight:bold; color:#9d4edd; font-family:monospace;">OT #${numero}</p>
                    </div>
                </div>
                
                <!-- Info Card -->
                <div style="border:1px solid #e2e8f0; border-radius:8px; padding:15px; margin-bottom:20px; background:#f8fafc; display:flex; justify-content:space-between;">
                    <div>
                        <p style="margin:0; font-size:11px; color:#64748b; text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">Cliente / Bodega</p>
                        <p style="margin:5px 0 0; font-size:15px; font-weight:bold; color:#0f172a;">${ot.cliente}</p>
                    </div>
                    <div style="text-align:right;">
                        <p style="margin:0; font-size:11px; color:#64748b; text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">Fecha de Alta</p>
                        <p style="margin:5px 0 0; font-size:15px; font-weight:bold; color:#0f172a;">${ot.fechaAlta}</p>
                    </div>
                </div>
                
                <!-- Items Section -->
                <h3 style="color:#1e293b; border-bottom:1px solid #cbd5e1; padding-bottom:8px; margin-bottom:15px; font-size:15px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Detalle de Ítems</h3>
                
                ${ot.items.map((i, index) => `
                    <div style="border:1px solid #cbd5e1; border-radius:10px; padding:20px; margin-bottom:20px; background:#fff; page-break-inside:avoid;">
                        <div style="display:flex; justify-content:space-between; gap:20px;">
                            <!-- Left: item details -->
                            <div style="flex:1.2;">
                                <h4 style="margin:0 0 12px; color:#9d4edd; font-size:16px; font-weight:700;">${index + 1}. ${i.tipo ? i.tipo + ' - ' : ''}${i.marca ? i.marca + ' ' : ''}${i.varietal}</h4>
                                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                                    <tr style="border-bottom:1px solid #f1f5f9;">
                                        <td style="padding:6px 0; color:#64748b; font-weight:500;">Cantidad:</td>
                                        <td style="padding:6px 0; font-weight:600; text-align:right;">${Number(i.cantidad).toLocaleString('es-AR')} u</td>
                                    </tr>
                                    <tr style="border-bottom:1px solid #f1f5f9;">
                                        <td style="padding:6px 0; color:#64748b; font-weight:500;">Colores:</td>
                                        <td style="padding:6px 0; font-weight:600; text-align:right;">${i.colores}</td>
                                    </tr>
                                    <tr style="border-bottom:1px solid #f1f5f9;">
                                        <td style="padding:6px 0; color:#64748b; font-weight:500;">Barnizado:</td>
                                        <td style="padding:6px 0; font-weight:600; text-align:right;">${i.barniz === 'SI' ? 'Sí' : 'No'}</td>
                                    </tr>
                                    <tr style="border-bottom:1px solid #f1f5f9;">
                                        <td style="padding:6px 0; color:#64748b; font-weight:500;">Fecha Entrega:</td>
                                        <td style="padding:6px 0; font-weight:600; text-align:right; color:#e11d48;">${i.fecha}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Right: image/artwork -->
                            <div style="flex:0.8; display:flex; flex-direction:column; align-items:center; justify-content:center; border:1px solid #e2e8f0; border-radius:8px; padding:10px; background:#fafafa; min-height:150px; text-align:center;">
                                ${i.imagenB64 ? `
                                    <p style="margin:0 0 8px; font-size:10px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Arte Cargado</p>
                                    <img src="${i.imagenB64}" style="max-width:100%; max-height:130px; object-fit:contain; border-radius:4px; box-shadow:0 2px 8px rgba(0,0,0,0.1);"/>
                                ` : `
                                    <div style="width: 50px; height: 50px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; margin-bottom: 5px;">
                                        <span style="font-size: 20px; color: #94a3b8;">🖼️</span>
                                    </div>
                                    <p style="margin:0; font-size:11px; color:#94a3b8;">Sin Imagen Cargada</p>
                                `}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        const opt = {
            margin:       10,
            filename:     `OT_${numero}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true, 
                logging: false
            },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        html2pdf().set(opt).from(div).save();
    };

    // ── OTs MODULE ────────────────────────────────────────────
    const btnNuevaOt    = document.getElementById('btn-nueva-ot');
    const formNuevaOt   = document.getElementById('form-nueva-ot');
    const btnGuardarOt  = document.getElementById('btn-guardar-ot');
    const btnCancelarOt = document.getElementById('btn-cancelar-ot');
    const tablaOts      = document.querySelector('#tabla-ots tbody');
    const btnAgregarItem        = document.getElementById('btn-agregar-item');
    const tablaItemsOt          = document.querySelector('#tabla-items-ot tbody');
    const listaItemsContainer   = document.getElementById('lista-items-container');
    let itemsActuales = [];
    let otEdicionNumero = null;

    function renderItemsOtForm() {
        const tbody = document.querySelector('#tabla-items-ot tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!itemsActuales.length) {
            listaItemsContainer.style.display = 'none';
            return;
        }
        listaItemsContainer.style.display = 'block';
        itemsActuales.forEach((item, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${item.tipo ? item.tipo + ' - ' : ''}${item.marca ? item.marca + ' ' : ''}${item.varietal}</strong></td>
                <td>${Number(item.cantidad).toLocaleString()} u</td>
                <td>$${item.precio}</td>
                <td>${item.colores} col</td>
                <td>${item.barniz === 'SI' ? 'Sí' : 'No'}</td>
                <td>${item.fecha}</td>
                <td>
                    <button class="btn btn-icon-small btn-eliminar-item-form" data-index="${idx}" style="color:var(--danger); background:transparent; border:none; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.btn-eliminar-item-form').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const idx = parseInt(btn.getAttribute('data-index'));
                itemsActuales.splice(idx, 1);
                renderItemsOtForm();
            });
        });
    }

    const selHerramentales = document.getElementById('new-ot-herramentales');
    const groupHerrDetalles = document.getElementById('group-herr-detalles');
    if (selHerramentales && groupHerrDetalles) {
        selHerramentales.addEventListener('change', (e) => {
            if (e.target.value === 'SI') {
                groupHerrDetalles.style.display = 'flex';
            } else {
                groupHerrDetalles.style.display = 'none';
            }
        });
    }

    if (btnNuevaOt) {
        btnNuevaOt.addEventListener('click', () => {
            formNuevaOt.style.display = 'block';
            formNuevaOt.querySelector('h3').innerHTML = 'Crear Nueva Orden de Trabajo';
            btnGuardarOt.innerHTML = '<i class="fa-solid fa-save"></i> Generar OT Definitiva';
            otEdicionNumero = null;
            itemsActuales = [];
            if (tablaItemsOt) tablaItemsOt.innerHTML = '';
            if (listaItemsContainer) listaItemsContainer.style.display = 'none';
            document.getElementById('new-ot-cliente').value = '';
            if (selHerramentales) selHerramentales.value = 'NO';
            if (groupHerrDetalles) groupHerrDetalles.style.display = 'none';
            if (document.getElementById('new-ot-herr-cantidad')) document.getElementById('new-ot-herr-cantidad').value = '';
            if (document.getElementById('new-ot-herr-importe')) document.getElementById('new-ot-herr-importe').value = '';
        });
        btnCancelarOt.addEventListener('click', () => {
            formNuevaOt.style.display = 'none';
            otEdicionNumero = null;
            itemsActuales = [];
            renderItemsOtForm();
        });

        function convertPdfToImage(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async function() {
                    try {
                        const arrayBuffer = this.result;
                        if (!window.pdfjsLib) {
                            return reject(new Error('La librería PDF.js no está cargada en la página.'));
                        }
                        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
                        const pdf = await loadingTask.promise;
                        const page = await pdf.getPage(1);
                        
                        // Render at scale 2.0 for higher clarity in generated PDFs and previews
                        const scale = 2.0;
                        const viewport = page.getViewport({ scale: scale });
                        
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        
                        const renderContext = {
                            canvasContext: context,
                            viewport: viewport
                        };
                        await page.render(renderContext).promise;
                        
                        const base64Image = canvas.toDataURL('image/png');
                        resolve(base64Image);
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = function(err) {
                    reject(err);
                };
                reader.readAsArrayBuffer(file);
            });
        }

        btnAgregarItem.addEventListener('click', async () => {
            const tipo      = document.getElementById('new-item-tipo') ? document.getElementById('new-item-tipo').value : '';
            const marca     = document.getElementById('new-item-marca') ? document.getElementById('new-item-marca').value : '';
            const varietal  = document.getElementById('new-item-varietal').value;
            const cantidad  = document.getElementById('new-item-cantidad').value;
            const precio    = document.getElementById('new-item-precio').value || '0';
            const colores   = document.getElementById('new-item-colores').value;
            const barniz    = document.getElementById('new-item-barniz').value;
            const fecha     = document.getElementById('new-item-fecha').value;
            const imgInput  = document.getElementById('new-item-img');
            if (!varietal || !cantidad || !fecha) { alert('Varietal, cantidad y fecha son obligatorios'); return; }
            
            let imagenB64 = null;
            if (imgInput.files && imgInput.files[0]) {
                const file = imgInput.files[0];
                const originalBtnHtml = btnAgregarItem.innerHTML;
                btnAgregarItem.disabled = true;
                btnAgregarItem.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Procesando archivo...';
                
                try {
                    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                        imagenB64 = await convertPdfToImage(file);
                    } else {
                        imagenB64 = await new Promise(res => { 
                            const r = new FileReader(); 
                            r.onloadend = () => res(r.result); 
                            r.readAsDataURL(file); 
                        });
                    }
                } catch (error) {
                    console.error('Error al procesar el archivo:', error);
                    alert('Error al procesar el archivo. Si es un PDF, asegúrese de que no esté dañado ni protegido.');
                } finally {
                    btnAgregarItem.disabled = false;
                    btnAgregarItem.innerHTML = originalBtnHtml;
                }
            }
            
            itemsActuales.push({ tipo, marca, varietal, cantidad, precio, colores, barniz, fecha, imagenB64, status: 'pendiente' });
            renderItemsOtForm();
            if (document.getElementById('new-item-tipo')) document.getElementById('new-item-tipo').value = 'Etiqueta';
            ['new-item-marca','new-item-varietal','new-item-cantidad','new-item-precio','new-item-fecha'].forEach(id => document.getElementById(id).value = '');
            document.getElementById('new-item-img').value = '';
        });

        btnGuardarOt.addEventListener('click', () => {
            const cliente = document.getElementById('new-ot-cliente').value;
            if (!cliente) { alert('Seleccione un cliente'); return; }
            if (!itemsActuales.length) { alert('Agregue al menos un ítem'); return; }

            const herramentalesVal = document.getElementById('new-ot-herramentales').value;
            let herramentales = null;
            if (herramentalesVal === 'SI') {
                herramentales = {
                    cantidad: document.getElementById('new-ot-herr-cantidad').value || 1,
                    importe: document.getElementById('new-ot-herr-importe').value || 0
                };
            }

            if (otEdicionNumero !== null) {
                // Modo Edición
                const num = otEdicionNumero;
                const ot = otsPendientes.find(o => o.numero === num);
                if (ot) {
                    ot.cliente = cliente;
                    ot.herramentales = herramentales;
                    ot.items = [...itemsActuales];
                }
                if (todasLasOts[num]) {
                    todasLasOts[num].cliente = cliente;
                    todasLasOts[num].herramentales = herramentales;
                    todasLasOts[num].items = [...itemsActuales];
                }
                otEdicionNumero = null;
            } else {
                // Modo Creación
                ultimoNumeroOt++;
                const num       = ultimoNumeroOt;
                const fechaAlta = new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
                todasLasOts[num] = { numero: num, cliente, fechaAlta, herramentales, items: [...itemsActuales] };
                otsPendientes.push({ numero: num, cliente, fechaAlta, herramentales, items: [...itemsActuales] });
            }

            saveOts();
            refreshTallerSelector();
            renderOts();
            formNuevaOt.style.display = 'none';
            itemsActuales = [];
        });
    }

    // ── CLIENTES MODULE ───────────────────────────────────────
    let clientEdicionNombre = null;
    const btnNuevoCliente    = document.getElementById('btn-nuevo-cliente');
    const formNuevoCliente   = document.getElementById('form-nuevo-cliente');
    const btnGuardarCliente  = document.getElementById('btn-guardar-cliente');
    const btnCancelarCliente = document.getElementById('btn-cancelar-cliente');

    if (btnNuevoCliente) {
        btnNuevoCliente.addEventListener('click', () => { formNuevoCliente.style.display = 'flex'; });
        btnCancelarCliente.addEventListener('click', () => {
            formNuevoCliente.style.display = 'none';
            clientEdicionNombre = null;
            ['new-cli-nombre','new-cli-cuit','new-cli-domicilio','new-cli-email','new-cli-telefono'].forEach(id => document.getElementById(id).value = '');
            document.getElementById('form-cliente-title').innerHTML = 'Registrar Nueva Bodega';
            btnGuardarCliente.innerHTML = '<i class="fa-solid fa-save"></i> Guardar Cliente';
        });
        btnGuardarCliente.addEventListener('click', () => {
            const nombre  = document.getElementById('new-cli-nombre').value.trim();
            const cuit    = document.getElementById('new-cli-cuit').value.trim() || 'Sin CUIT';
            const factura = document.getElementById('new-cli-factura').value;
            const email   = document.getElementById('new-cli-email').value.trim();
            const tel     = document.getElementById('new-cli-telefono').value.trim();
            const moneda  = document.getElementById('new-cli-moneda').value;
            const domicilio = document.getElementById('new-cli-domicilio').value.trim() || 'Domicilio no registrado';
            
            if (!nombre) { alert('Ingrese la razón social'); return; }
            
            if (clientEdicionNombre !== null) {
                // Modo Edición
                const cli = CLIENTS.find(c => c.nombre === clientEdicionNombre);
                if (cli) {
                    if (clientEdicionNombre.toLowerCase() !== nombre.toLowerCase() && CLIENTS.some(c => c.nombre.toLowerCase() === nombre.toLowerCase())) {
                        alert('Ya existe una bodega registrada con ese nombre.');
                        return;
                    }
                    // Cascada de actualización del nombre de la bodega en las OTs de logística, pendientes e historial
                    if (clientEdicionNombre !== nombre) {
                        otsPendientes.forEach(ot => {
                            if (ot.cliente === clientEdicionNombre) ot.cliente = nombre;
                        });
                        otsLogistica.forEach(ot => {
                            if (ot.cliente === clientEdicionNombre) ot.cliente = nombre;
                        });
                        Object.keys(todasLasOts).forEach(k => {
                            if (todasLasOts[k].cliente === clientEdicionNombre) todasLasOts[k].cliente = nombre;
                        });
                        REMITOS.forEach(r => {
                            if (r.cliente === clientEdicionNombre) r.cliente = nombre;
                        });
                    }
                    cli.nombre = nombre;
                    cli.cuit = cuit;
                    cli.factura = factura;
                    cli.email = email;
                    cli.telefono = tel;
                    cli.domicilio = domicilio;
                    cli.moneda = moneda;
                }
                clientEdicionNombre = null;
            } else {
                // Modo Creación
                if (CLIENTS.some(c => c.nombre.toLowerCase() === nombre.toLowerCase())) {
                    alert('Ya existe una bodega registrada con ese nombre.');
                    return;
                }

                CLIENTS.push({
                    nombre,
                    cuit,
                    factura,
                    email,
                    telefono: tel,
                    domicilio,
                    localidad: 'Luján de Cuyo',
                    provincia: 'Mendoza',
                    moneda,
                    saldo: 0
                });
            }
            
            saveClients();
            renderClientes();
            populateClientesDropdown();
            
            formNuevoCliente.style.display = 'none';
            ['new-cli-nombre','new-cli-cuit','new-cli-domicilio','new-cli-email','new-cli-telefono'].forEach(id => document.getElementById(id).value = '');
            document.getElementById('form-cliente-title').innerHTML = 'Registrar Nueva Bodega';
            btnGuardarCliente.innerHTML = '<i class="fa-solid fa-save"></i> Guardar Cliente';
        });
    }

    // ── TERMINAL / TALLER ─────────────────────────────────────
    const otSelectorTaller    = document.getElementById('ot-selector-taller');
    const btnIniciar          = document.getElementById('btn-iniciar-impresion');
    const btnFinalizar        = document.getElementById('btn-finalizar-impresion');
    const btnImproductiva     = document.getElementById('btn-improductiva');
    const luzRoja             = document.getElementById('luz-roja');
    const luzAmarilla         = document.getElementById('luz-amarilla');
    const luzVerde            = document.getElementById('luz-verde');
    const contPrep            = document.getElementById('contador-prep');
    const contProd            = document.getElementById('contador-prod');
    const contImprod          = document.getElementById('contador-improd');
    const tiempoBadge         = document.getElementById('tiempo-total-badge');
    const tbodyEventos        = document.getElementById('tbody-eventos');
    const tbodyImprod         = document.getElementById('tbody-improd');
    const totalImprodDisplay  = document.getElementById('total-improd-display');
    const detalleOtContainer  = document.getElementById('detalle-ot-container');
    const otResumenTerminal   = document.getElementById('ot-resumen-terminal');

    // Timers (seconds)
    let segsPrep = 0, segsProd = 0, segsImprod = 0, segsImprodActual = 0;
    let timerPrep = null, timerProd = null, timerImprod = null;
    // States: idle | preparacion | produccion | improductiva | parcial
    let estadoTerminal = 'idle';
    let otActual = null;
    let itemActivo = null;
    let itemActivoIndex = null;
    let inicioImprodActual = null;

    function fmt(s) {
        const h = String(Math.floor(s/3600)).padStart(2,'0');
        const m = String(Math.floor((s%3600)/60)).padStart(2,'0');
        const sc = String(s%60).padStart(2,'0');
        return `${h}:${m}:${sc}`;
    }

    function setSemaforo(color) {
        luzRoja.classList.remove('activa');
        luzAmarilla.classList.remove('activa');
        luzVerde.classList.remove('activa');
        if (color === 'red')    luzRoja.classList.add('activa');
        if (color === 'yellow') luzAmarilla.classList.add('activa');
        if (color === 'green')  luzVerde.classList.add('activa');
    }

    function addEvento(estado, motivo) {
        const now = new Date();
        const fecha = now.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'2-digit'});
        const hora  = now.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
        const maq   = currentUser ? currentUser.name.toUpperCase() : 'SISTEMA';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${fecha}</td><td>${hora}</td><td>${estado}</td><td>${motivo||''}</td><td>${maq}</td>`;
        tbodyEventos.prepend(tr);
    }

    function stopAllTimers() {
        clearInterval(timerPrep);
        clearInterval(timerProd);
        clearInterval(timerImprod);
        timerPrep = timerProd = timerImprod = null;
    }

    function updateTotalBadge() {
        tiempoBadge.textContent = fmt(segsPrep + segsProd + segsImprod);
    }

    function renderDetalleOt() {
        if (!otActual) return;
        let html = `<table class="terminal-table"><thead><tr><th>Estado</th><th>Elemento</th><th>Varietal</th><th class="num-col">Cantidad</th><th>Colores</th><th>Barniz</th><th>Entrega</th></tr></thead><tbody>`;
        otActual.items.forEach((item, idx) => {
            const statusClass = item.status === 'finalizado' ? 'indicator-finalizado' : (item.status === 'parcial' ? 'indicator-parcial' : 'indicator-pendiente');
            const statusLabel = item.status === 'finalizado' ? 'Final' : (item.status === 'parcial' ? 'Parcial' : 'Pendiente');
            const isActive = itemActivoIndex === idx ? 'active-row-item' : '';
            html += `<tr class="clickable-row ${isActive}" data-index="${idx}">
                <td><span class="status-badge-dot ${statusClass}">${statusLabel}</span></td>
                <td>${(item.tipo || 'ETIQUETA').toUpperCase()}</td>
                <td><strong>${item.tipo ? item.tipo + ' - ' : ''}${item.marca ? item.marca + ' ' : ''}${item.varietal}</strong></td>
                <td class="num-col">${Number(item.cantidad).toLocaleString()}</td>
                <td>${item.colores} col</td>
                <td>${item.barniz==='SI'?'Sí':'No'}</td>
                <td>${item.fecha}</td>
            </tr>`;
        });
        html += `</tbody></table>`;
        detalleOtContainer.innerHTML = html;

        // Agregar clicks a las filas
        const rows = detalleOtContainer.querySelectorAll('.clickable-row');
        rows.forEach(row => {
            row.addEventListener('click', () => {
                const idx = parseInt(row.getAttribute('data-index'));
                selectItemTaller(idx);
            });
        });
    }

    function selectItemTaller(idx) {
        if (estadoTerminal === 'produccion' || estadoTerminal === 'improductiva') {
            alert('Debe pausar o finalizar la impresión actual antes de cambiar de ítem.');
            return;
        }
        itemActivoIndex = idx;
        itemActivo = otActual.items[idx];
        renderDetalleOt();

        // Limpiar timers para el nuevo ítem
        stopAllTimers();
        segsPrep = segsProd = segsImprod = segsImprodActual = 0;
        contPrep.textContent = contProd.textContent = contImprod.textContent = '00:00:00';
        tiempoBadge.textContent = '00:00:00';

        // Renderizar Arte y Ficha
        const artContainer = document.getElementById('arte-item-container');
        if (artContainer) {
            let artHtml = `<div style="width:100%; display:flex; flex-direction:column; gap:0.6rem; align-items:center;">
                <div style="font-size:12.5px; text-align:left; width:100%; background:rgba(0,0,0,0.3); padding:0.6rem; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
                    <p style="margin:0 0 2px; color:var(--secondary); font-weight:700; font-size:13px;">${itemActivo.marca ? itemActivo.marca.toUpperCase() + ' ' : ''}${itemActivo.varietal.toUpperCase()}</p>
                    <p style="margin:2px 0; color:#fff;">Cant. Requerida: <strong style="color:#00f5d4;">${Number(itemActivo.cantidad).toLocaleString()} u.</strong></p>
                    <p style="margin:2px 0; color:#adb5bd; font-size:11px;">Detalle: ${itemActivo.colores} colores · ${itemActivo.barniz==='SI'?'Con Barniz':'Sin Barniz'}</p>
                </div>`;
            if (itemActivo.imagenB64) {
                artHtml += `<div style="margin-top:0.3rem;"><img src="${itemActivo.imagenB64}" class="arte-preview-img" alt="Arte del varietal"></div>`;
            } else {
                artHtml += `<div style="border:1px dashed rgba(255,255,255,0.12); border-radius:8px; width:100%; padding:1.2rem; background:rgba(0,0,0,0.15); margin-top:0.3rem;">
                    <i class="fa-regular fa-image" style="font-size:1.8rem; color:#6c757d; margin-bottom:0.4rem;"></i>
                    <p style="color:#6c757d; font-size:11.5px; margin:0; font-style:italic;">No se adjuntó archivo de arte para este ítem</p>
                </div>`;
            }
            artHtml += `</div>`;
            artContainer.innerHTML = artHtml;
        }

        // Configurar botones e iniciar Prep Timer
        if (itemActivo.status === 'finalizado') {
            btnIniciar.disabled = true;
            btnFinalizar.disabled = true;
            btnImproductiva.disabled = true;
            btnIniciar.innerHTML = '<i class="fa-solid fa-check-double"></i> Finalizado';
            setSemaforo('yellow');
            addEvento('ÍTEM FINALIZADO', `${itemActivo.marca ? itemActivo.marca + ' ' : ''}${itemActivo.varietal}`);
        } else {
            btnIniciar.disabled = false;
            btnFinalizar.disabled = true;
            btnImproductiva.disabled = true;
            estadoTerminal = 'preparacion';
            if (itemActivo.status === 'parcial') {
                btnIniciar.innerHTML = '<i class="fa-solid fa-play"></i> Retomar';
                setSemaforo('yellow');
                addEvento('RETOME PARCIAL', `${itemActivo.marca ? itemActivo.marca + ' ' : ''}${itemActivo.varietal}`);
            } else {
                btnIniciar.innerHTML = '<i class="fa-solid fa-play"></i> Iniciar';
                setSemaforo('red');
                addEvento('PREPARACIÓN', `${itemActivo.marca ? itemActivo.marca + ' ' : ''}${itemActivo.varietal}`);
            }
            timerPrep = setInterval(() => { segsPrep++; contPrep.textContent = fmt(segsPrep); updateTotalBadge(); }, 1000);
        }
    }

    function resetTerminal() {
        stopAllTimers();
        segsPrep = segsProd = segsImprod = segsImprodActual = 0;
        contPrep.textContent = contProd.textContent = contImprod.textContent = '00:00:00';
        tiempoBadge.textContent = '00:00:00';
        totalImprodDisplay.textContent = '00:00:00';
        tbodyEventos.innerHTML = '';
        tbodyImprod.innerHTML = '';
        setSemaforo('red');
        estadoTerminal = 'idle';
        otActual = null;
        itemActivo = null;
        itemActivoIndex = null;
        btnIniciar.disabled   = true;
        btnFinalizar.disabled = true;
        btnImproductiva.disabled = true;
        btnIniciar.innerHTML  = '<i class="fa-solid fa-play"></i> Iniciar';
        detalleOtContainer.innerHTML = '<p style="color:#adb5bd;padding:1.5rem;text-align:center;font-size:13px;">Seleccione una OT del selector para ver el detalle</p>';
        otResumenTerminal.innerHTML  = '<p style="color:#adb5bd;text-align:center;font-size:12px;margin:0;">Sin OT activa</p>';
        const artContainer = document.getElementById('arte-item-container');
        if (artContainer) {
            artContainer.innerHTML = `<i class="fa-solid fa-box-open" style="font-size: 2.5rem; color: rgba(255,255,255,0.15); margin-bottom: 0.5rem;"></i>
            <p style="color:#adb5bd;font-size:13px;margin:0;max-width:280px;">Seleccione un ítem del detalle de la OT a la izquierda para cargar el arte e iniciar la impresión</p>`;
        }
    }

    // Reloj terminal
    setInterval(() => {
        const el = document.getElementById('reloj-terminal');
        if (el) el.textContent = new Date().toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});
    }, 1000);

    // Seleccionar OT
    if (otSelectorTaller) {
        otSelectorTaller.addEventListener('change', () => {
            const num = otSelectorTaller.value;
            if (!num) { resetTerminal(); return; }
            otActual = otsPendientes.find(o => String(o.numero) === String(num));
            if (!otActual) return;
            stopAllTimers();
            segsPrep = segsProd = segsImprod = segsImprodActual = 0;
            tbodyEventos.innerHTML = '';
            tbodyImprod.innerHTML = '';
            totalImprodDisplay.textContent = '00:00:00';
            estadoTerminal = 'idle';
            setSemaforo('red');
            itemActivo = null;
            itemActivoIndex = null;
            btnIniciar.disabled   = true;
            btnFinalizar.disabled = true;
            btnImproductiva.disabled = true;
            btnIniciar.innerHTML  = '<i class="fa-solid fa-play"></i> Iniciar';
            otResumenTerminal.innerHTML = `<div style="font-size:12px;"><p style="color:var(--primary);font-weight:700;margin:0 0 4px;">OT #${otActual.numero}</p><p style="margin:2px 0;color:#e9ecef;">${otActual.cliente}</p><p style="margin:2px 0;color:#adb5bd;">Alta: ${otActual.fechaAlta} · ${otActual.items.length} ítem(s)</p></div>`;
            renderDetalleOt();
            const artContainer = document.getElementById('arte-item-container');
            if (artContainer) {
                artContainer.innerHTML = `<i class="fa-solid fa-arrow-pointer" style="font-size:2.2rem; color:var(--primary); margin-bottom:0.5rem;"></i>
                <p style="color:#adb5bd;font-size:13px;margin:0;max-width:280px;font-weight:600;">OT Cargada correctamente.<br><span style="color:#ced4da;font-weight:normal;font-size:12px;">Haga click en un ítem de la tabla de la izquierda para ver su arte y comenzar.</span></p>`;
            }
        });
    }

    // Iniciar
    if (btnIniciar) {
        btnIniciar.addEventListener('click', () => {
            if (!otActual || !itemActivo) return;
            if (estadoTerminal === 'produccion') return;
            stopAllTimers();
            estadoTerminal = 'produccion';
            setSemaforo('green');
            btnIniciar.disabled   = true;
            btnFinalizar.disabled = false;
            btnImproductiva.disabled = false;
            timerProd = setInterval(() => { segsProd++; contProd.textContent = fmt(segsProd); updateTotalBadge(); }, 1000);
            addEvento('INICIO IMPRESIÓN', itemActivo.marca ? itemActivo.marca + ' ' + itemActivo.varietal : itemActivo.varietal);
        });
    }

    // Finalizar → modal
    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', () => {
            if (!otActual || !itemActivo) return;
            document.getElementById('modal-finalizar').style.display = 'flex';
        });
    }

    document.getElementById('btn-finalizar-completo').addEventListener('click', () => {
        document.getElementById('modal-finalizar').style.display = 'none';
        itemActivo.status = 'finalizado';
        addEvento('FIN COMPLETO ÍTEM', `${itemActivo.marca ? itemActivo.marca + ' ' : ''}${itemActivo.varietal} (P:${fmt(segsProd)})`);
        addToLogistica(otActual, 'completo', fmt(segsProd), fmt(segsImprod));

        // Verificar si TODOS los items de la OT actual están finalizados
        const todosTerminados = otActual.items.every(i => i.status === 'finalizado');
        if (todosTerminados) {
            addEvento('FIN COMPLETO OT', `#${otActual.numero} finalizada completa`);
            otsPendientes = otsPendientes.filter(o => o.numero !== otActual.numero);
            saveOts();
            refreshTallerSelector();
            renderOts();
            resetTerminal();
            otSelectorTaller.value = '';
        } else {
            // Aún quedan varietales por imprimir en esta OT
            stopAllTimers();
            estadoTerminal = 'idle';
            setSemaforo('red');
            itemActivo = null;
            itemActivoIndex = null;
            btnIniciar.disabled = true;
            btnFinalizar.disabled = true;
            btnImproductiva.disabled = true;
            btnIniciar.innerHTML = '<i class="fa-solid fa-play"></i> Iniciar';
            renderDetalleOt();
            renderOts();
            const artContainer = document.getElementById('arte-item-container');
            if (artContainer) {
                artContainer.innerHTML = `<i class="fa-solid fa-check-circle" style="font-size:2.2rem; color:#00f5d4; margin-bottom:0.5rem;"></i>
                <p style="color:#adb5bd;font-size:13px;margin:0;max-width:280px;font-weight:600;">Ítem Finalizado Completamente.<br><span style="color:#ced4da;font-weight:normal;font-size:12px;">La OT sigue abierta. Seleccione otro varietal pendiente a la izquierda para continuar.</span></p>`;
            }
        }
    });

    document.getElementById('btn-finalizar-parcial').addEventListener('click', () => {
        document.getElementById('modal-finalizar').style.display = 'none';
        itemActivo.status = 'parcial';
        stopAllTimers();
        estadoTerminal = 'parcial';
        setSemaforo('yellow');
        btnIniciar.disabled   = false;
        btnFinalizar.disabled = true;
        btnImproductiva.disabled = true;
        btnIniciar.innerHTML  = '<i class="fa-solid fa-play"></i> Retomar';
        addEvento('PAUSA PARCIAL ÍTEM', `${itemActivo.marca ? itemActivo.marca + ' ' : ''}${itemActivo.varietal} (Acum:${fmt(segsProd)})`);
        addToLogistica(otActual, 'parcial', fmt(segsProd), fmt(segsImprod));
        renderDetalleOt();
        renderOts();
    });

    document.getElementById('btn-cancelar-finalizar').addEventListener('click', () => {
        document.getElementById('modal-finalizar').style.display = 'none';
    });

    // Improductiva → modal
    if (btnImproductiva) {
        btnImproductiva.addEventListener('click', () => {
            if (estadoTerminal !== 'produccion' || !itemActivo) return;
            document.getElementById('modal-improductiva').style.display = 'flex';
        });
    }

    const selectMotivo = document.getElementById('select-motivo-improd');
    if (selectMotivo) {
        selectMotivo.addEventListener('change', () => {
            document.getElementById('motivo-otro-group').style.display = selectMotivo.value === 'Otro' ? 'block' : 'none';
        });
    }

    document.getElementById('btn-confirmar-improd').addEventListener('click', () => {
        let motivo = selectMotivo.value;
        if (motivo === 'Otro') motivo = document.getElementById('input-motivo-otro').value || 'Otro';
        document.getElementById('modal-improductiva').style.display = 'none';
        clearInterval(timerProd); timerProd = null;
        estadoTerminal = 'improductiva';
        setSemaforo('yellow');
        btnIniciar.disabled = false;
        btnIniciar.innerHTML = '<i class="fa-solid fa-play"></i> Retomar';
        inicioImprodActual = new Date();
        segsImprodActual = 0;
        timerImprod = setInterval(() => { segsImprod++; segsImprodActual++; contImprod.textContent = fmt(segsImprod); totalImprodDisplay.textContent = fmt(segsImprod); updateTotalBadge(); }, 1000);
        addEvento('IMPRODUCTIVA', motivo);
        const horaInicio = new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
        btnIniciar.dataset.improdMotivo = motivo;
        btnIniciar.dataset.improdHora   = horaInicio;
    });

    document.getElementById('btn-cancelar-improd').addEventListener('click', () => {
        document.getElementById('modal-improductiva').style.display = 'none';
    });

    // Retomar desde improductiva
    if (btnIniciar) {
        btnIniciar.addEventListener('click', () => {
            if (estadoTerminal === 'improductiva' || estadoTerminal === 'parcial') {
                clearInterval(timerImprod); timerImprod = null;
                if (estadoTerminal === 'improductiva') {
                    const dur = fmt(segsImprodActual);
                    const mot = btnIniciar.dataset.improdMotivo || '-';
                    const hor = btnIniciar.dataset.improdHora || '-';
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${hor}</td><td>${mot}</td><td style="color:#f4a261;font-weight:600;">${dur}</td>`;
                    tbodyImprod.prepend(tr);
                    segsImprodActual = 0;
                    delete btnIniciar.dataset.improdMotivo;
                    delete btnIniciar.dataset.improdHora;
                }
                estadoTerminal = 'produccion';
                setSemaforo('green');
                btnIniciar.disabled = true;
                btnFinalizar.disabled = false;
                btnImproductiva.disabled = false;
                btnIniciar.innerHTML = '<i class="fa-solid fa-play"></i> Iniciar';
                timerProd = setInterval(() => { segsProd++; contProd.textContent = fmt(segsProd); updateTotalBadge(); }, 1000);
                addEvento('REANUDA IMPRESIÓN', itemActivo ? (itemActivo.marca ? itemActivo.marca + ' ' + itemActivo.varietal : itemActivo.varietal) : '');
            }
        });
    }

    // Event delegation for #tabla-ots (ver, editar, eliminar)
    const tablaOtsEl = document.getElementById('tabla-ots');
    if (tablaOtsEl) {
        tablaOtsEl.addEventListener('click', (e) => {
            const btnEliminar = e.target.closest('.btn-eliminar-ot');
            if (btnEliminar) {
                const num = parseInt(btnEliminar.getAttribute('data-numero'));
                if (confirm(`¿Está seguro de que desea eliminar la Orden de Trabajo #${num}?`)) {
                    otsPendientes = otsPendientes.filter(o => o.numero !== num);
                    if (todasLasOts[num]) delete todasLasOts[num];
                    saveOts();
                    refreshTallerSelector();
                    renderOts();
                    if (otActual && otActual.numero === num) {
                        resetTerminal();
                        otSelectorTaller.value = '';
                    }
                }
                return;
            }

            const btnEditar = e.target.closest('.btn-editar-ot');
            if (btnEditar) {
                const num = parseInt(btnEditar.getAttribute('data-numero'));
                const ot = otsPendientes.find(o => o.numero === num);
                if (!ot) return;
                
                // Entrar en modo edición
                otEdicionNumero = num;
                formNuevaOt.style.display = 'block';
                formNuevaOt.querySelector('h3').innerHTML = `<i class="fa-solid fa-pen-to-square" style="color:var(--secondary);"></i> Editar Orden de Trabajo #${num}`;
                document.getElementById('new-ot-cliente').value = ot.cliente;
                
                // Herramentales
                if (ot.herramentales) {
                    document.getElementById('new-ot-herramentales').value = 'SI';
                    document.getElementById('group-herr-detalles').style.display = 'flex';
                    document.getElementById('new-ot-herr-cantidad').value = ot.herramentales.cantidad;
                    document.getElementById('new-ot-herr-importe').value = ot.herramentales.importe;
                } else {
                    document.getElementById('new-ot-herramentales').value = 'NO';
                    document.getElementById('group-herr-detalles').style.display = 'none';
                    document.getElementById('new-ot-herr-cantidad').value = '';
                    document.getElementById('new-ot-herr-importe').value = '';
                }
                
                // Cargar items actuales y renderizar
                itemsActuales = ot.items.map(i => ({ ...i }));
                renderItemsOtForm();
                
                // Cambiar etiqueta del botón guardar
                btnGuardarOt.innerHTML = '<i class="fa-solid fa-save"></i> Guardar Cambios';
                
                // Hacer scroll al formulario
                formNuevaOt.scrollIntoView({ behavior: 'smooth' });
                return;
            }

            const btnVer = e.target.closest('.btn-ver-ot');
            if (btnVer) {
                const num = parseInt(btnVer.getAttribute('data-numero'));
                const ot = todasLasOts[num];
                if (!ot) return;
                const itemsStr = ot.items.map(i => `  ${i.tipo ? i.tipo + ' - ' : ''}${i.marca ? i.marca + ' ' : ''}${i.varietal} (${Number(i.cantidad).toLocaleString()} u) - Estado: ${i.status.toUpperCase()}`).join('\n');
                alert(`OT #${ot.numero}\nCliente: ${ot.cliente}\nFecha Alta: ${ot.fechaAlta}\n\nÍtems:\n${itemsStr}`);
                return;
            }
        });
    }

    // ── GESTIÓN DE USUARIOS ───────────────────────────────────
    const btnNuevoUsuario     = document.getElementById('btn-nuevo-usuario');
    const formNuevoUsuario    = document.getElementById('form-nuevo-usuario');
    const btnGuardarUsuario   = document.getElementById('btn-guardar-usuario');
    const btnCancelarUsuario  = document.getElementById('btn-cancelar-usuario');
    const tablaUsuarios       = document.querySelector('#tabla-usuarios tbody');
    let usuarioEdicionUsername = null;

    function renderUsuarios() {
        if (!tablaUsuarios) return;
        tablaUsuarios.innerHTML = '';
        USERS.forEach(usr => {
            const tr = document.createElement('tr');
            const modNames = {
                dashboard: 'Financiero',
                clientes: 'Bodegas & Clientes',
                ots: 'Órdenes (OT)',
                taller: 'Taller',
                logistica: 'Logística',
                usuarios: 'Usuarios'
            };
            const listMods = usr.allowedModules.map(m => modNames[m] || m).join(', ');
            
            // Un Super Admin no se puede eliminar a sí mismo
            const isSelf = currentUser && currentUser.username === usr.username;
            const deleteBtn = isSelf 
                ? `<span style="color:#6c757d; font-size:11.5px; font-style:italic;">(Actual)</span>`
                : `<button class="btn btn-icon btn-eliminar-usr" data-username="${usr.username}" style="color:var(--danger);" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>`;

            tr.innerHTML = `
                <td><strong>${usr.name}</strong></td>
                <td><code>${usr.username}</code></td>
                <td><span class="badge ${usr.role === 'superadmin' ? 'success' : (usr.role === 'admin' ? 'warning' : 'neutral')}">${usr.role.toUpperCase()}</span></td>
                <td><small style="color:#e9ecef;">${listMods}</small></td>
                <td>
                    <button class="btn btn-icon btn-editar-usr" data-username="${usr.username}" style="color:var(--secondary);" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                    ${deleteBtn}
                </td>
            `;
            tablaUsuarios.appendChild(tr);
        });

        // Event listeners para eliminar y editar usuarios
        tablaUsuarios.querySelectorAll('.btn-eliminar-usr').forEach(btn => {
            btn.addEventListener('click', () => {
                const usrname = btn.getAttribute('data-username');
                if (confirm(`¿Está seguro de que desea eliminar al usuario @${usrname}?`)) {
                    USERS = USERS.filter(u => u.username !== usrname);
                    localStorage.setItem('flexoERP_users', JSON.stringify(USERS));
                    renderUsuarios();
                }
            });
        });

        tablaUsuarios.querySelectorAll('.btn-editar-usr').forEach(btn => {
            btn.addEventListener('click', () => {
                const usrname = btn.getAttribute('data-username');
                const usr = USERS.find(u => u.username === usrname);
                if (!usr) return;

                usuarioEdicionUsername = usrname;
                formNuevoUsuario.style.display = 'block';
                document.getElementById('form-usuario-title').innerHTML = `<i class="fa-solid fa-user-pen" style="color:var(--secondary);"></i> Editar Usuario @${usrname}`;
                document.getElementById('new-usr-nombre').value = usr.name;
                document.getElementById('new-usr-username').value = usr.username;
                document.getElementById('new-usr-password').value = usr.password;
                document.getElementById('new-usr-role').value = usr.role;

                // Marcar permisos del usuario
                formNuevoUsuario.querySelectorAll('.permiso-checkbox').forEach(cb => {
                    cb.checked = usr.allowedModules.includes(cb.value);
                });

                btnGuardarUsuario.innerHTML = '<i class="fa-solid fa-save"></i> Guardar Cambios';
                formNuevoUsuario.scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    if (btnNuevoUsuario) {
        btnNuevoUsuario.addEventListener('click', () => {
            formNuevoUsuario.style.display = 'block';
            document.getElementById('form-usuario-title').innerHTML = 'Registrar Nuevo Usuario';
            btnGuardarUsuario.innerHTML = '<i class="fa-solid fa-save"></i> Crear Usuario';
            usuarioEdicionUsername = null;

            // Limpiar campos
            ['new-usr-nombre', 'new-usr-username', 'new-usr-password'].forEach(id => document.getElementById(id).value = '');
            document.getElementById('new-usr-role').value = 'operador';
            
            // Marcar todos los módulos por defecto excepto usuarios
            formNuevoUsuario.querySelectorAll('.permiso-checkbox').forEach(cb => {
                cb.checked = cb.value !== 'usuarios';
            });
        });

        btnCancelarUsuario.addEventListener('click', () => {
            formNuevoUsuario.style.display = 'none';
            usuarioEdicionUsername = null;
        });

        // Configurar selección inteligente de permisos según el Rol elegido
        const selectRolUsr = document.getElementById('new-usr-role');
        if (selectRolUsr) {
            selectRolUsr.addEventListener('change', () => {
                const rol = selectRolUsr.value;
                formNuevoUsuario.querySelectorAll('.permiso-checkbox').forEach(cb => {
                    if (rol === 'operador') {
                        cb.checked = cb.value === 'taller';
                    } else if (rol === 'admin') {
                        cb.checked = cb.value !== 'usuarios';
                    } else if (rol === 'superadmin') {
                        cb.checked = true;
                    }
                });
            });
        }

        btnGuardarUsuario.addEventListener('click', () => {
            const nombre   = document.getElementById('new-usr-nombre').value.trim();
            const username = document.getElementById('new-usr-username').value.trim().toLowerCase();
            const password = document.getElementById('new-usr-password').value.trim();
            const role     = document.getElementById('new-usr-role').value;

            if (!nombre || !username || !password) {
                alert('Todos los campos son obligatorios.');
                return;
            }

            // Capturar módulos permitidos marcados
            const allowedModules = [];
            formNuevoUsuario.querySelectorAll('.permiso-checkbox').forEach(cb => {
                if (cb.checked) allowedModules.push(cb.value);
            });

            if (!allowedModules.length) {
                alert('Seleccione al menos un módulo permitido.');
                return;
            }

            if (usuarioEdicionUsername !== null) {
                // Modo Edición
                const usr = USERS.find(u => u.username === usuarioEdicionUsername);
                if (usr) {
                    // Si se está cambiando el nombre de usuario, verificar duplicados
                    if (usr.username !== username && USERS.some(u => u.username === username)) {
                        alert('El nombre de usuario elegido ya está en uso.');
                        return;
                    }
                    usr.name = nombre;
                    usr.username = username;
                    usr.password = password;
                    usr.role = role;
                    usr.allowedModules = allowedModules;

                    // Si el usuario editado es el actual, refrescar sesión en caliente
                    if (currentUser && currentUser.username === usuarioEdicionUsername) {
                        currentUser = { ...usr };
                        localStorage.setItem('flexoERP_user', JSON.stringify(currentUser));
                    }
                }
                usuarioEdicionUsername = null;
            } else {
                // Modo Creación - Verificar duplicados
                if (USERS.some(u => u.username === username)) {
                    alert('El nombre de usuario ya está registrado.');
                    return;
                }
                USERS.push({ username, password, name: nombre, role, allowedModules });
            }

            localStorage.setItem('flexoERP_users', JSON.stringify(USERS));
            renderUsuarios();
            formNuevoUsuario.style.display = 'none';

            // Refrescar perfil y barra si se editó el propio usuario en sesión
            if (currentUser) {
                applyRBAC(currentUser);
            }
        });

        // La tabla de usuarios se inicializa en initApp()
    }

    // ── RBAC ──────────────────────────────────────────────────
    function applyRBAC(user) {
        const nameEl   = document.getElementById('user-role-name');
        const avatarEl = document.getElementById('user-avatar');
        const maqEl    = document.getElementById('maquinista-name');
        if (nameEl)   nameEl.innerText   = user.name;
        if (avatarEl) avatarEl.innerText = user.name.substring(0,2).toUpperCase();
        if (maqEl)    maqEl.innerText    = user.name.toUpperCase();

        let firstAllowed = null;
        document.querySelectorAll('.nav-item').forEach(item => {
            const t = item.getAttribute('data-target');
            if (user.allowedModules.includes(t)) {
                item.style.display = 'flex';
                if (!firstAllowed) firstAllowed = item;
            } else {
                item.style.display = 'none';
            }
        });

        // Controlar el acceso al botón de usuarios de la barra superior
        const btnTopUsr = document.getElementById('btn-top-usuarios');
        if (btnTopUsr) {
            if (user.allowedModules.includes('usuarios')) {
                btnTopUsr.style.display = 'inline-block';
            } else {
                btnTopUsr.style.display = 'none';
            }
        }

        const isPriv = user.role === 'admin' || user.role === 'superadmin';
        if (!isPriv) {
            [document.getElementById('btn-nueva-ot'), document.getElementById('btn-nuevo-cliente')].forEach(b => { if(b) b.classList.add('hidden-by-role'); });
        }
        renderOts();
        if (firstAllowed) firstAllowed.click();
    }

    // Configurar clic de Gestión de Usuarios en la barra superior
    const btnTopUsr = document.getElementById('btn-top-usuarios');
    if (btnTopUsr) {
        btnTopUsr.addEventListener('click', () => {
            // Desactivar items activos en sidebar
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            // Desactivar módulos activos
            document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
            
            // Activar módulo de gestión de usuarios
            const modUsr = document.getElementById('usuarios');
            if (modUsr) modUsr.classList.add('active');
            
            // Micro-animación: Rotar la tuerca
            const icon = btnTopUsr.querySelector('i');
            if (icon) {
                icon.style.transform = 'rotate(180deg)';
                icon.style.transition = 'transform 0.4s ease';
                setTimeout(() => { icon.style.transform = 'rotate(0deg)'; }, 400);
            }
        });
    }

    // ── LOGÍSTICA & REMITOS MODULE ───────────────────────────
    let currentOtParaRemito = null;
    let modoVisualizacionRemito = false; // true = visualización histórica (inmutable), false = despacho de nueva OT
    
    function abrirRemitoModal(num, esHistorial = false) {
        let ot = null;
        let remitoNumStr = '';
        let todayStr = '';
        let clientObj = null;
        let totalAcumulado = 0;
        
        const tbodyItems = document.getElementById('remito-tbody-items');
        if (!tbodyItems) return;
        tbodyItems.innerHTML = '';

        if (esHistorial) {
            modoVisualizacionRemito = true;
            currentOtParaRemito = null;
            
            const rem = REMITOS.find(r => r.numero === num);
            if (!rem) return;
            
            remitoNumStr = `R-0002-${String(rem.numero).padStart(8, '0')}`;
            todayStr = rem.fecha;
            
            clientObj = CLIENTS.find(c => c.nombre === rem.cliente) || {
                nombre: rem.cliente,
                cuit: '30-XXXXXXXX-X',
                domicilio: 'Domicilio no registrado',
                localidad: 'Luján de Cuyo',
                provincia: 'Mendoza',
                telefono: '-',
                email: rem.emailEnviado || 'contacto@bodega.com'
            };
            
            ot = todasLasOts[rem.otNumero];
            
            if (ot) {
                ot.items.forEach(item => {
                    const qty = parseInt(item.cantidad) || 0;
                    const priceMillar = parseFloat(item.precio) || 0;
                    const subtotal = (qty / 1000) * priceMillar;
                    totalAcumulado += subtotal;
                    
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${qty.toLocaleString('es-AR')} u</td>
                        <td><strong>${item.tipo ? item.tipo + ' - ' : ''}${item.marca ? item.marca + ' ' : ''}${item.varietal}</strong></td>
                    `;
                    tbodyItems.appendChild(tr);
                });
                // Herramentales
                if (ot.herramentales) {
                    const hQty = parseInt(ot.herramentales.cantidad) || 1;
                    const hImp = parseFloat(ot.herramentales.importe) || 0;
                    totalAcumulado += hImp;
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${hQty.toLocaleString('es-AR')} u</td>
                        <td><strong>Herramentales</strong></td>
                    `;
                    tbodyItems.appendChild(tr);
                }
            } else {
                // Fallback si la OT histórica ya no existe
                totalAcumulado = rem.total;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>1 u</td>
                    <td><strong>Servicio de Impresión Etiquetas (OT #${rem.otNumero})</strong></td>
                `;
                tbodyItems.appendChild(tr);
            }
        } else {
            modoVisualizacionRemito = false;
            ot = otsLogistica.find(o => o.numero === num);
            if (!ot) return;
            currentOtParaRemito = ot;
            
            clientObj = CLIENTS.find(c => c.nombre === ot.cliente) || {
                nombre: ot.cliente,
                cuit: '30-XXXXXXXX-X',
                domicilio: 'Domicilio no registrado',
                localidad: 'Luján de Cuyo',
                provincia: 'Mendoza',
                telefono: '-',
                email: 'contacto@bodega.com'
            };
            
            // Generar número provisional
            const nextNum = ultimoRemitoNumero + 1;
            remitoNumStr = `R-0002-${String(nextNum).padStart(8, '0')}`;
            todayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            ot.items.forEach(item => {
                const qty = parseInt(item.cantidad) || 0;
                const priceMillar = parseFloat(item.precio) || 0;
                const subtotal = (qty / 1000) * priceMillar;
                totalAcumulado += subtotal;
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${qty.toLocaleString('es-AR')} u</td>
                    <td><strong>${item.tipo ? item.tipo + ' - ' : ''}${item.marca ? item.marca + ' ' : ''}${item.varietal}</strong></td>
                `;
                tbodyItems.appendChild(tr);
            });
        }
        
        document.getElementById('remito-val-numero').innerText = `Nro: ${remitoNumStr}`;
        document.getElementById('remito-val-fecha').innerText = `FECHA: ${todayStr}`;
        
        document.getElementById('remito-cli-nombre').innerText = clientObj.nombre;
        document.getElementById('remito-cli-domicilio').innerText = clientObj.domicilio || 'Ruta provincial';
        document.getElementById('remito-cli-localidad').innerText = clientObj.localidad || 'Luján de Cuyo';
        document.getElementById('remito-cli-telefono').innerText = clientObj.telefono || '-';
        document.getElementById('remito-cli-cpprov').innerText = `5500 / ${clientObj.provincia || 'Mendoza'}`;
        document.getElementById('remito-cli-cuit').innerText = clientObj.cuit;
        
        const valTotalEl = document.getElementById('remito-val-total');
        if (valTotalEl) {
            valTotalEl.innerText = `$ ${totalAcumulado.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
        }
        
        // Observaciones del remito
        const obsEl = document.getElementById('remito-observaciones-text');
        if (obsEl) {
            if (esHistorial) {
                const rem = REMITOS.find(r => r.numero === num);
                obsEl.innerText = (rem && rem.observaciones) ? rem.observaciones : 'Sin observaciones.';
            } else if (ot && ot._observacionesDespacho) {
                obsEl.innerText = ot._observacionesDespacho;
            } else {
                obsEl.innerText = 'Sin observaciones.';
            }
        }
        
        document.getElementById('modal-remito').style.display = 'flex';
    }

    const btnRemitoCerrar = document.getElementById('btn-remito-cerrar');
    if (btnRemitoCerrar) {
        btnRemitoCerrar.addEventListener('click', () => {
            if (modoVisualizacionRemito || !currentOtParaRemito) {
                document.getElementById('modal-remito').style.display = 'none';
                currentOtParaRemito = null;
                return;
            }
            
            const ot = currentOtParaRemito;
            const clientObj = CLIENTS.find(c => c.nombre === ot.cliente);
            
            let totalAcumulado = 0;
            ot.items.forEach(item => {
                const qty = parseInt(item.cantidad) || 0;
                const priceMillar = parseFloat(item.precio) || 0;
                totalAcumulado += (qty / 1000) * priceMillar;
            });
            
            if (clientObj) {
                clientObj.saldo = (clientObj.saldo || 0) + totalAcumulado;
                saveClients();
                renderClientes();
            }
            
            ultimoRemitoNumero++;
            REMITOS.push({
                numero: ultimoRemitoNumero,
                otNumero: ot.numero,
                cliente: ot.cliente,
                fecha: new Date().toLocaleDateString('es-AR'),
                total: totalAcumulado,
                observaciones: ot._observacionesDespacho || '',
                emailEnviado: clientObj ? clientObj.email : 'compras@bodega.com'
            });
            saveRemitos();
            
            showEmailToast(clientObj ? clientObj.email : 'compras@bodega.com', ultimoRemitoNumero);
            
            otsLogistica = otsLogistica.filter(o => o.numero !== ot.numero);
            saveOts();
            renderLogistica();
            renderHistorialRemitos();
            renderDashboard();
            
            document.getElementById('modal-remito').style.display = 'none';
            currentOtParaRemito = null;
        });
    }

    const btnRemitoPrint = document.getElementById('btn-remito-print');
    if (btnRemitoPrint) {
        btnRemitoPrint.addEventListener('click', () => {
            window.print();
        });
    }

    const btnRemitoPdf = document.getElementById('btn-remito-pdf');
    if (btnRemitoPdf) {
        btnRemitoPdf.addEventListener('click', () => {
            const element = document.getElementById('remito-printable-area');
            if (!element) return;
            
            const numText = document.getElementById('remito-val-numero').innerText || 'R-00000000';
            const numClean = numText.replace('Nro: ', '').trim();
            
            const opt = {
                margin:       0,
                filename:     `remito-${numClean}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { 
                    scale: 1.5, 
                    useCORS: true, 
                    logging: false
                },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            html2pdf().set(opt).from(element).save().catch(err => {
                console.error('Error al generar PDF:', err);
                alert('Ocurrió un error al generar el PDF. Por favor, utilice el botón Imprimir.');
            });
        });
    }

    // Sub-tab switching logic for Logistics
    const subTabButtons = document.querySelectorAll('#logistica .sub-tab-btn');
    subTabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            subTabButtons.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#logistica .sub-tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetId = `subtab-${btn.getAttribute('data-subtab')}`;
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            if (btn.getAttribute('data-subtab') === 'historial') {
                renderHistorialRemitos();
            }
        });
    });

    function renderHistorialRemitos() {
        const tbody = document.getElementById('tbody-remitos-historial');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (!REMITOS.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#adb5bd;padding:2rem;">No se registran remitos generados.</td></tr>';
            return;
        }
        
        // Reverse array to show latest first
        const remitosOrdenados = [...REMITOS].reverse();
        
        remitosOrdenados.forEach(rem => {
            const numStr = `R-0002-${String(rem.numero).padStart(8, '0')}`;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${numStr}</strong></td>
                <td>#${rem.otNumero}</td>
                <td>${rem.cliente}</td>
                <td>${rem.fecha}</td>
                <td style="font-family:monospace; font-weight:700; color:var(--secondary);">$ ${Number(rem.total).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td><small style="color:#adb5bd;">${rem.emailEnviado || 'No registrado'}</small></td>
                <td>
                    <div style="display:flex; gap:0.5rem;">
                        <button class="btn btn-icon btn-ver-remito-historial" data-numero="${rem.numero}" style="color:var(--primary);" title="Ver Remito"><i class="fa-solid fa-eye"></i></button>
                        <button class="btn btn-icon btn-descargar-pdf-historial" data-numero="${rem.numero}" style="color:#ff4d6d;" title="Descargar PDF"><i class="fa-solid fa-file-pdf"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Función para abrir el modal de ajuste de cantidades antes de despachar
    function abrirAjusteCantidadesModal(num) {
        const ot = otsLogistica.find(o => o.numero === num);
        if (!ot) return;
        
        currentOtParaRemito = ot;
        
        const container = document.getElementById('despacho-items-container');
        if (!container) return;
        container.innerHTML = '';
        
        ot.items.forEach((item, idx) => {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = 'background: rgba(0,0,0,0.25); padding: 1.2rem; border-radius: 8px; margin-bottom: 0.8rem; border: 1px solid rgba(255,255,255,0.06);';
            
            itemDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
                    <strong style="color:var(--secondary); font-size:14px;">${item.tipo ? item.tipo + ' - ' : ''}${item.marca ? item.marca + ' ' : ''}${item.varietal}</strong>
                    <span style="font-size:12px; color:#adb5bd;">Pedido: <strong>${Number(item.cantidad).toLocaleString('es-AR')} u.</strong></span>
                </div>
                <div class="form-group">
                    <label style="font-size:11px; color:#adb5bd; text-transform:uppercase; font-weight: 500;">Cantidad Real Despachada (u)</label>
                    <input type="number" class="large-input input-cant-despacho" id="input-cant-despacho-${idx}" value="${item.cantidad}" style="margin-top:6px;" required min="1">
                </div>
            `;
            container.appendChild(itemDiv);
        });
        
        document.getElementById('modal-despacho-cantidades').style.display = 'flex';
    }

    // Configurar manejadores para el modal de ajuste de cantidades de despacho
    const btnConfirmarDespachoCantidades = document.getElementById('btn-confirmar-despacho-cantidades');
    if (btnConfirmarDespachoCantidades) {
        btnConfirmarDespachoCantidades.addEventListener('click', () => {
            if (!currentOtParaRemito) return;
            const ot = currentOtParaRemito;
            
            const inputs = document.querySelectorAll('.input-cant-despacho');
            let allValid = true;
            inputs.forEach(input => {
                const val = parseInt(input.value);
                if (isNaN(val) || val <= 0) {
                    allValid = false;
                }
            });
            
            if (!allValid) {
                alert('Por favor ingrese cantidades válidas mayores a 0 para todos los ítems.');
                return;
            }
            
            // Guardar cantidades despachadas reales en los ítems de la OT
            ot.items.forEach((item, idx) => {
                const inputVal = parseInt(document.getElementById(`input-cant-despacho-${idx}`).value);
                item.cantidad = inputVal;
            });
            
            // Sincronizar en el objeto maestro de OTs para mantener la coherencia al visualizar historial
            if (todasLasOts[ot.numero]) {
                todasLasOts[ot.numero].items = ot.items.map(i => ({ ...i }));
            }
            
            // Capturar observaciones del textarea
            const obsTextarea = document.getElementById('input-despacho-observaciones');
            ot._observacionesDespacho = obsTextarea ? obsTextarea.value.trim() : '';
            
            saveOts();
            
            // Cerrar modal de ajuste y abrir el remito con los nuevos valores reales
            document.getElementById('modal-despacho-cantidades').style.display = 'none';
            abrirRemitoModal(ot.numero, false);
        });
    }

    const btnCancelarDespachoCantidades = document.getElementById('btn-cancelar-despacho-cantidades');
    if (btnCancelarDespachoCantidades) {
        btnCancelarDespachoCantidades.addEventListener('click', () => {
            document.getElementById('modal-despacho-cantidades').style.display = 'none';
            currentOtParaRemito = null;
        });
    }

    // Event delegation at document level for logistics table truck button & history buttons
    document.addEventListener('click', (e) => {
        // Pending dispatch
        const btnDespacho = e.target.closest('.btn-despacho-ot');
        if (btnDespacho) {
            const num = parseInt(btnDespacho.getAttribute('data-numero'));
            abrirAjusteCantidadesModal(num);
            return;
        }
        
        // History View
        const btnVerHistorial = e.target.closest('.btn-ver-remito-historial');
        if (btnVerHistorial) {
            const num = parseInt(btnVerHistorial.getAttribute('data-numero'));
            abrirRemitoModal(num, true);
            return;
        }
        
        // History PDF direct download
        const btnPdfHistorial = e.target.closest('.btn-descargar-pdf-historial');
        if (btnPdfHistorial) {
            const num = parseInt(btnPdfHistorial.getAttribute('data-numero'));
            // Programmatically open, download, and close
            abrirRemitoModal(num, true);
            const btnPdf = document.getElementById('btn-remito-pdf');
            if (btnPdf) btnPdf.click();
            document.getElementById('modal-remito').style.display = 'none';
            currentOtParaRemito = null;
            return;
        }
    });

    // Se eliminó la generación masiva automática de remitos para favorecer la emisión y el control individual item por item

    // Iniciar la aplicación cargando datos desde el servidor o localStorage
    initApp();
});
