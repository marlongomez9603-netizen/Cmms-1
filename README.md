# ⚙️ MaintPro CMMS

**Sistema de Gestión de Mantenimiento Computarizado (CMMS)**

> Aplicación web completa para gestionar el mantenimiento en empresas industriales. Incluye datos de demostración de 3 empresas ficticias de diferentes sectores.

## 🌐 Demo en Vivo

Abre `index.html` en cualquier navegador o despliega en GitHub Pages.

## 🏢 Empresas de Demostración

| Empresa | Sector | Activos | Descripción |
|---------|--------|---------|-------------|
| **PetroAndina S.A.** | Petróleo y Gas | 8 | Bombas, compresores, separadores, generadores |
| **AgroVerde Ltda.** | Agroindustria | 6 | Tractores, sistemas de riego, secadoras |
| **MetalPrecision S.A.S.** | Manufactura | 7 | Tornos CNC, fresadoras, prensas, hornos |

## ✨ Funcionalidades

### 📊 Dashboard
- KPIs en tiempo real: MTBF, MTTR, Disponibilidad
- Alertas de planes preventivos vencidos y stock bajo
- Gráficos interactivos (Chart.js)
- Actividad reciente y próximos mantenimientos

### ⚙️ Gestión de Activos
- Registro completo de equipos con ficha técnica
- Clasificación por categoría, ubicación y criticidad
- Estados: Operativo, En Mantenimiento, Fuera de Servicio
- Búsqueda y filtrado avanzado

### 📋 Órdenes de Trabajo
- Ciclo completo: Pendiente → En Progreso → Completada
- Tipos: Correctivo, Preventivo, Predictivo, Mejora
- Prioridades: Crítica, Alta, Media, Baja
- Asignación de técnicos y registro de horas

### 🔧 Mantenimiento Preventivo
- Planes con frecuencia configurable (días, horas, semanas)
- Alertas de planes vencidos
- Ejecución con generación automática de OT
- Lista de tareas por plan

### 📦 Inventario de Repuestos
- Control de stock con indicadores visuales
- Alertas de stock bajo (mínimo/máximo)
- Costos unitarios en COP
- Información de proveedores

### 👷 Personal Técnico
- Directorio de técnicos con especialización
- Control de turnos
- Carga de trabajo visible (OTs activas)

### 📈 Reportes y KPIs
- Resumen ejecutivo por empresa
- Gráficos de distribución de OTs
- Exportación de datos en JSON
- Opción de restablecer datos demo

## 🛠️ Tecnologías

- **HTML5** — Estructura semántica
- **CSS3** — Diseño responsive con tema oscuro premium
- **JavaScript** (Vanilla) — Lógica de aplicación
- **Chart.js** — Gráficos interactivos
- **Font Awesome** — Iconografía
- **LocalStorage** — Persistencia de datos

## 📁 Estructura del Proyecto

```
cmms-app/
├── index.html          # Página principal
├── css/
│   └── styles.css      # Sistema de diseño completo
├── js/
│   ├── store.js        # Gestión de datos + datos demo
│   └── app.js          # Lógica de la aplicación
└── README.md           # Documentación
```

## 🚀 Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/cmms-app.git
```

2. Abre `index.html` en tu navegador.

No requiere servidor, base de datos ni dependencias adicionales.

## 📱 Responsive

La aplicación es completamente responsive y se adapta a:
- 💻 Desktop (1200px+)
- 📱 Tablet (768px - 1200px)
- 📱 Móvil (< 768px)

## 💾 Datos

- Los datos se almacenan en **LocalStorage** del navegador
- Al iniciar por primera vez, se cargan datos de demostración
- Puedes exportar/importar datos en formato JSON
- Botón de restablecer para volver a los datos demo

## 📄 Licencia

MIT License — Proyecto académico UNIPAZ

---

Desarrollado con ❤️ como herramienta educativa para el programa de Ingeniería de Producción.
