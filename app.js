/**
 * Bowling Layout Adapter Logic
 */

if (!window.LayoutMath) {
    throw new Error('layout-math.js must be loaded before app.js');
}

const {
    radFromInch,
    inchFromRad,
    cos,
    acos,
    abs,
    vlsToDa,
    vlsTo2ls,
    daToVls,
    daTo2ls,
    twoLsToDa,
    twoLsToVls,
    calculatePapAdjustment,
} = window.LayoutMath;

// -- Formatting Utils --
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

function parseFraction(value, unit = null) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : NaN;
    }
    if (value === null || value === undefined) return NaN;

    let text = String(value).trim();
    if (!text) return NaN;

    const anyUnitSuffix = /(?:"|in|°)\s*$/i;
    const allowedUnitSuffix =
        unit === 'angle'
            ? /°\s*$/
            : unit === 'dist' || unit === 'cog'
              ? /(?:"|in)\s*$/i
              : anyUnitSuffix;

    if (anyUnitSuffix.test(text)) {
        if (!allowedUnitSuffix.test(text)) return NaN;
        text = text.replace(allowedUnitSuffix, '').trim();
        if (!text) return NaN;
    }

    const decimalMatch = text.match(/^([+-]?)(?:(\d+(?:\.\d*)?)|(\.\d+))$/);
    if (decimalMatch) {
        const parsed = Number(text);
        return Number.isFinite(parsed) ? parsed : NaN;
    }

    const mixedMatch = text.match(/^([+-]?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
    if (mixedMatch) {
        const [, sign, wholeText, numeratorText, denominatorText] = mixedMatch;
        const denominator = Number(denominatorText);
        if (denominator === 0) return NaN;
        const magnitude =
            Number(wholeText) + Number(numeratorText) / denominator;
        const parsed = sign === '-' ? -magnitude : magnitude;
        return Number.isFinite(parsed) ? parsed : NaN;
    }

    const fractionMatch = text.match(/^([+-]?)(\d+)\s*\/\s*(\d+)$/);
    if (fractionMatch) {
        const [, sign, numeratorText, denominatorText] = fractionMatch;
        const denominator = Number(denominatorText);
        if (denominator === 0) return NaN;
        const magnitude = Number(numeratorText) / denominator;
        const parsed = sign === '-' ? -magnitude : magnitude;
        return Number.isFinite(parsed) ? parsed : NaN;
    }

    return NaN;
}

function formatFraction(value) {
    if (!Number.isFinite(value)) return '--';

    // Round to nearest 1/16
    const sign = value < 0 ? '-' : '';
    const sixteen = Math.round(Math.abs(value) * 16);

    if (sixteen === 0) return '0"';

    const whole = Math.floor(sixteen / 16);
    const rem = sixteen % 16;

    if (rem === 0) {
        return `${sign}${whole}"`;
    }

    const divisor = gcd(rem, 16);
    const num = rem / divisor;
    const den = 16 / divisor;

    if (whole === 0) {
        return `${sign}${num}/${den}"`;
    }
    return `${sign}${whole} ${num}/${den}"`;
}

function formatAngle(value) {
    if (!Number.isFinite(value)) return '--';
    return Number(value.toFixed(1)) + '°';
}

// -- State Management --
const state = {
    common: {
        hand: 'right', // 'right' or 'left'
        grip: '3finger', // '3finger' or 'thumbless'
    },
    converter: {
        sourceSystem: 'dual_angle',
        targetSystem: 'vls',
        inputs: {},
        pap: { over: 5, up: 1 },
    },
    adjuster: {
        system: 'dual_angle',
        inputs: {},
    },
};

const DIST_STEP = 1 / 16;
const DIST_MAX = 6.75;
const ANGLE_STEP = 5;
const ANGLE_MAX = 90;
const GEOMETRY_TOLERANCE = 0.05;

let sliderBindings = [];

// -- Visualizer --
let visualizer = null;

// -- DOM Elements --
let dom = {};

// -- Configs --
const SYSTEMS = {
    dual_angle: {
        name: 'Dual Angle',
        fields: [
            { id: 'da_drill', labelKey: 'fld_da_drill', unit: 'angle' },
            { id: 'da_pin', labelKey: 'fld_da_pin', unit: 'dist' },
            { id: 'da_val', labelKey: 'fld_da_val', unit: 'angle' },
        ],
    },
    vls: {
        name: 'Pin Buffer (VLS)',
        fields: [
            { id: 'vls_pin', labelKey: 'fld_vls_pin', unit: 'dist' },
            { id: 'vls_psa', labelKey: 'fld_vls_psa', unit: 'dist' },
            { id: 'vls_buffer', labelKey: 'fld_vls_buffer', unit: 'dist' },
        ],
    },
    '2ls': {
        name: '2LS',
        fields: [
            { id: '2ls_pin', labelKey: 'fld_2ls_pin', unit: 'dist' },
            { id: '2ls_psa', labelKey: 'fld_2ls_psa', unit: 'dist' },
            { id: '2ls_cg', labelKey: 'fld_2ls_cg', unit: 'cog' },
        ],
    },
};

const GRIP_TYPES = new Set(['3finger', 'thumbless']);

function updateGripModeStatus(grip) {
    if (!dom.gripModeStatus) return;
    const key =
        grip === 'thumbless' ? 'grip_mode_thumbless' : 'grip_mode_3finger';
    dom.gripModeStatus.setAttribute('data-i18n', key);
    dom.gripModeStatus.textContent = t(key);
}

function applyGripMode(grip, { recalculate = true } = {}) {
    if (!GRIP_TYPES.has(grip)) return false;

    state.common.grip = grip;
    if (dom.gripSelect) dom.gripSelect.value = grip;
    updateGripModeStatus(grip);
    if (visualizer) visualizer.setGripType(grip);
    if (window.refreshDrillingChart) window.refreshDrillingChart();

    if (!recalculate) return true;
    calculateConversion();
    calculateAdjuster();
    return true;
}

function isViewActive(viewId) {
    const view = document.getElementById(viewId);
    return !!view && view.classList.contains('active');
}

function setInputValidity(input, isValid) {
    if (!input) return;
    input.setAttribute('aria-invalid', isValid ? 'false' : 'true');
}

function setWarning(box, textElement, visible, messageKey) {
    if (!box) return;
    box.classList.toggle('hidden', !visible);
    box.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if (visible && textElement && messageKey) {
        textElement.setAttribute('data-i18n', messageKey);
        textElement.textContent = t(messageKey);
    }
}

function clearVisualizerLayout() {
    state.previewData = null;
    if (!visualizer) return;
    if (typeof visualizer.clearLayout === 'function') {
        visualizer.clearLayout();
        return;
    }

    [
        'markerPin',
        'markerPsa',
        'markerPap',
        'markerCog',
        'markerOldPap',
    ].forEach((key) => {
        if (visualizer[key]) visualizer[key].visible = false;
    });
    if (Array.isArray(visualizer.lines)) {
        visualizer.lines.forEach((line) => {
            line.visible = false;
        });
    }
}

function updateVisualizerSafely(data) {
    state.previewData = data;
    if (!visualizer) return;
    try {
        visualizer.updateLayout(data);
        ['markerPin', 'markerPsa', 'markerPap'].forEach((key) => {
            if (visualizer[key]) visualizer[key].visible = true;
        });
    } catch (error) {
        console.error('Failed to update Visualizer:', error);
        clearVisualizerLayout();
    }
}

function clearConverterResult(messageKey = 'warn_invalid_input') {
    renderOutputs([]);
    setWarning(
        dom.converterWarning,
        dom.converterWarningText,
        true,
        messageKey,
    );
    if (isViewActive('converter')) clearVisualizerLayout();
}

function clearAdjusterResult(messageKey = 'warn_invalid_input') {
    if (dom.papResultBox) {
        dom.papResultBox.classList.add('hidden');
        dom.papResultBox.setAttribute('aria-hidden', 'true');
    }
    if (dom.papResultValue) dom.papResultValue.textContent = '--';
    setWarning(dom.adjusterWarning, dom.adjusterWarningText, true, messageKey);
    if (isViewActive('pap-adjuster')) clearVisualizerLayout();
}

function updateTabAccessibility(activeTarget) {
    dom.tabs.forEach((tab) => {
        const isActive = tab.dataset.target === activeTarget;
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        tab.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    dom.views.forEach((view) => {
        view.setAttribute(
            'aria-hidden',
            view.id === activeTarget ? 'false' : 'true',
        );
    });
}

function setupAccessibility() {
    dom.tabs.forEach((tab, index) => {
        const target = tab.dataset.target;
        if (!target) return;
        tab.id = tab.id || `layout-tab-${index}`;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', target);
        const panel = document.getElementById(target);
        if (panel) {
            panel.setAttribute('role', 'tabpanel');
            panel.setAttribute('aria-labelledby', tab.id);
        }
    });

    const activeTab = Array.from(dom.tabs).find((tab) =>
        tab.classList.contains('active'),
    );
    updateTabAccessibility(activeTab ? activeTab.dataset.target : 'converter');

    [dom.converterWarning, dom.adjusterWarning].forEach((warning) => {
        if (!warning) return;
        warning.setAttribute('role', 'alert');
        warning.setAttribute('aria-live', 'assertive');
        warning.setAttribute('aria-atomic', 'true');
        warning.setAttribute(
            'aria-hidden',
            warning.classList.contains('hidden') ? 'true' : 'false',
        );
    });

    if (dom.targetOutputs) {
        dom.targetOutputs.setAttribute('role', 'status');
        dom.targetOutputs.setAttribute('aria-live', 'polite');
        dom.targetOutputs.setAttribute('aria-atomic', 'true');
    }
    if (dom.papResultBox) {
        dom.papResultBox.setAttribute('role', 'status');
        dom.papResultBox.setAttribute('aria-live', 'polite');
        dom.papResultBox.setAttribute('aria-atomic', 'true');
        dom.papResultBox.setAttribute(
            'aria-hidden',
            dom.papResultBox.classList.contains('hidden') ? 'true' : 'false',
        );
    }
}

// -- Initialization --
function init() {
    // Cache DOM elements
    dom = {
        tabs: document.querySelectorAll('.nav-tabs .nav-btn'),
        views: document.querySelectorAll('.view'),

        // Bowler Settings
        handSelect: document.getElementById('hand-select'),
        gripSelect: document.getElementById('grip-select'),
        gripModeStatus: document.getElementById('grip-mode-status'),

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
        converterWarning: document.getElementById('converter-warning'),
        converterWarningText: document.getElementById('converter-warning-text'),
        adjusterWarning: document.getElementById('adjuster-warning'),
        adjusterWarningText: document.getElementById('adjuster-warning-text'),
    };

    if (dom.handSelect && ['right', 'left'].includes(dom.handSelect.value)) {
        state.common.hand = dom.handSelect.value;
    }
    if (
        dom.gripSelect &&
        ['3finger', 'thumbless'].includes(dom.gripSelect.value)
    ) {
        state.common.grip = dom.gripSelect.value;
    }
    if (dom.sourceSystemSelect && SYSTEMS[dom.sourceSystemSelect.value]) {
        state.converter.sourceSystem = dom.sourceSystemSelect.value;
    }
    if (dom.targetSystemSelect && SYSTEMS[dom.targetSystemSelect.value]) {
        state.converter.targetSystem = dom.targetSystemSelect.value;
    }
    if (dom.adjusterSystemSelect && SYSTEMS[dom.adjusterSystemSelect.value]) {
        state.adjuster.system = dom.adjusterSystemSelect.value;
    }

    setupAccessibility();
    setupBowlerSettings();
    setupTabs();
    setupConverter();
    setupTranslationActions();
    setupPapAdjuster();
    applyGripMode(state.common.grip, { recalculate: false });
    window.addEventListener(
        'layoutadapter:languagechange',
        handleLanguageChange,
    );
    window.addEventListener('pagehide', (event) => {
        // Keep the live WebGL instance when the page is entering the back/forward cache.
        if (event.persisted) return;
        if (visualizer && typeof visualizer.dispose === 'function')
            visualizer.dispose();
        visualizer = null;
    });
    renderInputs(); // Initial render converter
    renderAdjusterInputs(); // Initial render adjuster

    // Initial PAP sync
    if (dom.convPapOver) {
        const value = parseFraction(dom.convPapOver.value, 'dist');
        state.converter.pap.over = isValueValidForUnit(value, 'dist')
            ? value
            : 5;
        dom.convPapOver.value = formatInputValueForUnit(
            state.converter.pap.over,
            'dist',
        );
        setInputValidity(dom.convPapOver, true);
    }
    if (dom.convPapUp) {
        const value = parseFraction(dom.convPapUp.value, 'dist');
        state.converter.pap.up = isPapUpValid(value) ? value : 1;
        dom.convPapUp.value = formatInputValueForUnit(
            state.converter.pap.up,
            'dist',
        );
        setInputValidity(dom.convPapUp, true);
    }
    if (dom.oldPapOver && !dom.oldPapOver.value.trim())
        dom.oldPapOver.value = '5';
    if (dom.oldPapUp && !dom.oldPapUp.value.trim()) dom.oldPapUp.value = '1';
    if (dom.newPapOver && !dom.newPapOver.value.trim())
        dom.newPapOver.value = '4 1/2';
    if (dom.newPapUp && !dom.newPapUp.value.trim()) dom.newPapUp.value = '1';
    [dom.oldPapOver, dom.oldPapUp, dom.newPapOver, dom.newPapUp].forEach(
        (input) => {
            if (input) setInputValidity(input, true);
        },
    );
    updatePapLabels(state.common.hand);
    calculateAdjuster();

    // Init Visualizer
    try {
        if (
            typeof THREE !== 'undefined' &&
            typeof BowlingVisualizer !== 'undefined'
        ) {
            visualizer = new BowlingVisualizer(null);

            // Initial attach to converter view
            const container = document.getElementById(
                'vis-container-converter',
            );
            if (container) visualizer.attachTo(container);

            // Update visualizer with current settings
            if (visualizer) {
                visualizer.setGripType(state.common.grip);
                visualizer.setHand(state.common.hand);
                recalculateActiveView();
            }
        }
    } catch (e) {
        console.error('Failed to initialize Visualizer:', e);
    }
}

// -- Bowler Settings --
function setupBowlerSettings() {
    if (dom.handSelect) {
        dom.handSelect.addEventListener('change', (e) => {
            state.common.hand = e.target.value;
            if (visualizer) visualizer.setHand(e.target.value);
            updatePapLabels(e.target.value);
            if (window.refreshDrillingChart) window.refreshDrillingChart();
        });
    }

    if (dom.gripSelect) {
        dom.gripSelect.addEventListener('change', (e) => {
            applyGripMode(e.target.value);
        });
    }
}

function updatePapLabels(hand) {
    // Update all PAP "Over" labels based on hand (right → / left ←)
    const suffix = hand === 'left' ? '_left' : '_right';

    // Converter PAP
    const convLabel = document.getElementById('conv-pap-over-label');
    if (convLabel) {
        convLabel.setAttribute('data-i18n', 'label_over' + suffix);
        convLabel.textContent = t('label_over' + suffix);
    }

    // PAP Adjuster - Old PAP
    const oldLabel = document.getElementById('old-pap-over-label');
    if (oldLabel) {
        oldLabel.setAttribute('data-i18n', 'label_old_pap_over' + suffix);
        oldLabel.textContent = t('label_old_pap_over' + suffix);
    }

    // PAP Adjuster - New PAP
    const newLabel = document.getElementById('new-pap-over-label');
    if (newLabel) {
        newLabel.setAttribute('data-i18n', 'label_new_pap_over' + suffix);
        newLabel.textContent = t('label_new_pap_over' + suffix);
    }
}

// -- Tabs Logic --
function setupTabs() {
    dom.tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            dom.tabs.forEach((t) => t.classList.remove('active'));
            dom.views.forEach((v) => v.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.target;
            const targetView = document.getElementById(target);
            if (!targetView) return;
            targetView.classList.add('active');
            updateTabAccessibility(target);

            // Move Visualizer to active view
            if (visualizer) {
                const containerId =
                    'vis-container-' +
                    (target === 'pap-adjuster' ? 'adjuster' : target);
                const container = document.getElementById(containerId);
                if (container) {
                    visualizer.attachTo(container);
                }
            }

            recalculateActiveView();
        });

        tab.addEventListener('keydown', (event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
                return;
            event.preventDefault();
            const tabs = Array.from(dom.tabs);
            const currentIndex = tabs.indexOf(tab);
            let nextIndex = currentIndex;
            if (event.key === 'ArrowLeft')
                nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            if (event.key === 'ArrowRight')
                nextIndex = (currentIndex + 1) % tabs.length;
            if (event.key === 'Home') nextIndex = 0;
            if (event.key === 'End') nextIndex = tabs.length - 1;
            tabs[nextIndex].focus();
            tabs[nextIndex].click();
        });
    });
}

function recalculateActiveView() {
    if (isViewActive('drilling')) {
        if (visualizer && state.previewData)
            updateVisualizerSafely(state.previewData);
        if (window.refreshDrillingChart) window.refreshDrillingChart();
    } else if (isViewActive('pap-adjuster')) calculateAdjuster();
    else calculateConversion();
}

function handleLanguageChange() {
    updatePapLabels(state.common.hand);
    updateGripModeStatus(state.common.grip);
    renderInputs({ preserveValues: true });
    renderAdjusterInputs({ preserveValues: true });
    calculateAdjuster();
}

// -- Converter Logic --
function setupConverter() {
    // System Selectors
    dom.sourceSystemSelect.addEventListener('change', (e) => {
        if (!SYSTEMS[e.target.value]) return;
        state.converter.sourceSystem = e.target.value;
        renderInputs();
    });

    dom.targetSystemSelect.addEventListener('change', (e) => {
        if (!SYSTEMS[e.target.value]) return;
        state.converter.targetSystem = e.target.value;
        calculateConversion();
    });

    // PAP Inputs
    dom.convPapOver.addEventListener('input', (e) => {
        state.converter.pap.over = parseFraction(e.target.value, 'dist');
        setInputValidity(e.target, isPapOverValid(state.converter.pap.over));
        calculateConversion();
    });
    dom.convPapUp.addEventListener('input', (e) => {
        state.converter.pap.up = parseFraction(e.target.value, 'dist');
        setInputValidity(e.target, isPapUpValid(state.converter.pap.up));
        calculateConversion();
    });
}

const TWO_LS_PRESETS = [
    { label: '1', values: [5.5, 5, 2] },
    { label: '2', values: [2, 6, 5] },
    { label: '3', values: [5, 4, 3.5] },
    { label: '4', values: [4.5, 3, 4.5] },
    { label: '5', values: [4, 4, 5] },
    { label: '6', values: [3.5, 4, 6.5] },
];

const DEFAULT_LAYOUTS = {
    dual_angle: {
        da_drill: 45,
        da_pin: 4.5,
        da_val: 30,
    },
    vls: {
        vls_pin: 4.5,
        vls_psa: 5,
        vls_buffer: 2,
    },
    '2ls': {
        '2ls_pin': 5.5,
        '2ls_psa': 5,
        '2ls_cg': 2,
    },
};

function getUnitConfig(unit) {
    if (unit === 'angle') return { min: 0, max: 90, step: 5 };
    return { min: 0, max: unit === 'cog' ? 13.5 : DIST_MAX, step: DIST_STEP };
}

function isValueValidForUnit(value, unit) {
    if (!Number.isFinite(value)) return false;
    const { min, max } = getUnitConfig(unit);
    return value >= min && value <= max;
}

function isPapOverValid(value) {
    return isValueValidForUnit(value, 'dist');
}

function isPapUpValid(value) {
    return Number.isFinite(value) && Math.abs(value) < DIST_MAX;
}

function isPapValid(pap) {
    return !!pap && isPapOverValid(pap.over) && isPapUpValid(pap.up);
}

function validatePinPapPsaGeometry(pin2pap, psa2pap) {
    if (
        !isValueValidForUnit(pin2pap, 'dist') ||
        !isValueValidForUnit(psa2pap, 'dist')
    ) {
        return false;
    }

    // The Pin and PSA are 90 degrees (6.75" of surface distance) apart.
    return (
        Math.abs(pin2pap - psa2pap) <= DIST_MAX + GEOMETRY_TOLERANCE &&
        pin2pap + psa2pap >= DIST_MAX - GEOMETRY_TOLERANCE
    );
}

function hasValidSystemFieldValues(system, inputs) {
    const config = SYSTEMS[system];
    if (!config || !inputs) return false;

    return config.fields.every(
        (field) =>
            Object.prototype.hasOwnProperty.call(inputs, field.id) &&
            isValueValidForUnit(inputs[field.id], field.unit),
    );
}

function isSystemInputValid(system, inputs, pap) {
    if (!isPapValid(pap) || !hasValidSystemFieldValues(system, inputs))
        return false;
    const values = SYSTEMS[system].fields.map((field) => inputs[field.id]);
    return window.LayoutMath.resolveLayout(system, values, pap).valid;
}

function resultToSystemInputs(system, result) {
    const config = SYSTEMS[system];
    if (!config || !result) return null;

    return config.fields.reduce((values, field, index) => {
        values[field.id] = result[`val${index + 1}`];
        return values;
    }, {});
}

function isSystemResultValid(system, result, pap) {
    if (!result || result.valid === false) return false;
    if (result.layout?.valid)
        return [result.val1, result.val2, result.val3].every(Number.isFinite);
    const inputs = resultToSystemInputs(system, result);
    return inputs !== null && isSystemInputValid(system, inputs, pap);
}

function snapToStep(value, unit) {
    const { min, max, step } = getUnitConfig(unit);
    const clamped = Math.max(min, Math.min(max, value));
    const steps = Math.round((clamped - min) / step);
    return min + steps * step;
}

function formatInputValueForUnit(value, unit) {
    if (!Number.isFinite(value)) return '';
    if (
        unit !== 'angle' &&
        Math.abs(value * 16 - Math.round(value * 16)) < 1e-9
    )
        return formatFraction(value).replace('"', '');
    return String(Number(value.toFixed(10)));
}

function formatSliderValue(value, unit) {
    if (!Number.isFinite(value)) return '--';
    if (unit === 'angle') return `${Math.round(value)}°`;
    return formatFraction(value);
}

function formatPlaceholderExample(value, unit) {
    return `${t('example_prefix')} ${formatInputValueForUnit(value, unit)}`;
}

function findSafeRange(unit, currentValue, isValidAt) {
    const { min, max, step } = getUnitConfig(unit);
    const stepsCount = Math.round((max - min) / step);
    const valid = new Array(stepsCount + 1).fill(false);

    for (let i = 0; i <= stepsCount; i++) {
        const value = min + i * step;
        valid[i] = !!isValidAt(value);
    }

    const segments = [];
    let segStart = -1;
    for (let i = 0; i <= stepsCount; i++) {
        if (valid[i] && segStart === -1) {
            segStart = i;
        } else if (!valid[i] && segStart !== -1) {
            segments.push({ start: segStart, end: i - 1 });
            segStart = -1;
        }
    }
    if (segStart !== -1) {
        segments.push({ start: segStart, end: stepsCount });
    }

    if (segments.length === 0) {
        return { min, max, step };
    }

    const currentIndex = Math.max(
        0,
        Math.min(stepsCount, Math.round((currentValue - min) / step)),
    );
    let selected = segments.find(
        (seg) => currentIndex >= seg.start && currentIndex <= seg.end,
    );

    if (!selected) {
        selected = segments.reduce((best, seg) => {
            const bestLen = best.end - best.start;
            const segLen = seg.end - seg.start;
            return segLen > bestLen ? seg : best;
        }, segments[0]);
    }

    return {
        min: min + selected.start * step,
        max: min + selected.end * step,
        step,
    };
}

function createSliderBinding({
    input,
    label,
    unit,
    getCurrentValue,
    getRange,
}) {
    const sliderWrap = document.createElement('div');
    sliderWrap.className = 'slider-wrap';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'value-slider';
    slider.id = `${input.id}-slider`;

    const valueLabel = document.createElement('div');
    valueLabel.className = 'slider-value';
    valueLabel.id = `${slider.id}-value`;

    if (label) {
        label.id = label.id || `${input.id}-label`;
        label.htmlFor = input.id;
        slider.setAttribute('aria-labelledby', label.id);
    }
    slider.setAttribute('aria-describedby', valueLabel.id);

    sliderWrap.appendChild(slider);
    sliderWrap.appendChild(valueLabel);
    input.insertAdjacentElement('afterend', sliderWrap);

    const binding = {
        input,
        slider,
        valueLabel,
        unit,
        getCurrentValue,
        getRange,
        updatingFromSlider: false,
    };
    sliderBindings.push(binding);

    slider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        binding.updatingFromSlider = true;
        input.value = formatInputValueForUnit(value, unit);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        binding.updatingFromSlider = false;
        valueLabel.textContent = formatSliderValue(value, unit);
        slider.setAttribute('aria-valuetext', valueLabel.textContent);
    });

    input.addEventListener('input', () => {
        if (!binding.updatingFromSlider) syncSliderBinding(binding);
    });

    syncSliderBinding(binding);
}

function syncSliderBinding(binding) {
    const { unit, slider, valueLabel, getCurrentValue, getRange } = binding;
    const cfg = getUnitConfig(unit);
    const currentValue = getCurrentValue();
    const current = Number.isFinite(currentValue) ? currentValue : cfg.min;
    const range = getRange ? getRange(current) : cfg;
    const expandedMin = Math.min(range.min, current);
    const expandedMax = Math.max(range.max, current);

    slider.min = `${expandedMin}`;
    slider.max = `${expandedMax}`;
    slider.step = `${range.step}`;

    const value = Math.max(
        expandedMin,
        Math.min(expandedMax, snapToStep(current, unit)),
    );
    slider.value = `${value}`;
    valueLabel.textContent = formatSliderValue(value, unit);
    slider.setAttribute('aria-valuetext', valueLabel.textContent);
}

function refreshSliders(scope) {
    sliderBindings.forEach((binding) => {
        if (!scope || binding.input.dataset.sliderScope === scope) {
            syncSliderBinding(binding);
        }
    });
}

function computeConverterResultForRange(src, tgt, inputs, pap) {
    const values = SYSTEMS[src].fields.map((field) => inputs[field.id]);
    return window.LayoutMath.translateLayout(src, tgt, values, pap);
}

function isConverterWarningFree(src, tgt, inputs, pap, result) {
    return (
        isSystemInputValid(src, inputs, pap) &&
        result &&
        result.valid !== false &&
        isSystemResultValid(tgt, result, pap)
    );
}

function isAdjusterInputValid(system, inputs, papOld) {
    return isSystemInputValid(system, inputs, papOld);
}

function getConverterSafeRange({ fieldId, unit, current }) {
    const base = getUnitConfig(unit);
    if (!fieldId) return base;
    const src = state.converter.sourceSystem;
    const tgt = state.converter.targetSystem;
    const keys = Object.keys(state.converter.inputs);
    if (
        keys.length < 3 ||
        keys.some((k) => !Number.isFinite(state.converter.inputs[k])) ||
        !isPapValid(state.converter.pap)
    )
        return base;

    const safeRange = findSafeRange(unit, current, (value) => {
        const inputs = { ...state.converter.inputs, [fieldId]: value };
        const pap = { ...state.converter.pap };
        const result = computeConverterResultForRange(src, tgt, inputs, pap);
        return isConverterWarningFree(src, tgt, inputs, pap, result);
    });

    return safeRange;
}

function getAdjusterSafeRange({ fieldId, unit, current }) {
    const base = getUnitConfig(unit);
    if (!fieldId) return base;
    const papOld = {
        over: parseFraction(dom.oldPapOver ? dom.oldPapOver.value : '', 'dist'),
        up: parseFraction(dom.oldPapUp ? dom.oldPapUp.value : '', 'dist'),
    };
    if (!isPapValid(papOld)) return base;

    const safeRange = findSafeRange(unit, current, (value) => {
        const inputs = { ...state.adjuster.inputs, [fieldId]: value };
        return isAdjusterInputValid(state.adjuster.system, inputs, papOld);
    });

    return safeRange;
}

function renderInputs({ preserveValues = false } = {}) {
    const systemKey = state.converter.sourceSystem;
    const fields = SYSTEMS[systemKey].fields;
    const defaults = DEFAULT_LAYOUTS[systemKey] || {};
    const previousValues = { ...state.converter.inputs };
    const previousPresetValue = preserveValues
        ? document.getElementById('2ls-preset-select')?.value || ''
        : '';
    const previousTextValues = fields.reduce((values, field) => {
        const existingInput = document.getElementById(`input-${field.id}`);
        if (existingInput) values[field.id] = existingInput.value;
        return values;
    }, {});

    dom.sourceInputs.innerHTML = '';
    sliderBindings = sliderBindings.filter(
        (binding) => binding.input.dataset.sliderScope !== 'converter-input',
    );
    state.converter.inputs = {};

    // Inject 2LS Presets if applicable
    if (systemKey === '2ls') {
        const presetWrapper = document.createElement('div');
        presetWrapper.className = 'field';
        presetWrapper.style.marginBottom = '1rem';

        const label = document.createElement('label');
        label.textContent = t('preset_label');

        const select = document.createElement('select');
        select.id = '2ls-preset-select';
        label.htmlFor = select.id;
        select.innerHTML = `<option value="">${t('preset_custom')}</option>`;
        TWO_LS_PRESETS.forEach((p, i) => {
            select.innerHTML += `<option value="${i}">${p.label} · ${p.values.map((v) => formatFraction(v)).join(' × ')}</option>`;
        });
        if (previousPresetValue) select.value = previousPresetValue;

        select.addEventListener('change', (e) => {
            const idx = e.target.value;
            if (idx !== '') {
                const vals = TWO_LS_PRESETS[idx].values;
                // Update input element values
                const pinInput = document.getElementById('input-2ls_pin');
                const psaInput = document.getElementById('input-2ls_psa');
                const cgInput = document.getElementById('input-2ls_cg');

                if (pinInput)
                    pinInput.value = formatFraction(vals[0]).replace('"', '');
                if (psaInput)
                    psaInput.value = formatFraction(vals[1]).replace('"', '');
                if (cgInput)
                    cgInput.value = formatFraction(vals[2]).replace('"', '');

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

    fields.forEach((field) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'field';

        const label = document.createElement('label');
        label.textContent = t(field.labelKey);

        const input = document.createElement('input');
        input.type = 'text';
        input.inputMode = field.unit === 'angle' ? 'numeric' : 'text';
        input.dataset.sliderScope = 'converter-input';

        input.id = `input-${field.id}`;
        label.id = `${input.id}-label`;
        label.htmlFor = input.id;

        // Initialize with sample layout so visualization starts in valid state.
        const defaultValue = defaults[field.id] ?? 0;
        const hasPreviousValue =
            preserveValues &&
            Object.prototype.hasOwnProperty.call(previousValues, field.id);
        const currentValue = hasPreviousValue
            ? previousValues[field.id]
            : defaultValue;
        state.converter.inputs[field.id] = currentValue;
        input.placeholder = formatPlaceholderExample(defaultValue, field.unit);
        input.value =
            preserveValues &&
            Object.prototype.hasOwnProperty.call(previousTextValues, field.id)
                ? previousTextValues[field.id]
                : formatInputValueForUnit(currentValue, field.unit);
        setInputValidity(input, isValueValidForUnit(currentValue, field.unit));

        input.addEventListener('input', (e) => {
            state.converter.inputs[field.id] = parseFraction(
                e.target.value,
                field.unit,
            );
            setInputValidity(
                e.target,
                isValueValidForUnit(
                    state.converter.inputs[field.id],
                    field.unit,
                ),
            );
            // If user types manually, deselect preset dropdown
            const presetSelect = document.getElementById('2ls-preset-select');
            if (presetSelect && presetSelect.value !== '')
                presetSelect.value = '';
            calculateConversion();
        });

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        createSliderBinding({
            input,
            label,
            unit: field.unit,
            getCurrentValue: () => state.converter.inputs[field.id],
            getRange: (current) =>
                getConverterSafeRange({
                    fieldId: field.id,
                    unit: field.unit,
                    current,
                }),
        });
        dom.sourceInputs.appendChild(wrapper);
    });

    // Initial Calc
    calculateConversion();
}

// -- PAP ADJUSTER LOGIC --

function renderAdjusterInputs({ preserveValues = false } = {}) {
    const systemKey = state.adjuster.system;
    const fields = SYSTEMS[systemKey].fields;
    const defaults = DEFAULT_LAYOUTS[systemKey] || {};
    const previousValues = { ...state.adjuster.inputs };
    const previousPresetValue = preserveValues
        ? document.getElementById('adj-2ls-preset-select')?.value || ''
        : '';
    const previousTextValues = fields.reduce((values, field) => {
        const existingInput = document.getElementById(`adj-input-${field.id}`);
        if (existingInput) values[field.id] = existingInput.value;
        return values;
    }, {});

    dom.adjusterInputs.innerHTML = '';
    sliderBindings = sliderBindings.filter(
        (binding) => binding.input.dataset.sliderScope !== 'adjuster-input',
    );
    state.adjuster.inputs = {};

    // Inject 2LS Presets for Adjuster if applicable
    if (systemKey === '2ls') {
        const presetWrapper = document.createElement('div');
        presetWrapper.className = 'field';
        presetWrapper.style.marginBottom = '1rem';

        const label = document.createElement('label');
        label.textContent = t('preset_label');

        const select = document.createElement('select');
        select.id = 'adj-2ls-preset-select';
        label.htmlFor = select.id;
        select.innerHTML = `<option value="">${t('preset_custom')}</option>`;
        TWO_LS_PRESETS.forEach((p, i) => {
            select.innerHTML += `<option value="${i}">${p.label} · ${p.values.map((v) => formatFraction(v)).join(' × ')}</option>`;
        });
        if (previousPresetValue) select.value = previousPresetValue;

        select.addEventListener('change', (e) => {
            const idx = e.target.value;
            if (idx !== '') {
                const vals = TWO_LS_PRESETS[idx].values;
                // Update input element values
                const pinInput = document.getElementById('adj-input-2ls_pin');
                const psaInput = document.getElementById('adj-input-2ls_psa');
                const cgInput = document.getElementById('adj-input-2ls_cg');

                if (pinInput)
                    pinInput.value = formatFraction(vals[0]).replace('"', '');
                if (psaInput)
                    psaInput.value = formatFraction(vals[1]).replace('"', '');
                if (cgInput)
                    cgInput.value = formatFraction(vals[2]).replace('"', '');

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

    fields.forEach((field) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'field';

        const label = document.createElement('label');
        label.textContent = t(field.labelKey);

        const input = document.createElement('input');
        input.type = 'text';
        input.id = `adj-input-${field.id}`;
        input.dataset.sliderScope = 'adjuster-input';
        input.inputMode = field.unit === 'angle' ? 'numeric' : 'text';
        label.id = `${input.id}-label`;
        label.htmlFor = input.id;

        input.addEventListener('input', (e) => {
            state.adjuster.inputs[field.id] = parseFraction(
                e.target.value,
                field.unit,
            );
            setInputValidity(
                e.target,
                isValueValidForUnit(
                    state.adjuster.inputs[field.id],
                    field.unit,
                ),
            );
            // If user types manually, deselect preset dropdown
            const presetSelect = document.getElementById(
                'adj-2ls-preset-select',
            );
            if (presetSelect && presetSelect.value !== '')
                presetSelect.value = '';

            calculateAdjuster(); // Auto calc
        });

        const defaultValue = defaults[field.id] ?? 0;
        const hasPreviousValue =
            preserveValues &&
            Object.prototype.hasOwnProperty.call(previousValues, field.id);
        const currentValue = hasPreviousValue
            ? previousValues[field.id]
            : defaultValue;
        state.adjuster.inputs[field.id] = currentValue;
        input.placeholder = formatPlaceholderExample(defaultValue, field.unit);
        input.value =
            preserveValues &&
            Object.prototype.hasOwnProperty.call(previousTextValues, field.id)
                ? previousTextValues[field.id]
                : formatInputValueForUnit(currentValue, field.unit);
        setInputValidity(input, isValueValidForUnit(currentValue, field.unit));

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        createSliderBinding({
            input,
            label,
            unit: field.unit,
            getCurrentValue: () => state.adjuster.inputs[field.id],
            getRange: (current) =>
                getAdjusterSafeRange({
                    fieldId: field.id,
                    unit: field.unit,
                    current,
                }),
        });
        dom.adjusterInputs.appendChild(wrapper);
    });
}

function setupPapAdjuster() {
    dom.adjusterSystemSelect.addEventListener('change', (e) => {
        if (!SYSTEMS[e.target.value]) return;
        state.adjuster.system = e.target.value;
        renderAdjusterInputs();
        dom.papResultBox.classList.add('hidden');
        dom.papResultBox.setAttribute('aria-hidden', 'true');
        calculateAdjuster(); // Try calc if all inputs are somehow ready or just to clear
    });

    dom.oldPapOver.addEventListener('input', calculateAdjuster);
    dom.oldPapUp.addEventListener('input', calculateAdjuster);
    dom.newPapOver.addEventListener('input', calculateAdjuster);
    dom.newPapUp.addEventListener('input', calculateAdjuster);
}

function calculateAdjuster() {
    const papOld = {
        over: parseFraction(dom.oldPapOver.value, 'dist'),
        up: parseFraction(dom.oldPapUp.value, 'dist'),
    };
    const papNew = {
        over: parseFraction(dom.newPapOver.value, 'dist'),
        up: parseFraction(dom.newPapUp.value, 'dist'),
    };
    [
        [dom.oldPapOver, isPapOverValid(papOld.over)],
        [dom.oldPapUp, isPapUpValid(papOld.up)],
        [dom.newPapOver, isPapOverValid(papNew.over)],
        [dom.newPapUp, isPapUpValid(papNew.up)],
    ].forEach(([el, valid]) => setInputValidity(el, valid));
    updateSystemHelp();
    const system = state.adjuster.system;
    const values = SYSTEMS[system].fields.map(
        (field) => state.adjuster.inputs[field.id],
    );
    const old = window.LayoutMath.resolveLayout(system, values, papOld);
    state.adjuster.resultText = '';
    const copy = document.getElementById('copy-pap-result');
    if (copy) copy.disabled = true;
    if (!old.valid || !isPapValid(papNew)) {
        clearAdjusterResult();
        refreshSliders('adjuster-input');
        return;
    }
    const adjusted = calculatePapAdjustment(papOld, old, papNew);
    if (!adjusted.valid) {
        clearAdjusterResult();
        refreshSliders('adjuster-input');
        return;
    }
    const layout = {
        valid: true,
        drill: adjusted.drillSigned,
        pin: adjusted.pin,
        val: adjusted.valSigned,
        conventional: adjusted.orientationConventional,
    };
    const result = window.LayoutMath.translateResolved(layout, system, papNew);
    const fallback = !result.valid;
    const text = fallback
        ? t('standard_unavailable')
        : formatLayoutText(system, [result.val1, result.val2, result.val3]);
    state.adjuster.resultText = text;
    dom.papResultValue.textContent = state.adjuster.resultText;
    dom.papResultBox.classList.remove('hidden');
    dom.papResultBox.setAttribute('aria-hidden', 'false');
    if (copy) copy.disabled = fallback;
    setWarning(
        dom.adjusterWarning,
        dom.adjusterWarningText,
        fallback,
        'warn_orientation_loss',
    );
    if (isViewActive('pap-adjuster'))
        updateVisualizerSafely({
            system: 'dual_angle',
            p1: layout.drill,
            p2: layout.pin,
            p3: layout.val,
            pap: papNew,
            oldPap: papOld,
        });
    refreshSliders('adjuster-input');
}

// -- CORE CONVERSION LOGIC --

function calculateConversion() {
    const {
        sourceSystem: src,
        targetSystem: tgt,
        inputs,
        pap,
    } = state.converter;
    updateSystemHelp();
    SYSTEMS[src].fields.forEach((field) =>
        setInputValidity(
            document.getElementById('input-' + field.id),
            isValueValidForUnit(inputs[field.id], field.unit),
        ),
    );
    const copy = document.getElementById('copy-result');
    const swap = document.getElementById('swap-systems');
    const status = document.getElementById('conversion-status');
    state.converter.lastResult = null;
    if (copy) copy.disabled = true;
    if (swap) swap.disabled = true;
    if (status) status.textContent = '';
    if (!isSystemInputValid(src, inputs, pap)) {
        clearConverterResult();
        refreshSliders('converter-input');
        return;
    }
    const result = computeConverterResultForRange(src, tgt, inputs, pap);
    const layout = result.layout;
    if (!result.valid && !result.layout?.valid) {
        clearConverterResult();
        refreshSliders('converter-input');
        return;
    }
    state.converter.lastResult = result;
    if (copy) copy.disabled = !result.valid;
    if (swap) swap.disabled = !result.valid;
    if (!result.valid) {
        dom.targetOutputs.innerHTML = '';
        const fallback = document.createElement('div');
        fallback.className = 'fallback-result';
        const label = document.createElement('span');
        label.className = 'fallback-label';
        label.textContent = t('standard_unavailable');
        fallback.appendChild(label);
        dom.targetOutputs.appendChild(fallback);
        setWarning(
            dom.converterWarning,
            dom.converterWarningText,
            true,
            'warn_orientation_loss',
        );
    } else {
        renderOutputs([result.val1, result.val2, result.val3]);
        setWarning(dom.converterWarning, dom.converterWarningText, false);
        if (status) status.textContent = t('result_ready');
    }
    if (isViewActive('converter'))
        updateVisualizerSafely({
            system: 'dual_angle',
            p1: layout.drill,
            p2: layout.pin,
            p3: layout.val,
            pap,
        });
    refreshSliders('converter-input');
}

/**
 * Validates that layout values are geometrically possible.
 * Checks:
 * 1. All distances are within physical limits (0 to ~6.75 inches for ball surface)
 * 2. Angles are within valid range (0-90 degrees)
 * 3. Triangle inequality for pin-pap-grip triangle
 * 4. NaN or undefined values
 * @returns true if valid, false if suspicious
 */
function validateLayoutGeometry(pin2pap, pin2cog, papOver, papUp) {
    if (
        !isPapValid({ over: papOver, up: papUp }) ||
        !isValueValidForUnit(pin2pap, 'dist') ||
        !isValueValidForUnit(pin2cog, 'dist')
    )
        return false;

    // Triangle inequality check
    const papOverRad = radFromInch(papOver);
    const papUpRad = radFromInch(papUp);
    const cosDist = cos(papOverRad) * cos(papUpRad);
    const pap2grip = inchFromRad(acos(Math.max(-1, Math.min(1, cosDist))));
    if (!Number.isFinite(pap2grip)) return false;

    const minPinCog = abs(pin2pap - pap2grip);
    const maxPinCog = Math.min(pin2pap + pap2grip, DIST_MAX);

    if (
        pin2cog < minPinCog - GEOMETRY_TOLERANCE ||
        pin2cog > maxPinCog + GEOMETRY_TOLERANCE
    )
        return false;

    return true;
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
        label.id = `output-${field.id}-label`;

        const display = document.createElement('div');
        display.className = 'read-only-field';
        display.setAttribute('aria-labelledby', label.id);

        // FORMATTING LOGIC APPLIED HERE
        let formattedValue = '--';
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

function formatLayoutText(system, values) {
    return values
        .map((value, i) =>
            system === 'dual_angle' && i !== 1
                ? formatAngle(value)
                : formatFraction(value),
        )
        .join(' × ');
}
function updateSystemHelp() {
    [
        ['source-help', state.converter.sourceSystem],
        ['target-help', state.converter.targetSystem],
        ['adjuster-help', state.adjuster.system],
    ].forEach(([id, system]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = t('help_' + system);
    });
}
let toastTimer;
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.hidden = true), 3500);
}
async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast(t('copied'));
    } catch {
        showToast(t('copy_failed'));
    }
}
function setupTranslationActions() {
    document.getElementById('swap-systems')?.addEventListener('click', () => {
        const result = state.converter.lastResult;
        if (!result?.valid) return;
        const nextSource = state.converter.targetSystem,
            nextTarget = state.converter.sourceSystem;
        state.converter.sourceSystem = nextSource;
        state.converter.targetSystem = nextTarget;
        dom.sourceSystemSelect.value = nextSource;
        dom.targetSystemSelect.value = nextTarget;
        state.converter.inputs = resultToSystemInputs(nextSource, result);
        // Remove obsolete text so the exact computed numbers populate the new controls.
        dom.sourceInputs.innerHTML = '';
        renderInputs({ preserveValues: true });
    });
    document.getElementById('copy-result')?.addEventListener('click', () => {
        const result = state.converter.lastResult;
        if (!result) return;
        if (!result.valid) return;
        const system = state.converter.targetSystem;
        copyText(
            SYSTEMS[system].name +
                ': ' +
                formatLayoutText(system, [
                    result.val1,
                    result.val2,
                    result.val3,
                ]),
        );
    });
    document
        .getElementById('copy-pap-result')
        ?.addEventListener('click', () => {
            if (state.adjuster.resultText) copyText(state.adjuster.resultText);
        });
    document
        .querySelectorAll('[data-open-drilling]')
        .forEach((button) =>
            button.addEventListener('click', () =>
                document.getElementById('tab-drilling').click(),
            ),
        );
    document
        .querySelectorAll('[data-camera]')
        .forEach((button) =>
            button.addEventListener('click', () =>
                visualizer?.setCameraView(button.dataset.camera),
            ),
        );
}

document.addEventListener('DOMContentLoaded', init);
