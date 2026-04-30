// ── FILTROS.JS ── Promotores de la Paz ───────────────────────────────────

function poblarLideres() {
    const selectInd = document.getElementById('select-lider-individual');
    if (!window.dashDataFull || !window.dashDataFull.lideres) return;

    const nombres = window.dashDataFull.lideres.map(r => r.nombre).sort();
    if (selectInd && selectInd.options.length <= 1) {
        nombres.forEach(n => {
            const opt = document.createElement('option');
            opt.value = n;
            opt.textContent = n;
            selectInd.appendChild(opt);
        });
        selectInd.addEventListener('change', (e) => {
            window.liderSeleccionado = e.target.value;
            document.dispatchEvent(new Event('datosListos'));
        });
    }
}

function initFiltros() {
    const btnLimpiar = document.getElementById('filtro-limpiar');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            const sel = document.getElementById('select-lider-individual');
            if (sel) sel.value = '';
            window.liderSeleccionado = '';
            document.dispatchEvent(new Event('datosListos'));
        });
    }

    document.addEventListener('datosListos', () => {
        poblarLideres();
    }, { once: true });
}

initFiltros();
