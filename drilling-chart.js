/** The form, printable drawing and 3D renderer share one resolved drilling chart. */
(function attachDrillingChart() {
    'use strict';
    const storageKey = 'layout-translator.drilling.v1';
    let current;
    const text = (key) => window.t(key);
    const escape = (value) =>
        String(value).replace(
            /[&<>"']/g,
            (c) =>
                ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;',
                })[c],
        );
    const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
    const add = (a, b) => a.map((x, i) => x + b[i]);
    const scale = (a, s) => a.map((x) => x * s);
    const unit = (a) => scale(a, 1 / Math.hypot(...a));
    const cross = (a, b) => [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
    const format = (value) => formatInputValueForUnit(value, 'dist') + '″';

    function renderDiagram(resolved) {
        const holder = document.getElementById('drilling-diagram');
        if (!holder) return;
        if (!resolved.valid) {
            holder.innerHTML = '';
            return;
        }
        const { R, edgeDistance } = window.DrillingMath;
        const mirror = state.common.hand === 'left' ? -1 : 1;
        const project = (p) => [210 + mirror * p[0] * 40, 215 - p[1] * 40];
        const path = (points) =>
            points
                .map(
                    (p, i) =>
                        (i ? 'L' : 'M') +
                        project(p)
                            .map((v) => v.toFixed(2))
                            .join(','),
                )
                .join(' ') + ' Z';
        const label = (x, y, caption, color = '#68717d', size = 12) =>
            `<text x="${x}" y="${y}" text-anchor="middle" fill="${color}" font-size="${size}">${escape(caption)}</text>`;
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 445" aria-hidden="true"><defs><marker id="dim-arrow" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M8 0 0 4 8 8" fill="none" stroke="#7b9bcc" stroke-width="1.2"/></marker></defs><circle cx="210" cy="215" r="${R * 40}" fill="#fff" stroke="#d6dde6"/><path d="M210 43V387M38 215H382" stroke="#e8edf5" stroke-dasharray="4 6"/>`;
        for (const hole of resolved.holes) {
            const a = hole.axis,
                ref = Math.abs(a[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0];
            const u = unit(add(ref, scale(a, -dot(ref, a)))),
                v = unit(cross(a, u)),
                points = [];
            for (let i = 0; i <= 80; i++) {
                const theta = (i * Math.PI * 2) / 80;
                const w = add(
                    hole.center,
                    add(
                        scale(u, hole.radius * Math.cos(theta)),
                        scale(v, hole.radius * Math.sin(theta)),
                    ),
                );
                const d = dot(w, a),
                    t = -d - Math.sqrt(Math.max(0, d * d - dot(w, w) + R * R));
                points.push(add(w, scale(a, t)));
            }
            svg += `<path d="${path(points)}" fill="${hole.id === 'thumb' ? '#fff0de' : '#e6edf9'}" stroke="${hole.id === 'thumb' ? '#bf7b34' : '#648ac2'}" stroke-width="1.5"/>`;
            const p = project(hole.center);
            const x =
                hole.id === 'middle'
                    ? p[0] - mirror * 36
                    : hole.id === 'ring'
                      ? p[0] + mirror * 36
                      : p[0];
            svg += label(
                x,
                p[1] + (hole.id === 'thumb' ? 43 : -30),
                text('finger_' + hole.id),
            );
            svg += label(
                x,
                p[1] + (hole.id === 'thumb' ? 59 : -15),
                'Ø ' + format(hole.radius * 2),
                '#49678d',
                11,
            );
        }
        const [middle, ring, thumb] = resolved.holes;
        const bridge = project(scale(resolved.bridgeCenter, R));
        svg += `<path d="M${bridge[0]} ${bridge[1]} V${bridge[1] - 57}" stroke="#9bb4d8" stroke-dasharray="3 3"/>`;
        svg += label(
            bridge[0],
            bridge[1] - 67,
            text('drill_bridge') + ' ' + format(resolved.chart.bridge),
            '#1967d2',
            12,
        );
        if (thumb) {
            for (const [finger, id, side] of [
                [middle, 'middle', -1],
                [ring, 'ring', 1],
            ]) {
                const edge = (from, to) => {
                    const radians =
                        edgeDistance(
                            from.normal,
                            from.axis,
                            from.radius,
                            to.normal,
                        ) / R;
                    const tangent = unit(
                        add(
                            to.normal,
                            scale(from.normal, -dot(from.normal, to.normal)),
                        ),
                    );
                    return scale(
                        add(
                            scale(from.normal, Math.cos(radians)),
                            scale(tangent, Math.sin(radians)),
                        ),
                        R,
                    );
                };
                const a = project(edge(finger, thumb)),
                    b = project(edge(thumb, finger));
                const x = 210 + side * mirror * 126;
                svg += `<path d="M${a[0]} ${a[1]}H${x}M${b[0]} ${b[1]}H${x}" stroke="#c5d4e9" fill="none"/><path d="M${x} ${a[1]}V${b[1]}" stroke="#7b9bcc" marker-start="url(#dim-arrow)" marker-end="url(#dim-arrow)"/>`;
                svg += label(
                    x,
                    (a[1] + b[1]) / 2 - 8,
                    format(resolved.chart[id + 'Span']),
                    '#1967d2',
                    14,
                );
                svg += label(
                    x,
                    (a[1] + b[1]) / 2 + 11,
                    text(id + '_span'),
                    '#68717d',
                    10,
                );
            }
        }
        svg +=
            '<path d="M204 215h12M210 209v12" stroke="#cf68a0" stroke-width="1.6"/>';
        svg += label(239, 232, 'COG', '#b05a89', 11);
        svg += label(
            210,
            419,
            text(
                state.common.hand === 'left'
                    ? 'opt_left_hand'
                    : 'opt_right_hand',
            ) +
                ' · ' +
                text(
                    resolved.grip === '3finger'
                        ? 'opt_3finger'
                        : 'opt_thumbless',
                ),
        );
        holder.innerHTML = svg + '</svg>';
    }

    function refresh() {
        const fields = [...document.querySelectorAll('[data-drill]')];
        if (!fields.length) return;
        const values = {},
            raw = {};
        fields.forEach((input) => {
            const key = input.dataset.drill;
            raw[key] = input.value;
            if (input.value.trim())
                values[key] = parseFraction(input.value, 'dist');
            input.dataset.default = input.value.trim() ? 'false' : 'true';
        });
        current = window.DrillingMath.resolve(values, state.common.grip);
        document
            .getElementById('drilling')
            .classList.toggle(
                'is-thumbless',
                state.common.grip === 'thumbless',
            );
        const defaults = document.querySelector(
            '[data-i18n="drill_defaults"], [data-i18n="drill_defaults_thumbless"]',
        );
        if (defaults) {
            const key =
                state.common.grip === 'thumbless'
                    ? 'drill_defaults_thumbless'
                    : 'drill_defaults';
            defaults.setAttribute('data-i18n', key);
            defaults.textContent = text(key);
        }
        fields.forEach((input) => {
            const irrelevant =
                state.common.grip === 'thumbless' &&
                /Span|thumb/.test(input.dataset.drill);
            input.disabled = irrelevant;
            input.setAttribute(
                'aria-invalid',
                String(
                    !irrelevant &&
                        (current.invalid || []).includes(input.dataset.drill),
                ),
            );
        });
        const warning = document.getElementById('drilling-warning');
        const deep =
            current.valid &&
            state.common.grip === 'thumbless' &&
            (current.chart.middleDepth > 2.75 ||
                current.chart.ringDepth > 2.75);
        warning.hidden = current.valid && !deep;
        warning.textContent = text(
            !current.valid
                ? current.reason === 'span_geometry'
                    ? 'drill_span_invalid'
                    : 'drill_invalid'
                : 'drill_depth_note',
        );
        document.getElementById('print-drilling').disabled = !current.valid;
        document.getElementById('drilling-status').textContent = current.valid
            ? text('drill_applied')
            : '';
        renderDiagram(current);
        if (visualizer) {
            visualizer.setDrillingChart(current);
            if (current.valid && state.previewData)
                visualizer.updateLayout(state.previewData);
            else if (current.valid && isViewActive('drilling'))
                visualizer.showGripOnly();
            else if (current.valid) visualizer.clearLayout();
        }
        try {
            localStorage.setItem(storageKey, JSON.stringify(raw));
        } catch {
            /* Private browsing can disable persistence. */
        }
    }
    window.refreshDrillingChart = refresh;
    document.addEventListener('DOMContentLoaded', () => {
        let saved = {};
        try {
            saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {};
        } catch {
            /* Use defaults. */
        }
        document.querySelectorAll('[data-drill]').forEach((input) => {
            const key = input.dataset.drill;
            input.placeholder = formatInputValueForUnit(
                window.DrillingMath.DEFAULTS[key],
                'dist',
            );
            input.value = typeof saved[key] === 'string' ? saved[key] : '';
            input.addEventListener('input', refresh);
        });
        document
            .getElementById('reset-drilling')
            .addEventListener('click', () => {
                document
                    .querySelectorAll('[data-drill]')
                    .forEach((input) => (input.value = ''));
                refresh();
            });
        document
            .getElementById('print-drilling')
            .addEventListener('click', () => {
                if (current?.valid) window.print();
            });
        let printBlanks = [];
        window.addEventListener('beforeprint', () => {
            printBlanks = [...document.querySelectorAll('[data-drill]')].filter(
                (input) => !input.value.trim(),
            );
            printBlanks.forEach((input) => (input.value = input.placeholder));
        });
        window.addEventListener('afterprint', () => {
            printBlanks.forEach((input) => (input.value = ''));
            printBlanks = [];
        });
        document.addEventListener('layoutadapter:languagechange', refresh);
        refresh();
    });
})();
