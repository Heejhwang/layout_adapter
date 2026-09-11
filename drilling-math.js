/** Inch-based grip geometry shared by the chart and the drilled 3D surface. */
(function attachDrillingMath(global) {
    'use strict';
    const R = global.LayoutMath.R;
    const DEFAULTS = Object.freeze({
        middleSpan: 4,
        ringSpan: 4.125,
        bridge: 0.25,
        middleDiameter: 0.875,
        ringDiameter: 0.875,
        thumbDiameter: 1,
        middleDepth: 2.5,
        ringDepth: 2.5,
        thumbDepth: 2.75,
        middleLateral: -0.375,
        ringLateral: 0.375,
        thumbLateral: 0,
        middleForward: -0.25,
        ringForward: -0.25,
        thumbForward: 0,
    });
    const LIMITS = Object.freeze({
        middleSpan: [1, 6],
        ringSpan: [1, 6],
        bridge: [0.125, 0.75],
        middleDiameter: [0.25, 1.5625],
        ringDiameter: [0.25, 1.5625],
        thumbDiameter: [0.25, 1.5625],
        middleDepth: [0.5, 4.5],
        ringDepth: [0.5, 4.5],
        thumbDepth: [0.5, 4.5],
        middleLateral: [-1, 1],
        ringLateral: [-1, 1],
        thumbLateral: [-1, 1],
        middleForward: [-1, 1],
        ringForward: [-1, 1],
        thumbForward: [-1, 1],
    });
    const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
    const scale = (v, s) => v.map((x) => x * s);
    const add = (a, b) => a.map((v, i) => v + b[i]);
    const unit = (v) => scale(v, 1 / Math.hypot(...v));
    const cross = (a, b) => [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
    const distance = (a, b) =>
        R * Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b)))));
    const arcRadius = (diameter) => R * Math.asin(diameter / (2 * R));
    function along(a, b, inches) {
        const angle = distance(a, b) / R;
        const t = inches / R;
        return unit(add(scale(a, Math.sin(angle - t)), scale(b, Math.sin(t))));
    }
    function axisFor(n, lateral, forward) {
        const east = unit([n[2], 0, -n[0]]);
        const north = unit(cross(n, east));
        return unit(
            add(
                scale(n, -1),
                add(scale(east, lateral / R), scale(north, forward / R)),
            ),
        );
    }
    // Surface distance from the drill-axis entry to the actual cylindrical opening edge.
    function edgeDistance(n, axis, radius, toward) {
        const tangent = unit(add(toward, scale(n, -dot(n, toward))));
        let low = 0,
            high = 0.7;
        for (let i = 0; i < 42; i++) {
            const angle = (low + high) / 2;
            const q = scale(
                add(
                    scale(n, Math.cos(angle) - 1),
                    scale(tangent, Math.sin(angle)),
                ),
                R,
            );
            const perpendicular2 = dot(q, q) - dot(q, axis) ** 2;
            if (perpendicular2 < radius * radius) low = angle;
            else high = angle;
        }
        return (R * (low + high)) / 2;
    }
    function resolve(values = {}, grip = '3finger') {
        const chart = { ...DEFAULTS, ...values };
        const keys = Object.keys(LIMITS).filter(
            (key) => grip === '3finger' || !/Span|thumb/.test(key),
        );
        const invalid = keys.filter(
            (key) =>
                !Number.isFinite(chart[key]) ||
                chart[key] < LIMITS[key][0] ||
                chart[key] > LIMITS[key][1],
        );
        if (invalid.length)
            return { valid: false, reason: 'dimensions', invalid };
        const rm = arcRadius(chart.middleDiameter),
            rr = arcRadius(chart.ringDiameter),
            rt = arcRadius(chart.thumbDiameter);
        const fingerAngle = (id, side) => {
            let lo = chart.bridge / 2 / R,
                hi = 0.7;
            for (let i = 0; i < 38; i++) {
                const a = (lo + hi) / 2,
                    n = [side * Math.sin(a), 0, Math.cos(a)];
                const axis = axisFor(
                    n,
                    chart[`${id}Lateral`],
                    chart[`${id}Forward`],
                );
                const gap =
                    a * R -
                    edgeDistance(
                        n,
                        axis,
                        chart[`${id}Diameter`] / 2,
                        [0, 0, 1],
                    );
                if (gap < chart.bridge / 2) lo = a;
                else hi = a;
            }
            return (lo + hi) / 2;
        };
        const am = fingerAngle('middle', -1),
            ar = fingerAngle('ring', 1);
        let middle = [-Math.sin(am), 0, Math.cos(am)];
        let ring = [Math.sin(ar), 0, Math.cos(ar)];
        let thumb;
        let cog = [0, 0, 1];
        if (grip === '3finger') {
            // Intersection of two surface-distance circles gives the thumb center.
            const cm = Math.cos((chart.middleSpan + rm + rt) / R);
            const cr = Math.cos((chart.ringSpan + rr + rt) / R);
            const determinant = middle[0] * ring[2] - ring[0] * middle[2];
            const tx = (cm * ring[2] - cr * middle[2]) / determinant;
            const tz = (middle[0] * cr - ring[0] * cm) / determinant;
            const ty2 = 1 - tx * tx - tz * tz;
            if (ty2 <= 1e-10)
                return {
                    valid: false,
                    reason: 'span_geometry',
                    invalid: ['middleSpan', 'ringSpan'],
                };
            thumb = [tx, -Math.sqrt(ty2), tz];
            // Refine both spans against the true pitched openings, not flat diameter offsets.
            let lat = Math.asin(thumb[1]),
                lon = Math.atan2(thumb[0], thumb[2]);
            const at = (la, lo) => [
                Math.cos(la) * Math.sin(lo),
                Math.sin(la),
                Math.cos(la) * Math.cos(lo),
            ];
            const span = (finger, id, tn) =>
                distance(finger, tn) -
                edgeDistance(
                    finger,
                    axisFor(
                        finger,
                        chart[`${id}Lateral`],
                        chart[`${id}Forward`],
                    ),
                    chart[`${id}Diameter`] / 2,
                    tn,
                ) -
                edgeDistance(
                    tn,
                    axisFor(tn, chart.thumbLateral, chart.thumbForward),
                    chart.thumbDiameter / 2,
                    finger,
                );
            for (let i = 0; i < 14; i++) {
                thumb = at(lat, lon);
                const a = span(middle, 'middle', thumb) - chart.middleSpan,
                    b = span(ring, 'ring', thumb) - chart.ringSpan;
                if (Math.max(Math.abs(a), Math.abs(b)) < 1e-9) break;
                const h = 1e-5,
                    nl = at(lat + h, lon),
                    no = at(lat, lon + h);
                const al =
                    (span(middle, 'middle', nl) - chart.middleSpan - a) / h;
                const bl = (span(ring, 'ring', nl) - chart.ringSpan - b) / h;
                const ao =
                    (span(middle, 'middle', no) - chart.middleSpan - a) / h;
                const bo = (span(ring, 'ring', no) - chart.ringSpan - b) / h;
                const det = al * bo - ao * bl;
                if (Math.abs(det) < 1e-8)
                    return {
                        valid: false,
                        reason: 'span_geometry',
                        invalid: ['middleSpan', 'ringSpan'],
                    };
                lat -= Math.max(-0.1, Math.min(0.1, (a * bo - b * ao) / det));
                lon -= Math.max(-0.1, Math.min(0.1, (al * b - bl * a) / det));
            }
            thumb = at(lat, lon);
            if (
                thumb[1] >= 0 ||
                Math.abs(span(middle, 'middle', thumb) - chart.middleSpan) >
                    1e-6 ||
                Math.abs(span(ring, 'ring', thumb) - chart.ringSpan) > 1e-6
            )
                return {
                    valid: false,
                    reason: 'span_geometry',
                    invalid: ['middleSpan', 'ringSpan'],
                };
            // Average the two front-edge span midpoints, following the grip-center convention.
            const midpointM = along(
                middle,
                thumb,
                edgeDistance(
                    middle,
                    axisFor(middle, chart.middleLateral, chart.middleForward),
                    chart.middleDiameter / 2,
                    thumb,
                ) +
                    chart.middleSpan / 2,
            );
            const midpointR = along(
                ring,
                thumb,
                edgeDistance(
                    ring,
                    axisFor(ring, chart.ringLateral, chart.ringForward),
                    chart.ringDiameter / 2,
                    thumb,
                ) +
                    chart.ringSpan / 2,
            );
            cog = unit(add(midpointM, midpointR));
        }
        const east = unit(add([1, 0, 0], scale(cog, -cog[0])));
        const north = unit(cross(cog, east));
        const orient = (point) => [
            dot(point, east),
            dot(point, north),
            dot(point, cog),
        ];
        const make = (id, point) => ({
            id,
            normal: orient(point),
            center: scale(orient(point), R),
            axis: orient(
                axisFor(point, chart[`${id}Lateral`], chart[`${id}Forward`]),
            ),
            radius: chart[`${id}Diameter`] / 2,
            depth: chart[`${id}Depth`],
        });
        const holes = [make('middle', middle), make('ring', ring)];
        if (thumb) holes.push(make('thumb', thumb));
        return {
            valid: true,
            chart,
            holes,
            radius: R,
            bridgeCenter: orient([0, 0, 1]),
            usedDefaults: Object.keys(DEFAULTS).filter(
                (key) => values[key] === undefined,
            ),
            grip,
        };
    }
    global.DrillingMath = {
        R,
        DEFAULTS,
        LIMITS,
        resolve,
        distance,
        arcRadius,
        edgeDistance,
    };
})(typeof window !== 'undefined' ? window : globalThis);
