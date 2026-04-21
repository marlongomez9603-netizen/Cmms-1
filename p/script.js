const app = {
    integrity: 100, // Equivale a nota 5.0 (100 / 20 = 5.0)
    warnings: 0,
    maxWarnings: 3,
    examActive: false,
    timerInterval: null,
    timeLeft: 150 * 60, // 150 minutos (2:30 hr)
    studentData: { name: "", id: "" },
    
    // Resultados para enviar al final
    results: {
        room1_errors: 0,
        room2_errors: 0,
        room3_errors: 0,
        room4_errors: 0,
        warnings_count: 0,
        final_grade: 5.0
    },

    init: function() {
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.startExam();
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.examActive) {
                this.registerViolation();
            }
        });

        window.onbeforeunload = (e) => {
            if (this.examActive) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
    },

    startExam: function() {
        const nameInput = document.getElementById('studentName').value.trim();
        const idInput = document.getElementById('studentId').value.trim();
        
        if(!nameInput || !idInput) return;

        this.studentData.name = nameInput;
        this.studentData.id = idInput;
        document.getElementById('display-name').textContent = nameInput;

        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('exam-dashboard').classList.remove('hidden');
        document.getElementById('exam-dashboard').classList.add('active');

        this.examActive = true;
        this.startTimer();
        this.updateHealthUI();
    },

    startTimer: function() {
        const timerDisplay = document.getElementById('timer');
        
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            
            const hours = Math.floor(this.timeLeft / 3600);
            const minutes = Math.floor((this.timeLeft % 3600) / 60);
            const seconds = this.timeLeft % 60;
            
            timerDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            if(this.timeLeft <= 300) { 
                timerDisplay.classList.add('danger');
            }

            if(this.timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.forceEndExam("El tiempo se ha agotado. El sistema se ha bloqueado de forma automática.");
            }
        }, 1000);
    },

    registerViolation: function() {
        this.warnings++;
        document.getElementById('warnings').textContent = this.warnings;
        this.results.warnings_count = this.warnings;

        if (this.warnings >= this.maxWarnings) {
            this.integrity = 0; // FRAUDE DETECTADO = NOTA 0
            this.updateHealthUI();
            this.forceEndExam("Límite de infracciones (Anti-Fraude) superado. Examen ANULADO por intento de copia. Tu calificación final es 0.0.");
        } else {
            this.showModal(`¡ALERTA DE SEGURIDAD! (${this.warnings}/${this.maxWarnings})\n\nEl sistema detectó que cambiaste de ventana/pestaña (Práctica prohibida). Penalización aplicada (-5% Integridad).`, true);
            this.applyDamage(5); // -5% (0.25 en nota)
        }
    },

    applyDamage: function(amount) {
        this.integrity -= amount;
        if(this.integrity < 0) this.integrity = 0;
        this.updateHealthUI();

        if(this.integrity === 0) {
            this.forceEndExam("LA INTEGRIDAD DE LA PLANTA LLEGÓ A 0%. Desastre operativo por acumulación de errores de ingeniería.");
        }
    },

    updateHealthUI: function() {
        const bar = document.getElementById('health-bar');
        const text = document.getElementById('health-text');
        const gradeText = document.getElementById('grade-text');
        
        bar.style.width = this.integrity + '%';
        text.textContent = Math.round(this.integrity) + '%';
        
        if (this.integrity > 60) {
            bar.style.background = "linear-gradient(90deg, #10b981, #059669)";
        } else if (this.integrity > 30) {
            bar.style.background = "linear-gradient(90deg, #f59e0b, #d97706)";
        } else {
            bar.style.background = "linear-gradient(90deg, #ef4444, #dc2626)";
        }

        const nota = (this.integrity / 20).toFixed(1);
        gradeText.textContent = nota;
        this.results.final_grade = nota;

        if(parseFloat(nota) < 3.0) {
            gradeText.style.color = 'var(--danger)';
            gradeText.style.borderColor = 'var(--danger)';
            gradeText.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
        }
    },

    showModal: function(msg, isDanger = false) {
        const modal = document.querySelector('.modal');
        const overlay = document.getElementById('modal-overlay');
        
        document.getElementById('modal-title').textContent = isDanger ? "¡ALERTA EN PLANTA!" : "Análisis Completado";
        document.getElementById('modal-title').style.color = isDanger ? "var(--danger)" : "var(--accent)";
        document.getElementById('modal-msg').innerText = msg;
        
        if(isDanger) {
            modal.classList.add('modal-danger');
        } else {
            modal.classList.remove('modal-danger');
        }

        overlay.classList.remove('hidden');
    },

    closeModal: function() {
        document.getElementById('modal-overlay').classList.add('hidden');
    },

    switchRoom: function(currentId, nextId) {
        document.getElementById(currentId).classList.add('hidden');
        document.getElementById(currentId).classList.remove('active');
        document.getElementById(nextId).classList.remove('hidden');
        document.getElementById(nextId).classList.add('active');
        window.scrollTo(0,0);
    },

    // --- SALA 1: TIPOS MTTO Y FALLA ---
    submitRoom1: function() {
        const q1a = document.getElementById('r1-q1a').value;
        const q1b = document.getElementById('r1-q1b').value;
        const q2a = document.getElementById('r1-q2a').value;
        const q2b = document.getElementById('r1-q2b').value;
        const q3a = document.getElementById('r1-q3a').value;
        const q3b = document.getElementById('r1-q3b').value;

        if(!q1a || !q1b || !q2a || !q2b || !q3a || !q3b) {
            alert("No puedes abandonar la sala sin responder todas las situaciones.");
            return;
        }

        let errors = 0;
        let msgs = [];

        // SITUACION 1: Incipiente / Predictivo
        if(q1a !== 'incipiente') { errors++; msgs.push("Bomba: Es Falla Incipiente porque no ha perdido función."); }
        if(q1b !== 'predictivo') { errors++; msgs.push("Bomba: Como hay tendencia, se aplica Monitoreo/Predictivo."); }
        
        // SITUACION 2: Oculta / Preventivo_busqueda
        if(q2a !== 'oculta') { errors++; msgs.push("PSV: Si no avisa hasta ser requerida, es Oculta."); }
        if(q2b !== 'preventivo') { errors++; msgs.push("PSV: La prueba anual es Mantenimiento Preventivo (Búsqueda de Fallas)."); }
        
        // SITUACION 3: Preventivo / Mitigar
        if(q3a !== 'preventivo_sistematico') { errors++; msgs.push("Compresor: Hacerlo cada 5000h religiosas es Sistemático/Tiempo."); }
        if(q3b !== 'mitigar') { errors++; msgs.push("Compresor: Se hace con el fin de mitigar degradación, no para predecir ni restaurar fallo total."); }

        this.results.room1_errors = errors;

        if(errors > 0) {
            const damage = errors * 4; // -4% por error (-0.2 nota)
            this.applyDamage(damage);
            this.showModal(`Diagnóstico erróneo detectado (${errors} respuestas mal sancionadas).\n\nPenalización general: -${damage}% de Integridad.\n\n` + msgs.join("\n"), true);
        } else {
            this.showModal("Diagnóstico 100% preciso. Procediendo a Planeación y Control.");
        }

        this.switchRoom('room-1', 'room-2');
    },

    // --- SALA 2: TAREAS (Planeación) ---
    submitRoom2: function() {
        const q1 = document.getElementById('r2-q1').value;
        const q2 = document.getElementById('r2-q2').value;
        const q3 = document.getElementById('r2-q3').value;
        const q4 = document.getElementById('r2-q4').value;
        const q5 = document.getElementById('r2-q5').value;
        const q6 = document.getElementById('r2-q6').value;

        if(!q1 || !q2 || !q3 || !q4 || !q5 || !q6) {
            alert("Ordena todos los 6 pasos antes de aprobar la Orden de Trabajo.");
            return;
        }

        let errors = 0;
        let msgs = [];

        // RESPUESTAS CORRECTAS: aislar, desacoplar, desmontar, instalar, alinear, arranque.
        if(q1 !== 't_aislar') { errors++; msgs.push("P1: Debes aplicar LOTO primero por seguridad."); }
        if(q2 !== 't_desacoplar') { errors++; msgs.push("P2: Es necesario desacoplar la carga libre."); }
        if(q3 !== 't_desmontar') { errors++; msgs.push("P3: Desarmar para llegar a rodamiento."); }
        if(q4 !== 't_instalar') { errors++; msgs.push("P4: Rodamiento se instala con equipo adecuado (inducción)."); }
        if(q5 !== 't_alinear') { errors++; msgs.push("P5: Una vez puesto motor en sitio, requiere alineación láser."); }
        if(q6 !== 't_arranque') { errors++; msgs.push("P6: El paso final es probar vibraciones e iniciar máquina."); }

        this.results.room2_errors = errors;

        // Validamos si hay duplicados que causen trampa fácil
        const uniqs = new Set([q1, q2, q3, q4, q5, q6]);
        if(uniqs.size < 6) {
            alert("Has repetido una o más tareas. Cada paso debe ser único.");
            return;
        }

        if(errors > 0) {
            const damage = errors * 5; // -5% por error secuencial
            this.applyDamage(damage);
            
            // Si metió mano mal al LOTO, penalización doble (Error Crítico Seguridad)
            if(q1 !== 't_aislar') {
                 this.applyDamage(10);
                 msgs.unshift("⚠️ ERROR CRÍTICO DE SEGURIDAD. No aislaste eléctricamente al inicio. Riesgo de Muerte (-10% extra).");
            }
            this.showModal(`Planificador, tienes ${errors} tareas ordenadas incorrectamente.\n\n` + msgs.join("\n"), true);
        } else {
            this.showModal("¡Orden de Trabajo Aprobada! Procedimiento seguro e impecable.");
        }

        if(this.integrity > 0) this.switchRoom('room-2', 'room-3');
    },

    // --- SALA 3: 5 POR QUE ---
    submitRoom3: function() {
        const q1 = document.getElementById('r3-q1').value;
        const q2 = document.getElementById('r3-q2').value;
        const q3 = document.getElementById('r3-q3').value;
        const q4 = document.getElementById('r3-q4').value;
        const q5 = document.getElementById('r3-q5').value;

        if(!q1 || !q2 || !q3 || !q4 || !q5) {
            alert("Debes completar todo el árbol lógico.");
            return;
        }

        let errors = 0;

        // ORDEN: Sello -> Vibracion -> Desalineacion -> Laser(A Ojo) -> Procedimiento
        if(q1 !== 'pq_sello') errors++;
        if(q2 !== 'pq_vibracion') errors++;
        if(q3 !== 'pq_desaline') errors++;
        if(q4 !== 'pq_laser') errors++;
        if(q5 !== 'pq_procedimiento') errors++;

        this.results.room3_errors = errors;

        if(errors > 0) {
            const damage = errors * 4; 
            this.applyDamage(damage);
            this.showModal(`Tus 5 "Por Qué" no tienen lógica deductiva constante (${errors} niveles equivocados). Penalización: -${damage}%.\n\nEl orden correcto iba desde la ruptura del sello hasta la falla en el estándar documental.`, true);
        } else {
            this.showModal("Análisis estructural perfecto. Has encontrado la Causa Raíz Sistémica.");
        }

        if(this.integrity > 0) this.switchRoom('room-3', 'room-4');
    },

    // --- SALA 4: ISHIKAWA (6M) ---
    submitRoom4: function() {
        // Recolectar las 12 variables
        let answers = [];
        let missing = false;
        for(let i=1; i<=12; i++) {
            let val = document.getElementById('r4-q'+i).value;
            if(!val) missing = true;
            answers.push(val);
        }

        if(missing) {
            if(!confirm("Faltan hallazgos por etiquetar. ¿Estás seguro de terminar el examen ahora? Se calificarán con nota baja los espacios en blanco.")) return;
        }

        let errors = 0;
        // Hallazgos mapeados 
        // A: mano_obra, B: medicion, C: maquina, D: materiales, E: medio_amb, F: mano_obra
        // G: medicion, H: materiales, I: metodo, J: maquina, K: metodo, L: medio_amb
        
        const expected = [
            'mano_obra', // A
            'medicion',  // B
            'maquina',   // C
            'materiales',// D
            'medio_amb', // E
            'mano_obra', // F
            'medicion',  // G
            'materiales',// H
            'metodo',    // I
            'maquina',   // J
            'metodo',    // K
            'medio_amb'  // L
        ];

        for(let j=0; j<12; j++) {
            if(answers[j] !== expected[j]) errors++;
        }

        this.results.room4_errors = errors;

        if(errors > 0) {
            this.applyDamage(errors * 2.5); // Cada uno vale aprox 2.5%. En total son 30% si tienen todo Ishikawa malo (1.5 de nota bajada)
        }

        if(this.integrity > 0) {
            this.forceEndExam("El Turno Operativo ha terminado. Reportes entregados.");
        }
    },

    finishExam: function() {
        this.submitRoom4();
    },

    forceEndExam: function(reason) {
        this.examActive = false;
        clearInterval(this.timerInterval);
        
        document.getElementById('exam-dashboard').classList.add('hidden');
        document.getElementById('exam-dashboard').classList.remove('active');
        document.querySelector('.modal-overlay').classList.add('hidden');
        
        const resultScreen = document.getElementById('result-screen');
        resultScreen.classList.remove('hidden');
        resultScreen.classList.add('active');

        const scoreEl = document.getElementById('final-score-display');
        const feedbackEl = document.getElementById('final-feedback');
        
        scoreEl.textContent = this.results.final_grade;
        
        if (parseFloat(this.results.final_grade) < 3.0) {
            scoreEl.classList.add('score-fail');
            feedbackEl.innerHTML = `<span style="color:var(--danger)">FRACASO DE DIAGNÓSTICO:</span> ${reason}<br>La planta detuvo su línea principal bajo tu mando.`;
            document.getElementById('final-title').innerHTML = `<i class="fas fa-biohazard"></i> EXAMEN REPROBADO`;
            document.getElementById('final-title').style.color = "var(--danger)";
        } else {
            feedbackEl.textContent = `${reason} Has conseguido mantener el sistema de Confiabilidad seguro.`;
        }

        this.sendDataToGoogleSheets();
    },

    sendDataToGoogleSheets: function() {
        const statusEl = document.getElementById('sending-status');
        
        // Simulación: aquí pondremos el fetch() real en su momento.
        // const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/TUSCRIPTID/exec";
        
        const payload = {
            timestamp: new Date().toISOString(),
            nombre: this.studentData.name,
            codigo: this.studentData.id,
            nota: this.results.final_grade,
            infracciones_fraude: this.results.warnings_count,
            err_r1: this.results.room1_errors,
            err_r2: this.results.room2_errors,
            err_r3: this.results.room3_errors,
            err_r4: this.results.room4_errors
        };

        console.log("Enviando notas...", payload);

        setTimeout(() => {
            statusEl.innerHTML = `<i class="fas fa-check-circle" style="color:var(--success)"></i>  Resultados enviados a la plataforma del Docente. Ya puedes cerrar el navegador con seguridad.`;
            statusEl.style.color = "var(--success)";
        }, 1500);
    }
};

window.onload = () => {
    app.init();
};
