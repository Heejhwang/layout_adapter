'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

global.window = global;
require('../layout-math.js');

const math = global.LayoutMath;
const R = 13.5 / Math.PI;
const EPSILON = 1e-9;

function close(actual, expected, tolerance = EPSILON, message = '') {
    assert.ok(Number.isFinite(actual), `${message} expected a finite value, got ${actual}`);
    assert.ok(
        Math.abs(actual - expected) <= tolerance,
        `${message} expected ${expected}, got ${actual}`
    );
}

function clampUnit(value) {
    return Math.max(-1, Math.min(1, value));
}

function papPoint(pap) {
    return [pap.up / R, pap.over / R]; // [latitude, longitude], radians
}

function destination(point, distanceInches, bearingDegrees) {
    const [lat1, lon1] = point;
    const sigma = distanceInches / R;
    const bearing = bearingDegrees * Math.PI / 180;
    const lat2 = Math.asin(clampUnit(
        Math.sin(lat1) * Math.cos(sigma)
        + Math.cos(lat1) * Math.sin(sigma) * Math.cos(bearing)
    ));
    const lon2 = lon1 + Math.atan2(
        Math.sin(bearing) * Math.sin(sigma) * Math.cos(lat1),
        Math.cos(sigma) - Math.sin(lat1) * Math.sin(lat2)
    );
    return [lat2, lon2];
}

function surfaceDistance(first, second) {
    const haversine = Math.sin((first[0] - second[0]) / 2) ** 2
        + Math.cos(first[0]) * Math.cos(second[0])
        * Math.sin((first[1] - second[1]) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(Math.max(0, Math.min(1, haversine))));
}

function initialBearing(from, to) {
    const deltaLon = to[1] - from[1];
    const y = Math.sin(deltaLon) * Math.cos(to[0]);
    const x = Math.cos(from[0]) * Math.sin(to[0])
        - Math.sin(from[0]) * Math.cos(to[0]) * Math.cos(deltaLon);
    return Math.atan2(y, x) * 180 / Math.PI;
}

function pinPoint(pap, pinToPap, valAngle) {
    // Layout convention: a positive VAL is a negative geographic bearing.
    return destination(papPoint(pap), pinToPap, -valAngle);
}

function pinToCogOracle(pinToPap, valAngle, pap) {
    return surfaceDistance(pinPoint(pap, pinToPap, valAngle), [0, 0]);
}

function psaToPapOracle(drillingAngle, pinToPap, valAngle, pap) {
    const papPosition = papPoint(pap);
    const pinPosition = pinPoint(pap, pinToPap, valAngle);
    const pinToPapBearing = initialBearing(pinPosition, papPosition);
    const psaPosition = destination(pinPosition, 6.75, pinToPapBearing + drillingAngle);
    return surfaceDistance(psaPosition, papPosition);
}

function pinBufferOracle(pinToPap, valAngle) {
    return R * Math.asin(
        Math.sin(pinToPap / R) * Math.sin(valAngle * Math.PI / 180)
    );
}

test('DA to 2LS matches an independent spherical-coordinate oracle', () => {
    const cases = [
        { drill: 45, pin: 4.5, val: 30, pap: { over: 5, up: 0 } },
        { drill: 45, pin: 4.5, val: 30, pap: { over: 5, up: 0.5 } },
        { drill: 45, pin: 4.5, val: 30, pap: { over: 5, up: 1 } },
        { drill: 45, pin: 4.5, val: 30, pap: { over: 5, up: -1 } },
        { drill: 45, pin: 4.5, val: 30, pap: { over: 5, up: 2 } },
        { drill: 60, pin: 5, val: 45, pap: { over: 5, up: 2 } },
        { drill: 30, pin: 3, val: 0, pap: { over: 4, up: 1 } },
        { drill: 70, pin: 6, val: 90, pap: { over: 5, up: 1 } }
    ];

    for (const item of cases) {
        const result = math.daTo2ls(item.drill, item.pin, item.val, item.pap.over, item.pap.up);
        assert.equal(result.valid, true);
        close(result.val2, psaToPapOracle(item.drill, item.pin, item.val, item.pap), EPSILON, 'PSA-to-PAP');
        close(result.val3, pinToCogOracle(item.pin, item.val, item.pap), EPSILON, 'Pin-to-COG');
    }
});

test('VLS to 2LS uses the same physical Pin position', () => {
    const cases = [
        { drill: 30, pin: 4, val: 20, pap: { over: 5, up: 1 } },
        { drill: 45, pin: 5, val: 45, pap: { over: 5, up: 2 } },
        { drill: 80, pin: 6, val: 70, pap: { over: 4, up: 0.5 } }
    ];

    for (const item of cases) {
        const psa = psaToPapOracle(item.drill, item.pin, item.val, item.pap);
        const buffer = pinBufferOracle(item.pin, item.val);
        const result = math.vlsTo2ls(item.pin, psa, buffer, item.pap.over, item.pap.up);
        assert.equal(result.valid, true);
        close(result.val3, pinToCogOracle(item.pin, item.val, item.pap), EPSILON);
    }
});

test('2LS inverse restores the unique standard 0..90 degree VAL candidate', () => {
    const cases = [
        { drill: 30, pin: 3, val: 0, pap: { over: 5, up: 1 } },
        { drill: 45, pin: 4.5, val: 30, pap: { over: 5, up: 1 } },
        { drill: 45, pin: 5, val: 45, pap: { over: 5, up: 2 } },
        { drill: 60, pin: 6, val: 90, pap: { over: 5, up: 1 } },
        { drill: 25, pin: 4, val: 60, pap: { over: 3, up: 0 } },
        { drill: 55, pin: 4, val: 35, pap: { over: 0, up: 1 } }
    ];

    for (const item of cases) {
        const psa = psaToPapOracle(item.drill, item.pin, item.val, item.pap);
        const cog = pinToCogOracle(item.pin, item.val, item.pap);
        const result = math.twoLsToDa(item.pin, psa, cog, item.pap.over, item.pap.up);
        assert.equal(result.valid, true, `${JSON.stringify(item)}: ${result.reason}`);
        close(result.val1, item.drill, 1e-8, 'drilling angle');
        close(result.val2, item.pin, EPSILON, 'Pin-to-PAP');
        close(result.val3, item.val, 1e-8, 'VAL angle');
        assert.equal(result.valCandidates.length, 1);
    }
});

test('standard DA/2LS and DA/VLS round trips remain stable', () => {
    const pap = { over: 5, up: 1 };
    for (const drill of [0, 30, 60, 90]) {
        // Keep the generated 2LS Pin-to-COG inside its standard 0..6.75" range.
        for (const pin of [1, 3, 5]) {
            for (const val of [0, 30, 60, 90]) {
                const twoLs = math.daTo2ls(drill, pin, val, pap.over, pap.up);
                assert.equal(twoLs.valid, true);
                const daFrom2ls = math.twoLsToDa(twoLs.val1, twoLs.val2, twoLs.val3, pap.over, pap.up);
                assert.equal(daFrom2ls.valid, true, daFrom2ls.reason);
                close(daFrom2ls.val1, drill, 1e-8);
                close(daFrom2ls.val2, pin, EPSILON);
                close(daFrom2ls.val3, val, 1e-8);

                const vls = math.daToVls(drill, pin, val);
                assert.equal(vls.valid, true);
                const daFromVls = math.vlsToDa(vls.val1, vls.val2, vls.val3);
                assert.equal(daFromVls.valid, true, daFromVls.reason);
                close(daFromVls.val1, drill, 1e-8);
                close(daFromVls.val2, pin, EPSILON);
                close(daFromVls.val3, val, 1e-8);
            }
        }
    }
});

test('impossible inverse geometry is invalid instead of clamped to a boundary angle', () => {
    const invalidPsa = math.vlsToDa(4, 0, 2);
    assert.equal(invalidPsa.valid, false);
    assert.ok(Number.isNaN(invalidPsa.val1));

    const invalidBuffer = math.vlsToDa(4, 4, 5);
    assert.equal(invalidBuffer.valid, false);
    assert.ok(Number.isNaN(invalidBuffer.val3));

    const pap = { over: 5, up: 1 };
    const validPsa = psaToPapOracle(45, 4, 45, pap);
    const impossibleCog = math.twoLsToDa(4, validPsa, 0, pap.over, pap.up);
    assert.equal(impossibleCog.valid, false);
    assert.ok(Number.isNaN(impossibleCog.val3));
});

test('inverse trig only clamps roundoff-sized domain overshoot', () => {
    const validBoundary = math.vlsToDa(4, 2.75, 4);
    assert.equal(validBoundary.valid, true);
    close(validBoundary.val1, 0, 1e-8);
    close(validBoundary.val3, 90, 1e-8);

    const roundoffOnly = math.vlsToDa(4, 2.75 - 1e-13, 4 + 1e-13);
    assert.equal(roundoffOnly.valid, true);

    const materiallyInvalid = math.vlsToDa(4, 2.75 - 1e-8, 4 + 1e-8);
    assert.equal(materiallyInvalid.valid, false);
});

test('zero-distance singularities and non-finite inputs are explicit invalid results', () => {
    const singularResults = [
        math.vlsToDa(0, 6.75, 0),
        math.vlsTo2ls(0, 6.75, 0, 5, 1),
        math.daToVls(45, 0, 30),
        math.daTo2ls(45, 0, 30, 5, 1),
        math.twoLsToDa(0, 6.75, 5, 5, 1),
        math.twoLsToDa(4, 4, 4, 0, 0)
    ];
    for (const result of singularResults) {
        assert.equal(result.valid, false);
        assert.ok(Number.isNaN(result.val1));
        assert.ok(Number.isNaN(result.val3));
    }

    const nonFiniteResults = [
        math.vlsToDa(Infinity, 4, 2),
        math.vlsTo2ls(4, 4, 2, NaN, 1),
        math.daToVls(45, 4, Infinity),
        math.daTo2ls(NaN, 4, 30, 5, 1),
        math.twoLsToDa(4, 4, 4, 5, Infinity),
        math.twoLsToVls(4, 4, NaN, 5, 1)
    ];
    for (const result of nonFiniteResults) {
        assert.equal(result.valid, false);
        assert.equal(result.reason, 'non_finite_input');
    }
});

test('PAP adjustment preserves the independent physical Pin and PSA positions', () => {
    const cases = [
        {
            oldPap: { over: 5, up: 1 },
            layout: { drill: 45, pin: 4.5, val: 30 },
            newPap: { over: 4.5, up: 1 },
            conventional: true
        },
        {
            oldPap: { over: 5, up: 1 },
            layout: { drill: 45, pin: 2, val: 10 },
            newPap: { over: 4, up: 1 },
            conventional: false
        },
        {
            oldPap: { over: 3, up: 0 },
            layout: { drill: 10, pin: 2, val: 30 },
            newPap: { over: 3, up: 2 },
            conventional: false
        }
    ];

    for (const item of cases) {
        const oldPapPosition = papPoint(item.oldPap);
        const fixedPin = pinPoint(item.oldPap, item.layout.pin, item.layout.val);
        const oldPinToPapBearing = initialBearing(fixedPin, oldPapPosition);
        const fixedPsa = destination(fixedPin, 6.75, oldPinToPapBearing + item.layout.drill);

        const result = math.calculatePapAdjustment(item.oldPap, item.layout, item.newPap);
        assert.equal(result.valid, true, result.reason);
        assert.equal(result.val, result.valSigned);
        close(result.valMagnitude, Math.abs(result.valSigned));
        assert.equal(result.orientationConventional, item.conventional);

        const reconstructedPin = destination(papPoint(item.newPap), result.pin, -result.valSigned);
        close(surfaceDistance(fixedPin, reconstructedPin), 0, 1e-8, 'fixed Pin error');

        const newPinToPapBearing = initialBearing(reconstructedPin, papPoint(item.newPap));
        const reconstructedPsa = destination(
            reconstructedPin,
            6.75,
            newPinToPapBearing + result.drillSigned
        );
        close(surfaceDistance(fixedPsa, reconstructedPsa), 0, 1e-8, 'fixed PSA error');
    }
});

test('PAP adjustment returns signed, unfolded VAL values', () => {
    const crossed = math.calculatePapAdjustment(
        { over: 5, up: 1 },
        { drill: 45, pin: 2, val: 10 },
        { over: 4, up: 1 }
    );
    close(crossed.valSigned, -12.87803456375946, 1e-9);
    assert.equal(crossed.val, crossed.valSigned);
    assert.equal(crossed.orientationConventional, false);

    const beyondNinety = math.calculatePapAdjustment(
        { over: 3, up: 0 },
        { drill: 10, pin: 2, val: 30 },
        { over: 3, up: 2 }
    );
    close(beyondNinety.valSigned, 103.46583260041172, 1e-9);
    assert.ok(beyondNinety.val > 90);
    assert.equal(beyondNinety.orientationConventional, false);
});

test('same-PAP adjustment preserves a conventional layout', () => {
    const pap = { over: 5, up: 1 };
    const layout = { drill: 45, pin: 5, val: 45 };
    const result = math.calculatePapAdjustment(pap, layout, pap);
    assert.equal(result.valid, true);
    assert.equal(result.orientationConventional, true);
    close(result.drillSigned, layout.drill, 1e-8);
    close(result.pin, layout.pin, 1e-8);
    close(result.valSigned, layout.val, 1e-8);
});

test('PAP adjustment rejects undefined bearings and non-finite values', () => {
    const oldPap = { over: 5, up: 1 };
    const layout = { drill: 45, pin: 2, val: 10 };
    const fixedPin = pinPoint(oldPap, layout.pin, layout.val);
    const coincidentNewPap = { over: fixedPin[1] * R, up: fixedPin[0] * R };

    const coincident = math.calculatePapAdjustment(oldPap, layout, coincidentNewPap);
    assert.equal(coincident.valid, false);
    assert.equal(coincident.reason, 'singular_new_pap_bearing');

    const zeroPin = math.calculatePapAdjustment(oldPap, { drill: 45, pin: 0, val: 10 }, oldPap);
    assert.equal(zeroPin.valid, false);

    const nonFinite = math.calculatePapAdjustment(
        oldPap,
        { drill: Infinity, pin: 2, val: 10 },
        { over: 4, up: 1 }
    );
    assert.equal(nonFinite.valid, false);
    assert.equal(nonFinite.reason, 'non_finite_input');
    assert.ok(Number.isNaN(nonFinite.valSigned));
});
