/* ============================================
   MaintPro CMMS v2.0 - Sistema de Autenticación
   Login/Logout con sesión por cédula
   ============================================ */

class Auth {
    constructor() {
        this.SESSION_KEY = 'maintpro_session';
    }

    // Intentar login como estudiante (cédula) o admin (username + password)
    login(identifier, password) {
        // Check admin
        if (identifier === ADMIN_CREDENTIALS.username) {
            if (password === ADMIN_CREDENTIALS.password) {
                this._saveSession({ type: 'admin', cedula: null, nombre: 'Administrador (Docente)' });
                return { success: true, type: 'admin' };
            }
            return { success: false, message: 'Contraseña de administrador incorrecta.' };
        }

        // Check student by cédula
        const student = getStudentByCedula(identifier);
        if (student) {
            this._saveSession({ type: 'student', cedula: student.cedula, nombre: student.nombre });
            return { success: true, type: 'student', student };
        }

        return { success: false, message: 'Número de cédula no registrado en el sistema.' };
    }

    logout() {
        sessionStorage.removeItem(this.SESSION_KEY);
    }

    getSession() {
        try {
            const raw = sessionStorage.getItem(this.SESSION_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    isLoggedIn() {
        return this.getSession() !== null;
    }

    isAdmin() {
        const s = this.getSession();
        return s && s.type === 'admin';
    }

    getCurrentCedula() {
        const s = this.getSession();
        return s ? s.cedula : null;
    }

    getCurrentName() {
        const s = this.getSession();
        return s ? s.nombre : '';
    }

    _saveSession(data) {
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(data));
    }

    // Admin: cambiar a ver datos de un estudiante específico
    adminViewStudent(cedula) {
        const s = this.getSession();
        if (s && s.type === 'admin') {
            s.cedula = cedula;
            const student = getStudentByCedula(cedula);
            s.viewingName = student ? student.nombre : '';
            this._saveSession(s);
        }
    }
}

// Instancia global
const auth = new Auth();
