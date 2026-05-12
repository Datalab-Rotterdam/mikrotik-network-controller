import { useState } from "react";

const StatusDot = ({ status, size = 7 }) => {
    const colors = { online: "#22c55e", offline: "#6b7280", warning: "#f59e0b", error: "#ef4444" };
    return (
        <span style={{
            display: "inline-block", width: size, height: size, borderRadius: "50%",
            background: colors[status] || "#6b7280", flexShrink: 0,
            boxShadow: status === "online" ? `0 0 0 2px ${colors.online}30` : "none"
        }}/>
    );
};

const StatCard = ({ label, value, sub, accent, icon, trend }) => (
    <div style={{ background: "#fff", borderRadius: 10, padding: "16px 18px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center", color: accent }}>
                {icon}
            </div>
        </div>
        <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, fontWeight: 500 }}>{sub}</div>}
        </div>
        {trend && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: trend.up ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                <span>{trend.up ? "↑" : "↓"}</span>
                <span>{trend.label}</span>
            </div>
        )}
    </div>
);

const MiniSparkline = ({ data, color }) => {
    const max = Math.max(...data, 1);
    const w = 80, h = 28;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
        </svg>
    );
};

const TrafficBar = ({ label, rx, tx, maxMbps = 100 }) => (
    <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{label}</span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{rx + tx} Mbps</span>
        </div>
        <div style={{ display: "grid", gap: 3 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 20, fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>RX</span>
                <div style={{ flex: 1, height: 5, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${(rx / maxMbps) * 100}%`, height: "100%", background: "#3b82f6", borderRadius: 99 }}/>
                </div>
                <span style={{ width: 36, fontSize: 10, color: "#64748b", textAlign: "right" }}>{rx}M</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 20, fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>TX</span>
                <div style={{ flex: 1, height: 5, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${(tx / maxMbps) * 100}%`, height: "100%", background: "#22c55e", borderRadius: 99 }}/>
                </div>
                <span style={{ width: 36, fontSize: 10, color: "#64748b", textAlign: "right" }}>{tx}M</span>
            </div>
        </div>
    </div>
);

const AlertRow = ({ level, message, device, time }) => {
    const colors = { warning: { bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b" }, error: { bg: "#fef2f2", border: "#fecaca", dot: "#ef4444" }, info: { bg: "#eff6ff", border: "#bfdbfe", dot: "#3b82f6" } };
    const c = colors[level] || colors.info;
    return (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 7, marginBottom: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot, marginTop: 3, flexShrink: 0 }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", marginBottom: 2 }}>{message}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{device} · {time}</div>
            </div>
        </div>
    );
};

const DeviceRow = ({ name, model, status, ip, cpu, mem, image }) => {
    const DevIcon = () => (
        <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="8" width="24" height="12" rx="2" fill="currentColor" opacity=".1" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="22" cy="14" r="2" fill="currentColor" opacity=".5"/>
        </svg>
    );
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: status === "online" ? "#eff6ff" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: status === "online" ? "#3b82f6" : "#cbd5e1", flexShrink: 0 }}>
                <DevIcon/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{ip}</div>
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 1 }}>CPU</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: cpu > 70 ? "#f59e0b" : "#334155" }}>{cpu}%</div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 1 }}>MEM</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: mem > 80 ? "#ef4444" : "#334155" }}>{mem}%</div>
                </div>
                <StatusDot status={status}/>
            </div>
        </div>
    );
};

const JobRow = ({ name, device, status, progress, step }) => {
    const statusColors = { running: "#3b82f6", completed: "#22c55e", failed: "#ef4444", pending: "#94a3b8" };
    return (
        <div style={{ padding: "9px 0", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>{name}</span>
                <span style={{ fontSize: 11, color: statusColors[status] || "#94a3b8", fontWeight: 600 }}>{status}</span>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>{device} · {step}</div>
            <div style={{ height: 4, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: statusColors[status] || "#94a3b8", borderRadius: 99, transition: "width 0.4s" }}/>
            </div>
        </div>
    );
};

const MiniDonut = ({ value, total, color, label }) => {
    const pct = total ? value / total : 0;
    const r = 22, cx = 28, cy = 28, stroke = 5;
    const circ = 2 * Math.PI * r;
    const dash = pct * circ;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width={56} height={56} viewBox="0 0 56 56">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke}/>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
                        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                        transform={`rotate(-90 ${cx} ${cy})`} opacity={0.9}/>
                <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="800" fill="#1e293b">{value}</text>
            </svg>
            <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{label}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{total} total</div>
            </div>
        </div>
    );
};

const sparkData = {
    traffic: [12, 18, 14, 22, 28, 24, 30, 26, 35, 40, 38, 44, 42, 50, 46],
    clients: [32, 35, 30, 38, 42, 40, 45, 48, 44, 50, 52, 48, 55, 58, 54],
};

export default function Dashboard() {
    const [activeNav, setActiveNav] = useState("Dashboard");

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
        <div style={{ display: "flex", height: "100vh", background: "#f8fafc", fontFamily: "'Manrope', system-ui, sans-serif", fontSize: 13, color: "#1e293b", overflow: "hidden" }}>

            {/* Sidebar */}
            <aside style={{ width: 220, background: "#0f172a", display: "flex", flexDirection: "column", flexShrink: 0 }}>
                <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid #1e293b" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 5h5v6H2zM9 3h5v3H9zM9 9h5v4H9z" fill="white" opacity=".9"/></svg>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.01em" }}>MikroTik</div>
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
                            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d={icon}/>
                            </svg>
                            {label}
                            {label === "Alerts" && (
                                <span style={{ marginLeft: "auto", background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 99, padding: "1px 5px" }}>3</span>
                            )}
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

            {/* Main content */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

                {/* Header */}
                <header style={{ height: 52, background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>Dashboard</h1>
                    </div>
                    <div style={{ flex: 1 }}/>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 99 }}>
                        <StatusDot status="online" size={6}/>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#16a34a" }}>All systems nominal</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Updated just now</div>
                </header>

                {/* Scrollable dashboard content */}
                <div style={{ flex: 1, overflow: "auto", padding: 24 }}>

                    {/* Stat cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
                        <StatCard
                            label="Devices" value="12"
                            sub="11 online · 1 offline"
                            accent="#3b82f6"
                            icon={<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="5" width="16" height="10" rx="2"/><circle cx="16" cy="10" r="1.5" fill="currentColor" stroke="none"/></svg>}
                        />
                        <StatCard
                            label="Clients" value="54"
                            sub="↑ 6 since yesterday"
                            accent="#22c55e"
                            icon={<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8" cy="6" r="3"/><path d="M2 18s1-5 6-5h4"/><circle cx="15" cy="13" r="3"/></svg>}
                            trend={{ up: true, label: "+6 since yesterday" }}
                        />
                        <StatCard
                            label="Throughput" value="1.2G"
                            sub="Peak today: 2.4 Gbps"
                            accent="#8b5cf6"
                            icon={<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 14l4-6 4 4 4-7 4 4"/></svg>}
                        />
                        <StatCard
                            label="Alerts" value="3"
                            sub="2 warnings · 1 error"
                            accent="#ef4444"
                            icon={<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 2l8 14H2L10 2z"/><path d="M10 8v4M10 14v.5"/></svg>}
                        />
                    </div>

                    {/* Middle row */}
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14, marginBottom: 14 }}>

                        {/* Traffic chart card */}
                        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Network Traffic</div>
                                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Last 15 minutes</div>
                                </div>
                                <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#3b82f6", fontWeight: 600 }}>
                    <span style={{ width: 8, height: 2, background: "#3b82f6", borderRadius: 99, display: "inline-block" }}/>RX
                  </span>
                                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#22c55e", fontWeight: 600 }}>
                    <span style={{ width: 8, height: 2, background: "#22c55e", borderRadius: 99, display: "inline-block" }}/>TX
                  </span>
                                </div>
                            </div>

                            {/* Sparkline chart */}
                            <div style={{ position: "relative", height: 80 }}>
                                <svg width="100%" height="80" viewBox="0 0 400 80" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="rxGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2"/>
                                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02"/>
                                        </linearGradient>
                                        <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2"/>
                                            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02"/>
                                        </linearGradient>
                                    </defs>
                                    {(() => {
                                        const rx = [20,28,22,35,45,38,52,44,60,66,58,72,68,80,74];
                                        const tx = [10,14,12,18,22,20,26,22,30,34,28,38,34,44,40];
                                        const max = 100;
                                        const w = 400, h = 80;
                                        const rxPts = rx.map((v,i) => `${(i/(rx.length-1))*w},${h-(v/max)*h}`).join(" ");
                                        const txPts = tx.map((v,i) => `${(i/(tx.length-1))*w},${h-(v/max)*h}`).join(" ");
                                        const rxArea = `${rxPts} ${w},${h} 0,${h}`;
                                        const txArea = `${txPts} ${w},${h} 0,${h}`;
                                        return <>
                                            <polygon points={rxArea} fill="url(#rxGrad)"/>
                                            <polygon points={txArea} fill="url(#txGrad)"/>
                                            <polyline points={rxPts} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <polyline points={txPts} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </>;
                                    })()}
                                </svg>
                            </div>

                            <div style={{ marginTop: 14 }}>
                                <TrafficBar label="core-router-01" rx={42} tx={28} maxMbps={100}/>
                                <TrafficBar label="edge-sw-floor2" rx={18} tx={12} maxMbps={100}/>
                                <TrafficBar label="backup-router" rx={8} tx={5} maxMbps={100}/>
                            </div>
                        </div>

                        {/* Device health donut */}
                        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Device Health</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 20 }}>12 total devices</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                <MiniDonut value={11} total={12} color="#22c55e" label="Online"/>
                                <MiniDonut value={1} total={12} color="#6b7280" label="Offline"/>
                                <MiniDonut value={3} total={12} color="#f59e0b" label="Updates"/>
                            </div>
                        </div>

                        {/* Client breakdown */}
                        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Clients</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 16 }}>Active connections</div>
                            {[
                                { label: "Wired", count: 38, color: "#3b82f6", pct: 70 },
                                { label: "Wireless", count: 16, color: "#8b5cf6", pct: 30 },
                            ].map(c => (
                                <div key={c.label} style={{ marginBottom: 14 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{c.label}</span>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{c.count}</span>
                                    </div>
                                    <div style={{ height: 6, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                                        <div style={{ width: `${c.pct}%`, height: "100%", background: c.color, borderRadius: 99 }}/>
                                    </div>
                                </div>
                            ))}
                            <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
                                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, fontWeight: 600 }}>Top Consumers</div>
                                {[
                                    { name: "macbook-admin", ip: "10.0.1.42", mbps: "45 Mbps" },
                                    { name: "server-nas-01", ip: "10.0.1.10", mbps: "38 Mbps" },
                                    { name: "workstation-03", ip: "10.0.1.28", mbps: "22 Mbps" },
                                ].map(c => (
                                    <div key={c.name} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 11 }}>
                                        <span style={{ color: "#334155", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110 }}>{c.name}</span>
                                        <span style={{ color: "#3b82f6", fontWeight: 700 }}>{c.mbps}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>

                        {/* Device list */}
                        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Devices</div>
                                <a href="#" style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, textDecoration: "none" }}>View all →</a>
                            </div>
                            <DeviceRow name="core-router-01" model="CCR2004" status="online" ip="10.0.0.1" cpu={22} mem={41}/>
                            <DeviceRow name="edge-sw-floor2" model="CRS328" status="online" ip="10.0.1.10" cpu={8} mem={35}/>
                            <DeviceRow name="ap-office-3b" model="hAP ax³" status="offline" ip="10.0.2.44" cpu={0} mem={0}/>
                            <DeviceRow name="backup-router" model="RB5009" status="online" ip="10.0.0.2" cpu={12} mem={28}/>
                        </div>

                        {/* Alerts */}
                        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Recent Alerts</div>
                                <a href="#" style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, textDecoration: "none" }}>View all →</a>
                            </div>
                            <AlertRow level="error" message="Device went offline" device="ap-office-3b" time="14 min ago"/>
                            <AlertRow level="warning" message="Firmware update available" device="core-router-01" time="2 hrs ago"/>
                            <AlertRow level="warning" message="High CPU usage (82%)" device="backup-router" time="3 hrs ago"/>
                            <AlertRow level="info" message="Backup completed" device="edge-sw-floor2" time="6 hrs ago"/>
                        </div>

                        {/* Recent jobs */}
                        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Recent Jobs</div>
                                <a href="#" style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, textDecoration: "none" }}>View all →</a>
                            </div>
                            <JobRow name="devices.backup" device="core-router-01" status="completed" progress={100} step="Export saved"/>
                            <JobRow name="devices.provision" device="backup-router" status="running" progress={65} step="Verifying telemetry path"/>
                            <JobRow name="credentials.rotate" device="edge-sw-floor2" status="completed" progress={100} step="Credentials rotated"/>
                            <JobRow name="devices.adopt" device="MikroTik-A3F2" status="failed" progress={40} step="Credential validation failed"/>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
