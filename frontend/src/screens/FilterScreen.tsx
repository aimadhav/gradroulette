import React, { useState } from "react";
import { GraduationCap, Briefcase, Globe, Settings, ShieldAlert } from "lucide-react";
import { PresenceUpdatePayload } from "../types.js";

interface FilterScreenProps {
  institutionName: string;
  category: "student" | "professional" | "guest";
  presence: PresenceUpdatePayload;
  onStartSearch: (filterPreference: "anyone" | "students_only" | "professionals_only", allowGuests: boolean) => void;
  onLogout: () => void;
}

export function FilterScreen({
  institutionName,
  category,
  presence,
  onStartSearch,
  onLogout,
}: FilterScreenProps) {
  const isGuest = category === "guest";

  const [filterPreference, setFilterPreference] = useState<
    "anyone" | "students_only" | "professionals_only"
  >("anyone");
  const [allowGuests, setAllowGuests] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartSearch(filterPreference, allowGuests);
  };



  return (
    <div className="dashboard-layout-grid">
      
      {/* LEFT COLUMN: Identity & Presence stats */}
      <div className="dashboard-card dark" style={{ display: "flex", flexDirection: "column", gap: "28px", justifyContent: "space-between" }}>
        
        {/* User Identity Section */}
        <div>
          <span style={{
            fontSize: "0.65rem",
            color: "var(--text-dark-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: "700"
          }}>
            Verified Session
          </span>
          
          <div style={{ marginTop: "14px" }}>
            <h3 style={{ fontSize: "1.35rem", fontWeight: "700", fontFamily: "var(--font-family-heading)", color: "#ffffff", marginBottom: "6px" }}>
              {institutionName || "Google Sandbox"}
            </h3>
            
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.7rem",
              fontWeight: "700",
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: "6px",
              background: category === "student" ? "rgba(37,99,235,0.12)" : category === "professional" ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.08)",
              color: category === "student" ? "var(--color-blue-text)" : category === "professional" ? "var(--color-amber-text)" : "var(--text-dark-secondary)",
              border: category === "student" ? "1px solid rgba(37,99,235,0.25)" : category === "professional" ? "1px solid rgba(245,158,11,0.25)" : "1px solid rgba(255,255,255,0.12)"
            }}>
              {category} ID Verified
            </span>
          </div>
        </div>

        {/* Diagnostic Queue Stats banner */}
        <div style={{
          background: "rgba(0, 0, 0, 0.2)",
          border: "1px solid var(--border-dark)",
          borderRadius: "14px",
          padding: "20px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <div style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: "var(--color-green)",
              boxShadow: "0 0 8px var(--color-green)"
            }}></div>
            <span style={{ fontSize: "1.35rem", fontWeight: "700", color: "#ffffff", fontFamily: "var(--font-family-heading)" }}>
              {presence.totalOnline || 1}
            </span>
          </div>
          
          <p style={{ fontSize: "0.85rem", fontWeight: "500", color: "var(--text-dark-primary)", marginBottom: "4px" }}>
            Active users online
          </p>
          <span style={{ fontSize: "0.675rem", color: "var(--text-dark-muted)" }}>
            Real-time telemetry updates every 3s
          </span>
        </div>

        {/* Exit Session Action */}
        <button
          onClick={onLogout}
          className="btn-flat"
          style={{
            background: "transparent",
            border: "1px solid var(--border-dark)",
            color: "#ffffff",
            gap: "8px",
            justifyContent: "center",
            height: "46px"
          }}
        >
          <Settings size={16} />
          Exit Identity Session
        </button>

      </div>

      {/* RIGHT COLUMN: Preference selection Form */}
      <form onSubmit={handleSubmit} className="dashboard-card light" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        
        {/* Preference Card selector rows */}
        {!isGuest ? (
          <div>
            <span className="form-label-light" style={{ display: "block", marginBottom: "14px" }}>
              Who would you like to meet?
            </span>
            
            <div className="preferences-grid-desktop">
              {/* Anyone */}
              <label className={`preference-card-desktop ${filterPreference === "anyone" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="filter"
                  value="anyone"
                  checked={filterPreference === "anyone"}
                  onChange={() => setFilterPreference("anyone")}
                />
                <div className="pref-card-icon-wrap" style={{ color: "var(--text-light-secondary)" }}>
                  <Globe size={24} />
                </div>
                <span className="pref-card-label">Anyone</span>
                <span className="pref-card-counter">{presence.anyone} online</span>
              </label>

              {/* Students Only */}
              <label className={`preference-card-desktop ${filterPreference === "students_only" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="filter"
                  value="students_only"
                  checked={filterPreference === "students_only"}
                  onChange={() => setFilterPreference("students_only")}
                />
                <div className="pref-card-icon-wrap" style={{ color: "var(--text-light-secondary)" }}>
                  <GraduationCap size={24} />
                </div>
                <span className="pref-card-label">Students</span>
                <span className="pref-card-counter">{presence.students_only} online</span>
              </label>

              {/* Professionals Only */}
              <label className={`preference-card-desktop ${filterPreference === "professionals_only" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="filter"
                  value="professionals_only"
                  checked={filterPreference === "professionals_only"}
                  onChange={() => setFilterPreference("professionals_only")}
                />
                <div className="pref-card-icon-wrap" style={{ color: "var(--text-light-secondary)" }}>
                  <Briefcase size={24} />
                </div>
                <span className="pref-card-label">Professionals</span>
                <span className="pref-card-counter">{presence.professionals_only} online</span>
              </label>
            </div>
          </div>
        ) : (
          /* Guest warning callout block */
          <div className="callout-blue" style={{ background: "rgba(37,99,235,0.03)", color: "var(--text-light-secondary)", border: "1px solid var(--border-light)" }}>
            <ShieldAlert size={22} style={{ color: "var(--color-blue)", flexShrink: 0, marginTop: "2px" }} />
            <div style={{ fontSize: "0.775rem", lineHeight: "1.5" }}>
              <strong style={{ color: "var(--text-light-primary)" }}>GUEST_MODE_ACTIVE</strong>
              <br />
              Guests are hardcoded to match with <span style={{ color: "var(--color-blue-text)", fontWeight: "600" }}>Anyone</span>. Verified students and professionals must opt-in to pairing with guests.
            </div>
          </div>
        )}

        {/* Guest switch toggle panel */}
        {!isGuest && (
          <div className="guest-toggle-panel">
            <div style={{ paddingRight: "16px" }}>
              <span style={{ fontWeight: "600", fontSize: "0.9rem", color: "var(--text-light-primary)", fontFamily: "var(--font-family-heading)", display: "block", marginBottom: "2px" }}>
                Allow Unverified Guests
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-light-secondary)", lineHeight: "1.4" }}>
                Permit matchmaking with guest users who did not verify domains.
              </span>
            </div>
            
            <label className="switch">
              <input
                type="checkbox"
                checked={allowGuests}
                onChange={(e) => setAllowGuests(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
        )}

        {/* Trigger Find Match Action */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
          <button type="submit" className="btn-solid-blue" style={{ height: "48px" }}>
            Find Match
          </button>
          <span style={{
            fontSize: "0.7rem",
            color: "var(--text-light-secondary)",
            textAlign: "center"
          }}>
            Camera & microphone access is required to initiate matching
          </span>
        </div>

      </form>
    </div>
  );
}
export default FilterScreen;
