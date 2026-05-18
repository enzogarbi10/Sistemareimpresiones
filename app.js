document.addEventListener('DOMContentLoaded', () => {
    // --- AUTHENTICATION & RBAC STATE ---
    const USERS = [
        { username: 'superadmin', password: 'superadmin123', name: 'Super Admin', role: 'superadmin', allowedModules: ['dashboard', 'clientes', 'ots', 'taller', 'logistica'] },
        { username: 'admin', password: '123', name: 'Administrador', role: 'admin', allowedModules: ['dashboard', 'clientes', 'ots', 'taller', 'logistica'] },
        { username: 'operador', password: '123', name: 'Juan Perez', role: 'operador', allowedModules: ['taller'] }
    ];

    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const btnLogout = document.getElementById('btn-logout');

    let currentUser = JSON.parse(localStorage.getItem('flexoERP_user'));

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const u = document.getElementById('login-user').value;
            const p = document.getElementById('login-pass').value;
            const user = USERS.find(user => user.username === u && user.password === p);
            
            if (user) {
                localStorage.setItem('flexoERP_user', JSON.stringify(user));
                currentUser = user;
                loginScreen.style.display = 'none';
                appContainer.style.display = 'flex';
                applyRBAC(currentUser);
                loginError.style.display = 'none';
            } else {
                loginError.style.display = 'block';
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('flexoERP_user');
            currentUser = null;
            window.location.reload();
        });
    }

    // Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    const modules = document.querySelectorAll('.module');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active to clicked
            item.classList.add('active');

            // Hide all modules
            modules.forEach(mod => {
                mod.classList.remove('active');
            });

            // Show target module
            const targetId = item.getAttribute('data-target');
            const targetModule = document.getElementById(targetId);
            if (targetModule) {
                targetModule.classList.add('active');
            }
        });
    });

    // Taller / Producción Logic
    const otSelector = document.getElementById('ot-selector');
    const otSnippet = document.getElementById('ot-snippet');

    otSelector.addEventListener('change', (e) => {
        if (e.target.value) {
            otSnippet.style.display = 'flex';
            // Here we would typically fetch data based on the OT ID
            // For the mockup, we just show the static snippet
        } else {
            otSnippet.style.display = 'none';
        }
    });

    // Buttons Mock Logic
    const btnSuccess = document.querySelector('.btn-success');
    if (btnSuccess) {
        btnSuccess.addEventListener('click', function() {
            if (!otSelector.value) {
                alert('Por favor, seleccione una OT primero.');
                return;
            }
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando...';
            setTimeout(() => {
                this.innerHTML = '<i class="fa-solid fa-check"></i> Tirada Iniciada';
                this.style.background = 'linear-gradient(135deg, #2a9d8f, #264653)';
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.style.background = '';
                }, 3000);
            }, 1000);
        });
    }

    const btnPrimarySave = document.querySelector('.card .btn-primary');
    if (btnPrimarySave) {
        btnPrimarySave.addEventListener('click', function() {
            if (!otSelector.value) {
                alert('Seleccione una OT para cargar registros.');
                return;
            }
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
            setTimeout(() => {
                this.innerHTML = '<i class="fa-solid fa-check"></i> Registros Guardados';
                setTimeout(() => {
                    this.innerHTML = originalText;
                }, 2000);
            }, 800);
        });
    }

    // --- NUEVAS FUNCIONES PARA OT y CLIENTES ---
    // OTs
    const btnNuevaOt = document.getElementById('btn-nueva-ot');
    const formNuevaOt = document.getElementById('form-nueva-ot');
    const btnGuardarOt = document.getElementById('btn-guardar-ot');
    const btnCancelarOt = document.getElementById('btn-cancelar-ot');
    const tablaOts = document.querySelector('#tabla-ots tbody');
    
    // Elementos de items
    const btnAgregarItem = document.getElementById('btn-agregar-item');
    const tablaItemsOt = document.querySelector('#tabla-items-ot tbody');
    const listaItemsContainer = document.getElementById('lista-items-container');
    
    let itemsActuales = [];
    let ultimoNumeroOt = 1044; // Para la correlatividad
    let todasLasOts = {}; // Para guardar la información completa de las OTs generadas

    // Función global para imprimir PDF
    window.imprimirPDF = function(numero) {
        const otData = todasLasOts[numero];
        if(!otData) return;

        let itemsHtml = otData.items.map(item => `
            <div style="border: 1px solid #ccc; margin-bottom: 15px; padding: 15px; border-radius: 8px; page-break-inside: avoid;">
                <h4 style="margin: 0 0 10px 0; color: #9d4edd; font-size: 18px;">Varietal: ${item.varietal}</h4>
                <table style="width: 100%; text-align: left; margin-bottom: 15px; font-size: 14px;">
                    <tr>
                        <td style="padding: 5px 0;"><strong>Cantidad:</strong> ${item.cantidad} etiquetas</td>
                        <td style="padding: 5px 0;"><strong>Precio x Millar:</strong> $${item.precio}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Colores a imprimir:</strong> ${item.colores}</td>
                        <td style="padding: 5px 0;"><strong>Lleva Barniz:</strong> ${item.barniz === 'SI' ? 'Sí' : 'No'}</td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding: 5px 0;"><strong>Fecha de Entrega:</strong> ${item.fecha}</td>
                    </tr>
                </table>
                <div style="text-align:center; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                    <strong>Arte / Diseño de Etiqueta:</strong><br>
                    ${item.imagenB64 ? `<img src="${item.imagenB64}" style="max-height: 200px; max-width: 100%; margin-top: 10px; border: 1px solid #ddd;" />` : '<p style="color:#888; font-style:italic; margin-top:5px;">Sin imagen adjunta</p>'}
                </div>
            </div>
        `).join('');

        const div = document.createElement('div');
        div.style.padding = '40px';
        div.style.background = '#fff';
        div.style.color = '#000';
        div.innerHTML = `
            <div style="border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 25px;">
                <h1 style="color:#9d4edd; margin:0; font-size: 28px;">FlexoERP</h1>
                <h2 style="margin: 5px 0 0 0; color: #333;">Orden de Trabajo #${numero}</h2>
            </div>
            <div style="margin-bottom: 25px; font-size: 16px;">
                <p style="margin: 0 0 5px 0;"><strong>Cliente (Bodega):</strong> ${otData.cliente}</p>
                <p style="margin: 0;"><strong>Fecha de Alta:</strong> ${otData.fechaAlta}</p>
            </div>
            ${itemsHtml}
            <div style="margin-top: 40px; text-align:center; font-size:12px; color:#666; border-top: 1px solid #ccc; padding-top: 15px;">
                Documento generado automáticamente por FlexoERP - Gestión de Etiquetas de Vino
            </div>
        `;
        
        // Configuramos html2pdf
        const opt = {
            margin:       0.5,
            filename:     `OT_${numero}_${otData.cliente.replace(/\s+/g, '')}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        
        html2pdf().set(opt).from(div).save();
    };

    if (btnNuevaOt) {
        btnNuevaOt.addEventListener('click', () => {
            formNuevaOt.style.display = 'block';
            itemsActuales = [];
            tablaItemsOt.innerHTML = '';
            listaItemsContainer.style.display = 'none';
            document.getElementById('new-ot-cliente').value = '';
        });
        
        btnCancelarOt.addEventListener('click', () => formNuevaOt.style.display = 'none');
        
        btnAgregarItem.addEventListener('click', async () => {
            const varietal = document.getElementById('new-item-varietal').value;
            const cantidad = document.getElementById('new-item-cantidad').value;
            const precio = document.getElementById('new-item-precio').value || '0';
            const colores = document.getElementById('new-item-colores').value;
            const barniz = document.getElementById('new-item-barniz').value;
            const fecha = document.getElementById('new-item-fecha').value;
            const imgInput = document.getElementById('new-item-img');
            
            if(!varietal || !cantidad || !fecha) { alert('Varietal, cantidad y fecha son obligatorios'); return; }
            
            // Leer imagen si existe
            let imagenB64 = null;
            if (imgInput.files && imgInput.files[0]) {
                const file = imgInput.files[0];
                imagenB64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });
            }
            
            itemsActuales.push({ varietal, cantidad, precio, colores, barniz, fecha, imagenB64 });
            
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>${varietal}</td>
                <td>${cantidad}</td>
                <td>$ ${precio}</td>
                <td>${colores}</td>
                <td>${barniz === 'SI' ? 'Sí' : 'No'}</td>
                <td>${fecha}</td>
            `;
            tablaItemsOt.appendChild(newRow);
            listaItemsContainer.style.display = 'block';
            
            // Limpiar inputs
            document.getElementById('new-item-varietal').value = '';
            document.getElementById('new-item-cantidad').value = '';
            document.getElementById('new-item-precio').value = '';
            document.getElementById('new-item-fecha').value = '';
            document.getElementById('new-item-img').value = '';
        });

        btnGuardarOt.addEventListener('click', () => {
            const cliente = document.getElementById('new-ot-cliente').value;
            if (!cliente) { alert('Seleccione un cliente'); return; }
            if (itemsActuales.length === 0) { alert('Debe agregar al menos un ítem a la OT'); return; }
            
            ultimoNumeroOt++; // Correlatividad
            const numeroOt = ultimoNumeroOt;
            const fechaAlta = new Date().toLocaleDateString('es-AR', {day:'2-digit', month:'2-digit', year:'numeric'});
            
            // Guardar en el registro global para el PDF
            todasLasOts[numeroOt] = {
                numero: numeroOt,
                cliente: cliente,
                fechaAlta: fechaAlta,
                items: [...itemsActuales]
            };
            
            // Resumen de varietales para la vista principal
            const resumenVarietales = itemsActuales.map(i => `${i.varietal} (${i.cantidad} u. a $${i.precio} x millar)`).join(', ');
            
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>${numeroOt}</td>
                <td>${fechaAlta}</td>
                <td>${cliente}</td>
                <td><small>${resumenVarietales}</small></td>
                <td><span class="badge neutral">Pendiente</span></td>
                <td>
                    <button class="btn btn-icon"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn btn-icon" style="color: #ff4d6d;" onclick="imprimirPDF('${numeroOt}')"><i class="fa-solid fa-file-pdf"></i></button>
                </td>
            `;
            tablaOts.prepend(newRow);
            formNuevaOt.style.display = 'none';
        });
    }

    // Clientes
    const btnNuevoCliente = document.getElementById('btn-nuevo-cliente');
    const formNuevoCliente = document.getElementById('form-nuevo-cliente');
    const btnGuardarCliente = document.getElementById('btn-guardar-cliente');
    const btnCancelarCliente = document.getElementById('btn-cancelar-cliente');
    const tablaClientes = document.querySelector('#tabla-clientes tbody');

    if (btnNuevoCliente) {
        btnNuevoCliente.addEventListener('click', () => formNuevoCliente.style.display = 'flex');
        btnCancelarCliente.addEventListener('click', () => formNuevoCliente.style.display = 'none');
        
        btnGuardarCliente.addEventListener('click', () => {
            const nombre = document.getElementById('new-cli-nombre').value;
            const cuit = document.getElementById('new-cli-cuit').value || 'Sin CUIT';
            const domicilio = document.getElementById('new-cli-domicilio').value;
            const factura = document.getElementById('new-cli-factura').value;
            const email = document.getElementById('new-cli-email').value;
            const telefono = document.getElementById('new-cli-telefono').value;
            const moneda = document.getElementById('new-cli-moneda').value;

            if (!nombre) { alert('Ingrese la razón social'); return; }
            
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>${nombre} <br><small style="color: #adb5bd;">${email || telefono} | ${moneda}</small></td>
                <td>${cuit}</td>
                <td>${factura === 'SI' ? 'Con Factura' : 'Sin Factura'}</td>
                <td>$ 0</td>
            `;
            tablaClientes.prepend(newRow);
            formNuevoCliente.style.display = 'none';
            // Limpiar
            document.getElementById('new-cli-nombre').value = '';
            document.getElementById('new-cli-cuit').value = '';
            document.getElementById('new-cli-domicilio').value = '';
            document.getElementById('new-cli-factura').value = 'SI';
            document.getElementById('new-cli-email').value = '';
            document.getElementById('new-cli-telefono').value = '';
        });
    }

    // --- APPLY RBAC ON LOAD ---
    function applyRBAC(user) {
        // Update UI
        const roleNameEl = document.getElementById('user-role-name');
        const avatarEl = document.getElementById('user-avatar');
        if (roleNameEl) roleNameEl.innerText = user.name;
        if (avatarEl) avatarEl.innerText = user.name.substring(0, 2).toUpperCase();
        
        const maquinistaEl = document.getElementById('maquinista-name');
        if (maquinistaEl) {
            maquinistaEl.innerText = user.name.toUpperCase();
        }

        // Hide/Show Navigation Items
        const allNavItems = document.querySelectorAll('.nav-item');
        let firstAllowedModule = null;

        allNavItems.forEach(item => {
            const targetId = item.getAttribute('data-target');
            if (user.allowedModules.includes(targetId)) {
                item.style.display = 'flex';
                if (!firstAllowedModule) firstAllowedModule = item;
            } else {
                item.style.display = 'none';
            }
        });

        // Hide Admin buttons for non-admins
        const isPrivileged = user.role === 'admin' || user.role === 'superadmin';
        if (!isPrivileged) {
            const adminButtons = [document.getElementById('btn-nueva-ot'), document.getElementById('btn-nuevo-cliente')];
            adminButtons.forEach(btn => {
                if (btn) btn.classList.add('hidden-by-role');
            });
        }

        // Click first allowed module
        if (firstAllowedModule) {
            firstAllowedModule.click();
        }
    }

    if (currentUser) {
        loginScreen.style.display = 'none';
        appContainer.style.display = 'flex';
        applyRBAC(currentUser);
    } else {
        loginScreen.style.display = 'flex';
        appContainer.style.display = 'none';
    }
});
