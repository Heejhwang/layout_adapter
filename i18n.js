/**
 * Internationalization (i18n) Logic
 */

const TRANSLATIONS = {
    en: {
        app_title: "Layout Adapter",
        tab_converter: "Layout Converter",
        tab_adjuster: "PAP Adjuster",
        sec_converter_title: "Layout Conversion",
        sec_converter_desc: "Convert between Dual Angle, VLS, and 2LS systems.",
        pap_common_title: "Bowler's PAP (Common)",
        label_over: "Over (→)",
        label_up: "Up (↑)",
        label_system: "System",
        grp_source: "Source Layout",
        grp_target: "Target Layout",
        sec_adj_title: "PAP Adjustment",
        sec_adj_desc: "Recalculate layout based on new Positive Axis Point.",
        grp_initial: "Initial Data",
        grp_new: "New Parameters",
        label_old_pap_over: "Old PAP (Over →)",
        label_old_pap_up: "Old PAP (Up ↑)",
        label_new_pap_over: "New PAP (Over →)",
        label_new_pap_up: "New PAP (Up ↑)",
        label_orig_layout: "Original Layout Parameters",
        label_adj_result: "Adjusted Layout",
        preset_label: "Select Preset (Optional)",
        preset_custom: "-- Custom / Manual --",

        // System Names
        sys_dual_angle: "Dual Angle",
        sys_vls: "Pin Buffer (VLS)",
        sys_2ls: "2LS",

        // Field Labels
        fld_da_drill: "Drilling Angle",
        fld_da_pin: "Pin to PAP",
        fld_da_val: "VAL Angle",
        fld_vls_pin: "Pin to PAP",
        fld_vls_psa: "PSA to PAP",
        fld_vls_buffer: "Pin Buffer",
        fld_2ls_pin: "Pin to PAP",
        fld_2ls_psa: "PSA to PAP",
        fld_2ls_cg: "Pin to COG"
    },
    ko: {
        app_title: "레이아웃 어댑터",
        tab_converter: "레이아웃 변환기",
        tab_adjuster: "PAP 조정기",
        sec_converter_title: "레이아웃 변환",
        sec_converter_desc: "듀얼 앵글, VLS, 2LS 시스템 간 변환을 지원합니다.",
        pap_common_title: "볼러 PAP (공통)",
        label_over: "Over (→)",
        label_up: "Up (↑)",
        label_system: "시스템",
        grp_source: "원본 레이아웃",
        grp_target: "대상 레이아웃",
        sec_adj_title: "PAP 조정",
        sec_adj_desc: "새로운 PAP를 기준으로 레이아웃을 다시 계산합니다.",
        grp_initial: "초기 데이터",
        grp_new: "새로운 파라미터",
        label_old_pap_over: "기존 PAP (Over →)",
        label_old_pap_up: "기존 PAP (Up ↑)",
        label_new_pap_over: "새 PAP (Over →)",
        label_new_pap_up: "새 PAP (Up ↑)",
        label_orig_layout: "기존 레이아웃 파라미터",
        label_adj_result: "조정된 레이아웃",
        preset_label: "프리셋 선택 (선택사항)",
        preset_custom: "-- 직접 입력 --",

        // System Names
        sys_dual_angle: "듀얼 앵글 (Dual Angle)",
        sys_vls: "핀 버퍼 (VLS)",
        sys_2ls: "2LS",

        // Field Labels
        fld_da_drill: "드릴링 앵글 (Drilling Angle)",
        fld_da_pin: "핀-PAP 거리 (Pin to PAP)",
        fld_da_val: "VAL 앵글 (VAL Angle)",
        fld_vls_pin: "핀-PAP 거리 (Pin to PAP)",
        fld_vls_psa: "PSA-PAP 거리 (PSA to PAP)",
        fld_vls_buffer: "핀 버퍼 (Pin Buffer)",
        fld_2ls_pin: "핀-PAP 거리 (Pin to PAP)",
        fld_2ls_psa: "PSA-PAP 거리 (PSA to PAP)",
        fld_2ls_cg: "핀-COG 거리 (Pin to COG)"
    }
};

let currentLang = 'en';

function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    currentLang = lang;
    document.documentElement.lang = lang;

    // Update static elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (TRANSLATIONS[lang][key]) {
            el.textContent = TRANSLATIONS[lang][key];
        }
    });

    // Notify app to re-render dynamic inputs (to update labels)
    if (typeof renderInputs === 'function') renderInputs();
    if (typeof renderAdjusterInputs === 'function') renderAdjusterInputs();

    // Update button state
    updateLangBtnState();
}

function t(key) {
    return TRANSLATIONS[currentLang][key] || key;
}

function toggleLanguage() {
    const newLang = currentLang === 'en' ? 'ko' : 'en';
    setLanguage(newLang);
}

function updateLangBtnState() {
    const btn = document.getElementById('lang-toggle');
    if (btn) {
        btn.textContent = currentLang === 'en' ? '한국어' : 'English';
    }
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    // Add event listener to toggle button
    const btn = document.getElementById('lang-toggle');
    if (btn) {
        btn.addEventListener('click', toggleLanguage);
        updateLangBtnState(); // Set initial label
    }
});
