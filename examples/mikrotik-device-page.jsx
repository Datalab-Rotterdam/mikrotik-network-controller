import { useState } from "react";

const devices = [
    {
        id: "d1", name: "core-router-01", model: "CCR2004-1G-12S+2XS", version: "7.14.3",
        ip: "10.0.0.1", status: "online", adopted: true, managed: true,
        uptime: 1209600, serial: "HW8B-XXFA", arch: "arm64", lastSeen: "2026-05-09T10:22:00Z",
        image: "router", interfaces: 14, firmware: { current: "7.14.3", latest: "7.15.0", update: true, channel: "stable" }
    },
    {
        id: "d2", name: "edge-sw-floor2", model: "CRS328-24P-4S+RM", version: "7.14.3",
        ip: "10.0.1.10", status: "online", adopted: true, managed: true,
        uptime: 864000, serial: "JK2C-PPWZ", arch: "mmips", lastSeen: "2026-05-09T10:21:00Z",
        image: "switch", interfaces: 28, firmware: { current: "7.14.3", latest: "7.14.3", update: false, channel: "stable" }
    },
    {
        id: "d3", name: "ap-office-3b", model: "hAP ax³", version: "7.13.5",
        ip: "10.0.2.44", status: "offline", adopted: true, managed: false,
        uptime: null, serial: "RT5D-MMNN", arch: "arm", lastSeen: "2026-05-08T14:11:00Z",
        image: "ap", interfaces: 5, firmware: { current: "7.13.5", latest: "7.15.0", update: true, channel: "stable" }
    },
    {
        id: "d4", name: "MikroTik-A3F2", model: "RB760iGS", version: "7.12.1",
        ip: "192.168.88.1", status: "discovered", adopted: false, managed: false,
        uptime: null, serial: "", arch: "", lastSeen: null,
        image: "router", interfaces: 6, firmware: null
    },
    {
        id: "d5", name: "backup-router", model: "RB5009UG+S+IN", version: "7.14.1",
        ip: "10.0.0.2", status: "online", adopted: true, managed: true,
        uptime: 432000, serial: "MN4R-QQLD", arch: "arm64", lastSeen: "2026-05-09T10:20:00Z",
        image: "router", interfaces: 9, firmware: { current: "7.14.1", latest: "7.14.3", update: true, channel: "stable" }
    },
];

const DeviceIcon = ({ type, size = 28 }) => {
    if (type === "switch") return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
            <rect x="2" y="9" width="24" height="10" rx="2" fill="currentColor" opacity=".12"/>
            <rect x="2" y="9" width="24" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            {[5,8,11,14,17,20,23].map(x => <rect key={x} x={x} y="12" width="2" height="4" rx=".5" fill="currentColor" opacity=".6"/>)}
        </svg>
    );
    if (type === "ap") return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
            <path d="M14 18a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M14 15a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor"/>
            <path d="M8.5 8.5a8 8 0 0 1 11 0M10.8 10.8a5 5 0 0 1 6.4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".6"/>
            <line x1="14" y1="18" x2="14" y2="23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".4"/>
        </svg>
    );
    return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
            <rect x="2" y="8" width="24" height="12" rx="2" fill="currentColor" opacity=".1" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="22" cy="14" r="2" fill="currentColor" opacity=".5"/>
            <circle cx="17" cy="14" r="2" fill="currentColor" opacity=".3"/>
            {[5,9,13].map(x => <line key={x} x1={x} y1="11" x2={x} y2="17" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".4"/>)}
        </svg>
    );
};

const StatusDot = ({ status }) => {
    const colors = { online: "#22c55e", offline: "#6b7280", discovered: "#f59e0b", auth_failed: "#ef4444" };
    return (
        <span style={{
            display: "inline-block", width: 7, height: 7,
            borderRadius: "50%", background: colors[status] || "#6b7280",
            boxShadow: status === "online" ? `0 0 0 2px ${colors.online}33` : "none",
            flexShrink: 0
        }}/>
    );
};

const StatusBadge = ({ status }) => {
    const map = {
        online: { label: "Online", bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" },
        offline: { label: "Offline", bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" },
        discovered: { label: "Discovered", bg: "#fef3c7", color: "#b45309", border: "#fde68a" },
        auth_failed: { label: "Auth Failed", bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" },
    };
    const s = map[status] || map.offline;
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600,
            background: s.bg, color: s.color, border: `1px solid ${s.border}`,
            letterSpacing: "0.02em", whiteSpace: "nowrap"
        }}>
      <StatusDot status={status} />
            {s.label}
    </span>
    );
};

function formatUptime(seconds) {
    if (!seconds) return "—";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return [d && `${d}d`, h && `${h}h`, (m || (!d && !h)) && `${m}m`].filter(Boolean).join(" ");
}

function formatDate(v) {
    if (!v) return "—";
    return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v));
}

const InfoRow = ({ label, value, accent }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
        <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, flexShrink: 0 }}>{label}</span>
        <span style={{ fontSize: 12, color: accent || "#1e293b", fontWeight: 600, textAlign: "right", wordBreak: "break-all" }}>{value}</span>
    </div>
);

const SectionLabel = ({ children }) => (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase", padding: "16px 0 6px", marginBottom: 2 }}>
        {children}
    </div>
);

export default function DevicePage() {
    const [selected, setSelected] = useState("d1");
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [adoptOpen, setAdoptOpen] = useState(false);

    const adoptedDevices = devices.filter(d => d.adopted);
    const discoveredDevices = devices.filter(d => !d.adopted);

    const filtered = devices.filter(d => {
        const matchSearch = !search || d.name.includes(search) || d.ip.includes(search) || d.model.toLowerCase().includes(search.toLowerCase());
        if (filter === "adopted") return d.adopted && matchSearch;
        if (filter === "discovered") return !d.adopted && matchSearch;
        if (filter === "offline") return d.status === "offline" && matchSearch;
        if (filter === "updates") return d.firmware?.update && matchSearch;
        return matchSearch;
    });

    const filteredAdopted = filtered.filter(d => d.adopted);
    const filteredDiscovered = filtered.filter(d => !d.adopted);

    const device = devices.find(d => d.id === selected);

    const tabs = [
        { key: "all", label: `All (${devices.length})` },
        { key: "adopted", label: `Adopted (${adoptedDevices.length})` },
        { key: "discovered", label: `Discovered (${discoveredDevices.length})` },
        { key: "offline", label: "Offline" },
        { key: "updates", label: "Updates" },
    ];

    return (
        <div style={{ display: "flex", height: "100vh", background: "#f8fafc", fontFamily: "'Manrope', system-ui, sans-serif", fontSize: 13, color: "#1e293b", overflow: "hidden" }}>
            {/* Sidebar */}
            <aside style={{ width: 220, background: "#0f172a", display: "flex", flexDirection: "column", flexShrink: 0, borderRight: "1px solid #1e293b" }}>
                {/* Brand */}
                <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid #1e293b" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M2 5h5v6H2zM9 3h5v3H9zM9 9h5v4H9z" fill="white" opacity=".9"/>
                            </svg>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.01em" }}>MikroTik</div>
                            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>Controller</div>
                        </div>
                    </div>
                </div>

                {/* Site */}
                <div style={{ padding: "10px 12px", margin: "10px 10px 0", background: "#1e293b", borderRadius: 7, cursor: "pointer" }}>
                    <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Site</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>Datalab Rotterdam</span>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 4l3 3-3 3" stroke="#475569" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                </div>

                {/* Nav */}
                <nav style={{ padding: "12px 8px", flex: 1 }}>
                    {[
                        { icon: "M3 5h8M3 8h6M3 11h8", label: "Dashboard", active: false },
                        { icon: "M2 4h11v8H2zM6 7h3M9 4v8", label: "Devices", active: true },
                        { icon: "M2 12L7 4l5 8", label: "Topology", active: false },
                        { icon: "M3 6h8M3 10h5M9 8l2 2 4-4", label: "Clients", active: false },
                        { icon: "M12 2H4a2 2 0 00-2 2v12a2 2 0 002 2h8M16 8l-4-4-4 4M12 4v8", label: "Config", active: false },
                        { icon: "M10 2H4v10h10V6M10 2l4 4M10 2v4h4", label: "Backups", active: false },
                        { icon: "M4 6h8M4 10h4M8 14h4M14 10l2 2 4-4", label: "Alerts", active: false },
                        { icon: "M7 3a4 4 0 100 8 4 4 0 000-8zM3 17s.5-4 4-4h2", label: "Users", active: false },
                    ].map(({ icon, label, active }) => (
                        <div key={label} style={{
                            display: "flex", alignItems: "center", gap: 9, padding: "7px 10px",
                            borderRadius: 6, marginBottom: 1, cursor: "pointer",
                            background: active ? "#1e3a5f" : "transparent",
                            color: active ? "#60a5fa" : "#64748b",
                            fontWeight: active ? 600 : 500, fontSize: 12,
                            transition: "all 0.15s"
                        }}>
                            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d={icon}/>
                            </svg>
                            {label}
                        </div>
                    ))}
                </nav>

                {/* Footer */}
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
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                {/* Top bar */}
                <header style={{ height: 52, background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 }}>
                    <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>Devices</h1>
                    <div style={{ flex: 1 }}/>

                    {/* Search */}
                    <div style={{ position: "relative" }}>
                        <svg style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search devices..."
                            style={{ width: 200, height: 32, border: "1px solid #e2e8f0", borderRadius: 6, padding: "0 10px 0 28px", fontSize: 12, color: "#334155", background: "#f8fafc", outline: "none" }}
                        />
                    </div>

                    {/* Add button */}
                    <button
                        onClick={() => setAdoptOpen(true)}
                        style={{ display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>
                        Adopt Device
                    </button>
                </header>

                {/* Filter tabs */}
                <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 20px", display: "flex", gap: 0, flexShrink: 0 }}>
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setFilter(t.key)} style={{
                            height: 38, padding: "0 14px", background: "none", border: "none",
                            borderBottom: filter === t.key ? "2px solid #2563eb" : "2px solid transparent",
                            color: filter === t.key ? "#2563eb" : "#64748b",
                            fontSize: 12, fontWeight: filter === t.key ? 700 : 500,
                            cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap"
                        }}>{t.label}</button>
                    ))}
                </div>

                {/* Content area */}
                <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
                    {/* Table */}
                    <div style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                {["", "Type", "Name", "Status", "IP Address", "Version", "Model", "Uptime"].map(h => (
                                    <th key={h} style={{ padding: h === "" ? "0 0 0 16px" : "0 14px", height: 36, textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {/* Adopted section */}
                            {filteredAdopted.length > 0 && (
                                <>
                                    <tr>
                                        <td colSpan={8} style={{ padding: "10px 16px 4px", fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.07em", textTransform: "uppercase", background: "#f8fafc" }}>
                                            Adopted — {filteredAdopted.length}
                                        </td>
                                    </tr>
                                    {filteredAdopted.map(d => (
                                        <tr key={d.id} onClick={() => setSelected(d.id)} style={{
                                            cursor: "pointer", borderBottom: "1px solid #f1f5f9",
                                            background: selected === d.id ? "#eff6ff" : "#fff",
                                            transition: "background 0.1s"
                                        }}>
                                            <td style={{ padding: "0 0 0 18px", width: 16 }}>
                                                <div style={{ width: 3, height: 32, borderRadius: 99, background: selected === d.id ? "#2563eb" : "transparent" }}/>
                                            </td>
                                            <td style={{ padding: "0 14px", width: 48 }}>
                          <span style={{ color: d.status === "offline" ? "#cbd5e1" : "#3b82f6" }}>
                            <DeviceIcon type={d.image} size={24}/>
                          </span>
                                            </td>
                                            <td style={{ padding: "0 14px" }}>
                                                <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>{d.name}</div>
                                                {d.managed && <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 600, marginTop: 1 }}>Managed</div>}
                                            </td>
                                            <td style={{ padding: "0 14px" }}><StatusBadge status={d.status}/></td>
                                            <td style={{ padding: "0 14px", fontFamily: "monospace", fontSize: 12, color: "#475569" }}>{d.ip}</td>
                                            <td style={{ padding: "0 14px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    <span style={{ fontSize: 12, color: "#475569" }}>{d.version}</span>
                                                    {d.firmware?.update && (
                                                        <span style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 99, padding: "1px 6px" }}>Update</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: "0 14px", fontSize: 12, color: "#64748b", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.model}</td>
                                            <td style={{ padding: "0 14px 0 0", fontSize: 12, color: "#94a3b8" }}>{formatUptime(d.uptime)}</td>
                                        </tr>
                                    ))}
                                </>
                            )}

                            {/* Discovered section */}
                            {filteredDiscovered.length > 0 && (
                                <>
                                    <tr>
                                        <td colSpan={8} style={{ padding: "10px 16px 4px", fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.07em", textTransform: "uppercase", background: "#f8fafc" }}>
                                            Discovered — {filteredDiscovered.length}
                                        </td>
                                    </tr>
                                    {filteredDiscovered.map(d => (
                                        <tr key={d.id} onClick={() => setSelected(d.id)} style={{
                                            cursor: "pointer", borderBottom: "1px solid #f1f5f9",
                                            background: selected === d.id ? "#fffbeb" : "#fffdf5",
                                            transition: "background 0.1s"
                                        }}>
                                            <td style={{ padding: "0 0 0 18px", width: 16 }}>
                                                <div style={{ width: 3, height: 32, borderRadius: 99, background: selected === d.id ? "#f59e0b" : "transparent" }}/>
                                            </td>
                                            <td style={{ padding: "0 14px", width: 48 }}>
                                                <span style={{ color: "#f59e0b" }}><DeviceIcon type={d.image} size={24}/></span>
                                            </td>
                                            <td style={{ padding: "0 14px" }}>
                                                <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>{d.name}</div>
                                                <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 600, marginTop: 1 }}>Pending adoption</div>
                                            </td>
                                            <td style={{ padding: "0 14px" }}><StatusBadge status="discovered"/></td>
                                            <td style={{ padding: "0 14px", fontFamily: "monospace", fontSize: 12, color: "#475569" }}>{d.ip}</td>
                                            <td style={{ padding: "0 14px", fontSize: 12, color: "#94a3b8" }}>{d.version || "—"}</td>
                                            <td style={{ padding: "0 14px", fontSize: 12, color: "#94a3b8" }}>{d.model}</td>
                                            <td style={{ padding: "0 14px 0 0" }}>
                                                <button style={{ height: 26, padding: "0 10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Adopt</button>
                                            </td>
                                        </tr>
                                    ))}
                                </>
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* Detail panel */}
                    {device && (
                        <aside style={{ width: 300, background: "#fff", borderLeft: "1px solid #e2e8f0", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
                            {/* Device hero */}
                            <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(180deg, #f8fafc 0%, #fff 100%)" }}>
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 10, background: device.status === "offline" ? "#f1f5f9" : "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: device.status === "offline" ? "#cbd5e1" : "#3b82f6" }}>
                                        <DeviceIcon type={device.image} size={26}/>
                                    </div>
                                    <StatusBadge status={device.status}/>
                                </div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 3, letterSpacing: "-0.01em" }}>{device.name}</div>
                                <div style={{ fontSize: 12, color: "#64748b" }}>{device.model}</div>
                                {device.adopted && (
                                    <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
                                        <a href="#" style={{ flex: 1, height: 28, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "#f1f5f9", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "#475569", textDecoration: "none", cursor: "pointer" }}>
                                            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 7h10M8 4l4 3-4 3"/></svg>
                                            Open
                                        </a>
                                        <a href="#" style={{ flex: 1, height: 28, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "#f1f5f9", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "#475569", textDecoration: "none", cursor: "pointer" }}>
                                            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="10" height="8" rx="1"/><path d="M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1"/></svg>
                                            Terminal
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Scrollable content */}
                            <div style={{ flex: 1, overflow: "auto", padding: "0 18px 18px" }}>
                                {device.adopted && (
                                    <>
                                        <SectionLabel>Device Info</SectionLabel>
                                        <div style={{ background: "#f8fafc", borderRadius: 8, padding: "4px 10px", border: "1px solid #f1f5f9" }}>
                                            <InfoRow label="IP Address" value={device.ip}/>
                                            <InfoRow label="Version" value={device.version}/>
                                            <InfoRow label="Architecture" value={device.arch || "—"}/>
                                            <InfoRow label="Serial" value={device.serial || "—"}/>
                                            <InfoRow label="Uptime" value={formatUptime(device.uptime)}/>
                                            <InfoRow label="Last Seen" value={formatDate(device.lastSeen)}/>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "6px 0" }}>
                                                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>Interfaces</span>
                                                <span style={{ fontSize: 12, color: "#1e293b", fontWeight: 600 }}>{device.interfaces} ports</span>
                                            </div>
                                        </div>

                                        {/* Firmware */}
                                        {device.firmware && (
                                            <>
                                                <SectionLabel>Firmware</SectionLabel>
                                                <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 10px", border: `1px solid ${device.firmware.update ? "#fde68a" : "#f1f5f9"}` }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                                        <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>Installed</span>
                                                        <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>{device.firmware.current}</span>
                                                    </div>
                                                    {device.firmware.update ? (
                                                        <>
                                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                                                                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>Available</span>
                                                                <span style={{ fontSize: 12, fontWeight: 600, color: "#d97706" }}>{device.firmware.latest} ↑</span>
                                                            </div>
                                                            <button style={{ width: "100%", height: 30, background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                                                Upgrade to {device.firmware.latest}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>Latest</span>
                                                            <span style={{ fontSize: 12, fontWeight: 600, color: "#22c55e" }}>Up to date</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        {/* Actions */}
                                        <SectionLabel>Actions</SectionLabel>
                                        <div style={{ display: "grid", gap: 6 }}>
                                            <button style={{ width: "100%", height: 32, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M7 2a5 5 0 110 10A5 5 0 017 2zM7 2v2M4 4l1.5 1.5"/></svg>
                                                Reboot
                                            </button>
                                            <button style={{ width: "100%", height: 32, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="3" width="10" height="8" rx="1"/><path d="M5 7h4M7 5v4"/></svg>
                                                Export Backup
                                            </button>
                                            <button style={{ width: "100%", height: 32, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#c2410c", cursor: "pointer" }}>
                                                Reset &amp; Remove
                                            </button>
                                        </div>
                                    </>
                                )}

                                {!device.adopted && (
                                    <>
                                        <SectionLabel>Discovery Info</SectionLabel>
                                        <div style={{ background: "#f8fafc", borderRadius: 8, padding: "4px 10px", border: "1px solid #f1f5f9" }}>
                                            <InfoRow label="IP Address" value={device.ip}/>
                                            <InfoRow label="Model" value={device.model}/>
                                            <InfoRow label="Version" value={device.version || "—"}/>
                                        </div>
                                        <div style={{ marginTop: 16 }}>
                                            <button style={{ width: "100%", height: 36, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                                                Adopt Device
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </aside>
                    )}
                </div>
            </div>

            {/* Adopt modal overlay */}
            {adoptOpen && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setAdoptOpen(false)}>
                    <div style={{ width: 400, background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Adopt Device</h2>
                            <button onClick={() => setAdoptOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18 }}>✕</button>
                        </div>
                        {[
                            { label: "Host", placeholder: "192.168.88.1", type: "text" },
                            { label: "Username", placeholder: "admin", type: "text" },
                            { label: "Password", placeholder: "••••••••", type: "password" },
                        ].map(f => (
                            <div key={f.label} style={{ marginBottom: 14 }}>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{f.label}</label>
                                <input type={f.type} placeholder={f.placeholder} style={{ width: "100%", height: 36, border: "1px solid #d1d5db", borderRadius: 7, padding: "0 12px", fontSize: 13, color: "#111827", boxSizing: "border-box", outline: "none" }}/>
                            </div>
                        ))}
                        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                            <button onClick={() => setAdoptOpen(false)} style={{ flex: 1, height: 36, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}>Cancel</button>
                            <button style={{ flex: 2, height: 36, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Adopt Device</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
