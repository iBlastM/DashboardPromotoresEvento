// ── KPIS.JS ── Promotores de la Paz ──────────────────────────────────────

// ── Animación count-up ────────────────────────────────────────────────────
function countUp(el, finalValue, opts = {}) {
    if (!el || isNaN(finalValue)) return;
    const { duration = 1200, suffix = '', decimals = 0 } = opts;
    const start = performance.now();

    function step(now) {
        const elapsed = now - start;
        const t       = Math.min(elapsed / duration, 1);
        // Ease out quart: rápido al principio, suave al llegar
        const eased   = 1 - Math.pow(1 - t, 4);
        const current = eased * finalValue;

        el.textContent = decimals
            ? current.toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix
            : Math.round(current).toLocaleString('es-MX') + suffix;

        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ── Ordenar eventos por fecha (usa EVENTOS_META de config.js) ─────────────
function parseFechaOrdinal(fecha) {
    if (!fecha) return 9999;
    const meses = { enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,
                    julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12 };
    const m = fecha.trim().toLowerCase().match(/^(\d+)\s+de\s+(\w+)/);
    if (!m) return 9999;
    return (meses[m[2]] || 0) * 100 + (parseInt(m[1]) || 0);
}

// ── Agregación de datos por evento (orden cronológico) ────────────────────
function getSparkData() {
    const full    = window.dashDataFull || {};
    const lideres = full.lideres || [];

    const seen = new Set();
    const eventoNames = [];
    lideres.forEach(l => {
        if (l.evento && !seen.has(l.evento)) { seen.add(l.evento); eventoNames.push(l.evento); }
    });

    const meta = (typeof EVENTOS_META !== 'undefined') ? EVENTOS_META : {};
    eventoNames.sort((a, b) => parseFechaOrdinal(meta[a]?.fecha) - parseFechaOrdinal(meta[b]?.fecha));

    const ABREV = { abril:'abr',mayo:'may',junio:'jun',julio:'jul',agosto:'ago',
                    septiembre:'sep',octubre:'oct',noviembre:'nov',diciembre:'dic',
                    enero:'ene',febrero:'feb',marzo:'mar' };
    function abrevFecha(fecha) {
        if (!fecha) return '—';
        return fecha.trim().toLowerCase().replace(/(\d+)\s+de\s+(\w+)/, (_, d, m) => `${d} ${ABREV[m] || m}`);
    }

    const agg = {};
    eventoNames.forEach(ev => { agg[ev] = { inv: 0, asi: 0, no: 0 }; });
    lideres.forEach(l => {
        const ev = l.evento;
        if (ev && agg[ev]) {
            agg[ev].inv += l.invitados     || 0;
            agg[ev].asi += l.asistieron    || 0;
            agg[ev].no  += l.no_asistieron || 0;
        }
    });

    const labels = eventoNames.map(ev => abrevFecha(meta[ev]?.fecha) || ev.split(' ')[0]);

    return {
        labels,
        invitados:   eventoNames.map(ev => agg[ev].inv),
        asistentes:  eventoNames.map(ev => agg[ev].asi),
        ausentes:    eventoNames.map(ev => agg[ev].no),
        efectividad: eventoNames.map(ev => agg[ev].inv > 0 ? (agg[ev].asi / agg[ev].inv) * 100 : 0),
        count:       eventoNames.length,
    };
}

// ── Generador de path SVG suavizado ──────────────────────────────────────
function sparkPath(values, W, H, pad) {
    if (!values || values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const rng = max - min || 1;
    const pts = values.map((v, i) => [
        +(pad + (i / (values.length - 1)) * (W - 2 * pad)).toFixed(2),
        +(H - pad - ((v - min) / rng) * (H - 2 * pad)).toFixed(2),
    ]);
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
        const cpx = ((pts[i - 1][0] + pts[i][0]) / 2).toFixed(2);
        d += ` C ${cpx} ${pts[i-1][1]} ${cpx} ${pts[i][1]} ${pts[i][0]} ${pts[i][1]}`;
    }
    return { line: d, pts };
}

// ── Sparkline de área con tooltips de fecha ───────────────────────────────
function drawSparkline(svgId, values, strokeColor, labels, unit) {
    const el = document.getElementById(svgId);
    if (!el || !values || values.length < 2) return;
    const W = 110, H = 40, pad = 4;
    const res = sparkPath(values, W, H, pad);
    if (!res) return;
    const { line, pts } = res;
    const area = `${line} L ${pts[pts.length-1][0]} ${H} L ${pts[0][0]} ${H} Z`;
    const u = unit || '';
    const dots = pts.map((p, i) => {
        const tip    = labels ? `${labels[i]}: ${Math.round(values[i])}${u}` : `${Math.round(values[i])}${u}`;
        const isLast = i === pts.length - 1;
        return `<circle cx="${p[0]}" cy="${p[1]}" r="${isLast ? 2.8 : 1.8}"
                    fill="${isLast ? strokeColor : 'transparent'}" stroke="${strokeColor}"
                    stroke-width="${isLast ? 0 : 1.2}" opacity="${isLast ? 1 : 0.7}">
                    <title>${tip}</title>
                </circle>`;
    }).join('');

    el.innerHTML = `
        <defs>
            <linearGradient id="sg-${svgId}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stop-color="${strokeColor}" stop-opacity="0.35"/>
                <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0.03"/>
            </linearGradient>
        </defs>
        <path d="${area}" fill="url(#sg-${svgId})" stroke="none"/>
        <path d="${line}" fill="none" stroke="${strokeColor}" stroke-width="1.8"
              stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}
    `;
}

// ── Mini barras con tooltip de fecha ─────────────────────────────────────
function drawSparkBars(svgId, count, labels, color) {
    const el = document.getElementById(svgId);
    if (!el || count < 1) return;
    const W = 110, H = 40, pad = 4, gap = 3;
    const barW = (W - 2 * pad - gap * (count - 1)) / count;
    const barH = H - 2 * pad;
    let bars = '';
    for (let i = 0; i < count; i++) {
        const x   = pad + i * (barW + gap);
        const op  = 0.35 + 0.65 * (i / Math.max(count - 1, 1));
        const tip = labels ? labels[i] : `Evento ${i + 1}`;
        bars += `<rect x="${x.toFixed(1)}" y="${pad}" width="${barW.toFixed(1)}" height="${barH}"
                      rx="2" fill="${color}" fill-opacity="${op.toFixed(2)}">
                      <title>${tip}</title>
                  </rect>`;
    }
    el.innerHTML = bars;
}

// ── Sparkline efectividad (color semáforo) ────────────────────────────────
function drawSparkEfect(svgId, values, labels) {
    const avg   = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const color = avg >= 70 ? '#267e26' : avg >= 40 ? '#f59e0b' : '#ef4444';
    drawSparkline(svgId, values, color, labels, '%');
}

// ── Actualizar KPIs ───────────────────────────────────────────────────────
document.addEventListener('datosListos', () => {
    const tab     = window._tabActual   || 'global';
    const data    = window.dashData     || {};
    const full    = window.dashDataFull || {};
    const resumen = data.resumen        || {};

    const labelEfect = document.getElementById('kpi-label-efectividad');
    const secTitle   = document.getElementById('kpi-section-title');
    const cardEv     = document.getElementById('kpi-card-eventos');

    const numEventos = (full.eventos || []).length;

    // Helper para obtener el elemento
    const el = id => document.getElementById(id);

    if (tab === 'individual') {
        if (secTitle)   secTitle.textContent   = 'Indicadores del Líder';
        if (labelEfect) labelEfect.textContent = 'Efectividad Individual';
        if (cardEv)     cardEv.style.display   = 'none';

        const liderNombre = window.liderSeleccionado;
        const lider = (full.lideres || []).find(r => r.nombre === liderNombre);
        if (lider) {
            countUp(el('kpi-invitados'),     lider.invitados     || 0, { duration: 1100 });
            countUp(el('kpi-asistentes'),    lider.asistieron    || 0, { duration: 1000 });
            countUp(el('kpi-no-asistieron'), lider.no_asistieron || 0, { duration:  900 });
            countUp(el('kpi-efectividad'),   lider.efectividad   || 0, { duration: 1000, suffix: '%', decimals: 1 });
        } else {
            ['kpi-invitados','kpi-asistentes','kpi-no-asistieron','kpi-efectividad']
                .forEach(id => { if (el(id)) el(id).textContent = '—'; });
        }
    } else {
        if (secTitle)   secTitle.textContent   = 'Indicadores Generales';
        if (labelEfect) labelEfect.textContent = '% de Efectividad';
        if (cardEv)     cardEv.style.display   = '';

        // Count-up con duraciones escalonadas para efecto visual en cascada
        countUp(el('kpi-num-eventos'),   numEventos,                     { duration:  700 });
        countUp(el('kpi-invitados'),     resumen.total_invitados  || 0,  { duration: 1400 });
        countUp(el('kpi-asistentes'),    resumen.total_asistentes || 0,  { duration: 1200 });
        countUp(el('kpi-no-asistieron'), resumen.no_asistieron    || 0,  { duration: 1000 });
        countUp(el('kpi-efectividad'),   resumen.efectividad_global || 0,{ duration: 1100, suffix: '%', decimals: 1 });
    }

    // ── Dibujar sparklines (orden cronológico) ────────────────────────────
    const spark = getSparkData();
    if (spark.count > 1) {
        drawSparkBars  ('spark-eventos',    spark.count,       spark.labels, '#60a5fa');
        drawSparkline  ('spark-invitados',  spark.invitados,   '#a5b4fc', spark.labels);
        drawSparkline  ('spark-asistentes', spark.asistentes,  '#7bc11d', spark.labels);
        drawSparkline  ('spark-ausentes',   spark.ausentes,    '#fca5a5', spark.labels);
        drawSparkEfect ('spark-efectividad',spark.efectividad,  spark.labels);
    }
});
