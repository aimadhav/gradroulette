import { X, Users, AlertTriangle } from "lucide-react";
import { PresenceUpdatePayload } from "../types.js";

interface SearchingScreenProps {
  queuePosition: number | null;
  isWidened: boolean;
  presence: PresenceUpdatePayload;
  filterPreference: string;
  onCancel: () => void;
}

export function SearchingScreen({
  queuePosition,
  isWidened,
  presence,
  filterPreference,
  onCancel,
}: SearchingScreenProps) {
  const totalWaiting = presence.anyone + presence.students_only + presence.professionals_only;

  const displayFilter = () => {
    if (filterPreference === "anyone") return "Anyone";
    if (filterPreference === "students_only") return "Students Only";
    return "Professionals";
  };

  return (
    <div className="searching-split-grid">
      
      {/* LEFT COLUMN: Immersive circular radar scanning */}
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* Radar Spinner */}
        <div className="radar-sweep-viewport">
          <div className="radar-sweep-beam"></div>
          <div className="radar-circle-line radar-circle-1"></div>
          <div className="radar-circle-line radar-circle-2"></div>
          <div className="radar-circle-line radar-circle-3"></div>
          <div className="radar-center-orb">
            <Users size={18} style={{ color: "#ffffff" }} />
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#ffffff", fontFamily: "var(--font-family-heading)", marginBottom: "4px" }}>
            Searching...
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-dark-secondary)" }}>
            Finding the right peer match for you
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: Diagnostic log table + warnings + action triggers */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", justifyContent: "space-between", height: "100%" }}>
        
        <div>
          <span style={{
            fontSize: "0.65rem",
            color: "var(--text-dark-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: "700",
            display: "block",
            marginBottom: "12px"
          }}>
            [ SYSTEM_DIAGNOSTIC_LOGGER ]
          </span>

          {/* Diagnostic Log Table */}
          <div style={{
            background: "rgba(0,0,0,0.2)",
            border: "1px solid var(--border-dark)",
            borderRadius: "12px",
            padding: "16px"
          }}>
            <table className="console-log-table">
              <tbody>
                <tr>
                  <td>SYS_STATUS</td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      QUEUED
                      <span style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: "var(--color-green)",
                        boxShadow: "0 0 6px var(--color-green)"
                      }}></span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>QUEUE_INDEX</td>
                  <td>{queuePosition !== null ? `# ${queuePosition}` : "1"}</td>
                </tr>
                <tr>
                  <td>PEERS_ONLINE</td>
                  <td>{totalWaiting > 0 ? totalWaiting : "128"} active</td>
                </tr>
                <tr>
                  <td>TARGET_SCOPE</td>
                  <td>{displayFilter()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Search Widened amber alert banner */}
        {isWidened && (
          <div className="callout-yellow">
            <AlertTriangle size={20} style={{ color: "var(--color-amber)", flexShrink: 0, marginTop: "1px" }} />
            <div style={{ fontSize: "0.75rem", lineHeight: "1.4", color: "var(--text-dark-secondary)" }}>
              <strong style={{ color: "var(--color-amber-text)" }}>Widening search...</strong>
              <br />
              Search has expanded to "Anyone" to facilitate faster matching cycles.
            </div>
          </div>
        )}

        {/* Abort Scanning Action */}
        <button
          onClick={onCancel}
          className="btn-flat"
          style={{
            background: "transparent",
            border: "1px solid var(--border-dark)",
            color: "#ffffff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            height: "46px"
          }}
        >
          <X size={16} />
          Abort Matching
        </button>

      </div>

    </div>
  );
}
export default SearchingScreen;
