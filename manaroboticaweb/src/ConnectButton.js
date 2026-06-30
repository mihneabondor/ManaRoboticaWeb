// ─── Connect Button ───────────────────────────────────────────────────────────
import {useState} from "react";

export function ConnectButton() {
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
                        }}/>
                    )}
                    {phase === "idle" ? "Connect" : "Connecting"}
                </button>
            </div>
        </>
    );
}