// ── CIUDADANOS.JS ── Promotores de la Paz ────────────────────────────────

function formatearHora(horaStr) {
    if (!horaStr || typeof horaStr !== 'string') return '—';
    const s = horaStr.trim();
    if (!s) return '—';

    // Intentar extraer HH:MM (24h o 12h con AM/PM)
    const m24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*$/);
    if (m24) {
        let h = parseInt(m24[1], 10);
        const min = m24[2];
        if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:${min}`;
    }

    const m12 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|A\.M\.|P\.M\.)/i);
    if (m12) {
        let h = parseInt(m12[1], 10);
        const min = m12[2];
        const ampm = m12[3].replace(/\./g, '').toUpperCase();
        if (ampm === 'PM' && h !== 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:${min}`;
    }

    // Intentar parsear como fecha/hora de Excel (serial) o Date
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
        const h = d.getHours();
        const m = d.getMinutes();
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    return '—';
}

function obtenerModa(arr) {
    const freq = {};
    arr.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}

document.addEventListener('datosListos', () => {
    if (window._tabActual !== 'ciudadanos') return;

    const tbody = document.getElementById('ciudadanos-tbody');
    const thAsistencia = document.getElementById('th-asistencia');
    const thHora = document.getElementById('th-hora');
    const elTotal = document.getElementById('ciu-total');
    const elPresentes = document.getElementById('ciu-presentes');
    const elAusentes = document.getElementById('ciu-ausentes');
    const elEfectividad = document.getElementById('ciu-efectividad');
    const elEventosVal = document.getElementById('ciu-eventos-val');
    const elEventosLabel = document.getElementById('ciu-eventos-label');
    const elEventosSub = document.getElementById('ciu-eventos-sub');

    if (!tbody) return;

    const data = window.dashData || {};
    let ciudadanos = data.ciudadanos || [];
    const eventoSel = document.getElementById('select-evento')?.value || '';
    const modoTodosEventos = !eventoSel;
    const full = window.dashDataFull || {};

    const totalEventos = (full.eventos || []).length;

    // Actualizar tarjeta de eventos
    if (modoTodosEventos) {
        if (elEventosVal) elEventosVal.textContent = fmt(totalEventos);
        if (elEventosLabel) elEventosLabel.textContent = 'Total Eventos';
        if (elEventosSub) elEventosSub.textContent = '';
    } else {
        const meta = getEventoMeta(eventoSel);
        if (elEventosVal) elEventosVal.textContent = eventoSel;
        if (elEventosLabel) elEventosLabel.textContent = meta?.fecha || 'Fecha no disponible';
        if (elEventosSub) elEventosSub.textContent = meta?.hora || '';
    }

    if (modoTodosEventos) {
        // Agrupar por nombre
        const grupos = {};
        ciudadanos.forEach(c => {
            const key = (c.nombre || 'Sin nombre').trim().toLowerCase();
            if (!grupos[key]) {
                grupos[key] = {
                    nombre: c.nombre || 'Sin nombre',
                    lideres: [],
                    total: 0,
                    asistidos: 0,
                    horas: [],
                };
            }
            grupos[key].lideres.push(c.lider || '');
            grupos[key].total += 1;
            if (c.asistio) grupos[key].asistidos += 1;
            if (c.hora_llegada) grupos[key].horas.push(c.hora_llegada);
        });

        const list = Object.values(grupos).map(g => ({
            nombre: g.nombre,
            lider: obtenerModa(g.lideres),
            asistenciaTexto: `${g.asistidos}/${g.total}`,
            hora: g.horas.length ? formatearHora(g.horas[g.horas.length - 1]) : '—',
            asistio: g.asistidos > 0,
            asistidos: g.asistidos,
            total: g.total,
        }));

        const total = list.length;
        const presentes = list.reduce((s, r) => s + r.asistidos, 0);
        const ausentes = list.reduce((s, r) => s + (r.total - r.asistidos), 0);
        const efectividad = total ? (presentes / (presentes + ausentes)) * 100 : 0;

        if (elTotal) elTotal.textContent = fmt(total);
        if (elPresentes) elPresentes.textContent = fmt(presentes);
        if (elAusentes) elAusentes.textContent = fmt(ausentes);
        if (elEfectividad) elEfectividad.textContent = efectividad.toLocaleString('es-MX', { maximumFractionDigits: 1 }) + '%';
        if (elEventosVal) elEventosVal.textContent = fmt(totalEventos);

        if (thAsistencia) thAsistencia.textContent = 'Eventos Asistidos';
        if (thHora) thHora.textContent = 'Última Hora';

        if (!total) {
            const liderFiltro = document.getElementById('combo-lider-value')?.value || '';
            const mensaje = liderFiltro
                ? `El promotor <strong>${escapeHtml(liderFiltro)}</strong> no tiene registros detallados de ciudadanos.`
                : 'No hay registros para los filtros seleccionados';
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem;">${mensaje}</td></tr>`;
            return;
        }

        const sorted = list.sort((a, b) =>
            (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' })
        );

        tbody.innerHTML = sorted.map(c => {
            const nombre = escapeHtml(formatDisplayText(c.nombre));
            const lider = escapeHtml(formatDisplayText(c.lider || 'Sin promotor'));
            return `
            <tr>
                <td>${nombre}</td>
                <td>${lider}</td>
                <td><span class="ciudadanos-badge">${c.asistenciaTexto}</span></td>
                <td>${c.hora}</td>
            </tr>`;
        }).join('');

    } else {
        // Modo evento individual: tabla normal
        const total = ciudadanos.length;
        const presentes = ciudadanos.filter(c => c.asistio).length;
        const ausentes = total - presentes;
        const efectividad = total ? (presentes / total) * 100 : 0;

        if (elTotal) elTotal.textContent = fmt(total);
        if (elPresentes) elPresentes.textContent = fmt(presentes);
        if (elAusentes) elAusentes.textContent = fmt(ausentes);
        if (elEfectividad) elEfectividad.textContent = efectividad.toLocaleString('es-MX', { maximumFractionDigits: 1 }) + '%';
        if (thAsistencia) thAsistencia.textContent = 'Asistió';
        if (thHora) thHora.textContent = 'Hora de Llegada';

        if (!total) {
            const liderFiltro = document.getElementById('combo-lider-value')?.value || '';
            const mensaje = liderFiltro
                ? `El promotor <strong>${escapeHtml(liderFiltro)}</strong> no tiene registros detallados de ciudadanos.`
                : 'No hay registros para los filtros seleccionados';
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem;">${mensaje}</td></tr>`;
            return;
        }

        const sorted = [...ciudadanos].sort((a, b) =>
            (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' })
        );

        tbody.innerHTML = sorted.map(c => {
            const statusClass = c.asistio ? 'status-yes' : 'status-no';
            const hora = formatearHora(c.hora_llegada);
            const nombre = escapeHtml(formatDisplayText(c.nombre || 'Sin nombre'));
            const lider = escapeHtml(formatDisplayText(c.lider || 'Sin promotor'));
            return `
            <tr>
                <td>${nombre}</td>
                <td>${lider}</td>
                <td><span class="status-dot ${statusClass}" aria-label="${c.asistio ? 'Asistió' : 'No asistió'}"></span></td>
                <td>${hora}</td>
            </tr>`;
        }).join('');
    }
});
