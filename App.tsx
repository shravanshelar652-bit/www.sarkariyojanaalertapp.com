import { useEffect, useMemo, useState } from 'react';
import { Bell, Building2, CheckCircle2, ChevronRight, CircleUserRound, ClipboardList, FileText, Globe2, Home, Landmark, Mic, Moon, Search, ShieldCheck, Sparkles, Sun, UserCog, WalletCards, XCircle } from 'lucide-react';
import './index.css';

type Language = 'en' | 'hi' | 'mr';
type Tab = 'home' | 'apply' | 'history' | 'profile' | 'admin';

type User = {
  id: number;
  phone: string;
  name: string;
  age: number;
  gender: string;
  income: number;
  state: string;
  district: string;
  occupation: string;
  preferred_language: Language;
  aadhaar_verified: boolean;
};

type Scheme = {
  id: number;
  title: string;
  category: string;
  state: string;
  description: string;
  eligibility: string;
  documents: string;
  benefits: string;
  deadline: string;
  official_link: string;
  min_age: number;
  max_income: number;
  occupation_match: string;
  gender_match: string;
  source: string;
  active: boolean;
};

type Application = {
  id: number;
  user_id: number;
  scheme_id: number;
  status: 'Pending' | 'Under Review' | 'Approved' | 'Rejected';
  answers: Record<string, string>;
  documents: string[];
  timeline: { label: string; at: string | null; done: boolean }[];
  benefit_credited: boolean;
  remarks: string;
  created_at: string;
  sya_schemes?: Scheme;
};

type BankAccount = {
  id: number;
  account_holder: string;
  account_number_masked: string;
  ifsc: string;
  bank_name: string;
  verified: boolean;
  benefit_status: string;
};

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
};

const copy = {
  en: {
    subtitle: 'Discover, apply and track Indian government schemes',
    login: 'Login with mobile OTP', sendOtp: 'Send OTP', verify: 'Verify & enter', phone: 'Mobile number', otp: 'OTP',
    search: 'Search schemes', all: 'All', eligible: 'Eligible', partial: 'Partial', notEligible: 'Not eligible', apply: 'Apply',
    home: 'Home', applyTab: 'Apply', history: 'History', profile: 'Profile', admin: 'Admin', save: 'Save',
    bank: 'Bank account', notifications: 'Alerts', profileTitle: 'Smart profile', docs: 'Documents', benefits: 'Benefits', eligibility: 'Eligibility'
  },
  hi: {
    subtitle: 'सरकारी योजनाएं खोजें, आवेदन करें और स्थिति देखें',
    login: 'मोबाइल OTP से लॉगिन', sendOtp: 'OTP भेजें', verify: 'सत्यापित करें', phone: 'मोबाइल नंबर', otp: 'OTP',
    search: 'योजना खोजें', all: 'सभी', eligible: 'योग्य', partial: 'आंशिक', notEligible: 'योग्य नहीं', apply: 'आवेदन',
    home: 'होम', applyTab: 'आवेदन', history: 'इतिहास', profile: 'प्रोफाइल', admin: 'एडमिन', save: 'सेव',
    bank: 'बैंक खाता', notifications: 'अलर्ट', profileTitle: 'स्मार्ट प्रोफाइल', docs: 'दस्तावेज', benefits: 'लाभ', eligibility: 'पात्रता'
  },
  mr: {
    subtitle: 'सरकारी योजना शोधा, अर्ज करा आणि स्थिती तपासा',
    login: 'मोबाइल OTP लॉगिन', sendOtp: 'OTP पाठवा', verify: 'सत्यापित करा', phone: 'मोबाइल नंबर', otp: 'OTP',
    search: 'योजना शोधा', all: 'सर्व', eligible: 'पात्र', partial: 'अंशतः', notEligible: 'पात्र नाही', apply: 'अर्ज करा',
    home: 'होम', applyTab: 'अर्ज', history: 'इतिहास', profile: 'प्रोफाइल', admin: 'अ‍ॅडमिन', save: 'सेव्ह',
    bank: 'बँक खाते', notifications: 'अलर्ट', profileTitle: 'स्मार्ट प्रोफाइल', docs: 'कागदपत्रे', benefits: 'लाभ', eligibility: 'पात्रता'
  }
};

const categories = ['All', 'किसान', 'विद्यार्थी', 'महिला', 'रोजगार', 'Pension', 'Health', 'Housing'];
const states = ['All India', 'Maharashtra', 'Uttar Pradesh', 'Bihar', 'Rajasthan', 'Tamil Nadu', 'Karnataka', 'Gujarat', 'West Bengal'];
const occupations = ['Farmer', 'Student', 'Worker', 'Self Employed', 'Unemployed', 'Senior Citizen', 'Entrepreneur'];
const genders = ['Male', 'Female', 'Other'];

function classNames(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(' ');
}

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function eligibilityFor(user: User | null, scheme: Scheme) {
  if (!user) return { label: 'Partial', score: 55, reason: 'Complete profile for exact match' };
  let score = 0;
  let checks = 0;
  checks += 1; if (user.age >= scheme.min_age) score += 1;
  checks += 1; if (Number(user.income) <= Number(scheme.max_income)) score += 1;
  checks += 1; if (scheme.state === 'All India' || scheme.state === user.state) score += 1;
  checks += 1; if (scheme.occupation_match === 'Any' || scheme.occupation_match === user.occupation) score += 1;
  checks += 1; if (scheme.gender_match === 'Any' || scheme.gender_match === user.gender) score += 1;
  const percent = Math.round((score / checks) * 100);
  if (percent >= 80) return { label: 'Eligible', score: percent, reason: 'Profile matches scheme rules' };
  if (percent >= 50) return { label: 'Partial', score: percent, reason: 'Some details need review' };
  return { label: 'Not eligible', score: percent, reason: 'Profile does not match key rules' };
}

function LoginCard({ onLogin, dark, setDark }: { onLogin: (user: User) => void; dark: boolean; setDark: (value: boolean) => void }) {
  const [phone, setPhone] = useState('9876543210');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [message, setMessage] = useState('');
  const t = copy[language];

  const send = async () => {
    const data = await api('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send-otp', phone }) });
    setSent(true);
    setMessage(data.message);
  };

  const verify = async () => {
    const data = await api('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify-otp', phone, otp }) });
    onLogin({ ...data.user, preferred_language: language });
  };

  return <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,transparent_35%),linear-gradient(135deg,#f8fafc,#ecfdf5)] dark:bg-[radial-gradient(circle_at_top,#1e3a8a,transparent_35%),linear-gradient(135deg,#020617,#052e16)] flex items-center justify-center p-4">
    <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/90">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 via-white to-emerald-500 shadow-lg"><Landmark className="text-blue-900" /></div>
          <div><h1 className="text-2xl font-black text-slate-900 dark:text-white">Sarkari Yojana Alert</h1><p className="text-sm text-slate-600 dark:text-slate-300">{t.subtitle}</p></div>
        </div>
        <button onClick={() => setDark(!dark)} className="rounded-full border p-2 dark:border-white/20">{dark ? <Sun /> : <Moon />}</button>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
        {(['en', 'hi', 'mr'] as Language[]).map(l => <button key={l} onClick={() => setLanguage(l)} className={classNames('rounded-xl px-3 py-2 text-sm font-bold', language === l ? 'bg-white text-blue-700 shadow dark:bg-slate-700 dark:text-emerald-300' : 'text-slate-500')}>{l.toUpperCase()}</button>)}
      </div>
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-black text-slate-900 dark:text-white">{t.login}</h2>
        <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">{t.phone}</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-lg font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        {sent && <><label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">{t.otp}</label><input value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-lg font-bold tracking-[0.4em] outline-none focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></>}
        {message && <div className="rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">{message}</div>}
        <button onClick={sent ? verify : send} className="w-full rounded-2xl bg-blue-700 py-4 text-lg font-black text-white shadow-xl shadow-blue-700/20 hover:bg-blue-800">{sent ? t.verify : t.sendOtp}</button>
      </div>
    </div>
  </div>;
}

function Skeleton() {
  return <div className="space-y-3 p-4">{[1,2,3].map(i => <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />)}</div>;
}

function SchemeCard({ scheme, user, onSelect, language }: { scheme: Scheme; user: User | null; onSelect: (scheme: Scheme) => void; language: Language }) {
  const status = eligibilityFor(user, scheme);
  const t = copy[language];
  const badge = status.label === 'Eligible' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : status.label === 'Partial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
  return <button onClick={() => onSelect(scheme)} className="w-full rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-start justify-between gap-3">
      <div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-950 dark:text-blue-300">{scheme.category}</span><h3 className="mt-3 text-lg font-black text-slate-900 dark:text-white">{scheme.title}</h3></div>
      <ChevronRight className="text-slate-400" />
    </div>
    <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{scheme.description}</p>
    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold">
      <span className={classNames('rounded-full px-3 py-1', badge)}>{status.label === 'Eligible' ? t.eligible : status.label === 'Partial' ? t.partial : t.notEligible} • {status.score}%</span>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{scheme.state}</span>
      <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-700 dark:bg-orange-950 dark:text-orange-300">Last: {new Date(scheme.deadline).toLocaleDateString('en-IN')}</span>
    </div>
  </button>;
}

function SchemeDetail({ scheme, user, language, onClose, onApplied }: { scheme: Scheme; user: User | null; language: Language; onClose: () => void; onApplied: () => void }) {
  const [docAadhaar, setDocAadhaar] = useState('Aadhaar uploaded (demo)');
  const [docIncome, setDocIncome] = useState('Income certificate uploaded (demo)');
  const [note, setNote] = useState('');
  const status = eligibilityFor(user, scheme);
  const t = copy[language];
  const apply = async () => {
    if (!user) return;
    await api('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, scheme_id: scheme.id, documents: [docAadhaar, docIncome], answers: { note, aadhaarConsent: 'Yes', language } }) });
    onApplied();
    onClose();
  };
  return <div className="fixed inset-0 z-40 bg-slate-950/60 p-3 backdrop-blur-sm" onClick={onClose}>
    <div onClick={e => e.stopPropagation()} className="mx-auto flex max-h-[95vh] max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-slate-900">
      <div className="bg-gradient-to-r from-blue-700 to-emerald-600 p-5 text-white">
        <div className="flex items-start justify-between gap-4"><div><p className="font-bold opacity-80">{scheme.category} • {scheme.source}</p><h2 className="mt-2 text-2xl font-black">{scheme.title}</h2></div><button onClick={onClose} className="rounded-full bg-white/20 p-2">×</button></div>
      </div>
      <div className="space-y-4 overflow-auto p-5">
        <p className="text-slate-700 dark:text-slate-200">{scheme.description}</p>
        <div className="grid gap-3 sm:grid-cols-3"><Info title={t.eligibility} text={scheme.eligibility} /><Info title={t.docs} text={scheme.documents} /><Info title={t.benefits} text={scheme.benefits} /></div>
        <div className="rounded-3xl border border-dashed border-blue-300 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40"><div className="flex items-center gap-2 font-black text-blue-800 dark:text-blue-200"><Sparkles /> Smart Eligibility</div><p className="mt-2 text-sm text-blue-700 dark:text-blue-200">{status.label}: {status.reason}. Score {status.score}%</p></div>
        <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-800"><h3 className="font-black text-slate-900 dark:text-white">In-app application form</h3><div className="mt-3 grid gap-3"><input value={docAadhaar} onChange={e => setDocAadhaar(e.target.value)} className="rounded-2xl border p-3 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /><input value={docIncome} onChange={e => setDocIncome(e.target.value)} className="rounded-2xl border p-3 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Extra note / ग्रामसेवक remarks" className="rounded-2xl border p-3 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></div></div>
        <button onClick={apply} disabled={!user} className="w-full rounded-2xl bg-emerald-600 py-4 font-black text-white shadow-lg hover:bg-emerald-700 disabled:opacity-50">{t.apply}</button>
      </div>
    </div>
  </div>;
}

function Info({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"><h4 className="font-black text-slate-900 dark:text-white">{title}</h4><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{text}</p></div>;
}

function ProfilePanel({ user, setUser, language, bankAccounts, reloadBank }: { user: User; setUser: (user: User) => void; language: Language; bankAccounts: BankAccount[]; reloadBank: () => void }) {
  const t = copy[language];
  const [form, setForm] = useState<User>(user);
  const [bank, setBank] = useState({ account_holder: user.name, account_number: '123456789012', ifsc: 'SBIN0001234', bank_name: 'State Bank of India' });
  const saveProfile = async () => {
    const data = await api('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update-profile', phone: user.phone, profile: form }) });
    setUser(data.user);
  };
  const addBank = async () => {
    await api('/api/bank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, ...bank }) });
    reloadBank();
  };
  return <div className="space-y-4 p-4">
    <section className="rounded-3xl bg-white p-5 shadow-sm dark:bg-slate-900"><h2 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white"><CircleUserRound /> {t.profileTitle}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} /><Field label="Age" value={String(form.age)} onChange={v => setForm({ ...form, age: Number(v) })} /><Select label="Gender" value={form.gender} items={genders} onChange={v => setForm({ ...form, gender: v })} /><Field label="Income / year" value={String(form.income)} onChange={v => setForm({ ...form, income: Number(v) })} /><Select label="State" value={form.state} items={states.filter(s => s !== 'All India')} onChange={v => setForm({ ...form, state: v })} /><Field label="District" value={form.district} onChange={v => setForm({ ...form, district: v })} /><Select label="Occupation" value={form.occupation} items={occupations} onChange={v => setForm({ ...form, occupation: v })} /><Select label="Language" value={form.preferred_language} items={['en', 'hi', 'mr']} onChange={v => setForm({ ...form, preferred_language: v as Language })} /></div><label className="mt-4 flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200"><input type="checkbox" checked={form.aadhaar_verified} onChange={e => setForm({ ...form, aadhaar_verified: e.target.checked })} /> Mock Aadhaar verified</label><button onClick={saveProfile} className="mt-4 rounded-2xl bg-blue-700 px-6 py-3 font-black text-white">{t.save}</button></section>
    <section className="rounded-3xl bg-white p-5 shadow-sm dark:bg-slate-900"><h2 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white"><WalletCards /> {t.bank}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Account holder" value={bank.account_holder} onChange={v => setBank({ ...bank, account_holder: v })} /><Field label="Account number" value={bank.account_number} onChange={v => setBank({ ...bank, account_number: v })} /><Field label="IFSC" value={bank.ifsc} onChange={v => setBank({ ...bank, ifsc: v })} /><Field label="Bank name" value={bank.bank_name} onChange={v => setBank({ ...bank, bank_name: v })} /></div><button onClick={addBank} className="mt-4 rounded-2xl bg-emerald-600 px-6 py-3 font-black text-white">Link bank (demo)</button><div className="mt-4 space-y-2">{bankAccounts.map(b => <div key={b.id} className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{b.bank_name} • {b.account_number_masked} • {b.benefit_status}</div>)}</div></section>
  </div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-bold text-slate-600 dark:text-slate-300">{label}<input value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></label>;
}

function Select({ label, value, items, onChange }: { label: string; value: string; items: string[]; onChange: (value: string) => void }) {
  return <label className="block text-sm font-bold text-slate-600 dark:text-slate-300">{label}<select value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white">{items.map(item => <option key={item}>{item}</option>)}</select></label>;
}

function HistoryPanel({ applications, reload }: { applications: Application[]; reload: () => void }) {
  return <div className="space-y-4 p-4">{applications.length === 0 && <div className="rounded-3xl bg-white p-8 text-center dark:bg-slate-900"><FileText className="mx-auto text-slate-400" size={42} /><p className="mt-3 font-bold text-slate-600 dark:text-slate-300">No applications yet. Apply for a scheme to see tracking.</p></div>}{applications.map(app => <div key={app.id} className="rounded-3xl bg-white p-5 shadow-sm dark:bg-slate-900"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-black text-slate-900 dark:text-white">{app.sya_schemes?.title}</h3><p className="text-sm text-slate-500">Applied {new Date(app.created_at).toLocaleDateString('en-IN')}</p></div><span className={classNames('rounded-full px-3 py-1 text-sm font-black', app.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : app.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}>{app.status}</span></div><div className="mt-4 space-y-3">{(app.timeline || []).map((step, idx) => <div key={idx} className="flex gap-3"><div className={classNames('mt-1 h-4 w-4 rounded-full', step.done ? 'bg-emerald-500' : 'bg-slate-300')} /><div><p className="font-bold text-slate-800 dark:text-slate-100">{step.label}</p><p className="text-xs text-slate-500">{step.at ? new Date(step.at).toLocaleString('en-IN') : 'Waiting'}</p></div></div>)}</div><div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{app.remarks} {app.benefit_credited ? ' Benefit credited simulation is complete.' : ''}</div><button onClick={reload} className="mt-3 text-sm font-black text-blue-700">Refresh status</button></div>)}</div>;
}

function AdminPanel({ schemes, applications, reload }: { schemes: Scheme[]; applications: Application[]; reload: () => void }) {
  const [form, setForm] = useState({ title: 'New District Skill Voucher', category: 'रोजगार', state: 'All India', description: 'Skill training and placement support for eligible youth.', eligibility: 'Age 18+, income below 300000', documents: 'Aadhaar, bank passbook, education certificate', benefits: 'Training voucher up to ₹15,000', deadline: '2026-03-31', official_link: 'https://www.india.gov.in', min_age: 18, max_income: 300000, occupation_match: 'Unemployed', gender_match: 'Any', source: 'Admin Portal' });
  const addScheme = async () => { await api('/api/schemes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); reload(); };
  const deleteScheme = async (id: number) => { await api('/api/schemes', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); reload(); };
  const updateStatus = async (id: number, status: string) => { await api('/api/applications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, remarks: `Admin marked this application as ${status}` }) }); reload(); };
  return <div className="space-y-4 p-4"><section className="rounded-3xl bg-white p-5 dark:bg-slate-900"><h2 className="flex items-center gap-2 text-xl font-black dark:text-white"><UserCog /> Admin Dashboard</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} /><Select label="Category" value={form.category} items={categories.filter(c => c !== 'All')} onChange={v => setForm({ ...form, category: v })} /><Select label="State" value={form.state} items={states} onChange={v => setForm({ ...form, state: v })} /><Field label="Deadline" value={form.deadline} onChange={v => setForm({ ...form, deadline: v })} /><Field label="Max income" value={String(form.max_income)} onChange={v => setForm({ ...form, max_income: Number(v) })} /><Select label="Occupation" value={form.occupation_match} items={['Any', ...occupations]} onChange={v => setForm({ ...form, occupation_match: v })} /></div><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-3 w-full rounded-2xl border p-3 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /><button onClick={addScheme} className="mt-3 rounded-2xl bg-blue-700 px-5 py-3 font-black text-white">Add scheme</button></section><section className="rounded-3xl bg-white p-5 dark:bg-slate-900"><h3 className="font-black dark:text-white">Manage schemes ({schemes.length})</h3><div className="mt-3 max-h-72 space-y-2 overflow-auto">{schemes.map(s => <div key={s.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"><span className="font-bold dark:text-white">{s.title}</span><button onClick={() => deleteScheme(s.id)} className="text-sm font-black text-rose-600">Delete</button></div>)}</div></section><section className="rounded-3xl bg-white p-5 dark:bg-slate-900"><h3 className="font-black dark:text-white">Update applications</h3><div className="mt-3 space-y-2">{applications.map(a => <div key={a.id} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"><p className="font-bold dark:text-white">#{a.id} {a.sya_schemes?.title} • {a.status}</p><div className="mt-2 flex flex-wrap gap-2">{['Under Review', 'Approved', 'Rejected'].map(status => <button key={status} onClick={() => updateStatus(a.id, status)} className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700 dark:bg-slate-900">{status}</button>)}</div></div>)}</div></section></div>;
}

export default function App() {
  const [dark, setDark] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('home');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [state, setState] = useState('All India');
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const language = user?.preferred_language || 'en';
  const t = copy[language];

  const fetchSchemes = async () => {
    const params = new URLSearchParams({ q: query, category, state });
    const data = await api(`/api/schemes?${params.toString()}`);
    setSchemes(data);
  };
  const fetchApplications = async () => { if (user) setApplications(await api(`/api/applications?user_id=${user.id}`)); };
  const fetchBank = async () => { if (user) setBankAccounts(await api(`/api/bank?user_id=${user.id}`)); };
  const fetchNotifications = async () => { if (user) setNotifications(await api(`/api/notifications?user_id=${user.id}`)); };
  const reloadAll = async () => { setLoading(true); try { await Promise.all([fetchSchemes(), fetchApplications(), fetchBank(), fetchNotifications()]); } finally { setLoading(false); } };

  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  useEffect(() => { fetchSchemes().finally(() => setLoading(false)); }, [query, category, state]);
  useEffect(() => { if (user) reloadAll(); }, [user?.id]);

  const recommended = useMemo(() => schemes.filter(s => eligibilityFor(user, s).score >= 60), [schemes, user]);
  const unread = notifications.filter(n => !n.read).length;

  if (!user) return <LoginCard onLogin={setUser} dark={dark} setDark={setDark} />;

  return <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white">
    <header className="sticky top-0 z-30 border-b border-white/50 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto max-w-6xl p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 via-white to-emerald-500"><Landmark className="text-blue-900" /></div><div><h1 className="text-xl font-black">Sarkari Yojana Alert</h1><p className="text-xs text-slate-500 dark:text-slate-400">{t.subtitle}</p></div></div><div className="flex items-center gap-2"><button className="relative rounded-full bg-slate-100 p-3 dark:bg-slate-800"><Bell size={19} />{unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-rose-600 px-1.5 text-xs font-black text-white">{unread}</span>}</button><button onClick={() => setDark(!dark)} className="rounded-full bg-slate-100 p-3 dark:bg-slate-800">{dark ? <Sun size={19} /> : <Moon size={19} />}</button></div></div></div>
    </header>
    <main className="mx-auto max-w-6xl pb-24">
      {tab === 'home' && <div className="p-4"><section className="rounded-[2rem] bg-gradient-to-br from-blue-700 to-emerald-600 p-5 text-white shadow-xl"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="flex items-center gap-2 text-sm font-bold opacity-90"><ShieldCheck size={18} /> Mock Aadhaar: {user.aadhaar_verified ? 'Verified' : 'Not verified'}</p><h2 className="mt-3 text-3xl font-black">Namaste, {user.name}</h2><p className="mt-2 max-w-xl text-white/85">AI-style profile matching recommends schemes for your state, occupation, income and age.</p></div><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-white/15 p-3"><b className="text-2xl">{schemes.length}</b><p className="text-xs">Schemes</p></div><div className="rounded-2xl bg-white/15 p-3"><b className="text-2xl">{recommended.length}</b><p className="text-xs">Matches</p></div><div className="rounded-2xl bg-white/15 p-3"><b className="text-2xl">{applications.length}</b><p className="text-xs">Applied</p></div></div></div></section><section className="mt-4 rounded-3xl bg-white p-4 dark:bg-slate-900"><div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800"><Search className="text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.search} className="w-full bg-transparent font-semibold outline-none" /><Mic className="text-blue-600" /></div><div className="mt-3 flex gap-2 overflow-auto pb-1">{categories.map(c => <button key={c} onClick={() => setCategory(c)} className={classNames('shrink-0 rounded-full px-4 py-2 text-sm font-black', c === category ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>{c === 'All' ? t.all : c}</button>)}</div><select value={state} onChange={e => setState(e.target.value)} className="mt-3 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold dark:border-slate-700 dark:bg-slate-800">{states.map(s => <option key={s}>{s}</option>)}</select></section><section className="mt-4"><h2 className="mb-3 text-xl font-black">Recommended & latest schemes</h2>{loading ? <Skeleton /> : <div className="grid gap-3 md:grid-cols-2">{schemes.map(s => <SchemeCard key={s.id} scheme={s} user={user} language={language} onSelect={setSelectedScheme} />)}</div>}</section></div>}
      {tab === 'apply' && <div className="p-4"><h2 className="mb-3 text-2xl font-black">Apply for schemes</h2><div className="grid gap-3 md:grid-cols-2">{recommended.map(s => <SchemeCard key={s.id} scheme={s} user={user} language={language} onSelect={setSelectedScheme} />)}</div></div>}
      {tab === 'history' && <HistoryPanel applications={applications} reload={fetchApplications} />}
      {tab === 'profile' && <ProfilePanel user={user} setUser={setUser} language={language} bankAccounts={bankAccounts} reloadBank={fetchBank} />}
      {tab === 'admin' && <AdminPanel schemes={schemes} applications={applications} reload={reloadAll} />}
      {tab === 'home' && <section className="mx-4 mb-4 rounded-3xl bg-white p-5 dark:bg-slate-900"><h3 className="flex items-center gap-2 text-xl font-black"><Bell /> {t.notifications}</h3><div className="mt-3 grid gap-2 md:grid-cols-2">{notifications.map(n => <div key={n.id} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"><p className="font-black">{n.title}</p><p className="text-sm text-slate-600 dark:text-slate-300">{n.message}</p></div>)}</div></section>}
    </main>
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"><div className="mx-auto grid max-w-2xl grid-cols-5 gap-1 p-2">{([{ id: 'home', icon: Home, label: t.home }, { id: 'apply', icon: ClipboardList, label: t.applyTab }, { id: 'history', icon: FileText, label: t.history }, { id: 'profile', icon: Building2, label: t.profile }, { id: 'admin', icon: UserCog, label: t.admin }] as { id: Tab; icon: typeof Home; label: string }[]).map(item => <button key={item.id} onClick={() => setTab(item.id)} className={classNames('rounded-2xl py-2 text-xs font-black', tab === item.id ? 'bg-blue-700 text-white' : 'text-slate-500')}><item.icon className="mx-auto mb-1" size={20} />{item.label}</button>)}</div></nav>
    <div className="fixed bottom-24 right-4 z-20 rounded-full bg-emerald-600 p-4 text-white shadow-2xl" title="Hindi voice assistant demo"><Globe2 /></div>
    {selectedScheme && <SchemeDetail scheme={selectedScheme} user={user} language={language} onClose={() => setSelectedScheme(null)} onApplied={reloadAll} />}
  </div>;
}
export default function App() {
  return (
    <div style={{
      padding: "40px",
      fontSize: "30px",
      textAlign: "center"
    }}>
      Sarkari Yojana Alert Working
    </div>
  );
}
