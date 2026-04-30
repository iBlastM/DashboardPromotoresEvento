// ── CONFIG.JS ── DashboardBecas ────────────────────────────────────────────────
// Tema, helpers de layout y utilidades de datos compartidas.

const C = {
    get isLight() { return document.documentElement.dataset.theme === 'light'; },
    get plotBg()  { return this.isLight ? '#ffffff' : '#060606'; },
    get paperBg() { return this.isLight ? '#ffffff' : '#0d0d0d'; },
    get textColor() { return this.isLight ? '#111111' : '#FFFFFF'; },
    get mutedText() { return this.isLight ? 'rgba(15,23,42,0.68)' : 'rgba(255,255,255,0.72)'; },
    get borderColor() { return this.isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.14)'; },

    naranja: '#7bc11d',
    verde:   '#3eb340',
    verdeOscuro: '#267e28',
    verdeSuave: '#a8e063',

    paleta: [
        '#7bc11d',
        '#56ab2f',
        '#3eb340',
        '#267e28',
        '#8BC34A',
        '#4CAF50',
        '#a8e063',
        '#2ecc71',
        '#27ae60',
        '#6fbf3f',
        '#9ccc65',
        '#1f6f2b',
    ],

    getPalette(n = 4, offset = 0) {
        return Array.from({ length: Math.max(Number(n) || 0, 0) }, (_, i) =>
            this.paleta[(i + offset) % this.paleta.length]
        );
    },

    fuente: "'Barlow', 'Inter', sans-serif",
};

const SMALL_WORDS = new Set([
    'de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'o', 'u', 'en', 'a', 'por', 'para', 'con', 'sin', 'al', 'vs',
]);

const LABEL_FIXES = {
    PUBLICA: 'Pública',
    PRIVADA: 'Privada',
    PUBLICO: 'Público',
    PRIVADO: 'Privado',
    EXTRATEMPORANEA: 'Extraordinaria',
    '1RA ETAPA': '1.ª Etapa',
    '2DA ETAPA': '2.ª Etapa',
    'CE-APROBADO': 'Aprobado',
    'CON RECHAZOS': 'Con rechazos',
    'CE-CON RECHAZO': 'Rechazo (CE)',
    'CE-PENDIENTE': 'Pendiente histórico',
};

function stripHtml(value = '') {
    return String(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[ch]));
}

function cleanupAccents(text = '') {
    return String(text)
        .replace(/\bPUBLICA\b/gi, 'Pública')
        .replace(/\bPRIVADA\b/gi, 'Privada')
        .replace(/\bPUBLICO\b/gi, 'Público')
        .replace(/\bPRIVADO\b/gi, 'Privado')
        .replace(/\bEXTRATEMPORANEA\b/gi, 'Extraordinaria')
        .replace(/\b1RA ETAPA\b/gi, '1.ª Etapa')
        .replace(/\b2DA ETAPA\b/gi, '2.ª Etapa');
}

function capitalizeWordEs(word, isFirst) {
    const prefix = word.match(/^[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]*/)?.[0] || '';
    const suffix = word.match(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]*$/)?.[0] || '';
    const core = word.slice(prefix.length, word.length - suffix.length);
    if (!core) return word;

    const exact = LABEL_FIXES[core.toUpperCase()];
    if (exact) return prefix + exact + suffix;
    if (core.toLowerCase() === 'mdp') return prefix + 'mdp' + suffix;
    if (/^(IPG|Q[1-4]|DL|DF|EX)$/i.test(core)) return prefix + core.toUpperCase() + suffix;
    if (!isFirst && SMALL_WORDS.has(core.toLowerCase())) return prefix + core.toLowerCase() + suffix;
    return prefix + core.charAt(0).toUpperCase() + core.slice(1).toLowerCase() + suffix;
}

function toTitleCaseEs(text = '') {
    const parts = String(text).split(/(\s+)/);
    let wordIndex = 0;
    return parts.map(part => {
        if (!part.trim()) return part;
        const next = capitalizeWordEs(part, wordIndex === 0);
        wordIndex += 1;
        return next;
    }).join('');
}

function toSentenceCaseEs(text = '') {
    const clean = cleanupAccents(stripHtml(text));
    if (!clean) return '';
    // Dejar palabras completamente en mayúsculas (siglas, acrónimos) tal cual
    return clean
        .split(/\s*·\s*/)
        .map(part => {
            const words = part.trim().split(/(\s+)/);
            let first = true;
            return words.map(w => {
                if (!w.trim()) return w;
                if (/^[A-ZÁÉÍÓÚÜÑ]{2,}$/.test(w)) return w; // siglas
                if (first) {
                    first = false;
                    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                }
                return w.toLowerCase();
            }).join('');
        })
        .join(' · ');
}

function formatDisplayText(value) {
    if (typeof value !== 'string') return value;
    const clean = cleanupAccents(stripHtml(value));
    if (!clean) return clean;

    const exact = LABEL_FIXES[clean.toUpperCase()];
    if (exact) return exact;
    if (/^[\d\s.,%$+\-–—()/:]+$/.test(clean)) return clean;
    if (clean.includes('=') || clean.includes('Δ')) return clean;

    const hasLower = /[a-záéíóúüñ]/.test(clean);
    const hasUpper = /[A-ZÁÉÍÓÚÜÑ]/.test(clean);
    if (hasLower && hasUpper && !/^[A-ZÁÉÍÓÚÜÑ\s]+$/.test(clean)) return clean;

    return toTitleCaseEs(clean);
}

function formatTitleText(value) {
    const clean = cleanupAccents(stripHtml(value));
    if (!clean) return '';
    if (clean.includes('=')) return clean;
    return toSentenceCaseEs(clean);
}

function normalizeColorForTheme(value) {
    if (typeof value !== 'string' || !C.isLight) return value;
    const trimmed = value.trim();

    if (/^#fff(?:fff)?$/i.test(trimmed)) return '#111111';

    const rgbaWhite = trimmed.match(/^rgba?\(\s*255\s*,\s*255\s*,\s*255(?:\s*,\s*([0-9.]+))?\s*\)$/i);
    if (rgbaWhite) {
        const alpha = rgbaWhite[1] ?? '1';
        return `rgba(15, 23, 42, ${alpha})`;
    }

    const rgbaGreen = trimmed.match(/^rgba?\(\s*(?:80\s*,\s*140\s*,\s*20|123\s*,\s*193\s*,\s*29)(?:\s*,\s*([0-9.]+))?\s*\)$/i);
    if (rgbaGreen) {
        const alpha = rgbaGreen[1] ?? '1';
        return `rgba(15, 23, 42, ${alpha})`;
    }

    return trimmed;
}

function normalizeColorProps(node) {
    if (Array.isArray(node)) {
        return node.map(item => normalizeColorProps(item));
    }
    if (!node || typeof node !== 'object') {
        return node;
    }

    const clone = {};
    Object.entries(node).forEach(([key, value]) => {
        if (/colorscale/i.test(key)) {
            clone[key] = value;
            return;
        }

        if (/color/i.test(key)) {
            if (Array.isArray(value)) {
                clone[key] = value.map(item => typeof item === 'string' ? normalizeColorForTheme(item) : normalizeColorProps(item));
            } else {
                clone[key] = typeof value === 'string' ? normalizeColorForTheme(value) : normalizeColorProps(value);
            }
            return;
        }

        clone[key] = normalizeColorProps(value);
    });
    return clone;
}

function isMixedAccentColor(value) {
    return typeof value === 'string' && /#(?:1dafe9|cb63e0|5b8af5|a855f7|f472b6|3b82f6|a78bfa|f48fb1|f06292|ec407a|e91e63|d81b60|c2185b|ad1457|ff80ab|ff4081|f50057|ff69b4|db7093)/i.test(value);
}

function normalizeMarkerColors(marker, traceIndex, categoryCount, traceType) {
    if (!marker || typeof marker !== 'object') return marker;
    const next = normalizeColorProps({ ...marker });

    if (traceType === 'pie') {
        next.colors = C.getPalette(categoryCount || next.colors?.length || 4, traceIndex);
    } else if (Array.isArray(next.color) && next.color.every(v => typeof v === 'string') && next.color.some(isMixedAccentColor)) {
        next.color = C.getPalette(next.color.length, traceIndex);
    } else if (typeof next.color === 'string' && isMixedAccentColor(next.color)) {
        next.color = C.paleta[traceIndex % C.paleta.length];
    }

    if (next.line?.color) {
        next.line = { ...next.line, color: normalizeColorForTheme(next.line.color) };
    }

    return next;
}

function normalizeTrace(trace, index, total) {
    const next = normalizeColorProps({ ...trace });

    if (typeof next.name === 'string') next.name = formatDisplayText(next.name);
    if (Array.isArray(next.labels)) next.labels = next.labels.map(v => typeof v === 'string' ? formatDisplayText(v) : v);
    if (Array.isArray(next.x)) next.x = next.x.map(v => typeof v === 'string' ? formatDisplayText(v) : v);
    if (Array.isArray(next.y)) next.y = next.y.map(v => typeof v === 'string' ? formatDisplayText(v) : v);
    if (next.marker) {
        const categoryCount = Array.isArray(next.labels) ? next.labels.length : (Array.isArray(next.x) ? next.x.length : total);
        next.marker = normalizeMarkerColors(next.marker, index, categoryCount, next.type);
    }

    ['textfont', 'insidetextfont', 'outsidetextfont'].forEach(key => {
        if (next[key]) {
            next[key] = {
                ...next[key],
                family: next[key].family || C.fuente,
                color: normalizeColorForTheme(next[key].color || C.textColor),
            };
        }
    });

    if (next.number?.font) {
        next.number = {
            ...next.number,
            font: {
                ...next.number.font,
                family: next.number.font.family || C.fuente,
                color: normalizeColorForTheme(next.number.font.color || C.textColor),
            },
        };
    }

    if (next.gauge?.axis?.tickfont) {
        next.gauge = {
            ...next.gauge,
            axis: {
                ...next.gauge.axis,
                tickfont: {
                    ...next.gauge.axis.tickfont,
                    color: normalizeColorForTheme(next.gauge.axis.tickfont.color || C.textColor),
                },
            },
        };
    }

    return next;
}

function normalizeAxis(axis = {}) {
    const next = normalizeColorProps(axis);
    next.separatethousands = true;
    next.automargin = next.automargin ?? true;

    if (typeof next.title === 'string') {
        next.title = { text: formatDisplayText(next.title) };
    } else if (next.title?.text) {
        next.title = { ...next.title, text: formatDisplayText(next.title.text) };
    }

    if (next.tickfont) {
        next.tickfont = {
            ...next.tickfont,
            color: normalizeColorForTheme(next.tickfont.color || C.mutedText),
        };
    }

    return next;
}

function normalizeLayoutForTheme(layout = {}) {
    const next = normalizeColorProps({ ...layout });
    const titleInput = typeof next.title === 'string' ? next.title : next.title?.text;
    const titleText = formatTitleText(titleInput || '');
    const titleObj = typeof next.title === 'object' && next.title ? next.title : {};

    next.title = {
        ...titleObj,
        text: titleText ? escapeHtml(titleText) : '',
        font: {
            ...(titleObj.font || {}),
            size: titleObj.font?.size || 14,
            color: C.textColor,
            family: C.fuente,
        },
        x: titleObj.x ?? 0.5,
        xanchor: titleObj.xanchor || 'center',
        pad: titleObj.pad || { t: 4 },
    };

    next.paper_bgcolor = C.paperBg;
    next.plot_bgcolor = C.plotBg;
    next.font = {
        ...(next.font || {}),
        color: C.textColor,
        family: C.fuente,
        size: next.font?.size || 12,
    };

    next.xaxis = normalizeAxis(next.xaxis || {});
    next.yaxis = normalizeAxis(next.yaxis || {});

    Object.keys(next)
        .filter(key => /^(x|y)axis\d+$/i.test(key))
        .forEach(key => {
            next[key] = normalizeAxis(next[key]);
        });

    next.legend = {
        ...(next.legend || {}),
        font: {
            ...(next.legend?.font || {}),
            color: C.textColor,
            size: next.legend?.font?.size || 11,
        },
        bgcolor: C.isLight ? 'rgba(255,255,255,0.96)' : 'rgba(12,12,12,0.78)',
        bordercolor: C.borderColor,
        borderwidth: next.legend?.borderwidth ?? 1,
    };

    next.hoverlabel = {
        ...(next.hoverlabel || {}),
        bgcolor: C.isLight ? '#FFFFFF' : '#111111',
        bordercolor: normalizeColorForTheme(next.hoverlabel?.bordercolor || '#CCCCCC'),
        font: {
            ...(next.hoverlabel?.font || {}),
            color: C.isLight ? '#111111' : '#FFFFFF',
            family: C.fuente,
            size: next.hoverlabel?.font?.size || 12,
        },
    };

    if (next.mapbox) {
        next.mapbox = {
            ...next.mapbox,
            style: C.isLight ? 'carto-positron' : 'carto-darkmatter',
        };
    }

    return next;
}

function getDefaultHelpText(titleText, traces = [], layout = {}) {
    const plainTitle = stripHtml(titleText || '').replace(/^\?+\s*/, '') || 'esta visualización';
    const firstTrace = traces.find(Boolean) || {};
    let expl = 'Usa los filtros del tablero para comparar los valores mostrados.';

    if (/choropleth|mapbox/i.test(firstTrace.type || '')) {
        expl = 'El color del mapa indica la concentración del indicador por territorio con base en los filtros activos.';
    } else if (firstTrace.type === 'pie') {
        expl = 'Cada segmento representa la proporción de una categoría respecto del total filtrado.';
    } else if (firstTrace.type === 'treemap') {
        expl = 'El tamaño de cada bloque refleja la participación relativa de cada categoría en el total.';
    } else if (firstTrace.type === 'bar') {
        expl = 'La altura o longitud de cada barra representa la magnitud de cada categoría o periodo.';
    } else if (firstTrace.type === 'scatter') {
        expl = 'La posición de los puntos o líneas permite comparar tendencias y variaciones entre grupos o periodos.';
    }

    if (layout.barmode === 'stack') {
        expl += ' La apilación permite identificar la composición del total.';
    }

    return `Esta gráfica muestra ${plainTitle.toLowerCase()}. ${expl}`;
}

function ensureCardMeta(card) {
    if (!card) return null;
    let meta = card.querySelector('.chart-card-meta');
    if (!meta) {
        meta = document.createElement('div');
        meta.className = 'chart-card-meta';
        card.appendChild(meta);
    }
    return meta;
}

function ensureHelpIcon(targetEl, traces, layout) {
    const card = targetEl?.closest('.chart-card');
    const meta = ensureCardMeta(card);
    if (!meta) return;

    let help = meta.querySelector('.help-icon[data-chart-help="1"]');
    if (!help) {
        help = document.createElement('span');
        help.className = 'help-icon';
        help.dataset.chartHelp = '1';
        help.tabIndex = 0;
        help.setAttribute('role', 'button');
        help.innerHTML = '?<span class="help-tooltip"></span>';
        meta.appendChild(help);
    }

    const plainTitle = stripHtml(layout?.title?.text || targetEl.id || 'gráfica');
    help.setAttribute('aria-label', `Información sobre ${plainTitle}`);
    const tooltip = help.querySelector('.help-tooltip');
    if (tooltip) tooltip.textContent = getDefaultHelpText(plainTitle, traces, layout);
}

function closeAllTraceDropdowns(exceptWrap = null) {
    document.querySelectorAll('.chk-dropdown-wrap').forEach(wrap => {
        if (exceptWrap && wrap === exceptWrap) return;
        wrap.querySelector('.chk-dropdown-btn')?.classList.remove('open');
        wrap.querySelector('.chk-dropdown-panel')?.classList.remove('open');
    });
}

function ensureTraceFilterDropdown(targetEl, traces, layout) {
    const card = targetEl?.closest('.chart-card');
    const meta = ensureCardMeta(card);
    if (!meta || !Array.isArray(traces)) return;

    const namedTraces = traces
        .map((trace, index) => ({ trace, index }))
        .filter(({ trace }) => {
            const name = stripHtml(trace?.name || '');
            return name && trace?.showlegend !== false && !/mapbox/i.test(trace?.type || '');
        });

    let wrap = meta.querySelector('.chk-dropdown-wrap[data-chart-id]');
    if (namedTraces.length < 2) {
        wrap?.remove();
        return;
    }

    if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'chk-dropdown-wrap';
        wrap.dataset.chartId = targetEl.id || 'chart';
        wrap.innerHTML = `
            <button type="button" class="chk-dropdown-btn" aria-label="Filtrar etiquetas de la gráfica">
                <span>Etiquetas</span>
                <span class="chk-chevron">▾</span>
            </button>
            <div class="chk-dropdown-panel" role="dialog" aria-label="Seleccionar etiquetas visibles">
                <div class="chk-dropdown-actions">
                    <button type="button" class="chk-action-btn" data-action="all">Todas</button>
                    <button type="button" class="chk-action-btn" data-action="none">Ninguna</button>
                </div>
                <div class="chart-checklist-items"></div>
            </div>`;
        meta.insertBefore(wrap, meta.firstChild);
    }

    const btn = wrap.querySelector('.chk-dropdown-btn');
    const panel = wrap.querySelector('.chk-dropdown-panel');
    const items = wrap.querySelector('.chart-checklist-items');

    if (!wrap.dataset.bound) {
        btn?.addEventListener('click', event => {
            event.stopPropagation();
            const willOpen = !panel.classList.contains('open');
            closeAllTraceDropdowns(willOpen ? wrap : null);
            panel.classList.toggle('open', willOpen);
            btn.classList.toggle('open', willOpen);
        });

        wrap.querySelector('[data-action="all"]')?.addEventListener('click', () => {
            items.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = true; });
            applyTraceVisibility(targetEl, items);
        });

        wrap.querySelector('[data-action="none"]')?.addEventListener('click', () => {
            items.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; });
            applyTraceVisibility(targetEl, items);
        });

        wrap.dataset.bound = '1';
    }

    items.innerHTML = '';
    namedTraces.forEach(({ trace, index }) => {
        const row = document.createElement('label');
        row.className = 'chk-item';
        row.innerHTML = `
            <input type="checkbox" data-trace-index="${index}" ${trace.visible === false || trace.visible === 'legendonly' ? '' : 'checked'}>
            <span>${escapeHtml(formatDisplayText(stripHtml(trace.name)))}</span>`;
        row.querySelector('input')?.addEventListener('change', () => applyTraceVisibility(targetEl, items));
        items.appendChild(row);
    });
}

function applyTraceVisibility(targetEl, itemsEl) {
    const inputs = [...itemsEl.querySelectorAll('input[type="checkbox"]')];
    const indices = inputs.map(input => Number(input.dataset.traceIndex));
    const visible = inputs.map(input => input.checked);
    if (indices.length) {
        Plotly.restyle(targetEl, { visible }, indices);
    }
}

if (!window.__metrixChartDropdownBound) {
    document.addEventListener('click', event => {
        if (!event.target.closest('.chk-dropdown-wrap')) {
            closeAllTraceDropdowns();
        }
    });
    window.__metrixChartDropdownBound = true;
}

/** Layout base para Plotly — adapta colores al tema activo. Mezcla extras si se pasan. */
function getLayout(titulo, extras) {
    const isLight = C.isLight;
    const textCol = isLight ? '#111111' : '#FFFFFF';
    const gridCol = isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)';
    const lineCol = isLight ? 'rgba(15,23,42,0.18)' : 'rgba(255,255,255,0.18)';
    const zeroCol = isLight ? 'rgba(15,23,42,0.14)' : 'rgba(255,255,255,0.16)';
    const tickCol = isLight ? 'rgba(15,23,42,0.60)' : 'rgba(255,255,255,0.60)';
    const lgBg    = isLight ? 'rgba(255,255,255,0.96)' : 'rgba(12,12,12,0.78)';
    const lgBrdr  = isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.14)';

    const base = {
        title: {
            text: titulo,
            font: { size: 14, color: textCol, family: C.fuente },
            x: 0.5,
            xanchor: 'center',
            pad: { t: 4 },
        },
        paper_bgcolor: C.paperBg,
        plot_bgcolor: C.plotBg,
        font: { color: textCol, family: C.fuente, size: 12 },
        margin: { t: 56, r: 18, b: 48, l: 18 },
        xaxis: {
            gridcolor: gridCol,
            linecolor: lineCol,
            zerolinecolor: zeroCol,
            tickcolor: tickCol,
            separatethousands: true,
        },
        yaxis: {
            gridcolor: gridCol,
            linecolor: lineCol,
            zerolinecolor: zeroCol,
            tickcolor: tickCol,
            separatethousands: true,
        },
        legend: {
            font: { color: textCol, size: 11 },
            bgcolor: lgBg,
            bordercolor: lgBrdr,
            borderwidth: 1,
        },
        hoverlabel: {
            bgcolor: isLight ? '#FFFFFF' : '#111111',
            bordercolor: isLight ? 'rgba(15,23,42,0.12)' : '#333333',
            font: { color: isLight ? '#111111' : '#FFFFFF', family: C.fuente, size: 12 },
        },
    };

    return normalizeLayoutForTheme(Object.assign({}, base, extras || {}));
}

// Config global de Plotly
const plotConfig = { responsive: true, displayModeBar: false };

if (window.Plotly && !window.__metrixPlotlyPatched) {
    const nativeNewPlot = window.Plotly.newPlot.bind(window.Plotly);

    window.Plotly.newPlot = function (gd, data, layout, config) {
        const targetEl = typeof gd === 'string' ? document.getElementById(gd) : gd;
        const safeData = Array.isArray(data) ? data.map((trace, index) => normalizeTrace(trace, index, data.length)) : data;
        const safeLayout = normalizeLayoutForTheme(layout || {});

        if (Array.isArray(safeData)) {
            const filterableCount = safeData.filter(trace => stripHtml(trace?.name || '') && trace?.showlegend !== false && !/mapbox/i.test(trace?.type || '')).length;
            const hasPie = safeData.some(trace => trace.type === 'pie');
            if (filterableCount >= 2 && safeLayout.showlegend !== false && !hasPie) {
                safeLayout.showlegend = false;
            }
        }

        const result = nativeNewPlot(gd, safeData, safeLayout, config || plotConfig);

        if (targetEl) {
            ensureHelpIcon(targetEl, safeData, safeLayout);
            ensureTraceFilterDropdown(targetEl, safeData, safeLayout);
        }

        return result;
    };

    window.__metrixPlotlyPatched = true;
}

// ── UTILIDADES DE DATOS ──────────────────────────────────────────────────────

/** Cuenta cuántas veces aparece cada valor de `campo`. */
function contarPor(data, campo) {
    return data.reduce((acc, row) => {
        const k = row[campo] != null ? row[campo] : 'Sin dato';
        acc[k] = (acc[k] || 0) + 1;
        return acc;
    }, {});
}

/** Suma los valores de `campoValor` agrupados por `campoClave`. */
function sumarPor(data, campoClave, campoValor) {
    return data.reduce((acc, row) => {
        const k = row[campoClave] != null ? row[campoClave] : 'Sin dato';
        acc[k] = (acc[k] || 0) + (Number(row[campoValor]) || 0);
        return acc;
    }, {});
}

/** Promedia los valores de `campoValor` agrupados por `campoClave`. */
function promediarPor(data, campoClave, campoValor) {
    const sumas = {}, ns = {};
    data.forEach(row => {
        const k = row[campoClave] != null ? row[campoClave] : 'Sin dato';
        sumas[k] = (sumas[k] || 0) + (Number(row[campoValor]) || 0);
        ns[k]    = (ns[k] || 0) + 1;
    });
    const result = {};
    Object.keys(sumas).forEach(k => { result[k] = sumas[k] / ns[k]; });
    return result;
}

/** Devuelve los N pares [clave, valor] con mayor valor. */
function topN(obj, n) {
    return Object.fromEntries(
        Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n)
    );
}

/** Entradas ordenadas descendente por valor. */
function sortedDesc(obj) {
    return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

/** Formatea número en es-MX. */
function fmt(v, opts) {
    return Number(v || 0).toLocaleString('es-MX', {
        useGrouping: true,
        maximumFractionDigits: 0,
        ...(opts || {}),
    });
}

/** Formatea como pesos MX sin decimales. */
function fmtPeso(v) {
    return '$' + fmt(v, { maximumFractionDigits: 0 });
}

// ── DELEGADO GLOBAL: selector de Top N ──────────────────────────────────────
// Maneja cambios en cualquier .top-select dentro de .top-selector[data-chart].
// Cada gráfica expone su función de re-render en el elemento DOM como ._renderTop(n).
document.addEventListener('change', function (e) {
    const select = e.target.closest('.top-select');
    if (!select) return;
    const sel = select.closest('.top-selector[data-chart]');
    if (!sel) return;
    const el = document.getElementById(sel.dataset.chart);
    if (el && typeof el._renderTop === 'function') {
        el._renderTop(+select.value);
    }
});
