/* ============================================
   MaintPro CMMS v4.1 - Data Store
   Almacenamiento híbrido: localStorage (rápido) + Firebase Firestore (nube)
   Los datos NUNCA se pierden aunque el estudiante borre el caché.
   ============================================ */

// ── Firebase Configuration ──────────────────────────────────────────────────
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA1opQnr1pUyNM2vlB1dy08CvBhlw1t5FU",
    authDomain: "maintpro-cmms-d5e71.firebaseapp.com",
    projectId: "maintpro-cmms-d5e71",
    storageBucket: "maintpro-cmms-d5e71.firebasestorage.app",
    messagingSenderId: "955471872147",
    appId: "1:955471872147:web:36b9ed3309d788a3c08d66"
};

// Inicializar Firebase una sola vez
let _fbApp = null;
let _fbDb  = null;
try {
    if (!firebase.apps.length) {
        _fbApp = firebase.initializeApp(FIREBASE_CONFIG);
    } else {
        _fbApp = firebase.apps[0];
    }
    _fbDb = firebase.firestore();
} catch(e) {
    console.warn('[MaintPro] Firebase no disponible (modo offline):', e.message);
}

class DataStore {
    constructor(cedula, options = {}) {
        this.cedula = cedula;
        this.STORAGE_KEY = `maintpro_${cedula}`;
        this.db = _fbDb;  // referencia global a Firestore
        this._cloudRef = this.db
            ? this.db.collection('students').doc(String(cedula))
            : null;
        this._lastSaveTimestamp = 0;  // prevent circular snapshot triggers
        this._unsubscribeSnapshot = null;  // Firestore listener handle

        // 1. Intentar cargar de localStorage (rápido, sincrónico)
        this.data = this.load();

        if (!this.data || !this.data.companies || this.data.companies.length === 0) {
            // 2. Si localStorage vacío → intentar recuperar de Firestore
            this.data = null;  // se llenará en loadFromCloud (async)
            this._bootstrapFromCloud(cedula);  // no esperar async
        } else {
            // Datos locales ok → migrar y sincronizar en background
            this._migrate();
            this.currentCompanyId = this.data ? this.data.companies[0].id : null;
            this._syncToCloud();  // actualizar Firestore en background
        }

        // 3. Start real-time listener ONLY for the main store (not temp instances)
        if (options.listen) {
            this._startRealtimeListener();
        }
    }

    /** Carga desde Firestore si localStorage está vacío (primer login desde nuevo dispositivo) */
    async _bootstrapFromCloud(cedula) {
        let loaded = false;
        if (this._cloudRef) {
            try {
                const snap = await this._cloudRef.get();
                if (snap.exists) {
                    const cloudData = snap.data();
                    if (cloudData && cloudData.companies && cloudData.companies.length > 0) {
                        this.data = cloudData;
                        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
                        loaded = true;
                        console.info('[MaintPro] ✅ Datos recuperados de Firestore para:', cedula);
                    }
                }
            } catch(e) {
                console.warn('[MaintPro] No se pudo leer Firestore:', e.message);
            }
        }
        if (!loaded) {
            // Sin datos en nube → generar datos iniciales
            this.data = generateStudentData(cedula);
            if (this.data) this.save();
        }
        this._migrate();
        this.currentCompanyId = this.data ? this.data.companies[0].id : null;
        // Notificar a la app que los datos están listos (rerender suave)
        if (window.app && typeof window.app.navigate === 'function') {
            window.app.navigate(window.app.currentSection || 'dashboard');
        }
    }

    _migrate() {
        if (!this.data) return;
        if (!this.data.inventoryMovements) this.data.inventoryMovements = [];
        if (!this.data.purchases) this.data.purchases = [];
        // Migrate personnel to include hourlyRate and certifications
        (this.data.personnel || []).forEach(p => {
            if (p.hourlyRate === undefined) p.hourlyRate = 25000;
            if (!p.certifications) p.certifications = [];
        });
        // Migrate assets to include warrantyDate and manualUrl
        (this.data.assets || []).forEach(a => {
            if (!a.warrantyDate) a.warrantyDate = '';
            if (!a.manualUrl) a.manualUrl = '';
            if (!a.parentId) a.parentId = null;
        });
        // Migrate preventive plans to include meter fields
        (this.data.preventivePlans || []).forEach(p => {
            if (!p.triggerType) p.triggerType = 'tiempo';
            if (!p.meterUnit) p.meterUnit = '';
            if (!p.meterInterval) p.meterInterval = '';
            if (!p.currentMeterReading) p.currentMeterReading = '';
            if (!p.lastMeterReading) p.lastMeterReading = '';
            if (!p.checklist) {
                p.checklist = (p.tasks || '').split('|').filter(Boolean).map(t => ({ task: t.trim(), done: false }));
            }
        });
        if (!this.data.injectedAlerts) this.data.injectedAlerts = [];
        if (!this.data.notifications) this.data.notifications = [];
        this.save();
    }

    load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    save() {
        if (this.data) {
            // 1. Guardar localmente (instantáneo)
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
            // 2. Sincronizar a Firestore en background (no bloquea la UI)
            this._syncToCloud();
        }
    }

    /** Sincroniza el estado actual a Firestore (background, no bloquea) */
    _syncToCloud() {
        if (!this._cloudRef || !this.data) return;
        this._lastSaveTimestamp = Date.now();
        this._cloudRef.set(this.data)
            .catch(e => console.warn('[MaintPro] Error sync Firestore:', e.message));
    }

    /** Real-time listener: detects remote changes (teacher fault injection, purchase approvals) */
    _startRealtimeListener() {
        if (!this._cloudRef) return;
        this._unsubscribeSnapshot = this._cloudRef.onSnapshot(snap => {
            // Ignore snapshots triggered by our own save (within 3 seconds)
            if (Date.now() - this._lastSaveTimestamp < 3000) return;
            if (!snap.exists) return;
            const remoteData = snap.data();
            if (!remoteData || !remoteData.companies) return;

            // Check if remote has new injected alerts we haven't seen
            const localAlerts = (this.data?.injectedAlerts || []).map(a => a.id);
            const remoteAlerts = (remoteData.injectedAlerts || []);
            const newAlerts = remoteAlerts.filter(a => !localAlerts.includes(a.id));

            // Check if remote has more work orders (fault injected)
            const localWOCount = (this.data?.workOrders || []).length;
            const remoteWOCount = (remoteData.workOrders || []).length;

            // Check if asset statuses changed (fuera_de_servicio)
            const localDownAssets = (this.data?.assets || []).filter(a => a.status === 'fuera_de_servicio').length;
            const remoteDownAssets = (remoteData.assets || []).filter(a => a.status === 'fuera_de_servicio').length;

            // Check for purchase status changes (approved/rejected)
            const localApproved = (this.data?.purchases || []).filter(p => p.status === 'aprobada').length;
            const remoteApproved = (remoteData.purchases || []).filter(p => p.status === 'aprobada').length;
            const localCancelled = (this.data?.purchases || []).filter(p => p.status === 'cancelada').length;
            const remoteCancelled = (remoteData.purchases || []).filter(p => p.status === 'cancelada').length;

            // Check for new notifications
            const localNotifCount = (this.data?.notifications || []).length;
            const remoteNotifCount = (remoteData.notifications || []).length;

            const hasChanges = newAlerts.length > 0 ||
                               remoteWOCount !== localWOCount ||
                               remoteDownAssets !== localDownAssets ||
                               remoteApproved !== localApproved ||
                               remoteCancelled !== localCancelled ||
                               remoteNotifCount !== localNotifCount;

            if (hasChanges) {
                console.info('[MaintPro] 🔄 Cambio remoto detectado — actualizando datos...');
                this.data = remoteData;
                this._migrate();
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
                this.currentCompanyId = this.data.companies[0].id;

                // Build change context for the app
                const changeContext = {
                    newAlerts,
                    purchaseApproved: remoteApproved > localApproved,
                    purchaseRejected: remoteCancelled > localCancelled,
                    newWorkOrders: remoteWOCount > localWOCount,
                    assetsDown: remoteDownAssets > localDownAssets
                };

                // Notify the app to refresh the current view
                if (window.app && typeof window.app._onRemoteUpdate === 'function') {
                    window.app._onRemoteUpdate(newAlerts, changeContext);
                }
            }
        }, err => {
            console.warn('[MaintPro] Snapshot listener error:', err.message);
        });
    }

    /** Stop listening (called on logout) */
    stopListening() {
        if (this._unsubscribeSnapshot) {
            this._unsubscribeSnapshot();
            this._unsubscribeSnapshot = null;
        }
    }

    /** Fuerza recuperar los datos desde Firestore (útil si el docente hizo cambios remotos) */
    async refreshFromCloud() {
        if (!this._cloudRef) return false;
        try {
            const snap = await this._cloudRef.get();
            if (snap.exists) {
                this.data = snap.data();
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
                return true;
            }
        } catch(e) {
            console.warn('[MaintPro] Error al refrescar desde Firestore:', e.message);
        }
        return false;
    }

    resetData() {
        this.data = generateStudentData(this.cedula);
        if (this.data) {
            this._migrate();
            this.currentCompanyId = this.data.companies[0].id;
            this.save();
        }
    }

    // ---------- Helpers ----------
    genId() {
        return 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    }

    today() {
        return new Date().toISOString().split('T')[0];
    }

    dateOffset(days) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    }

    // ---------- Company (single per student) ----------
    getCompanies() { return this.data.companies; }
    getCompany(id) { return this.data.companies.find(c => c.id === id); }
    getCurrentCompany() { return this.getCompany(this.currentCompanyId); }

    setCurrentCompany(id) {
        this.currentCompanyId = id;
    }

    // ---------- Generic CRUD ----------
    _getCollection(name) {
        return (this.data[name] || []).filter(item => item.companyId === this.currentCompanyId);
    }

    _getAll(name) {
        return this.data[name] || [];
    }

    _getById(name, id) {
        return (this.data[name] || []).find(item => item.id === id);
    }

    _add(name, item) {
        if (!this.data[name]) this.data[name] = [];
        item.id = this.genId();
        item.companyId = this.currentCompanyId;
        item.createdAt = this.today();
        this.data[name].push(item);
        this.save();
        return item;
    }

    _update(name, id, updates) {
        const idx = (this.data[name] || []).findIndex(item => item.id === id);
        if (idx !== -1) {
            Object.assign(this.data[name][idx], updates);
            this.data[name][idx].updatedAt = this.today();
            this.save();
            return this.data[name][idx];
        }
        return null;
    }

    _delete(name, id) {
        this.data[name] = (this.data[name] || []).filter(item => item.id !== id);
        this.save();
    }

    // ---------- Assets ----------
    getAssets() { return this._getCollection('assets'); }
    getAsset(id) { return this._getById('assets', id); }
    addAsset(a) { return this._add('assets', a); }
    updateAsset(id, u) { return this._update('assets', id, u); }
    deleteAsset(id) { this._delete('assets', id); }

    getAssetChildren(parentId) {
        return this.getAssets().filter(a => a.parentId === parentId);
    }

    getAssetTree() {
        const assets = this.getAssets();
        const roots = assets.filter(a => !a.parentId);
        const buildTree = (parent) => ({
            ...parent,
            children: assets.filter(a => a.parentId === parent.id).map(buildTree)
        });
        return roots.map(buildTree);
    }

    // ---------- Work Orders ----------
    getWorkOrders() { return this._getCollection('workOrders'); }
    getWorkOrder(id) { return this._getById('workOrders', id); }

    addWorkOrder(wo) {
        const result = this._add('workOrders', wo);
        if (wo.assignedTo && !wo.skipNotify) {
            const asset = this.getAsset(wo.assetId);
            this.addNotification({
                techId: wo.assignedTo,
                message: `\uD83D\uDCCB Nueva OT asignada: ${(wo.description || 'Sin descripci\u00f3n').substring(0, 65)}${asset ? ' \u2014 ' + asset.name : ''}`,
                type: 'wo_assigned',
                relatedId: result.id,
                priority: wo.priority
            });
        }
        return result;
    }

    updateWorkOrder(id, u) {
        const old = this.getWorkOrder(id);
        const result = this._update('workOrders', id, u);
        if (u.assignedTo && u.assignedTo !== old?.assignedTo) {
            const asset = this.getAsset(old?.assetId);
            this.addNotification({
                techId: u.assignedTo,
                message: `\uD83D\uDD04 OT reasignada: ${(old?.description || 'Sin descripci\u00f3n').substring(0, 65)}${asset ? ' \u2014 ' + asset.name : ''}`,
                type: 'wo_reassigned',
                relatedId: id,
                priority: old?.priority
            });
        }
        return result;
    }

    deleteWorkOrder(id) { this._delete('workOrders', id); }

    // ---------- Notifications ----------
    addNotification(notif) {
        if (!this.data.notifications) this.data.notifications = [];
        this.data.notifications.unshift({
            id: this.genId(),
            companyId: this.currentCompanyId,
            techId: notif.techId,
            message: notif.message,
            type: notif.type || 'info',
            relatedId: notif.relatedId || null,
            priority: notif.priority || 'media',
            timestamp: new Date().toISOString(),
            read: false
        });
        if (this.data.notifications.length > 100)
            this.data.notifications = this.data.notifications.slice(0, 100);
        this.save();
    }

    getNotifications(techId) {
        return (this.data.notifications || [])
            .filter(n => n.companyId === this.currentCompanyId && (!techId || n.techId === techId))
            .slice(0, 30);
    }

    getUnreadCount() {
        return (this.data.notifications || [])
            .filter(n => n.companyId === this.currentCompanyId && !n.read).length;
    }

    markNotificationRead(notifId) {
        (this.data.notifications || []).forEach(n => { if (n.id === notifId) n.read = true; });
        this.save();
    }

    markAllRead() {
        (this.data.notifications || [])
            .filter(n => n.companyId === this.currentCompanyId)
            .forEach(n => n.read = true);
        this.save();
    }

    // ---------- Preventive Plans ----------
    getPreventivePlans() { return this._getCollection('preventivePlans'); }
    getPreventivePlan(id) { return this._getById('preventivePlans', id); }
    addPreventivePlan(p) { return this._add('preventivePlans', p); }
    updatePreventivePlan(id, u) { return this._update('preventivePlans', id, u); }
    deletePreventivePlan(id) { this._delete('preventivePlans', id); }

    // ---------- Inventory ----------
    getInventory() { return this._getCollection('inventory'); }
    getInventoryItem(id) { return this._getById('inventory', id); }
    addInventoryItem(item) { return this._add('inventory', item); }
    updateInventoryItem(id, u) { return this._update('inventory', id, u); }
    deleteInventoryItem(id) { this._delete('inventory', id); }

    // ---------- Inventory Movements (Kardex) ----------
    getInventoryMovements(itemId) {
        return (this.data.inventoryMovements || [])
            .filter(m => m.itemId === itemId)
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }

    getAllMovements() {
        return (this.data.inventoryMovements || [])
            .filter(m => {
                const item = this._getById('inventory', m.itemId);
                return item && item.companyId === this.currentCompanyId;
            })
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }

    addInventoryMovement(movement) {
        if (!this.data.inventoryMovements) this.data.inventoryMovements = [];
        movement.id = this.genId();
        movement.date = movement.date || new Date().toISOString();
        this.data.inventoryMovements.push(movement);
        this.save();
        return movement;
    }

    deductInventory(itemId, quantity, woId, reason) {
        const item = this.getInventoryItem(itemId);
        if (!item) return false;
        const currentQty = parseFloat(item.quantity) || 0;
        const deductQty = parseFloat(quantity) || 0;
        if (deductQty <= 0 || deductQty > currentQty) return false;
        this.updateInventoryItem(itemId, { quantity: String(currentQty - deductQty) });
        this.addInventoryMovement({
            itemId, type: 'salida', quantity: deductQty,
            reason: reason || 'Consumo por OT',
            woId: woId || null, user: 'Sistema'
        });
        // Check if stock fell below minimum → auto-create purchase request
        const updated = this.getInventoryItem(itemId);
        if (parseFloat(updated.quantity) <= parseFloat(updated.minStock)) {
            this.autoCreatePurchase(itemId);
        }
        return true;
    }

    addStock(itemId, quantity, reason, user) {
        const item = this.getInventoryItem(itemId);
        if (!item) return false;
        const currentQty = parseFloat(item.quantity) || 0;
        const addQty = parseFloat(quantity) || 0;
        if (addQty <= 0) return false;
        this.updateInventoryItem(itemId, { quantity: String(currentQty + addQty) });
        this.addInventoryMovement({
            itemId, type: 'entrada', quantity: addQty,
            reason: reason || 'Reposición de stock',
            user: user || 'Sistema'
        });
        return true;
    }

    // ---------- Purchases ----------
    // Purchases > $1,000,000 COP require docente approval (needsApproval flag)
    APPROVAL_THRESHOLD = 1000000;

    getPurchases() { return this._getCollection('purchases'); }
    getPurchase(id) { return this._getById('purchases', id); }
    addPurchase(p) {
        const cost = parseFloat(p.estimatedCost) || 0;
        if (cost >= this.APPROVAL_THRESHOLD) {
            p.status = 'pendiente_gerencia';
            p.needsApproval = true;
        }
        return this._add('purchases', p);
    }
    updatePurchase(id, u) { return this._update('purchases', id, u); }
    deletePurchase(id) { this._delete('purchases', id); }

    autoCreatePurchase(itemId) {
        const item = this.getInventoryItem(itemId);
        if (!item) return;
        const existing = this.getPurchases().find(p =>
            p.itemId === itemId && (p.status === 'pendiente' || p.status === 'pendiente_gerencia')
        );
        if (existing) return;
        const orderQty = Math.max(parseFloat(item.maxStock) - parseFloat(item.quantity), 1);
        const cost = orderQty * (parseFloat(item.unitCost) || 0);
        const needsApproval = cost >= this.APPROVAL_THRESHOLD;
        this.addPurchase({
            itemId, itemName: item.name, itemCode: item.code,
            quantity: orderQty, unit: item.unit,
            estimatedCost: cost,
            supplier: item.supplier || '',
            status: needsApproval ? 'pendiente_gerencia' : 'pendiente',
            needsApproval,
            priority: parseFloat(item.quantity) <= 0 ? 'critica' : 'alta',
            reason: 'Stock bajo — nivel mínimo alcanzado',
            requestDate: this.today(),
            approvedDate: '', deliveredDate: '', notes: ''
        });
    }

    // ---------- Personnel ----------
    getPersonnel() { return this._getCollection('personnel'); }
    getPersonnelById(id) { return this._getById('personnel', id); }
    addPersonnel(p) { return this._add('personnel', p); }
    updatePersonnel(id, u) { return this._update('personnel', id, u); }
    deletePersonnel(id) { this._delete('personnel', id); }

    // ---------- Activity Log ----------
    addLog(entry) {
        if (!this.data.activityLog) this.data.activityLog = [];
        this.data.activityLog.unshift({
            id: this.genId(),
            companyId: this.currentCompanyId,
            timestamp: new Date().toISOString(),
            ...entry
        });
        if (this.data.activityLog.length > 500) this.data.activityLog = this.data.activityLog.slice(0, 500);
        this.save();
    }

    getRecentLogs(limit = 10) {
        return (this.data.activityLog || [])
            .filter(l => l.companyId === this.currentCompanyId)
            .slice(0, limit);
    }

    // ---------- KPIs ----------
    getKPIs() {
        const assets = this.getAssets();
        const wos = this.getWorkOrders();
        const plans = this.getPreventivePlans();
        const inventory = this.getInventory();
        const personnel = this.getPersonnel();

        const completed = wos.filter(w => w.status === 'completada');
        const pending = wos.filter(w => w.status === 'pendiente');
        const inProgress = wos.filter(w => w.status === 'en_progreso');

        // MTTR
        let mttr = 0;
        if (completed.length > 0) {
            const totalHours = completed.reduce((s, w) => s + (parseFloat(w.actualHours) || parseFloat(w.estimatedHours) || 2), 0);
            mttr = (totalHours / completed.length).toFixed(1);
        }

        // MTBF
        const correctiveCompleted = completed.filter(w => w.type === 'correctivo');
        let mtbf = assets.length > 0 ? Math.round(365 / Math.max(correctiveCompleted.length, 1)) : 0;

        // Availability
        const totalPossibleHours = assets.length * 720;
        const downtime = wos.reduce((s, w) => s + (parseFloat(w.actualHours) || parseFloat(w.estimatedHours) || 0), 0);
        const availability = totalPossibleHours > 0 ? (((totalPossibleHours - downtime) / totalPossibleHours) * 100).toFixed(1) : 100;

        // Low stock
        const lowStock = inventory.filter(i => parseFloat(i.quantity) <= parseFloat(i.minStock));

        // Overdue PMs
        const today = this.today();
        const activePlans = plans.filter(p => p.status === 'activo');
        const overduePlans = activePlans.filter(p => p.nextExecution && p.nextExecution < today);

        // Plan Compliance
        const pmWOs = completed.filter(w => w.type === 'preventivo');
        const totalPlannedPMs = activePlans.length + pmWOs.length;
        const planCompliance = totalPlannedPMs > 0 ? Math.round((pmWOs.length / totalPlannedPMs) * 100) : 0;

        // Cost Analysis
        const laborCost = completed.reduce((sum, w) => {
            const hours = parseFloat(w.actualHours) || parseFloat(w.estimatedHours) || 0;
            const tech = this.getPersonnelById(w.assignedTo);
            const rate = tech ? (parseFloat(tech.hourlyRate) || 25000) : 25000;
            return sum + (hours * rate);
        }, 0);

        const partsCost = this.getAllMovements()
            .filter(m => m.type === 'salida')
            .reduce((sum, m) => {
                const item = this.getInventoryItem(m.itemId);
                return sum + ((parseFloat(m.quantity) || 0) * (parseFloat(item?.unitCost) || 0));
            }, 0);

        // Pending purchases
        const pendingPurchases = this.getPurchases().filter(p => p.status === 'pendiente').length;
        const pendingManagerPurchases = this.getPurchases().filter(p => p.status === 'pendiente_gerencia').length;

        return {
            totalAssets: assets.length,
            activeAssets: assets.filter(a => a.status === 'operativo').length,
            totalWOs: wos.length,
            pendingWOs: pending.length,
            inProgressWOs: inProgress.length,
            completedWOs: completed.length,
            cancelledWOs: wos.filter(w => w.status === 'cancelada').length,
            mttr: parseFloat(mttr),
            mtbf,
            availability: parseFloat(availability),
            lowStockCount: lowStock.length,
            overduePMs: overduePlans.length,
            totalPlans: plans.length,
            activePlans: activePlans.length,
            totalPersonnel: personnel.length,
            planCompliance,
            laborCost,
            partsCost,
            totalCost: laborCost + partsCost,
            pendingPurchases,
            pendingManagerPurchases,
            woByType: {
                correctivo: wos.filter(w => w.type === 'correctivo').length,
                preventivo: wos.filter(w => w.type === 'preventivo').length,
                predictivo: wos.filter(w => w.type === 'predictivo').length,
                mejora: wos.filter(w => w.type === 'mejora').length,
            },
            woByPriority: {
                critica: wos.filter(w => w.priority === 'critica').length,
                alta: wos.filter(w => w.priority === 'alta').length,
                media: wos.filter(w => w.priority === 'media').length,
                baja: wos.filter(w => w.priority === 'baja').length,
            }
        };
    }

    // ---------- Asset-specific KPIs ----------
    getAssetKPIs(assetId) {
        const wos = this.getWorkOrders().filter(w => w.assetId === assetId);
        const completed = wos.filter(w => w.status === 'completada');
        const totalHours = completed.reduce((s, w) => s + (parseFloat(w.actualHours) || parseFloat(w.estimatedHours) || 0), 0);
        const mttr = completed.length > 0 ? (totalHours / completed.length).toFixed(1) : 0;
        const lastWO = completed.sort((a, b) => (b.completedDate || '').localeCompare(a.completedDate || ''))[0];

        // Cost for this asset
        const laborCost = completed.reduce((sum, w) => {
            const hours = parseFloat(w.actualHours) || parseFloat(w.estimatedHours) || 0;
            const tech = this.getPersonnelById(w.assignedTo);
            const rate = tech ? (parseFloat(tech.hourlyRate) || 25000) : 25000;
            return sum + (hours * rate);
        }, 0);

        return {
            totalWOs: wos.length,
            completedWOs: completed.length,
            pendingWOs: wos.filter(w => w.status === 'pendiente').length,
            inProgressWOs: wos.filter(w => w.status === 'en_progreso').length,
            totalHours: totalHours.toFixed(1),
            mttr: parseFloat(mttr),
            lastIntervention: lastWO ? lastWO.completedDate : null,
            correctiveCount: wos.filter(w => w.type === 'correctivo').length,
            preventiveCount: wos.filter(w => w.type === 'preventivo').length,
            laborCost,
        };
    }

    // ---------- Fault Injection (Admin/Docente) ----------
    injectFailure(assetId, description, priority) {
        const asset = this.getAsset(assetId);
        if (!asset) return null;

        // 1. Cambiar estado del equipo a fuera_de_servicio (NO crear OT)
        this.updateAsset(assetId, { status: 'fuera_de_servicio' });

        // 2. Crear reporte de avería (el estudiante debe crear la OT)
        if (!this.data.faultReports) this.data.faultReports = [];
        const reportId = this.genId();
        const report = {
            id: reportId,
            companyId: this.currentCompanyId,
            assetId,
            assetName: asset.name,
            assetCode: asset.code,
            description: description || `Falla crítica detectada en ${asset.name}`,
            priority: priority || 'critica',
            reportedBy: 'Docente (Simulación)',
            reportedDate: this.today(),
            timestamp: new Date().toISOString(),
            status: 'pendiente'  // pendiente = esperando que el Jefe cree la OT
        };
        this.data.faultReports.push(report);

        // 3. Log de actividad
        this.addLog({
            action: 'fault_injected',
            message: `⚠️ Falla reportada por docente: ${asset.name} — Requiere gestión de OT`
        });

        // 4. Alerta visual para el estudiante
        if (!this.data.injectedAlerts) this.data.injectedAlerts = [];
        this.data.injectedAlerts.push({
            id: this.genId(),
            companyId: this.currentCompanyId,
            assetId, assetName: asset.name,
            reportId,
            message: `⚠️ El equipo <strong>${asset.name}</strong> ha presentado una falla ${priority || 'crítica'}. <strong>Debe crear una OT correctiva.</strong>`,
            timestamp: new Date().toISOString(),
            seen: false
        });

        // 5. Notificación persistente
        this.addNotification({
            techId: null,
            message: `🔧 AVERÍA: ${asset.name} (${asset.code}) está fuera de servicio. Cree una OT correctiva desde Órdenes de Trabajo.`,
            type: 'fault_injected',
            relatedId: reportId,
            priority: priority || 'critica'
        });

        this.save();
        return report;
    }

    // ---------- Fault Reports ----------
    getFaultReports() {
        return (this.data.faultReports || [])
            .filter(r => r.companyId === this.currentCompanyId);
    }

    getPendingFaultReports() {
        return this.getFaultReports().filter(r => r.status === 'pendiente');
    }

    resolveFaultReport(reportId, woId) {
        const report = (this.data.faultReports || []).find(r => r.id === reportId);
        if (report) {
            report.status = 'gestionado';
            report.woId = woId;
            report.resolvedDate = this.today();
            this.save();
        }
        return report;
    }

    getUnseenAlerts() {
        return (this.data.injectedAlerts || [])
            .filter(a => a.companyId === this.currentCompanyId && !a.seen);
    }

    markAlertSeen(alertId) {
        (this.data.injectedAlerts || []).forEach(a => {
            if (a.id === alertId) a.seen = true;
        });
        this.save();
    }

    // ---------- Work Orders by date range (for calendar) ----------
    getWorkOrdersByMonth(year, month) {
        return this.getWorkOrders().filter(w => {
            const dates = [w.createdDate, w.startDate, w.completedDate].filter(Boolean);
            return dates.some(d => {
                const dt = new Date(d + 'T12:00:00');
                return dt.getFullYear() === year && dt.getMonth() === month;
            });
        });
    }

    getPlansInMonth(year, month) {
        return this.getPreventivePlans().filter(p => {
            if (!p.nextExecution || p.status !== 'activo') return false;
            const dt = new Date(p.nextExecution + 'T12:00:00');
            return dt.getFullYear() === year && dt.getMonth() === month;
        });
    }
}

// Global store - initialized after login
let store = null;

function initStore(cedula) {
    if (store && store.stopListening) store.stopListening();
    store = new DataStore(cedula, { listen: true });
}
