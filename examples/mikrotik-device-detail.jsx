import { useState } from "react";

// ─── Mock device data (CRS328-24P-4S+RM) ────────────────────────────────────
const DEVICE = {
    id: "d2",
    name: "edge-sw-floor2",
    model: "CRS328-24P-4S+RM",
    version: "7.14.3",
    ip: "10.0.1.10",
    status: "online",
    managed: true,
    uptime: 864000,
    serial: "JK2C-PPWZ",
    arch: "mmips",
    cpu: 8,
    mem: 35,
    lastSeen: "2026-05-09T10:21:00Z",
    firmware: { current: "7.14.3", latest: "7.14.3", update: false, channel: "stable" },
};

// CRS328-24P-4S+: 24x GbE PoE (RJ45) + 4x SFP+
const PORTS = [
    // 24 copper PoE ports
    ...Array.from({ length: 24 }, (_, i) => ({
        id: i + 1,
        name: `ether${i + 1}`,
        type: "copper",
        poe: true,
        speed: [null, "1G", "1G", "1G", "1G", null, "1G", "1G", "1G", "1G", "1G", "1G", null, "1G", "100M", "1G", "1G", "1G", null, "1G", "1G", null, "1G", "1G"][i],
        linked: [false, true, true, true, true, false, true, true, true, true, true, true, false, true, true, true, true, true, false, true, true, false, true, true][i],
        poeActive: [false, true, true, false, true, false, false, true, true, true, false, true, false, true, false, true, true, false, false, true, false, false, false, true][i],
        client: ["", "macbook-admin", "workstation-02", "", "ip-cam-01", "", "", "ap-desk-1", "workstation-03", "printer-01", "", "ip-cam-02", "", "server-kvm", "old-pc", "workstation-04", "ap-conf-room", "", "", "ip-cam-03", "", "", "", "rpi-monitor"][i],
        rxMbps: [0, 12, 8, 0, 2, 0, 0, 45, 22, 1, 0, 3, 0, 18, 0.5, 14, 38, 0, 0, 1, 0, 0, 0, 0.2][i],
        txMbps: [0, 8, 5, 0, 0.5, 0, 0, 30, 14, 0.2, 0, 1, 0, 12, 0.2, 9, 25, 0, 0, 0.5, 0, 0, 0, 0.1][i],
        vlan: [null, 10, 10, null, 20, null, null, 10, 10, 30, null, 20, null, 40, 10, 10, 10, null, null, 20, null, null, null, 50][i],
        poeWatts: [0, 8.4, 12.1, 0, 4.2, 0, 0, 6.8, 0, 2.1, 0, 4.5, 0, 0, 0, 0, 7.2, 0, 0, 3.8, 0, 0, 0, 1.2][i],
    })),
    // 4 SFP+ uplinks
    ...Array.from({ length: 4 }, (_, i) => ({
        id: 25 + i,
        name: `sfp-sfpplus${i + 1}`,
        type: "sfp",
        poe: false,
        speed: i === 0 ? "10G" : i === 1 ? "10G" : null,
        linked: i === 0 || i === 1,
        poeActive: false,
        client: ["uplink-core", "uplink-backup", "", ""][i],
        rxMbps: [480, 12, 0, 0][i],
        txMbps: [320, 8, 0, 0][i],
        vlan: [null, null, null, null][i],
        poeWatts: 0,
    })),
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatUptime(s) {
    if (!s) return "—";
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    return [d && `${d}d`, h && `${h}h`, (m || (!d && !h)) && `${m}m`].filter(Boolean).join(" ");
}
function formatDate(v) {
    if (!v) return "—";
    return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v));
}
function portColor(port) {
    if (!port.linked) return { bg: "#1e293b", border: "#334155", dot: "#334155" };
    if (port.type === "sfp") return { bg: "#1e3a5f", border: "#2563eb", dot: "#60a5fa" };
    if (port.poeActive) return { bg: "#14532d", border: "#16a34a", dot: "#4ade80" };
    return { bg: "#1e3655", border: "#2563eb", dot: "#93c5fd" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatusDot = ({ status }) => {
    const c = { online: "#22c55e", offline: "#6b7280", warning: "#f59e0b" };
    return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: c[status] || "#6b7280", boxShadow: status === "online" ? `0 0 0 2px ${c.online}30` : "none", flexShrink: 0 }}/>;
};

const InfoRow = ({ label, value, mono }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "6px 0", borderBottom: "1px solid #1e293b" }}>
        <span style={{ fontSize: 11, color: "#475569", fontWeight: 500, flexShrink: 0 }}>{label}</span>
        <span style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 600, textAlign: "right", wordBreak: "break-all", fontFamily: mono ? "monospace" : "inherit" }}>{value}</span>
    </div>
);

const MiniBar = ({ value, max, color }) => (
    <div style={{ height: 3, background: "#1e293b", borderRadius: 99, overflow: "hidden", marginTop: 2 }}>
        <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", background: color, borderRadius: 99 }}/>
    </div>
);

const Tab = ({ label, active, onClick, badge }) => (
    <button onClick={onClick} style={{
        height: 36, padding: "0 14px", background: "none", border: "none",
        borderBottom: active ? "2px solid #3b82f6" : "2px solid transparent",
        color: active ? "#60a5fa" : "#475569",
        fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap",
        display: "flex", alignItems: "center", gap: 6
    }}>
        {label}
        {badge != null && <span style={{ background: active ? "#1e3a5f" : "#1e293b", color: active ? "#60a5fa" : "#64748b", fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "1px 6px" }}>{badge}</span>}
    </button>
);

// ─── Port tooltip panel ───────────────────────────────────────────────────────
const PortPanel = ({ port, onClose }) => {
    if (!port) return null;
    const speedColor = port.speed === "10G" ? "#a78bfa" : port.speed === "1G" ? "#60a5fa" : port.speed === "100M" ? "#fbbf24" : "#475569";
    return (
        <div style={{ position: "absolute", top: 0, right: 0, width: 240, height: "100%", background: "#0f172a", borderLeft: "1px solid #1e293b", display: "flex", flexDirection: "column", zIndex: 10 }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{port.name}</div>
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{port.type === "sfp" ? "SFP+ Port" : port.poe ? "PoE+ Port" : "Copper Port"}</div>
                </div>
                <button onClick={onClose} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>

                {/* Link status */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "10px 12px", background: port.linked ? "#14532d22" : "#1e293b", borderRadius: 8, border: `1px solid ${port.linked ? "#16a34a44" : "#334155"}` }}>
                    <StatusDot status={port.linked ? "online" : "offline"}/>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: port.linked ? "#4ade80" : "#64748b" }}>{port.linked ? "Linked" : "No Link"}</div>
                        {port.speed && <div style={{ fontSize: 10, color: speedColor, fontWeight: 700 }}>{port.speed}</div>}
                    </div>
                    {port.poeActive && (
                        <div style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "#fbbf24", background: "#fbbf2418", border: "1px solid #fbbf2440", borderRadius: 99, padding: "2px 7px" }}>
                            PoE {port.poeWatts}W
                        </div>
                    )}
                </div>

                {/* Client */}
                {port.client && (
                    <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Connected Client</div>
                        <div style={{ background: "#1e293b", borderRadius: 7, padding: "8px 10px", border: "1px solid #334155" }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{port.client}</div>
                            {port.vlan && <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>VLAN {port.vlan}</div>}
                        </div>
                    </div>
                )}

                {/* Traffic */}
                {port.linked && (
                    <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Traffic</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {[{ label: "RX", value: port.rxMbps, color: "#3b82f6" }, { label: "TX", value: port.txMbps, color: "#22c55e" }].map(t => (
                                <div key={t.label} style={{ background: "#1e293b", borderRadius: 7, padding: "10px 10px", border: "1px solid #334155" }}>
                                    <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, marginBottom: 4 }}>{t.label}</div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: t.color, letterSpacing: "-0.02em" }}>{t.value}</div>
                                    <div style={{ fontSize: 10, color: "#475569" }}>Mbps</div>
                                    <MiniBar value={t.value} max={port.type === "sfp" ? 1000 : 100} color={t.color}/>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Info */}
                <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Port Info</div>
                <InfoRow label="Port" value={port.name} mono/>
                <InfoRow label="Type" value={port.type === "sfp" ? "SFP+" : "GbE Copper"}/>
                <InfoRow label="PoE" value={port.poe ? (port.poeActive ? `Active — ${port.poeWatts}W` : "Passive") : "None"}/>
                {port.vlan && <InfoRow label="VLAN" value={`VLAN ${port.vlan}`}/>}
                <InfoRow label="Speed" value={port.speed || "No link"}/>

                {/* Actions */}
                <div style={{ marginTop: 16, display: "grid", gap: 6 }}>
                    <button style={{ width: "100%", height: 30, background: "#1e293b", border: "1px solid #334155", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "#94a3b8", cursor: "pointer" }}>
                        Configure Port
                    </button>
                    {port.poe && (
                        <button style={{ width: "100%", height: 30, background: port.poeActive ? "#7f1d1d22" : "#14532d22", border: `1px solid ${port.poeActive ? "#7f1d1d88" : "#14532d88"}`, borderRadius: 6, fontSize: 11, fontWeight: 600, color: port.poeActive ? "#f87171" : "#4ade80", cursor: "pointer" }}>
                            {port.poeActive ? "Disable PoE" : "Enable PoE"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Switch port diagram ──────────────────────────────────────────────────────
const SwitchDiagram = ({ ports, selectedPort, onSelect }) => {
    const copper = ports.filter(p => p.type === "copper");
    const sfp = ports.filter(p => p.type === "sfp");

    const Port = ({ port, size = "md" }) => {
        const c = portColor(port);
        const isSelected = selectedPort?.id === port.id;
        const sm = size === "sm";
        return (
            <div
                onClick={() => onSelect(port)}
                title={port.name}
                style={{
                    width: sm ? 20 : 26, height: sm ? 20 : 26,
                    background: c.bg,
                    border: `1.5px solid ${isSelected ? "#f59e0b" : c.border}`,
                    borderRadius: 3,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative",
                    boxShadow: isSelected ? `0 0 0 2px #f59e0b66` : port.linked ? `0 0 4px ${c.dot}44` : "none",
                    transition: "all 0.12s",
                    flexShrink: 0,
                }}
            >
                {/* RJ45 slot visual */}
                {port.type === "copper" ? (
                    <div style={{ width: sm ? 10 : 14, height: sm ? 7 : 9, background: "#0f172a", borderRadius: "0 0 1px 1px", border: "1px solid #334155", position: "relative", overflow: "hidden" }}>
                        {port.linked && Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} style={{ position: "absolute", bottom: 0, left: (sm ? 1.5 : 2) + i * (sm ? 2 : 2.8), width: 1, height: "60%", background: c.dot, borderRadius: 99 }}/>
                        ))}
                    </div>
                ) : (
                    // SFP slot
                    <div style={{ width: sm ? 11 : 16, height: sm ? 7 : 9, background: "#0f172a", borderRadius: 1, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {port.linked && <div style={{ width: sm ? 5 : 8, height: 2, background: c.dot, borderRadius: 99 }}/>}
                    </div>
                )}
                {/* Status dot */}
                <div style={{ position: "absolute", top: 2, right: 2, width: 3, height: 3, borderRadius: "50%", background: c.dot }}/>
                {/* PoE indicator */}
                {port.poeActive && <div style={{ position: "absolute", bottom: 2, right: 2, width: 3, height: 3, borderRadius: "50%", background: "#fbbf24" }}/>}
            </div>
        );
    };

    return (
        <div style={{ background: "#0b1120", border: "1px solid #1e293b", borderRadius: 10, padding: "16px 20px", fontFamily: "monospace" }}>
            {/* Switch chassis top label */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 10, color: "#334155", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>CRS328-24P-4S+RM</span>
                <div style={{ display: "flex", gap: 12, fontSize: 10, color: "#334155" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, background: "#3b82f6", borderRadius: 1, display: "inline-block" }}/> Linked</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, background: "#16a34a", borderRadius: 1, display: "inline-block" }}/> PoE Active</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, background: "#1e293b", border: "1px solid #334155", borderRadius: 1, display: "inline-block" }}/> No link</span>
                </div>
            </div>

            {/* Chassis body */}
            <div style={{ background: "#0d1929", border: "1px solid #1e293b", borderRadius: 8, padding: "14px 16px" }}>
                {/* Port numbers top */}
                <div style={{ display: "flex", gap: 4, marginBottom: 4, paddingLeft: 0 }}>
                    {copper.slice(0, 12).map(p => (
                        <div key={p.id} style={{ width: 26, textAlign: "center", fontSize: 8, color: "#334155", fontFamily: "monospace" }}>{p.id}</div>
                    ))}
                    <div style={{ flex: 1 }}/>
                    {sfp.map(p => (
                        <div key={p.id} style={{ width: 32, textAlign: "center", fontSize: 8, color: "#334155", fontFamily: "monospace" }}>{p.id - 24}</div>
                    ))}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {/* 24x copper — top row (odd) + bottom row (even) — 2 rows of 12 */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {/* Ports arranged like a real switch: top row 1–12 odd-numbered visually, bottom row 1-12 even */}
                        <div style={{ display: "flex", gap: 4 }}>
                            {copper.slice(0, 12).map(p => <Port key={p.id} port={p}/>)}
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                            {copper.slice(12, 24).map(p => <Port key={p.id} port={p}/>)}
                        </div>
                    </div>

                    {/* Divider */}
                    <div style={{ width: 1, height: 60, background: "#1e293b", borderRadius: 99, margin: "0 4px" }}/>

                    {/* 4x SFP+ — 2 rows of 2 */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", gap: 4 }}>
                            {sfp.slice(0, 2).map(p => (
                                <div key={p.id} style={{ width: 32, height: 26, background: portColor(p).bg, border: `1.5px solid ${selectedPort?.id === p.id ? "#f59e0b" : portColor(p).border}`, borderRadius: 3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: selectedPort?.id === p.id ? "0 0 0 2px #f59e0b66" : p.linked ? `0 0 4px ${portColor(p).dot}44` : "none" }} onClick={() => onSelect(p)}>
                                    <div style={{ width: 20, height: 10, background: "#0f172a", borderRadius: 1, border: `1px solid ${portColor(p).border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        {p.linked && <div style={{ width: 10, height: 2, background: portColor(p).dot, borderRadius: 99 }}/>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                            {sfp.slice(2, 4).map(p => (
                                <div key={p.id} style={{ width: 32, height: 26, background: portColor(p).bg, border: `1.5px solid ${selectedPort?.id === p.id ? "#f59e0b" : portColor(p).border}`, borderRadius: 3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: selectedPort?.id === p.id ? "0 0 0 2px #f59e0b66" : p.linked ? `0 0 4px ${portColor(p).dot}44` : "none" }} onClick={() => onSelect(p)}>
                                    <div style={{ width: 20, height: 10, background: "#0f172a", borderRadius: 1, border: `1px solid ${portColor(p).border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        {p.linked && <div style={{ width: 10, height: 2, background: portColor(p).dot, borderRadius: 99 }}/>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Port numbers bottom row */}
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                    {copper.slice(12, 24).map(p => (
                        <div key={p.id} style={{ width: 26, textAlign: "center", fontSize: 8, color: "#334155", fontFamily: "monospace" }}>{p.id}</div>
                    ))}
                </div>
            </div>

            {/* PoE budget */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
                <div style={{ fontSize: 10, color: "#475569", fontWeight: 600 }}>PoE Budget</div>
                <div style={{ flex: 1, height: 4, background: "#1e293b", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${(PORTS.reduce((s, p) => s + (p.poeWatts || 0), 0) / 370) * 100}%`, height: "100%", background: "linear-gradient(90deg, #22c55e, #fbbf24)", borderRadius: 99 }}/>
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>
                    {PORTS.reduce((s, p) => s + (p.poeWatts || 0), 0).toFixed(1)}W / 370W
                </div>
            </div>
        </div>
    );
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DeviceDetail() {
    const [activeTab, setActiveTab] = useState("ports");
    const [selectedPort, setSelectedPort] = useState(null);
    const [activeNav, setActiveNav] = useState("Devices");

    const linkedPorts = PORTS.filter(p => p.linked).length;
    const poeActive = PORTS.filter(p => p.poeActive).length;

    const navItems = [
        { label: "Dashboard", icon: "M3 5h8M3 8h6M3 11h8" },
        { label: "Devices", icon: "M2 4h11v8H2zM6 7h3M9 4v8" },
        { label: "Topology", icon: "M2 12L7 4l5 8" },
        { label: "Clients", icon: "M3 6h8M3 10h5M9 8l2 2 4-4" },
        { label: "Config", icon: "M12 2H4a2 2 0 00-2 2v12h12V6M10 2l4 4" },
        { label: "Backups", icon: "M10 2H4v10h10V6M10 2l4 4M10 2v4h4" },
        { label: "Alerts", icon: "M4 6h8M4 10h4M8 14h4M14 10l2 2 4-4" },
        { label: "Users", icon: "M7 3a4 4 0 100 8 4 4 0 000-8zM3 17s.5-4 4-4h2" },
    ];

    return (
        <div style={{ display: "flex", height: "100vh", background: "#0b1120", fontFamily: "'Manrope', system-ui, sans-serif", fontSize: 13, color: "#e2e8f0", overflow: "hidden" }}>

            {/* Sidebar */}
            <aside style={{ width: 220, background: "#0f172a", display: "flex", flexDirection: "column", flexShrink: 0, borderRight: "1px solid #1e293b" }}>
                <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid #1e293b" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 5h5v6H2zM9 3h5v3H9zM9 9h5v4H9z" fill="white" opacity=".9"/></svg>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9" }}>MikroTik</div>
                            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>Controller</div>
                        </div>
                    </div>
                </div>
                <div style={{ padding: "10px 12px", margin: "10px 10px 0", background: "#1e293b", borderRadius: 7 }}>
                    <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Site</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>Datalab Rotterdam</span>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 4l3 3-3 3" stroke="#475569" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                </div>
                <nav style={{ padding: "12px 8px", flex: 1 }}>
                    {navItems.map(({ label, icon }) => (
                        <div key={label} onClick={() => setActiveNav(label)} style={{
                            display: "flex", alignItems: "center", gap: 9, padding: "7px 10px",
                            borderRadius: 6, marginBottom: 1, cursor: "pointer",
                            background: activeNav === label ? "#1e3a5f" : "transparent",
                            color: activeNav === label ? "#60a5fa" : "#64748b",
                            fontWeight: activeNav === label ? 600 : 500, fontSize: 12,
                        }}>
                            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
                            {label}
                        </div>
                    ))}
                </nav>
                <div style={{ padding: "12px 10px", borderTop: "1px solid #1e293b" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #334155, #475569)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>DL</div>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#cbd5e1" }}>Admin</div>
                            <div style={{ fontSize: 10, color: "#475569" }}>Datalab Rotterdam</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

                {/* Header */}
                <header style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "0 24px", flexShrink: 0 }}>
                    {/* Breadcrumb */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 12, paddingBottom: 6, fontSize: 11, color: "#475569" }}>
                        <a href="#" style={{ color: "#475569", textDecoration: "none" }}>Devices</a>
                        <span>/</span>
                        <span style={{ color: "#94a3b8" }}>{DEVICE.name}</span>
                    </div>
                    {/* Device identity row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1e3a5f", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="22" height="22" viewBox="0 0 28 28" fill="none" stroke="#60a5fa" strokeWidth="1.5">
                                <rect x="2" y="9" width="24" height="10" rx="2"/>
                                {[5,8,11,14,17,20,23].map(x => <rect key={x} x={x} y="12" width="2" height="4" rx=".5" fill="#60a5fa" stroke="none" opacity=".6"/>)}
                            </svg>
                        </div>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>{DEVICE.name}</h1>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: "#14532d22", color: "#4ade80", border: "1px solid #16a34a44" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 0 2px #22c55e30" }}/>
                  Online
                </span>
                                {DEVICE.managed && (
                                    <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: "#1e3a5f", color: "#60a5fa", border: "1px solid #2563eb44" }}>Managed</span>
                                )}
                            </div>
                            <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{DEVICE.model} · {DEVICE.ip} · RouterOS {DEVICE.version}</div>
                        </div>
                        <div style={{ flex: 1 }}/>
                        <div style={{ display: "flex", gap: 6 }}>
                            {[
                                { label: "Terminal", icon: "M4 6h11v8H4zM2 14h15M8 6V4M11 6V4" },
                                { label: "Backup", icon: "M10 2H4v10h10V6M10 2l4 4M7 10l2 2 4-4" },
                                { label: "Reboot", icon: "M7 3a4 4 0 100 8 4 4 0 000-8zM11 7l4-2M11 7l2 4" },
                            ].map(({ label, icon }) => (
                                <button key={label} style={{ height: 32, padding: "0 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick stats strip */}
                    <div style={{ display: "flex", gap: 0, borderTop: "1px solid #1e293b", marginLeft: -24, marginRight: -24, paddingLeft: 24 }}>
                        {[
                            { label: "Uptime", value: formatUptime(DEVICE.uptime) },
                            { label: "CPU", value: `${DEVICE.cpu}%`, color: DEVICE.cpu > 70 ? "#f59e0b" : "#60a5fa" },
                            { label: "Memory", value: `${DEVICE.mem}%`, color: DEVICE.mem > 80 ? "#ef4444" : "#60a5fa" },
                            { label: "Ports", value: `${linkedPorts}/${PORTS.length}` },
                            { label: "PoE Active", value: `${poeActive} ports` },
                            { label: "Last Seen", value: formatDate(DEVICE.lastSeen) },
                        ].map((s, i) => (
                            <div key={s.label} style={{ padding: "10px 18px", borderRight: "1px solid #1e293b", borderTop: "1px solid #1e293b" }}>
                                <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: s.color || "#e2e8f0" }}>{s.value}</div>
                            </div>
                        ))}
                    </div>
                </header>

                {/* Tabs */}
                <div style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "0 24px", display: "flex", gap: 0, flexShrink: 0 }}>
                    {[
                        { key: "ports", label: "Ports", badge: PORTS.length },
                        { key: "clients", label: "Clients", badge: linkedPorts },
                        { key: "traffic", label: "Traffic" },
                        { key: "settings", label: "Settings" },
                        { key: "logs", label: "Logs" },
                    ].map(t => <Tab key={t.key} label={t.label} badge={t.badge} active={activeTab === t.key} onClick={() => setActiveTab(t.key)}/>)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: "auto", padding: 24, position: "relative" }}>

                    {activeTab === "ports" && (
                        <div style={{ display: "flex", gap: 20, minHeight: 0 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {/* Switch diagram */}
                                <SwitchDiagram ports={PORTS} selectedPort={selectedPort} onSelect={p => setSelectedPort(prev => prev?.id === p.id ? null : p)}/>

                                {/* Port table */}
                                <div style={{ marginTop: 20, background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b", overflow: "hidden" }}>
                                    <div style={{ padding: "12px 16px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>All Ports</span>
                                        <span style={{ fontSize: 11, color: "#475569" }}>{linkedPorts} linked · {PORTS.length - linkedPorts} unlinked</span>
                                    </div>
                                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                        <thead>
                                        <tr style={{ borderBottom: "1px solid #1e293b" }}>
                                            {["Port", "Client", "Speed", "RX", "TX", "PoE", "VLAN"].map(h => (
                                                <th key={h} style={{ padding: "8px 14px", fontSize: 10, fontWeight: 700, color: "#475569", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                                            ))}
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {PORTS.map(port => {
                                            const c = portColor(port);
                                            const isSelected = selectedPort?.id === port.id;
                                            return (
                                                <tr key={port.id} onClick={() => setSelectedPort(prev => prev?.id === port.id ? null : port)} style={{ borderBottom: "1px solid #1e293b", cursor: "pointer", background: isSelected ? "#1e293b" : "transparent", transition: "background 0.1s" }}>
                                                    <td style={{ padding: "8px 14px" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                                            <div style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot, flexShrink: 0 }}/>
                                                            <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", fontFamily: "monospace" }}>{port.name}</span>
                                                            {port.type === "sfp" && <span style={{ fontSize: 9, fontWeight: 700, color: "#a78bfa", background: "#a78bfa18", border: "1px solid #a78bfa44", borderRadius: 99, padding: "1px 5px" }}>SFP+</span>}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "8px 14px", fontSize: 11, color: "#64748b", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {port.client || <span style={{ color: "#334155" }}>—</span>}
                                                    </td>
                                                    <td style={{ padding: "8px 14px" }}>
                                                        {port.speed ? <span style={{ fontSize: 11, fontWeight: 700, color: port.speed === "10G" ? "#a78bfa" : port.speed === "1G" ? "#60a5fa" : "#fbbf24" }}>{port.speed}</span> : <span style={{ color: "#334155", fontSize: 11 }}>—</span>}
                                                    </td>
                                                    <td style={{ padding: "8px 14px", fontSize: 11, color: port.rxMbps ? "#60a5fa" : "#334155", fontFamily: "monospace" }}>{port.rxMbps || "—"}</td>
                                                    <td style={{ padding: "8px 14px", fontSize: 11, color: port.txMbps ? "#4ade80" : "#334155", fontFamily: "monospace" }}>{port.txMbps || "—"}</td>
                                                    <td style={{ padding: "8px 14px" }}>
                                                        {port.poeActive
                                                            ? <span style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24" }}>{port.poeWatts}W</span>
                                                            : <span style={{ fontSize: 11, color: "#334155" }}>{port.poe ? "Off" : "—"}</span>}
                                                    </td>
                                                    <td style={{ padding: "8px 14px", fontSize: 11, color: port.vlan ? "#94a3b8" : "#334155" }}>
                                                        {port.vlan ? `VLAN ${port.vlan}` : "—"}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Port detail panel — slides in */}
                            {selectedPort && (
                                <div style={{ width: 240, flexShrink: 0 }}>
                                    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, overflow: "hidden", position: "sticky", top: 0 }}>
                                        <div style={{ padding: "14px 16px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{selectedPort.name}</div>
                                                <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{selectedPort.type === "sfp" ? "SFP+ Uplink" : selectedPort.poe ? "PoE+ Copper" : "Copper"}</div>
                                            </div>
                                            <button onClick={() => setSelectedPort(null)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14, padding: 4 }}>✕</button>
                                        </div>
                                        <div style={{ padding: "12px 16px" }}>
                                            {/* Status */}
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "9px 11px", background: selectedPort.linked ? "#14532d22" : "#1e293b", borderRadius: 7, border: `1px solid ${selectedPort.linked ? "#16a34a44" : "#334155"}` }}>
                                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: selectedPort.linked ? "#22c55e" : "#475569", display: "inline-block", boxShadow: selectedPort.linked ? "0 0 0 2px #22c55e30" : "none" }}/>
                                                <div>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: selectedPort.linked ? "#4ade80" : "#64748b" }}>{selectedPort.linked ? "Linked" : "No Link"}</div>
                                                    {selectedPort.speed && <div style={{ fontSize: 10, color: "#60a5fa", fontWeight: 700 }}>{selectedPort.speed}</div>}
                                                </div>
                                                {selectedPort.poeActive && <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "#fbbf24", background: "#fbbf2418", border: "1px solid #fbbf2440", borderRadius: 99, padding: "1px 6px" }}>⚡ {selectedPort.poeWatts}W</span>}
                                            </div>

                                            {/* Traffic tiles */}
                                            {selectedPort.linked && (
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                                                    {[{ l: "RX", v: selectedPort.rxMbps, c: "#3b82f6" }, { l: "TX", v: selectedPort.txMbps, c: "#22c55e" }].map(t => (
                                                        <div key={t.l} style={{ background: "#1e293b", borderRadius: 7, padding: "10px", border: "1px solid #334155" }}>
                                                            <div style={{ fontSize: 9, color: "#475569", fontWeight: 700, marginBottom: 3 }}>{t.l}</div>
                                                            <div style={{ fontSize: 18, fontWeight: 800, color: t.c, letterSpacing: "-0.02em" }}>{t.v}</div>
                                                            <div style={{ fontSize: 9, color: "#475569" }}>Mbps</div>
                                                            <div style={{ height: 3, background: "#0f172a", borderRadius: 99, overflow: "hidden", marginTop: 4 }}>
                                                                <div style={{ width: `${Math.min((t.v / (selectedPort.type === "sfp" ? 1000 : 100)) * 100, 100)}%`, height: "100%", background: t.c, borderRadius: 99 }}/>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Client */}
                                            {selectedPort.client && (
                                                <div style={{ marginBottom: 14 }}>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Client</div>
                                                    <div style={{ background: "#1e293b", borderRadius: 7, padding: "8px 10px", border: "1px solid #334155" }}>
                                                        <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{selectedPort.client}</div>
                                                        {selectedPort.vlan && <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>VLAN {selectedPort.vlan}</div>}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Info rows */}
                                            <InfoRow label="Type" value={selectedPort.type === "sfp" ? "SFP+" : "GbE"}/>
                                            <InfoRow label="PoE" value={selectedPort.poe ? (selectedPort.poeActive ? `${selectedPort.poeWatts}W` : "Off") : "—"}/>
                                            <InfoRow label="VLAN" value={selectedPort.vlan ? `VLAN ${selectedPort.vlan}` : "—"}/>

                                            {/* Actions */}
                                            <div style={{ marginTop: 14, display: "grid", gap: 5 }}>
                                                <button style={{ width: "100%", height: 30, background: "#1e293b", border: "1px solid #334155", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "#94a3b8", cursor: "pointer" }}>Configure</button>
                                                {selectedPort.poe && (
                                                    <button style={{ width: "100%", height: 30, background: selectedPort.poeActive ? "#7f1d1d22" : "#14532d22", border: `1px solid ${selectedPort.poeActive ? "#7f1d1d88" : "#14532d88"}`, borderRadius: 6, fontSize: 11, fontWeight: 600, color: selectedPort.poeActive ? "#f87171" : "#4ade80", cursor: "pointer" }}>
                                                        {selectedPort.poeActive ? "Disable PoE" : "Enable PoE"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "clients" && (
                        <div style={{ background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b", overflow: "hidden" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                                    {["Client", "Port", "IP", "RX", "TX", "VLAN"].map(h => (
                                        <th key={h} style={{ padding: "10px 16px", fontSize: 10, fontWeight: 700, color: "#475569", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                {PORTS.filter(p => p.client).map(port => (
                                    <tr key={port.id} style={{ borderBottom: "1px solid #1e293b" }}>
                                        <td style={{ padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{port.client}</td>
                                        <td style={{ padding: "10px 16px", fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>{port.name}</td>
                                        <td style={{ padding: "10px 16px", fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>10.0.{port.vlan || 1}.{port.id + 10}</td>
                                        <td style={{ padding: "10px 16px", fontSize: 11, color: "#60a5fa", fontFamily: "monospace" }}>{port.rxMbps} Mbps</td>
                                        <td style={{ padding: "10px 16px", fontSize: 11, color: "#4ade80", fontFamily: "monospace" }}>{port.txMbps} Mbps</td>
                                        <td style={{ padding: "10px 16px", fontSize: 11, color: "#94a3b8" }}>{port.vlan ? `VLAN ${port.vlan}` : "—"}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {(activeTab === "traffic" || activeTab === "settings" || activeTab === "logs") && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "#334155", fontSize: 13 }}>
                            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} view — coming soon
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
