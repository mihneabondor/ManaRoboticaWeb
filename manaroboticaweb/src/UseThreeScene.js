// ─── Three.js Scene Hook ──────────────────────────────────────────────────────
import {useEffect, useRef} from "react";
import * as THREE from "three";
import {buildHand} from "./BuildHand";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader";

export function useThreeScene(canvasRef, selectedJointRef, onJointClick, onJointRotation, setRotationFromSlider) {
    const sceneRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const LAYOUT_SCALE = 0.25; // Shrinks the distance/spacing between all components
        const SPHERE_SCALE = 1; // Independently shrinks the interactive sphere click targets

        const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true});
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
        key.position.set(3, 5, 3);
        key.castShadow = true;
        scene.add(key);
        const fill = new THREE.DirectionalLight(0x4488cc, 0.4);
        fill.position.set(-3, 2, -2);
        scene.add(fill);
        const rim = new THREE.DirectionalLight(0xaaccff, 0.3);
        rim.position.set(0, -3, -3);
        scene.add(rim);

        // Materials
        const skinMat = new THREE.MeshStandardMaterial({color: 0xc8a882, roughness: 0.65, metalness: 0.05});
        const jointMat = new THREE.MeshStandardMaterial({color: 0xd4b896, roughness: 0.4, metalness: 0.1});
        const selectedMat = new THREE.MeshStandardMaterial({
            color: 0x5599ff, roughness: 0.3, metalness: 0.2,
            emissive: 0x1133aa, emissiveIntensity: 0.4,
        });
        const torsoMat = new THREE.MeshStandardMaterial({color: 0xb89870, roughness: 0.7, metalness: 0.05});

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
            m.castShadow = true;
            return m;
        };
        const mkJoint = (r) => {
            const m = new THREE.Mesh(new THREE.SphereGeometry(r * SPHERE_SCALE, 20, 20), jointMat);
            m.castShadow = true;
            return m;
        };

        const joints = {};
        const sphereToJoint = new Map();
        const initialRotations = {}; // Store initial bone rotations

        const addLimbJoint = (name, group) => {
            joints[name] = group;
        };

        // ── LEFT ARM ──
        const lShoulderG = new THREE.Group();
        lShoulderG.position.set(-SW, 0.42 * LAYOUT_SCALE, 0);
        root.add(lShoulderG);
        const lShoulderSph = mkJoint(0.115);
        lShoulderG.add(lShoulderSph);
        const lUpper = mkSeg(0.085, 0.075, 0.72);
        lUpper.position.set(0, -0.36 * LAYOUT_SCALE, 0);
        lShoulderG.add(lUpper);
        addLimbJoint("left_shoulder", lShoulderG);
        sphereToJoint.set(lShoulderSph, "left_shoulder");
        placeholders.push(lUpper);

        const lElbowG = new THREE.Group();
        lElbowG.position.set(0, -0.72 * LAYOUT_SCALE, 0);
        lShoulderG.add(lElbowG);
        const lElbowSph = mkJoint(0.09);
        lElbowG.add(lElbowSph);
        const lFore = mkSeg(0.075, 0.062, 0.66);
        lFore.position.set(0, -0.33 * LAYOUT_SCALE, 0);
        lElbowG.add(lFore);
        addLimbJoint("left_elbow", lElbowG);
        sphereToJoint.set(lElbowSph, "left_elbow");
        placeholders.push(lFore);

        const lWristG = new THREE.Group();
        lWristG.position.set(0, -0.66 * LAYOUT_SCALE, 0);
        lElbowG.add(lWristG);
        const lWristSph = mkJoint(0.075);
        lWristG.add(lWristSph);
        addLimbJoint("left_wrist", lWristG);
        sphereToJoint.set(lWristSph, "left_wrist");

        const {fingerJointGroups: lFJG, fingerSpheres: lFS} =
            buildHand(lWristG, "left", skinMat, jointMat, -0.03, placeholders, LAYOUT_SCALE, SPHERE_SCALE);
        lFJG.forEach((g, k) => {
            joints[k] = g;
        });
        lFS.forEach((k, mesh) => sphereToJoint.set(mesh, k));

        // ── RIGHT ARM ──
        const rShoulderG = new THREE.Group();
        rShoulderG.position.set(SW, 0.42 * LAYOUT_SCALE, 0);
        root.add(rShoulderG);
        const rShoulderSph = mkJoint(0.115);
        rShoulderG.add(rShoulderSph);
        const rUpper = mkSeg(0.085, 0.075, 0.72);
        rUpper.position.set(0, -0.36 * LAYOUT_SCALE, 0);
        rShoulderG.add(rUpper);
        addLimbJoint("right_shoulder", rShoulderG);
        sphereToJoint.set(rShoulderSph, "right_shoulder");
        placeholders.push(rUpper);

        const rElbowG = new THREE.Group();
        rElbowG.position.set(0, -0.72 * LAYOUT_SCALE, 0);
        rShoulderG.add(rElbowG);
        const rElbowSph = mkJoint(0.09);
        rElbowG.add(rElbowSph);
        const rFore = mkSeg(0.075, 0.062, 0.66);
        rFore.position.set(0, -0.33 * LAYOUT_SCALE, 0);
        rElbowG.add(rFore);
        addLimbJoint("right_elbow", rElbowG);
        sphereToJoint.set(rElbowSph, "right_elbow");
        placeholders.push(rFore);

        const rWristG = new THREE.Group();
        rWristG.position.set(0, -0.66 * LAYOUT_SCALE, 0);
        rElbowG.add(rWristG);
        const rWristSph = mkJoint(0.075);
        rWristG.add(rWristSph);
        addLimbJoint("right_wrist", rWristG);
        sphereToJoint.set(rWristSph, "right_wrist");

        const {fingerJointGroups: rFJG, fingerSpheres: rFS} =
            buildHand(rWristG, "right", skinMat, jointMat, -0.03, placeholders, LAYOUT_SCALE, SPHERE_SCALE);
        rFJG.forEach((g, k) => {
            joints[k] = g;
        });
        rFS.forEach((k, mesh) => sphereToJoint.set(mesh, k));

        const allSpheres = [...sphereToJoint.keys()];

        sceneRef.current = {
            scene,
            camera,
            renderer,
            root,
            joints,
            sphereToJoint,
            allSpheres,
            jointMat,
            selectedMat,
            initialRotations
        };

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

                        // Remove this check - even bones with no children should get spheres
                        // if (child.children.length === 0) {
                        //     return;
                        // }

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

                        // For all finger bones, set initial rotation and change rotation order FIRST
                        if (jointName.includes('_j0') || jointName.includes('_j1') || jointName.includes('_j2')) {
                            console.log(`${jointName} original rotation:`, {
                                x: child.rotation.x,
                                y: child.rotation.y,
                                z: child.rotation.z,
                            });

                            // Change rotation order to ZYX for all finger bones to prevent gimbal lock
                            child.rotation.order = 'ZYX';

                            // Set default Z rotation based on bone type
                            if (jointName.includes('_j0')) {
                                child.rotation.z = Math.PI / 2; // 90° for j0 (base knuckle)
                            }
                            // j1 and j2 keep their Blender defaults (usually 0)

                            console.log(`${jointName} after setting default:`, {
                                x: child.rotation.x,
                                y: child.rotation.y,
                                z: child.rotation.z,
                            });
                        }

                        // Store initial rotation (rest pose) AFTER setting defaults
                        initialRotations[jointName] = {
                            x: child.rotation.x,
                            y: child.rotation.y,
                            z: child.rotation.z,
                        };

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
        raycaster.params.Mesh = {threshold: 0.01};

        let orbitActive = false;
        let panActive = false;
        let lastX = 0, lastY = 0;

        const getNDC = (cx, cy) => {
            const rect = canvas.getBoundingClientRect();
            return new THREE.Vector2(
                ((cx - rect.left) / rect.width) * 2 - 1,
                -((cy - rect.top) / rect.height) * 2 + 1
            );
        };

        const hitTest = (cx, cy) => {
            raycaster.setFromCamera(getNDC(cx, cy), camera);
            const hits = raycaster.intersectObjects(allSpheres);
            return hits.length > 0 ? sphereToJoint.get(hits[0].object) : null;
        };

        const onDown = (cx, cy, button = 0) => {
            const jName = hitTest(cx, cy);
            if (jName && button === 0) {
                // Select the joint and initialize rotation state
                const joint = joints[jName];
                if (joint) {
                    // For finger joints, calculate the offset from initial rotation
                    const initialRot = sceneRef.current?.initialRotations?.[jName];
                    if ((jName.includes('_j0') || jName.includes('_j1') || jName.includes('_j2')) && initialRot) {
                        // Send offset value (current - initial)
                        onJointRotation(jName, {
                            x: joint.rotation.x - initialRot.x,
                            y: joint.rotation.y - initialRot.y,
                            z: joint.rotation.z - initialRot.z
                        });
                    } else {
                        // For non-finger joints, send absolute rotation
                        onJointRotation(jName, {
                            x: joint.rotation.x,
                            y: joint.rotation.y,
                            z: joint.rotation.z
                        });
                    }
                }
                onJointClick(jName);
            } else if (button === 2) {
                panActive = true;
                lastX = cx;
                lastY = cy;
            } else if (button === 0) {
                orbitActive = true;
                lastX = cx;
                lastY = cy;
            }
        };

        const onMove = (cx, cy) => {
            if (panActive) {
                const dx = cx - lastX, dy = cy - lastY;
                root.position.x += dx * 0.003;
                root.position.y -= dy * 0.003;
                lastX = cx;
                lastY = cy;
            } else if (orbitActive) {
                const dx = cx - lastX, dy = cy - lastY;
                root.rotation.y += dx * 0.008;
                root.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, root.rotation.x + dy * 0.008));
                lastX = cx;
                lastY = cy;
            }
        };

        const onUp = () => {
            orbitActive = false;
            panActive = false;
        };

        const onWheel = (e) => {
            e.preventDefault();
            const zoomSpeed = 0.0005;
            camera.position.z = Math.max(0.5, Math.min(10, camera.position.z + e.deltaY * zoomSpeed));
        };

        canvas.addEventListener("mousedown", (e) => {
            e.preventDefault();
            onDown(e.clientX, e.clientY, e.button);
        });
        canvas.addEventListener("contextmenu", (e) => e.preventDefault());
        canvas.addEventListener("wheel", onWheel, {passive: false});
        window.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
        window.addEventListener("mouseup", onUp);
        canvas.addEventListener("touchstart", (e) => {
            e.preventDefault();
            const t = e.touches[0];
            onDown(t.clientX, t.clientY, 0);
        }, {passive: false});
        window.addEventListener("touchmove", (e) => {
            e.preventDefault();
            const t = e.touches[0];
            onMove(t.clientX, t.clientY);
        }, {passive: false});
        window.addEventListener("touchend", onUp);

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
        const animate = () => {
            rafId = requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(rafId);
            ro.disconnect();
            canvas.removeEventListener("mousedown", onDown);
            canvas.removeEventListener("contextmenu", (e) => e.preventDefault());
            canvas.removeEventListener("wheel", onWheel);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            canvas.removeEventListener("touchstart", onDown);
            window.removeEventListener("touchmove", onMove);
            window.removeEventListener("touchend", onUp);
            renderer.dispose();
        };
    }, []);

    useEffect(() => {
        const s = sceneRef.current;
        if (!s) return;
        const {sphereToJoint, selectedMat, jointMat} = s;
        sphereToJoint.forEach((name, sphere) => {
            sphere.material = name === selectedJointRef.current ? selectedMat : jointMat;
        });
    });

    // Expose method to update joint rotations from sliders
    useEffect(() => {
        if (setRotationFromSlider && sceneRef.current) {
            setRotationFromSlider.current = (jointName, rotation) => {
                const s = sceneRef.current;
                if (!s || !s.joints[jointName]) return;

                const joint = s.joints[jointName];
                const initialRot = s.initialRotations?.[jointName];

                if (jointName.includes('pinky_j0')) {
                    console.log(`Setting ${jointName} rotation:`, rotation);
                    console.log('Initial rest pose:', initialRot);
                    console.log('Before:', {x: joint.rotation.x, y: joint.rotation.y, z: joint.rotation.z});
                }

                // For all finger bones, preserve the initial X and Y, and ADD slider value to initial Z
                if ((jointName.includes('_j0') || jointName.includes('_j1') || jointName.includes('_j2')) && initialRot) {
                    joint.rotation.x = initialRot.x;
                    joint.rotation.y = initialRot.y;

                    // Add the slider offset to the initial Z rotation
                    joint.rotation.z = initialRot.z + rotation.z;
                } else {
                    joint.rotation.x = rotation.x;
                    joint.rotation.y = rotation.y;
                    joint.rotation.z = rotation.z;
                }

                if (jointName.includes('pinky_j0')) {
                    console.log('After:', {x: joint.rotation.x, y: joint.rotation.y, z: joint.rotation.z});
                }
            };
        }
    }, [setRotationFromSlider]);
}