const translations = {
    en: {
        app_title: "Layout Adapter",
        tab_converter: "Layout Converter",
        tab_adjuster: "PAP Adjuster",
        tab_visualizer: "3D View",

        sec_converter_title: "Layout Conversion",
        sec_converter_desc: "Convert between Dual Angle, VLS, and 2LS systems.",

        pap_common_title: "Bowler's PAP (Common)",
        label_over_right: "Over (Right)",
        label_over_left: "Over (Left)",
        label_up: "Up",

        grp_source: "Source Layout",
        grp_target: "Target Layout",
        label_system: "System",

        sys_dual_angle: "Dual Angle",
        sys_vls: "Pin Buffer (VLS)",
        sys_2ls: "2LS",

        fld_da_drill: "Drilling Angle",
        fld_da_pin: "Pin to PAP",
        fld_da_val: "VAL Angle",

        fld_vls_pin: "Pin to PAP",
        fld_vls_psa: "PSA to PAP",
        fld_vls_buffer: "Pin Buffer",

        fld_2ls_pin: "Pin to PAP",
        fld_2ls_psa: "PSA to PAP",
        fld_2ls_cg: "Pin to COG",

        sec_adj_title: "PAP Adjustment",
        sec_adj_desc: "Recalculate layout based on new Positive Axis Point.",

        grp_initial: "Initial Data",
        grp_new: "New Parameters",

        label_old_pap_over_right: "Old PAP (Right)",
        label_old_pap_over_left: "Old PAP (Left)",
        label_old_pap_up: "Old PAP Up",

        label_new_pap_over_right: "New PAP (Right)",
        label_new_pap_over_left: "New PAP (Left)",
        label_new_pap_up: "New PAP Up",

        label_orig_layout: "Original Layout",
        label_adj_result: "Adjusted Layout:",

        preset_label: "Preset",
        preset_custom: "Custom",

        opt_right_hand: "Right-handed",
        opt_left_hand: "Left-handed",
        opt_3finger: "3-Finger",
        opt_thumbless: "Thumbless",

        sec_vis_title: "3D Layout Preview",

        warn_invalid_input: "Warning: Layout values are geometrically invalid.",
        warn_unusual_output: "Warning: Layout values are unusual."
    },
    ko: {
        app_title: "레이아웃 어댑터",
        tab_converter: "레이아웃 변환",
        tab_adjuster: "PAP 조정",
        tab_visualizer: "3D 보기",

        sec_converter_title: "레이아웃 변환",
        sec_converter_desc: "Dual Angle, VLS, 2LS 간 레이아웃을 변환합니다.",

        pap_common_title: "볼러 PAP (공통)",
        label_over_right: "오버(오른쪽)",
        label_over_left: "오버(왼쪽)",
        label_up: "업",

        grp_source: "원본 레이아웃",
        grp_target: "변환 레이아웃",
        label_system: "시스템",

        sys_dual_angle: "듀얼 앵글",
        sys_vls: "핀 버퍼 (VLS)",
        sys_2ls: "2LS",

        fld_da_drill: "드릴 각도",
        fld_da_pin: "Pin to PAP",
        fld_da_val: "VAL 각도",

        fld_vls_pin: "Pin to PAP",
        fld_vls_psa: "PSA to PAP",
        fld_vls_buffer: "핀 버퍼",

        fld_2ls_pin: "Pin to PAP",
        fld_2ls_psa: "PSA to PAP",
        fld_2ls_cg: "Pin to COG",

        sec_adj_title: "PAP 조정",
        sec_adj_desc: "새 PAP 기준으로 기존 레이아웃을 재계산합니다.",

        grp_initial: "기존 데이터",
        grp_new: "새 파라미터",

        label_old_pap_over_right: "기존 PAP(오른쪽)",
        label_old_pap_over_left: "기존 PAP(왼쪽)",
        label_old_pap_up: "기존 PAP 업",

        label_new_pap_over_right: "새 PAP(오른쪽)",
        label_new_pap_over_left: "새 PAP(왼쪽)",
        label_new_pap_up: "새 PAP 업",

        label_orig_layout: "기존 레이아웃",
        label_adj_result: "조정된 레이아웃:",

        preset_label: "프리셋",
        preset_custom: "직접 입력",

        opt_right_hand: "오른손",
        opt_left_hand: "왼손",
        opt_3finger: "3핑거",
        opt_thumbless: "덤리스",

        sec_vis_title: "3D 레이아웃 미리보기",

        warn_invalid_input: "경고: 레이아웃 값이 기하적으로 불가능합니다.",
        warn_unusual_output: "경고: 레이아웃 값이 일반적이지 않습니다."
    }
};

let currentLang = "ko";

function t(key) {
    return (translations[currentLang] && translations[currentLang][key]) ||
        (translations.en && translations.en[key]) ||
        key;
}

function updateTexts() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        el.textContent = t(key);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("lang-toggle");
    if (!btn) return;

    updateTexts();
    btn.textContent = currentLang === "ko" ? "English" : "한국어";

    btn.addEventListener("click", () => {
        currentLang = currentLang === "ko" ? "en" : "ko";
        btn.textContent = currentLang === "ko" ? "English" : "한국어";
        updateTexts();
    });
});
