// ── CARGAR_DATOS.JS ── Promotores de la Paz ──────────────────────────────

async function cargarDatos() {
    document.querySelectorAll('.chart-container').forEach(el => el.classList.add('loading'));

    try {
        const resp = await fetch('./data_promotores.json');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: data_promotores.json`);
        const json = await resp.json();

        window.dashDataFull = json;
        window.dashData = json;
        window.liderSeleccionado = '';

        const sub = document.getElementById('dashboard-subtitle');
        if (sub) {
            const evtCount = (json.eventos || []).length;
            sub.textContent = `${evtCount} evento${evtCount !== 1 ? 's' : ''} cargado${evtCount !== 1 ? 's' : ''}`;
        }

        document.dispatchEvent(new Event('datosListos'));
    } catch (err) {
        console.error('[Dashboard] Error al cargar datos:', err);
        const banner = document.getElementById('error-msg');
        if (banner) banner.style.display = 'block';
        document.querySelectorAll('.chart-container').forEach(el => el.classList.remove('loading'));
    }
}
