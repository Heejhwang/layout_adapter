/**
 * 3D Bowling Ball Visualizer
 * Uses Three.js to render the ball, layout points, and holes.
 */
class BowlingVisualizer {
    constructor(containerId) {
        this.container = containerId ? document.getElementById(containerId) : null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.ballMesh = null;
        this.group = null; // Group to rotate everything

        // Markers
        this.markerPin = null;
        this.markerPsa = null;
        this.markerPap = null;
        this.lines = [];

        // Utils alias
        this.u = window.BowlingUtils || {};
        this.math = window.LayoutMath || {};

        this.init();
    }

    init() {
        // 1. Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);

        // 2. Camera
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        this.camera.position.set(0, 0, 18);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

        // If container provided initially (unlikely with new logic, but safe to keep)
        if (this.container) {
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.container.appendChild(this.renderer.domElement);
        }

        // 4. Lights
        const ambLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambLight);

        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(10, 10, 10);
        this.scene.add(pointLight);

        const rimLight = new THREE.SpotLight(0x4455ff, 2);
        rimLight.position.set(-10, 5, -10);
        this.scene.add(rimLight);

        // 5. Ball Group
        this.group = new THREE.Group();
        this.scene.add(this.group);

        // Ball Mesh
        const RADIUS = 4.297;
        const geo = new THREE.SphereGeometry(RADIUS, 64, 64);
        const mat = new THREE.MeshPhysicalMaterial({
            color: 0x3388ff, // Brighter Blue
            roughness: 0.1,
            metalness: 0.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });
        this.ballMesh = new THREE.Mesh(geo, mat);
        this.group.add(this.ballMesh);

        // 6. Helpers
        this.addHoles(RADIUS);

        // Markers Init (Flat Circles) - Larger for visibility
        const markerGeo = new THREE.CircleGeometry(0.3, 32);

        const pinMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide });
        this.markerPin = new THREE.Mesh(markerGeo, pinMat);
        // Initial position - front of ball (visible from camera)
        this.markerPin.position.set(1, 2, 3.7);
        this.markerPin.lookAt(0, 0, 0);
        this.group.add(this.markerPin);

        const psaMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        this.markerPsa = new THREE.Mesh(markerGeo.clone(), psaMat);
        this.markerPsa.position.set(-1.5, 3, 2.5);
        this.markerPsa.lookAt(0, 0, 0);
        this.group.add(this.markerPsa);

        // PAP markers - smaller size
        const smallMarkerGeo = new THREE.CircleGeometry(0.15, 32);

        const papMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, side: THREE.DoubleSide }); // Magenta for New PAP
        this.markerPap = new THREE.Mesh(smallMarkerGeo, papMat);
        this.markerPap.position.set(2, 0.5, 3.8);
        this.markerPap.lookAt(0, 0, 0);
        this.group.add(this.markerPap);

        // Old PAP marker (for PAP Adjuster mode) - Cyan color
        const oldPapMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide });
        this.markerOldPap = new THREE.Mesh(smallMarkerGeo.clone(), oldPapMat);
        this.markerOldPap.position.set(2.5, 0.3, 3.5);
        this.markerOldPap.lookAt(0, 0, 0);
        this.markerOldPap.visible = false; // Hidden by default
        this.group.add(this.markerOldPap);

        // Controls
        if (THREE.OrbitControls) {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
        }

        this.animate();

        // Handle Resize
        window.addEventListener('resize', () => this.resize());
    }



    addHoles(radius) {
        // Visualize Holes as flat black circles
        this.holes = {};

        // Helper to create flat hole
        const createHole = (xInch, yInch, diameter) => {
            const rad = diameter / 2;
            const circle = new THREE.Mesh(
                new THREE.CircleGeometry(rad, 32),
                new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.DoubleSide })
            );

            // Spherical Position
            const lon = xInch / radius;
            const lat = yInch / radius;

            // Pos (slightly above surface)
            const r = radius * 1.002;
            const x = r * Math.cos(lat) * Math.sin(lon);
            const y = r * Math.sin(lat);
            const z = r * Math.cos(lat) * Math.cos(lon);

            circle.position.set(x, y, z);
            circle.lookAt(0, 0, 0);

            return circle;
        }

        this.holes.thumb = createHole(0, -2, 1.0); // Thumb
        this.holes.leftFinger = createHole(-0.5, 2, 0.8); // Left Finger
        this.holes.rightFinger = createHole(0.5, 2, 0.8); // Right Finger

        this.group.add(this.holes.thumb);
        this.group.add(this.holes.leftFinger);
        this.group.add(this.holes.rightFinger);
    }

    setGripType(gripType) {
        // gripType: '3finger' or 'thumbless'
        this.currentGripType = gripType;

        if (!this.holes) return;

        if (gripType === '3finger') {
            // 3-finger: show thumb, normal finger position
            this.holes.thumb.visible = true;
            // Fingers at span/2 = 2 inches up
            this.repositionHole(this.holes.leftFinger, -0.5, 2);
            this.repositionHole(this.holes.rightFinger, 0.5, 2);
        } else {
            // Thumbless: hide thumb, fingers at grip center (Y=0)
            this.holes.thumb.visible = false;
            // Fingers positioned exactly left/right from grip center
            this.repositionHole(this.holes.leftFinger, -0.5, 0);
            this.repositionHole(this.holes.rightFinger, 0.5, 0);
        }
    }

    repositionHole(hole, xInch, yInch) {
        const radius = 4.297;
        const lon = xInch / radius;
        const lat = yInch / radius;
        const r = radius * 1.002;
        const x = r * Math.cos(lat) * Math.sin(lon);
        const y = r * Math.sin(lat);
        const z = r * Math.cos(lat) * Math.cos(lon);
        hole.position.set(x, y, z);
        hole.lookAt(0, 0, 0);
    }

    setHand(hand) {
        // hand: 'right' or 'left'
        // Left hand: mirror the entire layout on X axis
        this.currentHand = hand;
        if (this.group) {
            this.group.scale.x = (hand === 'left') ? -1 : 1;
        }
    }

    attachTo(newContainer) {
        if (!newContainer) return;
        this.container = newContainer;
        this.container.appendChild(this.renderer.domElement);

        // Check if this is the adjuster container
        this.isAdjusterMode = newContainer.id === 'vis-container-adjuster';

        // Update overlay legend with correct colors
        const overlay = this.container.querySelector('.vis-overlay');
        if (overlay) {
            let legendHtml = `
               <div style="position: absolute; top: 10px; left: 10px; color: white; font-size: 0.8rem; background: rgba(0,0,0,0.5); padding: 8px; border-radius: 4px;">
                   <div style="display:flex; align-items:center; gap: 5px;"><span style="color:#ffaa00">●</span> Pin</div>
                   <div style="display:flex; align-items:center; gap: 5px;"><span style="color:#ffffff">●</span> PSA</div>
                   <div style="display:flex; align-items:center; gap: 5px;"><span style="color:#ff00ff">●</span> PAP</div>`;

            if (this.isAdjusterMode) {
                legendHtml += `
                   <div style="display:flex; align-items:center; gap: 5px;"><span style="color:#00ffff">●</span> Old PAP</div>`;
            }

            legendHtml += `</div>`;
            overlay.innerHTML = legendHtml;
        }

        this.resize();
    }

    resize() {
        if (!this.container || !this.camera || !this.renderer) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        if (width === 0 || height === 0) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Updates the visualization
     * @param {Object} data { system, p1, p2, p3, pap: {over, up}, oldPap?: {over, up} }
     */
    updateLayout(data) {
        if (!this.u || !this.u.sin) {
            this.u = window.BowlingUtils; // retry
            if (!this.u) return;
        }
        if (!this.math || !this.math.vlsToDa) {
            this.math = window.LayoutMath || {};
        }

        const { system, p1, p2, p3, pap, oldPap, drillSigned } = data;
        const { R, radFromInch, sin, cos } = this.u;
        if (system !== 'dual_angle' && (!this.math.vlsToDa || !this.math.twoLsToDa)) {
            return;
        }

        // Handle Old PAP (for PAP Adjuster mode)
        if (oldPap && oldPap.over !== undefined && oldPap.up !== undefined) {
            const oldPapOverRad = radFromInch(oldPap.over);
            const oldPapUpRad = radFromInch(oldPap.up);
            const R_surf = R * 1.01;

            const oldPx = R_surf * cos(oldPapUpRad) * sin(oldPapOverRad);
            const oldPy = R_surf * sin(oldPapUpRad);
            const oldPz = R_surf * cos(oldPapUpRad) * cos(oldPapOverRad);

            this.markerOldPap.position.set(oldPx, oldPy, oldPz);
            this.markerOldPap.lookAt(0, 0, 0);
            this.markerOldPap.visible = true;
        } else {
            this.markerOldPap.visible = false;
        }

        // 1. Calculate PAP Vector
        // Grip Center is (0, 0, 1) * R roughly
        // We defined holes relative to (0,0,R)

        // PAP inputs: Over (Right, +X), Up (+Y)
        // Grip center is at (0, 0, R) - front of the ball
        // PAP is measured from grip center:
        //   - Over: horizontal distance to the right (positive X)
        //   - Up: vertical distance upward (positive Y)
        const papOverRad = radFromInch(pap.over);
        const papUpRad = radFromInch(pap.up);

        // PAP Coords (Spherical) - proper bowling convention
        // Starting from grip center (0, 0, R), rotate right by papOver, then up by papUp
        const R_surf = R * 1.01; // Slightly above surface for visibility

        // Spherical coordinates: X = right, Y = up, Z = forward (towards bowler)
        const px = R_surf * cos(papUpRad) * sin(papOverRad);  // Right
        const py = R_surf * sin(papUpRad);                     // Up  
        const pz = R_surf * cos(papUpRad) * cos(papOverRad);  // Forward

        this.markerPap.position.set(px, py, pz);
        this.markerPap.lookAt(0, 0, 0);

        // 2. Calculate Pin and PSA
        // We need Dual Angle parameters to do calculation easily.
        // If system is NOT dual angle, convert it to DA first implicitly

        let daDrill, daPin, daVal;

        if (system === 'dual_angle') {
            daDrill = p1; // degrees
            daPin = p2;   // inches
            daVal = p3;   // degrees
        } else if (system === 'vls') {
            const converted = this.math.vlsToDa(p1, p2, p3);
            daDrill = converted.val1;
            daPin = converted.val2;
            daVal = converted.val3;
        } else if (system === '2ls') {
            const converted = this.math.twoLsToDa(p1, p2, p3, pap.over, pap.up);
            daDrill = converted.val1;
            daPin = converted.val2;
            daVal = converted.val3;
        } else {
            return;
        }

        // Now we have daDrill, daPin, daVal

        // 3. Find Pin Position
        // Start with PAP Vector (px, py, pz)
        // We need a coordinate frame at PAP.
        // Normal = PAP (normalized)
        const N = new THREE.Vector3(px, py, pz).normalize();

        // "Up" on the surface at PAP?
        // We defined PAP by (Over, Up) from (0,0).
        // The path from Center to PAP defines the "PAP Latitude".
        // The tangent pointing "North" (towards Pole) at PAP?
        // Wait, "VAL Angle" is angle from VAL.
        // VAL passes through PAP.
        // VAL is "Vertical" implies it heads towards the "Pole" (Y axis)?
        // Yes, typically VAL lines are drawn "up" towards the fingers/thumb line.

        // Tangent Up vector T
        // T = (NorthPole - (NorthPole.dot(N)) * N).normalize()
        // NorthPole = (0, 1, 0)
        const Pole = new THREE.Vector3(0, 1, 0);
        // Handles case where PAP is at Pole? Unlikely.

        // Gram-Schmidt
        let T = new THREE.Vector3().copy(Pole).sub(
            N.clone().multiplyScalar(Pole.dot(N))
        ).normalize();

        // So T is the "VAL Up" direction.

        // Rotate T around N by (-daVal) ?
        // VAL Angle: usually measured "Down" from Upper VAL? 
        // e.g. 20 deg is "High Pin", 70 deg is "Low Pin".
        // So 0 is Up. 90 is Right/Left?
        // Standard Diagram: VAL is vertical line. Pin-PAP line goes "down" and "left" (for RH).
        // Actually, Pin-PAP line is usually *below* the VAL peak?
        // Yes, VAL angle > 0 means Pin is "below" the vertical extension.
        // Ideally we rotate T around N. 
        // Direction? Clockwise or Counter?
        // For Right Hander (PAP on Right):
        // VAL line is roughly vertical.
        // Pin is usually "Left" of PAP (towards grip).
        // So we rotate "Left/Inward".
        // From T (Up), we rotate towards the Grip Center?
        // Grip Center is at (0,0,1). PAP is at (+x, +y, z).
        // T is roughly (+x, +y).
        // We want to rotate "towards the grip".
        // Let's assume standard rotation.
        // Let's try rotating by `daVal` radians.

        const daValRad = daVal * (Math.PI / 180);
        const pinDir = T.clone().applyAxisAngle(N, daValRad);
        // NOTE: Direction of rotation matters. We might need -daValRad.
        // Let's check visually later.

        // Move along pinDir by daPin distance
        // Arc length `daPin`. Angle `theta = daPin / R`
        const thetaPin = radFromInch(daPin);

        // Spherical movement from P (at N) along direction pinDir
        const PinPos = N.clone().multiplyScalar(cos(thetaPin))
            .add(pinDir.clone().multiplyScalar(sin(thetaPin)))
            .multiplyScalar(R * 1.01); // Above surface for visibility

        this.markerPin.position.copy(PinPos);
        this.markerPin.lookAt(0, 0, 0);

        // 4. Find PSA Position
        // PSA is 6.75 inches from Pin (standard for asymmetric cores)
        // The drill angle determines the rotation from Pin-PAP line

        const PinPosNorm = PinPos.clone().normalize();

        // Calculate tangent direction from Pin towards PAP
        const papPosNorm = this.markerPap.position.clone().normalize();
        const PapDirAtPin = papPosNorm.clone().sub(
            PinPosNorm.clone().multiplyScalar(papPosNorm.dot(PinPosNorm))
        ).normalize();

        // Drill angle rotates COUNTER-CLOCKWISE from PAP direction when viewed from outside
        // This places PSA on the opposite side from PAP
        const drillValue = Number.isFinite(drillSigned) ? drillSigned : daDrill;
        const drillRad = -drillValue * (Math.PI / 180); // Negative for correct direction
        const psaDir = PapDirAtPin.clone().applyAxisAngle(PinPosNorm, drillRad);

        // PSA Distance from Pin: 6.75 inches (constant for asymmetric cores)
        const psaDist = 6.75;
        const thetaPsa = radFromInch(psaDist);

        const PsaPos = PinPosNorm.clone().multiplyScalar(cos(thetaPsa))
            .add(psaDir.clone().multiplyScalar(sin(thetaPsa)))
            .multiplyScalar(R * 1.01);

        this.markerPsa.position.copy(PsaPos);
        this.markerPsa.lookAt(0, 0, 0);

        this.drawLines();
    }

    drawLines() {
        // Clear old lines
        this.lines.forEach(l => this.group.remove(l));
        this.lines = [];

        const addLine = (v1, v2, color) => {
            const points = [];
            // Subdivide arc
            // Slerp?
            const splits = 20;
            const vn1 = v1.clone().normalize();
            const vn2 = v2.clone().normalize();
            const R = v1.length(); // Assume on sphere

            for (let i = 0; i <= splits; i++) {
                const t = i / splits;
                const v = new THREE.Vector3().copy(vn1).slerp(vn2, t).multiplyScalar(R);
                points.push(v);
            }

            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const mat = new THREE.LineBasicMaterial({ color: color });
            const line = new THREE.Line(geo, mat);
            this.group.add(line);
            this.lines.push(line);
        };

        // VAL Line (Arc through PAP, vertical-ish?)
        // Or just connect Pin-PAP, Pin-PSA

        addLine(this.markerPin.position, this.markerPap.position, 0xffff00); // Pin to PAP
        addLine(this.markerPin.position, this.markerPsa.position, 0xffffff); // Pin to PSA

        // Connect PAP to PSA? (Gradient Line?)
        // addLine(this.markerPap.position, this.markerPsa.position, 0x555555);
    }
}
