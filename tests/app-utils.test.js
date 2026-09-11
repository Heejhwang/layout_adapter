const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = {
    console: {
        log() {},
        error() {},
        warn() {}
    },
    window: {},
    t(key) { return key; },
    document: {
        addEventListener() {},
        getElementById() { return null; }
    }
};

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'layout-math.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), context);

function run(expression) {
    return vm.runInContext(expression, context);
}

function createClassList(initial = []) {
    const values = new Set(initial);
    return {
        add(value) { values.add(value); },
        remove(value) { values.delete(value); },
        toggle(value, force) {
            if (force === true) values.add(value);
            else if (force === false) values.delete(value);
            else if (values.has(value)) values.delete(value);
            else values.add(value);
        },
        contains(value) { return values.has(value); }
    };
}

function createElement({ value = '', classes = [] } = {}) {
    const attributes = new Map();
    return {
        value,
        textContent: '',
        classList: createClassList(classes),
        setAttribute(name, attributeValue) { attributes.set(name, String(attributeValue)); },
        getAttribute(name) { return attributes.get(name); }
    };
}

function configureAdjuster({ system, inputs, oldPap, newPap, grip = system === '2ls' ? 'thumbless' : '3finger' }) {
    const fixture = {
        oldPapOver: createElement({ value: String(oldPap.over) }),
        oldPapUp: createElement({ value: String(oldPap.up) }),
        newPapOver: createElement({ value: String(newPap.over) }),
        newPapUp: createElement({ value: String(newPap.up) }),
        papResultBox: createElement({ classes: ['hidden'] }),
        papResultValue: createElement(),
        adjusterWarning: createElement({ classes: ['hidden'] }),
        adjusterWarningText: createElement()
    };
    context.adjusterFixture = fixture;
    context.adjusterInputs = inputs;
    run(`dom = adjusterFixture;
        state.common.grip = '${grip}';
        state.adjuster.system = '${system}';
        state.adjuster.inputs = adjusterInputs;`);
    return fixture;
}

test('parseFraction accepts strict decimal, fraction, mixed fraction, and matching units', () => {
    assert.equal(run("parseFraction('4.5', 'dist')"), 4.5);
    assert.equal(run("parseFraction('1 / 2', 'dist')"), 0.5);
    assert.equal(run("parseFraction('4   1/2', 'dist')"), 4.5);
    assert.equal(run("parseFraction('-4 1/2', 'dist')"), -4.5);
    assert.equal(run("parseFraction('5\\\"', 'dist')"), 5);
    assert.equal(run("parseFraction('5 in', 'dist')"), 5);
    assert.equal(run("parseFraction('30°', 'angle')"), 30);
});

test('parseFraction rejects empty, junk, zero denominator, non-finite, and wrong units', () => {
    for (const expression of [
        "parseFraction('', 'dist')",
        "parseFraction('12junk', 'dist')",
        "parseFraction('1/0', 'dist')",
        "parseFraction('Infinity', 'dist')",
        "parseFraction('1e309', 'dist')",
        "parseFraction('30°', 'dist')",
        "parseFraction('5\\\"', 'angle')"
    ]) {
        assert.equal(Number.isNaN(run(expression)), true, expression);
    }
});

test('formatters reject non-finite values and preserve negative fraction sign', () => {
    assert.equal(run('formatFraction(Infinity)'), '--');
    assert.equal(run('formatFraction(-0.5)'), '-1/2"');
    assert.equal(run('formatAngle(NaN)'), '--');
});

test('PAP and Pin-PAP-PSA validation enforce physical bounds', () => {
    assert.equal(run('isPapValid({over: 5, up: 1})'), true);
    assert.equal(run('isPapValid({over: 5, up: -1})'), true);
    assert.equal(run('isPapValid({over: 5, up: -7})'), false);
    assert.equal(run('isPapValid({over: Infinity, up: 1})'), false);
    assert.equal(run('isPapValid({over: -1, up: 1})'), false);
    assert.equal(run('validatePinPapPsaGeometry(4, 1)'), false);
    assert.equal(run('validatePinPapPsaGeometry(4, 3)'), true);
});

test('adjuster input validation rejects impossible and out-of-range source layouts', () => {
    assert.equal(run("isAdjusterInputValid('dual_angle', {da_drill:45, da_pin:4.5, da_val:30}, {over:5, up:1})"), true);
    assert.equal(run("isAdjusterInputValid('dual_angle', {da_drill:45, da_pin:-1, da_val:30}, {over:5, up:1})"), false);
    assert.equal(run("isAdjusterInputValid('vls', {vls_pin:4, vls_psa:1, vls_buffer:2}, {over:5, up:1})"), false);
    assert.equal(run("isAdjusterInputValid('vls', {vls_pin:4.5, vls_psa:5, vls_buffer:2}, {over:5, up:1})"), true);
});

test('2LS accepts the official sixth layout without widening VAL input', () => {
    assert.equal(
        run("isSystemInputValid('2ls', {'2ls_pin':3.5, '2ls_psa':4, '2ls_cg':6.5}, {over:5, up:1})"),
        true
    );
});

test('2LS geometry remains available for both grip modes', () => {
    const expression = "isSystemInputValid('2ls', {'2ls_pin':5.5, '2ls_psa':5, '2ls_cg':2}, {over:5, up:1})";
    run("state.common.grip = '3finger'");
    assert.equal(run(expression), true);
    run("state.common.grip = 'thumbless'");
    assert.equal(run(expression), true);
});

test('grip change preserves selected systems and recalculates both tools', () => {
    context.gripFixture = {
        gripSelect: createElement(),
        gripModeStatus: createElement()
    };

    const snapshot = JSON.parse(run(`(() => {
        dom = gripFixture;
        state.converter.sourceSystem = '2ls';
        state.converter.targetSystem = 'dual_angle';
        state.adjuster.system = '2ls';
        window.converterCalls = 0;
        window.adjusterCalls = 0;
        const originalConverter = calculateConversion;
        const originalAdjuster = calculateAdjuster;
        calculateConversion = () => { window.converterCalls += 1; };
        calculateAdjuster = () => { window.adjusterCalls += 1; };
        const applied = applyGripMode('3finger');
        const invalidApplied = applyGripMode('invalid');
        const result = {
            applied,
            invalidApplied,
            grip: state.common.grip,
            source: state.converter.sourceSystem,
            target: state.converter.targetSystem,
            adjuster: state.adjuster.system,
            converterCalls: window.converterCalls,
            adjusterCalls: window.adjusterCalls
        };
        calculateConversion = originalConverter;
        calculateAdjuster = originalAdjuster;
        return JSON.stringify(result);
    })()`));

    assert.deepEqual(snapshot, {
        applied: true,
        invalidApplied: false,
        grip: '3finger',
        source: '2ls',
        target: 'dual_angle',
        adjuster: '2ls',
        converterCalls: 1,
        adjusterCalls: 1
    });
});

test('non-standard VLS adjustment reports unavailable standard notation', () => {
    const fixture = configureAdjuster({
        system: 'vls',
        inputs: {
            vls_pin: 2,
            vls_psa: 5.362299317286592,
            vls_buffer: 0.33523301519722654
        },
        oldPap: { over: 5, up: 1 },
        newPap: { over: 4, up: 1 }
    });

    run('calculateAdjuster()');
    assert.equal(fixture.papResultBox.classList.contains('hidden'), false);
    assert.equal(fixture.papResultValue.textContent, 'standard_unavailable');
    assert.equal(fixture.adjusterWarningText.textContent, 'warn_orientation_loss');
});

test('2LS PAP adjustment preserves a valid standard 2LS placement', () => {
    const fixture = configureAdjuster({
        system: '2ls',
        inputs: {
            '2ls_pin': 2,
            '2ls_psa': 4.782724531063747,
            '2ls_cg': 2.5517974749434216
        },
        oldPap: { over: 3, up: 0 },
        newPap: { over: 3, up: 2 }
    });

    run('calculateAdjuster()');
    assert.equal(fixture.papResultBox.classList.contains('hidden'), false);
    assert.equal(fixture.papResultValue.textContent, '1" × 6 11/16" × 2 9/16"');
    assert.doesNotMatch(fixture.papResultValue.textContent, / · /);
    assert.equal(fixture.adjusterWarning.classList.contains('hidden'), true);
});
