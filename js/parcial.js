/* ============================================
   MaintPro CMMS — Módulo Parcial Segundo Corte
   - Activación: 5 mayo 2026, 7:00 PM (Bogotá)
   - CMMS arranca en 0 (FORZADO — borra datos previos)
   - Lock de cédula en Firestore (1 solo intento)
   - Admin puede desbloquear cédulas
   - Genera PDF y lo envía a Drive
   ============================================ */

(function() {
    'use strict';

    const PARCIAL_COLLECTION = 'parcial_cmms_locks';
    const PARCIAL_STORAGE_FLAG = 'parcial_mode_initialized_v2';
    const SHEET_URL = "https://script.google.com/macros/s/AKfycbxxvnDXjr3Ss0oqOPXfpiDzxHViPtIguKFKhX7cxUj6adaQ-CBmMyWSdpyD2W8BmP5OCQ/exec";

    // ── Activation: May 5, 2026 at 7:00 PM Bogotá (UTC-5) ──
    function isParcialMode() {
        const forced = new URLSearchParams(window.location.search).get('parcial') === '1';
        if (forced) return true;
        const now = new Date();
        const bogota = new Date(now.toLocaleString('en-US', {timeZone: 'America/Bogota'}));
        return bogota.getFullYear() === 2026 && bogota.getMonth() === 4 && bogota.getDate() === 5 && bogota.getHours() >= 19;
    }

    // ── Generate EMPTY data for parcial ──
    function generateEmptyParcialData(cedula) {
        const student = getStudentByCedula(cedula);
        if (!student) return null;

        const seed = hashCedula(cedula);
        const rng = createRNG(seed);
        const sectorIdx = Math.floor(rng() * SECTORS.length);
        const sector = SECTORS[sectorIdx];
        const apellido = getStudentApellido(student.nombre);

        return {
            companies: [{
                id: `company_${cedula}`,
                name: `${sector.companyPrefix} ${apellido}`,
                sector: sector.name,
                location: `${sector.locationPrefix} ${apellido}`,
                created: new Date().toISOString().split('T')[0]
            }],
            assets: [],
            workOrders: [],
            preventivePlans: [],
            inventory: [],
            personnel: [],
            purchases: [],
            inventoryMovements: [],
            faultReports: [],
            injectedAlerts: [],
            notifications: [],
            activityLog: [{
                id: 'log_parcial',
                companyId: `company_${cedula}`,
                timestamp: new Date().toISOString(),
                action: 'system',
                message: `📝 PARCIAL: Sistema en blanco. Registre activos, personal, planes y OTs.`
            }]
        };
    }

    // ── FORCE empty data when parcial mode is active ──
    // This overrides initStore to wipe and replace with empty data
    if (isParcialMode()) {
        const _origInitStore = window.initStore;
        window.initStore = function(cedula) {
            const flagKey = `${PARCIAL_STORAGE_FLAG}_${cedula}`;
            const alreadyInitialized = localStorage.getItem(flagKey);

            if (!alreadyInitialized) {
                // FIRST TIME in parcial mode: wipe everything and start fresh
                console.info('[Parcial] 🧹 Limpiando datos previos para:', cedula);
                
                // Generate empty parcial data
                const emptyData = generateEmptyParcialData(cedula);
                if (emptyData) {
                    // Force into localStorage (this is what DataStore reads first)
                    localStorage.setItem(`maintpro_${cedula}`, JSON.stringify(emptyData));
                    
                    // Also force into Firestore
                    if (_fbDb) {
                        _fbDb.collection('students').doc(String(cedula)).set(emptyData)
                            .then(() => console.info('[Parcial] ✅ Datos vacíos sincronizados a Firestore'))
                            .catch(e => console.warn('[Parcial] Firestore sync error:', e));
                    }
                    
                    // Mark as initialized so we don't wipe again on refresh
                    localStorage.setItem(flagKey, Date.now().toString());
                }
            }
            
            // Now call original initStore (will read the clean data from localStorage)
            _origInitStore(cedula);
        };
    }

    // ── Lock check ──
    async function checkParcialLock(cedula) {
        if (!_fbDb) return false;
        try { return (await _fbDb.collection(PARCIAL_COLLECTION).doc(cedula).get()).exists; }
        catch(e) { return false; }
    }

    // ── Lock set ──
    async function setParcialLock(cedula, nombre) {
        if (!_fbDb) return;
        try {
            await _fbDb.collection(PARCIAL_COLLECTION).doc(cedula).set({
                nombre, cedula,
                submitTime: new Date().toLocaleString('es-CO', {timeZone:'America/Bogota'}),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch(e) {}
    }

    // ══════════════════════════════════════════════
    //  ADMIN COMMANDS (browser console)
    // ══════════════════════════════════════════════
    window.unlockParcialTeoria = async function(cedula) {
        if (!_fbDb) return console.error('Firebase no disponible');
        if (!confirm(`¿Desbloquear TEÓRICA de ${cedula}?`)) return;
        await _fbDb.collection('parcial_teorico_locks').doc(cedula).delete();
        alert(`✅ Teórica desbloqueada: ${cedula}`);
    };

    window.unlockParcialCMMS = async function(cedula) {
        if (!_fbDb) return console.error('Firebase no disponible');
        if (!confirm(`¿Desbloquear CMMS de ${cedula}?`)) return;
        await _fbDb.collection(PARCIAL_COLLECTION).doc(cedula).delete();
        alert(`✅ CMMS desbloqueado: ${cedula}`);
    };

    window.resetParcialData = async function(cedula) {
        if (!_fbDb) return console.error('Firebase no disponible');
        if (!confirm(`⚠️ RESETEAR datos CMMS de ${cedula}? Borra TODO.`)) return;
        const emptyData = generateEmptyParcialData(cedula);
        if (!emptyData) return alert('Cédula no encontrada');
        await _fbDb.collection('students').doc(cedula).set(emptyData);
        localStorage.removeItem(`maintpro_${cedula}`);
        localStorage.removeItem(`${PARCIAL_STORAGE_FLAG}_${cedula}`);
        await _fbDb.collection(PARCIAL_COLLECTION).doc(cedula).delete().catch(()=>{});
        alert(`✅ Datos reseteados y desbloqueado: ${cedula}`);
    };

    // ══════════════════════════════════════════════
    //  PDF GENERATION
    // ══════════════════════════════════════════════
    function generateParcialPDF(cedula, nombre) {
        if (!store) return null;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'letter');
        const company = store.getCurrentCompany();
        const assets = store.getAssets();
        const plans = store.getPreventivePlans();
        const wos = store.getWorkOrders();
        const personnel = store.getPersonnel();
        const inventory = store.getInventory();
        const margin = 15, pageW = 216;
        let y = 15;

        // Header
        doc.setFillColor(26, 35, 50);
        doc.rect(0, 0, pageW, 35, 'F');
        doc.setTextColor(255);
        doc.setFontSize(18); doc.setFont('helvetica', 'bold');
        doc.text('MaintPro CMMS — Parcial Segundo Corte', margin, 15);
        doc.setFontSize(10); doc.setFont('helvetica', 'normal');
        doc.text(`Estudiante: ${nombre}  |  C.C.: ${cedula}`, margin, 23);
        doc.text(`Empresa: ${company?.name || '—'}  |  Sector: ${company?.sector || '—'}`, margin, 29);
        doc.text(`Fecha: ${new Date().toLocaleString('es-CO', {timeZone:'America/Bogota'})}`, pageW - margin - 70, 29);
        y = 42; doc.setTextColor(0);

        // Summary bar
        doc.setFillColor(240, 245, 255);
        doc.rect(margin, y, pageW - 2*margin, 14, 'F');
        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text(`Resumen: ${assets.length} activos | ${personnel.length} técnicos | ${plans.length} planes PM | ${wos.length} OTs | ${inventory.length} ítems`, margin + 3, y + 9);
        y += 20;

        // Helper: add section table
        function addSection(title, color, headers, rows) {
            if (rows.length === 0) return;
            if (y > 230) { doc.addPage(); y = 15; }
            doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(...color);
            doc.text(title, margin, y); y += 4; doc.setTextColor(0);
            doc.autoTable({
                startY: y, head: [headers], body: rows, theme:'grid',
                styles:{fontSize:7,cellPadding:2},
                headStyles:{fillColor:color,textColor:255,fontSize:7},
                margin:{left:margin,right:margin}
            });
            y = doc.lastAutoTable.finalY + 8;
        }

        addSection('1. Activos Registrados', [59,130,246],
            ['Código','Nombre','Categoría','Marca/Modelo','Criticidad','Ubicación'],
            assets.map(a => [a.code||'—',a.name,a.category||'—',`${a.brand||''} ${a.model||''}`,a.criticality||'—',a.location||'—']));

        addSection('2. Personal Técnico', [6,182,212],
            ['Nombre','Rol','Especialidad','Turno'],
            personnel.map(p => [p.name,p.role||'—',p.specialization||'—',p.shift||'—']));

        addSection('3. Planes Preventivos', [16,185,129],
            ['Plan','Equipo','Frecuencia','Actividades','Técnico'],
            plans.map(p => {
                const a=store.getAsset(p.assetId); const t=store.getPersonnelById(p.assignedTo);
                return [p.name,a?.name||'—',`${p.frequency} ${p.frequencyUnit||'días'}`,(p.tasks||'').replace(/\|/g,', ').substring(0,80),t?.name||'—'];
            }));

        addSection('4. Órdenes de Trabajo', [249,115,22],
            ['ID','Tipo','Prioridad','Equipo','Descripción','Técnico','Estado'],
            wos.map(w => {
                const a=store.getAsset(w.assetId); const t=store.getPersonnelById(w.assignedTo);
                return ['#'+(w.id||'').substring(0,6).toUpperCase(),w.type||'—',w.priority||'—',a?.name||'—',(w.description||'—').substring(0,50),t?.name||'—',w.status||'—'];
            }));

        addSection('5. Inventario', [139,92,246],
            ['Código','Repuesto','Cantidad','Stock Mín.','Proveedor'],
            inventory.map(i => [i.code||'—',i.name,`${i.quantity} ${i.unit||''}`,i.minStock||'—',i.supplier||'—']));

        // Footer
        const pages = doc.internal.getNumberOfPages();
        for (let i=1;i<=pages;i++) {
            doc.setPage(i); doc.setFontSize(7); doc.setTextColor(150);
            doc.text(`MaintPro CMMS — UNIPAZ TOSEM 2026 — Parcial — Pág ${i}/${pages}`, margin, 275);
        }
        return doc;
    }

    // ── Send PDF to Drive ──
    async function sendPDFToDrive(doc, cedula, nombre) {
        try {
            const pdfBase64 = doc.output('datauristring').split(',')[1];
            const company = store?.getCurrentCompany();
            const kpis = store?.getKPIs() || {};
            await fetch(SHEET_URL, {
                method:'POST', mode:'no-cors',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify({
                    tipo:'PARCIAL_PDF', cedula, nombre, pdfBase64,
                    sector:company?.sector||'', empresa:company?.name||'',
                    totalAssets:kpis.totalAssets||0, totalPM:kpis.totalPlans||0,
                    totalOTs:kpis.totalWOs||0, closedOTs:kpis.completedWOs||0
                })
            });
            return true;
        } catch(e) { return false; }
    }

    // ══════════════════════════════════════════════
    //  UI INJECTION
    // ══════════════════════════════════════════════
    function injectParcialButton() {
        if (!isParcialMode() || auth.isAdmin()) return;
        const sidebar = document.querySelector('.sidebar-footer');
        if (!sidebar || document.getElementById('btnEnviarParcial')) return;

        const btn = document.createElement('button');
        btn.id = 'btnEnviarParcial';
        btn.style.cssText = 'width:100%;margin-top:8px;background:linear-gradient(135deg,#10b981,#06b6d4);color:#fff;font-weight:800;font-size:0.85rem;padding:12px;border:none;border-radius:10px;cursor:pointer;font-family:Inter,sans-serif;animation:pulse 2s infinite';
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> 📄 Enviar Parcial CMMS';
        btn.addEventListener('click', handleEnviarParcial);
        sidebar.prepend(btn);
    }

    function injectParcialBanner(targetEl) {
        if (!isParcialMode() || auth.isAdmin() || !targetEl || targetEl.querySelector('#parcialBanner')) return;
        const banner = document.createElement('div');
        banner.id = 'parcialBanner';
        banner.style.cssText = 'background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(6,182,212,0.08));border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:16px 20px;margin-bottom:16px';
        banner.innerHTML = `
            <h3 style="color:#10b981;margin:0 0 8px;font-size:0.95rem">📋 Parcial — Parte 2: Práctica CMMS (60 pts)</h3>
            <p style="color:#f97316;font-size:0.82rem;margin:0 0 8px;font-weight:700">⚠️ Su CMMS está vacío. Debe construir TODO el sistema desde cero.</p>
            <ol style="color:#94a3b8;font-size:0.82rem;line-height:1.8;margin:0;padding-left:18px">
                <li><b>Registre 5 activos/equipos</b> de su sector con ficha técnica completa (15 pts)</li>
                <li><b>Registre 5 técnicos</b> con especialidad y turno (5 pts)</li>
                <li><b>Cree 1 plan preventivo por cada equipo</b> (5 planes) con al menos 3 tareas preventivas c/u (20 pts)</li>
                <li><b>Cree 1 OT correctiva por cada equipo</b> (5 OTs) por detección de avería de un técnico (20 pts)</li>
            </ol>
            <p style="color:#64748b;font-size:0.75rem;margin:8px 0 0">Al terminar → <b>"Enviar Parcial CMMS"</b> en el menú lateral.</p>`;
        targetEl.prepend(banner);
    }

    // ── Handle submit ──
    async function handleEnviarParcial() {
        const session = auth.getSession();
        if (!session?.cedula) return;
        const cedula = session.cedula;
        const student = getStudentByCedula(cedula);
        const nombre = student ? student.nombre : 'Desconocido';

        if (await checkParcialLock(cedula)) {
            alert('⚠️ Ya enviaste el parcial CMMS. Solo 1 envío.');
            return;
        }

        const kpis = store.getKPIs();
        const w = [];
        if (kpis.totalAssets < 5) w.push(`Solo ${kpis.totalAssets} activos (se requieren 5)`);
        if (kpis.totalPersonnel < 5) w.push(`Solo ${kpis.totalPersonnel} técnicos (se requieren 5)`);
        if (kpis.totalPlans < 5) w.push(`Solo ${kpis.totalPlans} planes PM (se requieren 5)`);
        if (kpis.totalWOs < 5) w.push(`Solo ${kpis.totalWOs} OTs (se requieren 5)`);

        let msg = '¿Enviar el parcial?\n⚠️ SOLO PUEDE ENVIAR UNA VEZ.';
        if (w.length) msg += '\n\nADVERTENCIAS:\n• ' + w.join('\n• ');
        if (!confirm(msg)) return;

        const btn = document.getElementById('btnEnviarParcial');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

        try {
            const doc = generateParcialPDF(cedula, nombre);
            if (!doc) throw new Error('Error PDF');
            doc.save(`parcial_cmms_${cedula}.pdf`);
            btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Enviando...';
            await sendPDFToDrive(doc, cedula, nombre);
            await setParcialLock(cedula, nombre);
            btn.innerHTML = '✅ Parcial Enviado';
            btn.style.background = '#10b981';
            btn.style.animation = 'none';
            if (window.app) window.app.toast('✅ ¡Parcial enviado!', 'success');
            alert('✅ ¡Parcial enviado!\nPDF guardado en Drive y descargado.');
        } catch(e) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> 📄 Enviar Parcial CMMS';
            alert('❌ Error: ' + e.message);
        }
    }

    // ── Hook app lifecycle ──
    const _origShowApp = App.prototype.showApp;
    App.prototype.showApp = function() {
        _origShowApp.call(this);
        setTimeout(injectParcialButton, 500);
    };

    const _origNavigate = App.prototype.navigate;
    App.prototype.navigate = function(view) {
        _origNavigate.call(this, view);
        if (view === 'dashboard' && isParcialMode() && !auth.isAdmin()) {
            setTimeout(() => {
                const el = document.getElementById('view-dashboard');
                if (el) injectParcialBanner(el);
            }, 300);
        }
    };

    // ── Lock check on login ──
    if (isParcialMode()) {
        const _origLogin = auth.login;
        auth.login = function(identifier, password) {
            const result = _origLogin.call(this, identifier, password);
            if (result.success && result.type !== 'admin') {
                checkParcialLock(result.student.cedula).then(locked => {
                    if (locked) {
                        const ov = document.createElement('div');
                        ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,14,23,.98);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#f1f5f9;font-family:Inter,sans-serif';
                        ov.innerHTML = `<div style="font-size:4rem;margin-bottom:16px">🔒</div>
                            <h1 style="color:#ef4444;font-size:1.8rem;margin-bottom:8px">Parcial Ya Enviado</h1>
                            <p style="color:#94a3b8;max-width:400px;text-align:center">La cédula <b>${result.student.cedula}</b> ya envió el parcial.</p>`;
                        document.body.appendChild(ov);
                    }
                });
            }
            return result;
        };
    }

    console.info(`[MaintPro] Módulo Parcial v3. Modo: ${isParcialMode() ? '🟢 ACTIVO — CMMS en CERO' : '⚪ inactivo'}`);
    console.info('[MaintPro] Admin: unlockParcialTeoria("cc"), unlockParcialCMMS("cc"), resetParcialData("cc")');
})();
