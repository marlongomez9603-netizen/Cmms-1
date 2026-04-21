/* ============================================
   MaintPro CMMS v2.0 - Registro de Estudiantes
   Datos maestros y generación determinista
   ============================================ */

// ---- Registro de Estudiantes ----
const STUDENTS = [
    { cedula: '1097183856', nombre: 'ACUÑA MENESES, DANIEL EDUARDO' },
    { cedula: '1096801641', nombre: 'AGAMEZ SANTOS, JORGE ANDRES' },
    { cedula: '1097183668', nombre: 'AMAYA DURAN, ARNULFO ELIAS' },
    { cedula: '1096200627', nombre: 'DIAZ MENDOZA, JOSE LUIS' },
    { cedula: '1096246370', nombre: 'ESCOBAR MOSCOTE, LEONARDO' },
    { cedula: '1051634628', nombre: 'GAMARRA CAMPO, OSCAR DAMIAN' },
    { cedula: '1096802843', nombre: 'GRIMALDO JARAMILLO, JUAN SEBASTIAN' },
    { cedula: '1102373572', nombre: 'HERNÁNDEZ PARRA, LUIS EDUARDO' },
    { cedula: '1005186689', nombre: 'HOYOS TOLOZA, JHORJAN DANIEL' },
    { cedula: '1051634775', nombre: 'MEJIA MIELES, KEINER ANDRES' },
    { cedula: '1005185382', nombre: 'OSPINO MONTOYA, HILLARY DANIELA' },
    { cedula: '1005221431', nombre: 'SALAS GALVAN, JHOEL FABIAN' },
    { cedula: '1097184508', nombre: 'SEPULVEDA RUEDA, XAVI DAMEK' },
    { cedula: '1096225235', nombre: 'SUAREZ ROVIRA, YEISON DONATO' },
    { cedula: '1052954359', nombre: 'TORRES VANEGAS, LUIS ALEXANDER' },
    { cedula: '1097783299', nombre: 'VARGAS RIVERA, SAMUEL' },
    { cedula: '1039681626', nombre: 'VELEÑO JIMENEZ, SEBASTIAN' },
    { cedula: '1005462180', nombre: 'VILLAMIZAR MEJIA, MAICOL DANIEL' },
    { cedula: '1095800511', nombre: 'YURANI GOMEZ, ANGELICA YURANI' },
    { cedula: '1111111111', nombre: 'USUARIO DE EJEMPLO, DEMO' }
];

const ADMIN_CREDENTIALS = { username: 'admin', password: 'Tosem2026' };

// ---- Helpers ----
function getStudentByCedula(cedula) {
    return STUDENTS.find(s => s.cedula === cedula) || null;
}

function getStudentApellido(nombre) {
    // "ACUÑA MENESES, DANIEL EDUARDO" → "Acuña"
    const parts = nombre.split(',')[0].split(' ');
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
}

// ---- Deterministic PRNG (Mulberry32) ----
function hashCedula(cedula) {
    let hash = 0;
    for (let i = 0; i < cedula.length; i++) {
        hash = ((hash << 5) - hash) + cedula.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function createRNG(seed) {
    return function () {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function pickN(rng, arr, n) {
    const copy = [...arr];
    const result = [];
    for (let i = 0; i < n && copy.length > 0; i++) {
        const idx = Math.floor(rng() * copy.length);
        result.push(copy.splice(idx, 1)[0]);
    }
    return result;
}

// ---- 6 Sectores Industriales ----
const SECTORS = [
    // ===== SECTOR 0: PETRÓLEO Y GAS =====
    {
        id: 'petroleo', name: 'Petróleo y Gas',
        companyPrefix: 'PetroAndina', locationPrefix: 'Estación',
        assets: [
            { name: 'Bomba Centrífuga Multietapa', code: 'BOM-CM', category: 'Bombas', brand: 'Sulzer', model: 'MSD-RO 50-250', criticality: 'alta', specs: 'Caudal: 300 m³/h, Presión: 25 bar, Potencia: 200 HP, Impulsor: Acero Inox 316' },
            { name: 'Compresor de Gas de Tornillo', code: 'COM-GT', category: 'Compresores', brand: 'Atlas Copco', model: 'GA 160+', criticality: 'alta', specs: 'Capacidad: 160 kW, Presión: 13 bar, Tipo: Tornillo rotativo' },
            { name: 'Separador Trifásico Horizontal', code: 'SEP-TH', category: 'Separadores', brand: 'National Oilwell', model: 'TPS-3000', criticality: 'alta', specs: 'Capacidad: 3000 bpd, Presión diseño: 300 psi, ASME Sec. VIII' },
            { name: 'Generador Diésel de Emergencia', code: 'GEN-DE', category: 'Generadores', brand: 'Caterpillar', model: 'C18 ACERT', criticality: 'alta', specs: 'Potencia: 600 kW, 750 kVA, Arranque automático, Tanque 12h' },
            { name: 'Intercambiador de Calor de Placas', code: 'INT-CP', category: 'Intercambiadores', brand: 'Alfa Laval', model: 'T20-MFG', criticality: 'media', specs: 'Área: 50 m², Material: AISI 316, Presión: 25 bar' },
            { name: 'Válvula de Control Neumática', code: 'VAL-CN', category: 'Válvulas', brand: 'Fisher', model: 'EZ 667', criticality: 'media', specs: 'Diámetro: 6\", Tipo: Globo, Actuador: Neumático, CV: 350' },
            { name: 'Motor Eléctrico de Inducción', code: 'MOT-EI', category: 'Motores', brand: 'WEG', model: 'W22 355M/L', criticality: 'media', specs: '250 HP, 460V/60Hz, 1785 RPM, Frame 355, IE3' },
            { name: 'Transformador de Potencia Seco', code: 'TRF-PS', category: 'Eléctrico', brand: 'ABB', model: 'RESIBLOC', criticality: 'alta', specs: '13.2kV/460V, 1000 kVA, Tipo seco, Clase F' },
            { name: 'Tanque de Almacenamiento API', code: 'TAN-AP', category: 'Almacenamiento', brand: 'CB&I', model: 'Tank 500', criticality: 'media', specs: 'Capacidad: 500 bbl, Techo flotante, API 650' },
            { name: 'Sistema de Bombeo de Inyección', code: 'SBI-IN', category: 'Bombas', brand: 'Grundfos', model: 'BM 125-4', criticality: 'alta', specs: 'Caudal: 125 m³/h, Presión: 40 bar, Multietapa vertical' }
        ],
        techPool: [
            { name: 'Juan Carlos Herrera', role: 'Técnico Mecánico', specialization: 'Equipos Rotativos', shift: 'Diurno (6am-6pm)', hourlyRate: 28000, certifications: ['Trabajo en Alturas','Espacios Confinados'] },
            { name: 'Andrés Felipe Ruiz', role: 'Técnico Mecánico', specialization: 'Compresores y Bombas', shift: 'Diurno (6am-6pm)', hourlyRate: 26000, certifications: ['Trabajo en Alturas','Izaje de Cargas'] },
            { name: 'Diana Marcela Torres', role: 'Ingeniera de Confiabilidad', specialization: 'Análisis Predictivo', shift: 'Administrativo (8am-5pm)', hourlyRate: 45000, certifications: ['Análisis de Vibraciones ISO 18436','Termografía Nivel I'] },
            { name: 'Pedro Alonso Díaz', role: 'Técnico Electricista', specialization: 'Alta y Media Tensión', shift: 'Nocturno (6pm-6am)', hourlyRate: 32000, certifications: ['RETIE','Trabajo en Alturas','Bloqueo y Etiquetado'] },
            { name: 'Laura Sofía Ramírez', role: 'Técnico Instrumentista', specialization: 'Instrumentación Industrial', shift: 'Diurno (6am-6pm)', hourlyRate: 30000, certifications: ['Calibración de Instrumentos','Programación PLC'] },
            { name: 'Carlos Mario Peña', role: 'Técnico de Lubricación', specialization: 'Tribología', shift: 'Diurno (6am-6pm)', hourlyRate: 24000, certifications: ['Análisis de Aceite Nivel I','Lubricación Industrial'] },
            { name: 'Ángela Patricia Gómez', role: 'Supervisora de Mantenimiento', specialization: 'Gestión de Activos', shift: 'Administrativo (8am-5pm)', hourlyRate: 50000, certifications: ['PMP','Gestión de Activos ISO 55001'] }
        ],
        inventoryPool: [
            { name: 'Sello mecánico Sulzer 50mm', code: 'REP-SM-001', category: 'Sellos', unit: 'und', quantity: '3', minStock: '2', maxStock: '8', unitCost: '450000', supplier: 'Sulzer Colombia' },
            { name: 'Filtro de aceite Atlas Copco', code: 'REP-FA-001', category: 'Filtros', unit: 'und', quantity: '8', minStock: '4', maxStock: '15', unitCost: '185000', supplier: 'Atlas Copco Service' },
            { name: 'Aceite sintético PAO 46 x 20L', code: 'LUB-AS-001', category: 'Lubricantes', unit: 'caneca', quantity: '2', minStock: '3', maxStock: '10', unitCost: '780000', supplier: 'Mobil Colombia' },
            { name: 'Rodamiento SKF 22328 CCK/W33', code: 'REP-RD-001', category: 'Rodamientos', unit: 'und', quantity: '4', minStock: '2', maxStock: '6', unitCost: '890000', supplier: 'SKF Colombia' },
            { name: 'Empaque de alta presión 6\"', code: 'REP-EP-001', category: 'Empaques', unit: 'und', quantity: '10', minStock: '5', maxStock: '20', unitCost: '65000', supplier: 'Garlock Colombia' },
            { name: 'Inyector Caterpillar C18', code: 'REP-IN-001', category: 'Inyección', unit: 'und', quantity: '1', minStock: '2', maxStock: '6', unitCost: '1250000', supplier: 'GECOLSA' }
        ],
        planTemplates: [
            { name: 'Inspección semanal de equipo rotativo', frequency: '7', frequencyUnit: 'días', estimatedHours: '1', tasks: 'Verificar presión de succión y descarga|Inspeccionar sellos mecánicos|Medir vibración|Verificar temperatura de rodamientos|Revisar nivel de aceite' },
            { name: 'Mantenimiento preventivo trimestral', frequency: '90', frequencyUnit: 'días', estimatedHours: '6', tasks: 'Cambio de aceite|Cambio de filtros|Inspección de válvulas|Limpieza de radiador|Verificación de presiones|Pruebas eléctricas' },
            { name: 'Inspección termográfica mensual', frequency: '30', frequencyUnit: 'días', estimatedHours: '2', tasks: 'Termografía de conexiones|Medición de resistencia de aislamiento|Verificación visual|Registro fotográfico' }
        ]
    },

    // ===== SECTOR 1: MANUFACTURA / MECANIZADO =====
    {
        id: 'manufactura', name: 'Manufactura y Mecanizado',
        companyPrefix: 'MetalPrecision', locationPrefix: 'Nave',
        assets: [
            { name: 'Torno CNC de Alta Precisión', code: 'TOR-CNC', category: 'Mecanizado', brand: 'Haas', model: 'TL-2', criticality: 'alta', specs: 'Volteo: 406mm, Largo: 864mm, Husillo: 20 HP, 4000 RPM' },
            { name: 'Fresadora CNC Vertical', code: 'FRE-CNC', category: 'Mecanizado', brand: 'Haas', model: 'VF-3', criticality: 'alta', specs: 'Recorrido X:1016mm Y:508mm Z:635mm, Husillo: 30 HP' },
            { name: 'Rectificadora Cilíndrica', code: 'REC-CIL', category: 'Mecanizado', brand: 'Studer', model: 'S33', criticality: 'media', specs: 'Diámetro máx: 350mm, Largo: 1000mm, Precisión: 0.001mm' },
            { name: 'Prensa Hidráulica Industrial', code: 'PRE-HI', category: 'Conformado', brand: 'DAKE', model: '150H', criticality: 'media', specs: 'Capacidad: 150 ton, Carrera: 300mm, Motor: 20 HP' },
            { name: 'Soldadora MIG/MAG Multiproceso', code: 'SOL-MIG', category: 'Soldadura', brand: 'Lincoln Electric', model: 'Power MIG 360MP', criticality: 'media', specs: 'Corriente: 360A, Voltaje: 208/230/460V, Multiproceso' },
            { name: 'Compresor de Aire Industrial', code: 'COM-AI', category: 'Compresores', brand: 'Ingersoll Rand', model: 'R110', criticality: 'alta', specs: 'Potencia: 110 kW, Caudal: 19.5 m³/min, 8 bar' },
            { name: 'Puente Grúa Monorriel', code: 'GRU-PM', category: 'Izaje', brand: 'Konecranes', model: 'CXT', criticality: 'alta', specs: 'Capacidad: 10 ton, Luz: 15m, Altura: 8m' },
            { name: 'Horno de Tratamiento Térmico', code: 'HOR-TT', category: 'Tratamiento Térmico', brand: 'Nabertherm', model: 'N 500/85HA', criticality: 'media', specs: 'Temp máx: 850°C, Volumen: 500L, Atmósfera controlada' },
            { name: 'Sierra de Cinta Industrial', code: 'SIE-CI', category: 'Corte', brand: 'DoAll', model: 'DC-280SA', criticality: 'baja', specs: 'Capacidad: 280mm, Velocidad: 20-100 m/min, Automática' },
            { name: 'Taladro Radial Industrial', code: 'TAL-RA', category: 'Mecanizado', brand: 'WMW', model: 'BR 50x1600', criticality: 'media', specs: 'Brazo: 1600mm, Husillo: Cono Morse 5, Potencia: 7.5 HP' }
        ],
        techPool: [
            { name: 'Ricardo José Ospina', role: 'Técnico CNC', specialization: 'Máquinas Herramienta CNC', shift: 'Diurno (7am-5pm)', hourlyRate: 35000, certifications: ['Programación CNC Fanuc','Metrología Dimensional'] },
            { name: 'Leonardo Fabio Mejía', role: 'Técnico de Mantenimiento', specialization: 'Sistemas Hidráulicos', shift: 'Diurno (7am-5pm)', hourlyRate: 27000, certifications: ['Hidráulica Industrial','Trabajo en Alturas'] },
            { name: 'Camila Andrea Restrepo', role: 'Ingeniera de Mantenimiento', specialization: 'Planificación y Confiabilidad', shift: 'Administrativo (8am-5pm)', hourlyRate: 48000, certifications: ['CMRP','Análisis RCM'] },
            { name: 'Jorge Enrique Castillo', role: 'Técnico Soldador', specialization: 'Soldadura y Metalurgia', shift: 'Diurno (7am-5pm)', hourlyRate: 30000, certifications: ['AWS D1.1','Soldadura SMAW/GMAW'] },
            { name: 'Sandra Patricia Rojas', role: 'Técnico de Metrología', specialization: 'Control de Calidad', shift: 'Diurno (7am-5pm)', hourlyRate: 28000, certifications: ['Metrología ISO 17025','Control Estadístico'] },
            { name: 'Edison Fabio Ríos', role: 'Técnico Electricista', specialization: 'Motores y Variadores', shift: 'Nocturno (7pm-5am)', hourlyRate: 30000, certifications: ['RETIE','Variadores de Frecuencia'] },
            { name: 'María Fernanda López', role: 'Supervisora de Producción', specialization: 'Gestión de Mantenimiento', shift: 'Administrativo (8am-5pm)', hourlyRate: 46000, certifications: ['Lean Manufacturing','TPM'] }
        ],
        inventoryPool: [
            { name: 'Aceite de guías ISO 68 x 20L', code: 'LUB-AG-001', category: 'Lubricantes', unit: 'caneca', quantity: '3', minStock: '2', maxStock: '8', unitCost: '425000', supplier: 'Shell Lubricantes' },
            { name: 'Refrigerante soluble x 20L', code: 'LUB-RF-001', category: 'Refrigerantes', unit: 'caneca', quantity: '6', minStock: '2', maxStock: '10', unitCost: '210000', supplier: 'Castrol Industrial' },
            { name: 'Inserto de carburo CNMG 120408', code: 'HER-IC-001', category: 'Herramientas', unit: 'caja x10', quantity: '5', minStock: '3', maxStock: '12', unitCost: '185000', supplier: 'Sandvik Coromant' },
            { name: 'Correa de transmisión HTD 8M', code: 'REP-CT-001', category: 'Transmisión', unit: 'und', quantity: '2', minStock: '2', maxStock: '6', unitCost: '320000', supplier: 'Gates Colombia' },
            { name: 'Filtro hidráulico 10 micras', code: 'REP-FH-001', category: 'Filtros', unit: 'und', quantity: '4', minStock: '3', maxStock: '10', unitCost: '145000', supplier: 'Parker Hannifin' },
            { name: 'Encoder incremental Fanuc', code: 'REP-EN-001', category: 'Electrónica', unit: 'und', quantity: '1', minStock: '1', maxStock: '3', unitCost: '3200000', supplier: 'Fanuc México' }
        ],
        planTemplates: [
            { name: 'Mantenimiento semestral de CNC', frequency: '180', frequencyUnit: 'días', estimatedHours: '8', tasks: 'Verificación de geometría|Nivelación de bancada|Cambio de aceite de guías|Cambio de aceite hidráulico|Limpieza de filtros|Verificación de herramientas' },
            { name: 'Lubricación semanal de máquinas', frequency: '7', frequencyUnit: 'días', estimatedHours: '1', tasks: 'Engrasar guías|Verificar nivel de aceite|Verificar nivel de refrigerante|Limpiar viruta de guías' },
            { name: 'Inspección mensual de seguridad', frequency: '30', frequencyUnit: 'días', estimatedHours: '3', tasks: 'Verificar guardas de seguridad|Probar paradas de emergencia|Verificar límites de carrera|Inspeccionar cables y mangueras' }
        ]
    },

    // ===== SECTOR 2: AGROINDUSTRIA =====
    {
        id: 'agroindustria', name: 'Agroindustria',
        companyPrefix: 'AgroVerde', locationPrefix: 'Finca',
        assets: [
            { name: 'Tractor Agrícola de Alta Potencia', code: 'TRC-AP', category: 'Maquinaria Agrícola', brand: 'John Deere', model: '6150M', criticality: 'alta', specs: 'Potencia: 150 HP, Motor: 6 cilindros, Transmisión PowerQuad' },
            { name: 'Cosechadora Combinada de Arroz', code: 'COS-CA', category: 'Maquinaria Agrícola', brand: 'New Holland', model: 'CR 7.90', criticality: 'alta', specs: 'Ancho corte: 9m, Motor: 374 HP, Tolva: 10500 L' },
            { name: 'Sistema de Riego Pivot Central', code: 'RIE-PC', category: 'Sistemas de Riego', brand: 'Valley', model: '8000 Series', criticality: 'alta', specs: 'Cobertura: 50 hectáreas, 7 tramos, GPS integrado' },
            { name: 'Secadora de Granos Industrial', code: 'SEC-GI', category: 'Procesamiento', brand: 'Kepler Weber', model: 'KW 200', criticality: 'alta', specs: 'Capacidad: 200 ton/día, Combustible: Gas Natural' },
            { name: 'Molino de Martillos para Granos', code: 'MOL-MG', category: 'Procesamiento', brand: 'Bühler', model: 'DFZK', criticality: 'media', specs: 'Capacidad: 15 ton/h, Motor: 75 HP, Criba intercambiable' },
            { name: 'Bomba de Riego Sumergible', code: 'BOM-RS', category: 'Bombas', brand: 'Pedrollo', model: 'HF 32B', criticality: 'media', specs: 'Caudal: 800 L/min, Altura: 25m, Motor: 15 HP' },
            { name: 'Planta Eléctrica Portátil', code: 'GEN-PP', category: 'Generadores', brand: 'Cummins', model: 'C150D5', criticality: 'media', specs: 'Potencia: 150 kW, Diésel, Arranque automático' },
            { name: 'Fumigadora Autopropulsada', code: 'FUM-AU', category: 'Maquinaria Agrícola', brand: 'Jacto', model: 'Uniport 3030', criticality: 'media', specs: 'Tanque: 3000L, Barra: 30m, GPS con corte automático' },
            { name: 'Báscula de Camiones Digital', code: 'BAS-CD', category: 'Instrumentación', brand: 'Mettler Toledo', model: 'VTC-201', criticality: 'baja', specs: 'Capacidad: 80 ton, Plataforma: 18x3m, Precisión: ±20kg' },
            { name: 'Banda Transportadora de Granos', code: 'BAN-TG', category: 'Transporte', brand: 'Rexnord', model: 'TR-40', criticality: 'media', specs: 'Longitud: 40m, Ancho: 600mm, Capacidad: 100 ton/h' }
        ],
        techPool: [
            { name: 'Miguel Ángel Parra', role: 'Técnico de Maquinaria', specialization: 'Motores Diésel', shift: 'Diurno (6am-4pm)', hourlyRate: 25000, certifications: ['Motores Diésel Cat/JD','Trabajo en Alturas'] },
            { name: 'Fabián Enrique Castro', role: 'Técnico Electromecánico', specialization: 'Sistemas de Riego', shift: 'Diurno (6am-4pm)', hourlyRate: 26000, certifications: ['Sistemas de Riego','Electrobombas'] },
            { name: 'Sandra Patricia Muñoz', role: 'Supervisora de Mantenimiento', specialization: 'Gestión de Activos', shift: 'Administrativo (7am-4pm)', hourlyRate: 42000, certifications: ['Gestión de Activos','Seguridad Industrial'] },
            { name: 'Carlos Alberto Pérez', role: 'Técnico Agrícola', specialization: 'Maquinaria Pesada', shift: 'Diurno (6am-4pm)', hourlyRate: 24000, certifications: ['Operación Maquinaria Pesada','GPS Agrícola'] },
            { name: 'Ana María González', role: 'Técnico Eléctrico', specialization: 'Automatización Agrícola', shift: 'Diurno (7am-4pm)', hourlyRate: 28000, certifications: ['RETIE','Automatización'] },
            { name: 'Héctor Julio Rincón', role: 'Técnico de Lubricación', specialization: 'Mantenimiento Preventivo', shift: 'Diurno (6am-4pm)', hourlyRate: 22000, certifications: ['Lubricación Industrial','Análisis de Aceite'] },
            { name: 'Luz Dary Ortega', role: 'Ingeniera de Procesos', specialization: 'Post-cosecha', shift: 'Administrativo (7am-4pm)', hourlyRate: 44000, certifications: ['BPA','Gestión de Calidad'] }
        ],
        inventoryPool: [
            { name: 'Aceite motor 15W-40 x 20L', code: 'LUB-AM-001', category: 'Lubricantes', unit: 'caneca', quantity: '5', minStock: '3', maxStock: '12', unitCost: '320000', supplier: 'Terpel Lubricantes' },
            { name: 'Kit de filtros John Deere 6150M', code: 'REP-KF-001', category: 'Filtros', unit: 'kit', quantity: '2', minStock: '2', maxStock: '6', unitCost: '280000', supplier: 'DERCO - John Deere' },
            { name: 'Motor de tramo Valley Pivot', code: 'REP-MT-001', category: 'Motores', unit: 'und', quantity: '1', minStock: '1', maxStock: '3', unitCost: '2800000', supplier: 'Valley Irrigation' },
            { name: 'Termocupla tipo K industrial', code: 'REP-TK-001', category: 'Instrumentación', unit: 'und', quantity: '6', minStock: '3', maxStock: '10', unitCost: '45000', supplier: 'Instrumentos y Controles' },
            { name: 'Grasa EP2 multiuso x 16kg', code: 'LUB-GR-001', category: 'Lubricantes', unit: 'balde', quantity: '3', minStock: '2', maxStock: '6', unitCost: '195000', supplier: 'Mobil Colombia' },
            { name: 'Correa de transmisión B-68', code: 'REP-CB-001', category: 'Transmisión', unit: 'und', quantity: '4', minStock: '2', maxStock: '8', unitCost: '85000', supplier: 'Gates Colombia' }
        ],
        planTemplates: [
            { name: 'Servicio de mantenimiento por horas', frequency: '30', frequencyUnit: 'días', estimatedHours: '4', tasks: 'Cambio de aceite motor|Cambio de filtros|Engrase general|Revisión de neumáticos|Verificar niveles de fluidos' },
            { name: 'Revisión mensual de sistema de riego', frequency: '30', frequencyUnit: 'días', estimatedHours: '3', tasks: 'Verificar alineación de tramos|Inspeccionar aspersores|Revisar presión de agua|Verificar motores|Lubricar pivotes' },
            { name: 'Inspección pre-cosecha de maquinaria', frequency: '180', frequencyUnit: 'días', estimatedHours: '8', tasks: 'Revisión completa de motor|Verificar sistema de corte|Calibrar sensores|Probar sistemas hidráulicos|Engrasar cadenas' }
        ]
    },

    // ===== SECTOR 3: MINERÍA / CEMENTOS =====
    {
        id: 'mineria', name: 'Minería y Cementos',
        companyPrefix: 'MineralAndes', locationPrefix: 'Mina',
        assets: [
            { name: 'Trituradora de Mandíbulas Primaria', code: 'TRI-MP', category: 'Trituración', brand: 'Metso', model: 'C120', criticality: 'alta', specs: 'Abertura: 1200x870mm, Capacidad: 400 ton/h, Motor: 160 kW' },
            { name: 'Molino de Bolas para Molienda', code: 'MOL-BM', category: 'Molienda', brand: 'FLSmidth', model: 'BM 3.2x4.5', criticality: 'alta', specs: 'Diámetro: 3.2m, Largo: 4.5m, Potencia: 800 kW' },
            { name: 'Banda Transportadora Principal', code: 'BAN-TP', category: 'Transporte', brand: 'Continental', model: 'ST-800', criticality: 'alta', specs: 'Longitud: 800m, Ancho: 1200mm, Capacidad: 1500 ton/h' },
            { name: 'Horno Rotatorio de Clínker', code: 'HOR-RC', category: 'Calcinación', brand: 'ThyssenKrupp', model: 'POLYSIUS', criticality: 'alta', specs: 'Diámetro: 4.4m, Largo: 67m, Capacidad: 3000 ton/día' },
            { name: 'Clasificador Vibratorio', code: 'CLA-VB', category: 'Clasificación', brand: 'Metso', model: 'CVB 2050', criticality: 'media', specs: '2 niveles, Área: 5x2m, Motor: 2x30 HP, Doble excéntrica' },
            { name: 'Excavadora Hidráulica Minera', code: 'EXC-HM', category: 'Maquinaria Pesada', brand: 'Komatsu', model: 'PC490LC-11', criticality: 'alta', specs: 'Peso: 49 ton, Motor: 359 HP, Balde: 3.2 m³' },
            { name: 'Volqueta Rígida Minera', code: 'VOL-RM', category: 'Maquinaria Pesada', brand: 'Caterpillar', model: '775G', criticality: 'media', specs: 'Capacidad: 64 ton, Motor: 700 HP, 6x4' },
            { name: 'Sistema de Ventilación Principal', code: 'VEN-SP', category: 'Ventilación', brand: 'Howden', model: 'AVD 2500', criticality: 'alta', specs: 'Caudal: 250.000 CFM, Presión: 12\" WG, Motor: 500 HP' },
            { name: 'Bomba de Lodos Centrífuga', code: 'BOM-LC', category: 'Bombas', brand: 'Warman', model: '10/8 ST-AH', criticality: 'media', specs: 'Caudal: 500 m³/h, Presión: 45m, Impulsor: Hi-chrome' },
            { name: 'Torre de Enfriamiento Industrial', code: 'TOR-EF', category: 'Enfriamiento', brand: 'SPX Cooling', model: 'Marley MD', criticality: 'media', specs: 'Capacidad: 2000 GPM, Rango: 10°C, Fibra de vidrio' }
        ],
        techPool: [
            { name: 'Rodrigo Alejandro Vega', role: 'Técnico Mecánico', specialization: 'Equipos Pesados', shift: 'Diurno (6am-6pm)', hourlyRate: 28000, certifications: ['Trabajo en Alturas','Espacios Confinados','Izaje de Cargas'] },
            { name: 'Wilson Eduardo Mora', role: 'Técnico Eléctrico', specialization: 'Potencia y Control', shift: 'Diurno (6am-6pm)', hourlyRate: 30000, certifications: ['RETIE','Media Tensión'] },
            { name: 'Natalia Andrea Silva', role: 'Ingeniera de Mantenimiento', specialization: 'Planeación y Programación', shift: 'Administrativo (7am-5pm)', hourlyRate: 48000, certifications: ['CMRP','Gestión de Activos ISO 55001'] },
            { name: 'Oscar Fernando Ríos', role: 'Técnico de Lubricación', specialization: 'Tribología Industrial', shift: 'Diurno (6am-6pm)', hourlyRate: 24000, certifications: ['Análisis de Aceite Nivel II','Lubricación Central'] },
            { name: 'Diego Armando López', role: 'Técnico Hidráulico', specialization: 'Sistemas Hidráulicos Pesados', shift: 'Diurno (6am-6pm)', hourlyRate: 29000, certifications: ['Hidráulica Pesada','Mangueras HP'] },
            { name: 'Julio César Amaya', role: 'Operador de Planta', specialization: 'Trituración y Molienda', shift: 'Rotativo (3 turnos)', hourlyRate: 22000, certifications: ['Operación de Planta','Primeros Auxilios'] },
            { name: 'Carolina Esther Flórez', role: 'Técnico Instrumentista', specialization: 'Automatización de Procesos', shift: 'Diurno (7am-5pm)', hourlyRate: 32000, certifications: ['PLC Siemens','Instrumentación'] }
        ],
        inventoryPool: [
            { name: 'Mandíbula fija Metso C120', code: 'REP-MF-001', category: 'Desgaste', unit: 'und', quantity: '1', minStock: '1', maxStock: '3', unitCost: '8500000', supplier: 'Metso Colombia' },
            { name: 'Bolas de acero 3\" para molino', code: 'REP-BA-001', category: 'Desgaste', unit: 'tonelada', quantity: '5', minStock: '3', maxStock: '15', unitCost: '3200000', supplier: 'Moly-Cop' },
            { name: 'Aceite hidráulico ISO 46 x 55gal', code: 'LUB-AH-001', category: 'Lubricantes', unit: 'tambor', quantity: '3', minStock: '2', maxStock: '8', unitCost: '1100000', supplier: 'Shell Lubricantes' },
            { name: 'Banda transportadora 1200mm x 50m', code: 'REP-BT-001', category: 'Bandas', unit: 'rollo', quantity: '1', minStock: '1', maxStock: '2', unitCost: '12500000', supplier: 'Continental Belting' },
            { name: 'Filtro de aire para Komatsu', code: 'REP-FK-001', category: 'Filtros', unit: 'und', quantity: '4', minStock: '2', maxStock: '8', unitCost: '340000', supplier: 'Komatsu Colombia' },
            { name: 'Grasa para alta temperatura EP3', code: 'LUB-GT-001', category: 'Lubricantes', unit: 'balde 16kg', quantity: '4', minStock: '2', maxStock: '6', unitCost: '285000', supplier: 'Castrol Industrial' }
        ],
        planTemplates: [
            { name: 'Inspección diaria de equipos pesados', frequency: '7', frequencyUnit: 'días', estimatedHours: '2', tasks: 'Verificar niveles de fluidos|Inspeccionar mangueras hidráulicas|Verificar neumáticos/orugas|Revisar sistema de frenos|Verificar alarma de retroceso' },
            { name: 'Mantenimiento preventivo de trituradora', frequency: '30', frequencyUnit: 'días', estimatedHours: '8', tasks: 'Medir desgaste de mandíbulas|Verificar ajuste de mandíbulas|Inspeccionar rodamientos|Revisar tensión de correas|Lubricación general' },
            { name: 'Alineación y tensión de bandas', frequency: '15', frequencyUnit: 'días', estimatedHours: '3', tasks: 'Verificar alineación de banda|Verificar tensión|Inspeccionar rodillos|Revisar raspadores|Verificar vulcanización de empalmes' }
        ]
    },

    // ===== SECTOR 4: ENERGÍA / ELÉCTRICO =====
    {
        id: 'energia', name: 'Energía y Eléctrico',
        companyPrefix: 'ElectroNorte', locationPrefix: 'Subestación',
        assets: [
            { name: 'Turbina de Vapor Industrial', code: 'TUR-VI', category: 'Turbomaquinaria', brand: 'Siemens', model: 'SST-300', criticality: 'alta', specs: 'Potencia: 10 MW, Presión entrada: 40 bar, 7500 RPM' },
            { name: 'Generador Sincrónico Trifásico', code: 'GEN-ST', category: 'Generadores', brand: 'ABB', model: 'AMG 1600', criticality: 'alta', specs: 'Potencia: 12 MVA, 13.8 kV, 60 Hz, Factor P: 0.8' },
            { name: 'Transformador de Potencia 115kV', code: 'TRF-PA', category: 'Transformadores', brand: 'Siemens', model: 'TUNORMA', criticality: 'alta', specs: '115/34.5 kV, 30 MVA, ONAN/ONAF, Aceite mineral' },
            { name: 'Subestación Encapsulada GIS', code: 'SUB-GIS', category: 'Subestaciones', brand: 'ABB', model: 'ELK-14', criticality: 'alta', specs: '34.5 kV, SF6, 5 celdas, Protección digital' },
            { name: 'UPS Industrial de Alta Potencia', code: 'UPS-AP', category: 'Respaldo', brand: 'Eaton', model: '93PM-200', criticality: 'media', specs: '200 kVA, Doble conversión, Autonomía: 30 min' },
            { name: 'Banco de Baterías Estacionarias', code: 'BAT-ES', category: 'Almacenamiento', brand: 'Exide', model: 'GNB Marathon', criticality: 'media', specs: '125 VDC, 200 Ah, Plomo-ácido regulada' },
            { name: 'Tablero de Distribución Principal', code: 'TDP-PR', category: 'Distribución', brand: 'Schneider', model: 'Prisma Plus P', criticality: 'alta', specs: '460V, 3200A, 50 kA, Protección digital' },
            { name: 'Motor de Inducción 500 HP', code: 'MOT-IN', category: 'Motores', brand: 'WEG', model: 'W22 500HP', criticality: 'media', specs: '500 HP, 460V, 60Hz, 1785 RPM, TEFC, IE3' },
            { name: 'Variador de Frecuencia Industrial', code: 'VFD-IN', category: 'Control', brand: 'ABB', model: 'ACS880-01', criticality: 'media', specs: 'Potencia: 250 kW, Control vectorial, Ethernet/IP' },
            { name: 'Sistema de Puesta a Tierra', code: 'SPT-TI', category: 'Protección', brand: 'Erico', model: 'ERITECH', criticality: 'alta', specs: 'Malla de tierra: 50x50m, Resistencia: <5 Ω, Pararrayos' }
        ],
        techPool: [
            { name: 'Fernando Antonio Cruz', role: 'Ingeniero Eléctrico', specialization: 'Protecciones y Relés', shift: 'Administrativo (8am-5pm)', hourlyRate: 52000, certifications: ['RETIE','Protecciones SEL','IEEE'] },
            { name: 'Martha Lucía Vargas', role: 'Técnico de Subestaciones', specialization: 'Alta Tensión', shift: 'Diurno (6am-6pm)', hourlyRate: 35000, certifications: ['Alta Tensión','Maniobras en Subestaciones','RETIE'] },
            { name: 'Héctor Julio Mendoza', role: 'Técnico Electrónico', specialization: 'Control y Automatización', shift: 'Diurno (7am-5pm)', hourlyRate: 32000, certifications: ['PLC Allen Bradley','SCADA'] },
            { name: 'Paola Andrea Jiménez', role: 'Técnico Instrumentista', specialization: 'Sistemas SCADA', shift: 'Diurno (7am-5pm)', hourlyRate: 30000, certifications: ['SCADA Wonderware','Redes Industriales'] },
            { name: 'Sergio Iván Martínez', role: 'Técnico Mecánico', specialization: 'Turbomaquinaria', shift: 'Rotativo (3 turnos)', hourlyRate: 34000, certifications: ['Turbomaquinaria','Alineación Láser','Balanceo'] },
            { name: 'Cristian David Barrera', role: 'Técnico de Baterías', specialization: 'Sistemas DC y UPS', shift: 'Diurno (7am-5pm)', hourlyRate: 28000, certifications: ['Sistemas DC','UPS Industrial'] },
            { name: 'Ingrid Johanna Pedraza', role: 'Supervisora de Operaciones', specialization: 'Gestión de Energía', shift: 'Administrativo (8am-5pm)', hourlyRate: 48000, certifications: ['ISO 50001','Gestión Energética'] }
        ],
        inventoryPool: [
            { name: 'Aceite dieléctrico x 55 galones', code: 'LUB-AD-001', category: 'Lubricantes', unit: 'tambor', quantity: '2', minStock: '2', maxStock: '6', unitCost: '2800000', supplier: 'Nynas Colombia' },
            { name: 'SF6 (Hexafluoruro de azufre) x 50kg', code: 'GAS-SF-001', category: 'Gases', unit: 'cilindro', quantity: '1', minStock: '1', maxStock: '3', unitCost: '3500000', supplier: 'AGA Fano' },
            { name: 'Batería estacionaria 2V 200Ah', code: 'REP-BE-001', category: 'Baterías', unit: 'und', quantity: '4', minStock: '2', maxStock: '10', unitCost: '850000', supplier: 'Exide Colombia' },
            { name: 'Fusible HH 34.5kV 40A', code: 'REP-FU-001', category: 'Protección', unit: 'und', quantity: '6', minStock: '3', maxStock: '12', unitCost: '420000', supplier: 'Schneider Electric' },
            { name: 'Relé de protección multifunción', code: 'REP-RL-001', category: 'Protección', unit: 'und', quantity: '1', minStock: '1', maxStock: '2', unitCost: '8500000', supplier: 'SEL (Schweitzer)' },
            { name: 'Ventilador para transformador', code: 'REP-VT-001', category: 'Refrigeración', unit: 'und', quantity: '2', minStock: '1', maxStock: '4', unitCost: '1200000', supplier: 'Ziehl-Abegg' }
        ],
        planTemplates: [
            { name: 'Inspección termográfica de subestación', frequency: '30', frequencyUnit: 'días', estimatedHours: '3', tasks: 'Termografía de conexiones|Revisar nivel aceite transformador|Verificar presión SF6|Inspección visual de aisladores|Registro fotográfico' },
            { name: 'Mantenimiento de banco de baterías', frequency: '90', frequencyUnit: 'días', estimatedHours: '4', tasks: 'Medir voltaje por celda|Medir densidad electrolito|Verificar conexiones|Limpieza de terminales|Prueba de descarga' },
            { name: 'Pruebas eléctricas de protecciones', frequency: '180', frequencyUnit: 'días', estimatedHours: '8', tasks: 'Inyección de corrientes|Verificar tiempos de disparo|Calibrar relés|Probar transferencia automática|Documentar resultados' }
        ]
    },

    // ===== SECTOR 5: ALIMENTOS / PROCESAMIENTO =====
    {
        id: 'alimentos', name: 'Alimentos y Procesamiento',
        companyPrefix: 'NutriProcesos', locationPrefix: 'Planta',
        assets: [
            { name: 'Pasteurizadora HTST Industrial', code: 'PAS-HT', category: 'Tratamiento Térmico', brand: 'Alfa Laval', model: 'Front 8', criticality: 'alta', specs: 'Capacidad: 8000 L/h, Temp: 72-85°C, Tiempo: 15-30s' },
            { name: 'Empacadora al Vacío Automática', code: 'EMP-VA', category: 'Empaque', brand: 'Multivac', model: 'R535', criticality: 'alta', specs: 'Ciclos: 8/min, Formado Ternmoformado, Ancho: 420mm' },
            { name: 'Cámara de Refrigeración Industrial', code: 'CAM-RI', category: 'Refrigeración', brand: 'Bitzer', model: 'CSH 8573-110', criticality: 'alta', specs: 'Volumen: 200m³, Temp: -18°C, Refrigerante: R-404A' },
            { name: 'Mezcladora Industrial de Paletas', code: 'MEZ-IP', category: 'Mezclado', brand: 'Tetra Pak', model: 'High Shear Mixer', criticality: 'media', specs: 'Capacidad: 2000L, Motor: 30 HP, Acero Inox 316L' },
            { name: 'Envasadora Automática de Líquidos', code: 'ENV-AL', category: 'Envasado', brand: 'Sidel', model: 'SBO 10', criticality: 'alta', specs: 'Velocidad: 2400 env/h, Volúmenes: 250ml-2L, PET/Vidrio' },
            { name: 'Caldera de Vapor Pirotubular', code: 'CAL-VP', category: 'Generación de Vapor', brand: 'Cleaver-Brooks', model: 'CBLE-200', criticality: 'alta', specs: 'Capacidad: 200 BHP, Presión: 150 psi, Gas Natural' },
            { name: 'Sistema de Filtración de Agua', code: 'FIL-AG', category: 'Tratamiento de Agua', brand: 'Pall', model: 'Aria AP-4', criticality: 'media', specs: 'Caudal: 50 m³/h, Filtración: 0.1 micras, UF' },
            { name: 'Banda de Selección con Detector', code: 'BAN-SD', category: 'Selección', brand: 'Mettler Toledo', model: 'Safeline', criticality: 'media', specs: 'Ancho: 800mm, Detector metales, Rechazo automático' },
            { name: 'Homogeneizador de Alta Presión', code: 'HOM-AP', category: 'Procesamiento', brand: 'GEA', model: 'Ariete 2500', criticality: 'media', specs: 'Caudal: 2500 L/h, Presión: 400 bar, 2 etapas' },
            { name: 'Autoclave Industrial Horizontal', code: 'AUT-IH', category: 'Esterilización', brand: 'Steriflow', model: 'Barriquand', criticality: 'alta', specs: 'Capacidad: 4 cestillas, Temp: 121°C, Contrapresión' }
        ],
        techPool: [
            { name: 'Gloria Esperanza Duarte', role: 'Técnico de Refrigeración', specialization: 'Cadena de Frío', shift: 'Diurno (6am-4pm)', hourlyRate: 28000, certifications: ['Refrigeración Industrial','Manejo de Refrigerantes'] },
            { name: 'Manuel Enrique Sánchez', role: 'Técnico Mecánico', specialization: 'Líneas de Producción', shift: 'Diurno (6am-4pm)', hourlyRate: 25000, certifications: ['BPM','Trabajo en Alturas'] },
            { name: 'Adriana Carolina Pineda', role: 'Ingeniera de Mantenimiento', specialization: 'Inocuidad y BPM', shift: 'Administrativo (7am-4pm)', hourlyRate: 46000, certifications: ['HACCP','BPM Avanzada','ISO 22000'] },
            { name: 'Jhon Fredy Gómez', role: 'Técnico Eléctrico', specialization: 'Automatización Industrial', shift: 'Nocturno (6pm-6am)', hourlyRate: 30000, certifications: ['RETIE','PLC Siemens','Variadores'] },
            { name: 'Viviana Marcela Ortiz', role: 'Técnico de Calderas', specialization: 'Generación de Vapor', shift: 'Rotativo (3 turnos)', hourlyRate: 32000, certifications: ['Operación de Calderas','NTC 2053','Tratamiento de Agua'] },
            { name: 'Edwin Andrés Cárdenas', role: 'Técnico Instrumentista', specialization: 'Sensores y PLC', shift: 'Diurno (7am-5pm)', hourlyRate: 29000, certifications: ['Calibración','Sensores de Proceso'] },
            { name: 'Dora Liliana Quintero', role: 'Supervisora de Planta', specialization: 'Gestión de Producción', shift: 'Administrativo (7am-4pm)', hourlyRate: 44000, certifications: ['Lean Manufacturing','SGC ISO 9001'] }
        ],
        inventoryPool: [
            { name: 'Refrigerante R-404A x 10kg', code: 'GAS-RF-001', category: 'Refrigerantes', unit: 'cilindro', quantity: '3', minStock: '2', maxStock: '6', unitCost: '480000', supplier: 'Refriaméricas' },
            { name: 'Empaque sanitario EPDM 4\"', code: 'REP-ES-001', category: 'Empaques', unit: 'und', quantity: '20', minStock: '10', maxStock: '40', unitCost: '35000', supplier: 'Alfa Laval Service' },
            { name: 'Aceite grado alimenticio H1 x 20L', code: 'LUB-GA-001', category: 'Lubricantes', unit: 'caneca', quantity: '2', minStock: '2', maxStock: '6', unitCost: '580000', supplier: 'NSF H1 Lubricants' },
            { name: 'Filtro de agua 0.5 micras', code: 'REP-FA-001', category: 'Filtros', unit: 'und', quantity: '6', minStock: '4', maxStock: '12', unitCost: '125000', supplier: 'Pall Colombia' },
            { name: 'Válvula sanitaria mariposa 3\"', code: 'REP-VM-001', category: 'Válvulas', unit: 'und', quantity: '3', minStock: '2', maxStock: '8', unitCost: '380000', supplier: 'Alfa Laval' },
            { name: 'Químico CIP alcalino x 20L', code: 'QUI-CA-001', category: 'Limpieza', unit: 'caneca', quantity: '4', minStock: '3', maxStock: '10', unitCost: '195000', supplier: 'Diversey Colombia' }
        ],
        planTemplates: [
            { name: 'Limpieza CIP de línea de producción', frequency: '7', frequencyUnit: 'días', estimatedHours: '3', tasks: 'Enjuague previo|Circulación de soda cáustica|Enjuague intermedio|Circulación de ácido|Enjuague final|Verificar pH' },
            { name: 'Mantenimiento preventivo de compresores de frío', frequency: '30', frequencyUnit: 'días', estimatedHours: '4', tasks: 'Verificar presiones de succión y descarga|Medir recalentamiento|Revisar nivel de aceite|Limpiar condensador|Verificar protecciones' },
            { name: 'Calibración de instrumentos de proceso', frequency: '90', frequencyUnit: 'días', estimatedHours: '6', tasks: 'Calibrar sensores de temperatura|Calibrar manómetros|Verificar transmisores de nivel|Calibrar detectores de metales|Documentar certificados' }
        ]
    }
];

// ---- Funciones de Generación Determinista ----
function getStudentSectorIndex(cedula) {
    return hashCedula(cedula) % SECTORS.length;
}

function getStudentSector(cedula) {
    return SECTORS[getStudentSectorIndex(cedula)];
}

// Previsualización de activos para admin (sin generar data completa)
function getStudentAssetPreview(cedula) {
    const seed = hashCedula(cedula);
    const rng = createRNG(seed);
    const sector = getStudentSector(cedula);
    const selected = pickN(rng, sector.assets.map(a => a), 5);
    return { sector: sector.name, company: sector.companyPrefix, assets: selected.map(a => a.name) };
}

function generateStudentData(cedula) {
    const student = getStudentByCedula(cedula);
    if (!student) return null;

    const seed = hashCedula(cedula);
    const rng = createRNG(seed);
    const sector = getStudentSector(cedula);
    const apellido = getStudentApellido(student.nombre);

    // Empresa del estudiante
    const company = {
        id: 'comp_' + cedula,
        name: `${sector.companyPrefix} — ${sector.locationPrefix} ${apellido}`,
        industry: sector.name,
        contact: student.nombre.split(',').reverse().join(' ').trim(),
        cedula: cedula
    };

    // 5 activos deterministas del pool de 10
    const selectedAssets = pickN(rng, sector.assets.map((a, i) => ({ ...a, _idx: i })), 5);
    const assets = selectedAssets.map((a, i) => {
        const yr = 2019 + Math.floor(rng() * 5);
        const mo = String(1 + Math.floor(rng() * 12)).padStart(2, '0');
        const dy = String(1 + Math.floor(rng() * 28)).padStart(2, '0');
        const warrantyYears = a.criticality === 'alta' ? 3 : 2;
        return {
            id: `ast_${cedula}_${i}`,
            companyId: company.id,
            name: a.name,
            code: `${a.code}-${String(i + 1).padStart(3, '0')}`,
            category: a.category,
            location: `${sector.locationPrefix} ${apellido} — Zona ${i + 1}`,
            brand: a.brand,
            model: a.model,
            serial: `${a.brand.substring(0, 3).toUpperCase()}-${yr}-${String(seed % 90000 + 10000 + i).substring(0, 5)}`,
            installDate: `${yr}-${mo}-${dy}`,
            warrantyDate: `${yr + warrantyYears}-${mo}-${dy}`,
            manualUrl: '',
            status: 'operativo',
            criticality: a.criticality,
            parentId: null,
            specs: a.specs
        };
    });

    // 5 técnicos del pool de 7
    const selectedTechs = pickN(createRNG(seed + 100), sector.techPool, 5);
    const personnel = selectedTechs.map((t, i) => ({
        id: `per_${cedula}_${i}`,
        companyId: company.id,
        name: t.name,
        role: t.role,
        specialization: t.specialization,
        email: `${t.name.split(' ')[0].toLowerCase()}@${sector.companyPrefix.toLowerCase()}.co`,
        phone: `3${Math.floor(10 + rng() * 89)}-${Math.floor(100 + rng() * 899)}-${Math.floor(1000 + rng() * 8999)}`,
        status: 'activo',
        shift: t.shift,
        hourlyRate: t.hourlyRate || 25000,
        certifications: t.certifications || []
    }));

    // 4 ítems de inventario del pool de 6
    const selectedInv = pickN(createRNG(seed + 200), sector.inventoryPool, 4);
    const inventory = selectedInv.map((item, i) => ({
        id: `inv_${cedula}_${i}`,
        companyId: company.id,
        ...item,
        location: `Almacén Central — Estante ${String.fromCharCode(65 + i)}${i + 1}`
    }));

    // 2 planes preventivos (vinculados a los activos del estudiante)
    const pmRng = createRNG(seed + 300);
    const planTemplates = pickN(pmRng, sector.planTemplates, 2);
    const today = new Date().toISOString().split('T')[0];
    const preventivePlans = planTemplates.map((tpl, i) => {
        const assetIdx = i % assets.length;
        const freq = parseInt(tpl.frequency);
        const lastExec = new Date();
        lastExec.setDate(lastExec.getDate() - Math.floor(freq * 0.8));
        const nextExec = new Date(lastExec);
        nextExec.setDate(nextExec.getDate() + freq);
        return {
            id: `pm_${cedula}_${i}`,
            companyId: company.id,
            assetId: assets[assetIdx].id,
            name: tpl.name,
            frequency: tpl.frequency,
            frequencyUnit: tpl.frequencyUnit,
            lastExecution: lastExec.toISOString().split('T')[0],
            nextExecution: nextExec.toISOString().split('T')[0],
            tasks: tpl.tasks,
            assignedTo: personnel[i % personnel.length].id,
            estimatedHours: tpl.estimatedHours,
            status: 'activo'
        };
    });

    return {
        companies: [company],
        assets: assets,
        workOrders: [],
        preventivePlans: preventivePlans,
        inventory: inventory,
        personnel: personnel,
        activityLog: [
            {
                id: 'log_init',
                companyId: company.id,
                timestamp: new Date().toISOString(),
                action: 'system',
                message: `Sistema inicializado para ${student.nombre}`,
                user: 'Sistema'
            }
        ]
    };
}
