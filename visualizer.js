/**
 * Accessible, on-demand Three.js bowling layout visualizer.
 */

const VIS_EPSILON = 1e-8;
const VIS_MAX_PIXEL_RATIO = 2;
const VIS_HOLE_CENTER_COLOR = 0x020617;
const VIS_FINGER_RING_COLOR = 0xcbd5e1;
const VIS_THUMB_RING_COLOR = 0xfb923c;
const VIS_PRIMARY_MARKER_RADIUS = 0.25;
const VIS_SECONDARY_MARKER_RADIUS = 0.125;

const VIS_FALLBACK_TEXT = {
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
};

function visText(key) {
    if (typeof window !== 'undefined' && typeof window.t === 'function') {
        return window.t(key);
    }
    return VIS_FALLBACK_TEXT[key] || key;
}

class BowlingVisualizer {
    constructor(containerId) {
        this.container = containerId
            ? document.getElementById(containerId)
            : null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.ballMesh = null;
        this.group = null;
        this.holes = null;
        this.markerPin = null;
        this.markerPsa = null;
        this.markerPap = null;
        this.markerCog = null;
        this.markerOldPap = null;
        this.lines = [];

        this.u = window.BowlingUtils || {};
        this.math = window.LayoutMath || {};
        this.currentHand = 'right';
        this.currentGripType = '3finger';
        this.isAdjusterMode = false;
        this.failureKey = null;
        this.controlsUnavailable = false;
        this.renderFrame = null;
        this.needsVisibleRender = false;
        this.disposed = false;
        this.resizeObserver = null;

        this.handleWindowResize = () => this.resize();
        this.handleControlsChange = () => this.requestRender();
        this.handleVisibilityChange = () => {
            if (!document.hidden && this.needsVisibleRender) {
                this.needsVisibleRender = false;
                this.requestRender();
            }
        };
        this.handleLanguageChange = () => {
            this.updateCanvasAccessibility();
            this.updateLegend();
            if (this.failureKey) {
                this.showFallback(this.failureKey);
            } else if (this.controlsUnavailable) {
                this.showFallback('vis_error_controls', true);
            }
        };

        this.installLifecycleListeners();
        this.init();
    }

    installLifecycleListeners() {
        window.addEventListener('resize', this.handleWindowResize);
        document.addEventListener(
            'visibilitychange',
            this.handleVisibilityChange,
        );
        document.addEventListener(
            'layoutadapter:languagechange',
            this.handleLanguageChange,
        );

        if (typeof window.ResizeObserver === 'function') {
            this.resizeObserver = new window.ResizeObserver(() =>
                this.resize(),
            );
            if (this.container) this.resizeObserver.observe(this.container);
        }
    }

    init() {
        if (typeof THREE === 'undefined') {
            this.setFailure('vis_error_dependency');
            return;
        }

        try {
            this.scene = new THREE.Scene();
            this.scene.background = null;

            this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
            this.camera.position.set(0, 0, 17);

            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
            });
            this.renderer.setPixelRatio(this.getPixelRatio());
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.prepareCanvas();

            const ambLight = new THREE.AmbientLight(0xffffff, 0.5);
            this.scene.add(ambLight);

            const pointLight = new THREE.PointLight(0xffffff, 1);
            pointLight.position.set(10, 10, 10);
            this.scene.add(pointLight);

            // Keep the lower-front grip area readable without flattening the ball.
            const gripFillLight = new THREE.PointLight(0x93c5fd, 0.9);
            gripFillLight.position.set(0, -8, 12);
            this.scene.add(gripFillLight);

            const rimLight = new THREE.SpotLight(0x4455ff, 2);
            rimLight.position.set(-10, 5, -10);
            this.scene.add(rimLight);

            this.group = new THREE.Group();
            this.scene.add(this.group);

            const radius = this.math.R;
            const ballGeometry = new THREE.SphereGeometry(radius, 96, 64);
            const ballMaterial = new THREE.MeshPhysicalMaterial({
                color: 0x253e70,
                roughness: 0.28,
                metalness: 0.05,
                clearcoat: 1.0,
                clearcoatRoughness: 0.1,
            });
            this.ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
            this.group.add(this.ballMesh);

            this.addHoles(radius);
            this.addMarkers();

            if (THREE.OrbitControls) {
                this.controls = new THREE.OrbitControls(
                    this.camera,
                    this.renderer.domElement,
                );
                // On-demand rendering cannot use a perpetual damping loop.
                this.controls.enableDamping = false;
                this.controls.enablePan = false;
                this.controls.minDistance = 10;
                this.controls.maxDistance = 32;
                this.controls.addEventListener(
                    'change',
                    this.handleControlsChange,
                );
            } else {
                this.controlsUnavailable = true;
            }

            if (this.container) this.attachTo(this.container);
            this.requestRender();
        } catch (error) {
            this.setFailure('vis_error_webgl', error);
        }
    }

    getPixelRatio() {
        return Math.min(window.devicePixelRatio || 1, VIS_MAX_PIXEL_RATIO);
    }

    prepareCanvas() {
        if (!this.renderer || !this.renderer.domElement) return;
        const canvas = this.renderer.domElement;
        if (canvas.classList) canvas.classList.add('vis-canvas');
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('tabindex', '0');
        canvas.addEventListener('keydown', (event) => {
            if (
                ![
                    'ArrowLeft',
                    'ArrowRight',
                    'ArrowUp',
                    'ArrowDown',
                    'Home',
                ].includes(event.key)
            )
                return;
            event.preventDefault();
            if (event.key === 'Home') {
                this.setCameraView('front');
                return;
            }
            const horizontal =
                event.key === 'ArrowLeft' || event.key === 'ArrowRight';
            const axis = new THREE.Vector3(
                horizontal ? 0 : 1,
                horizontal ? 1 : 0,
                0,
            );
            const sign =
                event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? 1 : -1;
            this.camera.position.applyAxisAngle(axis, sign * 0.12);
            this.camera.lookAt(0, 0, 0);
            if (this.controls) this.controls.update();
            this.requestRender();
        });
        this.updateCanvasAccessibility();
    }

    updateCanvasAccessibility() {
        if (!this.renderer || !this.renderer.domElement) return;
        const canvas = this.renderer.domElement;
        canvas.setAttribute('aria-label', visText('aria_visualizer_canvas'));
        if (this.container) {
            const description =
                this.container.querySelector('.vis-description');
            if (description && description.id) {
                canvas.setAttribute('aria-describedby', description.id);
            } else {
                canvas.removeAttribute('aria-describedby');
            }
        }
    }

    addMarkers() {
        const markerGeometry = new THREE.CircleGeometry(
            VIS_PRIMARY_MARKER_RADIUS,
            32,
        );

        this.markerPin = new THREE.Mesh(
            markerGeometry,
            new THREE.MeshBasicMaterial({
                color: 0xfacc15,
                side: THREE.DoubleSide,
            }),
        );
        this.markerPin.position.set(1, 2, 3.7);
        this.markerPin.lookAt(0, 0, 0);
        this.group.add(this.markerPin);

        this.markerPsa = new THREE.Mesh(
            markerGeometry.clone(),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                side: THREE.DoubleSide,
            }),
        );
        this.markerPsa.position.set(-1.5, 3, 2.5);
        this.markerPsa.lookAt(0, 0, 0);
        this.group.add(this.markerPsa);

        const papGeometry = new THREE.CircleGeometry(
            VIS_SECONDARY_MARKER_RADIUS,
            32,
        );
        this.markerPap = new THREE.Mesh(
            papGeometry,
            new THREE.MeshBasicMaterial({
                color: 0x10b981,
                side: THREE.DoubleSide,
            }),
        );
        this.markerPap.position.set(2, 0.5, 3.8);
        this.markerPap.lookAt(0, 0, 0);
        this.group.add(this.markerPap);

        this.markerCog = new THREE.Mesh(
            papGeometry.clone(),
            new THREE.MeshBasicMaterial({
                color: 0xf472b6,
                side: THREE.DoubleSide,
            }),
        );
        this.positionOnBall(this.markerCog, 0, 0, this.math.R);
        this.group.add(this.markerCog);

        this.markerOldPap = new THREE.Mesh(
            papGeometry.clone(),
            new THREE.MeshBasicMaterial({
                color: 0x64748b,
                side: THREE.DoubleSide,
            }),
        );
        this.markerOldPap.position.set(2.5, 0.3, 3.5);
        this.markerOldPap.lookAt(0, 0, 0);
        this.markerOldPap.visible = false;
        this.group.add(this.markerOldPap);
    }

    addHoles() {
        if (!window.DrillingMath) return;
        this.setDrillingChart(
            window.DrillingMath.resolve({}, this.currentGripType),
        );
    }

    positionOnBall(object, xInch, yInch, radius = window.LayoutMath.R) {
        const longitude = xInch / radius;
        const latitude = yInch / radius;
        const surfaceRadius = radius * 1.002;
        object.position.set(
            surfaceRadius * Math.cos(latitude) * Math.sin(longitude),
            surfaceRadius * Math.sin(latitude),
            surfaceRadius * Math.cos(latitude) * Math.cos(longitude),
        );
        object.lookAt(0, 0, 0);
    }

    setGripType(gripType) {
        if (gripType !== '3finger' && gripType !== 'thumbless') return false;
        this.currentGripType = gripType;
        if (window.DrillingMath)
            this.setDrillingChart(
                window.DrillingMath.resolve(
                    this.drilling?.chart || {},
                    gripType,
                ),
            );
        this.updateLegend();
        this.requestRender();
        return true;
    }

    setCameraView(view) {
        if (!this.camera) return;
        if (view === 'top') this.camera.position.set(0, 19, 0.01);
        else if (view === 'reset')
            this.camera.position.set(
                this.currentHand === 'left' ? -4 : 4,
                3,
                18,
            );
        else this.camera.position.set(0, 0, 18);
        this.camera.lookAt(0, 0, 0);
        if (this.controls) this.controls.update();
        this.requestRender();
    }

    disposeHoles() {
        if (!this.holeGroup) return;
        this.group.remove(this.holeGroup);
        this.holeGroup.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) object.material.dispose();
        });
        this.holeGroup = null;
    }

    setDrillingChart(resolved) {
        this.drillingValid = !!resolved?.valid;
        if (!this.drillingValid) {
            this.clearLayout();
            return false;
        }
        if (!this.ballMesh || !this.group) return false;
        this.drilling = resolved;
        this.disposeHoles();
        this.holeGroup = new THREE.Group();
        this.group.add(this.holeGroup);
        this.holes = {};
        const holes = resolved.holes;
        const uniforms = {
            drillCenters: {
                value: [0, 1, 2].map(
                    (i) =>
                        new THREE.Vector3(...(holes[i]?.center || [0, 0, 0])),
                ),
            },
            drillAxes: {
                value: [0, 1, 2].map(
                    (i) => new THREE.Vector3(...(holes[i]?.axis || [0, 0, -1])),
                ),
            },
            drillRadii: { value: [0, 1, 2].map((i) => holes[i]?.radius || 0) },
            drillDepths: { value: [0, 1, 2].map((i) => holes[i]?.depth || 0) },
        };
        this.drillUniforms = uniforms;
        const header =
            'varying vec3 vDrillLocal; uniform vec3 drillCenters[3]; uniform vec3 drillAxes[3]; uniform float drillRadii[3]; uniform float drillDepths[3];';
        const inside = (index) =>
            'vec3 q' +
            index +
            ' = vDrillLocal-drillCenters[' +
            index +
            ']; float t' +
            index +
            ' = dot(q' +
            index +
            ',drillAxes[' +
            index +
            ']); if (drillRadii[' +
            index +
            '] > 0.0 && t' +
            index +
            ' >= -0.5 && t' +
            index +
            ' <= drillDepths[' +
            index +
            '] && dot(q' +
            index +
            ',q' +
            index +
            ')-t' +
            index +
            '*t' +
            index +
            ' < drillRadii[' +
            index +
            ']*drillRadii[' +
            index +
            ']-0.000001) discard;';
        const applyShader = (material, skip = -1) => {
            material.onBeforeCompile = (shader) => {
                Object.assign(shader.uniforms, uniforms);
                shader.vertexShader =
                    'varying vec3 vDrillLocal;\n' + shader.vertexShader;
                shader.vertexShader = shader.vertexShader.replace(
                    '#include <begin_vertex>',
                    '#include <begin_vertex>\nvDrillLocal=transformed;',
                );
                shader.fragmentShader = header + '\n' + shader.fragmentShader;
                const cut = [0, 1, 2]
                    .filter((i) => i !== skip)
                    .map(inside)
                    .join('\n');
                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <clipping_planes_fragment>',
                    '#include <clipping_planes_fragment>\n' +
                        (skip >= 0
                            ? 'if(length(vDrillLocal)>' +
                              resolved.radius.toFixed(10) +
                              ') discard;\n'
                            : '') +
                        cut,
                );
            };
            material.customProgramCacheKey = () => 'drilled-ball-v2-' + skip;
            material.needsUpdate = true;
        };
        applyShader(this.ballMesh.material);
        holes.forEach((hole, index) => {
            const center = new THREE.Vector3(...hole.center),
                axis = new THREE.Vector3(...hole.axis);
            const u = BowlingVisualizer.orthogonalUnit(axis),
                v = new THREE.Vector3().crossVectors(axis, u).normalize();
            const positions = [],
                normals = [],
                colors = [],
                rim = [];
            const segments = 80;
            const point = (angle, depth) =>
                center
                    .clone()
                    .add(axis.clone().multiplyScalar(depth))
                    .add(
                        u.clone().multiplyScalar(hole.radius * Math.cos(angle)),
                    )
                    .add(
                        v.clone().multiplyScalar(hole.radius * Math.sin(angle)),
                    );
            const normal = (angle) =>
                u
                    .clone()
                    .multiplyScalar(-Math.cos(angle))
                    .add(v.clone().multiplyScalar(-Math.sin(angle)));
            const push = (p, n) => {
                positions.push(p.x, p.y, p.z);
                normals.push(n.x, n.y, n.z);
                const depth = p.clone().sub(center).dot(axis);
                const light =
                    0.7 - 0.64 * Math.max(0, Math.min(1, depth / hole.depth));
                colors.push(light, light, light);
            };
            for (let i = 0; i < segments; i++) {
                const a = (i / segments) * Math.PI * 2,
                    b = ((i + 1) / segments) * Math.PI * 2;
                const p0 = point(a, -0.4),
                    p1 = point(b, -0.4),
                    p2 = point(a, hole.depth),
                    p3 = point(b, hole.depth);
                [
                    [p0, normal(a)],
                    [p2, normal(a)],
                    [p1, normal(b)],
                    [p1, normal(b)],
                    [p2, normal(a)],
                    [p3, normal(b)],
                ].forEach(([p, n]) => push(p, n));
                const base = center
                        .clone()
                        .add(axis.clone().multiplyScalar(hole.depth)),
                    bn = axis.clone().multiplyScalar(-1);
                [
                    [base, bn],
                    [p3, bn],
                    [p2, bn],
                ].forEach(([p, n]) => push(p, n));
                const w = point(a, 0),
                    dot = w.dot(axis);
                const t =
                    -dot -
                    Math.sqrt(
                        Math.max(
                            0,
                            dot * dot - (w.lengthSq() - resolved.radius ** 2),
                        ),
                    );
                rim.push(point(a, t).multiplyScalar(1.0007));
            }
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(positions, 3),
            );
            geometry.setAttribute(
                'normal',
                new THREE.Float32BufferAttribute(normals, 3),
            );
            geometry.setAttribute(
                'color',
                new THREE.Float32BufferAttribute(colors, 3),
            );
            const material = new THREE.MeshStandardMaterial({
                color: 0x34415a,
                roughness: 0.85,
                side: THREE.DoubleSide,
                vertexColors: true,
            });
            applyShader(material, index);
            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData = { ...hole };
            const edge = new THREE.LineLoop(
                new THREE.BufferGeometry().setFromPoints(rim),
                new THREE.LineBasicMaterial({
                    color:
                        hole.id === 'thumb'
                            ? VIS_THUMB_RING_COLOR
                            : VIS_FINGER_RING_COLOR,
                }),
            );
            this.holeGroup.add(mesh);
            this.holeGroup.add(edge);
            this.holes[
                hole.id === 'middle'
                    ? 'leftFinger'
                    : hole.id === 'ring'
                      ? 'rightFinger'
                      : 'thumb'
            ] = mesh;
        });
        this.group.visible = true;
        this.hideFallback();
        this.requestRender();
        return true;
    }

    setHand(hand) {
        this.currentHand = hand;
        if (this.group) this.group.scale.x = hand === 'left' ? -1 : 1;
        this.requestRender();
    }

    attachTo(newContainer) {
        if (!newContainer || this.disposed) return;

        if (
            this.resizeObserver &&
            this.container &&
            this.container !== newContainer
        ) {
            this.resizeObserver.unobserve(this.container);
        }

        this.container = newContainer;
        this.isAdjusterMode = newContainer.id === 'vis-container-adjuster';
        if (this.resizeObserver) this.resizeObserver.observe(newContainer);

        if (this.failureKey || !this.renderer) {
            this.showFallback(this.failureKey || 'vis_error_dependency');
            return;
        }

        newContainer.appendChild(this.renderer.domElement);
        this.updateCanvasAccessibility();
        this.updateLegend();
        if (this.controlsUnavailable) {
            this.showFallback('vis_error_controls', true);
        } else {
            this.hideFallback();
        }
        this.resize();
    }

    updateLegend() {
        if (!this.container) return;
        const overlay = this.container.querySelector('.vis-overlay');
        if (!overlay) return;

        while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
        const gripIndicator = document.createElement('div');
        gripIndicator.className = 'grip-indicator';
        gripIndicator.textContent = visText(
            this.currentGripType === '3finger'
                ? 'vis_grip_3finger'
                : 'vis_grip_thumbless',
        );

        const legend = document.createElement('div');
        legend.className = 'legend';

        const items = [
            ['#facc15', 'legend_pin'],
            ['#ffffff', 'legend_psa'],
            ['#10b981', 'legend_pap'],
            ['#f472b6', 'legend_cog'],
            ['#cbd5e1', 'legend_finger_holes'],
        ];
        if (this.currentGripType === '3finger')
            items.push(['#fb923c', 'legend_thumb_hole']);
        if (this.isAdjusterMode) items.push(['#64748b', 'legend_old_pap']);

        items.forEach(([color, key]) => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            const dot = document.createElement('span');
            dot.className = 'legend-dot';
            dot.style.backgroundColor = color;
            item.appendChild(dot);
            item.appendChild(document.createTextNode(visText(key)));
            legend.appendChild(item);
        });

        overlay.appendChild(gripIndicator);
        overlay.appendChild(legend);
    }

    showFallback(key, isWarning = false) {
        if (!this.container) return;
        const fallback = this.container.querySelector('.vis-fallback');
        if (!fallback) return;
        fallback.hidden = false;
        fallback.classList.toggle('warning', isWarning);
        fallback.setAttribute('data-i18n', key);
        fallback.textContent = visText(key);
        this.container.classList.toggle('vis-failed', !isWarning);
    }

    hideFallback() {
        if (!this.container) return;
        const fallback = this.container.querySelector('.vis-fallback');
        if (fallback) {
            fallback.hidden = true;
            fallback.classList.remove('warning');
        }
        this.container.classList.remove('vis-failed');
    }

    setFailure(key, error) {
        this.failureKey = key;
        if (error) console.error('Failed to initialize visualizer:', error);
        this.showFallback(key);
    }

    resize() {
        if (!this.container || !this.camera || !this.renderer || this.disposed)
            return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width <= 0 || height <= 0) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setPixelRatio(this.getPixelRatio());
        this.renderer.setSize(width, height, false);
        this.requestRender();
    }

    requestRender() {
        if (!this.renderer || !this.scene || !this.camera || this.disposed)
            return;
        if (document.hidden) {
            this.needsVisibleRender = true;
            return;
        }
        if (this.renderFrame !== null) return;

        const requestFrame =
            window.requestAnimationFrame ||
            ((callback) => window.setTimeout(callback, 16));
        this.renderFrame = requestFrame(() => {
            this.renderFrame = null;
            if (!this.disposed && !document.hidden) {
                this.renderer.render(this.scene, this.camera);
            }
        });
    }

    clearLayout() {
        if (this.disposed || !this.group) return;

        this.disposeLines();
        this.lastResolvedLayout = null;
        this.group.visible = false;
        this.showFallback('vis_error_data');
        this.requestRender();
    }

    showGripOnly() {
        if (!this.group || this.drillingValid === false) return;
        this.disposeLines();
        [
            this.markerPin,
            this.markerPsa,
            this.markerPap,
            this.markerOldPap,
        ].forEach((marker) => {
            if (marker) marker.visible = false;
        });
        if (this.markerCog) this.markerCog.visible = true;
        this.group.visible = true;
        this.hideFallback();
        this.requestRender();
    }

    updateLayout(data) {
        if (
            this.failureKey ||
            this.disposed ||
            !this.group ||
            this.drillingValid === false
        )
            return false;
        if (!this.u || !this.u.sin) this.u = window.BowlingUtils || {};
        if (!this.math || !this.math.vlsToDa)
            this.math = window.LayoutMath || {};

        const { system, p1, p2, p3, pap, oldPap, drillSigned, valSigned } =
            data || {};
        const requiredValues = [p1, p2, p3, pap && pap.over, pap && pap.up];
        if (
            requiredValues.some((value) => !Number.isFinite(value)) ||
            !this.u.radFromInch
        ) {
            this.group.visible = false;
            this.showFallback('vis_error_data');
            this.requestRender();
            return false;
        }
        if (
            system !== 'dual_angle' &&
            (!this.math.vlsToDa || !this.math.twoLsToDa)
        ) {
            this.group.visible = false;
            this.showFallback('vis_error_data');
            this.requestRender();
            return false;
        }

        const { R, radFromInch, sin, cos } = this.u;
        const surfaceRadius = R + 0.018;
        const papOverRad = radFromInch(pap.over);
        const papUpRad = radFromInch(pap.up);
        const px = surfaceRadius * cos(papUpRad) * sin(papOverRad);
        const py = surfaceRadius * sin(papUpRad);
        const pz = surfaceRadius * cos(papUpRad) * cos(papOverRad);

        this.markerPap.position.set(px, py, pz);
        this.markerPap.lookAt(0, 0, 0);

        if (
            oldPap &&
            Number.isFinite(oldPap.over) &&
            Number.isFinite(oldPap.up)
        ) {
            const oldOver = radFromInch(oldPap.over);
            const oldUp = radFromInch(oldPap.up);
            this.markerOldPap.position.set(
                surfaceRadius * cos(oldUp) * sin(oldOver),
                surfaceRadius * sin(oldUp),
                surfaceRadius * cos(oldUp) * cos(oldOver),
            );
            this.markerOldPap.lookAt(0, 0, 0);
            this.markerOldPap.visible = true;
        } else {
            this.markerOldPap.visible = false;
        }

        let daDrill;
        let daPin;
        let daVal;
        if (system === 'dual_angle') {
            daDrill = p1;
            daPin = p2;
            daVal = p3;
        } else if (system === 'vls') {
            const converted = this.math.vlsToDa(p1, p2, p3);
            daDrill = converted.val1;
            daPin = converted.val2;
            daVal = converted.val3;
        } else if (system === '2ls') {
            const converted = this.math.resolveLayout('2ls', [p1, p2, p3], pap);
            daDrill = converted.drill;
            daPin = converted.pin;
            daVal = converted.val;
        } else {
            return false;
        }

        if (![daDrill, daPin, daVal].every(Number.isFinite)) {
            this.group.visible = false;
            this.showFallback('vis_error_data');
            this.requestRender();
            return false;
        }

        const resolvedVal = Number.isFinite(valSigned) ? valSigned : daVal;
        const resolvedDrill = Number.isFinite(drillSigned)
            ? drillSigned
            : daDrill;
        [
            this.markerPin,
            this.markerPsa,
            this.markerPap,
            this.markerCog,
        ].forEach((marker) => (marker.visible = true));
        this.lastResolvedLayout = {
            drill: resolvedDrill,
            pin: daPin,
            val: resolvedVal,
        };

        const normal = new THREE.Vector3(px, py, pz).normalize();
        const pole = new THREE.Vector3(0, 1, 0);
        const valTangent = BowlingVisualizer.tangentToward(normal, pole);
        const pinDirection = valTangent
            .clone()
            .applyAxisAngle(normal, resolvedVal * (Math.PI / 180))
            .normalize();
        const thetaPin = radFromInch(daPin);
        const pinPosition = normal
            .clone()
            .multiplyScalar(cos(thetaPin))
            .add(pinDirection.clone().multiplyScalar(sin(thetaPin)))
            .normalize()
            .multiplyScalar(surfaceRadius);

        this.markerPin.position.copy(pinPosition);
        this.markerPin.lookAt(0, 0, 0);

        const pinNormal = pinPosition.clone().normalize();
        const papNormal = this.markerPap.position.clone().normalize();
        let papDirectionAtPin = papNormal
            .clone()
            .sub(pinNormal.clone().multiplyScalar(papNormal.dot(pinNormal)));
        if (papDirectionAtPin.lengthSq() < VIS_EPSILON) {
            // Pin=PAP (or antipodal) has no unique bearing. Continue along the
            // limiting reverse Pin direction instead of normalizing a zero vector.
            papDirectionAtPin = pinDirection.clone().multiplyScalar(-1);
        }
        papDirectionAtPin.normalize();

        const psaDirection = papDirectionAtPin
            .clone()
            .applyAxisAngle(pinNormal, -resolvedDrill * (Math.PI / 180));
        const thetaPsa = radFromInch(6.75);
        const psaPosition = pinNormal
            .clone()
            .multiplyScalar(cos(thetaPsa))
            .add(psaDirection.multiplyScalar(sin(thetaPsa)))
            .normalize()
            .multiplyScalar(surfaceRadius);

        this.markerPsa.position.copy(psaPosition);
        this.markerPsa.lookAt(0, 0, 0);

        this.group.visible = true;
        if (this.controlsUnavailable) {
            this.showFallback('vis_error_controls', true);
        } else {
            this.hideFallback();
        }
        this.drawLines();
        this.requestRender();
        return true;
    }

    static tangentToward(normal, target) {
        const tangent = target
            .clone()
            .sub(normal.clone().multiplyScalar(target.dot(normal)));
        if (tangent.lengthSq() < VIS_EPSILON) {
            return BowlingVisualizer.orthogonalUnit(normal);
        }
        return tangent.normalize();
    }

    static orthogonalUnit(vector) {
        const ax = Math.abs(vector.x);
        const ay = Math.abs(vector.y);
        const az = Math.abs(vector.z);
        let reference;
        if (ax <= ay && ax <= az) {
            reference = new THREE.Vector3(1, 0, 0);
        } else if (ay <= az) {
            reference = new THREE.Vector3(0, 1, 0);
        } else {
            reference = new THREE.Vector3(0, 0, 1);
        }
        return reference
            .sub(vector.clone().multiplyScalar(reference.dot(vector)))
            .normalize();
    }

    static interpolateGreatCircle(start, end, t) {
        if (t <= 0) return start.clone();
        if (t >= 1) return end.clone();

        const startRadius = start.length();
        const endRadius = end.length();
        if (startRadius < VIS_EPSILON || endRadius < VIS_EPSILON) {
            return start
                .clone()
                .multiplyScalar(1 - t)
                .add(end.clone().multiplyScalar(t));
        }

        const a = start.clone().multiplyScalar(1 / startRadius);
        const b = end.clone().multiplyScalar(1 / endRadius);
        const dot = Math.max(-1, Math.min(1, a.dot(b)));
        let direction;

        if (dot > 1 - VIS_EPSILON) {
            direction = a
                .multiplyScalar(1 - t)
                .add(b.multiplyScalar(t))
                .normalize();
        } else if (dot < -1 + VIS_EPSILON) {
            const tangent = BowlingVisualizer.orthogonalUnit(a);
            direction = a
                .multiplyScalar(Math.cos(Math.PI * t))
                .add(tangent.multiplyScalar(Math.sin(Math.PI * t)))
                .normalize();
        } else {
            const omega = Math.acos(dot);
            const sinOmega = Math.sin(omega);
            const scaleA = Math.sin((1 - t) * omega) / sinOmega;
            const scaleB = Math.sin(t * omega) / sinOmega;
            direction = a
                .multiplyScalar(scaleA)
                .add(b.multiplyScalar(scaleB))
                .normalize();
        }

        const radius = startRadius + (endRadius - startRadius) * t;
        return direction.multiplyScalar(radius);
    }

    disposeLines() {
        this.lines.forEach((line) => {
            if (this.group) this.group.remove(line);
            if (line.geometry && typeof line.geometry.dispose === 'function') {
                line.geometry.dispose();
            }
            if (line.material) {
                const materials = Array.isArray(line.material)
                    ? line.material
                    : [line.material];
                materials.forEach((material) => {
                    if (material && typeof material.dispose === 'function')
                        material.dispose();
                });
            }
        });
        this.lines = [];
    }

    drawLines() {
        this.disposeLines();
        if (
            !this.group ||
            !this.markerPin ||
            !this.markerPap ||
            !this.markerPsa
        )
            return;

        const addLine = (start, end, color) => {
            const points = [];
            const splits = 32;
            for (let index = 0; index <= splits; index++) {
                points.push(
                    BowlingVisualizer.interpolateGreatCircle(
                        start,
                        end,
                        index / splits,
                    ),
                );
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color });
            const line = new THREE.Line(geometry, material);
            this.group.add(line);
            this.lines.push(line);
        };

        addLine(this.markerPin.position, this.markerPap.position, 0x06b6d4);
        addLine(this.markerPin.position, this.markerPsa.position, 0xffffff);
        const R = this.math.R + 0.014;
        const pap = this.markerPap.position.clone().normalize();
        const north = BowlingVisualizer.tangentToward(
            pap,
            new THREE.Vector3(0, 1, 0),
        );
        const points = [];
        for (let i = -24; i <= 24; i++) {
            const angle = (i * Math.PI) / 48;
            points.push(
                pap
                    .clone()
                    .multiplyScalar(Math.cos(angle))
                    .add(north.clone().multiplyScalar(Math.sin(angle)))
                    .multiplyScalar(R),
            );
        }
        const valLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            new THREE.LineDashedMaterial({
                color: 0x72aeff,
                dashSize: 0.13,
                gapSize: 0.09,
                transparent: true,
                opacity: 0.65,
            }),
        );
        valLine.computeLineDistances();
        this.group.add(valLine);
        this.lines.push(valLine);
    }

    disposeSceneResources() {
        if (!this.scene || typeof this.scene.traverse !== 'function') return;
        const geometries = new Set();
        const materials = new Set();
        this.scene.traverse((object) => {
            if (object.geometry) geometries.add(object.geometry);
            if (object.material) {
                const objectMaterials = Array.isArray(object.material)
                    ? object.material
                    : [object.material];
                objectMaterials.forEach((material) => materials.add(material));
            }
        });
        geometries.forEach((geometry) => {
            if (geometry && typeof geometry.dispose === 'function')
                geometry.dispose();
        });
        materials.forEach((material) => {
            if (material && typeof material.dispose === 'function')
                material.dispose();
        });
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;

        if (this.renderFrame !== null) {
            const cancelFrame =
                window.cancelAnimationFrame || window.clearTimeout;
            cancelFrame(this.renderFrame);
            this.renderFrame = null;
        }

        window.removeEventListener('resize', this.handleWindowResize);
        document.removeEventListener(
            'visibilitychange',
            this.handleVisibilityChange,
        );
        document.removeEventListener(
            'layoutadapter:languagechange',
            this.handleLanguageChange,
        );
        if (this.resizeObserver) this.resizeObserver.disconnect();

        if (this.controls) {
            this.controls.removeEventListener(
                'change',
                this.handleControlsChange,
            );
            if (typeof this.controls.dispose === 'function')
                this.controls.dispose();
        }

        this.disposeLines();
        this.disposeSceneResources();
        if (this.renderer) {
            const canvas = this.renderer.domElement;
            if (typeof this.renderer.dispose === 'function')
                this.renderer.dispose();
            if (canvas && canvas.parentNode)
                canvas.parentNode.removeChild(canvas);
        }
    }
}

window.BowlingVisualizer = BowlingVisualizer;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.THREE !== 'undefined') return;
    document.querySelectorAll('.vis-fallback').forEach((fallback) => {
        fallback.hidden = false;
        fallback.setAttribute('data-i18n', 'vis_error_dependency');
        fallback.textContent = visText('vis_error_dependency');
        if (fallback.parentElement)
            fallback.parentElement.classList.add('vis-failed');
    });
});
