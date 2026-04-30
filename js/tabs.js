// ── TABS.JS ── Promotores de la Paz ──────────────────────────────────────

window._tabActual = null;

function seleccionarLiderNumeroUno() {
    const full = window.dashDataFull;
    if (!full || !full.lideres || !full.lideres.length) return;
    // Buscar líder con ranking 1
    const lider1 = full.lideres.find(r => r.ranking === 1);
    if (!lider1) return;
    window.liderSeleccionado = lider1.nombre;
    const sel = document.getElementById('select-lider-individual');
    if (sel) sel.value = lider1.nombre;
}

function activarSeccion(seccionId) {
    window._tabActual = seccionId;
    const select = document.getElementById('seccion-select');
    if (select && select.value !== seccionId) select.value = seccionId;

    // Mostrar/ocultar secciones
    document.querySelectorAll('.tab-section').forEach(s => {
        s.hidden = s.id !== 'tab-' + seccionId;
    });

    // Mostrar/ocultar barra de filtros según sección
    const filtrosBar = document.getElementById('filtros-bar');
    const grupoLider = document.getElementById('grupo-filtro-lider');
    if (grupoLider) {
        grupoLider.style.display = seccionId === 'individual' ? '' : 'none';
    }
    if (filtrosBar) {
        const anyVisible = Array.from(filtrosBar.querySelectorAll('.filtro-grupo'))
            .some(g => g.style.display !== 'none');
        filtrosBar.style.display = anyVisible ? '' : 'none';
    }

    // Si entramos a individual sin líder seleccionado, elegir automáticamente el #1
    if (seccionId === 'individual' && !window.liderSeleccionado) {
        seleccionarLiderNumeroUno();
    }

    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        const activeSection = document.getElementById('tab-' + seccionId);
        if (activeSection && window.Plotly) {
            activeSection.querySelectorAll('.js-plotly-plot').forEach(gd => {
                Plotly.Plots.resize(gd);
            });
        }
        if (window.dashDataFull) {
            document.dispatchEvent(new Event('datosListos'));
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
