import {useCallback, useRef, useState} from "react";
import {ConnectButton} from "./ConnectButton";
import {JointPanel} from "./JointPanel";
import {useThreeScene} from "./UseThreeScene";

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

// ─── Rotation Limits (in radians) ────────────────────────────────────────────
const ROTATION_LIMITS = {
    // Finger joints - natural bending limits
    finger_j0: { x: [0, 1], y: [-0.3, 0.3], z: [0, 1] },  // MCP: can curl forward
    finger_j1: { x: [-0.1, 1.7], y: [-0.2, 0.2], z: [-0.1, 0.1] },  // PIP: curls more
    finger_j2: { x: [-0.1, 1.5], y: [-0.1, 0.1], z: [-0.1, 0.1] },  // DIP: curls forward only

    // Thumb has more freedom
    thumb_j0: { x: [-0.5, 1.2], y: [-0.8, 0.8], z: [-0.6, 0.6] },   // CMC: very mobile
    thumb_j1: { x: [-0.2, 1.5], y: [-0.4, 0.4], z: [-0.2, 0.2] },   // MCP: moderate
    thumb_j2: { x: [-0.1, 1.3], y: [-0.2, 0.2], z: [-0.1, 0.1] },   // IP: mostly forward

    // Arm joints
    shoulder: { x: [-2.0, 2.0], y: [-1.5, 1.5], z: [-1.0, 1.0] },
    elbow: { x: [0, 2.4], y: [-0.2, 0.2], z: [-0.1, 0.1] },          // Elbow bends one way
    wrist: { x: [-0.8, 0.8], y: [-0.5, 0.5], z: [-0.3, 0.3] },
};

function getRotationLimits(jointName) {
    // Determine joint type from name
    if (jointName.includes('thumb_j0')) return ROTATION_LIMITS.thumb_j0;
    if (jointName.includes('thumb_j1')) return ROTATION_LIMITS.thumb_j1;
    if (jointName.includes('thumb_j2')) return ROTATION_LIMITS.thumb_j2;
    if (jointName.includes('_j0')) return ROTATION_LIMITS.finger_j0;
    if (jointName.includes('_j1')) return ROTATION_LIMITS.finger_j1;
    if (jointName.includes('_j2')) return ROTATION_LIMITS.finger_j2;
    if (jointName.includes('shoulder')) return ROTATION_LIMITS.shoulder;
    if (jointName.includes('elbow')) return ROTATION_LIMITS.elbow;
    if (jointName.includes('wrist')) return ROTATION_LIMITS.wrist;

    // Default: unlimited
    return { x: [-Math.PI, Math.PI], y: [-Math.PI, Math.PI], z: [-Math.PI, Math.PI] };
}

function clampRotation(rotation, limits) {
    return {
        x: Math.max(limits.x[0], Math.min(limits.x[1], rotation.x)),
        y: Math.max(limits.y[0], Math.min(limits.y[1], rotation.y)),
        z: Math.max(limits.z[0], Math.min(limits.z[1], rotation.z)),
    };
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function ArmViewer() {
    const canvasRef       = useRef(null);
    const [selectedJoint, setSelectedJoint]   = useState(null);
    const [jointRotation, setJointRotation]   = useState({});
    const selectedJointRef = useRef(null);
    const setRotationFromSliderRef = useRef(null);

    const handleJointClick = useCallback((name) => {
        selectedJointRef.current = name;
        setSelectedJoint(name);
    }, []);

    const handleJointRotation = useCallback((name, rot) => {
        setJointRotation(rot);
    }, []);

    const handleSliderRotationChange = useCallback((jointName, rotation) => {
        // Update the Three.js scene
        if (setRotationFromSliderRef.current) {
            setRotationFromSliderRef.current(jointName, rotation);
        }
        // Update the UI state
        setJointRotation(rotation);
    }, []);

    const handleClose = useCallback(() => {
        selectedJointRef.current = null;
        setSelectedJoint(null);
    }, []);

    useThreeScene(canvasRef, selectedJointRef, handleJointClick, handleJointRotation, setRotationFromSliderRef);

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
                position:"fixed", inset:0, width:"100%", height:"100%", zIndex:1, touchAction:"none"
            }} />

            <div style={{ position:"fixed", inset:0, zIndex:10, pointerEvents:"none" }}>
                <div style={{ pointerEvents:"all" }}><ConnectButton /></div>
                <div style={{ pointerEvents:"all" }}>
                    <JointPanel
                        joint={selectedJoint}
                        rotation={jointRotation}
                        onClose={handleClose}
                        onRotationChange={handleSliderRotationChange}
                    />
                </div>
            </div>
        </>
    );
}