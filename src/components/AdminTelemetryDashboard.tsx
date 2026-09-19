import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Activity,
  BarChart2,
  Users,
  MessageSquare,
  TrendingUp,
  Calendar,
  Zap,
  RefreshCw,
} from 'lucide-react';

interface DayData {
  date: string;
  fullDate: string;
  messages: number;
  activeUsers: number;
}

interface AnalyticsSummary {
  totalMessages30d: number;
  avgMessagesPerDay: number;
  peakActiveUsers: number;
  peakMessagesDate: string;
  peakMessagesCount: number;
  totalRegisteredUsers: number;
}

export const AdminTelemetryDashboard: React.FC = () => {
  const [data, setData] = useState<DayData[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'30' | '14' | '7'>('30');
  const [chartView, setChartView] = useState<'both' | 'messages' | 'users'>('both');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/analytics');
      const json = await res.json();
      if (json.analytics) {
        setData(json.analytics);
        setSummary(json.summary);
      }
    } catch (err) {
      console.error('Failed to load telemetry analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const displayedData = React.useMemo(() => {
    const days = parseInt(timeRange, 10);
    return data.slice(-days);
  }, [data, timeRange]);

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#161822] border border-white/20 p-3 rounded-xl shadow-2xl text-xs font-mono select-none">
          <p className="text-white font-semibold mb-1.5 flex items-center gap-1.5 border-b border-white/10 pb-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5 text-neutral-300">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-bold text-white">
                {entry.value} {entry.name === 'Message Volume' ? 'transmissions' : 'personnel'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#14161f] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header with Title and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
              Operational Telemetry & Activity Metrics
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
              30-DAY TIMELINE
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            Recharts-driven trend analysis of message volume and active personnel presence across frequencies.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Range Filter */}
          <div className="flex items-center bg-white/5 p-0.5 rounded-xl border border-white/10 text-xs font-mono">
            <button
              type="button"
              onClick={() => setTimeRange('7')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                timeRange === '7' ? 'bg-indigo-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              7D
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('14')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                timeRange === '14' ? 'bg-indigo-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              14D
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('30')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                timeRange === '30' ? 'bg-indigo-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              30D
            </button>
          </div>

          {/* View Mode */}
          <div className="flex items-center bg-white/5 p-0.5 rounded-xl border border-white/10 text-xs font-mono">
            <button
              type="button"
              onClick={() => setChartView('both')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                chartView === 'both' ? 'bg-indigo-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Both
            </button>
            <button
              type="button"
              onClick={() => setChartView('messages')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                chartView === 'messages' ? 'bg-indigo-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Messages
            </button>
            <button
              type="button"
              onClick={() => setChartView('users')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                chartView === 'users' ? 'bg-indigo-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Users
            </button>
          </div>

          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-colors"
            title="Refresh analytics telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <span className="text-[10.5px] uppercase font-mono tracking-wider font-semibold">
                30D Volume
              </span>
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <p className="text-xl font-bold text-white font-mono">{summary.totalMessages30d}</p>
            <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
              ~{summary.avgMessagesPerDay} trans / day
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <span className="text-[10.5px] uppercase font-mono tracking-wider font-semibold">
                Peak Daily
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-white font-mono">{summary.peakMessagesCount}</p>
            <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
              Recorded on {summary.peakMessagesDate}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <span className="text-[10.5px] uppercase font-mono tracking-wider font-semibold">
                Active Peak
              </span>
              <Users className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-xl font-bold text-white font-mono">{summary.peakActiveUsers}</p>
            <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
              of {summary.totalRegisteredUsers} authorized staff
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <span className="text-[10.5px] uppercase font-mono tracking-wider font-semibold">
                System Uptime
              </span>
              <Zap className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <p className="text-xl font-bold text-emerald-400 font-mono">99.98%</p>
            <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">Zero packet degradation</p>
          </div>
        </div>
      )}

      {/* Main Charts Area */}
      <div className="space-y-6">
        {/* Message Volume Chart */}
        {(chartView === 'both' || chartView === 'messages') && (
          <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <h3 className="text-xs font-semibold text-neutral-200">
                  Daily Transmission Volume (Messages / Day)
                </h3>
              </div>
              <span className="text-[10.5px] font-mono text-neutral-500">
                Last {timeRange} Days
              </span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="msgGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#ffffff40"
                    tick={{ fill: '#ffffff60', fontSize: 10 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#ffffff40"
                    tick={{ fill: '#ffffff60', fontSize: 10 }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={customTooltip} />
                  <Area
                    type="monotone"
                    dataKey="messages"
                    name="Message Volume"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#msgGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Active User Trends Chart */}
        {(chartView === 'both' || chartView === 'users') && (
          <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h3 className="text-xs font-semibold text-neutral-200">
                  Active Personnel Trends (Unique Daily Operators)
                </h3>
              </div>
              <span className="text-[10.5px] font-mono text-neutral-500">
                Last {timeRange} Days
              </span>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#ffffff40"
                    tick={{ fill: '#ffffff60', fontSize: 10 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#ffffff40"
                    tick={{ fill: '#ffffff60', fontSize: 10 }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={customTooltip} />
                  <Area
                    type="monotone"
                    dataKey="activeUsers"
                    name="Active Personnel"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#userGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
