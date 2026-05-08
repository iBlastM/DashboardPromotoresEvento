// ── FILTROS.JS ── Promotores de la Paz ───────────────────────────────────

function poblarEventos() {
    const selectEvt = document.getElementById('select-evento');
    if (!window.dashDataFull || !window.dashDataFull.eventos) return;

    const eventos = window.dashDataFull.eventos;
    if (selectEvt && selectEvt.options.length <= 1) {
        eventos.forEach(ev => {
            const opt = document.createElement('option');
            opt.value = ev;
            opt.textContent = ev;
            selectEvt.appendChild(opt);
        });
        selectEvt.addEventListener('change', () => {
            aplicarFiltros();
        });
    }
}

/* ── COMBO SEARCH (Dropdown + Searchbar) para Promotor ───────────────────── */

function getComboLideresDisponibles() {
    const eventoSel = document.getElementById('select-evento')?.value || '';
    let lideres = window.dashDataFull?.lideres || [];
    if (eventoSel) {
        lideres = lideres.filter(r => r.evento === eventoSel);
    }
    return [...new Set(lideres.map(r => r.nombre))].sort();
}

function poblarComboLideres() {
    const list = document.getElementById('combo-lider-list');
    const nombres = getComboLideresDisponibles();
    if (!list) return;

    list.innerHTML = '';
    nombres.forEach(n => {
        const item = document.createElement('div');
        item.className = 'combo-search-item';
        item.textContent = n;
        item.dataset.value = n;
        item.addEventListener('click', () => seleccionarComboLider(n));
        list.appendChild(item);
    });
}

function abrirComboLider() {
    const dropdown = document.getElementById('combo-lider-dropdown');
    if (dropdown) dropdown.classList.add('open');
}

function cerrarComboLider() {
    const dropdown = document.getElementById('combo-lider-dropdown');
    if (dropdown) dropdown.classList.remove('open');
}

function filtrarComboLider(query) {
    const list = document.getElementById('combo-lider-list');
    if (!list) return;
    const items = list.querySelectorAll('.combo-search-item');
    let visible = 0;
    items.forEach(item => {
        const match = item.textContent.toLowerCase().includes(query.toLowerCase());
        item.style.display = match ? '' : 'none';
        if (match) visible++;
    });

    // Mostrar "Sin resultados" si no hay coincidencias
    let noResults = list.querySelector('.combo-search-item.no-results');
    if (!visible) {
        if (!noResults) {
            noResults = document.createElement('div');
            noResults.className = 'combo-search-item no-results';
            noResults.textContent = 'Sin resultados';
            list.appendChild(noResults);
        }
        noResults.style.display = '';
    } else if (noResults) {
        noResults.style.display = 'none';
    }
}

function seleccionarComboLider(nombre) {
    const input = document.getElementById('combo-lider-input');
    const hidden = document.getElementById('combo-lider-value');
    if (input) input.value = nombre;
    if (hidden) hidden.value = nombre;
    window.liderSeleccionado = nombre;
    cerrarComboLider();
    aplicarFiltros();
}

function limpiarComboLider() {
    const input = document.getElementById('combo-lider-input');
    const hidden = document.getElementById('combo-lider-value');
    if (input) input.value = '';
    if (hidden) hidden.value = '';
    window.liderSeleccionado = '';
    cerrarComboLider();
}

function initComboLider() {
    const input = document.getElementById('combo-lider-input');
    const wrap = document.getElementById('combo-lider');
    if (!input || !wrap) return;

    input.addEventListener('focus', () => {
        filtrarComboLider(input.value);
        abrirComboLider();
    });

    input.addEventListener('input', () => {
        // Si el usuario borra todo, limpiar selección exacta
        if (!input.value.trim()) {
            const hidden = document.getElementById('combo-lider-value');
            if (hidden) hidden.value = '';
            window.liderSeleccionado = '';
        }
        filtrarComboLider(input.value);
        abrirComboLider();
    });

    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) {
            cerrarComboLider();
        }
    });

    // Cerrar con Escape
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarComboLider();
    });
}

/* ── APLICAR FILTROS ─────────────────────────────────────────────────────── */

function aplicarFiltros() {
    if (!window.dashDataFull) return;

    const eventoSel = document.getElementById('select-evento')?.value || '';
    const liderSel = document.getElementById('combo-lider-value')?.value || '';
    const liderInput = document.getElementById('combo-lider-input')?.value?.trim().toLowerCase() || '';

    const full = window.dashDataFull;
    let lideres = full.lideres || [];
    let ciudadanos = full.ciudadanos || [];
    let porHora = full.por_hora || [];

    if (eventoSel) {
        lideres = lideres.filter(r => r.evento === eventoSel);
        ciudadanos = ciudadanos.filter(r => r.evento === eventoSel);
        porHora = porHora.filter(r => r.evento === eventoSel);
    }

    if (liderSel) {
        lideres = lideres.filter(r => r.nombre === liderSel);
        ciudadanos = ciudadanos.filter(r => r.lider === liderSel);
    } else if (liderInput && window._tabActual === 'ciudadanos') {
        // Si no hay selección exacta pero hay texto, filtrar por inclusión (solo ciudadanos)
        ciudadanos = ciudadanos.filter(r => (r.lider || '').toLowerCase().includes(liderInput));
    }

    // Recalcular resumen
    const inv = lideres.reduce((s, r) => s + (r.invitados || 0), 0);
    const asis = lideres.reduce((s, r) => s + (r.asistieron || 0), 0);
    const noas = lideres.reduce((s, r) => s + (r.no_asistieron || 0), 0);

    const resumen = {
        total_invitados: inv,
        total_asistentes: asis,
        no_asistieron: noas,
        efectividad_global: inv ? parseFloat(((asis / inv) * 100).toFixed(1)) : 0,
        total_lideres: lideres.length,
        tickets_entregados: ciudadanos.filter(c => c.ticket).length,
    };

    window.dashData = {
        eventos: full.eventos,
        resumen: resumen,
        por_hora: porHora,
        lideres: lideres,
        ciudadanos: ciudadanos,
    };

    // Repopulate leader dropdown if event changed
    poblarComboLideres();

    document.dispatchEvent(new Event('datosListos'));
}

function initFiltros() {
    const btnLimpiar = document.getElementById('filtro-limpiar');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            const selEvt = document.getElementById('select-evento');
            if (selEvt) selEvt.value = '';
            limpiarComboLider();
            aplicarFiltros();
        });
    }

    initComboLider();

    document.addEventListener('datosListos', () => {
        poblarEventos();
        poblarComboLideres();
        aplicarFiltros();
    }, { once: true });
}

initFiltros();
