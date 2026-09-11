const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("all static form controls have an associated label", () => {
    const html = read("index.html");
    const labelTargets = new Set(
        [...html.matchAll(/<label\b[^>]*\bfor="([^"]+)"[^>]*>/g)].map(match => match[1])
    );
    const controls = [...html.matchAll(/<(?:input|select)\b[^>]*\bid="([^"]+)"[^>]*>/g)]
        .map(match => match[1]);

    assert.ok(controls.length > 0);
    controls.forEach(id => assert.ok(labelTargets.has(id), `missing label for #${id}`));
});

test("tabs, panels, results, and warnings expose state semantics", () => {
    const html = read("index.html");
    assert.match(html, /role="tablist"/);
    assert.equal((html.match(/role="tab"/g) || []).length, 3);
    assert.equal((html.match(/role="tabpanel"/g) || []).length, 3);
    assert.match(html, /id="target-outputs"[^>]*role="status"[^>]*aria-live="polite"/);
    assert.match(html, /id="pap-result"[^>]*role="status"[^>]*aria-live="polite"/);
    assert.match(html, /id="grip-mode-status"[^>]*role="status"[^>]*aria-live="polite"/);
    assert.equal((html.match(/role="alert"/g) || []).length, 3);
});

test("Bundled 3D scripts are pinned with SRI and visible fallbacks", () => {
    const html = read("index.html");
    const externalScripts = [...html.matchAll(/<script\b[^>]*src="vendor\/[^>]+><\/script>/g)]
        .map(match => match[0]);
    assert.equal(externalScripts.length, 2);
    externalScripts.forEach(script => {
        assert.match(script, /integrity="sha512-[^"]+"/);
        assert.match(script, /crossorigin="anonymous"/);
    });
    assert.equal((html.match(/class="vis-fallback"/g) || []).length, 3);
    assert.match(html, /<noscript>/);
});

test("language changes update document metadata and notify dynamic UI", () => {
    const source = read("i18n.js");
    assert.match(source, /document\.documentElement\.lang\s*=\s*currentLang/);
    assert.match(source, /layoutadapter:languagechange/);
    assert.match(source, /new CustomEvent/);
    [
        "grip_mode_3finger",
        "grip_mode_thumbless",
        "example_prefix",
        "vis_error_dependency",
        "vis_error_webgl",
        "vis_error_data",
        "legend_cog",
        "legend_old_pap",
        "legend_finger_holes",
        "legend_thumb_hole",
        "vis_grip_3finger",
        "vis_grip_thumbless"
    ].forEach(key => {
        assert.equal((source.match(new RegExp(`"?${key}"?:`, "g")) || []).length, 2, `${key} must exist in EN and KO`);
    });
});

test("grip selection preserves layout systems and recalculates both tools", () => {
    const source = read("app.js");
    const gripMode = source.match(/function applyGripMode[\s\S]*?\n}/)?.[0] || "";
    assert.match(source, /applyGripMode\(e\.target\.value\)/);
    assert.match(gripMode, /calculateConversion\(\)/);
    assert.match(gripMode, /calculateAdjuster\(\)/);
    assert.doesNotMatch(gripMode, /state\.converter\.(?:sourceSystem|targetSystem)\s*=/);
    assert.doesNotMatch(gripMode, /state\.adjuster\.system\s*=/);
    assert.doesNotMatch(source, /option\.disabled\s*=.*2ls/);
});

test("mobile layout stacks form rows and reduced-motion is supported", () => {
    const css = read("style.css");
    assert.match(
        css,
        /@media\s*\(max-width:\s*768px\)[\s\S]*?\.form-row\s*\{[\s\S]*?grid-template-columns:\s*1fr\s*;/
    );
    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    assert.match(css, /\.sr-only\s*\{/);
    assert.match(css, /\.vis-fallback\s*\{/);
    assert.match(css, /input\[aria-invalid=['"]true['"]\]\s*\{/);
});

test("visualizer uses on-demand rendering and owns disposable resources", () => {
    const source = read("visualizer.js");
    assert.doesNotMatch(source, /\.slerp\s*\(/);
    assert.doesNotMatch(source, /requestAnimationFrame\s*\(\s*\(\)\s*=>\s*this\.animate/);
    assert.match(source, /interpolateGreatCircle/);
    assert.match(source, /Number\.isFinite\(valSigned\)\s*\?\s*valSigned\s*:\s*daVal/);
    assert.match(source, /disposeLines\(\)/);
    assert.match(source, /clearLayout\(\)/);
    assert.match(source, /geometry\.dispose\(\)/);
    assert.match(source, /material\.dispose\(\)/);
    assert.match(source, /ResizeObserver/);
    assert.match(source, /VIS_MAX_PIXEL_RATIO\s*=\s*2/);
    assert.match(source, /VIS_THUMB_RING_COLOR\s*=\s*0xfb923c/);
    assert.match(source, /VIS_PRIMARY_MARKER_RADIUS\s*=\s*0\.25/);
    assert.match(source, /VIS_SECONDARY_MARKER_RADIUS\s*=\s*0\.125/);
    assert.match(source, /gripFillLight\.position\.set\(0,\s*-8,\s*12\)/);
    assert.match(source, /this\.updateLegend\(\)/);

    const css = read("style.css");
    assert.match(css, /\.vis-overlay \.grip-indicator\s*\{/);
    assert.match(css, /\.legend-dot\s*\{[\s\S]*?border-radius:\s*50%/);
});

test("page lifecycle cleanup preserves the back-forward cache", () => {
    const source = read("app.js");
    assert.match(source, /addEventListener\('pagehide',\s*\(event\)\s*=>/);
    assert.match(source, /if\s*\(event\.persisted\)\s*return/);
    assert.match(source, /visualizer\.dispose\(\)/);
});
