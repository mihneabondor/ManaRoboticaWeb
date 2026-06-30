export function JointPanel({joint, rotation, onClose, onRotationChange}) {
    if (!joint) return null;

    const toDeg = (rad) => rad * (180 / Math.PI);
    const toRad = (deg) => deg * (Math.PI / 180);

    // Determine which axes to show based on joint type
    const getAxesToShow = (jointName) => {
        // Fingers only need Z rotation (curl)
        if (jointName.includes('_j0') || jointName.includes('_j1') || jointName.includes('_j2')) {
            return ['z'];
        }
        // Wrist needs X and Y (flexion/extension and deviation)
        if (jointName.includes('wrist')) {
            return ['x', 'y'];
        }
        // Elbow primarily needs X (flexion/extension)
        if (jointName.includes('elbow')) {
            return ['x'];
        }
        // Shoulder needs all axes
        if (jointName.includes('shoulder')) {
            return ['x', 'y', 'z'];
        }
        // Default: show all
        return ['x', 'y', 'z'];
    };

    const axesToShow = getAxesToShow(joint);

    // Check if this joint needs inverted rotation
    const needsInversion = (jointName, axis) => {
        if (axis === 'z' && jointName.includes('_j0')) {
            return jointName.includes('pinky') || jointName.includes('ring') || jointName.includes('middle');
        }
        return false;
    };

    const handleSliderChange = (axis, value) => {
        let radValue = toRad(parseFloat(value));

        // For j0 Z axis, invert the value so slider goes from 0 to -90
        if (joint.includes('_j0') && axis === 'z') {
            radValue = -toRad(parseFloat(value));
        } else if ((joint.includes('_j1') || joint.includes('_j2')) && axis === 'z') {
            // For j1 and j2, use value directly
            radValue = toRad(parseFloat(value));
        } else if (needsInversion(joint, axis)) {
            // Only invert for non-finger joints that need it
            radValue = -radValue;
        }

        onRotationChange(joint, {
            x: rotation?.x ?? 0,
            y: rotation?.y ?? 0,
            z: rotation?.z ?? 0,
            [axis]: radValue
        });
    };

    return (
        <div style={{
            position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
            background: "rgba(10,18,35,0.92)", border: "1px solid rgba(100,160,255,0.3)",
            borderRadius: 10, padding: "16px 24px", color: "#c8deff",
            fontFamily: "'Inter', sans-serif", fontSize: 13, backdropFilter: "blur(16px)",
            zIndex: 50, minWidth: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14}}>
                <span style={{fontWeight: 600, letterSpacing: "0.05em", fontSize: 14}}>
                    {JOINT_LABELS[joint] || joint}
                </span>
                <button onClick={onClose} style={{
                    background: "none", border: "none", color: "#6a8aaa",
                    cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 0
                }}>×
                </button>
            </div>

            {axesToShow.map((axis) => {
                const axisUpper = axis.toUpperCase();
                let currentValue = rotation?.[axis] ?? 0;

                // If this joint needs inversion, invert the display value too
                if (needsInversion(joint, axis)) {
                    currentValue = -currentValue;
                }

                // Set ranges based on joint type
                let min = -180;
                let max = 180;

                // For finger joints Z axis, slider shows offset from rest
                if (joint.includes('_j0') && axis === 'z') {
                    // j0: slider goes 0 to 90 (gets inverted to 0 to -90)
                    min = 0;      // Rest position
                    max = 90;     // Maximum curl
                    currentValue = -currentValue; // Invert display to match
                } else if ((joint.includes('_j1') || joint.includes('_j2')) && axis === 'z') {
                    // j1/j2: slider goes -90 to 0
                    min = -90;    // Maximum curl
                    max = 0;      // Rest position
                }

                return (
                    <div key={axis} style={{marginBottom: 12}}>
                        <div style={{display: "flex", justifyContent: "space-between", marginBottom: 4}}>
                            <span style={{color: "#5a8abd", fontSize: 11, fontWeight: 500, letterSpacing: "0.05em"}}>
                                ROT {axisUpper}
                            </span>
                            <span style={{color: "#90b8e8", fontSize: 11, fontWeight: 600}}>
                                {toDeg(currentValue).toFixed(1)}°
                            </span>
                        </div>
                        <input
                            type="range"
                            min={min}
                            max={max}
                            step={0.5}
                            value={toDeg(currentValue)}
                            onChange={(e) => handleSliderChange(axis, e.target.value)}
                            style={{
                                width: "100%",
                                height: 4,
                                borderRadius: 2,
                                background: `linear-gradient(to right, #4a7ba7 0%, #6a9fd4 ${((toDeg(currentValue) - min) / (max - min)) * 100}%, rgba(100,160,255,0.2) ${((toDeg(currentValue) - min) / (max - min)) * 100}%, rgba(100,160,255,0.2) 100%)`,
                                outline: "none",
                                cursor: "pointer",
                                WebkitAppearance: "none",
                                appearance: "none",
                            }}
                        />
                    </div>
                );
            })}

            <div style={{marginTop: 10, fontSize: 11, color: "#4a70a0", lineHeight: 1.4, opacity: 0.8}}>
                Use sliders to control joint rotation
            </div>

            <style>{`
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: #a0c8ff;
                    cursor: pointer;
                    box-shadow: 0 0 8px rgba(160,200,255,0.5);
                }
                input[type=range]::-moz-range-thumb {
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: #a0c8ff;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 0 8px rgba(160,200,255,0.5);
                }
            `}</style>
        </div>
    );
}