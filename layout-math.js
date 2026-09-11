/**
 * Shared bowling layout math utilities and conversion functions.
 */
(function attachLayoutMath(global) {
    'use strict';

    // A bowling ball is approximately 27" around; 13.5" is its half-circumference.
    const R = 13.5 / Math.PI;
    // The standard Pin-to-PSA separation is 90 degrees on the ball surface.
    const MAX_SURFACE_DISTANCE = 6.75;
    const DOMAIN_TOLERANCE = 1e-12;
    const ANGLE_TOLERANCE = 1e-10;
    const DISTANCE_TOLERANCE = 1e-10;

    const rad = (deg) => deg * (Math.PI / 180);
    const deg = (rad) => rad * (180 / Math.PI);
    const radFromInch = (inch) => inch / R;
    const inchFromRad = (rad) => rad * R;

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
    const allFinite = (...values) => values.every(Number.isFinite);

    function clampWithinTolerance(value, low, high) {
        if (
            !Number.isFinite(value) ||
            value < low - DOMAIN_TOLERANCE ||
            value > high + DOMAIN_TOLERANCE
        ) {
            return NaN;
        }
        if (abs(value - low) <= DOMAIN_TOLERANCE) return low;
        if (abs(value - high) <= DOMAIN_TOLERANCE) return high;
        return clamp(value, low, high);
    }

    const clampUnit = (value) => clampWithinTolerance(value, -1, 1);

    function safeAsin(value) {
        const clamped = clampUnit(value);
        return Number.isNaN(clamped) ? NaN : asin(clamped);
    }

    function safeAcos(value) {
        const clamped = clampUnit(value);
        return Number.isNaN(clamped) ? NaN : acos(clamped);
    }

    function normalizeSignedRadians(value) {
        if (!Number.isFinite(value)) return NaN;
        const normalized =
            ((((value + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) %
                (2 * Math.PI)) -
            Math.PI;
        return abs(normalized) < ANGLE_TOLERANCE ? 0 : normalized;
    }

    function standardDistance(value, allowZero = true) {
        if (
            !Number.isFinite(value) ||
            value < -DISTANCE_TOLERANCE ||
            value > MAX_SURFACE_DISTANCE + DISTANCE_TOLERANCE
        ) {
            return NaN;
        }
        const normalized = clamp(value, 0, MAX_SURFACE_DISTANCE);
        if (!allowZero && normalized <= DISTANCE_TOLERANCE) return NaN;
        return normalized;
    }

    function standardAngle(value) {
        if (
            !Number.isFinite(value) ||
            value < -ANGLE_TOLERANCE ||
            value > 90 + ANGLE_TOLERANCE
        ) {
            return NaN;
        }
        return clamp(value, 0, 90);
    }

    function invalidConversion(reason, extra = {}) {
        return {
            val1: NaN,
            val2: NaN,
            val3: NaN,
            valid: false,
            reason,
            ...extra,
        };
    }

    function validConversion(val1, val2, val3, extra = {}) {
        return { val1, val2, val3, valid: true, ...extra };
    }

    function drillingFromPinAndPsa(pinToPap, psaToPap) {
        const pin = standardDistance(pinToPap, false);
        const psa = standardDistance(psaToPap);
        if (!allFinite(pin, psa)) return NaN;

        const ratio = clampUnit(cos(radFromInch(psa)) / sin(radFromInch(pin)));
        return Number.isNaN(ratio) ? NaN : deg(acos(ratio));
    }

    function psaFromDrilling(pinToPap, drillingAngle) {
        const pin = standardDistance(pinToPap, false);
        const drill = standardAngle(drillingAngle);
        if (!allFinite(pin, drill)) return NaN;

        const alphaPsa = safeAcos(sin(radFromInch(pin)) * cos(rad(drill)));
        return Number.isNaN(alphaPsa) ? NaN : inchFromRad(alphaPsa);
    }

    function valFromPinAndBuffer(pinToPap, pinBuffer) {
        const pin = standardDistance(pinToPap, false);
        const buffer = standardDistance(pinBuffer);
        if (!allFinite(pin, buffer)) return NaN;

        const ratio = clampUnit(
            sin(radFromInch(buffer)) / sin(radFromInch(pin)),
        );
        return Number.isNaN(ratio) ? NaN : deg(asin(ratio));
    }

    function bufferFromPinAndVal(pinToPap, valAngle) {
        const pin = standardDistance(pinToPap, false);
        const val = standardAngle(valAngle);
        if (!allFinite(pin, val)) return NaN;

        const alphaBuffer = safeAsin(sin(radFromInch(pin)) * sin(rad(val)));
        return Number.isNaN(alphaBuffer) ? NaN : inchFromRad(alphaBuffer);
    }

    /**
     * Returns the geodesic Pin-to-COG distance using the same coordinate convention
     * as the visualizer and PAP adjuster: PAP longitude is "over", latitude is "up",
     * and a positive VAL is a negative geographic bearing from local north.
     */
    function pinToCogDistance(pinToPap, valAngle, papRight, papUp) {
        const pin = standardDistance(pinToPap, false);
        const val = standardAngle(valAngle);
        if (!allFinite(pin, val, papRight, papUp)) return NaN;

        const alpha = radFromInch(pin);
        const lambda = radFromInch(papRight);
        const phi = radFromInch(papUp);
        const valRad = rad(val);

        // P = N*cos(alpha) + D*sin(alpha), with D bearing -VAL.
        // Dot P with the grip-center vector G=(0, 0, 1).
        const cosPinCog =
            cos(alpha) * cos(phi) * cos(lambda) +
            sin(alpha) *
                (-sin(phi) * cos(lambda) * cos(valRad) +
                    sin(lambda) * sin(valRad));
        const alphaPinCog = safeAcos(cosPinCog);
        return Number.isNaN(alphaPinCog) ? NaN : inchFromRad(alphaPinCog);
    }

    function vlsToDa(pin_to_pap, psa_to_pap, pin_buffer) {
        if (!allFinite(pin_to_pap, psa_to_pap, pin_buffer)) {
            return invalidConversion('non_finite_input');
        }

        const drillingAngle = drillingFromPinAndPsa(pin_to_pap, psa_to_pap);
        const valAngle = valFromPinAndBuffer(pin_to_pap, pin_buffer);
        if (!allFinite(drillingAngle, valAngle)) {
            return invalidConversion('invalid_or_singular_vls_geometry');
        }

        return validConversion(drillingAngle, pin_to_pap, valAngle);
    }

    function vlsTo2ls(pin_to_pap, psa_to_pap, pin_buffer, pap_right, pap_up) {
        if (!allFinite(pap_right, pap_up))
            return invalidConversion('non_finite_input');

        const dualAngle = vlsToDa(pin_to_pap, psa_to_pap, pin_buffer);
        if (!dualAngle.valid) return invalidConversion(dualAngle.reason);

        const pinToCog = pinToCogDistance(
            pin_to_pap,
            dualAngle.val3,
            pap_right,
            pap_up,
        );
        if (!Number.isFinite(pinToCog))
            return invalidConversion('invalid_pin_to_cog_geometry');

        return validConversion(pin_to_pap, psa_to_pap, pinToCog);
    }

    function daToVls(drilling_angle, pin_to_pap, val_angle) {
        if (!allFinite(drilling_angle, pin_to_pap, val_angle)) {
            return invalidConversion('non_finite_input');
        }

        const psaToPap = psaFromDrilling(pin_to_pap, drilling_angle);
        const pinBuffer = bufferFromPinAndVal(pin_to_pap, val_angle);
        if (!allFinite(psaToPap, pinBuffer)) {
            return invalidConversion('invalid_or_singular_dual_angle_geometry');
        }

        return validConversion(pin_to_pap, psaToPap, pinBuffer);
    }

    function daTo2ls(drilling_angle, pin_to_pap, val_angle, pap_right, pap_up) {
        if (
            !allFinite(drilling_angle, pin_to_pap, val_angle, pap_right, pap_up)
        ) {
            return invalidConversion('non_finite_input');
        }

        const psaToPap = psaFromDrilling(pin_to_pap, drilling_angle);
        const pinToCog = pinToCogDistance(
            pin_to_pap,
            val_angle,
            pap_right,
            pap_up,
        );
        if (!allFinite(psaToPap, pinToCog)) {
            return invalidConversion('invalid_or_singular_dual_angle_geometry');
        }

        return validConversion(pin_to_pap, psaToPap, pinToCog);
    }

    function solveStandardVal(pinToPap, pinToCog, papRight, papUp) {
        const pin = standardDistance(pinToPap, false);
        const pinCog = standardDistance(pinToCog);
        if (!allFinite(pin, pinCog, papRight, papUp)) {
            return {
                valid: false,
                reason: 'non_finite_or_out_of_range_input',
                candidates: [],
            };
        }

        const alpha = radFromInch(pin);
        const alphaPinCog = radFromInch(pinCog);
        const lambda = radFromInch(papRight);
        const phi = radFromInch(papUp);
        const sinAlpha = sin(alpha);

        // A*cos(VAL) + B*sin(VAL) = rhs, derived from the direct vector equation.
        const A = -sin(phi) * cos(lambda);
        const B = sin(lambda);
        const rho = Math.hypot(A, B);
        if (rho <= DOMAIN_TOLERANCE || abs(sinAlpha) <= DOMAIN_TOLERANCE) {
            return {
                valid: false,
                reason: 'singular_val_reference',
                candidates: [],
            };
        }

        const rhs =
            (cos(alphaPinCog) - cos(alpha) * cos(phi) * cos(lambda)) / sinAlpha;
        const ratio = clampUnit(rhs / rho);
        if (Number.isNaN(ratio)) {
            return {
                valid: false,
                reason: 'impossible_pin_to_cog_geometry',
                candidates: [],
            };
        }

        const gamma = atan2(B, A);
        const omega = acos(ratio);
        const candidates = [];

        for (const sign of [-1, 1]) {
            for (let turn = -1; turn <= 1; turn++) {
                const candidate = gamma + sign * omega + turn * 2 * Math.PI;
                if (
                    candidate < -ANGLE_TOLERANCE ||
                    candidate > Math.PI / 2 + ANGLE_TOLERANCE
                )
                    continue;

                const normalized = clamp(candidate, 0, Math.PI / 2);
                const residual = abs(
                    A * cos(normalized) + B * sin(normalized) - rhs,
                );
                if (residual > 1e-10) continue;
                if (
                    !candidates.some(
                        (existing) =>
                            abs(existing - normalized) <= ANGLE_TOLERANCE,
                    )
                ) {
                    candidates.push(normalized);
                }
            }
        }

        if (candidates.length === 0) {
            return {
                valid: false,
                reason: 'no_standard_val_solution',
                candidates: [],
            };
        }
        if (candidates.length > 1) {
            return {
                valid: false,
                reason: 'ambiguous_standard_val_solution',
                candidates: candidates.map(deg).sort((a, b) => a - b),
            };
        }

        return {
            valid: true,
            value: deg(candidates[0]),
            candidates: [deg(candidates[0])],
        };
    }

    function twoLsToDa(pin_to_pap, psa_to_pap, pin_to_cog, pap_right, pap_up) {
        if (!allFinite(pin_to_pap, psa_to_pap, pin_to_cog, pap_right, pap_up)) {
            return invalidConversion('non_finite_input');
        }

        const drillingAngle = drillingFromPinAndPsa(pin_to_pap, psa_to_pap);
        if (!Number.isFinite(drillingAngle)) {
            return invalidConversion('invalid_or_singular_psa_geometry');
        }

        const valSolution = solveStandardVal(
            pin_to_pap,
            pin_to_cog,
            pap_right,
            pap_up,
        );
        if (!valSolution.valid) {
            return invalidConversion(valSolution.reason, {
                valCandidates: valSolution.candidates,
            });
        }

        return validConversion(drillingAngle, pin_to_pap, valSolution.value, {
            valCandidates: valSolution.candidates,
        });
    }

    function twoLsToVls(pin_to_pap, psa_to_pap, pin_to_cog, pap_right, pap_up) {
        const dualAngle = twoLsToDa(
            pin_to_pap,
            psa_to_pap,
            pin_to_cog,
            pap_right,
            pap_up,
        );
        if (!dualAngle.valid) {
            return invalidConversion(dualAngle.reason, {
                valCandidates: dualAngle.valCandidates || [],
            });
        }

        const pinBuffer = bufferFromPinAndVal(pin_to_pap, dualAngle.val3);
        if (!Number.isFinite(pinBuffer))
            return invalidConversion('invalid_pin_buffer_geometry');

        return validConversion(pin_to_pap, psa_to_pap, pinBuffer);
    }

    function invalidAdjustment(reason, pin = NaN) {
        return {
            drill: NaN,
            drillSigned: NaN,
            pin,
            val: NaN,
            valSigned: NaN,
            valMagnitude: NaN,
            orientationConventional: false,
            valid: false,
            reason,
        };
    }

    function calculatePapAdjustment(papOld, daOld, papNew) {
        if (
            !papOld ||
            !daOld ||
            !papNew ||
            !allFinite(
                papOld.up,
                papOld.over,
                daOld.pin,
                daOld.val,
                daOld.drill,
                papNew.up,
                papNew.over,
            )
        ) {
            return invalidAdjustment('non_finite_input');
        }

        const oldPinDistance = standardDistance(daOld.pin, false);
        if (!Number.isFinite(oldPinDistance))
            return invalidAdjustment('singular_or_out_of_range_pin_distance');

        const lat_o = radFromInch(papOld.up);
        const lon_o = radFromInch(papOld.over);
        const sigmaA = radFromInch(oldPinDistance);
        const theta = -rad(daOld.val);

        const latPinInput =
            sin(lat_o) * cos(sigmaA) + cos(lat_o) * sin(sigmaA) * cos(theta);
        const lat_pin = safeAsin(latPinInput);
        if (!Number.isFinite(lat_pin))
            return invalidAdjustment('invalid_pin_destination');

        const x_pin = cos(sigmaA) - sin(lat_o) * sin(lat_pin);
        const y_pin = sin(theta) * sin(sigmaA) * cos(lat_o);
        if (Math.hypot(x_pin, y_pin) <= DOMAIN_TOLERANCE) {
            return invalidAdjustment('singular_pin_longitude');
        }
        const lon_pin = lon_o + atan2(y_pin, x_pin);

        const lat_n = radFromInch(papNew.up);
        const lon_n = radFromInch(papNew.over);
        const term1 = sin((lat_pin - lat_n) / 2) ** 2;
        const term2 =
            cos(lat_n) * cos(lat_pin) * sin((lon_pin - lon_n) / 2) ** 2;
        const haversine = clampWithinTolerance(term1 + term2, 0, 1);
        if (Number.isNaN(haversine))
            return invalidAdjustment('invalid_new_pap_distance');

        const sigma = 2 * asin(sqrt(haversine));
        const pin_to_pap_new = inchFromRad(sigma);
        if (
            sigma <= ANGLE_TOLERANCE ||
            abs(Math.PI - sigma) <= ANGLE_TOLERANCE
        ) {
            return invalidAdjustment(
                'singular_new_pap_bearing',
                pin_to_pap_new,
            );
        }

        const x_bear =
            cos(lat_n) * sin(lat_pin) -
            sin(lat_n) * cos(lat_pin) * cos(lon_pin - lon_n);
        const y_bear = sin(lon_pin - lon_n) * cos(lat_pin);
        if (Math.hypot(x_bear, y_bear) <= DOMAIN_TOLERANCE) {
            return invalidAdjustment(
                'singular_new_pap_bearing',
                pin_to_pap_new,
            );
        }
        const bearing = atan2(y_bear, x_bear);

        // The app/visualizer convention interprets VAL as geographic bearing -VAL.
        // Keep `val` as an exact signed alias so legacy consumers never reconstruct a
        // mirrored point. `valMagnitude` is display-only and must not drive geometry.
        const valSigned = deg(normalizeSignedRadians(-bearing));
        const valMagnitude = abs(valSigned);

        const x_bold =
            cos(lat_pin) * sin(lat_o) -
            sin(lat_pin) * cos(lat_o) * cos(lon_o - lon_pin);
        const y_bold = sin(lon_o - lon_pin) * cos(lat_o);
        if (Math.hypot(x_bold, y_bold) <= DOMAIN_TOLERANCE) {
            return invalidAdjustment(
                'singular_old_pap_bearing',
                pin_to_pap_new,
            );
        }
        const b_old = atan2(y_bold, x_bold);
        const b_psa = b_old + rad(daOld.drill);
        const s_psa = radFromInch(MAX_SURFACE_DISTANCE);

        const latPsaInput =
            sin(lat_pin) * cos(s_psa) + cos(lat_pin) * sin(s_psa) * cos(b_psa);
        const lat_psa = safeAsin(latPsaInput);
        if (!Number.isFinite(lat_psa))
            return invalidAdjustment('invalid_psa_destination', pin_to_pap_new);

        const x_lpsa = cos(s_psa) - sin(lat_pin) * sin(lat_psa);
        const y_lpsa = sin(b_psa) * sin(s_psa) * cos(lat_pin);
        if (Math.hypot(x_lpsa, y_lpsa) <= DOMAIN_TOLERANCE) {
            return invalidAdjustment('singular_psa_longitude', pin_to_pap_new);
        }
        const lon_psa = lon_pin + atan2(y_lpsa, x_lpsa);

        const x_bnew =
            cos(lat_pin) * sin(lat_n) -
            sin(lat_pin) * cos(lat_n) * cos(lon_n - lon_pin);
        const y_bnew = sin(lon_n - lon_pin) * cos(lat_n);
        const x_bpp =
            cos(lat_pin) * sin(lat_psa) -
            sin(lat_pin) * cos(lat_psa) * cos(lon_psa - lon_pin);
        const y_bpp = sin(lon_psa - lon_pin) * cos(lat_psa);
        if (
            Math.hypot(x_bnew, y_bnew) <= DOMAIN_TOLERANCE ||
            Math.hypot(x_bpp, y_bpp) <= DOMAIN_TOLERANCE
        ) {
            return invalidAdjustment('singular_drilling_angle', pin_to_pap_new);
        }

        const b_new = atan2(y_bnew, x_bnew);
        const b_pin_psa = atan2(y_bpp, x_bpp);
        const drillingSigned = deg(normalizeSignedRadians(b_pin_psa - b_new));
        const drillingMagnitude = abs(drillingSigned);
        const orientationConventional =
            valSigned >= -ANGLE_TOLERANCE &&
            valSigned <= 90 + ANGLE_TOLERANCE &&
            drillingSigned >= -ANGLE_TOLERANCE &&
            drillingSigned <= 90 + ANGLE_TOLERANCE;

        return {
            drill: drillingMagnitude,
            drillSigned: drillingSigned,
            pin: pin_to_pap_new,
            val: valSigned,
            valSigned,
            valMagnitude,
            orientationConventional,
            valid: true,
        };
    }

    // Resolve physical placement before translating notation. In 2LS the Pin is on the
    // finger-facing side of the PAP--COG great circle (Storm drilling steps 4--7).
    // The reflected circle intersection reverses that orientation and is not a user option.
    // Signed bearing is kept internally for 3D; it does not extend the standard VAL input.
    function resolveLayout(system, values, pap) {
        if (
            !Array.isArray(values) ||
            values.length !== 3 ||
            !pap ||
            !allFinite(...values, pap.over, pap.up) ||
            pap.over < 0 ||
            pap.over > 6.75 ||
            abs(pap.up) >= 6.75
        )
            return { valid: false, reason: 'invalid_input' };
        let [drill, pin, val] = values;
        let candidates = [];
        if (system === 'vls') {
            const result = vlsToDa(...values);
            if (!result.valid) return result;
            [drill, pin, val] = [result.val1, result.val2, result.val3];
        } else if (system === '2ls') {
            const [pinDistance, psa, cog] = values;
            drill = drillingFromPinAndPsa(pinDistance, psa);
            pin = standardDistance(pinDistance, false);
            if (!allFinite(drill, pin) || cog < 0 || cog > 13.5)
                return { valid: false, reason: 'invalid_input' };
            const alpha = radFromInch(pin),
                lambda = radFromInch(pap.over),
                phi = radFromInch(pap.up);
            const A = -sin(phi) * cos(lambda),
                B = sin(lambda),
                rho = Math.hypot(A, B);
            if (rho < DOMAIN_TOLERANCE)
                return { valid: false, reason: 'singular_val_reference' };
            const ratio = clampUnit(
                (cos(radFromInch(cog)) - cos(alpha) * cos(phi) * cos(lambda)) /
                    (sin(alpha) * rho),
            );
            if (!Number.isFinite(ratio))
                return {
                    valid: false,
                    reason: 'impossible_pin_to_cog_geometry',
                };
            const gamma = atan2(B, A),
                omega = acos(ratio);
            candidates = [gamma - omega, gamma + omega].map((v) =>
                deg(normalizeSignedRadians(v)),
            );
            candidates = candidates.filter(
                (v, i) => i === 0 || abs(v - candidates[0]) > 1e-7,
            );
            candidates.sort((a, b) => cos(rad(b)) - cos(rad(a)));
            val = candidates[0];
        } else if (system !== 'dual_angle')
            return { valid: false, reason: 'unknown_system' };
        else if (drill < 0 || drill > 90 || val < 0 || val > 90)
            return { valid: false, reason: 'standard_angle_range' };
        if (
            !allFinite(drill, pin, val) ||
            pin <= 0 ||
            pin > 6.75 ||
            abs(drill) > 180 ||
            abs(val) > 180
        ) {
            return { valid: false, reason: 'invalid_input' };
        }
        return {
            valid: true,
            drill,
            pin,
            val,
            candidates,
            conventional: drill >= 0 && drill <= 90 && val >= 0 && val <= 90,
        };
    }

    function translateResolved(layout, target, pap) {
        if (!layout || !layout.valid)
            return invalidConversion(layout?.reason || 'invalid_input');
        const { drill, pin, val } = layout;
        const a = radFromInch(pin),
            phi = radFromInch(pap.up),
            lambda = radFromInch(pap.over);
        const psa = inchFromRad(safeAcos(sin(a) * cos(rad(drill))));
        const cog = inchFromRad(
            safeAcos(
                cos(a) * cos(phi) * cos(lambda) +
                    sin(a) *
                        (-sin(phi) * cos(lambda) * cos(rad(val)) +
                            sin(lambda) * sin(rad(val))),
            ),
        );
        let result;
        if (target === 'dual_angle') {
            if (!layout.conventional)
                return invalidConversion('orientation_not_representable', {
                    layout,
                });
            result = validConversion(drill, pin, val);
        } else if (target === 'vls') {
            // A positive buffer loses the side of VAL and the obtuse-angle branch.
            if (drill < 0 || drill > 90 || val < 0 || val > 90) {
                return invalidConversion('orientation_not_representable', {
                    layout,
                });
            }
            result = validConversion(
                pin,
                psa,
                inchFromRad(safeAsin(sin(a) * sin(rad(val)))),
            );
        } else if (target === '2ls') {
            if (drill < 0 || drill > 90)
                return invalidConversion('orientation_not_representable', {
                    layout,
                });
            result = validConversion(pin, psa, cog);
            const canonical = resolveLayout('2ls', [pin, psa, cog], pap);
            if (
                !canonical.valid ||
                abs(normalizeSignedRadians(rad(canonical.val - val))) >= 1e-7
            )
                return invalidConversion('orientation_not_representable', {
                    layout,
                });
        } else return invalidConversion('unknown_system');
        return { ...result, layout };
    }

    function translateLayout(source, target, values, pap) {
        return translateResolved(
            resolveLayout(source, values, pap),
            target,
            pap,
        );
    }

    global.LayoutMath = {
        resolveLayout,
        translateLayout,
        translateResolved,
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
        calculatePapAdjustment,
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
        sqrt,
    };
})(window);
