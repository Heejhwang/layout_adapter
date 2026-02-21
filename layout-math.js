/**
 * Shared bowling layout math utilities and conversion functions.
 */
(function attachLayoutMath(global) {
    'use strict';

    const R = 13.5 / Math.PI; // Sphere radius in inches for 13.5" circumference
    const MAX_SURFACE_DISTANCE = 6.75;

    const rad = (deg) => deg * (Math.PI / 180);
    const deg = (rad) => rad * (180 / Math.PI);
    const radFromInch = (inch) => (inch * Math.PI) / 13.5;
    const inchFromRad = (rad) => (rad * 13.5) / Math.PI;

    const sin = (x) => Math.sin(x);
    const cos = (x) => Math.cos(x);
    const acos = (x) => Math.acos(x);
    const asin = (x) => Math.asin(x);
    const atan2 = (y, x) => Math.atan2(y, x);
    const sqrt = (x) => Math.sqrt(x);
    const abs = (x) => Math.abs(x);
    const min = (a, b) => Math.min(a, b);
    const max = (a, b) => Math.max(a, b);

    const clamp = (value, low, high) => max(low, min(high, value));
    const clampUnit = (value) => clamp(value, -1, 1);

    function vlsToDa(pin_to_pap, psa_to_pap, pin_buffer) {
        const alpha_pin = radFromInch(pin_to_pap);
        const alpha_psa = radFromInch(psa_to_pap);

        const cos_val = clampUnit(cos(alpha_psa) / sin(alpha_pin));
        const da_drill = deg(acos(cos_val));

        const alpha_buf = radFromInch(pin_buffer);
        const sin_val = clampUnit(sin(alpha_buf) / sin(alpha_pin));
        const da_val = deg(asin(sin_val));

        return { val1: da_drill, val2: pin_to_pap, val3: da_val };
    }

    function vlsTo2ls(pin_to_pap, psa_to_pap, pin_buffer, pap_right, pap_up) {
        const alpha_pin = radFromInch(pin_to_pap);
        const alpha_buf = radFromInch(pin_buffer);

        const sin_val = clampUnit(sin(alpha_buf) / sin(alpha_pin));
        const val_angle_deg = deg(asin(sin_val));

        const lambda = radFromInch(pap_right);
        const phi = radFromInch(pap_up);
        const pap_cog_angle = acos(clampUnit(cos(lambda) * cos(phi)));

        const term1 = cos(alpha_pin) * cos(pap_cog_angle);
        const term2 = sin(alpha_pin) * sin(pap_cog_angle) * sin(rad(val_angle_deg));

        const cos_pincog = clampUnit(term1 + term2);
        const pin_to_cog = R * acos(cos_pincog);

        return { val1: pin_to_pap, val2: psa_to_pap, val3: pin_to_cog };
    }

    function daToVls(drilling_angle, pin_to_pap, val_angle) {
        const alpha_pin = radFromInch(pin_to_pap);
        const val_rad = rad(val_angle);
        const drill_rad = rad(drilling_angle);

        const cos_psa = clampUnit(sin(alpha_pin) * cos(drill_rad));
        const psa_to_pap = R * acos(cos_psa);

        const sin_buf = clampUnit(sin(alpha_pin) * sin(val_rad));
        const pin_buffer = R * asin(sin_buf);

        return { val1: pin_to_pap, val2: psa_to_pap, val3: pin_buffer };
    }

    function daTo2ls(drilling_angle, pin_to_pap, val_angle, pap_right, pap_up) {
        const alpha_pin = radFromInch(pin_to_pap);
        const drill_rad = rad(drilling_angle);
        const cos_psa = clampUnit(sin(alpha_pin) * cos(drill_rad));
        const psa_to_pap = R * acos(cos_psa);

        const lambda = radFromInch(pap_right);
        const phi = radFromInch(pap_up);
        const pap_cog_angle = acos(clampUnit(cos(lambda) * cos(phi)));
        const val_rad = rad(val_angle);

        const term1 = cos(alpha_pin) * cos(pap_cog_angle);
        const term2 = sin(alpha_pin) * sin(pap_cog_angle) * sin(val_rad);

        const cos_pincog = clampUnit(term1 + term2);
        const pin_to_cog = R * acos(cos_pincog);

        return { val1: pin_to_pap, val2: psa_to_pap, val3: pin_to_cog };
    }

    function twoLsToDa(pin_to_pap, psa_to_pap, pin_to_cog, pap_right, pap_up) {
        const alpha_pin = radFromInch(pin_to_pap);
        const alpha_psa = radFromInch(psa_to_pap);

        const cos_da = clampUnit(cos(alpha_psa) / sin(alpha_pin));
        const drilling_angle = deg(acos(cos_da));

        const alpha_pcog = radFromInch(pin_to_cog);
        const lambda = radFromInch(pap_right);
        const phi = radFromInch(pap_up);

        const term_cl_cp = cos(lambda) * cos(phi);
        const numer = cos(alpha_pcog) - cos(alpha_pin) * term_cl_cp;
        const denomBase = max(0, 1 - (term_cl_cp * term_cl_cp));
        const denom = sin(alpha_pin) * sqrt(denomBase);

        const sin_val = clampUnit(denom !== 0 ? numer / denom : 0);
        const val_angle = deg(asin(sin_val));

        return { val1: drilling_angle, val2: pin_to_pap, val3: val_angle };
    }

    function twoLsToVls(pin_to_pap, psa_to_pap, pin_to_cog, pap_right, pap_up) {
        const { val3: val_angle } = twoLsToDa(pin_to_pap, psa_to_pap, pin_to_cog, pap_right, pap_up);

        const alpha_pin = radFromInch(pin_to_pap);
        const sin_buf = clampUnit(sin(alpha_pin) * sin(rad(val_angle)));
        const pin_buffer = R * asin(sin_buf);

        return { val1: pin_to_pap, val2: psa_to_pap, val3: pin_buffer };
    }

    function calculatePapAdjustment(papOld, daOld, papNew) {
        const lat_o = radFromInch(papOld.up);
        const lon_o = radFromInch(papOld.over);

        const sigmaA = radFromInch(daOld.pin);
        const theta = -rad(daOld.val);

        const sin_lat_pin = clampUnit(
            sin(lat_o) * cos(sigmaA) + cos(lat_o) * sin(sigmaA) * cos(theta)
        );
        const lat_pin = asin(sin_lat_pin);

        const x_pin = cos(sigmaA) - sin(lat_o) * sin(lat_pin);
        const y_pin = sin(theta) * sin(sigmaA) * cos(lat_o);
        const lon_pin = lon_o + atan2(y_pin, x_pin);

        const lat_n = radFromInch(papNew.up);
        const lon_n = radFromInch(papNew.over);

        const term1 = sin((lat_pin - lat_n) / 2) ** 2;
        const term2 = cos(lat_n) * cos(lat_pin) * (sin((lon_pin - lon_n) / 2) ** 2);
        const sigma = 2 * asin(sqrt(term1 + term2));

        const pin_to_pap_new = inchFromRad(sigma);

        const x_bear = cos(lat_n) * sin(lat_pin) - sin(lat_n) * cos(lat_pin) * cos(lon_pin - lon_n);
        const y_bear = sin(lon_pin - lon_n) * cos(lat_pin);
        const bearing = atan2(y_bear, x_bear);

        const val_new_deg = deg(min(abs(bearing), abs(Math.PI - abs(bearing))));

        const x_bold = cos(lat_pin) * sin(lat_o) - sin(lat_pin) * cos(lat_o) * cos(lon_o - lon_pin);
        const y_bold = sin(lon_o - lon_pin) * cos(lat_o);
        const b_old = atan2(y_bold, x_bold);

        const b_psa = b_old + rad(daOld.drill);

        const s_psa = radFromInch(MAX_SURFACE_DISTANCE);

        const sin_lat_psa = clampUnit(
            sin(lat_pin) * cos(s_psa) + cos(lat_pin) * sin(s_psa) * cos(b_psa)
        );
        const lat_psa = asin(sin_lat_psa);

        const x_lpsa = cos(s_psa) - sin(lat_pin) * sin(lat_psa);
        const y_lpsa = sin(b_psa) * sin(s_psa) * cos(lat_pin);
        const lon_psa = lon_pin + atan2(y_lpsa, x_lpsa);

        const x_bnew = cos(lat_pin) * sin(lat_n) - sin(lat_pin) * cos(lat_n) * cos(lon_n - lon_pin);
        const y_bnew = sin(lon_n - lon_pin) * cos(lat_n);
        const b_new = atan2(y_bnew, x_bnew);

        const x_bpp = cos(lat_pin) * sin(lat_psa) - sin(lat_pin) * cos(lat_psa) * cos(lon_psa - lon_pin);
        const y_bpp = sin(lon_psa - lon_pin) * cos(lat_psa);
        const b_pin_psa = atan2(y_bpp, x_bpp);

        const signedDiff = (((b_pin_psa - b_new + Math.PI) % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI) - Math.PI;
        const drilling_signed_deg = deg(signedDiff);
        const drilling_new_deg = abs(drilling_signed_deg);

        return {
            drill: drilling_new_deg,
            drillSigned: drilling_signed_deg,
            pin: pin_to_pap_new,
            val: val_new_deg
        };
    }

    global.LayoutMath = {
        R,
        MAX_SURFACE_DISTANCE,
        clamp,
        rad,
        deg,
        radFromInch,
        inchFromRad,
        sin,
        cos,
        acos,
        asin,
        atan2,
        sqrt,
        abs,
        min,
        vlsToDa,
        vlsTo2ls,
        daToVls,
        daTo2ls,
        twoLsToDa,
        twoLsToVls,
        calculatePapAdjustment
    };

    // Backward-compatible subset used by visualizer rendering geometry.
    global.BowlingUtils = {
        R,
        rad,
        deg,
        radFromInch,
        inchFromRad,
        sin,
        cos,
        acos,
        asin,
        atan2,
        sqrt
    };
})(window);
