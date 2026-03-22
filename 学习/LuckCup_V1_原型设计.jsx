import { useState } from "react";

// ===== Mock Data =====
const mockDailyIncome = {
  "美团团购": 1200,
  "美团外卖": 2800,
  "淘宝闪购": 650,
  "抖音团购": 1500,
  "小程序": 2200,
  "收银机": 1800,
};

const mockExpenses = [
  { id: 1, category: "普货", amount: 8500, note: "2月第一批普货", date: "2026-02-15" },
  { id: 2, category: "水电", amount: 3200, note: "2月水电费", date: "2026-02-18" },
  { id: 3, category: "周边货物", amount: 450, note: "小零食补货", date: "2026-02-20" },
  { id: 4, category: "突发支出", amount: 280, note: "换水龙头", date: "2026-02-22" },
];

const mockMonthlyData = {
  totalIncome: 82000,
  totalExpense: 65000,
  incomeByPlatform: [
    { name: "美团外卖", amount: 28000, pct: 34.1 },
    { name: "小程序", amount: 20000, pct: 24.4 },
    { name: "收银机", amount: 15000, pct: 18.3 },
    { name: "美团团购", amount: 10000, pct: 12.2 },
    { name: "抖音团购", amount: 6000, pct: 7.3 },
    { name: "淘宝闪购", amount: 3000, pct: 3.7 },
  ],
  expenseByCategory: [
    { name: "普货", amount: 35000, pct: 53.8 },
    { name: "工资", amount: 15000, pct: 23.1 },
    { name: "房租", amount: 8000, pct: 12.3 },
    { name: "水电", amount: 3500, pct: 5.4 },
    { name: "周边货物", amount: 2500, pct: 3.8 },
    { name: "突发支出", amount: 1000, pct: 1.5 },
  ],
};

// ===== Color Tokens =====
const C = {
  primary: "#E8590C",
  primaryLight: "#FFF4EE",
  primaryGradient: "linear-gradient(135deg, #E8590C 0%, #F59F00 100%)",
  bg: "#FBF7F4",
  white: "#FFFFFF",
  card: "#FFFFFF",
  text: "#2C2417",
  textSec: "#8C7B6B",
  green: "#2B9348",
  greenBg: "#E8F5E9",
  red: "#C1121F",
  redBg: "#FFEAEA",
  border: "#F0E6DC",
  shadow: "0 2px 12px rgba(44,36,23,0.06)",
  shadowLg: "0 4px 20px rgba(44,36,23,0.1)",
};

// ===== Shared Components =====
const PhoneFrame = ({ children }) => (
  <div style={{
    width: 375, minHeight: 812, background: C.bg,
    borderRadius: 40, border: `3px solid #E0D5CA`,
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
    position: "relative", overflow: "hidden",
    display: "flex", flexDirection: "column",
    fontFamily: "'SF Pro Display', -apple-system, 'PingFang SC', sans-serif",
  }}>
    <div style={{
      height: 44, display: "flex", alignItems: "center", justifyContent: "center",
      background: C.white, borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ width: 120, height: 6, borderRadius: 3, background: "#DDD" }} />
    </div>
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }}>
      {children}
    </div>
  </div>
);

const NavBar = ({ active, onNav }) => {
  const tabs = [
    { key: "income", icon: "💰", label: "今日收入" },
    { key: "expense", icon: "📝", label: "记支出" },
    { key: "overview", icon: "📊", label: "月度总览" },
    { key: "analysis", icon: "📈", label: "盈亏分析" },
    { key: "settings", icon: "⚙️", label: "设置" },
  ];
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, height: 72,
      background: C.white, borderTop: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-around",
      paddingBottom: 8,
    }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onNav(t.key)} style={{
          background: "none", border: "none", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          padding: "4px 0", minWidth: 56,
        }}>
          <span style={{ fontSize: 22 }}>{t.icon}</span>
          <span style={{
            fontSize: 10, fontWeight: active === t.key ? 700 : 400,
            color: active === t.key ? C.primary : C.textSec,
          }}>{t.label}</span>
          {active === t.key && <div style={{
            width: 20, height: 3, borderRadius: 2,
            background: C.primaryGradient, marginTop: 1,
          }} />}
        </button>
      ))}
    </div>
  );
};

const PageHeader = ({ title, subtitle }) => (
  <div style={{
    background: C.primaryGradient, padding: "20px 20px 24px",
    color: C.white, borderRadius: "0 0 24px 24px",
  }}>
    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{title}</h1>
    {subtitle && <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>{subtitle}</p>}
  </div>
);

const Card = ({ children, style }) => (
  <div style={{
    background: C.card, borderRadius: 16, padding: 16,
    boxShadow: C.shadow, border: `1px solid ${C.border}`,
    ...style,
  }}>{children}</div>
);

const AmountDisplay = ({ amount, size = 28, prefix = "¥" }) => {
  const isPos = amount >= 0;
  return (
    <span style={{
      fontSize: size, fontWeight: 800, letterSpacing: -0.5,
      color: isPos ? C.green : C.red,
      fontFamily: "'SF Pro Display', -apple-system, monospace",
    }}>
      {isPos ? "" : "-"}{prefix}{Math.abs(amount).toLocaleString()}
    </span>
  );
};

// ===== Pages =====

// --- Page 1: Daily Income ---
const IncomePage = () => {
  const [values, setValues] = useState(mockDailyIncome);
  const total = Object.values(values).reduce((s, v) => s + (Number(v) || 0), 0);
  const platforms = Object.keys(mockDailyIncome);
  const colors = ["#E8590C", "#F59F00", "#2B9348", "#1971C2", "#9C36B5", "#C1121F"];

  return (
    <div>
      <PageHeader title="今日收入" subtitle="2026年2月28日 · 周六" />
      <div style={{ padding: "16px 16px 0" }}>
        <Card>
          {platforms.map((p, i) => (
            <div key={p} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 0",
              borderBottom: i < platforms.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${colors[i]}15`, display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: colors[i], flexShrink: 0,
              }}>
                {p.slice(0, 2)}
              </div>
              <span style={{ flex: 1, fontSize: 15, color: C.text, fontWeight: 500 }}>{p}</span>
              <div style={{
                display: "flex", alignItems: "center", gap: 2,
                background: C.bg, borderRadius: 10, padding: "8px 12px",
                border: `1px solid ${C.border}`,
              }}>
                <span style={{ fontSize: 14, color: C.textSec }}>¥</span>
                <input
                  type="number"
                  value={values[p]}
                  onChange={e => setValues({ ...values, [p]: e.target.value })}
                  style={{
                    border: "none", background: "transparent", width: 70,
                    fontSize: 16, fontWeight: 600, color: C.text,
                    outline: "none", textAlign: "right",
                    fontFamily: "'SF Pro Display', -apple-system, monospace",
                  }}
                />
              </div>
            </div>
          ))}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, color: C.textSec }}>今日合计</span>
            <AmountDisplay amount={total} />
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`,
          }}>
            <span style={{ fontSize: 13, color: C.textSec }}>本月累计到账</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.primary }}>¥82,000</span>
          </div>
        </Card>

        <button style={{
          width: "100%", padding: "14px 0", marginTop: 16,
          background: C.primaryGradient, color: C.white,
          border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700,
          cursor: "pointer", boxShadow: "0 4px 14px rgba(232,89,12,0.3)",
          letterSpacing: 1,
        }}>
          保 存
        </button>
      </div>
    </div>
  );
};

// --- Page 2: Expense ---
const ExpensePage = () => {
  const [selected, setSelected] = useState(null);
  const categories = [
    { name: "普货", icon: "📦" },
    { name: "周边货物", icon: "🛍️" },
    { name: "工资", icon: "👥" },
    { name: "房租", icon: "🏠" },
    { name: "水电", icon: "💡" },
    { name: "突发支出", icon: "⚡" },
  ];

  return (
    <div>
      <PageHeader title="记支出" subtitle="发生一笔，记一笔" />
      <div style={{ padding: "16px 16px 0" }}>
        <Card>
          <p style={{ fontSize: 13, color: C.textSec, margin: "0 0 12px" }}>选择类别</p>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10,
          }}>
            {categories.map(c => (
              <button key={c.name} onClick={() => setSelected(c.name)} style={{
                padding: "14px 8px", border: `2px solid ${selected === c.name ? C.primary : C.border}`,
                borderRadius: 14, cursor: "pointer",
                background: selected === c.name ? C.primaryLight : C.white,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                transition: "all 0.15s ease",
              }}>
                <span style={{ fontSize: 24 }}>{c.icon}</span>
                <span style={{
                  fontSize: 13, fontWeight: selected === c.name ? 700 : 500,
                  color: selected === c.name ? C.primary : C.text,
                }}>{c.name}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card style={{ marginTop: 12 }}>
          <p style={{ fontSize: 13, color: C.textSec, margin: "0 0 8px" }}>金额</p>
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            background: C.bg, borderRadius: 12, padding: "12px 16px",
            border: `1px solid ${C.border}`,
          }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: C.textSec }}>¥</span>
            <input type="number" placeholder="0.00" style={{
              border: "none", background: "transparent", flex: 1,
              fontSize: 28, fontWeight: 700, color: C.text, outline: "none",
              fontFamily: "'SF Pro Display', -apple-system, monospace",
            }} />
          </div>

          <p style={{ fontSize: 13, color: C.textSec, margin: "16px 0 8px" }}>备注（必填）</p>
          <textarea placeholder="记录这笔支出的用途..." style={{
            width: "100%", minHeight: 72, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "12px 16px", fontSize: 15,
            color: C.text, background: C.bg, outline: "none",
            resize: "none", boxSizing: "border-box",
            fontFamily: "'SF Pro Display', -apple-system, 'PingFang SC', sans-serif",
          }} />
        </Card>

        <button style={{
          width: "100%", padding: "14px 0", marginTop: 16,
          background: C.primaryGradient, color: C.white,
          border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700,
          cursor: "pointer", boxShadow: "0 4px 14px rgba(232,89,12,0.3)",
        }}>
          保存支出
        </button>

        <Card style={{ marginTop: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: "0 0 12px" }}>
            本月支出记录
          </p>
          {mockExpenses.map((e, i) => (
            <div key={e.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 0",
              borderBottom: i < mockExpenses.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: C.primaryLight, display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>
                {categories.find(c => c.name === e.category)?.icon || "📋"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{e.category}</div>
                <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>{e.note}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.red }}>-¥{e.amount.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: C.textSec }}>{e.date.slice(5)}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

// --- Page 3: Monthly Overview ---
const OverviewPage = () => {
  const d = mockMonthlyData;
  const balance = d.totalIncome - d.totalExpense;
  const barColors = ["#E8590C", "#F59F00", "#2B9348", "#1971C2", "#9C36B5", "#C1121F"];

  return (
    <div>
      <PageHeader title="月度总览" subtitle="2026年2月" />
      <div style={{ padding: "16px 16px 0" }}>
        <Card style={{
          background: balance >= 0 ? C.greenBg : C.redBg,
          border: `1px solid ${balance >= 0 ? "#A5D6A7" : "#FFCDD2"}`,
        }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 13, color: C.textSec, margin: "0 0 4px" }}>本月结余</p>
            <AmountDisplay amount={balance} size={36} />
            <p style={{ fontSize: 12, color: C.textSec, margin: "4px 0 0" }}>
              {balance >= 0 ? "✅ 盈利中" : "❌ 亏损中"}
            </p>
          </div>
          <div style={{
            display: "flex", justifyContent: "space-around", marginTop: 16,
            paddingTop: 12, borderTop: `1px dashed ${balance >= 0 ? "#A5D6A7" : "#FFCDD2"}`,
          }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 12, color: C.textSec, margin: 0 }}>总收入</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: C.green, margin: "4px 0 0" }}>¥{d.totalIncome.toLocaleString()}</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 12, color: C.textSec, margin: 0 }}>总支出</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: C.red, margin: "4px 0 0" }}>¥{d.totalExpense.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card style={{ marginTop: 12 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 14px" }}>📥 收入构成</p>
          {d.incomeByPlatform.map((p, i) => (
            <div key={p.name} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{p.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>¥{p.amount.toLocaleString()}</span>
              </div>
              <div style={{ height: 8, background: "#F0E6DC", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${p.pct}%`, borderRadius: 4,
                  background: barColors[i % barColors.length],
                  transition: "width 0.6s ease",
                }} />
              </div>
              <span style={{ fontSize: 11, color: C.textSec }}>{p.pct}%</span>
            </div>
          ))}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 14px" }}>📤 支出构成</p>
          {d.expenseByCategory.map((e, i) => (
            <div key={e.name} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{e.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>¥{e.amount.toLocaleString()}</span>
              </div>
              <div style={{ height: 8, background: "#F0E6DC", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${e.pct}%`, borderRadius: 4,
                  background: barColors[i % barColors.length],
                }} />
              </div>
              <span style={{ fontSize: 11, color: C.textSec }}>{e.pct}%</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

// --- Page 4: Profit Analysis ---
const AnalysisPage = () => {
  const d = mockMonthlyData;
  const balance = d.totalIncome - d.totalExpense;
  const profitRate = ((balance / d.totalIncome) * 100).toFixed(1);
  const breakeven = {
    rent: 8000, salary: 15000, utility: 3500, purchase: 37500, total: 64000,
  };
  const dailyBreakeven = Math.ceil(breakeven.total / 28);
  const surplus = d.totalIncome - breakeven.total;

  return (
    <div>
      <PageHeader title="盈亏分析" subtitle="2026年2月 · 核心数据" />
      <div style={{ padding: "16px 16px 0" }}>

        <Card style={{
          background: C.primaryGradient, border: "none",
          color: C.white, textAlign: "center",
        }}>
          <p style={{ fontSize: 13, margin: "0 0 4px", opacity: 0.85 }}>本月盈亏</p>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1, fontFamily: "monospace" }}>
            {balance >= 0 ? "+" : ""}{`¥${balance.toLocaleString()}`}
          </div>
          <p style={{ fontSize: 14, margin: "4px 0 0", opacity: 0.9 }}>
            利润率 {profitRate}% {balance >= 0 ? "✅" : "❌"}
          </p>
        </Card>

        <Card style={{ marginTop: 12 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 14px" }}>📊 各平台利润贡献</p>
          <div style={{ fontSize: 12, color: C.textSec, marginBottom: 12, padding: "8px 12px", background: C.primaryLight, borderRadius: 8 }}>
            💡 V1版本按到账占比等比例分摊成本，各平台利润率相同，反映整体利润率
          </div>
          {d.incomeByPlatform.map(p => {
            const cost = Math.round(d.totalExpense * (p.amount / d.totalIncome));
            const profit = p.amount - cost;
            return (
              <div key={p.name} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: `1px solid ${C.border}`,
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>
                    到账 ¥{p.amount.toLocaleString()} · 成本 ¥{cost.toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>+¥{profit.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: C.textSec }}>{profitRate}%</div>
                </div>
              </div>
            );
          })}
        </Card>

        <Card style={{ marginTop: 12, border: `2px solid ${C.primary}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>🎯</span>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.primary, margin: 0 }}>盈亏平衡点</p>
          </div>
          <p style={{ fontSize: 12, color: C.textSec, margin: "0 0 12px" }}>基于当前环境变量动态计算</p>

          {[
            { label: "固定成本（房租）", val: breakeven.rent },
            { label: "人力成本（当月工资）", val: breakeven.salary },
            { label: "水电（当月）", val: breakeven.utility },
            { label: "采购成本（近3月均值）", val: breakeven.purchase },
          ].map(item => (
            <div key={item.label} style={{
              display: "flex", justifyContent: "space-between",
              padding: "6px 0", fontSize: 14,
            }}>
              <span style={{ color: C.textSec }}>{item.label}</span>
              <span style={{ fontWeight: 600, color: C.text }}>¥{item.val.toLocaleString()}</span>
            </div>
          ))}

          <div style={{
            marginTop: 12, paddingTop: 12,
            borderTop: `2px dashed ${C.primary}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 13, color: C.textSec }}>每月至少到账</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.primary, fontFamily: "monospace" }}>
                ¥{breakeven.total.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, color: C.textSec }}>每天至少到账</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.primary, fontFamily: "monospace" }}>
                ¥{dailyBreakeven.toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 14, padding: "12px 16px", borderRadius: 12,
            background: surplus >= 0 ? C.greenBg : C.redBg,
            textAlign: "center",
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: surplus >= 0 ? C.green : C.red }}>
              {surplus >= 0
                ? `本月已到账 ¥${d.totalIncome.toLocaleString()}，超过平衡点 ¥${surplus.toLocaleString()} 👍`
                : `本月已到账 ¥${d.totalIncome.toLocaleString()}，距平衡点还差 ¥${Math.abs(surplus).toLocaleString()} ⚠️`
              }
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
};

// --- Page 5: Settings ---
const SettingsPage = () => {
  const items = [
    { icon: "🏪", label: "店铺名称", value: "LuckCup 万达店" },
    { icon: "📱", label: "收入平台管理", value: "6个平台" },
    { icon: "📂", label: "支出类别管理", value: "6个类别" },
    { icon: "🏠", label: "固定房租", value: "¥8,000/月" },
    { icon: "📞", label: "账号与登录", value: "138****8888" },
  ];

  return (
    <div>
      <PageHeader title="我的设置" subtitle="管理店铺基础信息" />
      <div style={{ padding: "16px 16px 0" }}>
        <Card>
          {items.map((item, i) => (
            <div key={item.label} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 0",
              borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : "none",
              cursor: "pointer",
            }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: C.text }}>{item.label}</span>
              <span style={{ fontSize: 14, color: C.textSec }}>{item.value}</span>
              <span style={{ fontSize: 14, color: "#CCC" }}>›</span>
            </div>
          ))}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
            <span style={{ fontSize: 22 }}>ℹ️</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>关于系统</div>
              <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>LuckCup 运营助手 V1.0</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ===== Main App =====
export default function App() {
  const [page, setPage] = useState("income");

  const pages = {
    income: <IncomePage />,
    expense: <ExpensePage />,
    overview: <OverviewPage />,
    analysis: <AnalysisPage />,
    settings: <SettingsPage />,
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #FBF7F4 0%, #F0E6DC 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px 0",
    }}>
      <PhoneFrame>
        {pages[page]}
        <NavBar active={page} onNav={setPage} />
      </PhoneFrame>
    </div>
  );
}
