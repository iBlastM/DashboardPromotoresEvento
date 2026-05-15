// ── GRAFICA_INDIVIDUAL.JS ── Promotores de la Paz ─────────────────────────

function renderIndividual() {
    if (window._tabActual !== 'individual') return;

    const liderNombre = window.liderSeleccionado;
    const msg     = document.getElementById('ind-msg');
    const grid    = document.getElementById('ind-grid');
    const elRank  = document.getElementById('ind-ranking');
    const elGauge = document.getElementById('ind-efectividad');
    const elPie   = document.getElementById('ind-asistencia');
    const elEst   = document.getElementById('ind-estado');

    if (!liderNombre) {
        if (msg)  msg.style.display  = 'block';
        if (grid) grid.style.display = 'none';
        [elRank, elGauge, elPie, elEst].forEach(el => { if (el) el.innerHTML = ''; });
        return;
    }

    if (msg)  msg.style.display  = 'none';
    if (grid) grid.style.display = '';

    const full  = window.dashDataFull || {};
    const lider = (full.lideres || []).find(r => r.nombre === liderNombre);
    if (!lider) return;

    // Ranking dinámico — consolidado por nombre, ordenado por asistentes (igual que el dropdown)
    const eventoSel = document.getElementById('select-evento')?.value || '';
    let todos = full.lideres || [];
    if (eventoSel) todos = todos.filter(r => r.evento === eventoSel);
    const consolidado = {};
    todos.forEach(r => {
        const n = r.nombre || 'Sin nombre';
        if (!consolidado[n]) consolidado[n] = 0;
        consolidado[n] += r.asistieron || 0;
    });
    const sorted = Object.entries(consolidado).sort((a, b) => b[1] - a[1]);
    const ranking = sorted.findIndex(([n]) => n === liderNombre) + 1 || 1;

    // 1. Ranking — indicator con posición
    if (elRank) {
        Plotly.newPlot('ind-ranking', [{
            type: 'indicator',
            mode: 'number',
            value: ranking,
            title: { text: `Posición en el ranking<br><span style="font-size:0.8em;opacity:0.7">${lider.nombre}</span>` },
            number: {
                font: { size: 72, family: C.fuente, color: '#f59e0b' },
                prefix: '#',
            },
            domain: { x: [0, 1], y: [0, 1] },
        }], getLayout('', { margin: { t: 60, r: 18, b: 18, l: 18 } }));
    }

    // 2. Gauge — semáforo con 3 zonas de color
    if (elGauge) {
        const ef = lider.efectividad || 0;
        const gaugeColor = ef >= 70 ? '#267e26' : ef >= 40 ? '#f59e0b' : '#ef4444';
        Plotly.newPlot('ind-efectividad', [{
            type: 'indicator',
            mode: 'gauge+number',
            value: ef,
            number: { suffix: '%', font: { size: 36, family: C.fuente, color: gaugeColor } },
            gauge: {
                axis: {
                    range: [0, 100], tickwidth: 1,
                    tickfont: { size: 10, color: C.mutedText },
                },
                bar: { color: gaugeColor, thickness: 0.22 },
                bgcolor: 'transparent',
                borderwidth: 0,
                steps: [
                    { range: [0,  40], color: C.isLight ? 'rgba(239,68,68,0.12)'   : 'rgba(239,68,68,0.18)'   },
                    { range: [40, 70], color: C.isLight ? 'rgba(245,158,11,0.12)'  : 'rgba(245,158,11,0.18)'  },
                    { range: [70,100], color: C.isLight ? 'rgba(38,126,38,0.14)'   : 'rgba(38,126,38,0.20)'   },
                ],
                threshold: { line: { color: gaugeColor, width: 2 }, thickness: 0.7, value: ef },
            },
            domain: { x: [0, 1], y: [0, 1] },
        }], getLayout(`% Efectividad — ${lider.nombre}`, {
            margin: { t: 60, r: 30, b: 22, l: 30 },
        }));
    }

    // 3. Pie — Asistencia individual (donut con anotación)
    if (elPie) {
        Plotly.newPlot('ind-asistencia', [{
            type: 'pie',
            labels: ['Asistieron', 'No Asistieron'],
            values: [lider.asistieron, lider.no_asistieron],
            hole: 0.50,
            marker: { colors: ['#7bc11d', '#ef4444'], line: { color: 'transparent', width: 0 } },
            textinfo: 'label+percent',
            textposition: 'outside',
            automargin: true,
            pull: [0.03, 0],
        }], getLayout(`Asistencia — ${lider.nombre}`, {
            showlegend: false,
            margin: { t: 52, r: 14, b: 14, l: 14 },
            annotations: [{
                text: `<b>${lider.invitados}</b><br><span style="font-size:10px">Invitados</span>`,
                x: 0.5, y: 0.5, showarrow: false,
                font: { size: 15, family: C.fuente, color: C.textColor },
            }],
        }));
    }

    // 4. Estado — tarjeta visual rica
    if (elEst) {
        const cumplió  = lider.estado === 'Cumplió';
        const stColor  = cumplió ? '#267e26' : '#ef4444';
        const stBg     = cumplió ? C.isLight ? 'rgba(38,126,38,0.10)' : 'rgba(38,126,38,0.15)' : C.isLight ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.15)';
        const stIcon   = cumplió ? '✅' : '⚠️';
        const stLabel  = cumplió ? 'CUMPLIÓ' : 'BAJÓ';
        const evEf     = (lider.efectividad || 0).toFixed(1);
        const evAsist  = lider.asistieron || 0;
        const evInv    = lider.invitados  || 0;

        elEst.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                        height:100%;gap:0.9rem;font-family:${C.fuente};padding:1.5rem;
                        background:${stBg};border-radius:12px;">
                <span style="font-size:3rem;line-height:1;">${stIcon}</span>
                <span style="font-size:2rem;font-weight:800;color:${stColor};letter-spacing:-1px;">${stLabel}</span>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;width:100%;margin-top:0.4rem;">
                    <div style="text-align:center;padding:0.55rem;background:rgba(255,255,255,0.07);border-radius:8px;border:1px solid ${stColor}33;">
                        <div style="font-size:1.3rem;font-weight:700;color:${C.textColor};">${evAsist}</div>
                        <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:0.7px;color:${C.mutedText};">Asistentes</div>
                    </div>
                    <div style="text-align:center;padding:0.55rem;background:rgba(255,255,255,0.07);border-radius:8px;border:1px solid ${stColor}33;">
                        <div style="font-size:1.3rem;font-weight:700;color:${stColor};">${evEf}%</div>
                        <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:0.7px;color:${C.mutedText};">Efectividad</div>
                    </div>
                </div>
                <div style="font-size:0.75rem;color:${C.mutedText};margin-top:-0.2rem;">
                    ${evInv} invitados en total
                </div>
            </div>`;
    }
}

document.addEventListener('datosListos', renderIndividual);
