// ── THEME.JS ── DashboardBecas ─────────────────────────────────────────────────
// Gestiona el toggle claro / oscuro.
// Se carga ANTES de config.js para que el tema esté fijado cuando
// getLayout() se llame por primera vez y los gráficos se rendericen.

(function () {
    const KEY  = 'db-theme';
    const root = document.documentElement;

    function updateBtn(theme) {
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;
        btn.textContent = theme === 'light' ? '☾' : '☀';
        btn.title = theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
    }

    function applyTheme(theme, redrawCharts) {
        root.dataset.theme = theme;
        localStorage.setItem(KEY, theme);
        updateBtn(theme);
        if (redrawCharts && window.dashData) {
            // Re-dispatch datosListos: todos los módulos de gráficas escuchan
            // este evento y llaman Plotly.newPlot con getLayout() actualizado.
            document.dispatchEvent(new Event('datosListos'));
        }
    }

    // ── Aplicar tema guardado inmediatamente (evita flash) ─────────────────
    const saved = localStorage.getItem(KEY) || 'dark';
    root.dataset.theme = saved;

    // Actualizar botón una vez que el DOM esté listo
    document.addEventListener('DOMContentLoaded', () => updateBtn(saved));

    // ── API pública ─────────────────────────────────────────────────────────
    window.toggleTheme = function () {
        const next = (root.dataset.theme || 'dark') === 'dark' ? 'light' : 'dark';
        applyTheme(next, true);
    };
}());
