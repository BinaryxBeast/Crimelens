import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// Muted monochrome-compatible palette for crime types
const CRIME_COLORS = {
  'Chain Snatching':  '#e57373',
  'Cyber Crime':      '#4dd0e1',
  'Drug Trafficking': '#ef5350',
  'Burglary':         '#a5d6a7',
  'Financial Fraud':  '#fff176',
  'Theft':            '#81c784',
  'Assault':          '#ffb74d',
  'Robbery':          '#ce93d8',
  'Domestic Violence':'#f48fb1',
  'Extortion':        '#ffcc80',
  'Smuggling':        '#4db6ac',
  'Other':            '#78909c',
};

const TICK_COLOR  = '#525252';
const GRID_COLOR  = 'rgba(255,255,255,0.05)';

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1e1e1e',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 8,
    color: '#f5f5f5',
    fontSize: 12,
    boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
    padding: '8px 12px',
  },
  labelStyle: { color: '#f5f5f5', fontWeight: 700, marginBottom: 4 },
  itemStyle:  { color: '#9e9e9e' },
};

// Gradient definitions for area charts
const AreaGradients = () => (
  <defs>
    <linearGradient id="grad-primary" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor="#ffffff" stopOpacity={0.18} />
      <stop offset="95%" stopColor="#ffffff" stopOpacity={0.01} />
    </linearGradient>
    <linearGradient id="grad-danger" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor="#ef5350" stopOpacity={0.35} />
      <stop offset="95%" stopColor="#ef5350" stopOpacity={0.01} />
    </linearGradient>
    <linearGradient id="grad-warm" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor="#ff9800" stopOpacity={0.3} />
      <stop offset="95%" stopColor="#ff9800" stopOpacity={0.01} />
    </linearGradient>
  </defs>
);

// ── Monthly Incident Trend ─────────────────────────────────────
export function MonthlyTrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <AreaGradients />
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
        <XAxis dataKey="month" tick={{ fill: TICK_COLOR, fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: TICK_COLOR, fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Area
          type="monotone"
          dataKey="count"
          name="Incidents"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={2}
          fill="url(#grad-primary)"
          dot={{ fill: '#ffffff', strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: '#ffffff' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Crime Type Donut Pie ───────────────────────────────────────
export function CrimeTypePieChart({ data }) {
  const pieData = Object.entries(data)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {pieData.map((entry, i) => (
            <Cell key={i} fill={CRIME_COLORS[entry.name] || `hsl(${i * 40}, 55%, 58%)`} />
          ))}
        </Pie>
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend
          formatter={(value) => (
            <span style={{ color: '#9e9e9e', fontSize: 10 }}>{value}</span>
          )}
          iconSize={8}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── District Horizontal Bar ────────────────────────────────────
export function DistrictBarChart({ data }) {
  const barData = Object.entries(data)
    .map(([district, count]) => ({ district: district.split(' ')[0], count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
        <XAxis type="number" tick={{ fill: TICK_COLOR, fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="district" tick={{ fill: '#9e9e9e', fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Bar dataKey="count" name="Incidents" radius={[0, 4, 4, 0]} maxBarSize={14}>
          {barData.map((_, i) => (
            <Cell key={i} fill={`rgba(255,255,255,${0.55 - i * 0.04})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Status Stacked Bar ─────────────────────────────────────────
export function StatusTrendChart({ incidents }) {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d;
  });

  const data = months.map(d => {
    const label = d.toLocaleDateString('en-IN', { month: 'short' });
    const monthInc = incidents.filter(i => {
      const o = new Date(i.occurred_at);
      return o.getMonth() === d.getMonth() && o.getFullYear() === d.getFullYear();
    });
    return {
      month: label,
      Open:                  monthInc.filter(i => i.status === 'Open').length,
      Closed:                monthInc.filter(i => i.status === 'Closed').length,
      'Under Investigation': monthInc.filter(i => i.status === 'Under Investigation').length,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
        <XAxis dataKey="month" tick={{ fill: TICK_COLOR, fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: TICK_COLOR, fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend formatter={v => <span style={{ color: '#9e9e9e', fontSize: 10 }}>{v}</span>} iconSize={8} iconType="circle" />
        <Bar dataKey="Open"               stackId="s" fill="#ef5350" radius={[0,0,0,0]} />
        <Bar dataKey="Under Investigation" stackId="s" fill="#ff9800" radius={[0,0,0,0]} />
        <Bar dataKey="Closed"              stackId="s" fill="#66bb6a" radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Risk Score Line Chart ──────────────────────────────────────
export function RiskTrendLine({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
        <XAxis dataKey="name" tick={{ fill: TICK_COLOR, fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: TICK_COLOR, fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Bar dataKey="riskScore" name="Risk Score" radius={[3, 3, 0, 0]} maxBarSize={32}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.riskScore > 70 ? '#ef5350' : d.riskScore > 50 ? '#ff9800' : 'rgba(255,255,255,0.3)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
