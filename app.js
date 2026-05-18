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
    let otsPendientes  = [
        { numero: 1042, cliente: 'Bodega Norton', fechaAlta: '05/05/2026', items: [
            { varietal: 'Malbec Reserva', cantidad: '50000', precio: '12', colores: '4', barniz: 'SI', fecha: '2026-06-01', imagenB64: null, status: 'pendiente' },
            { varietal: 'Cabernet Sauvignon', cantidad: '30000', precio: '12', colores: '4', barniz: 'NO', fecha: '2026-06-01', imagenB64: null, status: 'pendiente' }
        ]},
        { numero: 1044, cliente: 'Salentein', fechaAlta: '08/05/2026', items: [
            { varietal: 'Chardonnay', cantidad: '10000', precio: '15', colores: '3', barniz: 'NO', fecha: '2026-06-15', imagenB64: null, status: 'pendiente' }
        ]}
    ];
    let otsLogistica   = [];
    let ultimoNumeroOt = 1044;
    let todasLasOts    = {
        1042: otsPendientes[0],
        1044: otsPendientes[1]
    };

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

    // Inicializar selector de OTs en taller al cargar
    refreshTallerSelector();

    function addToLogistica(ot, tipo, tiempoProd, tiempoImprod) {
        const now = new Date().toLocaleString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
        otsLogistica.push({ ...ot, tipo, tiempoProd, tiempoImprod, fechaFin: now });
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
                <td><button class="btn btn-icon"><i class="fa-solid fa-truck"></i></button></td>`;
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
            const resumen = ot.items.map(i => `${i.varietal} (${Number(i.cantidad).toLocaleString()}u)`).join(', ');
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

        // Event listeners para editar y eliminar
        tbody.querySelectorAll('.btn-eliminar-ot').forEach(btn => {
            btn.addEventListener('click', () => {
                const num = parseInt(btn.getAttribute('data-numero'));
                if (confirm(`¿Está seguro de que desea eliminar la Orden de Trabajo #${num}?`)) {
                    otsPendientes = otsPendientes.filter(o => o.numero !== num);
                    if (todasLasOts[num]) delete todasLasOts[num];
                    refreshTallerSelector();
                    renderOts();
                    if (otActual && otActual.numero === num) {
                        resetTerminal();
                        otSelectorTaller.value = '';
                    }
                }
            });
        });

        tbody.querySelectorAll('.btn-editar-ot').forEach(btn => {
            btn.addEventListener('click', () => {
                const num = parseInt(btn.getAttribute('data-numero'));
                const ot = otsPendientes.find(o => o.numero === num);
                if (!ot) return;
                
                // Entrar en modo edición
                otEdicionNumero = num;
                formNuevaOt.style.display = 'block';
                formNuevaOt.querySelector('h3').innerHTML = `<i class="fa-solid fa-pen-to-square" style="color:var(--secondary);"></i> Editar Orden de Trabajo #${num}`;
                document.getElementById('new-ot-cliente').value = ot.cliente;
                
                // Cargar items actuales y renderizar
                itemsActuales = ot.items.map(i => ({ ...i }));
                renderItemsOtForm();
                
                // Cambiar etiqueta del botón guardar
                btnGuardarOt.innerHTML = '<i class="fa-solid fa-save"></i> Guardar Cambios';
                
                // Hacer scroll al formulario
                formNuevaOt.scrollIntoView({ behavior: 'smooth' });
            });
        });
        
        tbody.querySelectorAll('.btn-ver-ot').forEach(btn => {
            btn.addEventListener('click', () => {
                const num = parseInt(btn.getAttribute('data-numero'));
                const ot = todasLasOts[num];
                if (!ot) return;
                const itemsStr = ot.items.map(i => `• ${i.varietal} (${Number(i.cantidad).toLocaleString()} u) - Estado: ${i.status.toUpperCase()}`).join('\n');
                alert(`OT #${ot.numero}\nCliente: ${ot.cliente}\nFecha Alta: ${ot.fechaAlta}\n\nÍtems:\n${itemsStr}`);
            });
        });
    }

    // Inicializar vistas
    renderOts();

    // ── PDF ───────────────────────────────────────────────────
    window.imprimirPDF = function(numero) {
        const ot = todasLasOts[numero];
        if (!ot) return;
        const div = document.createElement('div');
        div.style.cssText = 'padding:40px;background:#fff;color:#000;';
        div.innerHTML = `<h1 style="color:#9d4edd;">FlexoERP</h1><h2>OT #${numero} - ${ot.cliente}</h2><p>Fecha: ${ot.fechaAlta}</p>` +
            ot.items.map(i => `<div style="border:1px solid #ccc;padding:15px;margin:10px 0;border-radius:8px;">
                <h4 style="color:#9d4edd;">${i.varietal}</h4>
                <p>Cantidad: ${i.cantidad} | Colores: ${i.colores} | Barniz: ${i.barniz === 'SI' ? 'Sí' : 'No'} | Entrega: ${i.fecha}</p>
                ${i.imagenB64 ? `<img src="${i.imagenB64}" style="max-height:150px;"/>` : ''}
            </div>`).join('');
        html2pdf().set({ margin:0.5, filename:`OT_${numero}.pdf`, jsPDF:{ unit:'in', format:'letter' } }).from(div).save();
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
                <td><strong>${item.varietal}</strong></td>
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
        });
        btnCancelarOt.addEventListener('click', () => {
            formNuevaOt.style.display = 'none';
            otEdicionNumero = null;
            itemsActuales = [];
            renderItemsOtForm();
        });

        btnAgregarItem.addEventListener('click', async () => {
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
                imagenB64 = await new Promise(res => { const r = new FileReader(); r.onloadend = () => res(r.result); r.readAsDataURL(imgInput.files[0]); });
            }
            itemsActuales.push({ varietal, cantidad, precio, colores, barniz, fecha, imagenB64, status: 'pendiente' });
            renderItemsOtForm();
            ['new-item-varietal','new-item-cantidad','new-item-precio','new-item-fecha'].forEach(id => document.getElementById(id).value = '');
            document.getElementById('new-item-img').value = '';
        });

        btnGuardarOt.addEventListener('click', () => {
            const cliente = document.getElementById('new-ot-cliente').value;
            if (!cliente) { alert('Seleccione un cliente'); return; }
            if (!itemsActuales.length) { alert('Agregue al menos un ítem'); return; }

            if (otEdicionNumero !== null) {
                // Modo Edición
                const num = otEdicionNumero;
                const ot = otsPendientes.find(o => o.numero === num);
                if (ot) {
                    ot.cliente = cliente;
                    ot.items = [...itemsActuales];
                }
                if (todasLasOts[num]) {
                    todasLasOts[num].cliente = cliente;
                    todasLasOts[num].items = [...itemsActuales];
                }
                otEdicionNumero = null;
            } else {
                // Modo Creación
                ultimoNumeroOt++;
                const num       = ultimoNumeroOt;
                const fechaAlta = new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
                todasLasOts[num] = { numero: num, cliente, fechaAlta, items: [...itemsActuales] };
                otsPendientes.push({ numero: num, cliente, fechaAlta, items: [...itemsActuales] });
            }

            refreshTallerSelector();
            renderOts();
            formNuevaOt.style.display = 'none';
            itemsActuales = [];
        });
    }

    // ── CLIENTES MODULE ───────────────────────────────────────
    const btnNuevoCliente    = document.getElementById('btn-nuevo-cliente');
    const formNuevoCliente   = document.getElementById('form-nuevo-cliente');
    const btnGuardarCliente  = document.getElementById('btn-guardar-cliente');
    const btnCancelarCliente = document.getElementById('btn-cancelar-cliente');
    const tablaClientes      = document.querySelector('#tabla-clientes tbody');

    if (btnNuevoCliente) {
        btnNuevoCliente.addEventListener('click', () => { formNuevoCliente.style.display = 'flex'; });
        btnCancelarCliente.addEventListener('click', () => { formNuevoCliente.style.display = 'none'; });
        btnGuardarCliente.addEventListener('click', () => {
            const nombre  = document.getElementById('new-cli-nombre').value;
            const cuit    = document.getElementById('new-cli-cuit').value || 'Sin CUIT';
            const factura = document.getElementById('new-cli-factura').value;
            const email   = document.getElementById('new-cli-email').value;
            const tel     = document.getElementById('new-cli-telefono').value;
            const moneda  = document.getElementById('new-cli-moneda').value;
            if (!nombre) { alert('Ingrese la razón social'); return; }
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${nombre}<br><small style="color:#adb5bd;">${email||tel} | ${moneda}</small></td><td>${cuit}</td><td>${factura==='SI'?'Con Factura':'Sin Factura'}</td><td>$0</td>`;
            tablaClientes.prepend(tr);
            formNuevoCliente.style.display = 'none';
            ['new-cli-nombre','new-cli-cuit','new-cli-domicilio','new-cli-email','new-cli-telefono'].forEach(id => document.getElementById(id).value = '');
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
                <td>ETIQUETA</td>
                <td><strong>${item.varietal}</strong></td>
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
                    <p style="margin:0 0 2px; color:var(--secondary); font-weight:700; font-size:13px;">${itemActivo.varietal.toUpperCase()}</p>
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
            addEvento('ÍTEM FINALIZADO', `${itemActivo.varietal}`);
        } else {
            btnIniciar.disabled = false;
            btnFinalizar.disabled = true;
            btnImproductiva.disabled = true;
            estadoTerminal = 'preparacion';
            if (itemActivo.status === 'parcial') {
                btnIniciar.innerHTML = '<i class="fa-solid fa-play"></i> Retomar';
                setSemaforo('yellow');
                addEvento('RETOME PARCIAL', `${itemActivo.varietal}`);
            } else {
                btnIniciar.innerHTML = '<i class="fa-solid fa-play"></i> Iniciar';
                setSemaforo('red');
                addEvento('PREPARACIÓN', `${itemActivo.varietal}`);
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
            addEvento('INICIO IMPRESIÓN', itemActivo.varietal);
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
        addEvento('FIN COMPLETO ÍTEM', `${itemActivo.varietal} (P:${fmt(segsProd)})`);
        addToLogistica(otActual, 'completo', fmt(segsProd), fmt(segsImprod));

        // Verificar si TODOS los items de la OT actual están finalizados
        const todosTerminados = otActual.items.every(i => i.status === 'finalizado');
        if (todosTerminados) {
            addEvento('FIN COMPLETO OT', `#${otActual.numero} finalizada completa`);
            otsPendientes = otsPendientes.filter(o => o.numero !== otActual.numero);
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
        addEvento('PAUSA PARCIAL ÍTEM', `${itemActivo.varietal} (Acum:${fmt(segsProd)})`);
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
                addEvento('REANUDA IMPRESIÓN', itemActivo ? itemActivo.varietal : '');
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

        // Inicializar tabla de usuarios al cargar la app
        renderUsuarios();
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

    if (currentUser) {
        loginScreen.style.display  = 'none';
        appContainer.style.display = 'flex';
        applyRBAC(currentUser);
    } else {
        loginScreen.style.display  = 'flex';
        appContainer.style.display = 'none';
    }
});
