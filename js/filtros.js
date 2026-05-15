// ── FILTROS.JS ── Promotores de la Paz ───────────────────────────────────

function poblarEventos() {
    const list = document.getElementById('combo-evento-list');
    if (!window.dashDataFull?.eventos || !list) return;

    const eventos = window.dashDataFull.eventos;
    if (list.children.length > 0) return; // ya poblado

    eventos.forEach(ev => {
        const item = document.createElement('div');
        item.className = 'combo-search-item';
        item.textContent = ev;
        item.dataset.value = ev;
        item.addEventListener('click', () => seleccionarComboEvento(ev));
        list.appendChild(item);
    });
}

function seleccionarComboEvento(valor) {
    const input  = document.getElementById('combo-evento-input');
    const hidden = document.getElementById('select-evento');
    if (input)  input.value  = valor || '';
    if (hidden) hidden.value = valor || '';
    document.getElementById('combo-evento-dropdown')?.classList.remove('open');
    aplicarFiltros();
}

function initComboEvento() {
    const input = document.getElementById('combo-evento-input');
    const wrap  = document.getElementById('combo-evento');
    if (!input || !wrap) return;

    input.addEventListener('focus', () => {
        filtrarComboEvento(input.value);
        document.getElementById('combo-evento-dropdown')?.classList.add('open');
    });
    input.addEventListener('input', () => {
        if (!input.value.trim()) {
            const hidden = document.getElementById('select-evento');
            if (hidden) hidden.value = '';
        }
        filtrarComboEvento(input.value);
        document.getElementById('combo-evento-dropdown')?.classList.add('open');
    });
    document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target))
            document.getElementById('combo-evento-dropdown')?.classList.remove('open');
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape')
            document.getElementById('combo-evento-dropdown')?.classList.remove('open');
    });
}

function filtrarComboEvento(query) {
    const list = document.getElementById('combo-evento-list');
    if (!list) return;
    const items = list.querySelectorAll('.combo-search-item');
    let visible = 0;
    items.forEach(item => {
        const match = item.textContent.toLowerCase().includes(query.toLowerCase());
        item.style.display = match ? '' : 'none';
        if (match) visible++;
    });
    let noRes = list.querySelector('.combo-search-item.no-results');
    if (!visible) {
        if (!noRes) {
            noRes = document.createElement('div');
            noRes.className = 'combo-search-item no-results';
            noRes.textContent = 'Sin resultados';
            list.appendChild(noRes);
        }
        noRes.style.display = '';
    } else if (noRes) {
        noRes.style.display = 'none';
    }
}

/* ── COMBO SEARCH (Dropdown + Searchbar) para Promotor ───────────────────── */

function getComboLideresDisponibles() {
    const eventoSel = document.getElementById('select-evento')?.value || '';
    let lideres = window.dashDataFull?.lideres || [];
    if (eventoSel) {
        lideres = lideres.filter(r => r.evento === eventoSel);
    }
    // Consolidar por nombre y ordenar por asistentes para asignar ranking
    const map = {};
    lideres.forEach(r => {
        const n = r.nombre || 'Sin nombre';
        if (!map[n]) map[n] = { nombre: n, asistieron: 0 };
        map[n].asistieron += r.asistieron || 0;
    });
    return Object.values(map)
        .sort((a, b) => b.asistieron - a.asistieron)
        .map((r, i) => ({ nombre: r.nombre, ranking: i + 1 }));
}

function poblarComboLideres() {
    const list = document.getElementById('combo-lider-list');
    const lideres = getComboLideresDisponibles();
    if (!list) return;

    list.innerHTML = '';
    lideres.forEach(({ nombre, ranking }) => {
        const item = document.createElement('div');
        item.className = 'combo-search-item';
        item.dataset.value = nombre;
        item.dataset.ranking = ranking;
        item.innerHTML = `<span style="opacity:0.5;font-size:0.8em;margin-right:6px">#${ranking}</span>${nombre}`;
        item.addEventListener('click', () => seleccionarComboLider(nombre));
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
    const q = query.toLowerCase().replace(/^#/, '');
    const items = list.querySelectorAll('.combo-search-item:not(.no-results)');
    let visible = 0;
    items.forEach(item => {
        const name = (item.dataset.value || '').toLowerCase();
        const rank = String(item.dataset.ranking || '');
        const match = !q || name.includes(q) || rank === q || rank.startsWith(q);
        item.style.display = match ? '' : 'none';
        if (match) visible++;
    });

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

/* ── COMBO ETIQUETAS (Radar) ─────────────────────────────────────────────── */

function initComboEtiquetas() {
    const btn  = document.getElementById('combo-etiquetas-btn');
    const drop = document.getElementById('combo-etiquetas-dropdown');
    const wrap = document.getElementById('combo-etiquetas');
    if (!btn || !drop || !wrap) return;

    btn.addEventListener('click', () => drop.classList.toggle('open'));

    document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) drop.classList.remove('open');
    });

    document.getElementById('radar-etiquetas-search')?.addEventListener('input', function () {
        const q = this.value.trim().toLowerCase();
        document.querySelectorAll('#radar-etiquetas-list .radar-item').forEach(item => {
            const rank = item.querySelector('.radar-rank')?.textContent.toLowerCase() || '';
            const name = item.querySelector('.radar-name')?.textContent.toLowerCase() || '';
            item.style.display = (!q || rank.includes(q) || name.includes(q)) ? '' : 'none';
        });
    });

    wrap.querySelector('.radar-btn-all')?.addEventListener('click', () => {
        document.querySelectorAll('#radar-etiquetas-list .radar-cb').forEach(cb => cb.checked = true);
        document.getElementById('radar-etiquetas-list')?.dispatchEvent(new Event('change', { bubbles: true }));
    });
    wrap.querySelector('.radar-btn-none')?.addEventListener('click', () => {
        document.querySelectorAll('#radar-etiquetas-list .radar-cb').forEach(cb => cb.checked = false);
        document.getElementById('radar-etiquetas-list')?.dispatchEvent(new Event('change', { bubbles: true }));
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
            const input  = document.getElementById('combo-evento-input');
            const hidden = document.getElementById('select-evento');
            if (input)  input.value  = '';
            if (hidden) hidden.value = '';
            limpiarComboLider();
            aplicarFiltros();
        });
    }

    initComboEvento();
    initComboLider();
    initComboEtiquetas();

    document.addEventListener('datosListos', () => {
        poblarEventos();
        poblarComboLideres();
        aplicarFiltros();
    }, { once: true });
}

initFiltros();
