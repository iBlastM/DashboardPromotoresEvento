// ── KPIS.JS ── Promotores de la Paz ──────────────────────────────────────

document.addEventListener('datosListos', () => {
    const tab = window._tabActual || 'global';
    const data = window.dashData || {};
    const resumen = data.resumen || {};

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    const cardLideres = document.getElementById('kpi-card-lideres');
    const labelEfectividad = document.getElementById('kpi-label-efectividad');
    const sectionTitle = document.getElementById('kpi-section-title');

    if (tab === 'individual') {
        if (sectionTitle) sectionTitle.textContent = 'Indicadores del Líder';
        if (labelEfectividad) labelEfectividad.textContent = 'Efectividad Individual';
        if (cardLideres) cardLideres.style.display = 'none';

        const liderNombre = window.liderSeleccionado;
        const full = window.dashDataFull || {};
        const lider = (full.lideres || []).find(r => r.nombre === liderNombre);

        if (lider) {
            set('kpi-invitados', fmt(lider.invitados || 0));
            set('kpi-asistentes', fmt(lider.asistieron || 0));
            set('kpi-no-asistieron', fmt(lider.no_asistieron || 0));
            set('kpi-efectividad', (lider.efectividad || 0).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + '%');
            set('kpi-tickets', fmt(lider.asistieron || 0));
        } else {
            set('kpi-invitados', '—');
            set('kpi-asistentes', '—');
            set('kpi-no-asistieron', '—');
            set('kpi-efectividad', '—');
            set('kpi-tickets', '—');
        }
    } else {
        if (sectionTitle) sectionTitle.textContent = 'Indicadores del Evento';
        if (labelEfectividad) labelEfectividad.textContent = 'Efectividad Global';
        if (cardLideres) cardLideres.style.display = '';

        set('kpi-invitados', fmt(resumen.total_invitados || 0));
        set('kpi-asistentes', fmt(resumen.total_asistentes || 0));
        set('kpi-no-asistieron', fmt(resumen.no_asistieron || 0));
        set('kpi-efectividad', (resumen.efectividad_global || 0).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + '%');
        set('kpi-lideres', fmt(resumen.total_lideres || 0));
        set('kpi-tickets', fmt(resumen.tickets_entregados || 0));
    }
});
