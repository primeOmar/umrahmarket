import React, { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Store,
  Users,
  Eye,
  RefreshCw,
} from "lucide-react";

// ─── API base + superadmin-scoped fetch (self-contained) ─────────────────────
const _base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const BASE_API = _base.endsWith('/api/visits') ? _base : `${_base}/api/visits`;

const visitsFetch = async (url, options = {}) => {
  const res = await fetch(`${BASE_API}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${localStorage.getItem('superadmin_token')}`,
    },
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const preview = (await res.text()).slice(0, 80);
    throw new Error(`Unexpected response (status ${res.status}): ${preview}`);
  }

  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `${res.status} ${res.statusText}`);
  return body;
};

// ---------------------------------------------------------------------------
// Live data source: GET /api/visits/getagentvisits (via the self-contained
// visitsFetch above, matching the superadmin-token pattern used elsewhere —
// e.g. the PublicChat pcFetch helper).
//
// ONE call, no agentId: the backend groups every visit row by agent
// server-side and returns { agents: [{ agentId, agentName,
// verificationStatus, yearsExperience, totalVisits, visits: [...] }],
// totalVisits }.
//
// IMPORTANT: the backend can return the SAME real-world agency as more than
// one group — e.g. "package" visits (agent_id is null, only agent_name is
// set) land in a separate bucket from "agent" profile-page visits (agent_id
// set). Grouping the frontend rows by agentId alone therefore duplicates the
// agency in the list. We merge groups by normalized agentName below so one
// agency = one row, regardless of how the backend split its buckets.
// ---------------------------------------------------------------------------

const RANGES = { "7D": 7, "30D": 30, "90D": 90, All: Infinity };

function dateKey(iso) {
  return new Date(iso).toISOString().slice(0, 10);
}

function dateLabel(key) {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// UTC-safe day-key arithmetic. Mixing local Date methods (setHours/setDate)
// with toISOString()-derived keys is what caused visits to disappear for
// anyone outside UTC: a Nairobi (UTC+3) "local midnight today" converts to
// *yesterday* in UTC, so the last bucket in the chart was keyed one day off
// from the visited_at rows (which are stored/keyed in UTC). Everything below
// stays in UTC date-string space end to end.
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function keyDaysAgo(baseKey, n) {
  const d = new Date(`${baseKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function daysBetweenKeys(fromKey, toKey) {
  const a = new Date(`${fromKey}T00:00:00Z`);
  const b = new Date(`${toKey}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

// Zero-filled daily series for the given window, most recent day last.
function buildDailySeries(rows, daysBack) {
  const counts = {};
  rows.forEach((r) => {
    const k = dateKey(r.visited_at);
    counts[k] = (counts[k] || 0) + 1;
  });

  const tKey = todayKey();

  let span = daysBack;
  if (daysBack === Infinity) {
    if (rows.length === 0) {
      span = 1;
    } else {
      const earliestKey = rows.reduce((min, r) => {
        const k = dateKey(r.visited_at);
        return k < min ? k : min;
      }, tKey);
      span = Math.max(1, daysBetweenKeys(earliestKey, tKey) + 1);
    }
  }

  return Array.from({ length: span }, (_, i) => {
    const k = keyDaysAgo(tKey, span - 1 - i);
    return { date: dateLabel(k), key: k, visits: counts[k] || 0 };
  });
}

function sumVisits(days) {
  return days.reduce((a, b) => a + b.visits, 0);
}

function latestVisitAt(rows) {
  if (!rows.length) return null;
  return rows.reduce(
    (latest, r) => (r.visited_at > latest ? r.visited_at : latest),
    rows[0].visited_at
  );
}

// Compact "time since" label: "Just now", "12m ago", "3h ago", "5d ago",
// falling back to a short date once it's more than a couple of weeks old.
function formatRelativeTime(iso) {
  if (!iso) return "No visits yet";

  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 14) return `${days}d ago`;

  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      new Date(iso).getFullYear() !== new Date().getFullYear()
        ? "numeric"
        : undefined,
  });
}

// Running total across ALL agents' full history, from the earliest visit on
// record to today — independent of the 7D/30D/90D/All range toggle, since
// "cumulative from the initial visit" always means the whole timeline.
function buildCumulativeSeries(allRows) {
  if (allRows.length === 0) return [];

  const counts = {};
  allRows.forEach((r) => {
    const k = dateKey(r.visited_at);
    counts[k] = (counts[k] || 0) + 1;
  });

  const tKey = todayKey();
  const earliestKey = allRows.reduce((min, r) => {
    const k = dateKey(r.visited_at);
    return k < min ? k : min;
  }, tKey);
  const span = Math.max(1, daysBetweenKeys(earliestKey, tKey) + 1);

  let running = 0;
  return Array.from({ length: span }, (_, i) => {
    const k = keyDaysAgo(tKey, span - 1 - i);
    running += counts[k] || 0;
    return { date: dateLabel(k), key: k, cumulative: running };
  });
}

async function fetchVisits(url) {
  return visitsFetch(url);
}

// Merge backend agent groups so ONE real-world agency (matched by normalized
// name) always produces ONE row, even if the backend sent it back as several
// buckets (e.g. a null-agentId "package visits" bucket plus a real-agentId
// "agent profile visits" bucket for the same agency).
function mergeAgentGroups(rawAgents) {
  const grouped = new Map(); // key: normalized name -> merged entry

  (rawAgents || []).forEach((a) => {
    const displayName = (a.agentName || "Unknown agent").trim();
    const key = displayName.toLowerCase();

    const entry = grouped.get(key) || {
      id: null,
      name: displayName,
      agencyName: displayName,
      verificationStatus: null,
      yearsExperience: null,
      rows: [],
    };

    entry.rows.push(...(a.visits || []));

    // Prefer a real agentId / verification / experience over nulls from
    // whichever bucket happens to be missing them.
    if (!entry.id && a.agentId) entry.id = a.agentId;
    if (!entry.verificationStatus && a.verificationStatus) {
      entry.verificationStatus = a.verificationStatus;
    }
    if (entry.yearsExperience == null && a.yearsExperience != null) {
      entry.yearsExperience = a.yearsExperience;
    }

    grouped.set(key, entry);
  });

  return Array.from(grouped.entries()).map(([key, entry]) => ({
    ...entry,
    // Fall back to the name-key as a stable React `key` when no agency ever
    // had a real agentId (e.g. purely anonymous/package-only traffic).
    id: entry.id || key,
  }));
}

export default function AgentAgentTraffic() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [agents, setAgents] = useState([]); // [{ id, name, agencyName, rows }]
  const [range, setRange] = useState("30D");
  const [query, setQuery] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    const controller = { cancelled: false };
    load(controller, { isRefresh: false });
    return () => {
      controller.cancelled = true;
    };
  }, []);

  async function load(controller, { isRefresh }) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);

    try {
      // One call: the backend groups every row by agent already.
      const overview = await fetchVisits("/getagentvisits");

      if (controller.cancelled) return;

      const built = mergeAgentGroups(overview.agents);

      setAgents(built);
    } catch (err) {
      if (!controller.cancelled) {
        setLoadError(err.message || "Failed to load agent visits");
      }
    } finally {
      if (!controller.cancelled) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  function handleRefresh() {
    if (loading || refreshing) return;
    load({ cancelled: false }, { isRefresh: true });
  }

  const windowDays = RANGES[range];

  const withTotals = useMemo(() => {
    return agents.map((a) => {
      const current = buildDailySeries(a.rows, windowDays);
      const currentTotal = sumVisits(current);

      let delta = null;
      if (windowDays !== Infinity && current.length) {
        const windowStartKey = current[0].key;
        const priorStartKey = keyDaysAgo(windowStartKey, windowDays);
        const windowStartMs = Date.parse(`${windowStartKey}T00:00:00Z`);
        const priorStartMs = Date.parse(`${priorStartKey}T00:00:00Z`);

        const priorTotal = a.rows.filter((r) => {
          const t = new Date(r.visited_at).getTime();
          return t >= priorStartMs && t < windowStartMs;
        }).length;

        delta =
          priorTotal === 0
            ? currentTotal > 0
              ? 100
              : null
            : Math.round(((currentTotal - priorTotal) / priorTotal) * 100);
      }

      const lastVisit = latestVisitAt(a.rows);

      return { ...a, current, total: currentTotal, delta, lastVisit };
    });
  }, [agents, windowDays]);

  const rows = useMemo(() => {
    const filtered = withTotals.filter(
      (a) =>
        a.name?.toLowerCase().includes(query.toLowerCase()) ||
        a.agencyName?.toLowerCase().includes(query.toLowerCase())
    );
    filtered.sort((a, b) => (sortDesc ? b.total - a.total : a.total - b.total));
    return filtered;
  }, [withTotals, query, sortDesc]);

  const totalVisits = withTotals.reduce((sum, a) => sum + a.total, 0);
  const activeAgents = withTotals.length;
  const avgPerAgent = activeAgents ? Math.round(totalVisits / activeAgents) : 0;
  const topAgent = [...withTotals].sort((a, b) => b.total - a.total)[0];

  const dailyNetwork = useMemo(() => {
    if (!withTotals.length) return [];
    const len = withTotals[0].current.length;
    return Array.from({ length: len }, (_, idx) => {
      const date = withTotals[0].current[idx]?.date ?? "";
      const visits = withTotals.reduce(
        (sum, a) => sum + (a.current[idx]?.visits ?? 0),
        0
      );
      return { date, visits };
    });
  }, [withTotals]);

  const cumulativeSeries = useMemo(() => {
    const allRows = agents.flatMap((a) => a.rows);
    return buildCumulativeSeries(allRows);
  }, [agents]);

  const allTimeTotal = cumulativeSeries.length
    ? cumulativeSeries[cumulativeSeries.length - 1].cumulative
    : 0;

  const barData = [...withTotals]
    .sort((a, b) => b.total - a.total)
    .map((a) => ({
      name: (a.agencyName || a.name || "").split(" ")[0],
      visits: a.total,
    }));

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-stone-50 font-sans flex items-center justify-center">
        <p className="text-sm text-stone-500">Loading agent traffic…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen w-full bg-stone-50 font-sans flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-500">
          Couldn't load agent visits: {loadError}
        </p>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600 shadow-sm hover:bg-stone-50"
        >
          <RefreshCw size={13} />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-stone-50 font-sans">
      <div>
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mt-1 text-2xl font-semibold text-stone-900 sm:text-3xl">
              Agent traffic
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Daily visits per agent storefront, ranked by demand.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start">
            <div className="inline-flex rounded-lg border border-stone-200 bg-white p-1 shadow-sm">
              {Object.keys(RANGES).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    range === r
                      ? "bg-emerald-700 text-white"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh"
              className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 shadow-sm transition hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Stat row */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard
            icon={<Eye size={16} />}
            label="Total visits"
            value={totalVisits.toLocaleString()}
          />
          <StatCard
            icon={<Eye size={16} />}
            label="All-time visits"
            value={allTimeTotal.toLocaleString()}
          />
          <StatCard
            icon={<Store size={16} />}
            label="Active Agents"
            value={activeAgents}
          />
          <StatCard
            icon={<Users size={16} />}
            label="Avg per Agent"
            value={avgPerAgent.toLocaleString()}
          />
          <StatCard
            icon={<ArrowUpRight size={16} />}
            label="Top performer"
            value={topAgent ? topAgent.agencyName : "—"}
            small
          />
        </div>

        {/* Daily network trend */}
        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-800">
              Daily visits, all Agents — {range}
            </h2>
            <span className="text-xs text-stone-400">
              {dailyNetwork.length} day{dailyNetwork.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyNetwork} margin={{ left: -10 }}>
                <CartesianGrid vertical={false} stroke="#EDEBE5" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#78716c" }}
                  axisLine={{ stroke: "#E7E5E0" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#78716c" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  cursor={{ stroke: "#0f766e", strokeWidth: 1 }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E7E5E0",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="visits"
                  stroke="#0f766e"
                  fill="#0f766e"
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumulative visits — full history, from the first ever visit to today, independent of the range toggle */}
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-800">
              Cumulative visits, all Agents
            </h2>
            <span className="text-xs font-mono text-stone-400">
              {allTimeTotal.toLocaleString()} total
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeSeries} margin={{ left: -10 }}>
                <CartesianGrid vertical={false} stroke="#EDEBE5" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#78716c" }}
                  axisLine={{ stroke: "#E7E5E0" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#78716c" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  cursor={{ stroke: "#7c3aed", strokeWidth: 1 }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E7E5E0",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#7c3aed"
                  fill="#7c3aed"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Per-Agent totals comparison */}
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-800">
              Total visits by Agent — {range}
            </h2>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="#EDEBE5" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#78716c" }}
                  axisLine={{ stroke: "#E7E5E0" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#78716c" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  cursor={{ fill: "#F5F4F0" }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E7E5E0",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="visits" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Search + sort */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search agent or Agent..."
              className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm text-stone-700 placeholder-stone-400 shadow-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <button
            onClick={() => setSortDesc((s) => !s)}
            className="self-start rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600 shadow-sm hover:bg-stone-50 sm:self-auto"
          >
            Sort: {sortDesc ? "Most visits" : "Fewest visits"}
          </button>
        </div>

        {/* Ranked Agent list */}
        <div className="mt-4 flex flex-col gap-3">
          {rows.map((agent, idx) => (
            <AgentRow key={agent.id} agent={agent} rank={idx + 1} />
          ))}
          {rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white py-10 text-center text-sm text-stone-400">
              No Agents match "{query}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, small }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-stone-400">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p
        className={`mt-2 font-semibold text-stone-900 ${
          small ? "truncate text-sm" : "font-mono text-xl"
        }`}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function AgentRow({ agent, rank }) {
  const delta = agent.delta;
  const up = delta === null ? true : delta >= 0;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 sm:flex-row sm:items-center">
      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-emerald-300 bg-emerald-50">
        <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-stone-50" />
        <div className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-stone-50" />
        <span className="font-mono text-lg font-semibold text-emerald-800">
          {String(rank).padStart(2, "0")}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-stone-900">
          {agent.agencyName}
        </p>
        <p className="truncate text-xs text-stone-500">{agent.name}</p>
        <p className="mt-0.5 truncate text-[11px] text-stone-400">
          Last visit: {formatRelativeTime(agent.lastVisit)}
        </p>
      </div>

      <div className="h-10 w-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={agent.current}
            margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          >
            <Area
              type="monotone"
              dataKey="visits"
              stroke="#0f766e"
              fill="#0f766e"
              fillOpacity={0.12}
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex shrink-0 items-center gap-4 sm:w-32 sm:justify-end">
        <div className="text-right">
          <p className="font-mono text-base font-semibold text-stone-900">
            {agent.total.toLocaleString()}
          </p>
          {delta !== null && (
            <div
              className={`flex items-center justify-end gap-0.5 text-xs font-medium ${
                up ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(delta)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}