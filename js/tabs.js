// ── TABS.JS ── Promotores de la Paz ──────────────────────────────────────

window._tabActual = null;

function seleccionarLiderNumeroUno() {
    const full = window.dashDataFull;
    if (!full || !full.lideres || !full.lideres.length) return;

    const eventoSel = document.getElementById('select-evento')?.value || '';
    let lideres = full.lideres;
    if (eventoSel) {
        lideres = lideres.filter(r => r.evento === eventoSel);
    }

    // Buscar líder con ranking #1 (basado en nombre que empieza con #1 o efectividad más alta)
    const lider1 = lideres.reduce((best, r) => {
        if (!best || r.efectividad > best.efectividad) return r;
        return best;
    }, null);

    if (lider1) {
        window.liderSeleccionado = lider1.nombre;
        const input = document.getElementById('combo-lider-input');
        const hidden = document.getElementById('combo-lider-value');
        if (input) input.value = lider1.nombre;
        if (hidden) hidden.value = lider1.nombre;
    }
}

function activarSeccion(seccionId) {
    window._tabActual = seccionId;
    const select = document.getElementById('seccion-select');
    if (select && select.value !== seccionId) select.value = seccionId;

    // Mostrar/ocultar secciones
    document.querySelectorAll('.tab-section').forEach(s => {
        s.hidden = s.id !== 'tab-' + seccionId;
    });

    // Mostrar/ocultar KPIs
    const kpiWrapper = document.querySelector('.kpi-wrapper');
    if (kpiWrapper) {
        kpiWrapper.style.display = seccionId === 'ciudadanos' ? 'none' : '';
    }

    // Mostrar/ocultar filtro de líder según sección
    const grupoLider = document.getElementById('grupo-filtro-lider');
    if (grupoLider) {
        grupoLider.style.display = (seccionId === 'individual' || seccionId === 'ciudadanos') ? '' : 'none';
    }

    // Si entramos a individual sin líder seleccionado, elegir automáticamente el mejor
    if (seccionId === 'individual' && !window.liderSeleccionado) {
        seleccionarLiderNumeroUno();
    }

    // Si entramos a global, limpiar filtro de líder
    if (seccionId === 'global') {
        const input = document.getElementById('combo-lider-input');
        const hidden = document.getElementById('combo-lider-value');
        if (input) input.value = '';
        if (hidden) hidden.value = '';
        window.liderSeleccionado = '';
    }

    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        const activeSection = document.getElementById('tab-' + seccionId);
        if (activeSection && window.Plotly) {
            activeSection.querySelectorAll('.js-plotly-plot').forEach(gd => {
                Plotly.Plots.resize(gd);
            });
        }
        if (window.dashDataFull && typeof aplicarFiltros === 'function') {
            aplicarFiltros();
        }
    }, 80);
}

document.addEventListener('DOMContentLoaded', () => {
    const panels = document.getElementById('tab-panels');
    const select = document.getElementById('seccion-select');
    if (!panels) return;

    const secciones = [
        { id: 'global', src: 'partials/global.html' },
        { id: 'individual', src: 'partials/individual.html' },
        { id: 'ciudadanos', src: 'partials/ciudadanos.html' },
    ];

    let loaded = 0;
    secciones.forEach((sec) => {
        const section = document.createElement('section');
        section.id = 'tab-' + sec.id;
        section.className = 'tab-section';
        section.hidden = true;
        fetch(sec.src)
            .then(r => r.ok ? r.text() : '')
            .then(html => {
                section.innerHTML = html;
                loaded++;
                if (loaded === secciones.length) {
                    activarSeccion('global');
                }
            })
            .catch(() => {
                section.innerHTML = '<p>Error al cargar ' + sec.src + '</p>';
                loaded++;
                if (loaded === secciones.length) {
                    activarSeccion('global');
                }
            });
        panels.appendChild(section);
    });

    if (select) {
        select.addEventListener('change', (e) => activarSeccion(e.target.value));
    }
});
