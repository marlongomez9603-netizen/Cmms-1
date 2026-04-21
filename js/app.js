/* ============================================
   MaintPro CMMS v4.0 — Main Application
   Roles: Estudiante/Jefe · Técnico · Docente
   ============================================ */
class App {
    constructor() {
        this.currentView = 'dashboard';
        this.charts = {};
        this.calendarDate = new Date();
        this.techWeekOffset = 0;
        this.viewingAssetId = null;
        this.technicianMode = false;
        this.init();
    }

    init() {
        if (auth.isLoggedIn()) {
            const cedula = auth.getCurrentCedula();
            if (cedula) { initStore(cedula); this.showApp(); }
            else if (auth.isAdmin()) { this.showApp(); }
        } else { this.showLogin(); }
    }

    // ========== LOGIN ==========
    showLogin() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
        const form = document.getElementById('loginForm');
        const errorEl = document.getElementById('loginError');
        errorEl.style.display = 'none';
        form.onsubmit = (e) => {
            e.preventDefault();
            const identifier = document.getElementById('loginIdentifier').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            const result = auth.login(identifier, password);
            if (result.success) {
                errorEl.style.display = 'none';
                if (result.type === 'admin') { this.showApp(); }
                else { initStore(result.student.cedula); this.showApp(); }
            } else {
                errorEl.textContent = result.message; errorEl.style.display = 'block';
                document.getElementById('loginIdentifier').classList.add('input-error');
                setTimeout(() => document.getElementById('loginIdentifier').classList.remove('input-error'), 1500);
            }
        };
    }

    showApp() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'flex';
        this.setupSidebar();
        this.bindNav();
        this.setupNotificationBell();
        if (auth.isAdmin() && !auth.getCurrentCedula()) {
            this.navigate('adminRanking');
        } else {
            this.navigate('dashboard');
        }
    }

    setupSidebar() {
        const userInfo = document.getElementById('userInfo');
        const adminSelector = document.getElementById('adminStudentSelector');
        const btnTech = document.getElementById('btnTechMode');

        if (auth.isAdmin()) {
            userInfo.innerHTML = `<div class="user-avatar admin"><i class="fas fa-user-shield"></i></div><div><div class="user-name">Administrador</div><div class="user-role">Modo Docente</div></div>`;
            adminSelector.style.display = 'block';
            btnTech.style.display = 'none';
            const sel = document.getElementById('adminStudentSelect');
            sel.innerHTML = '<option value="">— Ranking General —</option>' +
                STUDENTS.map(s => `<option value="${s.cedula}" ${auth.getCurrentCedula() === s.cedula ? 'selected' : ''}>${s.nombre}</option>`).join('');
            sel.onchange = () => {
                if (sel.value) {
                    auth.adminViewStudent(sel.value);
                    initStore(sel.value);
                    this.navigate('dashboard');
                } else {
                    // Back to ranking
                    this.navigate('adminRanking');
                }
            };
        } else {
            const session = auth.getSession();
            const student = getStudentByCedula(session.cedula);
            const nombre = student ? student.nombre.split(',').reverse().join(' ').trim() : session.nombre;
            const sector = getStudentSector(session.cedula);
            userInfo.innerHTML = `<div class="user-avatar student">${nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}</div><div><div class="user-name">${nombre}</div><div class="user-role">${sector.name}</div></div>`;
            adminSelector.style.display = 'none';

            // Show technician toggle for students
            btnTech.style.display = 'block';
            btnTech.onclick = () => this.toggleTechnicianMode();
        }
        document.getElementById('btnLogout').onclick = () => {
            auth.logout(); store = null; this.technicianMode = false; this.showLogin();
        };
    }

    toggleTechnicianMode() {
        this.technicianMode = !this.technicianMode;
        const btn = document.getElementById('btnTechMode');
        const nav = document.querySelector('.sidebar-nav');
        if (this.technicianMode) {
            btn.innerHTML = '<i class="fas fa-user-tie"></i> Vista Jefe';
            btn.classList.add('btn-tech-active');
            // Hide admin nav items
            nav.querySelectorAll('.nav-item').forEach(n => n.style.display = 'none');
            nav.querySelectorAll('.nav-section-title').forEach(n => n.style.display = 'none');
            this.navigate('technician');
        } else {
            btn.innerHTML = '<i class="fas fa-hard-hat"></i> Vista Técnico';
            btn.classList.remove('btn-tech-active');
            nav.querySelectorAll('.nav-item').forEach(n => n.style.display = '');
            nav.querySelectorAll('.nav-section-title').forEach(n => n.style.display = '');
            this.navigate('dashboard');
        }
    }

    // ---- Navigation ----
    bindNav() {
        document.querySelectorAll('.nav-item[data-view]').forEach(item =>
            item.addEventListener('click', () => this.navigate(item.dataset.view))
        );
    }

    navigate(view) {
        document.getElementById('sidebar').classList.remove('open');
        if (!store && view !== 'adminRanking') {
            if (auth.isAdmin()) { this.navigate('adminRanking'); return; }
            return;
        }
        this.currentView = view;
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-view="${view}"]`);
        if (activeNav) activeNav.classList.add('active');
        document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
        const section = document.getElementById(`view-${view}`);
        if (section) { section.classList.add('active'); section.innerHTML = ''; }
        const titles = {
            dashboard: 'Dashboard', assets: 'Activos / Equipos',
            workorders: 'Órdenes de Trabajo', preventive: 'Mantenimiento Preventivo',
            inventory: 'Inventario de Repuestos', personnel: 'Personal Técnico',
            reports: 'Reportes y KPIs', calendar: 'Calendario de Mantenimiento',
            purchases: 'Compras y Proveedores', assetDetail: 'Historial del Equipo',
            technician: '🪖 Vista Operativa — Técnico', adminRanking: '🎓 Centro de Control Docente'
        };
        const topTitle = document.getElementById('topbarTitle');
        if (topTitle) topTitle.textContent = titles[view] || '';
        const companyLabel = document.getElementById('topbarCompany');
        if (companyLabel && store) { const c = store.getCurrentCompany(); companyLabel.textContent = c ? c.name : ''; }
        const renders = {
            dashboard: () => this.renderDashboard(),
            assets: () => this.renderAssets(),
            workorders: () => this.renderWorkOrders(),
            preventive: () => this.renderPreventive(),
            inventory: () => this.renderInventory(),
            personnel: () => this.renderPersonnel(),
            reports: () => this.renderReports(),
            calendar: () => this.renderCalendar(),
            purchases: () => this.renderPurchases(),
            assetDetail: () => this.renderAssetDetail(),
            technician: () => this.renderTechnicianView(),
            adminRanking: () => this.renderAdminRanking()
        };
        if (renders[view]) renders[view]();
        if (store) this.updateBadges();
        if (store) this.checkInjectedAlerts();
    }

    updateBadges() {
        if (!store) return;
        const k = store.getKPIs();
        const badges = {
            badgePendingWOs: k.pendingWOs,
            badgeOverduePMs: k.overduePMs,
            badgeLowStock: k.lowStockCount,
            badgePendingPurchases: k.pendingPurchases + k.pendingManagerPurchases
        };
        Object.entries(badges).forEach(([id, val]) => {
            const b = document.getElementById(id);
            if (b) { b.textContent = val; b.style.display = val > 0 ? '' : 'none'; }
        });
        // Notification bell badge
        const notifBadge = document.getElementById('notifBadge');
        if (notifBadge && store) {
            const cnt = store.getUnreadCount ? store.getUnreadCount() : 0;
            notifBadge.textContent = cnt;
            notifBadge.style.display = cnt > 0 ? '' : 'none';
        }
    }

    checkInjectedAlerts() {
        if (!store) return;
        const alerts = store.getUnseenAlerts ? store.getUnseenAlerts() : [];
        let bar = document.getElementById('injectedAlertBar');
        if (alerts.length === 0) { if (bar) bar.remove(); return; }
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'injectedAlertBar';
            bar.className = 'alert-bar alert-injected';
            document.getElementById('content').prepend(bar);
        }
        bar.innerHTML = alerts.map(a =>
            `<div class="injected-alert-item"><i class="fas fa-bolt"></i> ${a.message}
             <button class="btn btn-sm" style="margin-left:auto;padding:2px 10px;font-size:0.75rem" data-dismiss="${a.id}">Entendido</button></div>`
        ).join('');
        bar.querySelectorAll('[data-dismiss]').forEach(b => b.addEventListener('click', () => {
            store.markAlertSeen(b.dataset.dismiss);
            this.checkInjectedAlerts();
        }));
    }

    toast(msg, type = 'success') {
        const c = document.getElementById('toastContainer');
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        const icons = { success: 'fa-check-circle', danger: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
        t.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${msg}</span>`;
        c.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3500);
    }

    // ---- Helpers ----
    getAssetName(id) { const a = store?.getAsset(id); return a ? a.name : 'N/A'; }
    getPersonName(id) { const p = store?.getPersonnelById(id); return p ? p.name : 'Sin asignar'; }
    fmtDate(d) { if (!d) return '—'; try { return new Date(d + 'T12:00:00').toLocaleDateString('es-CO'); } catch { return d; } }
    fmtMoney(v) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0); }
    statusBadge(s) {
        const m = {
            operativo: ['success', 'Operativo'], en_mantenimiento: ['warning', 'En Mtto'],
            fuera_de_servicio: ['danger', 'Fuera de Servicio'], pendiente: ['warning', 'Pendiente'],
            en_progreso: ['info', 'En Progreso'], completada: ['success', 'Completada'],
            cancelada: ['muted', 'Cancelada'], activo: ['success', 'Activo'], inactivo: ['muted', 'Inactivo'],
            aprobada: ['info', 'Aprobada'], recibida: ['success', 'Recibida'],
            pendiente_gerencia: ['danger', 'Aprobación Gerencia']
        };
        const [cls, label] = m[s] || ['muted', s];
        return `<span class="badge badge-${cls} badge-dot">${label}</span>`;
    }
    priorityBadge(p) {
        const m = { critica: ['critical', 'Crítica'], alta: ['high', 'Alta'], media: ['medium', 'Media'], baja: ['low', 'Baja'] };
        const [cls, label] = m[p] || ['medium', p];
        return `<span class="badge priority-${cls}">${label}</span>`;
    }
    criticalityHTML(c) {
        const cls = c === 'alta' ? 'alta' : c === 'media' ? 'media' : 'baja';
        return `<span class="criticality criticality-${cls}"><span class="criticality-dot"></span>${c.charAt(0).toUpperCase() + c.slice(1)}</span>`;
    }

    // ---- Modal ----
    showModal(title, bodyHTML, onSave) {
        const ov = document.getElementById('modalOverlay');
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = bodyHTML;
        const saveBtn = document.getElementById('modalSave');
        const newBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newBtn, saveBtn);
        newBtn.id = 'modalSave';
        if (onSave) { newBtn.style.display = ''; newBtn.addEventListener('click', () => onSave()); }
        else { newBtn.style.display = 'none'; }
        ov.classList.add('active');
        document.getElementById('modalClose').onclick = () => { newBtn.style.display = ''; ov.classList.remove('active'); };
        document.getElementById('modalCancel').onclick = () => { newBtn.style.display = ''; ov.classList.remove('active'); };
    }
    closeModal() { document.getElementById('modalSave').style.display = ''; document.getElementById('modalOverlay').classList.remove('active'); }
    confirmAction(msg, onConfirm) {
        this.showModal('Confirmar Acción',
            `<div class="confirm-message"><i class="fas fa-exclamation-triangle"></i><h3>¿Estás seguro?</h3><p>${msg}</p></div>`,
            () => { onConfirm(); this.closeModal(); });
    }

    // ========================================================
    //  VISTA TÉCNICO OPERATIVO
    // ========================================================
    renderTechnicianView() {
        const el = document.getElementById('view-technician');
        const personnel = store.getPersonnel().filter(p => p.status === 'activo');
        const wos = store.getWorkOrders();

        el.innerHTML = `
        <div class="tech-mode-banner">
            <i class="fas fa-hard-hat"></i>
            <div>
                <strong>Modo T\u00e9cnico Operativo</strong>
                <span>Selecciona tu perfil para ver tus tareas asignadas</span>
            </div>
        </div>

        <!-- View tabs -->
        <div class="tech-view-tabs">
            <button class="tech-tab tech-tab-active" id="tabMisTareas"><i class="fas fa-clipboard-list"></i> Mis Tareas</button>
            <button class="tech-tab" id="tabCalendario"><i class="fas fa-calendar-week"></i> Calendario Semanal</button>
        </div>

        <!-- Tab: Tasks -->
        <div id="techTabTasks">
            <div class="card" style="margin-bottom:20px">
                <div class="card-header"><div class="card-title"><i class="fas fa-users"></i> Seleccionar T\u00e9cnico</div></div>
                <div class="tech-selector-grid">
                    ${personnel.map(p => `
                    <div class="tech-selector-card" data-tech="${p.id}">
                        <div class="tech-avatar">${p.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                        <div class="tech-name">${p.name}</div>
                        <div class="tech-role">${p.role}</div>
                        <div class="tech-tasks">${wos.filter(w => w.assignedTo === p.id && (w.status === 'pendiente' || w.status === 'en_progreso')).length} tareas pendientes</div>
                    </div>`).join('')}
                </div>
            </div>
            <div id="techTaskArea"></div>
        </div>

        <!-- Tab: Weekly Calendar -->
        <div id="techTabCalendar" style="display:none">
            <div id="techWeekArea"></div>
        </div>

        <!-- Sticky report button -->
        <div class="tech-report-bar" id="techReportBar">
            <button class="btn btn-danger btn-lg" id="btnReportFault">
                <i class="fas fa-triangle-exclamation"></i> Reportar Aver\u00eda en Equipo
            </button>
        </div>`;

        // Tab switching
        document.getElementById('tabMisTareas').addEventListener('click', () => {
            document.getElementById('tabMisTareas').classList.add('tech-tab-active');
            document.getElementById('tabCalendario').classList.remove('tech-tab-active');
            document.getElementById('techTabTasks').style.display = '';
            document.getElementById('techTabCalendar').style.display = 'none';
            document.getElementById('techReportBar').style.display = '';
        });

        document.getElementById('tabCalendario').addEventListener('click', () => {
            document.getElementById('tabMisTareas').classList.remove('tech-tab-active');
            document.getElementById('tabCalendario').classList.add('tech-tab-active');
            document.getElementById('techTabTasks').style.display = 'none';
            document.getElementById('techTabCalendar').style.display = '';
            document.getElementById('techReportBar').style.display = 'none';
            this.techWeekOffset = 0;
            this.renderTechWeeklyCalendar(this._selectedTech);
        });

        // Technician selector
        el.querySelectorAll('.tech-selector-card').forEach(card => {
            card.addEventListener('click', () => {
                el.querySelectorAll('.tech-selector-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this._selectedTech = card.dataset.tech;
                this.renderTechTasks(card.dataset.tech);
                if (document.getElementById('techTabCalendar').style.display !== 'none') {
                    this.renderTechWeeklyCalendar(this._selectedTech);
                }
            });
        });

        document.getElementById('btnReportFault').addEventListener('click', () => this.showFaultReportForm());

        if (personnel.length > 0) {
            this._selectedTech = personnel[0].id;
            el.querySelector('.tech-selector-card')?.classList.add('selected');
            this.renderTechTasks(personnel[0].id);
        }
    }

    renderTechTasks(techId) {
        const area = document.getElementById('techTaskArea');
        if (!area) return;
        const tech = store.getPersonnelById(techId);
        const wos = store.getWorkOrders().filter(w => w.assignedTo === techId);
        const active = wos.filter(w => w.status === 'pendiente' || w.status === 'en_progreso');
        const completed = wos.filter(w => w.status === 'completada').slice(0, 3);

        area.innerHTML = `
        <div class="card-header" style="margin-bottom:16px">
            <div class="card-title">
                <i class="fas fa-clipboard-list"></i> 
                Tareas de <strong>${tech?.name || '—'}</strong>
                <span class="badge badge-info" style="margin-left:8px">${active.length} activas</span>
            </div>
        </div>

        ${active.length === 0 ? `
        <div class="tech-empty-tasks">
            <i class="fas fa-circle-check" style="font-size:3rem;color:var(--success);margin-bottom:12px"></i>
            <h3>¡Sin tareas pendientes!</h3>
            <p>Este técnico no tiene órdenes de trabajo asignadas actualmente.</p>
        </div>` : `
        <div class="tech-task-grid">
            ${active.map(w => this.renderTechTaskCard(w)).join('')}
        </div>`}

        ${completed.length > 0 ? `
        <div style="margin-top:24px">
            <div class="card-title" style="margin-bottom:12px;font-size:0.85rem;color:var(--text-muted)"><i class="fas fa-history"></i> Últimas Completadas</div>
            <div class="tech-task-grid tech-task-grid--completed">
                ${completed.map(w => this.renderTechTaskCard(w, true)).join('')}
            </div>
        </div>` : ''}`;

        area.querySelectorAll('[data-tech-start]').forEach(b => b.addEventListener('click', () => {
            store.updateWorkOrder(b.dataset.techStart, { status: 'en_progreso', startDate: store.today() });
            store.addLog({ action: 'wo_started', message: 'OT iniciada por técnico: ' + b.dataset.techStart.substring(0, 8).toUpperCase() });
            this.toast('¡Tarea iniciada!', 'info');
            this.renderTechTasks(this._selectedTech);
        }));
        area.querySelectorAll('[data-tech-complete]').forEach(b => b.addEventListener('click', () => {
            this.showCompleteWOModal(b.dataset.techComplete, () => this.renderTechTasks(this._selectedTech));
        }));
        area.querySelectorAll('[data-tech-view]').forEach(b => b.addEventListener('click', () => {
            this.viewingAssetId = b.dataset.techView;
            this.toggleTechnicianMode();
            this.navigate('assetDetail');
        }));
    }

    renderTechTaskCard(w, isCompleted = false) {
        const asset = store.getAsset(w.assetId);
        const typeColor = { correctivo: 'danger', preventivo: 'success', predictivo: 'info', mejora: 'warning' };
        const typeLabels = { correctivo: 'Correctivo', preventivo: 'Preventivo', predictivo: 'Predictivo', mejora: 'Mejora' };
        const injectedBadge = w.injected ? `<span class="badge badge-danger" style="margin-left:4px;animation:pulse 1s infinite">⚡ URGENTE</span>` : '';

        return `
        <div class="tech-task-card ${w.status === 'en_progreso' ? 'tech-task-card--active' : ''} ${isCompleted ? 'tech-task-card--done' : ''}">
            ${w.status === 'en_progreso' ? '<div class="tech-task-progress-bar"></div>' : ''}
            <div class="tech-task-header">
                <span class="badge badge-${typeColor[w.type] || 'info'}">${typeLabels[w.type] || w.type}</span>
                ${this.priorityBadge(w.priority)} ${injectedBadge}
                <span class="tech-task-id">#${w.id.substring(0, 6).toUpperCase()}</span>
            </div>
            <div class="tech-task-asset">
                <i class="fas fa-cog"></i>
                <strong>${asset ? asset.name : 'Equipo desconocido'}</strong>
                ${asset ? `<span style="font-size:0.75rem;color:var(--text-muted)">${asset.location}</span>` : ''}
            </div>
            <div class="tech-task-desc">${w.description || '—'}</div>
            <div class="tech-task-meta">
                <span><i class="fas fa-clock"></i> Est: ${w.estimatedHours || '—'}h</span>
                <span><i class="fas fa-calendar"></i> ${this.fmtDate(w.createdDate)}</span>
            </div>
            ${!isCompleted ? `
            <div class="tech-task-actions">
                ${w.status === 'pendiente' ? `<button class="btn btn-warning" data-tech-start="${w.id}"><i class="fas fa-play"></i> Iniciar</button>` : ''}
                ${w.status === 'en_progreso' ? `<button class="btn btn-success" data-tech-complete="${w.id}"><i class="fas fa-check"></i> Completar</button>` : ''}
                ${asset ? `<button class="btn btn-secondary" data-tech-view="${w.assetId}"><i class="fas fa-file-alt"></i> Manual</button>` : ''}
            </div>` : `<div class="tech-task-actions"><span style="color:var(--success)"><i class="fas fa-check-circle"></i> Completada el ${this.fmtDate(w.completedDate)}</span></div>`}
        </div>`;
    }

    showFaultReportForm() {
        const assets = store.getAssets();
        const html = `
        <div class="fault-report-header"><i class="fas fa-triangle-exclamation"></i><p>Reporta una avería para que el jefe de mantenimiento gestione una OT correctiva.</p></div>
        <div class="form-group"><label class="form-label">Equipo Afectado <span class="required">*</span></label>
            <select class="form-control" id="fFaultAsset">
                <option value="">Seleccionar equipo...</option>
                ${assets.map(a => `<option value="${a.id}">${a.code} — ${a.name} (${a.location})</option>`).join('')}
            </select>
        </div>
        <div class="form-group"><label class="form-label">Descripción de la Avería <span class="required">*</span></label>
            <textarea class="form-control" id="fFaultDesc" rows="3" placeholder="Describe qué síntomas observas (ruido, parada, vibración, temperatura...)"></textarea>
        </div>
        <div class="form-row">
            <div class="form-group"><label class="form-label">Severidad</label>
                <select class="form-control" id="fFaultSeverity">
                    <option value="baja">Baja — El equipo funciona con limitaciones</option>
                    <option value="media">Media — Funciona pero con riesgo</option>
                    <option value="alta">Alta — Parada inminente</option>
                    <option value="critica" selected>Crítica — Equipo detenido</option>
                </select>
            </div>
            <div class="form-group"><label class="form-label">Reportado por</label>
                <select class="form-control" id="fFaultTech">
                    <option value="">— Anónimo —</option>
                    ${store.getPersonnel().map(p => `<option value="${p.id}" ${p.id === this._selectedTech ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>
            </div>
        </div>`;
        this.showModal('🚨 Reportar Avería', html, () => {
            const assetId = document.getElementById('fFaultAsset').value;
            const desc = document.getElementById('fFaultDesc').value;
            if (!assetId || !desc) { this.toast('Equipo y descripción son obligatorios', 'danger'); return; }
            const priority = document.getElementById('fFaultSeverity').value;
            const techId = document.getElementById('fFaultTech').value;
            store.addWorkOrder({
                assetId, type: 'correctivo', priority, status: 'pendiente',
                description: `🔧 REPORTE DE TÉCNICO: ${desc}`,
                assignedTo: techId || null, createdDate: store.today(),
                estimatedHours: '2', reportedByTech: true
            });
            store.updateAsset(assetId, { status: priority === 'critica' ? 'fuera_de_servicio' : 'en_mantenimiento' });
            store.addLog({ action: 'wo_created', message: `Avería reportada por técnico: ${store.getAsset(assetId)?.name}` });
            this.toast('¡Avería reportada! El jefe de mantenimiento recibirá la notificación.', 'warning');
            this.closeModal();
            this.renderTechTasks(this._selectedTech);
        });
    }

    // ========================================================
    //  ADMIN RANKING DASHBOARD (Docente)
    // ========================================================
    renderAdminRanking() {
        const el = document.getElementById('view-adminRanking');
        if (!el) return;

        // Compute KPIs for every student
        const rows = STUDENTS.map(s => {
            try {
                const tempStore = new DataStore(s.cedula);
                const k = tempStore.getKPIs();
                const preview = getStudentAssetPreview(s.cedula);
                // Score: starts at 100, deductions
                let score = 100;
                if (k.overduePMs > 0) score -= Math.min(k.overduePMs * 10, 30);
                if (k.availability < 90) score -= Math.round((90 - k.availability));
                if (k.planCompliance < 70) score -= Math.round((70 - k.planCompliance) * 0.4);
                if (k.lowStockCount > 0) score -= Math.min(k.lowStockCount * 5, 20);
                score = Math.max(score, 0);
                const grade = score >= 90 ? { label: 'Excelente', cls: 'success' } :
                    score >= 75 ? { label: 'Bueno', cls: 'info' } :
                    score >= 60 ? { label: 'Regular', cls: 'warning' } :
                    { label: 'Deficiente', cls: 'danger' };
                return { student: s, kpis: k, preview, score, grade, tempStore };
            } catch (e) { return null; }
        }).filter(Boolean).sort((a, b) => b.score - a.score);

        el.innerHTML = `
        <div class="admin-ranking-header">
            <div class="admin-ranking-icon"><i class="fas fa-user-shield"></i></div>
            <div>
                <h2>Centro de Control Docente</h2>
                <p>Vista consolidada del desempeño de todos los estudiantes · TOSEM 2026-1</p>
            </div>
            <button class="btn btn-danger btn-inject-global" id="btnInjectGlobal">
                <i class="fas fa-bolt"></i> Inyectar Avería Global
            </button>
        </div>

        <!-- Summary KPI row -->
        <div class="ranking-summary-grid">
            <div class="ranking-summary-card"><div class="rs-val">${STUDENTS.length}</div><div class="rs-label">Estudiantes</div></div>
            <div class="ranking-summary-card rs-warning"><div class="rs-val">${rows.reduce((s, r) => s + r.kpis.overduePMs, 0)}</div><div class="rs-label">PMs Vencidos (Total)</div></div>
            <div class="ranking-summary-card rs-success"><div class="rs-val">${rows.length > 0 ? (rows.reduce((s, r) => s + r.kpis.availability, 0) / rows.length).toFixed(1) : 0}%</div><div class="rs-label">Disponibilidad Prom.</div></div>
            <div class="ranking-summary-card rs-info"><div class="rs-val">${rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 0}</div><div class="rs-label">Score Promedio</div></div>
        </div>

        <!-- Ranking table -->
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Estudiante</th>
                        <th>Empresa / Sector</th>
                        <th>Disponib.</th>
                        <th>Cumpl. PM</th>
                        <th>PM Vencidos</th>
                        <th>Costo Total</th>
                        <th>Score</th>
                        <th>Acciones Docente</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map((r, i) => `
                    <tr class="ranking-row ${r.grade.cls === 'danger' ? 'ranking-row--alert' : ''}">
                        <td><div class="rank-badge rank-${i + 1 <= 3 ? i + 1 : 'rest'}">${i + 1}</div></td>
                        <td>
                            <div style="display:flex;align-items:center;gap:10px">
                                <div class="avatar avatar-primary">${r.student.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                                <div>
                                    <div style="font-weight:600">${r.student.nombre.split(',').reverse().join(' ').trim()}</div>
                                    <div style="font-size:0.72rem;color:var(--text-muted)">C.C. ${r.student.cedula}</div>
                                </div>
                            </div>
                        </td>
                        <td>${r.preview.company}<br><span style="font-size:0.72rem;color:var(--text-muted)">${r.preview.sector}</span></td>
                        <td>
                            <div style="display:flex;align-items:center;gap:8px">
                                <strong style="color:${r.kpis.availability >= 90 ? 'var(--success)' : r.kpis.availability >= 75 ? 'var(--warning)' : 'var(--danger)'}">${r.kpis.availability}%</strong>
                            </div>
                            <div class="progress-bar" style="width:80px;margin-top:4px"><div class="progress-fill ${r.kpis.availability >= 90 ? 'fill-success' : r.kpis.availability >= 75 ? 'fill-warning' : 'fill-danger'}" style="width:${r.kpis.availability}%"></div></div>
                        </td>
                        <td><strong style="color:${r.kpis.planCompliance >= 80 ? 'var(--success)' : r.kpis.planCompliance >= 50 ? 'var(--warning)' : 'var(--danger)'}">${r.kpis.planCompliance}%</strong></td>
                        <td>${r.kpis.overduePMs > 0 ? `<span class="badge badge-danger">${r.kpis.overduePMs} vencido${r.kpis.overduePMs > 1 ? 's' : ''}</span>` : '<span style="color:var(--success)"><i class="fas fa-check-circle"></i> Al día</span>'}</td>
                        <td style="font-size:0.82rem">${this.fmtMoney(r.kpis.totalCost)}</td>
                        <td>
                            <div class="score-display">
                                <div class="score-value score-${r.grade.cls}">${r.score}</div>
                                <div class="score-label badge badge-${r.grade.cls}">${r.grade.label}</div>
                            </div>
                        </td>
                        <td>
                            <div class="action-btns">
                                <button class="btn btn-sm btn-secondary" data-view-student="${r.student.cedula}" data-tooltip="Ver Dashboard">
                                    <i class="fas fa-eye"></i> Ver
                                </button>
                                <button class="btn btn-sm btn-danger" data-inject-student="${r.student.cedula}" data-tooltip="Inyectar Falla">
                                    <i class="fas fa-bolt"></i>
                                </button>
                                ${r.kpis.pendingManagerPurchases > 0 ? `
                                <button class="btn btn-sm btn-warning" data-approve-student="${r.student.cedula}" data-tooltip="Aprobar Compras">
                                    <i class="fas fa-check-double"></i> ${r.kpis.pendingManagerPurchases}
                                </button>` : ''}
                            </div>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>

        <div style="margin-top:12px;font-size:0.75rem;color:var(--text-muted);text-align:center">
            <i class="fas fa-info-circle"></i> Score basado en: Disponibilidad (30%), Cumplimiento PM (25%), PMs vencidos (-10c/u), Stock bajo (-5c/u). Umbral aprobación de compras: ${this.fmtMoney(1000000)}.
        </div>`;

        // Bind view student
        el.querySelectorAll('[data-view-student]').forEach(b => b.addEventListener('click', () => {
            const cedula = b.dataset.viewStudent;
            auth.adminViewStudent(cedula);
            initStore(cedula);
            document.getElementById('adminStudentSelect').value = cedula;
            this.navigate('dashboard');
        }));

        // Bind inject fault (per student)
        el.querySelectorAll('[data-inject-student]').forEach(b => b.addEventListener('click', () => {
            this.showInjectFaultModal(b.dataset.injectStudent);
        }));

        // Bind approve purchases (per student)
        el.querySelectorAll('[data-approve-student]').forEach(b => b.addEventListener('click', () => {
            this.showManagerApprovalsModal(b.dataset.approveStudent);
        }));

        // Global inject (random)
        document.getElementById('btnInjectGlobal').addEventListener('click', () => {
            const r = rows[Math.floor(Math.random() * rows.length)];
            this.showInjectFaultModal(r.student.cedula);
        });
    }

    showInjectFaultModal(cedula) {
        const targetStore = new DataStore(cedula);
        const student = getStudentByCedula(cedula);
        const assets = targetStore.getAssets();
        const studentName = student ? student.nombre.split(',').reverse().join(' ').trim() : cedula;

        const html = `
        <div class="inject-fault-header">
            <i class="fas fa-bolt" style="font-size:2rem;color:var(--danger)"></i>
            <div>
                <strong>Simular Falla en: ${studentName}</strong>
                <p style="margin:0;font-size:0.82rem;color:var(--text-muted)">La OT quedará como CRÍTICA y el equipo como "Fuera de Servicio". El estudiante recibirá una alerta.</p>
            </div>
        </div>
        <div class="form-group" style="margin-top:16px"><label class="form-label">Equipo a Fallar <span class="required">*</span></label>
            <select class="form-control" id="fInjectAsset">
                <option value="">Seleccionar equipo...</option>
                ${assets.map(a => `<option value="${a.id}">${a.code} — ${a.name} (${a.status === 'operativo' ? '✅ Operativo' : '⚠️ ' + a.status})</option>`).join('')}
            </select>
        </div>
        <div class="form-group"><label class="form-label">Descripción de la Avería</label>
            <input class="form-control" id="fInjectDesc" value="Falla crítica simulada por docente — Requiere intervención inmediata">
        </div>
        <div class="form-group"><label class="form-label">Prioridad</label>
            <select class="form-control" id="fInjectPriority">
                <option value="alta">Alta</option>
                <option value="critica" selected>Crítica</option>
            </select>
        </div>`;

        this.showModal('⚡ Inyectar Avería Simulada', html, () => {
            const assetId = document.getElementById('fInjectAsset').value;
            if (!assetId) { this.toast('Selecciona un equipo', 'danger'); return; }
            const desc = document.getElementById('fInjectDesc').value;
            const priority = document.getElementById('fInjectPriority').value;
            targetStore.injectFailure(assetId, desc, priority);
            this.toast(`⚡ Avería inyectada en ${studentName}`, 'warning');
            this.closeModal();
            this.navigate('adminRanking');
        });
    }

    showManagerApprovalsModal(cedula) {
        const targetStore = new DataStore(cedula);
        const student = getStudentByCedula(cedula);
        const studentName = student ? student.nombre.split(',').reverse().join(' ').trim() : cedula;
        const pending = targetStore.getPurchases().filter(p => p.status === 'pendiente_gerencia');

        const html = `
        <div style="margin-bottom:16px"><strong>${studentName}</strong> — ${pending.length} solicitud(es) requieren aprobación (> ${this.fmtMoney(1000000)})</div>
        ${pending.map(p => `
        <div class="approval-request-card" id="appr_${p.id}">
            <div class="approval-request-header">
                <strong>${p.itemName}</strong> ${this.priorityBadge(p.priority || 'alta')}
            </div>
            <div class="approval-request-meta">
                Cantidad: ${p.quantity} · Proveedor: ${p.supplier || '—'} · Costo: <strong style="color:var(--warning)">${this.fmtMoney(p.estimatedCost)}</strong>
            </div>
            <div class="approval-request-reason">${p.reason || '—'}</div>
            <div class="approval-request-actions">
                <button class="btn btn-success btn-sm" data-approve-pur="${p.id}"><i class="fas fa-check"></i> Aprobar</button>
                <button class="btn btn-danger btn-sm" data-reject-pur="${p.id}"><i class="fas fa-times"></i> Rechazar</button>
            </div>
        </div>`).join('')}`;

        this.showModal('✅ Aprobación de Compras — Gerencia', html, null);

        document.querySelectorAll('[data-approve-pur]').forEach(b => b.addEventListener('click', () => {
            targetStore.updatePurchase(b.dataset.approvePur, { status: 'aprobada', approvedDate: store.today() });
            document.getElementById(`appr_${b.dataset.approvePur}`).style.opacity = '0.4';
            this.toast('Compra aprobada', 'success');
        }));
        document.querySelectorAll('[data-reject-pur]').forEach(b => b.addEventListener('click', () => {
            targetStore.updatePurchase(b.dataset.rejectPur, { status: 'cancelada' });
            document.getElementById(`appr_${b.dataset.rejectPur}`).style.opacity = '0.4';
            this.toast('Compra rechazada', 'danger');
        }));
    }

    // ========== DASHBOARD ==========
    renderDashboard() {
        const el = document.getElementById('view-dashboard');
        const k = store.getKPIs();
        const logs = store.getRecentLogs(8);
        const plans = store.getPreventivePlans();
        const today = store.today();
        const overduePlans = plans.filter(p => p.nextExecution && p.nextExecution < today && p.status === 'activo');
        const upcomingPlans = plans.filter(p => p.nextExecution && p.nextExecution >= today && p.status === 'activo')
            .sort((a, b) => a.nextExecution.localeCompare(b.nextExecution)).slice(0, 5);
        el.innerHTML = `
        ${k.overduePMs > 0 ? `<div class="alert-bar alert-danger"><i class="fas fa-exclamation-circle"></i><strong>${k.overduePMs} plan(es) preventivo(s) vencido(s)</strong> — Requieren atención inmediata</div>` : ''}
        ${k.lowStockCount > 0 ? `<div class="alert-bar alert-warning"><i class="fas fa-boxes-stacked"></i><strong>${k.lowStockCount} ítem(s) con stock bajo</strong></div>` : ''}
        ${k.pendingManagerPurchases > 0 ? `<div class="alert-bar alert-injected"><i class="fas fa-clock"></i><strong>${k.pendingManagerPurchases} compra(s) pendientes de aprobación del docente</strong> (> ${this.fmtMoney(1000000)})</div>` : ''}
        <div class="kpi-grid">
            <div class="kpi-card kpi-primary"><div class="kpi-icon"><i class="fas fa-cogs"></i></div><div class="kpi-content"><div class="kpi-label">Total Activos</div><div class="kpi-value">${k.totalAssets}</div><div class="kpi-trend up"><i class="fas fa-circle-check"></i> ${k.activeAssets} operativos</div></div></div>
            <div class="kpi-card kpi-warning"><div class="kpi-icon"><i class="fas fa-clipboard-list"></i></div><div class="kpi-content"><div class="kpi-label">OT Pendientes</div><div class="kpi-value">${k.pendingWOs}</div><div class="kpi-trend"><i class="fas fa-spinner"></i> ${k.inProgressWOs} en progreso</div></div></div>
            <div class="kpi-card kpi-success"><div class="kpi-icon"><i class="fas fa-clock"></i></div><div class="kpi-content"><div class="kpi-label">MTTR (horas)</div><div class="kpi-value">${k.mttr}</div><div class="kpi-trend">Tiempo medio de reparación</div></div></div>
            <div class="kpi-card kpi-info"><div class="kpi-icon"><i class="fas fa-calendar-days"></i></div><div class="kpi-content"><div class="kpi-label">MTBF (días)</div><div class="kpi-value">${k.mtbf}</div><div class="kpi-trend">Tiempo medio entre fallas</div></div></div>
            <div class="kpi-card kpi-primary"><div class="kpi-icon"><i class="fas fa-gauge-high"></i></div><div class="kpi-content"><div class="kpi-label">Disponibilidad</div><div class="kpi-value">${k.availability}%</div><div class="progress-bar" style="margin-top:8px"><div class="progress-fill ${k.availability >= 90 ? 'fill-success' : k.availability >= 75 ? 'fill-warning' : 'fill-danger'}" style="width:${k.availability}%"></div></div></div></div>
            <div class="kpi-card kpi-danger"><div class="kpi-icon"><i class="fas fa-triangle-exclamation"></i></div><div class="kpi-content"><div class="kpi-label">PM Vencidos</div><div class="kpi-value">${k.overduePMs}</div><div class="kpi-trend">${k.activePlans} planes activos</div></div></div>
            <div class="kpi-card kpi-success"><div class="kpi-icon"><i class="fas fa-chart-line"></i></div><div class="kpi-content"><div class="kpi-label">Cumplimiento PM</div><div class="kpi-value">${k.planCompliance}%</div><div class="progress-bar" style="margin-top:8px"><div class="progress-fill ${k.planCompliance >= 80 ? 'fill-success' : k.planCompliance >= 50 ? 'fill-warning' : 'fill-danger'}" style="width:${k.planCompliance}%"></div></div></div></div>
            <div class="kpi-card kpi-warning"><div class="kpi-icon"><i class="fas fa-coins"></i></div><div class="kpi-content"><div class="kpi-label">Costo Total Mtto</div><div class="kpi-value" style="font-size:1.2rem">${this.fmtMoney(k.totalCost)}</div><div class="kpi-trend"><i class="fas fa-users"></i> MO: ${this.fmtMoney(k.laborCost)} · <i class="fas fa-box"></i> Rep: ${this.fmtMoney(k.partsCost)}</div></div></div>
        </div>
        <div class="dashboard-charts">
            <div class="chart-card"><div class="card-title">Órdenes por Tipo</div><div class="chart-wrapper"><canvas id="chartWOType"></canvas></div></div>
            <div class="chart-card"><div class="card-title">Órdenes por Prioridad</div><div class="chart-wrapper"><canvas id="chartWOPriority"></canvas></div></div>
        </div>
        <div class="grid-2">
            <div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-clock-rotate-left"></i> Actividad Reciente</div></div>
                <ul class="recent-list">${logs.length === 0 ? '<li class="recent-item"><span class="recent-meta">Sin actividad reciente</span></li>' : logs.map(l => {
                    const icons = { wo_created: ['fa-plus', 'info'], wo_started: ['fa-play', 'warning'], wo_completed: ['fa-check', 'success'], system: ['fa-gear', 'primary'], asset_created: ['fa-cog', 'primary'], purchase_created: ['fa-cart-plus', 'info'], inventory_movement: ['fa-arrows-rotate', 'warning'], fault_injected: ['fa-bolt', 'danger'] };
                    const [ico, cls] = icons[l.action] || ['fa-circle', 'primary'];
                    return `<li class="recent-item"><div class="recent-icon" style="background:var(--${cls}-bg);color:var(--${cls})"><i class="fas ${ico}"></i></div><div class="recent-info"><div class="recent-title">${l.message}</div><div class="recent-meta">${new Date(l.timestamp).toLocaleString('es-CO')}</div></div></li>`;
                }).join('')}</ul>
            </div>
            <div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-calendar-check"></i> Próximos Mantenimientos</div></div>
                <ul class="recent-list">${[...overduePlans.map(p => `<li class="recent-item"><div class="recent-icon" style="background:var(--danger-bg);color:var(--danger)"><i class="fas fa-exclamation"></i></div><div class="recent-info"><div class="recent-title">${p.name}</div><div class="recent-meta" style="color:var(--danger)">VENCIDO: ${this.fmtDate(p.nextExecution)} · ${this.getAssetName(p.assetId)}</div></div></li>`), ...upcomingPlans.map(p => `<li class="recent-item"><div class="recent-icon" style="background:var(--primary-glow);color:var(--primary)"><i class="fas fa-wrench"></i></div><div class="recent-info"><div class="recent-title">${p.name}</div><div class="recent-meta">${this.fmtDate(p.nextExecution)} · ${this.getAssetName(p.assetId)}</div></div></li>`)].join('') || '<li class="recent-item"><span class="recent-meta">Sin mantenimientos programados</span></li>'}</ul>
            </div>
        </div>`;
        this.renderChart('chartWOType', 'doughnut', { labels: ['Correctivo', 'Preventivo', 'Predictivo', 'Mejora'], datasets: [{ data: [k.woByType.correctivo, k.woByType.preventivo, k.woByType.predictivo, k.woByType.mejora], backgroundColor: ['#ff5252', '#00e676', '#448aff', '#ffab40'], borderWidth: 0 }] });
        this.renderChart('chartWOPriority', 'bar', { labels: ['Crítica', 'Alta', 'Media', 'Baja'], datasets: [{ label: 'Cantidad', data: [k.woByPriority.critica, k.woByPriority.alta, k.woByPriority.media, k.woByPriority.baja], backgroundColor: ['#ff1744', '#ff5252', '#ffab40', '#448aff'], borderRadius: 6, borderSkipped: false }] }, { indexAxis: 'y' });
    }

    renderChart(canvasId, type, data, extra = {}) {
        const ctx = document.getElementById(canvasId); if (!ctx) return;
        if (this.charts[canvasId]) this.charts[canvasId].destroy();
        const defaults = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#9ea7c0', font: { family: 'Inter' } } } }, scales: {} };
        if (type === 'bar') { defaults.scales = { x: { ticks: { color: '#6b7490' }, grid: { color: 'rgba(255,255,255,0.04)' } }, y: { ticks: { color: '#6b7490' }, grid: { color: 'rgba(255,255,255,0.04)' } } }; }
        this.charts[canvasId] = new Chart(ctx, { type, data, options: { ...defaults, ...extra } });
    }

    // ========== ASSETS ==========
    renderAssets() {
        const el = document.getElementById('view-assets'); const assets = store.getAssets();
        el.innerHTML = `
        <div class="toolbar"><div class="toolbar-left"><div class="search-input"><i class="fas fa-search"></i><input type="text" id="assetSearch" placeholder="Buscar activos..."></div>
            <select class="filter-select" id="assetStatusFilter"><option value="">Todos los estados</option><option value="operativo">Operativo</option><option value="en_mantenimiento">En Mantenimiento</option><option value="fuera_de_servicio">Fuera de Servicio</option></select></div>
            <div class="toolbar-right"><button class="btn btn-primary" id="btnAddAsset"><i class="fas fa-plus"></i> Nuevo Activo</button></div></div>
        <div class="table-container"><table class="data-table"><thead><tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Ubicación</th><th>Criticidad</th><th>Estado</th><th>Garantía</th><th>Acciones</th></tr></thead>
            <tbody id="assetsTableBody">${this.renderAssetsRows(assets)}</tbody></table></div>`;
        document.getElementById('btnAddAsset').addEventListener('click', () => this.showAssetForm());
        document.getElementById('assetSearch').addEventListener('input', () => this.filterAssets());
        document.getElementById('assetStatusFilter').addEventListener('change', () => this.filterAssets());
        this.bindAssetActions();
    }

    renderAssetsRows(assets) {
        if (assets.length === 0) return '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-cogs"></i><h3>Sin activos registrados</h3></div></td></tr>';
        const today = store.today();
        return assets.map(a => {
            const warrantyExpired = a.warrantyDate && a.warrantyDate < today;
            const warrantyLabel = a.warrantyDate ? (warrantyExpired ? `<span style="color:var(--text-muted)">Vencida</span>` : `<span style="color:var(--success)">${this.fmtDate(a.warrantyDate)}</span>`) : '—';
            return `<tr><td><strong>${a.code}</strong></td><td>${a.name}</td><td>${a.category}</td><td>${a.location}</td>
            <td>${this.criticalityHTML(a.criticality)}</td><td>${this.statusBadge(a.status)}</td><td>${warrantyLabel}</td>
            <td><div class="action-btns"><button class="btn btn-icon btn-sm" data-viewasset="${a.id}" data-tooltip="Ver historial"><i class="fas fa-eye"></i></button><button class="btn btn-icon btn-sm" data-edit="${a.id}"><i class="fas fa-pen"></i></button><button class="btn btn-icon btn-sm" data-del="${a.id}"><i class="fas fa-trash"></i></button></div></td></tr>`;
        }).join('');
    }

    filterAssets() {
        const q = (document.getElementById('assetSearch')?.value || '').toLowerCase();
        const st = document.getElementById('assetStatusFilter')?.value || '';
        let assets = store.getAssets();
        if (q) assets = assets.filter(a => (a.name + a.code + a.category + a.location).toLowerCase().includes(q));
        if (st) assets = assets.filter(a => a.status === st);
        document.getElementById('assetsTableBody').innerHTML = this.renderAssetsRows(assets);
        this.bindAssetActions();
    }

    bindAssetActions() {
        document.querySelectorAll('[data-viewasset]').forEach(b => b.addEventListener('click', () => { this.viewingAssetId = b.dataset.viewasset; this.navigate('assetDetail'); }));
        document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => this.showAssetForm(b.dataset.edit)));
        document.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
            this.confirmAction('Este activo será eliminado permanentemente.', () => { store.deleteAsset(b.dataset.del); this.renderAssets(); this.toast('Activo eliminado', 'danger'); });
        }));
    }

    showAssetForm(editId) {
        const a = editId ? store.getAsset(editId) : {};
        const assets = store.getAssets().filter(x => x.id !== editId);
        const html = `
        <div class="form-row"><div class="form-group"><label class="form-label">Nombre <span class="required">*</span></label><input class="form-control" id="fName" value="${a.name || ''}"></div>
            <div class="form-group"><label class="form-label">Código <span class="required">*</span></label><input class="form-control" id="fCode" value="${a.code || ''}"></div></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Categoría</label><input class="form-control" id="fCategory" value="${a.category || ''}"></div>
            <div class="form-group"><label class="form-label">Ubicación</label><input class="form-control" id="fLocation" value="${a.location || ''}"></div></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Marca</label><input class="form-control" id="fBrand" value="${a.brand || ''}"></div>
            <div class="form-group"><label class="form-label">Modelo</label><input class="form-control" id="fModel" value="${a.model || ''}"></div></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Serial</label><input class="form-control" id="fSerial" value="${a.serial || ''}"></div>
            <div class="form-group"><label class="form-label">Fecha Instalación</label><input class="form-control" type="date" id="fInstallDate" value="${a.installDate || ''}"></div></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Vencimiento Garantía</label><input class="form-control" type="date" id="fWarrantyDate" value="${a.warrantyDate || ''}"></div>
            <div class="form-group"><label class="form-label">Activo Padre (Jerarquía)</label><select class="form-control" id="fParentId"><option value="">— Ninguno —</option>${assets.map(x => `<option value="${x.id}" ${a.parentId === x.id ? 'selected' : ''}>${x.code} - ${x.name}</option>`).join('')}</select></div></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Estado</label><select class="form-control" id="fStatus"><option value="operativo" ${a.status === 'operativo' ? 'selected' : ''}>Operativo</option><option value="en_mantenimiento" ${a.status === 'en_mantenimiento' ? 'selected' : ''}>En Mantenimiento</option><option value="fuera_de_servicio" ${a.status === 'fuera_de_servicio' ? 'selected' : ''}>Fuera de Servicio</option></select></div>
            <div class="form-group"><label class="form-label">Criticidad</label><select class="form-control" id="fCriticality"><option value="alta" ${a.criticality === 'alta' ? 'selected' : ''}>Alta</option><option value="media" ${a.criticality === 'media' ? 'selected' : ''}>Media</option><option value="baja" ${a.criticality === 'baja' ? 'selected' : ''}>Baja</option></select></div></div>
        <div class="form-group"><label class="form-label">Especificaciones Técnicas</label><textarea class="form-control" id="fSpecs">${a.specs || ''}</textarea></div>
        <div class="form-group"><label class="form-label">URL del Manual</label><input class="form-control" id="fManualUrl" value="${a.manualUrl || ''}" placeholder="https://..."></div>`;
        this.showModal(editId ? 'Editar Activo' : 'Nuevo Activo', html, () => {
            const data = { name: document.getElementById('fName').value, code: document.getElementById('fCode').value, category: document.getElementById('fCategory').value, location: document.getElementById('fLocation').value, brand: document.getElementById('fBrand').value, model: document.getElementById('fModel').value, serial: document.getElementById('fSerial').value, installDate: document.getElementById('fInstallDate').value, warrantyDate: document.getElementById('fWarrantyDate').value, parentId: document.getElementById('fParentId').value || null, status: document.getElementById('fStatus').value, criticality: document.getElementById('fCriticality').value, specs: document.getElementById('fSpecs').value, manualUrl: document.getElementById('fManualUrl').value };
            if (!data.name || !data.code) { this.toast('Nombre y Código son obligatorios', 'danger'); return; }
            if (editId) { store.updateAsset(editId, data); this.toast('Activo actualizado'); } else { store.addAsset(data); store.addLog({ action: 'asset_created', message: `Activo creado: ${data.name}` }); this.toast('Activo creado'); }
            this.closeModal(); this.renderAssets();
        });
    }

    // ========== WORK ORDERS ==========
    renderWorkOrders() {
        const el = document.getElementById('view-workorders'); const wos = store.getWorkOrders();
        el.innerHTML = `
        <div class="toolbar"><div class="toolbar-left"><div class="search-input"><i class="fas fa-search"></i><input type="text" id="woSearch" placeholder="Buscar órdenes..."></div>
            <select class="filter-select" id="woStatusFilter"><option value="">Todos</option><option value="pendiente">Pendiente</option><option value="en_progreso">En Progreso</option><option value="completada">Completada</option><option value="cancelada">Cancelada</option></select>
            <select class="filter-select" id="woTypeFilter"><option value="">Todos los tipos</option><option value="correctivo">Correctivo</option><option value="preventivo">Preventivo</option><option value="predictivo">Predictivo</option><option value="mejora">Mejora</option></select></div>
            <div class="toolbar-right"><button class="btn btn-primary" id="btnAddWO"><i class="fas fa-plus"></i> Nueva OT</button></div></div>
        <div class="table-container"><table class="data-table"><thead><tr><th>ID</th><th>Equipo</th><th>Tipo</th><th>Prioridad</th><th>Estado</th><th>Asignado a</th><th>Fecha</th><th>Costo MO</th><th>Acciones</th></tr></thead>
            <tbody id="woTableBody">${this.renderWORows(wos)}</tbody></table></div>`;
        document.getElementById('btnAddWO').addEventListener('click', () => this.showWOForm());
        ['woSearch', 'woStatusFilter', 'woTypeFilter'].forEach(id => document.getElementById(id).addEventListener(id.includes('Search') ? 'input' : 'change', () => this.filterWOs()));
        this.bindWOActions();
    }

    renderWORows(wos) {
        if (wos.length === 0) return '<tr><td colspan="9"><div class="empty-state"><i class="fas fa-clipboard-list"></i><h3>Sin órdenes de trabajo</h3></div></td></tr>';
        const typeLabels = { correctivo: 'Correctivo', preventivo: 'Preventivo', predictivo: 'Predictivo', mejora: 'Mejora' };
        return wos.map(w => {
            const hours = parseFloat(w.actualHours) || parseFloat(w.estimatedHours) || 0;
            const tech = store.getPersonnelById(w.assignedTo);
            const rate = tech ? (parseFloat(tech.hourlyRate) || 25000) : 25000;
            const laborCost = w.status === 'completada' ? this.fmtMoney(hours * rate) : '—';
            const injectedTag = w.injected ? '<span class="badge badge-danger" style="font-size:0.65rem">⚡DOC</span>' : '';
            return `<tr ${w.injected ? 'style="background:var(--danger-bg)"' : ''}>
            <td><strong>${w.id.substring(0, 8).toUpperCase()}</strong>${injectedTag}</td><td>${this.getAssetName(w.assetId)}</td>
            <td><span class="badge badge-${w.type === 'correctivo' ? 'danger' : w.type === 'preventivo' ? 'success' : w.type === 'predictivo' ? 'info' : 'warning'}">${typeLabels[w.type] || w.type}</span></td>
            <td>${this.priorityBadge(w.priority)}</td><td>${this.statusBadge(w.status)}</td>
            <td>${this.getPersonName(w.assignedTo)}</td><td>${this.fmtDate(w.createdDate)}</td><td>${laborCost}</td>
            <td><div class="action-btns">
                ${w.status === 'pendiente' ? `<button class="btn btn-sm btn-success" data-start="${w.id}"><i class="fas fa-play"></i></button>` : ''}
                ${w.status === 'en_progreso' ? `<button class="btn btn-sm btn-success" data-complete="${w.id}"><i class="fas fa-check"></i></button>` : ''}
                <button class="btn btn-icon btn-sm" data-pdfwo="${w.id}" data-tooltip="Exportar PDF" style="color:#ff5252"><i class="fas fa-file-pdf"></i></button>
                <button class="btn btn-icon btn-sm" data-editwo="${w.id}"><i class="fas fa-pen"></i></button>
                <button class="btn btn-icon btn-sm" data-delwo="${w.id}"><i class="fas fa-trash"></i></button></div></td></tr>`;
        }).join('');
    }

    filterWOs() {
        const q = (document.getElementById('woSearch')?.value || '').toLowerCase();
        const st = document.getElementById('woStatusFilter')?.value || '';
        const tp = document.getElementById('woTypeFilter')?.value || '';
        let wos = store.getWorkOrders();
        if (q) wos = wos.filter(w => (w.description + this.getAssetName(w.assetId) + w.id).toLowerCase().includes(q));
        if (st) wos = wos.filter(w => w.status === st);
        if (tp) wos = wos.filter(w => w.type === tp);
        document.getElementById('woTableBody').innerHTML = this.renderWORows(wos);
        this.bindWOActions();
    }

    bindWOActions() {
        document.querySelectorAll('[data-start]').forEach(b => b.addEventListener('click', () => {
            store.updateWorkOrder(b.dataset.start, { status: 'en_progreso', startDate: store.today() });
            store.addLog({ action: 'wo_started', message: 'OT iniciada: ' + b.dataset.start.substring(0, 8).toUpperCase() });
            this.toast('Orden iniciada', 'info'); this.renderWorkOrders();
        }));
        document.querySelectorAll('[data-complete]').forEach(b => b.addEventListener('click', () => this.showCompleteWOModal(b.dataset.complete)));
        document.querySelectorAll('[data-editwo]').forEach(b => b.addEventListener('click', () => this.showWOForm(b.dataset.editwo)));
        document.querySelectorAll('[data-delwo]').forEach(b => b.addEventListener('click', () => {
            this.confirmAction('Esta orden será eliminada.', () => { store.deleteWorkOrder(b.dataset.delwo); this.renderWorkOrders(); this.toast('OT eliminada', 'danger'); });
        }));
        document.querySelectorAll('[data-pdfwo]').forEach(b => b.addEventListener('click', () => this.exportWOtoPDF(b.dataset.pdfwo)));
    }

    showCompleteWOModal(woId, onDone) {
        const w = store.getWorkOrder(woId);
        const inventory = store.getInventory();
        const html = `
        <div class="form-group"><label class="form-label">Horas Reales Trabajadas</label><input class="form-control" type="number" id="fCompleteHours" value="${w.actualHours || w.estimatedHours || '2'}" step="0.5"></div>
        <div class="form-group"><label class="form-label">Notas de Cierre</label><textarea class="form-control" id="fCompleteNotes" rows="2">${w.notes || ''}</textarea></div>
        <div class="form-group"><label class="form-label"><i class="fas fa-box"></i> Repuestos Utilizados — Descontar del Inventario</label>
            <div style="max-height:200px;overflow-y:auto">
                ${inventory.map(i => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
                    <input type="checkbox" class="spare-check" data-item-id="${i.id}" id="sp_${i.id}">
                    <label for="sp_${i.id}" style="flex:1;font-size:0.82rem;cursor:pointer">${i.name} <span style="color:var(--text-muted)">(Stock: ${i.quantity} ${i.unit})</span></label>
                    <input type="number" class="form-control spare-qty" data-item-id="${i.id}" style="width:70px;padding:4px 8px;font-size:0.8rem" value="1" min="1" max="${i.quantity}">
                </div>`).join('')}
            </div>
        </div>`;
        this.showModal('Completar Orden de Trabajo', html, () => {
            const hours = document.getElementById('fCompleteHours').value;
            const notes = document.getElementById('fCompleteNotes').value;
            store.updateWorkOrder(woId, { status: 'completada', completedDate: store.today(), actualHours: hours, notes });
            document.querySelectorAll('.spare-check:checked').forEach(cb => {
                const qty = document.querySelector(`.spare-qty[data-item-id="${cb.dataset.itemId}"]`).value;
                store.deductInventory(cb.dataset.itemId, qty, woId, `OT ${woId.substring(0, 8).toUpperCase()}`);
            });
            store.addLog({ action: 'wo_completed', message: 'OT completada: ' + woId.substring(0, 8).toUpperCase() });
            this.toast('Orden completada — Inventario actualizado');
            this.closeModal();
            if (onDone) onDone(); else this.renderWorkOrders();
        });
    }

    showWOForm(editId) {
        const w = editId ? store.getWorkOrder(editId) : {};
        const assets = store.getAssets(); const personnel = store.getPersonnel();
        const html = `
        <div class="form-row"><div class="form-group"><label class="form-label">Equipo <span class="required">*</span></label><select class="form-control" id="fWOAsset"><option value="">Seleccionar...</option>${assets.map(a => `<option value="${a.id}" ${w.assetId === a.id ? 'selected' : ''}>${a.code} - ${a.name}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">Tipo</label><select class="form-control" id="fWOType"><option value="correctivo" ${w.type === 'correctivo' ? 'selected' : ''}>Correctivo</option><option value="preventivo" ${w.type === 'preventivo' ? 'selected' : ''}>Preventivo</option><option value="predictivo" ${w.type === 'predictivo' ? 'selected' : ''}>Predictivo</option><option value="mejora" ${w.type === 'mejora' ? 'selected' : ''}>Mejora</option></select></div></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Prioridad</label><select class="form-control" id="fWOPriority"><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></div>
            <div class="form-group"><label class="form-label">Asignado a</label><select class="form-control" id="fWOAssigned"><option value="">Sin asignar</option>${personnel.map(p => `<option value="${p.id}" ${w.assignedTo === p.id ? 'selected' : ''}>${p.name} — ${this.fmtMoney(p.hourlyRate)}/h</option>`).join('')}</select></div></div>
        <div class="form-group"><label class="form-label">Descripción <span class="required">*</span></label><textarea class="form-control" id="fWODesc" rows="3">${w.description || ''}</textarea></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Horas Estimadas</label><input class="form-control" type="number" id="fWOEstHours" value="${w.estimatedHours || ''}"></div>
            <div class="form-group"><label class="form-label">Notas</label><input class="form-control" id="fWONotes" value="${w.notes || ''}"></div></div>`;
        this.showModal(editId ? 'Editar OT' : 'Nueva Orden de Trabajo', html, () => {
            const data = { assetId: document.getElementById('fWOAsset').value, type: document.getElementById('fWOType').value, priority: document.getElementById('fWOPriority').value, assignedTo: document.getElementById('fWOAssigned').value, description: document.getElementById('fWODesc').value, estimatedHours: document.getElementById('fWOEstHours').value, notes: document.getElementById('fWONotes').value };
            if (!data.assetId || !data.description) { this.toast('Equipo y Descripción son obligatorios', 'danger'); return; }
            if (editId) { store.updateWorkOrder(editId, data); this.toast('OT actualizada'); }
            else { data.status = 'pendiente'; data.createdDate = store.today(); store.addWorkOrder(data); store.addLog({ action: 'wo_created', message: `OT creada: ${data.description.substring(0, 50)}` }); this.toast('OT creada'); }
            this.closeModal(); this.renderWorkOrders();
        });
    }

    // ========== PREVENTIVE ==========
    renderPreventive() {
        const el = document.getElementById('view-preventive');
        const plans = store.getPreventivePlans(); const today = store.today();
        el.innerHTML = `
        <div class="toolbar"><div class="toolbar-left"><div class="search-input"><i class="fas fa-search"></i><input type="text" id="pmSearch" placeholder="Buscar planes..."></div></div>
            <div class="toolbar-right"><button class="btn btn-primary" id="btnAddPM"><i class="fas fa-plus"></i> Nuevo Plan</button></div></div>
        <div class="table-container"><table class="data-table"><thead><tr><th>Plan</th><th>Equipo</th><th>Frecuencia</th><th>Trigger</th><th>Última Ejec.</th><th>Próxima</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>${plans.length === 0 ? '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-calendar"></i><h3>Sin planes preventivos</h3></div></td></tr>' : plans.map(p => {
                const overdue = p.nextExecution && p.nextExecution < today && p.status === 'activo';
                const triggerLabel = p.triggerType === 'medidor' ? `<span class="badge badge-info">${p.meterInterval} ${p.meterUnit}</span>` : `<span class="badge badge-muted">Tiempo</span>`;
                return `<tr style="${overdue ? 'background:var(--danger-bg)' : ''}"><td><strong>${p.name}</strong></td><td>${this.getAssetName(p.assetId)}</td><td>${p.frequency} ${p.frequencyUnit}</td><td>${triggerLabel}</td><td>${this.fmtDate(p.lastExecution)}</td><td>${overdue ? `<span style="color:var(--danger);font-weight:600">${this.fmtDate(p.nextExecution)} ⚠</span>` : this.fmtDate(p.nextExecution)}</td><td>${this.statusBadge(p.status)}</td>
                <td><div class="action-btns">${p.status === 'activo' ? `<button class="btn btn-sm btn-success" data-execpm="${p.id}" data-tooltip="Ejecutar"><i class="fas fa-clipboard-check"></i></button>` : ''}<button class="btn btn-icon btn-sm" data-editpm="${p.id}"><i class="fas fa-pen"></i></button><button class="btn btn-icon btn-sm" data-delpm="${p.id}"><i class="fas fa-trash"></i></button></div></td></tr>`;
            }).join('')}</tbody></table></div>`;
        document.getElementById('btnAddPM').addEventListener('click', () => this.showPMForm());
        document.querySelectorAll('[data-execpm]').forEach(b => b.addEventListener('click', () => this.showChecklistModal(b.dataset.execpm)));
        document.querySelectorAll('[data-editpm]').forEach(b => b.addEventListener('click', () => this.showPMForm(b.dataset.editpm)));
        document.querySelectorAll('[data-delpm]').forEach(b => b.addEventListener('click', () => {
            this.confirmAction('Plan eliminado.', () => { store.deletePreventivePlan(b.dataset.delpm); this.renderPreventive(); this.toast('Plan eliminado', 'danger'); });
        }));
    }

    showChecklistModal(planId) {
        const p = store.getPreventivePlan(planId);
        if (!p) return;
        const tasks = (p.tasks || '').split('|').filter(Boolean);
        let html = `<div style="margin-bottom:16px"><strong>${p.name}</strong><br><span style="color:var(--text-muted)">${this.getAssetName(p.assetId)} — Cada ${p.frequency} ${p.frequencyUnit}</span></div>
        <div class="checklist-container">${tasks.map((t, i) => `<div class="checklist-row"><input type="checkbox" id="chk_${i}" class="chk-task"><label for="chk_${i}" class="checklist-label">${t.trim()}</label></div>`).join('')}</div>
        <div class="form-group" style="margin-top:16px"><label class="form-label">Observaciones</label><textarea class="form-control" id="fCheckNotes" rows="2" placeholder="Notas de la ejecución..."></textarea></div>
        ${p.triggerType === 'medidor' ? `<div class="form-group"><label class="form-label">Lectura del Medidor (${p.meterUnit})</label><input class="form-control" type="number" id="fMeterReading" value="${p.currentMeterReading || ''}"></div>` : ''}`;
        this.showModal('✅ Ejecutar Plan Preventivo', html, () => {
            const checked = document.querySelectorAll('.chk-task:checked').length;
            if (checked < tasks.length && !confirm(`Solo completaste ${checked}/${tasks.length} tareas. ¿Continuar?`)) return;
            const nextDate = new Date(p.nextExecution || store.today());
            nextDate.setDate(nextDate.getDate() + parseInt(p.frequency));
            const updates = { lastExecution: store.today(), nextExecution: nextDate.toISOString().split('T')[0] };
            if (p.triggerType === 'medidor') {
                const reading = document.getElementById('fMeterReading')?.value;
                if (reading) { updates.lastMeterReading = reading; updates.currentMeterReading = reading; }
            }
            store.updatePreventivePlan(p.id, updates);
            const notes = document.getElementById('fCheckNotes').value;
            store.addWorkOrder({ assetId: p.assetId, type: 'preventivo', priority: 'media', status: 'completada', description: `PM ejecutado: ${p.name} (${checked}/${tasks.length} tareas)`, assignedTo: p.assignedTo, createdDate: store.today(), completedDate: store.today(), estimatedHours: p.estimatedHours, actualHours: p.estimatedHours, notes: notes || `Checklist: ${checked}/${tasks.length} completadas` });
            store.addLog({ action: 'wo_completed', message: `PM ejecutado: ${p.name}` });
            this.toast('Plan ejecutado — Checklist completado'); this.closeModal(); this.renderPreventive();
        });
    }

    showPMForm(editId) {
        const p = editId ? store.getPreventivePlan(editId) : {};
        const assets = store.getAssets(); const personnel = store.getPersonnel();
        const html = `
        <div class="form-group"><label class="form-label">Nombre del Plan <span class="required">*</span></label><input class="form-control" id="fPMName" value="${p.name || ''}"></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Equipo <span class="required">*</span></label><select class="form-control" id="fPMAsset"><option value="">Seleccionar...</option>${assets.map(a => `<option value="${a.id}" ${p.assetId === a.id ? 'selected' : ''}>${a.code} - ${a.name}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">Asignado a</label><select class="form-control" id="fPMAssigned"><option value="">Sin asignar</option>${personnel.map(pe => `<option value="${pe.id}" ${p.assignedTo === pe.id ? 'selected' : ''}>${pe.name}</option>`).join('')}</select></div></div>
        <div class="form-row-3"><div class="form-group"><label class="form-label">Frecuencia</label><input class="form-control" type="number" id="fPMFreq" value="${p.frequency || '30'}"></div>
            <div class="form-group"><label class="form-label">Unidad</label><select class="form-control" id="fPMUnit"><option value="días">Días</option><option value="horas">Horas</option><option value="semanas">Semanas</option></select></div>
            <div class="form-group"><label class="form-label">Horas Est.</label><input class="form-control" type="number" id="fPMHours" value="${p.estimatedHours || ''}"></div></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Tipo de Trigger</label><select class="form-control" id="fPMTrigger"><option value="tiempo" ${p.triggerType === 'tiempo' ? 'selected' : ''}>Por Tiempo</option><option value="medidor" ${p.triggerType === 'medidor' ? 'selected' : ''}>Por Medidor</option></select></div>
            <div class="form-group" id="meterFields" style="${p.triggerType === 'medidor' ? '' : 'display:none'}"><label class="form-label">Intervalo Medidor</label><div class="form-row"><input class="form-control" type="number" id="fPMMeterInterval" value="${p.meterInterval || ''}" placeholder="Ej: 1000"><input class="form-control" id="fPMMeterUnit" value="${p.meterUnit || ''}" placeholder="Ej: horas, km"></div></div></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Próxima Ejecución</label><input class="form-control" type="date" id="fPMNext" value="${p.nextExecution || ''}"></div>
            <div class="form-group"><label class="form-label">Estado</label><select class="form-control" id="fPMStatus"><option value="activo" ${p.status === 'activo' ? 'selected' : ''}>Activo</option><option value="inactivo" ${p.status === 'inactivo' ? 'selected' : ''}>Inactivo</option></select></div></div>
        <div class="form-group"><label class="form-label">Tareas del Checklist (separar con |)</label><textarea class="form-control" id="fPMTasks" rows="3">${p.tasks || ''}</textarea></div>`;
        this.showModal(editId ? 'Editar Plan' : 'Nuevo Plan Preventivo', html, () => {
            const data = { name: document.getElementById('fPMName').value, assetId: document.getElementById('fPMAsset').value, assignedTo: document.getElementById('fPMAssigned').value, frequency: document.getElementById('fPMFreq').value, frequencyUnit: document.getElementById('fPMUnit').value, estimatedHours: document.getElementById('fPMHours').value, nextExecution: document.getElementById('fPMNext').value, status: document.getElementById('fPMStatus').value, tasks: document.getElementById('fPMTasks').value, triggerType: document.getElementById('fPMTrigger').value, meterInterval: document.getElementById('fPMMeterInterval')?.value || '', meterUnit: document.getElementById('fPMMeterUnit')?.value || '' };
            if (!data.name || !data.assetId) { this.toast('Nombre y Equipo son obligatorios', 'danger'); return; }
            if (editId) { store.updatePreventivePlan(editId, data); this.toast('Plan actualizado'); } else { data.lastExecution = ''; store.addPreventivePlan(data); this.toast('Plan creado'); }
            this.closeModal(); this.renderPreventive();
        });
        setTimeout(() => {
            const trigger = document.getElementById('fPMTrigger');
            if (trigger) trigger.addEventListener('change', () => { document.getElementById('meterFields').style.display = trigger.value === 'medidor' ? '' : 'none'; });
        }, 100);
    }

    // ========== INVENTORY ==========
    renderInventory() {
        const el = document.getElementById('view-inventory'); const items = store.getInventory();
        el.innerHTML = `
        <div class="toolbar"><div class="toolbar-left"><div class="search-input"><i class="fas fa-search"></i><input type="text" id="invSearch" placeholder="Buscar repuestos..."></div></div>
            <div class="toolbar-right"><button class="btn btn-primary" id="btnAddInv"><i class="fas fa-plus"></i> Nuevo Ítem</button></div></div>
        <div class="table-container"><table class="data-table"><thead><tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Stock</th><th>Mín/Máx</th><th>Costo Unit.</th><th>Proveedor</th><th>Acciones</th></tr></thead>
            <tbody id="invTableBody">${this.renderInvRows(items)}</tbody></table></div>`;
        document.getElementById('btnAddInv').addEventListener('click', () => this.showInvForm());
        document.getElementById('invSearch').addEventListener('input', () => {
            const q = document.getElementById('invSearch').value.toLowerCase();
            const filtered = q ? items.filter(i => (i.name + i.code + i.category).toLowerCase().includes(q)) : items;
            document.getElementById('invTableBody').innerHTML = this.renderInvRows(filtered);
            this.bindInvActions();
        });
        this.bindInvActions();
    }

    renderInvRows(items) {
        if (items.length === 0) return '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-boxes-stacked"></i><h3>Sin ítems</h3></div></td></tr>';
        return items.map(i => {
            const low = parseFloat(i.quantity) <= parseFloat(i.minStock);
            const pct = parseFloat(i.maxStock) > 0 ? Math.min((parseFloat(i.quantity) / parseFloat(i.maxStock)) * 100, 100) : 0;
            return `<tr ${low ? 'style="background:var(--danger-bg)"' : ''}><td><strong>${i.code}</strong></td><td>${i.name}</td><td>${i.category}</td>
            <td><strong ${low ? 'style="color:var(--danger)"' : ''}>${i.quantity} ${i.unit}</strong><div class="progress-bar" style="margin-top:4px"><div class="progress-fill ${low ? 'fill-danger' : pct > 60 ? 'fill-success' : 'fill-warning'}" style="width:${pct}%"></div></div></td>
            <td>${i.minStock} / ${i.maxStock}</td><td>${this.fmtMoney(i.unitCost)}</td><td>${i.supplier || '—'}</td>
            <td><div class="action-btns"><button class="btn btn-icon btn-sm" data-kardex="${i.id}" data-tooltip="Kardex"><i class="fas fa-arrows-rotate"></i></button><button class="btn btn-icon btn-sm" data-adstock="${i.id}" data-tooltip="Entrada"><i class="fas fa-plus-circle" style="color:var(--success)"></i></button><button class="btn btn-icon btn-sm" data-editinv="${i.id}"><i class="fas fa-pen"></i></button><button class="btn btn-icon btn-sm" data-delinv="${i.id}"><i class="fas fa-trash"></i></button></div></td></tr>`;
        }).join('');
    }

    bindInvActions() {
        document.querySelectorAll('[data-editinv]').forEach(b => b.addEventListener('click', () => this.showInvForm(b.dataset.editinv)));
        document.querySelectorAll('[data-delinv]').forEach(b => b.addEventListener('click', () => {
            this.confirmAction('Ítem eliminado.', () => { store.deleteInventoryItem(b.dataset.delinv); this.renderInventory(); this.toast('Ítem eliminado', 'danger'); });
        }));
        document.querySelectorAll('[data-kardex]').forEach(b => b.addEventListener('click', () => this.showKardexModal(b.dataset.kardex)));
        document.querySelectorAll('[data-adstock]').forEach(b => b.addEventListener('click', () => this.showAddStockModal(b.dataset.adstock)));
    }

    showKardexModal(itemId) {
        const item = store.getInventoryItem(itemId);
        const movements = store.getInventoryMovements(itemId);
        let html = `<div style="margin-bottom:12px"><strong>${item.name}</strong> — Stock actual: <strong>${item.quantity} ${item.unit}</strong></div>`;
        if (movements.length === 0) {
            html += '<div class="empty-state" style="padding:20px"><i class="fas fa-arrows-rotate"></i><h3>Sin movimientos</h3></div>';
        } else {
            html += `<table class="data-table" style="font-size:0.8rem"><thead><tr><th>Fecha</th><th>Tipo</th><th>Cant.</th><th>Motivo</th></tr></thead><tbody>`;
            movements.forEach(m => { html += `<tr><td>${new Date(m.date).toLocaleString('es-CO')}</td><td>${m.type === 'entrada' ? '<span style="color:var(--success)">↓ Entrada</span>' : '<span style="color:var(--danger)">↑ Salida</span>'}</td><td>${m.quantity}</td><td>${m.reason || '—'}</td></tr>`; });
            html += '</tbody></table>';
        }
        this.showModal(`📋 Kardex — ${item.name}`, html, null);
    }

    showAddStockModal(itemId) {
        const item = store.getInventoryItem(itemId);
        const html = `<div style="margin-bottom:12px"><strong>${item.name}</strong> — Stock: <strong>${item.quantity} ${item.unit}</strong></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Cantidad</label><input class="form-control" type="number" id="fAddQty" value="1" min="1"></div>
            <div class="form-group"><label class="form-label">Motivo</label><input class="form-control" id="fAddReason" value="Reposición de stock"></div></div>`;
        this.showModal('📦 Entrada de Inventario', html, () => {
            const qty = document.getElementById('fAddQty').value;
            const reason = document.getElementById('fAddReason').value;
            if (store.addStock(itemId, qty, reason, 'Usuario')) {
                store.addLog({ action: 'inventory_movement', message: `Entrada: +${qty} ${item.unit} de ${item.name}` });
                this.toast(`+${qty} ingresados`); this.closeModal(); this.renderInventory();
            }
        });
    }

    showInvForm(editId) {
        const i = editId ? store.getInventoryItem(editId) : {};
        const html = `
        <div class="form-row"><div class="form-group"><label class="form-label">Nombre <span class="required">*</span></label><input class="form-control" id="fInvName" value="${i.name || ''}"></div>
            <div class="form-group"><label class="form-label">Código</label><input class="form-control" id="fInvCode" value="${i.code || ''}"></div></div>
        <div class="form-row-3"><div class="form-group"><label class="form-label">Categoría</label><input class="form-control" id="fInvCat" value="${i.category || ''}"></div>
            <div class="form-group"><label class="form-label">Unidad</label><input class="form-control" id="fInvUnit" value="${i.unit || 'und'}"></div>
            <div class="form-group"><label class="form-label">Costo Unitario</label><input class="form-control" type="number" id="fInvCost" value="${i.unitCost || ''}"></div></div>
        <div class="form-row-3"><div class="form-group"><label class="form-label">Cantidad</label><input class="form-control" type="number" id="fInvQty" value="${i.quantity || '0'}"></div>
            <div class="form-group"><label class="form-label">Stock Mínimo</label><input class="form-control" type="number" id="fInvMin" value="${i.minStock || '0'}"></div>
            <div class="form-group"><label class="form-label">Stock Máximo</label><input class="form-control" type="number" id="fInvMax" value="${i.maxStock || '0'}"></div></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Ubicación</label><input class="form-control" id="fInvLoc" value="${i.location || ''}"></div>
            <div class="form-group"><label class="form-label">Proveedor</label><input class="form-control" id="fInvSupp" value="${i.supplier || ''}"></div></div>`;
        this.showModal(editId ? 'Editar Ítem' : 'Nuevo Ítem de Inventario', html, () => {
            const data = { name: document.getElementById('fInvName').value, code: document.getElementById('fInvCode').value, category: document.getElementById('fInvCat').value, unit: document.getElementById('fInvUnit').value, unitCost: document.getElementById('fInvCost').value, quantity: document.getElementById('fInvQty').value, minStock: document.getElementById('fInvMin').value, maxStock: document.getElementById('fInvMax').value, location: document.getElementById('fInvLoc').value, supplier: document.getElementById('fInvSupp').value };
            if (!data.name) { this.toast('Nombre es obligatorio', 'danger'); return; }
            if (editId) { store.updateInventoryItem(editId, data); this.toast('Ítem actualizado'); } else { store.addInventoryItem(data); this.toast('Ítem creado'); }
            this.closeModal(); this.renderInventory();
        });
    }

    // ========== PERSONNEL ==========
    renderPersonnel() {
        const el = document.getElementById('view-personnel');
        const personnel = store.getPersonnel(); const wos = store.getWorkOrders();
        el.innerHTML = `
        <div class="toolbar"><div class="toolbar-left"><div class="search-input"><i class="fas fa-search"></i><input type="text" id="perSearch" placeholder="Buscar..."></div></div>
            <div class="toolbar-right"><button class="btn btn-primary" id="btnAddPer"><i class="fas fa-plus"></i> Nuevo Técnico</button></div></div>
        <div class="table-container"><table class="data-table"><thead><tr><th>Nombre</th><th>Rol</th><th>Especialización</th><th>Tarifa/h</th><th>Certificaciones</th><th>OTs Activas</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>${personnel.length === 0 ? '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-users"></i><h3>Sin personal</h3></div></td></tr>' : personnel.map((p, idx) => {
                const activeWOs = wos.filter(w => w.assignedTo === p.id && (w.status === 'pendiente' || w.status === 'en_progreso')).length;
                const colors = ['avatar-primary', 'avatar-success', 'avatar-warning'];
                const certs = (p.certifications || []).slice(0, 2).map(c => `<span class="cert-badge">${c}</span>`).join('') + ((p.certifications || []).length > 2 ? `<span class="cert-badge cert-more">+${p.certifications.length - 2}</span>` : '');
                return `<tr><td><div style="display:flex;align-items:center;gap:10px"><div class="avatar ${colors[idx % 3]}">${p.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>${p.name}</div></td><td>${p.role}</td><td>${p.specialization}</td><td>${this.fmtMoney(p.hourlyRate || 25000)}</td>
                <td><div class="certs-wrap">${certs || '<span style="color:var(--text-muted)">—</span>'}</div></td>
                <td><strong>${activeWOs}</strong></td><td>${this.statusBadge(p.status)}</td>
                <td><div class="action-btns"><button class="btn btn-icon btn-sm" data-editper="${p.id}"><i class="fas fa-pen"></i></button><button class="btn btn-icon btn-sm" data-delper="${p.id}"><i class="fas fa-trash"></i></button></div></td></tr>`;
            }).join('')}</tbody></table></div>`;
        document.getElementById('btnAddPer').addEventListener('click', () => this.showPerForm());
        document.querySelectorAll('[data-editper]').forEach(b => b.addEventListener('click', () => this.showPerForm(b.dataset.editper)));
        document.querySelectorAll('[data-delper]').forEach(b => b.addEventListener('click', () => {
            this.confirmAction('Técnico eliminado.', () => { store.deletePersonnel(b.dataset.delper); this.renderPersonnel(); this.toast('Eliminado', 'danger'); });
        }));
    }

    showPerForm(editId) {
        const p = editId ? store.getPersonnelById(editId) : {};
        const html = `
        <div class="form-group"><label class="form-label">Nombre <span class="required">*</span></label><input class="form-control" id="fPerName" value="${p.name || ''}"></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Rol</label><input class="form-control" id="fPerRole" value="${p.role || ''}"></div>
            <div class="form-group"><label class="form-label">Especialización</label><input class="form-control" id="fPerSpec" value="${p.specialization || ''}"></div></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Email</label><input class="form-control" type="email" id="fPerEmail" value="${p.email || ''}"></div>
            <div class="form-group"><label class="form-label">Teléfono</label><input class="form-control" id="fPerPhone" value="${p.phone || ''}"></div></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Turno</label><input class="form-control" id="fPerShift" value="${p.shift || ''}"></div>
            <div class="form-group"><label class="form-label">Tarifa Hora (COP)</label><input class="form-control" type="number" id="fPerRate" value="${p.hourlyRate || 25000}"></div></div>
        <div class="form-group"><label class="form-label">Estado</label><select class="form-control" id="fPerStatus"><option value="activo" ${p.status === 'activo' ? 'selected' : ''}>Activo</option><option value="inactivo" ${p.status === 'inactivo' ? 'selected' : ''}>Inactivo</option></select></div>
        <div class="form-group"><label class="form-label">Certificaciones (separar con comas)</label><input class="form-control" id="fPerCerts" value="${(p.certifications || []).join(', ')}" placeholder="Ej: RETIE, Alturas, PLC"></div>`;
        this.showModal(editId ? 'Editar Técnico' : 'Nuevo Técnico', html, () => {
            const certsRaw = document.getElementById('fPerCerts').value;
            const data = { name: document.getElementById('fPerName').value, role: document.getElementById('fPerRole').value, specialization: document.getElementById('fPerSpec').value, email: document.getElementById('fPerEmail').value, phone: document.getElementById('fPerPhone').value, shift: document.getElementById('fPerShift').value, hourlyRate: parseInt(document.getElementById('fPerRate').value) || 25000, status: document.getElementById('fPerStatus').value, certifications: certsRaw ? certsRaw.split(',').map(c => c.trim()).filter(Boolean) : [] };
            if (!data.name) { this.toast('Nombre es obligatorio', 'danger'); return; }
            if (editId) { store.updatePersonnel(editId, data); this.toast('Técnico actualizado'); } else { store.addPersonnel(data); this.toast('Técnico creado'); }
            this.closeModal(); this.renderPersonnel();
        });
    }

    // ========== PURCHASES ==========
    renderPurchases() {
        const el = document.getElementById('view-purchases');
        const purchases = store.getPurchases();
        const managerPending = purchases.filter(p => p.status === 'pendiente_gerencia');
        el.innerHTML = `
        ${managerPending.length > 0 ? `<div class="alert-bar alert-injected"><i class="fas fa-clock"></i><strong>${managerPending.length} solicitud(es) en espera de aprobación del Docente</strong> — Valor > ${this.fmtMoney(1000000)}</div>` : ''}
        <div class="toolbar"><div class="toolbar-left"><div class="search-input"><i class="fas fa-search"></i><input type="text" id="purSearch" placeholder="Buscar compras..."></div>
            <select class="filter-select" id="purStatusFilter"><option value="">Todos</option><option value="pendiente">Pendiente</option><option value="pendiente_gerencia">Aprobación Gerencia</option><option value="aprobada">Aprobada</option><option value="recibida">Recibida</option><option value="cancelada">Cancelada</option></select></div>
            <div class="toolbar-right"><button class="btn btn-primary" id="btnAddPur"><i class="fas fa-plus"></i> Nueva Solicitud</button></div></div>
        <div class="table-container"><table class="data-table"><thead><tr><th>Fecha</th><th>Ítem</th><th>Cantidad</th><th>Proveedor</th><th>Costo Est.</th><th>Prioridad</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody id="purTableBody">${this.renderPurRows(purchases)}</tbody></table></div>`;
        document.getElementById('btnAddPur').addEventListener('click', () => this.showPurForm());
        ['purSearch', 'purStatusFilter'].forEach(id => document.getElementById(id).addEventListener(id.includes('Search') ? 'input' : 'change', () => this.filterPurchases()));
        this.bindPurActions();
    }

    renderPurRows(purchases) {
        if (purchases.length === 0) return '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-cart-shopping"></i><h3>Sin solicitudes de compra</h3><p>Se crean automáticamente cuando el stock cae por debajo del mínimo, o créalas manualmente. Compras > $1.000.000 requieren aprobación del Docente.</p></div></td></tr>';
        return purchases.map(p => `<tr ${p.status === 'pendiente_gerencia' ? 'style="background:var(--warning-bg)"' : ''}>
        <td>${this.fmtDate(p.requestDate)}</td><td><strong>${p.itemName || 'Manual'}</strong>${p.itemCode ? `<br><span style="color:var(--text-muted);font-size:0.75rem">${p.itemCode}</span>` : ''}</td>
        <td>${p.quantity} ${p.unit || ''}</td><td>${p.supplier || '—'}</td>
        <td><strong ${parseFloat(p.estimatedCost) >= 1000000 ? 'style="color:var(--warning)"' : ''}>${this.fmtMoney(p.estimatedCost)}</strong></td>
        <td>${this.priorityBadge(p.priority || 'media')}</td><td>${this.statusBadge(p.status)}</td>
        <td><div class="action-btns">
            ${p.status === 'pendiente' ? `<button class="btn btn-sm btn-success" data-approvepur="${p.id}"><i class="fas fa-check"></i></button>` : ''}
            ${p.status === 'aprobada' ? `<button class="btn btn-sm btn-success" data-receivepur="${p.id}" data-tooltip="Recibir"><i class="fas fa-box-open"></i></button>` : ''}
            ${p.status === 'pendiente_gerencia' ? `<span style="font-size:0.72rem;color:var(--warning)"><i class="fas fa-hourglass-half"></i> Docente</span>` : ''}
            <button class="btn btn-icon btn-sm" data-editpur="${p.id}"><i class="fas fa-pen"></i></button>
            <button class="btn btn-icon btn-sm" data-delpur="${p.id}"><i class="fas fa-trash"></i></button></div></td></tr>`).join('');
    }

    filterPurchases() {
        const q = (document.getElementById('purSearch')?.value || '').toLowerCase();
        const st = document.getElementById('purStatusFilter')?.value || '';
        let purchases = store.getPurchases();
        if (q) purchases = purchases.filter(p => (p.itemName + p.supplier + p.itemCode).toLowerCase().includes(q));
        if (st) purchases = purchases.filter(p => p.status === st);
        document.getElementById('purTableBody').innerHTML = this.renderPurRows(purchases);
        this.bindPurActions();
    }

    bindPurActions() {
        document.querySelectorAll('[data-approvepur]').forEach(b => b.addEventListener('click', () => {
            store.updatePurchase(b.dataset.approvepur, { status: 'aprobada', approvedDate: store.today() });
            this.toast('Solicitud aprobada', 'info'); this.renderPurchases();
        }));
        document.querySelectorAll('[data-receivepur]').forEach(b => b.addEventListener('click', () => {
            const pur = store.getPurchase(b.dataset.receivepur);
            store.updatePurchase(b.dataset.receivepur, { status: 'recibida', deliveredDate: store.today() });
            if (pur.itemId) { store.addStock(pur.itemId, pur.quantity, 'Recepción de compra', 'Sistema'); store.addLog({ action: 'inventory_movement', message: `Compra recibida: +${pur.quantity} de ${pur.itemName}` }); }
            this.toast('Compra recibida — Stock actualizado'); this.renderPurchases();
        }));
        document.querySelectorAll('[data-editpur]').forEach(b => b.addEventListener('click', () => this.showPurForm(b.dataset.editpur)));
        document.querySelectorAll('[data-delpur]').forEach(b => b.addEventListener('click', () => {
            this.confirmAction('Solicitud eliminada.', () => { store.deletePurchase(b.dataset.delpur); this.renderPurchases(); this.toast('Eliminada', 'danger'); });
        }));
    }

    showPurForm(editId) {
        const p = editId ? store.getPurchase(editId) : {};
        const inventory = store.getInventory();
        const html = `
        <div class="form-group"><label class="form-label">Ítem de Inventario</label><select class="form-control" id="fPurItem"><option value="">— Manual —</option>${inventory.map(i => `<option value="${i.id}" ${p.itemId === i.id ? 'selected' : ''}>${i.code} - ${i.name} (Stock: ${i.quantity})</option>`).join('')}</select></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Nombre del Ítem <span class="required">*</span></label><input class="form-control" id="fPurName" value="${p.itemName || ''}"></div>
            <div class="form-group"><label class="form-label">Cantidad</label><input class="form-control" type="number" id="fPurQty" value="${p.quantity || '1'}"></div></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Proveedor</label><input class="form-control" id="fPurSupp" value="${p.supplier || ''}"></div>
            <div class="form-group"><label class="form-label">Costo Estimado <span style="font-size:0.7rem;color:var(--warning)">> $1.000.000 requiere aprobación docente</span></label><input class="form-control" type="number" id="fPurCost" value="${p.estimatedCost || ''}"></div></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Prioridad</label><select class="form-control" id="fPurPriority"><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></div>
            <div class="form-group"><label class="form-label">Motivo</label><input class="form-control" id="fPurReason" value="${p.reason || ''}"></div></div>
        <div class="form-group"><label class="form-label">Notas</label><textarea class="form-control" id="fPurNotes" rows="2">${p.notes || ''}</textarea></div>`;
        this.showModal(editId ? 'Editar Solicitud' : 'Nueva Solicitud de Compra', html, () => {
            const itemId = document.getElementById('fPurItem').value;
            const item = itemId ? store.getInventoryItem(itemId) : null;
            const data = { itemId: itemId || null, itemName: document.getElementById('fPurName').value || (item ? item.name : ''), itemCode: item ? item.code : '', quantity: document.getElementById('fPurQty').value, unit: item ? item.unit : 'und', supplier: document.getElementById('fPurSupp').value, estimatedCost: document.getElementById('fPurCost').value, priority: document.getElementById('fPurPriority').value, reason: document.getElementById('fPurReason').value, notes: document.getElementById('fPurNotes').value, requestDate: p.requestDate || store.today(), status: p.status || 'pendiente' };
            if (!data.itemName) { this.toast('Nombre del ítem es obligatorio', 'danger'); return; }
            if (editId) { store.updatePurchase(editId, data); this.toast('Solicitud actualizada'); }
            else { store.addPurchase(data); store.addLog({ action: 'purchase_created', message: `Solicitud de compra: ${data.itemName}` }); this.toast(parseFloat(data.estimatedCost) >= 1000000 ? '⚠️ Enviado a aprobación del Docente' : 'Solicitud creada'); }
            this.closeModal(); this.renderPurchases();
        });
        setTimeout(() => {
            const sel = document.getElementById('fPurItem');
            if (sel) sel.addEventListener('change', () => {
                const item = sel.value ? store.getInventoryItem(sel.value) : null;
                if (item) {
                    document.getElementById('fPurName').value = item.name;
                    document.getElementById('fPurSupp').value = item.supplier || '';
                    const qty = Math.max(parseFloat(item.maxStock) - parseFloat(item.quantity), 1);
                    document.getElementById('fPurQty').value = qty;
                    document.getElementById('fPurCost').value = qty * (parseFloat(item.unitCost) || 0);
                }
            });
        }, 100);
    }

    // ========== CALENDAR ==========
    renderCalendar() {
        const el = document.getElementById('view-calendar');
        const year = this.calendarDate.getFullYear(); const month = this.calendarDate.getMonth();
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const firstDay = new Date(year, month, 1); const lastDay = new Date(year, month + 1, 0);
        let startDow = firstDay.getDay() - 1; if (startDow < 0) startDow = 6;
        const wos = store.getWorkOrders(); const plans = store.getPreventivePlans().filter(p => p.status === 'activo');
        const todayStr = store.today();
        let cells = '';
        for (let i = 0; i < startDow; i++) cells += '<div class="cal-cell cal-empty"></div>';
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const dayWOs = wos.filter(w => w.createdDate === dateStr || w.startDate === dateStr || w.completedDate === dateStr);
            const dayPMs = plans.filter(p => p.nextExecution === dateStr);
            const hasEvents = dayWOs.length > 0 || dayPMs.length > 0;
            let dots = '';
            if (dayWOs.length > 0) { dots += [...new Set(dayWOs.map(w => w.status))].map(s => `<span class="cal-dot ${s === 'pendiente' ? 'dot-warning' : s === 'en_progreso' ? 'dot-info' : s === 'completada' ? 'dot-success' : 'dot-muted'}"></span>`).join(''); }
            if (dayPMs.length > 0) { dots += `<span class="cal-dot ${dayPMs.some(p => dateStr < todayStr) ? 'dot-danger' : 'dot-primary'}"></span>`; }
            cells += `<div class="cal-cell ${isToday ? 'cal-today' : ''} ${hasEvents ? 'cal-has-events' : ''}" data-date="${dateStr}"><div class="cal-day-num">${day}</div>${dots ? `<div class="cal-dots">${dots}</div>` : ''}${dayWOs.length > 0 ? `<div class="cal-count">${dayWOs.length} OT</div>` : ''}</div>`;
        }
        el.innerHTML = `<div class="calendar-header"><button class="btn btn-icon" id="calPrev"><i class="fas fa-chevron-left"></i></button><h2 class="calendar-month-title">${monthNames[month]} ${year}</h2><button class="btn btn-icon" id="calNext"><i class="fas fa-chevron-right"></i></button><button class="btn btn-secondary" id="calToday" style="margin-left:16px"><i class="fas fa-crosshairs"></i> Hoy</button></div>
        <div class="calendar-legend"><span class="legend-item"><span class="cal-dot dot-warning"></span> Pendiente</span><span class="legend-item"><span class="cal-dot dot-info"></span> En Progreso</span><span class="legend-item"><span class="cal-dot dot-success"></span> Completada</span><span class="legend-item"><span class="cal-dot dot-primary"></span> PM Programado</span><span class="legend-item"><span class="cal-dot dot-danger"></span> PM Vencido</span></div>
        <div class="calendar-grid">${dayNames.map(d => `<div class="cal-header-cell">${d}</div>`).join('')}${cells}</div><div id="calDayDetail" class="cal-day-detail"></div>`;
        document.getElementById('calPrev').addEventListener('click', () => { this.calendarDate.setMonth(this.calendarDate.getMonth() - 1); this.renderCalendar(); });
        document.getElementById('calNext').addEventListener('click', () => { this.calendarDate.setMonth(this.calendarDate.getMonth() + 1); this.renderCalendar(); });
        document.getElementById('calToday').addEventListener('click', () => { this.calendarDate = new Date(); this.renderCalendar(); });
        el.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
            cell.addEventListener('click', () => { el.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('cal-selected')); cell.classList.add('cal-selected'); this.showCalDayDetail(cell.dataset.date); });
        });
    }

    showCalDayDetail(dateStr) {
        const detailEl = document.getElementById('calDayDetail');
        const wos = store.getWorkOrders().filter(w => w.createdDate === dateStr || w.startDate === dateStr || w.completedDate === dateStr);
        const plans = store.getPreventivePlans().filter(p => p.nextExecution === dateStr && p.status === 'activo');
        if (wos.length === 0 && plans.length === 0) { detailEl.innerHTML = `<div class="cal-detail-empty"><i class="fas fa-calendar-day"></i> Sin eventos para ${this.fmtDate(dateStr)}</div>`; return; }
        const typeLabels = { correctivo: 'Correctivo', preventivo: 'Preventivo', predictivo: 'Predictivo', mejora: 'Mejora' };
        let html = `<div class="cal-detail-title"><i class="fas fa-calendar-day"></i> Eventos del ${this.fmtDate(dateStr)}</div>`;
        if (wos.length > 0) { html += `<div class="cal-detail-section">Órdenes de Trabajo</div>` + wos.map(w => `<div class="cal-detail-item">${this.statusBadge(w.status)} <span class="badge badge-${w.type === 'correctivo' ? 'danger' : 'success'}">${typeLabels[w.type]}</span> ${this.priorityBadge(w.priority)}<div style="font-weight:500;margin-top:4px">${this.getAssetName(w.assetId)}</div><div style="font-size:0.78rem;color:var(--text-muted)">${w.description || '—'}</div></div>`).join(''); }
        if (plans.length > 0) { html += `<div class="cal-detail-section">Planes Preventivos</div>` + plans.map(p => `<div class="cal-detail-item cal-detail-pm"><div style="font-weight:500"><i class="fas fa-wrench"></i> ${p.name}</div><div style="font-size:0.78rem;color:var(--text-muted)">${this.getAssetName(p.assetId)}</div></div>`).join(''); }
        detailEl.innerHTML = html;
    }

    // ========== ASSET DETAIL ==========
    renderAssetDetail() {
        const el = document.getElementById('view-assetDetail');
        if (!this.viewingAssetId) { el.innerHTML = '<div class="empty-state"><i class="fas fa-eye-slash"></i><h3>Seleccione un equipo desde Activos</h3></div>'; return; }
        const asset = store.getAsset(this.viewingAssetId);
        if (!asset) { el.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Equipo no encontrado</h3></div>'; return; }
        const kpis = store.getAssetKPIs(this.viewingAssetId);
        const wos = store.getWorkOrders().filter(w => w.assetId === this.viewingAssetId).sort((a, b) => (b.createdDate || '').localeCompare(a.createdDate || ''));
        const plans = store.getPreventivePlans().filter(p => p.assetId === this.viewingAssetId);
        const today = store.today();
        const warrantyLabel = asset.warrantyDate ? (asset.warrantyDate < today ? '<span style="color:var(--danger)">Garantía Vencida</span>' : `<span style="color:var(--success)">Vigente hasta ${this.fmtDate(asset.warrantyDate)}</span>`) : '—';
        const typeLabels = { correctivo: 'Correctivo', preventivo: 'Preventivo', predictivo: 'Predictivo', mejora: 'Mejora' };
        el.innerHTML = `
        <div class="toolbar"><div class="toolbar-left"><button class="btn btn-secondary" id="btnBackAssets"><i class="fas fa-arrow-left"></i> Volver a Activos</button></div></div>
        <div class="asset-detail-header"><div><h2 class="asset-detail-name">${asset.name}</h2><div class="asset-detail-code">${asset.code} · ${asset.brand || ''} ${asset.model || ''}</div></div><div>${this.statusBadge(asset.status)} ${this.criticalityHTML(asset.criticality)}</div></div>
        <div class="detail-grid" style="margin-bottom:24px">
            <div class="detail-field"><div class="detail-field-label">Categoría</div><div class="detail-field-value">${asset.category}</div></div>
            <div class="detail-field"><div class="detail-field-label">Ubicación</div><div class="detail-field-value">${asset.location}</div></div>
            <div class="detail-field"><div class="detail-field-label">Serial</div><div class="detail-field-value">${asset.serial || '—'}</div></div>
            <div class="detail-field"><div class="detail-field-label">Garantía</div><div class="detail-field-value">${warrantyLabel}</div></div>
            <div class="detail-field"><div class="detail-field-label">Costo MO acumulado</div><div class="detail-field-value">${this.fmtMoney(kpis.laborCost)}</div></div>
            ${asset.manualUrl ? `<div class="detail-field"><div class="detail-field-label">Manual</div><div class="detail-field-value"><a href="${asset.manualUrl}" target="_blank"><i class="fas fa-file-pdf"></i> Ver Manual</a></div></div>` : ''}
        </div>
        <div class="kpi-grid" style="margin-bottom:24px">
            <div class="kpi-card kpi-primary"><div class="kpi-icon"><i class="fas fa-clipboard-list"></i></div><div class="kpi-content"><div class="kpi-label">Total OTs</div><div class="kpi-value">${kpis.totalWOs}</div><div class="kpi-trend">${kpis.completedWOs} completadas</div></div></div>
            <div class="kpi-card kpi-success"><div class="kpi-icon"><i class="fas fa-clock"></i></div><div class="kpi-content"><div class="kpi-label">MTTR</div><div class="kpi-value">${kpis.mttr}h</div></div></div>
            <div class="kpi-card kpi-warning"><div class="kpi-icon"><i class="fas fa-hourglass-half"></i></div><div class="kpi-content"><div class="kpi-label">Horas Acum.</div><div class="kpi-value">${kpis.totalHours}h</div></div></div>
            <div class="kpi-card kpi-info"><div class="kpi-icon"><i class="fas fa-calendar-check"></i></div><div class="kpi-content"><div class="kpi-label">Última Intervención</div><div class="kpi-value" style="font-size:1rem">${kpis.lastIntervention ? this.fmtDate(kpis.lastIntervention) : '—'}</div></div></div>
        </div>
        <div class="grid-2">
            <div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-history"></i> Historial</div></div>
                ${wos.length === 0 ? '<div class="empty-state" style="padding:30px"><i class="fas fa-clipboard-list"></i><h3>Sin historial</h3></div>' : `<div class="timeline">${wos.map(w => `<div class="timeline-item"><div class="timeline-date">${this.fmtDate(w.createdDate)}${w.completedDate ? ' → ' + this.fmtDate(w.completedDate) : ''}</div><div class="timeline-content">${this.statusBadge(w.status)} <span class="badge badge-${w.type === 'correctivo' ? 'danger' : 'success'}">${typeLabels[w.type]}</span> ${this.priorityBadge(w.priority)}<div style="font-weight:500;margin-top:4px">${w.description}</div><div style="font-size:0.78rem;color:var(--text-muted)"><i class="fas fa-user"></i> ${this.getPersonName(w.assignedTo)} · Est: ${w.estimatedHours || '—'}h / Real: ${w.actualHours || '—'}h</div></div></div>`).join('')}</div>`}
            </div>
            <div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-calendar-check"></i> Planes Preventivos</div></div>
                ${plans.length === 0 ? '<div class="empty-state" style="padding:30px"><i class="fas fa-calendar"></i><h3>Sin planes</h3></div>' : `<ul class="recent-list">${plans.map(p => { const overdue = p.nextExecution && p.nextExecution < today && p.status === 'activo'; return `<li class="recent-item"><div class="recent-icon" style="background:${overdue ? 'var(--danger-bg)' : 'var(--primary-glow)'};color:${overdue ? 'var(--danger)' : 'var(--primary)'}"><i class="fas ${overdue ? 'fa-exclamation' : 'fa-wrench'}"></i></div><div class="recent-info"><div class="recent-title">${p.name}</div><div class="recent-meta">${overdue ? '<span style="color:var(--danger)">VENCIDO · </span>' : ''}Cada ${p.frequency} ${p.frequencyUnit} · Próxima: ${this.fmtDate(p.nextExecution)}</div></div></li>`; }).join('')}</ul>`}
            </div>
        </div>`;
        document.getElementById('btnBackAssets').addEventListener('click', () => this.navigate('assets'));
    }

    // ========== REPORTS ==========
    renderReports() {
        const el = document.getElementById('view-reports');
        const k = store.getKPIs(); const company = store.getCurrentCompany();
        el.innerHTML = `
        <div class="card" style="margin-bottom:24px"><div class="card-header"><div class="card-title"><i class="fas fa-building"></i> ${company.name} — Resumen Ejecutivo</div></div>
            <div class="detail-grid">
                <div class="detail-field"><div class="detail-field-label">Total Activos</div><div class="detail-field-value">${k.totalAssets}</div></div>
                <div class="detail-field"><div class="detail-field-label">Activos Operativos</div><div class="detail-field-value">${k.activeAssets}</div></div>
                <div class="detail-field"><div class="detail-field-label">Total OTs</div><div class="detail-field-value">${k.totalWOs}</div></div>
                <div class="detail-field"><div class="detail-field-label">MTTR</div><div class="detail-field-value">${k.mttr}h</div></div>
                <div class="detail-field"><div class="detail-field-label">MTBF</div><div class="detail-field-value">${k.mtbf} días</div></div>
                <div class="detail-field"><div class="detail-field-label">Disponibilidad</div><div class="detail-field-value"><strong style="color:${k.availability >= 90 ? 'var(--success)' : k.availability >= 75 ? 'var(--warning)' : 'var(--danger)'}">${k.availability}%</strong></div></div>
                <div class="detail-field"><div class="detail-field-label">Cumplimiento PM</div><div class="detail-field-value"><strong style="color:${k.planCompliance >= 80 ? 'var(--success)' : k.planCompliance >= 50 ? 'var(--warning)' : 'var(--danger)'}">${k.planCompliance}%</strong></div></div>
                <div class="detail-field"><div class="detail-field-label">Personal Técnico</div><div class="detail-field-value">${k.totalPersonnel}</div></div>
            </div>
        </div>
        <div class="card" style="margin-bottom:24px"><div class="card-header"><div class="card-title"><i class="fas fa-coins"></i> Análisis de Costos</div></div>
            <div class="kpi-grid">
                <div class="kpi-card kpi-warning"><div class="kpi-icon"><i class="fas fa-users"></i></div><div class="kpi-content"><div class="kpi-label">Mano de Obra</div><div class="kpi-value" style="font-size:1.2rem">${this.fmtMoney(k.laborCost)}</div><div class="kpi-trend">${k.totalCost > 0 ? Math.round((k.laborCost / k.totalCost) * 100) : 0}% del total</div></div></div>
                <div class="kpi-card kpi-info"><div class="kpi-icon"><i class="fas fa-box"></i></div><div class="kpi-content"><div class="kpi-label">Repuestos</div><div class="kpi-value" style="font-size:1.2rem">${this.fmtMoney(k.partsCost)}</div><div class="kpi-trend">${k.totalCost > 0 ? Math.round((k.partsCost / k.totalCost) * 100) : 0}% del total</div></div></div>
                <div class="kpi-card kpi-success"><div class="kpi-icon"><i class="fas fa-calculator"></i></div><div class="kpi-content"><div class="kpi-label">Costo Total</div><div class="kpi-value" style="font-size:1.2rem">${this.fmtMoney(k.totalCost)}</div></div></div>
            </div>
        </div>
        <div class="dashboard-charts">
            <div class="chart-card"><div class="card-title">Estado de OTs</div><div class="chart-wrapper"><canvas id="chartReportStatus"></canvas></div></div>
            <div class="chart-card"><div class="card-title">Por Tipo de Mantenimiento</div><div class="chart-wrapper"><canvas id="chartReportType"></canvas></div></div>
        </div>
        <div style="text-align:center;margin-top:16px">
            <button class="btn btn-secondary" id="btnExportData"><i class="fas fa-download"></i> Exportar Datos (JSON)</button>
            <button class="btn btn-danger" id="btnResetData" style="margin-left:10px"><i class="fas fa-rotate-left"></i> Restablecer Datos</button>
        </div>`;
        this.renderChart('chartReportStatus', 'doughnut', { labels: ['Pendiente', 'En Progreso', 'Completada', 'Cancelada'], datasets: [{ data: [k.pendingWOs, k.inProgressWOs, k.completedWOs, k.cancelledWOs], backgroundColor: ['#ffab40', '#448aff', '#00e676', '#6b7490'], borderWidth: 0 }] });
        this.renderChart('chartReportType', 'pie', { labels: ['Correctivo', 'Preventivo', 'Predictivo', 'Mejora'], datasets: [{ data: [k.woByType.correctivo, k.woByType.preventivo, k.woByType.predictivo, k.woByType.mejora], backgroundColor: ['#ff5252', '#00e676', '#448aff', '#ffab40'], borderWidth: 0 }] });
        document.getElementById('btnExportData').addEventListener('click', () => {
            const blob = new Blob([JSON.stringify(store.data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `maintpro_${store.today()}.json`; a.click();
            this.toast('Datos exportados', 'info');
        });
        document.getElementById('btnResetData').addEventListener('click', () => {
            this.confirmAction('Se restablecerán todos los datos a los valores iniciales.', () => { store.resetData(); this.navigate('dashboard'); this.toast('Datos restablecidos', 'warning'); });
        });
    }

    // ========================================================
    //  NOTIFICATION BELL
    // ========================================================
    setupNotificationBell() {
        const bell = document.getElementById('notifBell');
        if (!bell) return;
        bell.onclick = (e) => {
            e.stopPropagation();
            const panel = document.getElementById('notifPanel');
            const isOpen = panel.classList.contains('active');
            panel.classList.toggle('active');
            if (!isOpen) this.renderNotifPanel();
        };
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('notifPanel');
            const bell = document.getElementById('notifBell');
            if (panel && !panel.contains(e.target) && e.target !== bell && !bell?.contains(e.target)) {
                panel.classList.remove('active');
            }
        });
    }

    renderNotifPanel() {
        if (!store) return;
        const panel = document.getElementById('notifPanel');
        const notifs = store.getNotifications ? store.getNotifications() : [];
        const unread = notifs.filter(n => !n.read).length;
        const iconMap = {
            wo_assigned: ['fa-clipboard-list', 'var(--primary)'],
            wo_reassigned: ['fa-clipboard-check', 'var(--info)'],
            fault_injected: ['fa-bolt', 'var(--danger)'],
            stock_alert: ['fa-boxes-stacked', 'var(--warning)'],
            pm_due: ['fa-calendar-exclamation', 'var(--warning)']
        };
        panel.innerHTML = `
        <div class="notif-header">
            <span class="notif-title"><i class="fas fa-bell"></i> Notificaciones</span>
            ${unread > 0 ? `<button class="notif-mark-all" id="notifMarkAll">Marcar todo le\u00eddo</button>` : ''}
        </div>
        <div class="notif-list">
        ${notifs.length === 0
            ? `<div class="notif-empty"><i class="fas fa-bell-slash"></i><p>Sin notificaciones</p></div>`
            : notifs.map(n => {
                const [ico, col] = iconMap[n.type] || ['fa-bell', 'var(--text-muted)'];
                const t = new Date(n.timestamp).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                const prioColor = { critica: 'var(--danger)', alta: 'var(--warning)', media: 'var(--primary)', baja: 'var(--text-muted)' }[n.priority] || 'var(--primary)';
                return `<div class="notif-item ${n.read ? 'notif-read' : 'notif-unread'}" data-nid="${n.id}">
                    <div class="notif-icon-wrap" style="border-color:${prioColor}">
                        <i class="fas ${ico}" style="color:${col}"></i>
                    </div>
                    <div class="notif-body">
                        <div class="notif-msg">${n.message}</div>
                        <div class="notif-time">${t}</div>
                    </div>
                    ${!n.read ? '<div class="notif-dot"></div>' : ''}
                </div>`;
            }).join('')
        }
        </div>`;
        panel.querySelectorAll('.notif-item').forEach(item => {
            item.addEventListener('click', () => {
                store.markNotificationRead(item.dataset.nid);
                item.classList.replace('notif-unread', 'notif-read');
                item.querySelector('.notif-dot')?.remove();
                this.updateBadges();
            });
        });
        const markAll = document.getElementById('notifMarkAll');
        if (markAll) markAll.addEventListener('click', () => {
            store.markAllRead();
            this.renderNotifPanel();
            this.updateBadges();
        });
    }

    // ========================================================
    //  WEEKLY CALENDAR FOR TECHNICIANS
    // ========================================================
    renderTechWeeklyCalendar(techId) {
        const area = document.getElementById('techWeekArea');
        if (!area) return;
        const tech = store.getPersonnelById(techId);

        // Get monday of current week + offset
        const now = new Date();
        const dow = now.getDay(); // 0=Sun
        const diffToMon = dow === 0 ? -6 : 1 - dow;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMon + (this.techWeekOffset * 7));

        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            return d;
        });

        const dayNames = ['Lunes', 'Martes', 'Mi\u00e9rcoles', 'Jueves', 'Viernes', 'S\u00e1bado', 'Domingo'];
        const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const todayStr = new Date().toISOString().split('T')[0];

        const wos  = store.getWorkOrders().filter(w => !techId || w.assignedTo === techId);
        const plans = store.getPreventivePlans().filter(p => p.status === 'activo' && (!techId || p.assignedTo === techId));

        const typeColor = { correctivo:'danger', preventivo:'success', predictivo:'info', mejora:'warning' };
        const typeLabel = { correctivo:'Correctivo', preventivo:'Preventivo', predictivo:'Predictivo', mejora:'Mejora' };

        const weekLabel = `${days[0].getDate()} ${monthNames[days[0].getMonth()]} \u2014 ${days[6].getDate()} ${monthNames[days[6].getMonth()]} ${days[6].getFullYear()}`;

        area.innerHTML = `
        <div class="twc-header">
            <button class="btn btn-icon" id="twPrev"><i class="fas fa-chevron-left"></i></button>
            <div class="twc-week-label">
                ${tech ? `<span style="color:var(--warning)"><i class="fas fa-user"></i> ${tech.name}</span> \u00b7 ` : ''}
                <strong>${weekLabel}</strong>
                ${this.techWeekOffset !== 0 ? `<button class="btn btn-sm btn-secondary" id="twNow" style="margin-left:10px">Hoy</button>` : ''}
            </div>
            <button class="btn btn-icon" id="twNext"><i class="fas fa-chevron-right"></i></button>
        </div>

        <div class="twc-grid">
        ${days.map((d, i) => {
            const ds = d.toISOString().split('T')[0];
            const isToday = ds === todayStr;
            const isPast  = ds < todayStr;
            const isWeekend = i >= 5;

            const dayWOs  = wos.filter(w  => w.createdDate === ds || w.startDate === ds || (w.completedDate === ds && w.status === 'completada'));
            const dayPMs  = plans.filter(p => p.nextExecution === ds);
            const total   = dayWOs.length + dayPMs.length;

            return `
            <div class="twc-day ${isToday ? 'twc-today' : ''} ${isPast ? 'twc-past' : ''} ${isWeekend ? 'twc-weekend' : ''}">
                <div class="twc-day-head">
                    <span class="twc-day-name">${dayNames[i].substring(0, 3)}</span>
                    <span class="twc-day-num ${isToday ? 'twc-today-circle' : ''}">${d.getDate()}</span>
                    ${total > 0 ? `<span class="twc-count">${total}</span>` : ''}
                </div>
                <div class="twc-events">
                    ${dayWOs.map(w => `
                    <div class="twc-event twc-event--${typeColor[w.type] || 'info'}">
                        <div class="twc-event-type">${typeLabel[w.type] || w.type}</div>
                        <div class="twc-event-name"><i class="fas fa-cog"></i> ${this.getAssetName(w.assetId)}</div>
                        <div>${this.statusBadge(w.status)}</div>
                    </div>`).join('')}
                    ${dayPMs.map(p => `
                    <div class="twc-event twc-event--pm">
                        <div class="twc-event-type"><i class="fas fa-wrench"></i> PM</div>
                        <div class="twc-event-name">${p.name}</div>
                        <div style="font-size:0.68rem;color:var(--text-muted)">${this.getAssetName(p.assetId)}</div>
                    </div>`).join('')}
                    ${total === 0 ? `<div class="twc-empty">${isPast ? 'Sin actividad' : 'Libre'}</div>` : ''}
                </div>
            </div>`;
        }).join('')}
        </div>

        <div class="twc-legend">
            <span><span class="twc-dot twc-dot--danger"></span> Correctivo</span>
            <span><span class="twc-dot twc-dot--success"></span> Preventivo</span>
            <span><span class="twc-dot twc-dot--info"></span> Predictivo</span>
            <span><span class="twc-dot twc-dot--warning"></span> Mejora</span>
            <span><span class="twc-dot twc-dot--pm"></span> PM Programado</span>
        </div>`;

        document.getElementById('twPrev')?.addEventListener('click', () => { this.techWeekOffset--; this.renderTechWeeklyCalendar(techId); });
        document.getElementById('twNext')?.addEventListener('click', () => { this.techWeekOffset++; this.renderTechWeeklyCalendar(techId); });
        document.getElementById('twNow')?.addEventListener('click',  () => { this.techWeekOffset = 0; this.renderTechWeeklyCalendar(techId); });
    }

    // ========================================================
    //  PDF EXPORT
    // ========================================================
    exportWOtoPDF(woId) {
        if (!window.jspdf) { this.toast('jsPDF no disponible. Verifica conexi\u00f3n a internet.', 'danger'); return; }
        const { jsPDF } = window.jspdf;
        const w   = store.getWorkOrder(woId); if (!w) return;
        const asset   = store.getAsset(w.assetId);
        const tech    = store.getPersonnelById(w.assignedTo);
        const company = store.getCurrentCompany();

        const typeLabels   = { correctivo:'Correctivo', preventivo:'Preventivo', predictivo:'Predictivo', mejora:'Mejora' };
        const statusLabels = { pendiente:'Pendiente', en_progreso:'En Progreso', completada:'Completada', cancelada:'Cancelada' };
        const priorityLabels = { critica:'CR\u00cdTICA', alta:'Alta', media:'Media', baja:'Baja' };

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        // ── HEADER ──────────────────────────────────────────
        doc.setFillColor(13, 17, 35);
        doc.rect(0, 0, 210, 42, 'F');

        // Logo mark
        doc.setFillColor(97, 218, 251);
        doc.roundedRect(12, 9, 11, 11, 2, 2, 'F');
        doc.setTextColor(13, 17, 35);
        doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        doc.text('MP', 17.5, 16.5, { align: 'center' });

        // Title
        doc.setTextColor(97, 218, 251);
        doc.setFontSize(16); doc.setFont('helvetica', 'bold');
        doc.text('MaintPro CMMS', 27, 17);
        doc.setTextColor(160, 180, 210);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.text('ORDEN DE TRABAJO OFICIAL', 27, 23);

        // OT Number (right)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20); doc.setFont('helvetica', 'bold');
        doc.text(`OT-${woId.substring(0,8).toUpperCase()}`, 198, 17, { align: 'right' });
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.setTextColor(160, 180, 210);
        doc.text(company.name, 198, 24, { align: 'right' });
        doc.text(`UNIPAZ \u2014 TOSEM 2026-1`, 198, 30, { align: 'right' });

        // Status / Priority / Type pills
        const statusColors  = { pendiente:[255,171,64], en_progreso:[68,138,255], completada:[0,200,100], cancelada:[107,116,144] };
        const priorityColors = { critica:[220,20,60], alta:[255,82,82], media:[255,171,64], baja:[68,138,255] };
        const sc = statusColors[w.status]   || [107,116,144];
        const pc = priorityColors[w.priority] || [107,116,144];

        doc.setFillColor(...sc);
        doc.roundedRect(12, 46, 54, 8, 2, 2, 'F');
        doc.setTextColor(255,255,255);
        doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        doc.text(`Estado: ${statusLabels[w.status] || w.status}`, 39, 51.3, { align: 'center' });

        doc.setFillColor(...pc);
        doc.roundedRect(70, 46, 54, 8, 2, 2, 'F');
        doc.text(`Prioridad: ${priorityLabels[w.priority] || w.priority}`, 97, 51.3, { align: 'center' });

        doc.setFillColor(30, 50, 90);
        doc.roundedRect(128, 46, 70, 8, 2, 2, 'F');
        doc.setTextColor(180, 200, 240);
        doc.setFont('helvetica', 'normal');
        doc.text(`Tipo: ${typeLabels[w.type] || w.type}  |  ${this.fmtDate(w.createdDate)}`, 163, 51.3, { align: 'center' });

        // ── SECTIONS HELPER ─────────────────────────────────
        let y = 62;
        const section = (title) => {
            doc.setFillColor(20, 35, 70);
            doc.rect(12, y, 186, 7, 'F');
            doc.setTextColor(97, 218, 251);
            doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
            doc.text(title, 15, y + 5); y += 10;
        };

        // ── ACTIVO ──────────────────────────────────────────
        section('\u25FE INFORMACI\u00d3N DEL ACTIVO');
        doc.autoTable({
            startY: y,
            body: [
                ['Nombre del Equipo:', asset?.name || '\u2014', 'C\u00f3digo:', asset?.code || '\u2014'],
                ['Categor\u00eda:', asset?.category || '\u2014', 'Ubicaci\u00f3n:', asset?.location || '\u2014'],
                ['Marca / Modelo:', `${asset?.brand || '\u2014'} / ${asset?.model || '\u2014'}`, 'Serial:', asset?.serial || '\u2014'],
                ['Criticidad:', (asset?.criticality || '\u2014').toUpperCase(), 'Estado:', (asset?.status || '\u2014').replace(/_/g, ' ')],
            ],
            theme: 'plain',
            styles: { fontSize: 8.5, cellPadding: 2.5 },
            columnStyles: { 0:{ fontStyle:'bold', cellWidth:40, textColor:[50,70,120] }, 1:{ cellWidth:53 }, 2:{ fontStyle:'bold', cellWidth:40, textColor:[50,70,120] }, 3:{ cellWidth:53 } },
            margin: { left: 12, right: 12 },
            alternateRowStyles: { fillColor: [240,246,255] },
        });
        y = doc.lastAutoTable.finalY + 8;

        // ── DETALLES DE LA OT ────────────────────────────────
        section('\u25FE DETALLES DE LA ORDEN');
        const hours     = parseFloat(w.actualHours) || parseFloat(w.estimatedHours) || 0;
        const rate      = tech ? (parseFloat(tech.hourlyRate) || 25000) : 25000;
        const laborCost = `$ ${(hours * rate).toLocaleString('es-CO')} COP`;
        doc.autoTable({
            startY: y,
            body: [
                ['Fecha Creaci\u00f3n:', this.fmtDate(w.createdDate), 'Fecha Inicio:', this.fmtDate(w.startDate)],
                ['Fecha Cierre:', this.fmtDate(w.completedDate), 'Horas Estimadas:', `${w.estimatedHours || '\u2014'} h`],
                ['Horas Reales:', `${w.actualHours || '\u2014'} h`, 'Costo MO:', laborCost],
            ],
            theme: 'plain',
            styles: { fontSize: 8.5, cellPadding: 2.5 },
            columnStyles: { 0:{ fontStyle:'bold', cellWidth:40, textColor:[50,70,120] }, 1:{ cellWidth:53 }, 2:{ fontStyle:'bold', cellWidth:40, textColor:[50,70,120] }, 3:{ cellWidth:53 } },
            margin: { left: 12, right: 12 },
            alternateRowStyles: { fillColor: [240,246,255] },
        });
        y = doc.lastAutoTable.finalY + 8;

        // ── DESCRIPCI\u00d3N ────────────────────────────────────────
        section('\u25FE DESCRIPCI\u00d3N DEL TRABAJO');
        doc.setTextColor(30, 40, 65);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(w.description || 'Sin descripci\u00f3n.', 182);
        doc.text(descLines, 14, y);
        y += descLines.length * 5 + 8;

        // ── T\u00c9CNICO ───────────────────────────────────────────
        if (tech) {
            section('\u25FE T\u00c9CNICO ASIGNADO');
            doc.autoTable({
                startY: y,
                body: [
                    ['Nombre:', tech.name, 'Rol:', tech.role],
                    ['Especializaci\u00f3n:', tech.specialization || '\u2014', 'Tel\u00e9fono:', tech.phone || '\u2014'],
                    ['Tarifa/hora:', `$ ${(tech.hourlyRate||25000).toLocaleString('es-CO')}`, 'Turno:', tech.shift || '\u2014'],
                    ['Certificaciones:', (tech.certifications || []).join(', ') || '\u2014', '', ''],
                ],
                theme: 'plain',
                styles: { fontSize: 8.5, cellPadding: 2.5 },
                columnStyles: { 0:{ fontStyle:'bold', cellWidth:38, textColor:[50,70,120] }, 1:{ cellWidth:55 }, 2:{ fontStyle:'bold', cellWidth:38, textColor:[50,70,120] }, 3:{ cellWidth:55 } },
                margin: { left: 12, right: 12 },
                alternateRowStyles: { fillColor: [240,246,255] },
            });
            y = doc.lastAutoTable.finalY + 8;
        }

        // ── NOTAS ────────────────────────────────────────────
        if (w.notes) {
            section('\u25FE OBSERVACIONES DE CIERRE');
            doc.setTextColor(30, 40, 65);
            doc.setFontSize(9); doc.setFont('helvetica', 'normal');
            const noteLines = doc.splitTextToSize(w.notes, 182);
            doc.text(noteLines, 14, y);
            y += noteLines.length * 5 + 8;
        }

        // ── FIRMAS ───────────────────────────────────────────
        if (y > 232) { doc.addPage(); y = 20; }
        section('\u25FE FIRMAS Y APROBACI\u00d3N');
        const sigs = [
            { title: 'T\u00e9cnico Ejecutor',       name: tech?.name || '_________________' },
            { title: 'Jefe de Mantenimiento',   name: '_________________' },
            { title: 'Supervisor de \u00c1rea',     name: '_________________' }
        ];
        sigs.forEach((sig, i) => {
            const bx = 12 + i * 63;
            doc.setDrawColor(80, 100, 160); doc.setLineWidth(0.4);
            doc.rect(bx, y, 60, 32);
            doc.setTextColor(50, 70, 120); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
            doc.text(sig.title, bx + 30, y + 7, { align: 'center' });
            doc.setLineWidth(0.3); doc.line(bx + 5, y + 24, bx + 55, y + 24);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 90, 120);
            doc.text(sig.name, bx + 30, y + 30, { align: 'center' });
        });

        // ── FOOTER ───────────────────────────────────────────
        const ph = doc.internal.pageSize.getHeight();
        doc.setFillColor(13, 17, 35);
        doc.rect(0, ph - 12, 210, 12, 'F');
        doc.setTextColor(97, 218, 251); doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
        doc.text(`MaintPro CMMS v4.0  |  UNIPAZ \u2014 TOSEM 2026-1  |  Generado: ${new Date().toLocaleString('es-CO')}  |  ${company.name}`, 105, ph - 5, { align: 'center' });

        doc.save(`OT-${woId.substring(0,8).toUpperCase()}_${asset?.code || 'EQU'}_${store.today()}.pdf`);
        this.toast('\uD83D\uDCC4 PDF generado correctamente', 'success');
    }
}

// ---- Start ----
document.addEventListener('DOMContentLoaded', () => { window.app = new App(); });
