import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Send, Loader, Users, Briefcase, Phone, Bell, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const _base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const BASE_API = _base.endsWith('/api') ? _base : `${_base}/api`;

const waFetch = async (url, options = {}) => {
  const token = localStorage.getItem('superadmin_token');
  const res = await fetch(`${BASE_API}/superadmin/whatsapp${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
};
const post = (url, body) => waFetch(url, { method: 'POST', body: JSON.stringify(body || {}) });

// Mirrors the backend parser closely enough to give a live count; the server is the source of truth.
const previewNumbers = (text) => {
  const items = text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
  const seen = new Set();
  let invalid = 0;
  items.forEach((raw) => {
    let n = raw.replace(/[\s\-().]/g, '');
    if (n.startsWith('00')) n = `+${n.slice(2)}`;
    const d = n.replace(/\D/g, '');
    let e = null;
    if (d.startsWith('254') && d.length === 12) e = `+${d}`;
    else if (d.startsWith('0') && d.length === 10) e = `+254${d.slice(1)}`;
    else if ((d.startsWith('7') || d.startsWith('1')) && d.length === 9) e = `+254${d}`;
    else if (n.startsWith('+') && /^\+\d{8,15}$/.test(n)) e = n;
    if (e) seen.add(e); else invalid += 1;
  });
  return { valid: seen.size, invalid };
};

const Stat = ({ icon: Icon, label, value }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Icon className="h-5 w-5" /></div>
    <div><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-bold text-gray-900">{value ?? '—'}</p></div>
  </div>
);

export default function WhatsAppTab() {
  const [audienceInfo, setAudienceInfo] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [agents, setAgents] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [onlyWithoutPackages, setOnlyWithoutPackages] = useState(true);
  const [reminding, setReminding] = useState(false);

  const [audience, setAudience] = useState('numbers_only');
  const [agentIds, setAgentIds] = useState([]);
  const [agentFilter, setAgentFilter] = useState('');
  const [numbers, setNumbers] = useState('');
  const [templateSid, setTemplateSid] = useState('');
  const [vars, setVars] = useState({});
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, t, ag, h] = await Promise.allSettled([
      waFetch('/audience'), waFetch('/templates'), waFetch('/agents'), waFetch('/broadcasts'),
    ]);
    if (a.status === 'fulfilled') setAudienceInfo(a.value);
    if (t.status === 'fulfilled') setTemplates(t.value.templates || []);
    else toast.error('Could not load templates from Twilio');
    if (ag.status === 'fulfilled') setAgents(ag.value.agents || []);
    if (h.status === 'fulfilled') setHistory(h.value.broadcasts || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const template = useMemo(() => templates.find((t) => t.sid === templateSid), [templates, templateSid]);
  const numberStats = useMemo(() => previewNumbers(numbers), [numbers]);
  const filteredAgents = useMemo(
    () => agents.filter((a) => a.name.toLowerCase().includes(agentFilter.toLowerCase())),
    [agents, agentFilter]
  );

  const preview = useMemo(() => {
    if (!template) return '';
    return template.body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n) => vars[n] || `{{${n}}}`).replace(/\{name\}/gi, 'Amina');
  }, [template, vars]);

  const profileTargets =
    audience === 'all_agents' ? audienceInfo?.agents
      : audience === 'clients' ? audienceInfo?.clients
        : audience === 'selected_agents' ? agentIds.length : 0;
  const totalEstimate = (profileTargets || 0) + numberStats.valid;

  const sendReminders = async () => {
    const n = onlyWithoutPackages ? audienceInfo?.agentsWithoutPackages : audienceInfo?.agents;
    if (!window.confirm(`Send the "add your packages" reminder to up to ${n ?? 'all'} agent(s)?`)) return;
    setReminding(true);
    try {
      const r = await post('/agent-package-reminder', { onlyWithoutPackages });
      toast.success(r.recipientCount === 0
        ? 'Nobody to remind — everyone was reminded recently or already has packages'
        : `Reminder sent to ${r.sentCount} agent(s)${r.failedCount ? `, ${r.failedCount} failed` : ''}`);
      load();
    } catch (e) { toast.error(e.message); } finally { setReminding(false); }
  };

  const canSend = templateSid && consent && !sending && totalEstimate > 0 &&
    (!template || template.variables.every((v) => (vars[v] || '').trim()));

  const sendBroadcast = async () => {
    if (!window.confirm(`Send "${template?.name}" to about ${totalEstimate} recipient(s)? This cannot be undone.`)) return;
    setSending(true); setResult(null);
    try {
      const r = await post('/broadcast', {
        audience, agentIds, extraNumbers: numbers, templateSid, templateName: template?.name, variables: vars,
      });
      setResult(r);
      toast.success(`Sent ${r.sentCount} of ${r.recipientCount}`);
      load();
    } catch (e) { toast.error(e.message); } finally { setSending(false); }
  };

  if (loading && !audienceInfo) {
    return <div className="flex justify-center py-20"><Loader className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">WhatsApp Messaging</h2>
          <p className="text-sm text-gray-500">Send approved template messages to agents, clients, or any phone number.</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Briefcase} label="Agents reachable" value={audienceInfo?.agents} />
        <Stat icon={Users} label="Clients reachable" value={audienceInfo?.clients} />
        <Stat icon={Bell} label="Agents with no packages" value={audienceInfo?.agentsWithoutPackages} />
        <Stat icon={Phone} label="Recent broadcasts" value={history.length} />
      </div>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex items-start gap-3">
          <Bell className="h-5 w-5 text-amber-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Remind agents to log in and add packages</h3>
            <p className="text-sm text-gray-500">
              Sends your approved <code>agent_package_reminder</code> template, personalised with each agent&apos;s first name.
              Agents reminded in the last few days are skipped automatically.
            </p>
          </div>
        </div>
        {audienceInfo && !audienceInfo.reminderTemplateConfigured && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            Set <code>TWILIO_TEMPLATE_AGENT_PACKAGE_REMINDER_SID</code> on the server (see docs/TWILIO_WHATSAPP_TEMPLATES.md).
          </p>
        )}
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={onlyWithoutPackages} onChange={(e) => setOnlyWithoutPackages(e.target.checked)} />
          Only agents who haven&apos;t created a package yet
        </label>
        <button
          onClick={sendReminders}
          disabled={reminding || !audienceInfo?.reminderTemplateConfigured}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {reminding ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send reminder
        </button>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Send a message</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Recipients</label>
          <select value={audience} onChange={(e) => setAudience(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="numbers_only">Phone numbers only (people not in the system)</option>
            <option value="all_agents">All agents</option>
            <option value="selected_agents">Selected agents</option>
            <option value="clients">All clients</option>
          </select>
        </div>

        {audience === 'selected_agents' && (
          <div className="border border-gray-200 rounded-lg">
            <input value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} placeholder="Search agents…" className="w-full px-3 py-2 text-sm border-b border-gray-200 rounded-t-lg" />
            <div className="max-h-48 overflow-y-auto divide-y">
              {filteredAgents.map((a) => (
                <label key={a.id} className={`flex items-center gap-2 px-3 py-2 text-sm ${a.sendable ? '' : 'opacity-40'}`}>
                  <input
                    type="checkbox"
                    disabled={!a.sendable}
                    checked={agentIds.includes(a.id)}
                    onChange={(e) => setAgentIds((p) => (e.target.checked ? [...p, a.id] : p.filter((x) => x !== a.id)))}
                  />
                  <span className="flex-1">{a.name}</span>
                  <span className="text-xs text-gray-400">{a.sendable ? a.phone : 'no number / opted out'}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Extra phone numbers (optional)</label>
          <textarea
            value={numbers}
            onChange={(e) => setNumbers(e.target.value)}
            rows={4}
            placeholder={'One per line or comma-separated\n0712345678\n+255712345678'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">
            {numberStats.valid} valid{numberStats.invalid > 0 && <span className="text-red-600"> · {numberStats.invalid} invalid (will be skipped)</span>}.
            Use international format (+code) for non-Kenyan numbers.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
          <select
            value={templateSid}
            onChange={(e) => { setTemplateSid(e.target.value); setVars({}); }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select an approved template…</option>
            {templates.map((t) => <option key={t.sid} value={t.sid}>{t.name}</option>)}
          </select>
        </div>

        {template && template.variables.length > 0 && (
          <div className="space-y-2">
            {template.variables.map((v) => (
              <div key={v}>
                <label className="block text-xs font-medium text-gray-600 mb-1">Variable {`{{${v}}}`}</label>
                <input
                  value={vars[v] || ''}
                  onChange={(e) => setVars((p) => ({ ...p, [v]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder={v === '1' ? 'e.g. {name} — replaced with each person’s first name' : ''}
                />
              </div>
            ))}
            <p className="text-xs text-gray-500">Use <code>{'{name}'}</code> to personalise (falls back to “there” for numbers outside the system). Line breaks are not allowed.</p>
          </div>
        )}

        {template && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap">{preview}</div>
        )}

        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          I confirm these recipients have agreed to receive WhatsApp messages from UmrahMarket.
        </label>

        <button
          onClick={sendBroadcast}
          disabled={!canSend}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send to ~{totalEstimate} recipient{totalEstimate === 1 ? '' : 's'}
        </button>

        {result && (
          <div className="border border-gray-200 rounded-lg p-3 text-sm space-y-1">
            <p className="flex items-center gap-2 font-medium text-green-700"><CheckCircle className="h-4 w-4" />Sent {result.sentCount} of {result.recipientCount}</p>
            {result.failedCount > 0 && (
              <details className="text-red-600">
                <summary>{result.failedCount} failed</summary>
                <ul className="list-disc ml-5">{result.failed.map((f, i) => <li key={i}>{f.phone}: {f.error}</li>)}</ul>
              </details>
            )}
            {result.invalidNumbers?.length > 0 && <p className="text-amber-700">Skipped invalid: {result.invalidNumbers.join(', ')}</p>}
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <h3 className="font-semibold text-gray-900 p-4 border-b">Recent broadcasts</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Template</th><th className="px-4 py-2">Audience</th><th className="px-4 py-2">Sent</th><th className="px-4 py-2">Failed</th></tr>
            </thead>
            <tbody className="divide-y">
              {history.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No broadcasts yet</td></tr>}
              {history.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-2 whitespace-nowrap">{format(new Date(b.created_at), 'dd MMM yyyy HH:mm')}</td>
                  <td className="px-4 py-2">{b.template_name}</td>
                  <td className="px-4 py-2">{b.audience}</td>
                  <td className="px-4 py-2">{b.sent_count}/{b.recipient_count}</td>
                  <td className="px-4 py-2">{b.failed_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
