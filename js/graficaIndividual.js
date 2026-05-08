// ── GRAFICA_INDIVIDUAL.JS ── Promotores de la Paz ─────────────────────────

function renderIndividual() {
    if (window._tabActual !== 'individual') return;

    const liderNombre = window.liderSeleccionado;
    const msg = document.getElementById('ind-msg');
    const grid = document.getElementById('ind-grid');
    const elRanking = document.getElementById('ind-ranking');
    const elEfectividad = document.getElementById('ind-efectividad');
    const elAsistencia = document.getElementById('ind-asistencia');
    const elEstado = document.getElementById('ind-estado');

    if (!liderNombre) {
        if (msg) msg.style.display = 'block';
        if (grid) grid.style.display = 'none';
        [elRanking, elEfectividad, elAsistencia, elEstado].forEach(el => {
            if (el) el.innerHTML = '';
        });
        return;
    }

    if (msg) msg.style.display = 'none';
    if (grid) grid.style.display = '';

    const full = window.dashDataFull || {};
    const lider = (full.lideres || []).find(r => r.nombre === liderNombre);
    if (!lider) return;

    // Calcular ranking dinámicamente si no existe
    let ranking = lider.ranking;
    if (ranking === undefined || ranking === null || ranking === 0) {
        const eventoSel = document.getElementById('select-evento')?.value || '';
        let todosLideres = full.lideres || [];
        if (eventoSel) {
            todosLideres = todosLideres.filter(r => r.evento === eventoSel);
        }
        // Ordenar por efectividad descendente, luego por asistieron descendente
        const sorted = [...todosLideres].sort((a, b) => {
            if (b.efectividad !== a.efectividad) return b.efectividad - a.efectividad;
            return b.asistieron - a.asistieron;
        });
        ranking = sorted.findIndex(r => r.nombre === liderNombre) + 1;
    }

    // 1. Ranking (Indicator)
    if (elRanking) {
        const indicatorRanking = [
            {
                type: 'indicator',
                mode: 'number',
                value: ranking,
                title: { text: 'Ranking General' },
                number: { font: { size: 64, family: C.fuente, color: C.textColor } },
                domain: { x: [0, 1], y: [0, 1] },
            }
        ];
        Plotly.newPlot('ind-ranking', indicatorRanking, getLayout(`Ranking de ${lider.nombre}`, {
            margin: { t: 56, r: 18, b: 18, l: 18 },
        }));
    }

    // 2. % Efectividad (Gauge)
    if (elEfectividad) {
        const gaugeEfectividad = [
            {
                type: 'indicator',
                mode: 'gauge+number',
                value: lider.efectividad,
                title: { text: '% Efectividad' },
                number: { suffix: '%', font: { size: 36, family: C.fuente, color: C.textColor } },
                gauge: {
                    axis: { range: [0, 100], tickwidth: 1 },
                    bar: { color: lider.efectividad >= 50 ? C.verde : '#ef4444' },
                    bgcolor: C.plotBg,
                    borderwidth: 1,
                    bordercolor: C.borderColor,
                    steps: [
                        { range: [0, 50], color: 'rgba(239,68,68,0.15)' },
                        { range: [50, 100], color: 'rgba(123,193,29,0.15)' },
                    ],
                    threshold: {
                        line: { color: 'red', width: 2 },
                        thickness: 0.75,
                        value: 50,
                    },
                },
                domain: { x: [0, 1], y: [0, 1] },
            }
        ];
        Plotly.newPlot('ind-efectividad', gaugeEfectividad, getLayout(`Efectividad de ${lider.nombre}`, {
            margin: { t: 56, r: 18, b: 18, l: 18 },
        }));
    }

    // 3. Invitados / Asistencia / No Asistencia (Pie)
    if (elAsistencia) {
        const pieInd = [
            {
                type: 'pie',
                labels: ['Asistieron', 'No Asistieron'],
                values: [lider.asistieron, lider.no_asistieron],
                hole: 0.45,
                marker: { colors: [C.verde, '#ef4444'] },
                textinfo: 'label+percent',
                textposition: 'outside',
                automargin: true,
            }
        ];
        Plotly.newPlot('ind-asistencia', pieInd, getLayout(`Asistencia de ${lider.nombre}`, {
            showlegend: true,
            annotations: [
                {
                    text: `Invitados<br>${lider.invitados}`,
                    x: 0.5, y: 0.5,
                    font: { size: 16, family: C.fuente, color: C.textColor },
                    showarrow: false,
                }
            ],
            margin: { t: 80, r: 18, b: 18, l: 18 },
        }));
    }

    // 4. Estado (HTML, sin plano vacío)
    if (elEstado) {
        const estadoColor = lider.estado === 'Cumplió' ? C.verde : '#ef4444';
        const labelColor = C.isLight ? '#111111' : '#ffffff';
        elEstado.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:0.6rem;font-family:${C.fuente};">
                <span style="font-size:0.85rem;color:${C.mutedText};">Estado</span>
                <span style="font-size:2.8rem;font-weight:700;color:${estadoColor};">${lider.estado.toUpperCase()}</span>
            </div>`;
    }
}

document.addEventListener('datosListos', renderIndividual);
