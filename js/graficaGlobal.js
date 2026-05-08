// ── GRAFICA_GLOBAL.JS ── Promotores de la Paz ─────────────────────────────

function consolidarLideres(lideres) {
    const map = {};
    lideres.forEach(r => {
        const nombre = r.nombre || 'Sin nombre';
        if (!map[nombre]) {
            map[nombre] = {
                nombre: nombre,
                invitados: 0,
                asistieron: 0,
                no_asistieron: 0,
                estado: r.estado || 'Cumplió',
            };
        }
        map[nombre].invitados += r.invitados || 0;
        map[nombre].asistieron += r.asistieron || 0;
        map[nombre].no_asistieron += r.no_asistieron || 0;
        if (r.estado === 'Bajó') map[nombre].estado = 'Bajó';
    });
    return Object.values(map).map(r => ({
        ...r,
        efectividad: r.invitados ? parseFloat(((r.asistieron / r.invitados) * 100).toFixed(1)) : 0,
    }));
}

function renderGlobal() {
    if (window._tabActual !== 'global') return;
    const data = window.dashData || {};
    const resumen = data.resumen || {};
    const lideres = data.lideres || [];
    const porHora = data.por_hora || [];

    const lideresConsolidados = consolidarLideres(lideres);

    const elPie = document.getElementById('global-asistencia-pie');
    const elEstado = document.getElementById('global-estado-lideres');
    const elTopA = document.getElementById('global-top-asistentes');
    const elTopE = document.getElementById('global-top-efectividad');
    const elHora = document.getElementById('global-llegadas-hora');

    // 1. Invitados / Asistencia / No Asistencia (Pie)
    if (elPie) {
        const pieAsistencia = [
            {
                type: 'pie',
                labels: ['Asistieron', 'No Asistieron'],
                values: [resumen.total_asistentes || 0, resumen.no_asistieron || 0],
                hole: 0.45,
                marker: { colors: [C.verde, '#ef4444'] },
                textinfo: 'label+percent',
                textposition: 'outside',
                automargin: true,
            }
        ];
        Plotly.newPlot('global-asistencia-pie', pieAsistencia, getLayout('Invitados / Asistencia / No Asistencia', {
            showlegend: true,
            margin: { t: 56, r: 18, b: 18, l: 18 },
        }));
    }

    // 2. Estado de líderes (Pie)
    if (elEstado) {
        const estados = { 'Cumplió': 0, 'Bajó': 0 };
        lideresConsolidados.forEach(r => { estados[r.estado] = (estados[r.estado] || 0) + 1; });
        const pieEstado = [
            {
                type: 'pie',
                labels: Object.keys(estados),
                values: Object.values(estados),
                hole: 0.45,
                marker: { colors: [C.verde, '#f59e0b'] },
                textinfo: 'label+percent',
                textposition: 'outside',
                automargin: true,
            }
        ];
        Plotly.newPlot('global-estado-lideres', pieEstado, getLayout('Estado de Líderes (Cumplieron vs Bajaron)', {
            showlegend: true,
            margin: { t: 56, r: 18, b: 18, l: 18 },
        }));
    }

    // 3. Top 5 / 10 ranking por Asistentes (Bar horizontal)
    if (elTopA) {
        const renderTopAsistentes = (n) => {
            const sorted = [...lideresConsolidados].sort((a, b) => b.asistieron - a.asistieron).slice(0, n);
            const barAsistentes = [
                {
                    type: 'bar',
                    x: sorted.map(r => r.asistieron),
                    y: sorted.map(r => r.nombre),
                    orientation: 'h',
                    marker: { color: C.verde },
                    text: sorted.map(r => String(r.asistieron)),
                    textposition: 'outside',
                    hovertemplate: '%{y}<br>Asistentes: %{x}<extra></extra>',
                }
            ];
            Plotly.newPlot('global-top-asistentes', barAsistentes, getLayout(`Top ${n} Promotores por Asistentes`, {
                yaxis: { autorange: 'reversed', automargin: true },
                xaxis: { title: 'Asistentes' },
                margin: { t: 56, r: 40, b: 40, l: 220 },
            }));
        };
        renderTopAsistentes(10);
        elTopA._renderTop = renderTopAsistentes;
        if (!elTopA.querySelector('.top-selector')) {
            const sel = document.createElement('div');
            sel.className = 'top-selector';
            sel.dataset.chart = 'global-top-asistentes';
            sel.innerHTML = `
                <span class="top-selector-label">Top</span>
                <select class="top-select">
                    <option value="5">5</option>
                    <option value="10" selected>10</option>
                </select>`;
            elTopA.appendChild(sel);
        }
    }

    // 4. Top 5 / 10 ranking por % Efectividad (Bar horizontal)
    if (elTopE) {
        const renderTopEfectividad = (n) => {
            const sorted = [...lideresConsolidados].sort((a, b) => b.efectividad - a.efectividad).slice(0, n);
            const barEfectividad = [
                {
                    type: 'bar',
                    x: sorted.map(r => r.efectividad),
                    y: sorted.map(r => r.nombre),
                    orientation: 'h',
                    marker: { color: C.verde },
                    text: sorted.map(r => r.efectividad.toFixed(1) + '%'),
                    textposition: 'outside',
                    hovertemplate: '%{y}<br>Efectividad: %{x:.1f}%<extra></extra>',
                }
            ];
            Plotly.newPlot('global-top-efectividad', barEfectividad, getLayout(`Top ${n} Promotores por % Efectividad`, {
                yaxis: { autorange: 'reversed', automargin: true },
                xaxis: { title: '% Efectividad', range: [0, 110] },
                margin: { t: 56, r: 60, b: 40, l: 220 },
            }));
        };
        renderTopEfectividad(10);
        elTopE._renderTop = renderTopEfectividad;
        if (!elTopE.querySelector('.top-selector')) {
            const sel = document.createElement('div');
            sel.className = 'top-selector';
            sel.dataset.chart = 'global-top-efectividad';
            sel.innerHTML = `
                <span class="top-selector-label">Top</span>
                <select class="top-select">
                    <option value="5">5</option>
                    <option value="10" selected>10</option>
                </select>`;
            elTopE.appendChild(sel);
        }
    }

    // 5. Distribución de llegadas por hora (Bar)
    if (elHora) {
        // Agrupar por franja horaria y sumar asistentes
        const gruposHora = {};
        porHora.forEach(r => {
            const franja = r.franja || 'Sin franja';
            gruposHora[franja] = (gruposHora[franja] || 0) + (r.asistentes || 0);
        });
        const franjas = Object.keys(gruposHora);
        const asistentes = franjas.map(f => gruposHora[f]);

        const barHora = [
            {
                type: 'bar',
                x: franjas,
                y: asistentes,
                marker: { color: C.verde },
                text: asistentes.map(String),
                textposition: 'outside',
                hovertemplate: '%{x}<br>Asistentes: %{y}<extra></extra>',
            }
        ];
        const maxAsis = Math.max(...asistentes, 0);
        Plotly.newPlot('global-llegadas-hora', barHora, getLayout('Distribución de Llegadas por Hora', {
            xaxis: { title: 'Franja Horaria' },
            yaxis: { title: 'Asistentes', range: [0, Math.ceil(maxAsis * 1.25)] },
            margin: { t: 56, r: 18, b: 60, l: 50 },
        }));
    }
}

document.addEventListener('datosListos', renderGlobal);
