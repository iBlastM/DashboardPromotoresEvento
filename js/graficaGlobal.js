// Paletas de gradiente basadas en la marca Metrix
// Claro visible (valor bajo) → Oscuro/Saturado (valor alto)
const GRAD = {
    // Sprout — lima claro → #7bc11d → verde oscuro
    sprout:   ['#c0e060', '#a8d040', '#7bc11d', '#5a9115', '#3d640e', '#1e3206'],
    // Forest — verde claro → #267e26 → verde oscuro
    forest:   ['#7aba7a', '#4aaa4a', '#267e26', '#155215', '#082808'],
    // Meadow — amarillo-verde vivo → verde medio → oscuro
    meadow:   ['#c8e832', '#99cc00', '#6aaa00', '#3e8000', '#1e5400', '#0a2800'],
    // Forest To Sprout
    f2sprout: ['#267e26', '#4e9e14', '#7bc11d', '#9dd44a', '#c0e880'],
    // Gradience — verde suave → intenso (sin blancos)
    gradience:['#c0dca0', '#9ec872', '#78b030', '#5a9816', '#366608', '#153402'],
    // Deep Leaf
    deepleaf: ['#2a5c1a', '#1e4414', '#14300e', '#0c2008', '#061404', '#000000'],
};

function gradColors(values, palette) {
    const stops = GRAD[palette] || GRAD.teal;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values.map(v => {
        const t = (v - min) / range;
        const idx = Math.round(t * (stops.length - 1));
        return stops[Math.min(idx, stops.length - 1)];
    });
}

function consolidarLideres(lideres) {
    const map = {};
    lideres.forEach(r => {
        const nombre = r.nombre || 'Sin nombre';
        if (!map[nombre]) {
            map[nombre] = { nombre, invitados: 0, asistieron: 0, no_asistieron: 0, estado: r.estado || 'Cumplió' };
        }
        map[nombre].invitados     += r.invitados     || 0;
        map[nombre].asistieron    += r.asistieron    || 0;
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
    const data    = window.dashData || {};
    const resumen = data.resumen   || {};
    const lideres = data.lideres   || [];
    const porHora = data.por_hora  || [];

    const lideresConsolidados = consolidarLideres(lideres);

    const elPie    = document.getElementById('global-asistencia-pie');
    const elEstado = document.getElementById('global-estado-lideres');
    const elTopA   = document.getElementById('global-top-asistentes');
    const elTopE   = document.getElementById('global-top-efectividad');
    const elHora   = document.getElementById('global-llegadas-hora');

    // 1. Pie — Asistencia global (donut vibrante)
    if (elPie) {
        Plotly.newPlot('global-asistencia-pie', [{
            type: 'pie',
            labels: ['Asistieron', 'No Asistieron'],
            values: [resumen.total_asistentes || 0, resumen.no_asistieron || 0],
            hole: 0.50,
            marker: { colors: ['#7bc11d', '#ef4444'], line: { color: 'transparent', width: 0 } },
            textinfo: 'label+percent',
            textposition: 'outside',
            automargin: true,
            pull: [0.03, 0],
        }], getLayout('Asistencia Global', {
            showlegend: false,
            margin: { t: 52, r: 14, b: 14, l: 14 },
            annotations: [{
                text: `<b>${resumen.total_invitados?.toLocaleString('es-MX') || '—'}</b><br><span style="font-size:10px">Invitados</span>`,
                x: 0.5, y: 0.5, showarrow: false,
                font: { size: 14, family: C.fuente, color: C.textColor },
            }],
        }));
    }

    // 2. LINE CHART / HISTOGRAMA — Registro de acceso por hora exacta
    if (elHora) {
      try {
        const ciudadanos = (data.ciudadanos || []).filter(c => c.hora_llegada && c.hora_llegada !== '—' && c.asistio);

        // Parsear hora_llegada → segundos UTC (epoch base 2000-01-01)
        function parsearHora(horaStr) {
            const m = horaStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!m) return null;
            let h = parseInt(m[1]), min = parseInt(m[2]), ampm = m[3].toUpperCase();
            if (ampm === 'PM' && h !== 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            return Date.UTC(2000, 0, 1, h, min, 0) / 1000;
        }

        // Datos por minuto para línea
        const conteoMin = {};
        ciudadanos.forEach(c => {
            const ts = parsearHora(c.hora_llegada);
            if (ts !== null) conteoMin[ts] = (conteoMin[ts] || 0) + 1;
        });
        const lineData = Object.entries(conteoMin)
            .map(([ts, v]) => ({ time: parseInt(ts), value: v }))
            .sort((a, b) => a.time - b.time);

        // Datos para histograma (bins de 15 min desde primera hasta última hora)
        const allTs = lineData.map(d => d.time);
        const tsMin = allTs.length ? Math.min(...allTs) : 0;
        const tsMax = allTs.length ? Math.max(...allTs) : 0;
        const BIN = 15 * 60; // 15 minutos en segundos
        const binStart = Math.floor(tsMin / BIN) * BIN;
        const binEnd   = Math.ceil((tsMax + 1) / BIN) * BIN;
        const bins = [];
        for (let t = binStart; t < binEnd; t += BIN) bins.push(t);
        const histCounts = new Array(bins.length).fill(0);
        allTs.forEach(ts => {
            const i = Math.floor((ts - binStart) / BIN);
            if (i >= 0 && i < histCounts.length) histCounts[i]++;
        });
        function fmtTs(ts) {
            const d = new Date(ts * 1000);
            let h = d.getUTCHours(), m = d.getUTCMinutes();
            const ap = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            return `${h}:${String(m).padStart(2,'0')} ${ap}`;
        }
        const histLabels = bins.map(t => fmtTs(t));

        // ── Construir UI ──────────────────────────────────────────────────
        elHora.innerHTML = '';

        const header = document.createElement('div');
        header.style.cssText = `display:flex;align-items:center;padding:10px 14px 4px;`;

        const titleEl = document.createElement('div');
        titleEl.style.cssText = `font-family:${C.fuente};font-size:13px;font-weight:600;color:${C.textColor};`;
        titleEl.textContent = 'Registro de Acceso por Hora de Llegada';

        header.appendChild(titleEl);
        elHora.appendChild(header);

        const chartH = (elHora.offsetHeight || 260) - 40;

        // Contenedor línea (LightweightCharts)
        const lineDiv = document.createElement('div');
        lineDiv.style.cssText = `width:100%;height:${chartH}px;`;
        elHora.appendChild(lineDiv);

        // Contenedor histograma (Plotly, oculto inicialmente)
        const histDiv = document.createElement('div');
        histDiv.id = 'global-llegadas-hist';
        histDiv.style.cssText = `width:100%;height:${chartH}px;display:none;`;
        elHora.appendChild(histDiv);

        // Renderizar línea
        const chart = LightweightCharts.createChart(lineDiv, {
            width: elHora.offsetWidth || 300,
            height: chartH,
            attributionLogo: false,
            layout: { background: { color: C.plotBg }, textColor: C.textColor, fontFamily: C.fuente, fontSize: 11 },
            grid: { vertLines: { color: C.borderColor }, horzLines: { color: C.borderColor } },
            timeScale: {
                timeVisible: true, secondsVisible: false,
                tickMarkFormatter: (ts) => fmtTs(ts),
            },
            rightPriceScale: { borderColor: C.borderColor },
            crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        });
        const series = chart.addSeries(LightweightCharts.AreaSeries, {
            lineColor: '#7bc11d', topColor: '#7bc11d55', bottomColor: '#7bc11d05',
            lineWidth: 2, priceFormat: { type: 'volume', precision: 0, minMove: 1 },
        });
        series.setData(lineData);
        chart.timeScale().fitContent();
        elHora._lwChart = chart;

        // Renderizar histograma (Plotly)
        Plotly.newPlot('global-llegadas-hist', [{
            type: 'bar',
            x: histLabels,
            y: histCounts,
            marker: { color: histCounts.map(v => v === Math.max(...histCounts) ? '#5a9115' : '#7bc11d') },
            hovertemplate: '%{x}<br>Registros: %{y}<extra></extra>',
        }], getLayout('', {
            margin: { t: 10, r: 14, b: 60, l: 44 },
            xaxis: { tickangle: -45, tickfont: { size: 10 } },
            yaxis: { title: 'Registros' },
            bargap: 0.05,
        }));

        // Insertar botón toggle en chart-card-meta (antes del ?)
        const horaCard = elHora.closest('.chart-card');
        if (horaCard) {
            let meta = horaCard.querySelector('.chart-card-meta');
            if (!meta) {
                meta = document.createElement('div');
                meta.className = 'chart-card-meta';
                horaCard.appendChild(meta);
            }
            // Eliminar botón previo si existe
            meta.querySelector('#hora-toggle-btn')?.remove();
            const btn = document.createElement('button');
            btn.id = 'hora-toggle-btn';
            btn.dataset.mode = 'line';
            btn.style.cssText = `font-family:${C.fuente};font-size:11px;padding:2px 9px;border-radius:6px;border:1px solid ${C.borderColor};background:${C.plotBg};color:${C.textColor};cursor:pointer;`;
            btn.textContent = 'Histograma';
            meta.insertBefore(btn, meta.firstChild);

            btn.addEventListener('click', () => {
                const isLine = btn.dataset.mode === 'line';
                btn.dataset.mode = isLine ? 'hist' : 'line';
                btn.textContent  = isLine ? 'Línea' : 'Histograma';
                lineDiv.style.display = isLine ? 'none' : '';
                histDiv.style.display = isLine ? '' : 'none';
                if (!isLine) Plotly.Plots.resize('global-llegadas-hist');
            });
        }

      } catch(e) { console.error('LW chart error:', e); }
    }

    // 3. Top N por Asistentes — gradiente Emrld (mayor = más oscuro)
    if (elTopA) {
        const renderTopAsistentes = (n) => {
            const sorted = [...lideresConsolidados].sort((a, b) => b.asistieron - a.asistieron).slice(0, n);
            const vals   = sorted.map(r => r.asistieron);
            // Invertimos: barra más larga (top) recibe color más oscuro
            const colors = gradColors(vals, 'sprout');
            Plotly.newPlot('global-top-asistentes', [{
                type: 'bar',
                x: vals,
                y: sorted.map(r => r.nombre),
                orientation: 'h',
                marker: { color: colors },
                text: vals.map(String),
                textposition: 'outside',
                hovertemplate: '%{y}<br>Asistentes: %{x}<extra></extra>',
            }], getLayout(`Top ${n} Promotores por Asistentes`, {
                yaxis: { autorange: 'reversed', automargin: true },
                xaxis: { title: 'Asistentes' },
                margin: { t: 52, r: 44, b: 44, l: 230 },
            }));
        };
        renderTopAsistentes(10);
        elTopA._renderTop = renderTopAsistentes;
        if (!elTopA.querySelector('.top-selector')) {
            const sel = document.createElement('div');
            sel.className = 'top-selector';
            sel.dataset.chart = 'global-top-asistentes';
            sel.innerHTML = `<span class="top-selector-label">Top</span>
                <select class="top-select">
                    <option value="5">5</option>
                    <option value="10" selected>10</option>
                </select>`;
            elTopA.appendChild(sel);
        }
    }

    // 4. RADAR CHART — Todos los líderes, top 5 activos por defecto
    if (elTopE) {
        const RADAR_PLOT = 'radar-inner-plot';
        const THETA   = ['Efectividad', 'Asistentes', 'Cobertura', 'Efectividad'];
        const PALETTE = [
            '#7bc11d','#267e26','#c8e832','#4aaa4a','#a8d040',
            '#1e6e1e','#9dd44a','#5a9115','#b8e060','#3d640e',
            '#7aba7a','#c0e060','#2d6e2d','#88c840','#4e9e14',
        ];

        // Limpiar estilos inline de renders anteriores
        elTopE.style.cssText = '';

        // Ranking por asistentes (mayor = #1)
        const ranked = [...lideresConsolidados]
            .sort((a, b) => b.asistieron - a.asistieron)
            .map((l, i) => ({ ...l, ranking: i + 1 }));

        const maxAsi = Math.max(...ranked.map(r => r.asistieron), 1);
        const maxInv = Math.max(...ranked.map(r => r.invitados),  1);

        // ── Construir UI una sola vez ─────────────────────────────────────
        elTopE.querySelector('.radar-controls')?.remove();
        elTopE.style.cssText = '';

        if (!document.getElementById(RADAR_PLOT)) {
            const plotDiv = document.createElement('div');
            plotDiv.id = RADAR_PLOT;
            plotDiv.style.cssText = 'width:100%;height:100%;';
            elTopE.appendChild(plotDiv);
        }

        // ── Construir trazas ──────────────────────────────────────────────
        const getChecked = (i) => {
            const cb = document.querySelector(`#radar-etiquetas-list .radar-cb[data-idx="${i}"]`);
            return cb ? cb.checked : i < 5;
        };

        const buildTraces = () => ranked.map((l, i) => {
            const col = PALETTE[i % PALETTE.length];
            return {
                type: 'scatterpolar',
                r:    [l.efectividad || 0, (l.asistieron/maxAsi)*100, (l.invitados/maxInv)*100, l.efectividad || 0],
                theta: THETA,
                fill:  'toself',
                name:  `#${l.ranking} ${l.nombre.split(' ').slice(0, 2).join(' ')}`,
                fillcolor: col + '28',
                line:  { color: col, width: 2 },
                marker:{ color: col, size: 5 },
                visible: getChecked(i),
                hovertemplate: `<b>#${l.ranking} ${l.nombre.split(' ').slice(0,2).join(' ')}</b><br>%{theta}: %{r:.1f}<extra></extra>`,
            };
        });

        // ── Render ────────────────────────────────────────────────────────
        Plotly.newPlot(RADAR_PLOT, buildTraces(), getLayout('Comparativa de Líderes', {
            polar: {
                bgcolor: C.isLight ? '#f0fdf4' : C.plotBg,
                radialaxis: {
                    visible: true, range: [0, 110], showticklabels: true,
                    tickvals: [20, 40, 60, 80, 100],
                    ticktext: ['20', '40', '60', '80', '100'],
                    tickfont: { size: 9, family: C.fuente, color: C.textColor },
                    gridcolor: C.borderColor, linecolor: C.borderColor,
                },
                angularaxis: {
                    tickfont:  { size: 11, family: C.fuente, color: C.textColor },
                    gridcolor: C.borderColor, linecolor: C.borderColor,
                },
                gridshape: 'linear',
            },
            showlegend: false,
            margin: { t: 52, r: 30, b: 30, l: 30 },
        }));

        // Tooltip personalizado para el radar
        const radarCard = elTopE.closest('.chart-card');
        if (radarCard) {
            const meta = radarCard.querySelector('.chart-card-meta');
            const helpIcon = meta?.querySelector('.help-icon[data-chart-help="1"]');
            if (helpIcon) {
                const tooltip = helpIcon.querySelector('.help-tooltip');
                if (tooltip) tooltip.innerHTML =
                    '<b>Efectividad</b> — % de invitados que asistieron (0–100%).<br>' +
                    '<b>Asistentes</b> — cantidad de asistentes normalizada respecto al máximo del grupo.<br>' +
                    '<b>Cobertura</b> — total de invitados normalizado respecto al máximo del grupo.<br>' +
                    'Los valores del eje radial van de 0 a 100.';
            }
        }

        // ── Poblar dropdown de Etiquetas en filtros-bar ───────────────────
        const etiqList = document.getElementById('radar-etiquetas-list');
        if (etiqList) {
            etiqList.innerHTML = ranked.map((l, i) => `
                <label class="radar-item">
                    <input type="checkbox" class="radar-cb" data-idx="${i}" ${i < 5 ? 'checked' : ''}>
                    <span class="radar-rank">#${l.ranking}</span>
                    <span class="radar-name">${l.nombre.split(' ').slice(0, 2).join(' ')}</span>
                </label>`).join('');

            etiqList.addEventListener('change', () => {
                const vis = ranked.map((_, i) => getChecked(i));
                Plotly.restyle(RADAR_PLOT, { visible: vis });
            });
        }
    }

    // 5. Estado de líderes — Pie horizontal compacto con gradiente Lime/Gold
    if (elEstado) {
        const estados = { 'Cumplió': 0, 'Bajó': 0 };
        lideresConsolidados.forEach(r => { estados[r.estado] = (estados[r.estado] || 0) + 1; });
        Plotly.newPlot('global-estado-lideres', [{
            type: 'pie',
            labels: Object.keys(estados),
            values: Object.values(estados),
            hole: 0.48,
            marker: { colors: ['#7bc11d', '#f59e0b'], line: { color: 'transparent', width: 0 } },
            textinfo: 'label+value+percent',
            textposition: 'outside',
            automargin: true,
            direction: 'clockwise',
        }], getLayout('Estado de Líderes — Cumplieron vs Bajaron', {
            showlegend: false,
            margin: { t: 52, r: 18, b: 18, l: 18 },
        }));
    }
}

document.addEventListener('datosListos', renderGlobal);
