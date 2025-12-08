/**
 * Bowling Layout Adapter Logic
 */

// -- Math & Physics Constants --
const R = 13.5 / Math.PI; // Sphere Radius ~4.297

// -- Math Utils --
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

// -- Formatting Utils --
const gcd = (a, b) => b ? gcd(b, a % b) : a;

function parseFraction(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;

    value = value.toString().trim();
    if (!value) return 0;

    // Handle standard decimals
    if (!value.includes('/')) {
        return parseFloat(value) || 0;
    }

    // Handle mixed fractions "4 1/2" or simple fractions "1/2"
    const parts = value.split(' ');

    if (parts.length === 1) {
        // Just fraction "1/2"
        const [num, den] = parts[0].split('/');
        return (parseFloat(num) || 0) / (parseFloat(den) || 1);
    } else if (parts.length >= 2) {
        // Mixed "4 1/2"
        const whole = parseFloat(parts[0]) || 0;
        const [num, den] = parts[1].split('/');
        const fraction = (parseFloat(num) || 0) / (parseFloat(den) || 1);
        return whole + fraction;
    }

    return 0;
}

function formatFraction(value) {
    if (isNaN(value)) return "--";

    // Round to nearest 1/16
    const sixteen = Math.round(value * 16);

    if (sixteen === 0) return '0"';

    const whole = Math.floor(sixteen / 16);
    const rem = sixteen % 16;

    if (rem === 0) {
        return `${whole}"`;
    }

    const divisor = gcd(rem, 16);
    const num = rem / divisor;
    const den = 16 / divisor;

    if (whole === 0) {
        return `${num}/${den}"`;
    }
    return `${whole} ${num}/${den}"`;
}

function formatAngle(value) {
    if (isNaN(value)) return "--";
    // Round to nearest 5 degrees
    const rounded = Math.round(value / 5) * 5;
    return `${rounded}°`;
}

// -- State Management --
const state = {
    converter: {
        sourceSystem: 'dual_angle',
        targetSystem: 'vls',
        inputs: {},
        pap: { over: 5, up: 1 }
    },
    adjuster: {
        system: 'dual_angle',
        inputs: {},
    }
};

// -- DOM Elements --
let dom = {};

// -- Configs --
const SYSTEMS = {
    dual_angle: {
        name: "Dual Angle",
        fields: [
            { id: 'da_drill', labelKey: 'fld_da_drill', unit: 'angle' },
            { id: 'da_pin', labelKey: 'fld_da_pin', unit: 'dist' },
            { id: 'da_val', labelKey: 'fld_da_val', unit: 'angle' }
        ]
    },
    vls: {
        name: "Pin Buffer (VLS)",
        fields: [
            { id: 'vls_pin', labelKey: 'fld_vls_pin', unit: 'dist' },
            { id: 'vls_psa', labelKey: 'fld_vls_psa', unit: 'dist' },
            { id: 'vls_buffer', labelKey: 'fld_vls_buffer', unit: 'dist' }
        ]
    },
    '2ls': {
        name: "2LS",
        fields: [
            { id: '2ls_pin', labelKey: 'fld_2ls_pin', unit: 'dist' },
            { id: '2ls_psa', labelKey: 'fld_2ls_psa', unit: 'dist' },
            { id: '2ls_cg', labelKey: 'fld_2ls_cg', unit: 'dist' }
        ]
    }
};

// -- Initialization --
function init() {
    // Cache DOM elements
    dom = {
        tabs: document.querySelectorAll('.nav-tabs .nav-btn'),
        views: document.querySelectorAll('.view'),

        // Converter Selects
        sourceSystemSelect: document.getElementById('source-system'),
        targetSystemSelect: document.getElementById('target-system'),

        // Converter Containers
        sourceInputs: document.getElementById('source-inputs'),
        targetOutputs: document.getElementById('target-outputs'),

        // Converter PAP
        convPapOver: document.getElementById('converter-pap-over'),
        convPapUp: document.getElementById('converter-pap-up'),

        // PAP Adjuster Inputs
        oldPapOver: document.getElementById('old-pap-over'),
        oldPapUp: document.getElementById('old-pap-up'),

        adjusterSystemSelect: document.getElementById('adjuster-system'),
        adjusterInputs: document.getElementById('adjuster-inputs'),

        newPapOver: document.getElementById('new-pap-over'),
        newPapUp: document.getElementById('new-pap-up'),

        // PAP Adjuster Action
        papResultBox: document.getElementById('pap-result'),
        papResultValue: document.getElementById('pap-result-value'),
    };

    setupTabs();
    setupConverter();
    setupPapAdjuster();
    renderInputs(); // Initial render converter
    renderAdjusterInputs(); // Initial render adjuster

    // Initial PAP sync
    if (dom.convPapOver) state.converter.pap.over = parseFraction(dom.convPapOver.value) || 5;
    if (dom.convPapUp) state.converter.pap.up = parseFraction(dom.convPapUp.value) || 1;
}

// -- Tabs Logic --
function setupTabs() {
    dom.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            dom.tabs.forEach(t => t.classList.remove('active'));
            dom.views.forEach(v => v.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.target;
            document.getElementById(target).classList.add('active');
        });
    });
}

// -- Converter Logic --
function setupConverter() {
    // System Selectors
    dom.sourceSystemSelect.addEventListener('change', (e) => {
        state.converter.sourceSystem = e.target.value;
        renderInputs();
        calculateConversion();
    });

    dom.targetSystemSelect.addEventListener('change', (e) => {
        state.converter.targetSystem = e.target.value;
        calculateConversion();
    });

    // PAP Inputs
    dom.convPapOver.addEventListener('input', (e) => {
        state.converter.pap.over = parseFraction(e.target.value);
        calculateConversion();
    });
    dom.convPapUp.addEventListener('input', (e) => {
        state.converter.pap.up = parseFraction(e.target.value);
        calculateConversion();
    });
}

const TWO_LS_PRESETS = [
    { label: "1", values: [5.5, 5, 2] },
    { label: "2", values: [2, 6, 5] },
    { label: "3", values: [5, 4, 3.5] },
    { label: "4", values: [4.5, 3, 4.5] },
    { label: "5", values: [4, 4, 5] },
    { label: "6", values: [3.5, 4, 6.5] }
];

function renderInputs() {
    const systemKey = state.converter.sourceSystem;
    const fields = SYSTEMS[systemKey].fields;

    dom.sourceInputs.innerHTML = '';
    state.converter.inputs = {};

    // Inject 2LS Presets if applicable
    if (systemKey === '2ls') {
        const presetWrapper = document.createElement('div');
        presetWrapper.className = 'field';
        presetWrapper.style.marginBottom = '1rem';

        const label = document.createElement('label');
        label.textContent = t('preset_label');

        const select = document.createElement('select');
        select.id = "2ls-preset-select";
        select.innerHTML = `<option value="">${t('preset_custom')}</option>`;
        TWO_LS_PRESETS.forEach((p, i) => {
            select.innerHTML += `<option value="${i}">${p.label}</option>`;
        });

        select.addEventListener('change', (e) => {
            const idx = e.target.value;
            if (idx !== "") {
                const vals = TWO_LS_PRESETS[idx].values;
                // Update input element values
                const pinInput = document.getElementById('input-2ls_pin');
                const psaInput = document.getElementById('input-2ls_psa');
                const cgInput = document.getElementById('input-2ls_cg');

                if (pinInput) pinInput.value = formatFraction(vals[0]).replace('"', '');
                if (psaInput) psaInput.value = formatFraction(vals[1]).replace('"', '');
                if (cgInput) cgInput.value = formatFraction(vals[2]).replace('"', '');

                // Update state
                state.converter.inputs['2ls_pin'] = vals[0];
                state.converter.inputs['2ls_psa'] = vals[1];
                state.converter.inputs['2ls_cg'] = vals[2];

                calculateConversion();
            }
        });

        presetWrapper.appendChild(label);
        presetWrapper.appendChild(select);
        dom.sourceInputs.appendChild(presetWrapper);
    }

    fields.forEach(field => {
        const wrapper = document.createElement('div');
        wrapper.className = 'field';

        const label = document.createElement('label');
        label.textContent = t(field.labelKey);

        const input = document.createElement('input');
        input.type = 'text';
        input.inputMode = field.unit === 'angle' ? 'numeric' : 'text';

        if (field.unit === 'angle') {
            input.placeholder = "e.g. 45°";
        } else {
            input.placeholder = 'e.g. 4 1/2"';
        }

        input.id = `input-${field.id}`;

        // Initialize state
        state.converter.inputs[field.id] = 0;

        input.addEventListener('input', (e) => {
            state.converter.inputs[field.id] = parseFraction(e.target.value);
            // If user types manually, deselect preset dropdown
            const presetSelect = document.getElementById('2ls-preset-select');
            if (presetSelect && presetSelect.value !== "") presetSelect.value = "";
            calculateConversion();
        });

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        dom.sourceInputs.appendChild(wrapper);
    });

    // Initial Calc
    calculateConversion();
}

// -- PAP ADJUSTER LOGIC --

function renderAdjusterInputs() {
    const systemKey = state.adjuster.system;
    const fields = SYSTEMS[systemKey].fields;

    dom.adjusterInputs.innerHTML = '';
    state.adjuster.inputs = {};

    // Inject 2LS Presets for Adjuster if applicable
    if (systemKey === '2ls') {
        const presetWrapper = document.createElement('div');
        presetWrapper.className = 'field';
        presetWrapper.style.marginBottom = '1rem';

        const label = document.createElement('label');
        label.textContent = t('preset_label');

        const select = document.createElement('select');
        select.id = "adj-2ls-preset-select";
        select.innerHTML = `<option value="">${t('preset_custom')}</option>`;
        TWO_LS_PRESETS.forEach((p, i) => {
            select.innerHTML += `<option value="${i}">${p.label}</option>`;
        });

        select.addEventListener('change', (e) => {
            const idx = e.target.value;
            if (idx !== "") {
                const vals = TWO_LS_PRESETS[idx].values;
                // Update input element values
                const pinInput = document.getElementById('adj-input-2ls_pin');
                const psaInput = document.getElementById('adj-input-2ls_psa');
                const cgInput = document.getElementById('adj-input-2ls_cg');

                if (pinInput) pinInput.value = formatFraction(vals[0]).replace('"', '');
                if (psaInput) psaInput.value = formatFraction(vals[1]).replace('"', '');
                if (cgInput) cgInput.value = formatFraction(vals[2]).replace('"', '');

                // Update state
                state.adjuster.inputs['2ls_pin'] = vals[0];
                state.adjuster.inputs['2ls_psa'] = vals[1];
                state.adjuster.inputs['2ls_cg'] = vals[2];

                calculateAdjuster(); // Auto calc
            }
        });

        presetWrapper.appendChild(label);
        presetWrapper.appendChild(select);
        dom.adjusterInputs.appendChild(presetWrapper);
    }

    fields.forEach(field => {
        const wrapper = document.createElement('div');
        wrapper.className = 'field';

        const label = document.createElement('label');
        label.textContent = t(field.labelKey);

        const input = document.createElement('input');
        input.type = 'text';
        input.id = `adj-input-${field.id}`;

        if (field.unit === 'angle') {
            input.placeholder = "e.g. 45°";
        } else {
            input.placeholder = 'e.g. 4 1/2"';
        }

        input.addEventListener('input', (e) => {
            state.adjuster.inputs[field.id] = parseFraction(e.target.value);
            // If user types manually, deselect preset dropdown
            const presetSelect = document.getElementById('adj-2ls-preset-select');
            if (presetSelect && presetSelect.value !== "") presetSelect.value = "";

            calculateAdjuster(); // Auto calc
        });

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        dom.adjusterInputs.appendChild(wrapper);
    });
}

function setupPapAdjuster() {
    dom.adjusterSystemSelect.addEventListener('change', (e) => {
        state.adjuster.system = e.target.value;
        renderAdjusterInputs();
        dom.papResultBox.classList.add('hidden');
        calculateAdjuster(); // Try calc if all inputs are somehow ready or just to clear
    });

    dom.oldPapOver.addEventListener('input', calculateAdjuster);
    dom.oldPapUp.addEventListener('input', calculateAdjuster);
    dom.newPapOver.addEventListener('input', calculateAdjuster);
    dom.newPapUp.addEventListener('input', calculateAdjuster);
}

function calculateAdjuster() {
    const papOld = {
        over: parseFraction(dom.oldPapOver.value),
        up: parseFraction(dom.oldPapUp.value)
    };
    const papNew = {
        over: parseFraction(dom.newPapOver.value),
        up: parseFraction(dom.newPapUp.value)
    };

    // Validate PAPs
    if (isNaN(papOld.over) || isNaN(papOld.up) || isNaN(papNew.over) || isNaN(papNew.up)) return;

    const system = state.adjuster.system;
    const inputs = state.adjuster.inputs;
    const keys = Object.keys(inputs);

    // Validate Layout Inputs (at least 3 values needed)
    if (keys.length < 3) return;
    if (keys.some(k => isNaN(inputs[k]))) return;

    // 1. Convert to Dual Angle
    let daOld = { drill: 0, pin: 0, val: 0 };

    if (system === 'dual_angle') {
        daOld = {
            drill: inputs['da_drill'],
            pin: inputs['da_pin'],
            val: inputs['da_val']
        };
    } else if (system === 'vls') {
        const vlsDA = vlsToDa(
            inputs['vls_pin'],
            inputs['vls_psa'],
            inputs['vls_buffer']
        );
        daOld = {
            drill: vlsDA.val1,
            pin: vlsDA.val2,
            val: vlsDA.val3
        };
    } else if (system === '2ls') {
        const twoLsDA = twoLsToDa(
            inputs['2ls_pin'],
            inputs['2ls_psa'],
            inputs['2ls_cg'],
            papOld.over,
            papOld.up
        );
        daOld = {
            drill: twoLsDA.val1,
            pin: twoLsDA.val2,
            val: twoLsDA.val3
        };
    }

    // 2. Calculate New Layout in terms of Dual Angle
    const resultDA = calculatePapAdjustment(papOld, daOld, papNew);

    // 3. Convert Result back to Original System (using New PAP)
    let finalResult = { v1: 0, v2: 0, v3: 0 };

    if (system === 'dual_angle') {
        finalResult = { v1: resultDA.drill, v2: resultDA.pin, v3: resultDA.val };
    } else if (system === 'vls') {
        const res = daToVls(resultDA.drill, resultDA.pin, resultDA.val);
        finalResult = { v1: res.val1, v2: res.val2, v3: res.val3 };
    } else if (system === '2ls') {
        const res = daTo2ls(resultDA.drill, resultDA.pin, resultDA.val, papNew.over, papNew.up);
        finalResult = { v1: res.val1, v2: res.val2, v3: res.val3 };
    }

    dom.papResultBox.classList.remove('hidden');

    // Format result based on system fields
    const r1 = finalResult.v1;
    const r2 = finalResult.v2;
    const r3 = finalResult.v3;

    let displayString = "";

    if (system === 'dual_angle') {
        displayString = `${formatAngle(r1)} x ${formatFraction(r2)} x ${formatAngle(r3)}`;
    } else if (system === 'vls') {
        displayString = `${formatFraction(r1)} x ${formatFraction(r2)} x ${formatFraction(r3)}`;
    } else if (system === '2ls') {
        displayString = `${formatFraction(r1)} x ${formatFraction(r2)} x ${formatFraction(r3)}`;
    }

    dom.papResultValue.textContent = displayString;
}

// -- CORE CONVERSION LOGIC --

function calculateConversion() {
    const src = state.converter.sourceSystem;
    const tgt = state.converter.targetSystem;
    const inputs = state.converter.inputs;
    const pap = state.converter.pap;

    const keys = Object.keys(inputs);
    if (keys.length < 3) return;
    if (keys.some(k => isNaN(inputs[k]))) return;

    let result = { val1: 0, val2: 0, val3: 0 };

    if (src === 'dual_angle') {
        const drilling = inputs['da_drill'];
        const pin2pap = inputs['da_pin'];
        const val = inputs['da_val'];

        if (tgt === 'dual_angle') {
            result = { val1: drilling, val2: pin2pap, val3: val };
        } else if (tgt === 'vls') {
            result = daToVls(drilling, pin2pap, val);
        } else if (tgt === '2ls') {
            result = daTo2ls(drilling, pin2pap, val, pap.over, pap.up);
        }
    }
    else if (src === 'vls') {
        const pin2pap = inputs['vls_pin'];
        const psa2pap = inputs['vls_psa'];
        const buffer = inputs['vls_buffer'];

        if (tgt === 'vls') {
            result = { val1: pin2pap, val2: psa2pap, val3: buffer };
        } else if (tgt === 'dual_angle') {
            result = vlsToDa(pin2pap, psa2pap, buffer);
        } else if (tgt === '2ls') {
            result = vlsTo2ls(pin2pap, psa2pap, buffer, pap.over, pap.up);
        }
    }
    else if (src === '2ls') {
        const pin2pap = inputs['2ls_pin'];
        const psa2pap = inputs['2ls_psa'];
        const pin2cog = inputs['2ls_cg'];

        if (tgt === '2ls') {
            result = { val1: pin2pap, val2: psa2pap, val3: pin2cog };
        } else if (tgt === 'dual_angle') {
            result = twoLsToDa(pin2pap, psa2pap, pin2cog, pap.over, pap.up);
        } else if (tgt === 'vls') {
            result = twoLsToVls(pin2pap, psa2pap, pin2cog, pap.over, pap.up);
        }
    }

    renderOutputs([result.val1, result.val2, result.val3]);
}

function renderOutputs(results) {
    const systemKey = state.converter.targetSystem;
    const fields = SYSTEMS[systemKey].fields;

    dom.targetOutputs.innerHTML = '';
    fields.forEach((field, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'field';

        const label = document.createElement('label');
        label.textContent = t(field.labelKey);

        const display = document.createElement('div');
        display.className = 'read-only-field';

        // FORMATTING LOGIC APPLIED HERE
        let formattedValue = "--";
        const val = results[index];

        if (val !== undefined && val !== null) {
            if (field.unit === 'angle') {
                formattedValue = formatAngle(val);
            } else {
                formattedValue = formatFraction(val);
            }
        }

        display.textContent = formattedValue;

        wrapper.appendChild(label);
        wrapper.appendChild(display);
        dom.targetOutputs.appendChild(wrapper);
    });
}

// 1. VLS -> Dual Angle
function vlsToDa(pin_to_pap, psa_to_pap, pin_buffer) {
    const alpha_pin = radFromInch(pin_to_pap);
    const alpha_psa = radFromInch(psa_to_pap);

    let cos_val = cos(alpha_psa) / sin(alpha_pin);
    if (cos_val > 1) cos_val = 1; if (cos_val < -1) cos_val = -1;
    const da_drill = deg(acos(cos_val));

    const alpha_buf = radFromInch(pin_buffer);
    let sin_val = sin(alpha_buf) / sin(alpha_pin);
    if (sin_val > 1) sin_val = 1; if (sin_val < -1) sin_val = -1;
    const da_val = deg(asin(sin_val));

    return { val1: da_drill, val2: pin_to_pap, val3: da_val };
}

// 1. VLS -> 2LS
function vlsTo2ls(pin_to_pap, psa_to_pap, pin_buffer, pap_right, pap_up) {
    const alpha_pin = radFromInch(pin_to_pap);
    const alpha_buf = radFromInch(pin_buffer);

    let sin_val = sin(alpha_buf) / sin(alpha_pin);
    if (sin_val > 1) sin_val = 1; if (sin_val < -1) sin_val = -1;
    const val_angle_deg = deg(asin(sin_val));

    const lambda = radFromInch(pap_right);
    const phi = radFromInch(pap_up);
    const pap_cog_angle = acos(cos(lambda) * cos(phi));

    const term1 = cos(alpha_pin) * cos(pap_cog_angle);
    const term2 = sin(alpha_pin) * sin(pap_cog_angle) * sin(rad(val_angle_deg));

    let cos_pincog = term1 + term2;
    if (cos_pincog > 1) cos_pincog = 1; if (cos_pincog < -1) cos_pincog = -1;

    const pin_to_cog = R * acos(cos_pincog);

    return { val1: pin_to_pap, val2: psa_to_pap, val3: pin_to_cog };
}

// 2. Dual Angle -> VLS
function daToVls(drilling_angle, pin_to_pap, val_angle) {
    const alpha_pin = radFromInch(pin_to_pap);
    const val_rad = rad(val_angle);
    const drill_rad = rad(drilling_angle);

    let cos_psa = sin(alpha_pin) * cos(drill_rad);
    if (cos_psa > 1) cos_psa = 1; if (cos_psa < -1) cos_psa = -1;
    const psa_to_pap = R * acos(cos_psa);

    let sin_buf = sin(alpha_pin) * sin(val_rad);
    if (sin_buf > 1) sin_buf = 1; if (sin_buf < -1) sin_buf = -1;
    const pin_buffer = R * asin(sin_buf);

    return { val1: pin_to_pap, val2: psa_to_pap, val3: pin_buffer };
}

// 2. Dual Angle -> 2LS
function daTo2ls(drilling_angle, pin_to_pap, val_angle, pap_right, pap_up) {
    const alpha_pin = radFromInch(pin_to_pap);
    const drill_rad = rad(drilling_angle);
    let cos_psa = sin(alpha_pin) * cos(drill_rad);
    if (cos_psa > 1) cos_psa = 1; if (cos_psa < -1) cos_psa = -1;
    const psa_to_pap = R * acos(cos_psa);

    const lambda = radFromInch(pap_right);
    const phi = radFromInch(pap_up);
    const pap_cog_angle = acos(cos(lambda) * cos(phi));
    const val_rad = rad(val_angle);

    const term1 = cos(alpha_pin) * cos(pap_cog_angle);
    const term2 = sin(alpha_pin) * sin(pap_cog_angle) * sin(val_rad);

    let cos_pincog = term1 + term2;
    if (cos_pincog > 1) cos_pincog = 1; if (cos_pincog < -1) cos_pincog = -1;
    const pin_to_cog = R * acos(cos_pincog);

    return { val1: pin_to_pap, val2: psa_to_pap, val3: pin_to_cog };
}

// 3. 2LS -> Dual Angle
function twoLsToDa(pin_to_pap, psa_to_pap, pin_to_cog, pap_right, pap_up) {
    const alpha_pin = radFromInch(pin_to_pap);
    const alpha_psa = radFromInch(psa_to_pap);

    let cos_da = cos(alpha_psa) / sin(alpha_pin);
    if (cos_da > 1) cos_da = 1; if (cos_da < -1) cos_da = -1;
    const drilling_angle = deg(acos(cos_da));

    const alpha_pcog = radFromInch(pin_to_cog);
    const lambda = radFromInch(pap_right);
    const phi = radFromInch(pap_up);

    const numer = cos(alpha_pcog) - cos(alpha_pin) * cos(lambda) * cos(phi);
    const term_cl_cp = cos(lambda) * cos(phi);
    const denom = sin(alpha_pin) * sqrt(1 - (term_cl_cp * term_cl_cp));

    let sin_val = 0;
    if (denom !== 0) {
        sin_val = numer / denom;
    }
    if (sin_val > 1) sin_val = 1; if (sin_val < -1) sin_val = -1;

    const val_angle = deg(asin(sin_val));

    return { val1: drilling_angle, val2: pin_to_pap, val3: val_angle };
}

// 3. 2LS -> VLS
function twoLsToVls(pin_to_pap, psa_to_pap, pin_to_cog, pap_right, pap_up) {
    const { val3: val_angle } = twoLsToDa(pin_to_pap, psa_to_pap, pin_to_cog, pap_right, pap_up);

    const alpha_pin = radFromInch(pin_to_pap);
    let sin_buf = sin(alpha_pin) * sin(rad(val_angle));
    if (sin_buf > 1) sin_buf = 1; if (sin_buf < -1) sin_buf = -1;
    const pin_buffer = R * asin(sin_buf);

    return { val1: pin_to_pap, val2: psa_to_pap, val3: pin_buffer };
}

function calculatePapAdjustment(papOld, daOld, papNew) {
    const lat_o = radFromInch(papOld.up);
    const lon_o = radFromInch(papOld.over);

    const sigmaA = radFromInch(daOld.pin);
    const theta = -rad(daOld.val);

    let sin_lat_pin = sin(lat_o) * cos(sigmaA) + cos(lat_o) * sin(sigmaA) * cos(theta);
    if (sin_lat_pin > 1) sin_lat_pin = 1; if (sin_lat_pin < -1) sin_lat_pin = -1;
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

    const DIST_PIN_PSA = 6.75;
    const s_psa = radFromInch(DIST_PIN_PSA);

    let sin_lat_psa = sin(lat_pin) * cos(s_psa) + cos(lat_pin) * sin(s_psa) * cos(b_psa);
    if (sin_lat_psa > 1) sin_lat_psa = 1; if (sin_lat_psa < -1) sin_lat_psa = -1;
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

    const diff = b_pin_psa - b_new + Math.PI;
    const modDiff = ((diff % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    const drilling_new_deg = deg(abs(modDiff - Math.PI));

    return {
        drill: drilling_new_deg,
        pin: pin_to_pap_new,
        val: val_new_deg
    };
}

document.addEventListener('DOMContentLoaded', init);
