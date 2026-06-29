import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// ─── Anatomy data ─────────────────────────────────────────────────────────────
const FINGER_DEFS = [
    ["thumb",   -0.42,   -0.095, 0.070, 0.055, 0.045, 0.028, 0.022, 0.018],
    ["index",   -0.18,   -0.065, 0.095, 0.072, 0.052, 0.024, 0.020, 0.016],
    ["middle",  -0.02,   -0.018, 0.105, 0.078, 0.056, 0.024, 0.020, 0.016],
    ["ring",     0.14,    0.030, 0.098, 0.072, 0.052, 0.022, 0.018, 0.015],
    ["pinky",   0.30,    0.078, 0.072, 0.054, 0.040, 0.020, 0.016, 0.013],
];

const JOINT_LABELS = {
    left_shoulder:  "Left Shoulder",
    left_elbow:     "Left Elbow",
    left_wrist:     "Left Wrist",
    right_shoulder: "Right Shoulder",
    right_elbow:    "Right Elbow",
    right_wrist:    "Right Wrist",
};

const FINGER_JOINT_SUFFIX = {
    thumb:  ["CMC", "MCP", "IP"],
    index:  ["MCP", "PIP", "DIP"],
    middle: ["MCP", "PIP", "DIP"],
    ring:   ["MCP", "PIP", "DIP"],
    pinky:  ["MCP", "PIP", "DIP"],
};

["left", "right"].forEach((side) => {
    FINGER_DEFS.forEach(([finger]) => {
        FINGER_JOINT_SUFFIX[finger].forEach((suffix, i) => {
            const key = `${side}_${finger}_${["j0","j1","j2"][i]}`;
            const label = `${side.charAt(0).toUpperCase()+side.slice(1)} ${finger.charAt(0).toUpperCase()+finger.slice(1)} ${suffix}`;
            JOINT_LABELS[key] = label;
        });
    });
});

// ─── Connect Button ───────────────────────────────────────────────────────────
function ConnectButton() {
    const [phase, setPhase] = useState("idle");

    const handleClick = () => {
        if (phase !== "idle") return;
        setPhase("loading");
        setTimeout(() => {
            setPhase("hiding");
            setTimeout(() => setPhase("done"), 400);
        }, 2000);
    };

    if (phase === "done") return null;

    return (
        <>
            <style>{`
        @keyframes _spin { to { transform: rotate(360deg); } }
        @keyframes _btnOut {
          from { opacity: 1; transform: translateX(-50%) scale(1); }
          to   { opacity: 0; transform: translateX(-50%) scale(0.85); }
        }
      `}</style>
            <div style={{
                position: "absolute", top: 32, left: "50%",
                transform: "translateX(-50%)", zIndex: 50,
                animation: phase === "hiding" ? "_btnOut 0.4s ease forwards" : "none",
            }}>
                <button
                    onClick={handleClick}
                    disabled={phase !== "idle"}
                    style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(180,210,255,0.35)",
                        color: "#c8deff",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 13, fontWeight: 500,
                        letterSpacing: "0.12em", textTransform: "uppercase",
                        padding: "10px 28px", borderRadius: 6,
                        cursor: phase === "idle" ? "pointer" : "default",
                        backdropFilter: "blur(8px)",
                        minWidth: 130,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    }}
                >
                    {(phase === "loading" || phase === "hiding") && (
                        <span style={{
                            width: 13, height: 13, flexShrink: 0,
                            border: "2px solid rgba(180,210,255,0.18)",
                            borderTopColor: "#a0c4ff",
                            borderRadius: "50%",
                            animation: "_spin 0.75s linear infinite",
                            display: "inline-block",
                        }} />
                    )}
                    {phase === "idle" ? "Connect" : "Connecting"}
                </button>
            </div>
        </>
    );
}

// ─── Joint Info Panel ─────────────────────────────────────────────────────────
function JointPanel({ joint, rotation, onClose }) {
    if (!joint) return null;
    return (
        <div style={{
            position:"absolute", bottom:32, left:"50%", transform:"translateX(-50%)",
            background:"rgba(10,18,35,0.82)", border:"1px solid rgba(100,160,255,0.25)",
            borderRadius:10, padding:"14px 22px", color:"#c8deff",
            fontFamily:"'Inter', sans-serif", fontSize:13, backdropFilter:"blur(12px)",
            zIndex:50, minWidth:230, boxShadow:"0 8px 32px rgba(0,0,0,0.4)",
        }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <span style={{ fontWeight:600, letterSpacing:"0.05em", fontSize:14 }}>
          {JOINT_LABELS[joint] || joint}
        </span>
                <button onClick={onClose} style={{
                    background:"none", border:"none", color:"#6a8aaa",
                    cursor:"pointer", fontSize:18, lineHeight:1, padding:0 }}>×</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"6px 12px", fontSize:12 }}>
                {["X","Y","Z"].map((axis) => (
                    <div key={axis}>
                        <div style={{ color:"#4a70a0", marginBottom:2 }}>ROT {axis}</div>
                        <div style={{ color:"#90b8e8" }}>
                            {((rotation?.[axis.toLowerCase()] ?? 0) * (180/Math.PI)).toFixed(1)}°
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ marginTop:10, fontSize:11, color:"#4a70a0", lineHeight:1.5 }}>
                Drag to rotate this joint
            </div>
        </div>
    );
}

// ─── Build one hand (helper) ──────────────────────────────────────────────────
function buildHand(parent, side, skinMat, jointMat, palmY, placeholdersRef, lScale, sScale) {
    const mirror = side === "left" ? -1 : 1;

    // Palm block (scaled down)
    const palmGeo = new THREE.BoxGeometry(0.20 * lScale, 0.06 * lScale, 0.16 * lScale);
    const palmMesh = new THREE.Mesh(palmGeo, skinMat);
    palmMesh.castShadow = true;
    palmMesh.position.set(0, (palmY - 0.03) * lScale, 0);
    parent.add(palmMesh);
    placeholdersRef.push(palmMesh);

    const fingerJointGroups = new Map();
    const fingerSpheres     = new Map();

    FINGER_DEFS.forEach(([finger, spread, xOff, proxLen, midLen, distLen, mcpR, pipR, dipR]) => {
        const mcpX = xOff * mirror * lScale;
        const mcpY = (palmY - 0.06) * lScale;
        const mcpZ = (finger === "thumb" ? 0.04 : 0.0) * lScale;

        const j0Group = new THREE.Group();
        j0Group.position.set(mcpX, mcpY, mcpZ);
        if (finger === "thumb") {
            j0Group.rotation.z = spread * mirror;
            j0Group.rotation.x = -0.55;
        } else {
            j0Group.rotation.z = spread * mirror;
        }
        parent.add(j0Group);

        const s0 = new THREE.Mesh(new THREE.SphereGeometry(mcpR * sScale, 14, 14), jointMat);
        s0.castShadow = true;
        j0Group.add(s0);

        const proxGeo = new THREE.CylinderGeometry(mcpR * 0.85 * lScale, pipR * 1.1 * lScale, proxLen * lScale, 12);
        const proxMesh = new THREE.Mesh(proxGeo, skinMat);
        proxMesh.castShadow = true;
        proxMesh.position.set(0, (-proxLen * lScale) / 2, 0);
        j0Group.add(proxMesh);
        placeholdersRef.push(proxMesh);

        const j1Group = new THREE.Group();
        j1Group.position.set(0, -proxLen * lScale, 0);
        j0Group.add(j1Group);

        const s1 = new THREE.Mesh(new THREE.SphereGeometry(pipR * sScale, 12, 12), jointMat);
        s1.castShadow = true;
        j1Group.add(s1);

        const midGeo = new THREE.CylinderGeometry(pipR * 0.9 * lScale, dipR * 1.1 * lScale, midLen * lScale, 12);
        const midMesh = new THREE.Mesh(midGeo, skinMat);
        midMesh.castShadow = true;
        midMesh.position.set(0, (-midLen * lScale) / 2, 0);
        j1Group.add(midMesh);
        placeholdersRef.push(midMesh);

        const j2Group = new THREE.Group();
        j2Group.position.set(0, -midLen * lScale, 0);
        j1Group.add(j2Group);

        const s2 = new THREE.Mesh(new THREE.SphereGeometry(dipR * sScale, 10, 10), jointMat);
        s2.castShadow = true;
        j2Group.add(s2);

        const distGeo = new THREE.CylinderGeometry(dipR * 0.9 * lScale, dipR * 0.6 * lScale, distLen * lScale, 12);
        const distMesh = new THREE.Mesh(distGeo, skinMat);
        distMesh.castShadow = true;
        distMesh.position.set(0, (-distLen * lScale) / 2, 0);
        j2Group.add(distMesh);
        placeholdersRef.push(distMesh);

        const tipGeo = new THREE.SphereGeometry(dipR * 0.62 * lScale, 10, 10);
        const tipMesh = new THREE.Mesh(tipGeo, skinMat);
        tipMesh.position.set(0, -distLen * lScale, 0);
        j2Group.add(tipMesh);
        placeholdersRef.push(tipMesh);

        const j0Key = `${side}_${finger}_j0`;
        const j1Key = `${side}_${finger}_j1`;
        const j2Key = `${side}_${finger}_j2`;

        fingerJointGroups.set(j0Key, j0Group);
        fingerJointGroups.set(j1Key, j1Group);
        fingerJointGroups.set(j2Key, j2Group);

        fingerSpheres.set(s0, j0Key);
        fingerSpheres.set(s1, j1Key);
        fingerSpheres.set(s2, j2Key);
    });

    return { fingerJointGroups, fingerSpheres };
}

// ─── Three.js Scene Hook ──────────────────────────────────────────────────────
function useThreeScene(canvasRef, selectedJointRef, onJointClick, onJointRotation) {
    const sceneRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const LAYOUT_SCALE = 0.25; // Shrinks the distance/spacing between all components
        const SPHERE_SCALE = 1; // Independently shrinks the interactive sphere click targets

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const scene = new THREE.Scene();

        // Keep a normal perspective camera framing
        const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
        camera.position.set(0, 0.2, 4.2);

        // Lighting
        scene.add(new THREE.AmbientLight(0x8ab0d8, 0.7));
        const key = new THREE.DirectionalLight(0xffffff, 1.2);
        key.position.set(3, 5, 3); key.castShadow = true; scene.add(key);
        const fill = new THREE.DirectionalLight(0x4488cc, 0.4);
        fill.position.set(-3, 2, -2); scene.add(fill);
        const rim = new THREE.DirectionalLight(0xaaccff, 0.3);
        rim.position.set(0, -3, -3); scene.add(rim);

        // Materials
        const skinMat = new THREE.MeshStandardMaterial({ color:0xc8a882, roughness:0.65, metalness:0.05 });
        const jointMat = new THREE.MeshStandardMaterial({ color:0xd4b896, roughness:0.4, metalness:0.1 });
        const selectedMat = new THREE.MeshStandardMaterial({
            color:0x5599ff, roughness:0.3, metalness:0.2,
            emissive:0x1133aa, emissiveIntensity:0.4,
        });
        const torsoMat = new THREE.MeshStandardMaterial({ color:0xb89870, roughness:0.7, metalness:0.05 });

        const root = new THREE.Group();
        scene.add(root);

        const placeholders = [];

        // Torso (Scaled down to look natural behind a mechanical setup)
        const torsoMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.38 * LAYOUT_SCALE, 0.32 * LAYOUT_SCALE, 1.1 * LAYOUT_SCALE, 20),
            torsoMat
        );
        torsoMesh.castShadow = true;
        root.add(torsoMesh);
        placeholders.push(torsoMesh);

        const SW = 0.52 * LAYOUT_SCALE;

        const mkSeg = (rTop, rBot, len) => {
            const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop * LAYOUT_SCALE, rBot * LAYOUT_SCALE, len * LAYOUT_SCALE, 16), skinMat);
            m.castShadow = true; return m;
        };
        const mkJoint = (r) => {
            const m = new THREE.Mesh(new THREE.SphereGeometry(r * SPHERE_SCALE, 20, 20), jointMat);
            m.castShadow = true; return m;
        };

        const joints        = {};
        const sphereToJoint = new Map();

        const addLimbJoint = (name, group) => {
            joints[name] = group;
        };

        // ── LEFT ARM ──
        const lShoulderG = new THREE.Group();
        lShoulderG.position.set(-SW, 0.42 * LAYOUT_SCALE, 0);
        root.add(lShoulderG);
        const lShoulderSph = mkJoint(0.115); lShoulderG.add(lShoulderSph);
        const lUpper = mkSeg(0.085, 0.075, 0.72); lUpper.position.set(0, -0.36 * LAYOUT_SCALE, 0); lShoulderG.add(lUpper);
        addLimbJoint("left_shoulder", lShoulderG); sphereToJoint.set(lShoulderSph, "left_shoulder");
        placeholders.push(lUpper);

        const lElbowG = new THREE.Group(); lElbowG.position.set(0, -0.72 * LAYOUT_SCALE, 0); lShoulderG.add(lElbowG);
        const lElbowSph = mkJoint(0.09); lElbowG.add(lElbowSph);
        const lFore = mkSeg(0.075, 0.062, 0.66); lFore.position.set(0, -0.33 * LAYOUT_SCALE, 0); lElbowG.add(lFore);
        addLimbJoint("left_elbow", lElbowG); sphereToJoint.set(lElbowSph, "left_elbow");
        placeholders.push(lFore);

        const lWristG = new THREE.Group(); lWristG.position.set(0, -0.66 * LAYOUT_SCALE, 0); lElbowG.add(lWristG);
        const lWristSph = mkJoint(0.075); lWristG.add(lWristSph);
        addLimbJoint("left_wrist", lWristG); sphereToJoint.set(lWristSph, "left_wrist");

        const { fingerJointGroups: lFJG, fingerSpheres: lFS } =
            buildHand(lWristG, "left", skinMat, jointMat, -0.03, placeholders, LAYOUT_SCALE, SPHERE_SCALE);
        lFJG.forEach((g, k) => { joints[k] = g; });
        lFS.forEach((k, mesh) => sphereToJoint.set(mesh, k));

        // ── RIGHT ARM ──
        const rShoulderG = new THREE.Group();
        rShoulderG.position.set(SW, 0.42 * LAYOUT_SCALE, 0);
        root.add(rShoulderG);
        const rShoulderSph = mkJoint(0.115); rShoulderG.add(rShoulderSph);
        const rUpper = mkSeg(0.085, 0.075, 0.72); rUpper.position.set(0, -0.36 * LAYOUT_SCALE, 0); rShoulderG.add(rUpper);
        addLimbJoint("right_shoulder", rShoulderG); sphereToJoint.set(rShoulderSph, "right_shoulder");
        placeholders.push(rUpper);

        const rElbowG = new THREE.Group(); rElbowG.position.set(0, -0.72 * LAYOUT_SCALE, 0); rShoulderG.add(rElbowG);
        const rElbowSph = mkJoint(0.09); rElbowG.add(rElbowSph);
        const rFore = mkSeg(0.075, 0.062, 0.66); rFore.position.set(0, -0.33 * LAYOUT_SCALE, 0); rElbowG.add(rFore);
        addLimbJoint("right_elbow", rElbowG); sphereToJoint.set(rElbowSph, "right_elbow");
        placeholders.push(rFore);

        const rWristG = new THREE.Group(); rWristG.position.set(0, -0.66 * LAYOUT_SCALE, 0); rElbowG.add(rWristG);
        const rWristSph = mkJoint(0.075); rWristG.add(rWristSph);
        addLimbJoint("right_wrist", rWristG); sphereToJoint.set(rWristSph, "right_wrist");

        const { fingerJointGroups: rFJG, fingerSpheres: rFS } =
            buildHand(rWristG, "right", skinMat, jointMat, -0.03, placeholders, LAYOUT_SCALE, SPHERE_SCALE);
        rFJG.forEach((g, k) => { joints[k] = g; });
        rFS.forEach((k, mesh) => sphereToJoint.set(mesh, k));

        const allSpheres = [...sphereToJoint.keys()];

        sceneRef.current = { scene, camera, renderer, root, joints, sphereToJoint, allSpheres, jointMat, selectedMat };

        // ─── GLTF MECHANICAL RIG LOADING & CALIBRATION ───────────────────────
        // ─── GLTF MECHANICAL RIG LOADING & LIVE MAPPING ───────────────────────
        // ─── GLTF MECHANICAL RIG LOADING & LIVE MAPPING ───────────────────────
        const gltfLoader = new GLTFLoader();
        gltfLoader.load(
            "/mana.glb",
            (gltf) => {
                const model = gltf.scene;

                // Keep your working placement values
                model.scale.setScalar(0.05);
                model.rotation.x = 0;
                model.rotation.y = Math.PI / 2;
                model.rotation.z = Math.PI / -2;

                const mappedSpheres = new Set();

                jointMat.transparent = true;
                jointMat.opacity = 0.5;

                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }

                    // Check if this object matches one of the joint names from your Blender Empties
                    if (joints[child.name]) {
                        const jointName = child.name;
                        if (child.children.length === 0) {
                            return;
                        }

                        let matchingSphere = null;
                        sphereToJoint.forEach((name, sphere) => {
                            if (name === jointName) matchingSphere = sphere;
                        });

                        if (matchingSphere) {
                            // 1. Re-parent the sphere directly to your real Blender object
                            child.add(matchingSphere);

                            // 2. Center it exactly on the axis pivot point
                            matchingSphere.position.set(0, 0, 0);

                            // 3. SCALE BOOST: Keep your working visibility scale
                            matchingSphere.scale.setScalar(40.0);

                            mappedSpheres.add(matchingSphere);
                        }

                        // 4. Switch the control dictionary target to the real structural object
                        joints[jointName] = child;
                    }
                });

                root.add(model);

                // Hide the blocky preview placeholders completely
                placeholders.forEach(mesh => {
                    mesh.visible = false;
                });

                // Hide unused spheres
                sphereToJoint.forEach((name, sphere) => {
                    if (!mappedSpheres.has(sphere)) {
                        sphere.visible = false;
                    }
                });
            },
            undefined,
            (error) => console.error("Error parsing mechanical assembly:", error)
        );
// ─────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────
        // ─────────────────────────────────────────────────────────────────────

        // ── Input handling ──
        const raycaster = new THREE.Raycaster();
        raycaster.params.Mesh = { threshold: 0.01 };

        let orbitActive   = false;
        let lastX = 0, lastY = 0;
        let isDraggingJoint = false;
        let dragJointName   = null;
        let dragStartX = 0, dragStartY = 0;
        let dragStartRotX = 0, dragStartRotY = 0;

        const getNDC = (cx, cy) => {
            const rect = canvas.getBoundingClientRect();
            return new THREE.Vector2(
                ((cx - rect.left) / rect.width)  * 2 - 1,
                -((cy - rect.top)  / rect.height) * 2 + 1
            );
        };

        const hitTest = (cx, cy) => {
            raycaster.setFromCamera(getNDC(cx, cy), camera);
            const hits = raycaster.intersectObjects(allSpheres);
            return hits.length > 0 ? sphereToJoint.get(hits[0].object) : null;
        };

        const onDown = (cx, cy) => {
            const jName = hitTest(cx, cy);
            if (jName) {
                isDraggingJoint = true; dragJointName = jName;
                dragStartX = cx; dragStartY = cy;
                dragStartRotX = joints[jName].rotation.x;
                dragStartRotY = joints[jName].rotation.y;
                onJointClick(jName);
            } else {
                orbitActive = true; lastX = cx; lastY = cy;
            }
        };

        const onMove = (cx, cy) => {
            if (isDraggingJoint && dragJointName) {
                const dx = (cx - dragStartX) * 0.014;
                const dy = (cy - dragStartY) * 0.014;
                const jg = joints[dragJointName];
                jg.rotation.y = dragStartRotY + dx;
                jg.rotation.x = dragStartRotX + dy;
                onJointRotation(dragJointName, { x: jg.rotation.x, y: jg.rotation.y, z: jg.rotation.z });
            } else if (orbitActive) {
                const dx = cx - lastX, dy = cy - lastY;
                root.rotation.y += dx * 0.008;
                root.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, root.rotation.x + dy * 0.008));
                lastX = cx; lastY = cy;
            }
        };

        const onUp = () => {
            isDraggingJoint = false; dragJointName = null; orbitActive = false;
        };

        canvas.addEventListener("mousedown",  (e) => onDown(e.clientX, e.clientY));
        window.addEventListener("mousemove",  (e) => onMove(e.clientX, e.clientY));
        window.addEventListener("mouseup",    onUp);
        canvas.addEventListener("touchstart", (e) => { e.preventDefault(); const t=e.touches[0]; onDown(t.clientX, t.clientY); }, { passive:false });
        window.addEventListener("touchmove",  (e) => { e.preventDefault(); const t=e.touches[0]; onMove(t.clientX, t.clientY); }, { passive:false });
        window.addEventListener("touchend",   onUp);

        const onResize = () => {
            const w = canvas.clientWidth, h = canvas.clientHeight;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };
        const ro = new ResizeObserver(onResize);
        ro.observe(canvas);
        onResize();

        let rafId;
        const animate = () => { rafId = requestAnimationFrame(animate); renderer.render(scene, camera); };
        animate();

        return () => {
            cancelAnimationFrame(rafId);
            ro.disconnect();
            canvas.removeEventListener("mousedown",  onDown);
            window.removeEventListener("mousemove",  onMove);
            window.removeEventListener("mouseup",    onUp);
            canvas.removeEventListener("touchstart", onDown);
            window.removeEventListener("touchmove",  onMove);
            window.removeEventListener("touchend",   onUp);
            renderer.dispose();
        };
    }, []);

    useEffect(() => {
        const s = sceneRef.current;
        if (!s) return;
        const { sphereToJoint, selectedMat, jointMat } = s;
        sphereToJoint.forEach((name, sphere) => {
            sphere.material = name === selectedJointRef.current ? selectedMat : jointMat;
        });
    });
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function ArmViewer() {
    const canvasRef       = useRef(null);
    const [selectedJoint, setSelectedJoint]   = useState(null);
    const [jointRotation, setJointRotation]   = useState({});
    const selectedJointRef = useRef(null);

    const handleJointClick = useCallback((name) => {
        selectedJointRef.current = name;
        setSelectedJoint(name);
    }, []);

    const handleJointRotation = useCallback((name, rot) => {
        setJointRotation(rot);
    }, []);

    const handleClose = useCallback(() => {
        selectedJointRef.current = null;
        setSelectedJoint(null);
    }, []);

    useThreeScene(canvasRef, selectedJointRef, handleJointClick, handleJointRotation);

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { overflow:hidden; }
      `}</style>

            <div style={{
                position:"fixed", inset:0,
                background: "radial-gradient(ellipse 80% 65% at 50% 45%, #ffffff 0%, #f5f9fd 12%, #dbe8f5 28%, #9cb9d2 52%, #4e7091 75%, #23384d 92%, #101a29 100%)",
                zIndex:0,
            }} />

            <canvas ref={canvasRef} style={{
                position:"fixed", inset:0, width:"100%", height:"100%", zIndex:1, touchAction:"none", marginTop:"-100px"
            }} />

            <div style={{ position:"fixed", inset:0, zIndex:10, pointerEvents:"none" }}>
                <div style={{ pointerEvents:"all" }}><ConnectButton /></div>
                <div style={{ pointerEvents:"all" }}>
                    <JointPanel joint={selectedJoint} rotation={jointRotation} onClose={handleClose} />
                </div>
            </div>
        </>
    );
}