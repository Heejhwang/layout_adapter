const translations = {
    en: {
        document_title: 'Bowling Layout Translator',
        document_description:
            'Translate bowling layout systems and PAP coordinates, with a personalized drilling chart and 3D preview.',
        app_title: 'Layout Translator',
        tab_converter: 'System Translator',
        tab_adjuster: 'PAP Translator',
        tab_visualizer: '3D View',
        sec_converter_title: 'Same layout. Different language.',
        sec_converter_desc:
            'Translate between Dual Angle, VLS and 2LS. See the numbers and their positions on the ball as you type.',
        pap_common_title: 'Your PAP',
        label_over_right: 'Over (Right)',
        label_over_left: 'Over (Left)',
        label_up: 'Up (+) / Down (-)',
        grp_source: 'Original',
        grp_target: 'Translation',
        label_system: 'System',
        sys_dual_angle: 'Dual Angle',
        sys_vls: 'Pin Buffer (VLS)',
        sys_2ls: '2LS',
        fld_da_drill: 'Drilling Angle',
        fld_da_pin: 'Pin to PAP',
        fld_da_val: 'VAL Angle',
        fld_vls_pin: 'Pin to PAP',
        fld_vls_psa: 'PSA to PAP',
        fld_vls_buffer: 'Pin Buffer',
        fld_2ls_pin: 'Pin to PAP',
        fld_2ls_psa: 'PSA to PAP',
        fld_2ls_cg: 'Pin to Center of Grip',
        sec_adj_title: 'Read it with your PAP.',
        sec_adj_desc:
            'Enter the original layout and PAP, then a new PAP. Pin and PSA stay in place; only the reference point changes.',
        grp_initial: 'Original reference',
        grp_new: 'New PAP',
        label_old_pap_over_right: 'Old PAP (Right)',
        label_old_pap_over_left: 'Old PAP (Left)',
        label_old_pap_up: 'Old PAP Up (+) / Down (-)',
        label_new_pap_over_right: 'New PAP (Right)',
        label_new_pap_over_left: 'New PAP (Left)',
        label_new_pap_up: 'New PAP Up (+) / Down (-)',
        label_orig_layout: 'Original Layout',
        label_adj_result: 'Adjusted Layout:',
        preset_label: 'Storm 2LS examples',
        preset_custom: 'Custom',
        example_prefix: 'e.g.',
        opt_right_hand: 'Right-handed',
        opt_left_hand: 'Left-handed',
        opt_3finger: '3-Finger',
        opt_thumbless: 'Thumbless',
        label_hand: 'Hand',
        label_grip: 'Grip type',
        grip_mode_3finger:
            '3-finger · Measure PAP from the grip center between the fingers and thumb.',
        grip_mode_thumbless:
            'No thumb · Measure PAP from the bridge center between the two fingers.',
        aria_main_tabs: 'Main tools',
        action_switch_to_en: 'Switch to English',
        action_switch_to_ko: 'Switch to Korean',
        sec_vis_title: '3D preview',
        aria_visualizer_canvas: '3D bowling ball layout preview',
        vis_canvas_description:
            'A visual preview of the Pin, PSA, PAP, COG, finger holes, a thumb hole in 3-Finger mode, and reference arcs. Numeric layout values are available next to this preview.',
        vis_loading: 'Loading the 3D preview...',
        vis_error_dependency:
            'The 3D preview could not load its required library. The numeric converter is still available.',
        vis_error_webgl:
            'The 3D preview is unavailable because WebGL could not be initialized. The numeric converter is still available.',
        vis_error_data: 'The 3D preview is unavailable for the current values.',
        vis_error_controls:
            'The 3D preview is visible, but rotation controls are unavailable.',
        legend_pin: 'Pin',
        legend_psa: 'PSA',
        legend_pap: 'PAP',
        legend_cog: 'COG',
        legend_old_pap: 'Old PAP',
        legend_finger_holes: 'Finger holes',
        legend_thumb_hole: 'Thumb hole',
        vis_grip_3finger: '3-Finger',
        vis_grip_thumbless: 'Thumbless',
        warn_invalid_input:
            'Check your inputs. A value is empty, out of range, or the distances cannot form this layout.',
        warn_unusual_output: 'Warning: Layout values are unusual.',
        tab_drilling: 'Drilling chart',
        pap_help: 'Measured from the center of grip (COG) · inches',
        help_dual_angle: 'Drilling angle × Pin–PAP distance × VAL angle',
        help_vls: 'Pin–PAP distance × PSA–PAP distance × Pin buffer',
        help_2ls: 'Pin–PAP distance × PSA–PAP distance × Pin–COG distance',
        guide_eyebrow: 'READING A LAYOUT',
        guide_title: 'Different numbers. The same positions.',
        guide_body:
            'Three systems describe the same reference points. The third 2LS value is the distance to the grip center, so it depends on your PAP.',
        help_pin: 'The marker at the top of the core',
        help_psa:
            'Preferred spin axis. For a symmetric core, use the reference 6¾ inches from the Pin.',
        help_val: 'Vertical axis line through the PAP',
        help_cog: 'Center of grip, distinct from center of gravity (CG)',
        help_pap: 'The point on the ball that marks your initial rotation axis after release. Enter your measured PAP.',
        help_buffer: 'The shortest surface distance from the Pin to the VAL.',
        term_pin: 'Pin',
        term_buffer: 'Pin buffer',
        source_korean: 'Korean drilling guide',
        action_swap: 'Swap source and target systems',
        action_copy: 'Copy result',
        copied: 'Copied.',
        copy_failed: 'Could not copy. Select and copy the result manually.',
        view_front: 'Front',
        view_reset: 'Reset view',
        vis_interaction:
            'Drag to rotate · Scroll to zoom · Arrow keys to rotate',
        open_drilling: 'Set grip dimensions →',
        precision_note:
            'Distances display to 1/16 inch and angles to 0.1°. Calculations and 3D use unrounded values.',
        result_ready: 'Translated automatically',
        warn_orientation_loss:
            'This placement may be valid, but the selected system cannot express the same orientation in standard notation. Use the original system and the 3D preview.',
        pap_preserve_note:
            'This remeasures an existing ball using a new PAP. It does not design a redrill that guarantees the same ball motion.',
        drill_desc: 'Enter your grip measurements to update every 3D preview.',
        drill_reset: 'Reset to example',
        drill_print: 'Print chart',
        drill_dimensions: 'Grip dimensions',
        unit_inches: 'Units: inches',
        drill_defaults:
            'Blank fields use a no-offset example: middle span 4″ · ring span 4″ · bridge ¼″.',
        middle_span: 'Middle span',
        ring_span: 'Ring span',
        drill_bridge: 'Bridge',
        drill_item: 'Measurement',
        finger_middle: 'Middle',
        finger_ring: 'Ring',
        finger_thumb: 'Thumb',
        drill_span_help:
            'Span and bridge are measured along the ball surface between the closest opening edges, not between hole centers.',
        drill_diameter: 'Hole diameter',
        drill_depth: 'Hole depth',
        drill_lateral: 'Lateral pitch',
        drill_forward: 'Front/back pitch',
        drill_pitch_help:
            'Pitches are in inches. From the right-hand front view: left (−), right (+), toward fingers (+), toward thumb (−). Left-handed geometry is mirrored.',
        drill_fit_note:
            'Defaults illustrate an adult fingertip grip, not a personal fitting. Diameters describe round gripping holes without inserts. Confirm dimensions and pitches with your driller. Measurements are saved only in this browser.',
        drill_diagram_label: 'Drilling chart with span and bridge dimensions',
        drill_diagram_note:
            'Front projection · Dimensions follow the surface · Ball diameter about 8.594″',
        drill_applied: 'Chart applied to all 3D previews.',
        drill_invalid:
            'Check the dimensions. 3D is hidden until the chart is valid.',
        drill_span_invalid:
            'These spans and bridge cannot locate the thumb. Check the difference between the spans.',
        drill_depth_note:
            'Storm 2LS recommends finger depths of 2¾ inches or less.',
        footer_note: 'Spherical geometry calculator · Pin–PSA reference: 90°',
        source_storm: 'Storm layout resources',
        source_usbc: 'USBC specifications',
        middle_Diameter: 'Middle Hole diameter',
        middle_Depth: 'Middle Hole depth',
        middle_Lateral: 'Middle Lateral pitch',
        middle_Forward: 'Middle front/back pitch',
        ring_Diameter: 'Ring Hole diameter',
        ring_Depth: 'Ring Hole depth',
        ring_Lateral: 'Ring Lateral pitch',
        ring_Forward: 'Ring front/back pitch',
        thumb_Diameter: 'Thumb Hole diameter',
        thumb_Depth: 'Thumb Hole depth',
        thumb_Lateral: 'Thumb Lateral pitch',
        thumb_Forward: 'Thumb front/back pitch',
        standard_unavailable: 'No equivalent standard notation.',
        drill_defaults_thumbless:
            'Blank fields use example values: bridge ¼″ · finger diameter ⅞″ · finger depth 2½″.',
    },
    ko: {
        document_title: '레이아웃 번역기',
        document_description:
            '볼링 레이아웃과 PAP 기준을 바꾸어 계산하고, 지공차트와 3D로 볼 위의 배치를 확인하세요.',
        app_title: '레이아웃 번역기',
        tab_converter: '시스템 번역기',
        tab_adjuster: 'PAP 번역기',
        tab_visualizer: '3D 보기',
        sec_converter_title: '레이아웃 표기 바꾸기',
        sec_converter_desc:
            'PAP와 레이아웃 값을 입력하면 듀얼 앵글, VLS, 2LS 사이의 표기를 계산하고 볼 위의 배치를 3D로 보여줍니다.',
        pap_common_title: '내 PAP',
        label_over_right: '오른쪽(오버)',
        label_over_left: '왼쪽(오버)',
        label_up: '업(+) / 다운(−)',
        grp_source: '기존 레이아웃',
        grp_target: '번역 결과',
        label_system: '레이아웃 시스템',
        sys_dual_angle: '듀얼 앵글',
        sys_vls: 'VLS · 핀 버퍼',
        sys_2ls: '2LS',
        fld_da_drill: '드릴 앵글',
        fld_da_pin: '핀–PAP 거리',
        fld_da_val: 'VAL 앵글',
        fld_vls_pin: '핀–PAP 거리',
        fld_vls_psa: 'PSA–PAP 거리',
        fld_vls_buffer: '핀 버퍼',
        fld_2ls_pin: '핀–PAP 거리',
        fld_2ls_psa: 'PSA–PAP 거리',
        fld_2ls_cg: '핀–COG 거리',
        sec_adj_title: '새 PAP 기준으로 확인하기',
        sec_adj_desc:
            '기존 PAP와 레이아웃을 입력한 뒤 새 PAP를 넣어 주세요. 볼의 핀과 PSA 위치를 유지한 채 새 PAP 기준의 레이아웃을 계산합니다.',
        grp_initial: '기존 PAP와 레이아웃',
        grp_new: '새 PAP',
        label_old_pap_over_right: '기존 오른쪽(오버)',
        label_old_pap_over_left: '기존 왼쪽(오버)',
        label_old_pap_up: '기존 업(+) / 다운(−)',
        label_new_pap_over_right: '새 오른쪽(오버)',
        label_new_pap_over_left: '새 왼쪽(오버)',
        label_new_pap_up: '새 업(+) / 다운(−)',
        label_orig_layout: '기존 레이아웃',
        label_adj_result: '새 PAP 기준 레이아웃',
        preset_label: '스톰 2LS 예시',
        preset_custom: '직접 입력',
        example_prefix: '예:',
        opt_right_hand: '오른손',
        opt_left_hand: '왼손',
        opt_3finger: '쓰리핑거',
        opt_thumbless: '덤리스',
        label_hand: '사용 손',
        label_grip: '지공 형태',
        grip_mode_3finger:
            '쓰리핑거 · 엄지를 사용하는 지공입니다. PAP는 핑거홀과 엄지홀 사이의 그립센터를 기준으로 입력합니다.',
        grip_mode_thumbless:
            '덤리스 · 엄지를 사용하지 않는 지공입니다. PAP는 두 핑거홀 사이의 브릿지 중심을 기준으로 입력합니다.',
        aria_main_tabs: '주요 도구',
        action_switch_to_en: '영어로 전환',
        action_switch_to_ko: '한국어로 전환',
        sec_vis_title: '3D 미리보기',
        aria_visualizer_canvas: '볼링공 레이아웃 3D 미리보기',
        vis_canvas_description:
            '핀, PSA, PAP, 그립센터와 지공홀의 위치를 보여줍니다. 쓰리핑거는 엄지홀을 포함한 3개 홀, 덤리스는 핑거홀 2개를 표시합니다.',
        vis_loading: '3D 미리보기를 불러오는 중입니다...',
        vis_error_dependency:
            '3D 화면을 불러오지 못했습니다. 레이아웃 계산은 계속 사용할 수 있습니다.',
        vis_error_webgl:
            '이 브라우저에서는 3D 화면을 표시할 수 없습니다. 레이아웃 계산은 계속 사용할 수 있습니다.',
        vis_error_data: '입력값을 확인하면 3D 미리보기가 표시됩니다.',
        vis_error_controls:
            '3D 미리보기는 표시되지만 회전 조작은 사용할 수 없습니다.',
        legend_pin: '핀',
        legend_psa: 'PSA',
        legend_pap: 'PAP',
        legend_cog: '그립센터',
        legend_old_pap: '기존 PAP',
        legend_finger_holes: '핑거홀',
        legend_thumb_hole: '엄지홀',
        vis_grip_3finger: '쓰리핑거',
        vis_grip_thumbless: '덤리스',
        warn_invalid_input:
            '입력값을 확인해 주세요. 빈칸이나 입력 범위를 벗어난 값이 있거나, 거리 조합이 맞지 않습니다.',
        warn_unusual_output:
            '선택한 방식으로 레이아웃을 표기할 수 없습니다. 입력한 거리와 PAP를 확인해 주세요.',
        tab_drilling: '지공차트',
        pap_help: '그립센터에서 가로·세로 거리 · 인치',
        help_dual_angle: '드릴 앵글 × 핀–PAP 거리 × VAL 앵글',
        help_vls: '핀–PAP 거리 × PSA–PAP 거리 × 핀 버퍼',
        help_2ls: '핀–PAP 거리 × PSA–PAP 거리 × 핀–그립센터 거리',
        guide_eyebrow: '레이아웃 용어',
        guide_title: '기준점과 거리 알아보기',
        guide_body:
            '듀얼 앵글은 각도와 거리로, VLS와 2LS는 세 가지 거리로 레이아웃을 표기합니다. VLS의 마지막 값은 핀 버퍼, 2LS의 마지막 값은 핀에서 그립센터까지의 거리입니다.',
        help_pin: '볼 표면에서 코어의 방향을 알려 주는 표시입니다.',
        help_psa:
            '비대칭 볼의 매스 바이어스(MB) 표식을 기준으로 합니다. 대칭 볼은 핀에서 6¾인치 떨어진 기준점을 사용합니다.',
        help_val: 'PAP를 지나는 세로 기준선입니다. VAL 앵글과 핀 버퍼를 잴 때 사용합니다.',
        help_cog: '손가락으로 잡는 부분의 중심인 그립센터입니다. 쓰리핑거는 핑거홀과 엄지홀 사이, 덤리스는 브릿지 중심입니다. 볼의 무게중심인 CG와 구분합니다.',
        help_pap: '릴리스 직후 볼이 회전하는 축의 기준점입니다. 볼러마다 달라 직접 측정한 값을 입력합니다.',
        help_buffer: '핀에서 VAL까지 잰 가장 짧은 표면 거리입니다.',
        term_pin: '핀(Pin)',
        term_buffer: '핀 버퍼',
        source_korean: '한국어 지공 설명',
        action_swap: '기존 레이아웃과 결과의 표기 방식 맞바꾸기',
        action_copy: '결과 복사',
        copied: '복사했습니다.',
        copy_failed: '복사하지 못했습니다. 결과를 선택해 복사해 주세요.',
        view_front: '정면',
        view_reset: '시점 초기화',
        vis_interaction: '드래그로 회전 · 휠로 확대·축소 · 방향키로 회전',
        open_drilling: '지공 치수 설정 →',
        precision_note:
            '거리는 1/16인치, 각도는 0.1°로 표시합니다. 계산과 3D에는 반올림 전 값을 사용합니다.',
        result_ready: '계산 완료',
        warn_orientation_loss:
            '선택한 표기 방식으로는 같은 위치를 나타낼 수 없습니다. 3D에는 입력한 레이아웃의 배치를 표시합니다.',
        pap_preserve_note:
            '기존 볼의 핀·PSA 위치를 유지한 채 새 PAP에서 잰 수치입니다.',
        drill_desc: '스팬, 브릿지, 홀 사이즈와 피치를 입력하면 지공차트와 3D에 함께 반영됩니다.',
        drill_reset: '예시 치수로 초기화',
        drill_print: '차트 인쇄',
        drill_dimensions: '지공 치수',
        unit_inches: '단위: 인치',
        drill_defaults:
            '빈칸에는 옵셋 없는 예시 치수를 적용합니다: 중지·약지 스팬 4″ · 브릿지 ¼″.',
        middle_span: '중지 스팬',
        ring_span: '약지 스팬',
        drill_bridge: '브릿지',
        drill_item: '항목',
        finger_middle: '중지',
        finger_ring: '약지',
        finger_thumb: '엄지',
        drill_span_help:
            '스팬(스판)은 핑거홀과 엄지홀의 가까운 가장자리 사이 거리입니다. 브릿지는 두 핑거홀 사이의 간격이며, 모두 볼 표면을 따라 잽니다.',
        drill_diameter: '홀 사이즈',
        drill_depth: '홀 깊이',
        drill_lateral: '좌우 피치',
        drill_forward: '전후 피치',
        drill_pitch_help:
            '피치는 홀의 기울기를 인치로 나타낸 값입니다. 좌우는 오른손 정면 기준 레프트(−)·라이트(+)입니다. 전후는 핑거 쪽(+)·엄지 쪽(−)으로 기울어지는 방향이며, 왼손은 좌우가 반전됩니다.',
        drill_fit_note:
            '예시 치수는 성인 핑거팁 그립 기준이며 개인 피팅값은 아닙니다. 홀 사이즈는 인서트 없는 원형 홀 기준입니다. 실제 지공 전에는 프로샵에서 스팬과 피치를 확인하세요. 입력한 치수는 이 브라우저에 저장됩니다.',
        drill_diagram_label: '스팬과 브릿지 치수가 표시된 지공차트',
        drill_diagram_note:
            '정면에서 본 모습 · 치수는 볼 표면 기준 · 볼 지름 약 8.594″',
        drill_applied: '입력한 치수를 지공차트와 3D에 반영했습니다.',
        drill_invalid:
            '입력한 치수로는 지공홀을 배치할 수 없습니다. 치수를 확인하면 3D 미리보기가 표시됩니다.',
        drill_span_invalid:
            '두 스팬과 브릿지 값으로 엄지홀을 배치할 수 없습니다. 중지·약지 스팬의 차이를 확인해 주세요.',
        drill_depth_note:
            '스톰 2LS는 핑거홀 깊이를 2¾인치 이하로 권장합니다.',
        footer_note: '볼 표면의 거리와 각도 계산 · 핀–PSA 간격 90° 기준',
        source_storm: '스톰 레이아웃 자료',
        source_usbc: 'USBC 규격',
        middle_Diameter: '중지 홀 사이즈',
        middle_Depth: '중지 홀 깊이',
        middle_Lateral: '중지 좌우 피치',
        middle_Forward: '중지 전후 피치',
        ring_Diameter: '약지 홀 사이즈',
        ring_Depth: '약지 홀 깊이',
        ring_Lateral: '약지 좌우 피치',
        ring_Forward: '약지 전후 피치',
        thumb_Diameter: '엄지 홀 사이즈',
        thumb_Depth: '엄지 홀 깊이',
        thumb_Lateral: '엄지 좌우 피치',
        thumb_Forward: '엄지 전후 피치',
        standard_unavailable: '선택한 방식으로 표기할 수 없습니다.',
        drill_defaults_thumbless:
            '빈칸에는 예시 치수를 적용합니다: 브릿지 ¼″ · 핑거홀 사이즈 ⅞″ · 깊이 2½″.',
    },
};

let currentLang = 'ko';

function t(key) {
    return (
        (translations[currentLang] && translations[currentLang][key]) ||
        (translations.en && translations.en[key]) ||
        key
    );
}

function updateTexts() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
        el.setAttribute(
            'aria-label',
            t(el.getAttribute('data-i18n-aria-label')),
        );
    });

    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
        el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });

    document.documentElement.lang = currentLang;
    const description = document.getElementById('document-description');
    if (description)
        description.setAttribute('content', t('document_description'));
}

function updateLanguageButton(btn) {
    if (!btn) return;
    const targetKey =
        currentLang === 'ko' ? 'action_switch_to_en' : 'action_switch_to_ko';
    btn.textContent = currentLang === 'ko' ? 'English' : '한국어';
    btn.setAttribute('data-i18n-aria-label', targetKey);
    btn.setAttribute('aria-label', t(targetKey));
}

function setLayoutAdapterLanguage(lang, { emit = true } = {}) {
    currentLang = translations[lang] ? lang : 'en';
    updateTexts();
    updateLanguageButton(document.getElementById('lang-toggle'));

    if (emit) {
        const detail = { lang: currentLang };
        document.dispatchEvent(
            new CustomEvent('layoutadapter:languagechange', { detail }),
        );
        window.dispatchEvent(
            new CustomEvent('layoutadapter:languagechange', { detail }),
        );
    }
}

window.t = t;
window.setLayoutAdapterLanguage = setLayoutAdapterLanguage;
window.getLayoutAdapterLanguage = () => currentLang;

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('lang-toggle');
    setLayoutAdapterLanguage(currentLang, { emit: false });
    if (!btn) return;

    btn.addEventListener('click', () => {
        setLayoutAdapterLanguage(currentLang === 'ko' ? 'en' : 'ko');
    });
});
