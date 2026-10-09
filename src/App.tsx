import React, { useState, useEffect, useMemo } from 'react'
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, onSnapshot, query, deleteDoc, doc, updateDoc, addDoc 
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAe1_5s7ujsaVC9_8tcaVbIgn78-dCpViU",
  authDomain: "quick-crud-3dea0.firebaseapp.com",
  projectId: "quick-crud-3dea0",
  storageBucket: "quick-crud-3dea0.firebasestorage.app",
  messagingSenderId: "154946577128",
  appId: "1:154946577128:web:7bd6eaf35106f9fdbf5f5d",
  measurementId: "G-5VX6TGVJE5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const JOBS_PER_PAGE = 25;
const APP_PIN = "3270";

const getLocalTodayStr = () => new Date().toLocaleDateString('en-CA');

const getDiffDays = (dateString: string) => {
  if (!dateString) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const appliedDate = new Date(dateString.replace(/-/g, '/'));
  appliedDate.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - appliedDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const getDaysAgo = (dateString: string) => {
  const diffDays = getDiffDays(dateString);
  let relative = '';
  if (diffDays < 0) relative = 'Future';
  else if (diffDays === 1) relative = 'Yesterday';
  else if (diffDays === 0) relative = 'Today';
  else relative = `${diffDays} days ago`;
  
  return `${relative} • ${dateString}`;
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdminTools, setShowAdminTools] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [weekFilter, setWeekFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [needFilter, setNeedFilter] = useState('all');
  const [employerFilter, setEmployerFilter] = useState<string | null>(null);
  const [showEmployers, setShowEmployers] = useState(false);
  const [employerSort, setEmployerSort] = useState('knoxville');
  const [employerSearch, setEmployerSearch] = useState('');
  const [employerKnoxOnly, setEmployerKnoxOnly] = useState(false);
  const [employerCapOnly, setEmployerCapOnly] = useState(false);

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'E') {
        setShowAdminTools(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    if (pinInput.length === 4) {
      if (pinInput === APP_PIN) {
        setIsAuthenticated(true);
      } else {
        const timer = setTimeout(() => setPinInput(''), 400);
        return () => clearTimeout(timer);
      }
    }
  }, [pinInput]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') { 
        if (pinInput.length < 4) setPinInput(prev => prev + e.key); 
      }
      else if (e.key === 'Backspace') { 
        setPinInput(prev => prev.slice(0, -1)); 
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pinInput, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const q = query(collection(db, "jobs"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
        console.error("Firebase error:", error);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [isAuthenticated]);

  const downloadCSV = () => {
    if (jobs.length === 0) return;
    const headers = ["Company", "Brand", "Title", "Date", "Status", "Location", "Type", "Salary", "Job ID", "Confirmation", "Notes", "Needs Action", "URL"];
    const csvContent = [
      headers.join(","),
      ...jobs.map(j => [
        `"${(j.company || "").replace(/"/g, '""')}"`,
        `"${(j.brand || "").replace(/"/g, '""')}"`,
        `"${(j.title || "").replace(/"/g, '""')}"`,
        j.date,
        j.status,
        j.location,
        j.type,
        `"${(j.salary || "").replace(/"/g, '""')}"`,
        `"${(j.jobId || "").replace(/"/g, '""')}"`,
        `"${(j.confirmNo || "").replace(/"/g, '""')}"`,
        `"${(j.notes || "").replace(/"/g, '""')}"`,
        j.needsAction ? "yes" : "",
        j.url
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `job_export_${getLocalTodayStr()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setSearchTerm(''); setStatusFilter('all'); setDateFilter('all'); setWeekFilter('all'); setTypeFilter('all'); setNeedFilter('all');
    setEmployerFilter(null); setShowEmployers(false);
    setCurrentPage(1);
  };

  const handleStatClick = (type: string, val: string) => {
    resetFilters();
    if (type === 'date') setDateFilter(val);
    if (type === 'status') setStatusFilter(val);
    setCurrentPage(1);
  };

  const isFiltered = searchTerm || statusFilter !== 'all' || dateFilter !== 'all' || weekFilter !== 'all' || typeFilter !== 'all' || needFilter !== 'all' || employerFilter;

  const normName = (s: any) => (s || "").toString().trim().toLowerCase();

  const COMPANY_ALIASES: Record<string, string> = {
    "petsafe": "radio systems",
    "radio systems": "radio systems",
    "us bank": "u.s. bank",
    "u.s. bank": "u.s. bank",
    "clayton homes": "clayton",
    "vanderbilt mortgage and finance, inc.": "clayton",
    "vanderbilt mortgage and finance": "clayton",
  };
  const canonicalName = (s: any) => COMPANY_ALIASES[normName(s)] || normName(s);

  const isActiveJob = (j: any) => {
    const status = (j.status || "").trim().toLowerCase();
    const diff = getDiffDays(j.date);
    return !(status === 'rejected' ||
             status === 'ghosted' ||
             status === 'interviewed ➔ rejected' ||
             diff > 30);
  };

  const companyActiveCount = (name: string) => {
    const n = canonicalName(name);
    if (!n) return 0;
    return jobs.filter(j => (canonicalName(j.company) === n || canonicalName(j.brand) === n) && isActiveJob(j)).length;
  };

  const needsActionCount = jobs.filter(j => j.needsAction && isActiveJob(j)).length;

  const employerGroups = useMemo(() => {
    const groups = new Map<string, { key: string; total: number; active: number; local: number; spells: Map<string, number> }>();
    jobs.forEach(j => {
      const key = canonicalName(j.company) || canonicalName(j.brand) || "(unknown)";
      let g = groups.get(key);
      if (!g) { g = { key, total: 0, active: 0, local: 0, spells: new Map() }; groups.set(key, g); }
      g.total += 1;
      if (isActiveJob(j)) g.active += 1;
      if ((j.location || "").toString().trim().toLowerCase() === "local") g.local += 1;
      const raw = (j.company || j.brand || "(unknown)").toString().trim() || "(unknown)";
      g.spells.set(raw, (g.spells.get(raw) || 0) + 1);
    });
    const arr = [...groups.values()].map(g => {
      let best = g.key, bestN = -1;
      g.spells.forEach((n, s) => { if (n > bestN) { bestN = n; best = s; } });
      return { key: g.key, display: best, total: g.total, active: g.active, local: g.local };
    });
    arr.sort((a, b) => ((b.local > 0 ? 1 : 0) - (a.local > 0 ? 1 : 0)) || b.total - a.total || a.display.localeCompare(b.display));
    return arr;
  }, [jobs]);

  const employerAtCap = (g: { key: string; active: number }) => g.active >= 2 && g.key !== "u.s. bank";

  const closeEmployers = () => {
    setShowEmployers(false);
    setEmployerSearch(''); setEmployerSort('knoxville');
    setEmployerKnoxOnly(false); setEmployerCapOnly(false);
  };

  // Employers panel: search + sort + filters applied to the groups
  const visibleEmployers = useMemo(() => {
    const q = employerSearch.trim().toLowerCase();
    const arr = employerGroups.filter(g =>
      (!q || g.display.toLowerCase().includes(q) || g.key.includes(q)) &&
      (!employerKnoxOnly || g.local > 0) &&
      (!employerCapOnly || employerAtCap(g))
    );
    const sorters: Record<string, (a: typeof arr[0], b: typeof arr[0]) => number> = {
      knoxville: (a, b) => ((b.local > 0 ? 1 : 0) - (a.local > 0 ? 1 : 0)) || b.total - a.total || a.display.localeCompare(b.display),
      total: (a, b) => b.total - a.total || a.display.localeCompare(b.display),
      active: (a, b) => b.active - a.active || b.total - a.total || a.display.localeCompare(b.display),
      alpha: (a, b) => a.display.localeCompare(b.display),
    };
    return [...arr].sort(sorters[employerSort] || sorters.knoxville);
  }, [employerGroups, employerSearch, employerKnoxOnly, employerCapOnly, employerSort]);

  const dateMetrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDay = today.getDay() === 0 ? 7 : today.getDay();
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - (currentDay - 1));
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    return {
      thisMondayTime: thisMonday.getTime(),
      lastMondayTime: lastMonday.getTime()
    };
  }, [jobs]);

  const sortedAndFilteredJobs = useMemo(() => {
    const todayStr = getLocalTodayStr();
    return jobs
      .filter(j => {
        const company = (j.company || "").toLowerCase();
        const brand = (j.brand || "").toLowerCase();
        const title = (j.title || "").toLowerCase();
        const jobId = (j.jobId || "").toLowerCase();
        const confirmNo = (j.confirmNo || "").toLowerCase();
        const status = (j.status || "").trim().toLowerCase();
        const jobDate = (j.date || "");
        const diff = getDiffDays(jobDate);

        const matchSearch = (company + " " + brand + " " + title + " " + jobId + " " + confirmNo).includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'all' || status === statusFilter.toLowerCase();
        const matchNeed = needFilter === 'all' || (needFilter === 'needs_action' && !!j.needsAction);
        
        let matchDate = true;
        if (dateFilter === 'today') {
          matchDate = jobDate === todayStr;
        } else if (dateFilter === 'active_pipeline') {
          const isDead = status === 'rejected' || 
                         status === 'ghosted' || 
                         status === 'interviewed ➔ rejected' ||
                         diff > 30;
          matchDate = !isDead;
        } else if (dateFilter === 'no_response') {
          matchDate = diff > 30;
        }

        const jobTime = new Date((j.date || "1970-01-01").replace(/-/g, '/')).setHours(0, 0, 0, 0);
        let matchWeek = true;
        if (weekFilter === 'this_week') {
          matchWeek = jobTime >= dateMetrics.thisMondayTime;
        } else if (weekFilter === 'last_week') {
          matchWeek = jobTime >= dateMetrics.lastMondayTime && jobTime < dateMetrics.thisMondayTime;
        }

        const matchType = typeFilter === 'all' || (j.type || "").toLowerCase() === typeFilter.toLowerCase();

        const matchEmployer = !employerFilter || canonicalName(j.company) === employerFilter || canonicalName(j.brand) === employerFilter;
        
        return matchSearch && matchStatus && matchNeed && matchDate && matchWeek && matchType && matchEmployer;
      })
      .sort((a, b) => {
        const dateA = new Date((a.date || "1970-01-01").replace(/-/g, '/')).getTime();
        const dateB = new Date((b.date || "1970-01-01").replace(/-/g, '/')).getTime();
        if (dateB === dateA) return (b.createdAt || 0) - (a.createdAt || 0);
        return dateB - dateA;
      });
  }, [jobs, searchTerm, statusFilter, dateFilter, weekFilter, typeFilter, needFilter, employerFilter, dateMetrics]);

  const paginatedJobs = sortedAndFilteredJobs.slice((currentPage - 1) * JOBS_PER_PAGE, currentPage * JOBS_PER_PAGE);
  const totalPages = Math.ceil(sortedAndFilteredJobs.length / JOBS_PER_PAGE);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      company: editingJob.company || '',
      brand: editingJob.brand || '',
      jobId: editingJob.jobId || '',
      confirmNo: editingJob.confirmNo || '',
      title: editingJob.title || '',
      date: editingJob.date || getLocalTodayStr(),
      status: editingJob.status || 'Applied',
      location: editingJob.location || 'Remote',
      url: editingJob.url || '',
      salary: editingJob.salary || '',
      notes: editingJob.notes || '',
      needsAction: !!editingJob.needsAction,
      type: editingJob.type || 'Full-Time',
      createdAt: editingJob.createdAt || Date.now()
    };
    if (editingJob.id) await updateDoc(doc(db, "jobs", editingJob.id), data);
    else await addDoc(collection(db, "jobs"), data);
    setIsModalOpen(false);
    setEditingJob(null);
  };

  const getCount = (key: string, val: string) => {
    return jobs.filter(j => {
      const dbVal = (j[key] || "").toString().trim().toLowerCase();
      const target = val.trim().toLowerCase();
      return dbVal === target;
    }).length;
  };

  const getWeekCount = (type: 'this' | 'last') => {
    return jobs.filter(j => {
      const jobTime = new Date((j.date || "1970-01-01").replace(/-/g, '/')).setHours(0, 0, 0, 0);
      if (type === 'this') {
        return jobTime >= dateMetrics.thisMondayTime;
      } else {
        return jobTime >= dateMetrics.lastMondayTime && jobTime < dateMetrics.thisMondayTime;
      }
    }).length;
  };

  const todayStr = getLocalTodayStr();

  const rejectedCount = getCount('status', 'rejected'); 
  const ghostedCount = getCount('status', 'ghosted');   
  const intvRejCount = getCount('status', 'interviewed ➔ rejected'); 
  const noResponseCount = jobs.filter(j => getDiffDays(j.date) > 30).length; 

  const activeCount = jobs.filter(j => {
    const status = (j.status || "").trim().toLowerCase();
    const diff = getDiffDays(j.date);
    const isDead = status === 'rejected' || 
                   status === 'ghosted' || 
                   status === 'interviewed ➔ rejected' ||
                   diff > 30;
    return !isDead;
  }).length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
        <div className="w-full max-w-xs text-center">
          <div className="w-16 h-16 bg-black text-white flex items-center justify-center rounded-3xl mx-auto mb-4 text-2xl font-black shadow-xl">JT</div>
          <h1 className="text-2xl font-black mb-8">Job Tracker</h1>
          <div className="flex justify-center gap-3 mb-10">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center text-xl font-bold transition-all ${pinInput[i] ? 'border-slate-300 bg-white text-slate-400' : 'border-slate-100 bg-white'}`}>
                {pinInput[i] ? '●' : ''}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'CLR', 0, 'DEL'].map((btn, idx) => (
              <button 
                key={idx} 
                onClick={() => { 
                  if(btn === 'DEL') setPinInput(p => p.slice(0, -1)); 
                  else if(btn === 'CLR') setPinInput('');
                  else if(typeof btn === 'number') {
                    if(pinInput.length < 4) setPinInput(p => p + btn); 
                  }
                }} 
                className={`h-14 rounded-xl font-bold transition-all text-sm bg-white border border-slate-100 active:scale-95 hover:bg-slate-50 ${btn === 'DEL' || btn === 'CLR' ? 'text-rose-500 text-[10px]' : 'text-slate-600'}`}
              >
                {btn === 'DEL' ? '←' : btn}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] text-slate-900 pb-20 font-sans">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-black tracking-tighter uppercase italic">Job Tracker</h1>
        <div className="flex gap-2">
          {showAdminTools && (
             <button onClick={downloadCSV} className="bg-white border border-slate-200 text-slate-500 px-4 py-2.5 rounded-full font-bold transition-all active:scale-95">Export CSV</button>
          )}
          <button onClick={() => { setEditingJob({ date: getLocalTodayStr(), status: 'Applied', location: 'Remote', type: 'Full-Time' }); setIsModalOpen(true); }} className="bg-black text-white px-5 py-2.5 rounded-full font-bold text-[11px] uppercase tracking-widest">+ Add Entry</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Active', val: activeCount, filter: 'active_pipeline', type: 'date' },
            { label: 'Today', val: jobs.filter(j => (j.date) === todayStr).length, filter: 'today', type: 'date' },
            { label: 'Intv', val: jobs.filter(j => (j.status || "").trim().toLowerCase() === 'interviewing').length, filter: 'interviewing', type: 'status' },
          ].map((stat) => {
            const isActive = stat.type === 'status' ? statusFilter === stat.filter : dateFilter === stat.filter;
            return (
              <button key={stat.label} onClick={() => handleStatClick(stat.type, stat.filter)}
                className={`p-6 rounded-[32px] text-left transition-all border-2 ${ isActive ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-white border-transparent' } shadow-sm`}>
                <div className="text-3xl font-black mb-1 text-black tnum">{stat.val}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</div>
              </button>
            );
          })}
        </div>

        <div className="relative mb-8">
          <input className="w-full bg-white border border-slate-200 pl-6 pr-14 py-4 rounded-[24px] outline-none focus:border-slate-400 transition-all text-sm font-semibold shadow-sm" 
            placeholder="Search company, brand, title, job ID..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          <div className="absolute right-6 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-10">
          {[
            { label: 'This Week', val: 'this_week', type: 'week', count: getWeekCount('this') },
            { label: 'Last Week', val: 'last_week', type: 'week', count: getWeekCount('last') },
            { label: 'Contract', val: 'contract', type: 'type', count: getCount('type', 'contract') },
            { label: 'Intv ➔ Rej', val: 'interviewed ➔ rejected', type: 'status', count: intvRejCount },
            { label: 'Rejected', val: 'rejected', type: 'status', count: rejectedCount },
            { label: 'Ghosted', val: 'ghosted', type: 'status', count: ghostedCount },
            { label: 'No Response', val: 'no_response', type: 'date', count: noResponseCount },
            { label: 'Needs Action', val: 'needs_action', type: 'needaction', count: needsActionCount },
            { label: 'All Applications', val: 'all', type: 'reset', count: jobs.length },
          ].map(f => (
            <button key={f.label} onClick={() => {
              if (f.type === 'reset') resetFilters();
              else {
                if (f.type === 'week') setWeekFilter(weekFilter === f.val ? 'all' : f.val);
                if (f.type === 'type') setTypeFilter(typeFilter === f.val ? 'all' : f.val);
                if (f.type === 'status') setStatusFilter(statusFilter === f.val ? 'all' : f.val);
                if (f.type === 'date') setDateFilter(dateFilter === f.val ? 'all' : f.val);
                if (f.type === 'needaction') setNeedFilter(needFilter === f.val ? 'all' : f.val);
                setCurrentPage(1);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold transition-all border ${ (weekFilter === f.val || typeFilter === f.val || statusFilter === f.val || dateFilter === f.val || needFilter === f.val || (f.val === 'all' && !isFiltered)) ? 'bg-black border-black text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300' }`}>
              {f.label} <span className="opacity-50">{f.count}</span>
            </button>
          ))}
          <button onClick={() => setShowEmployers(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold transition-all border bg-white border-slate-200 text-slate-500 hover:border-slate-300">
            Employers <span className="opacity-50">{employerGroups.length}</span>
          </button>
          {employerFilter && (
            <button onClick={() => { setEmployerFilter(null); setCurrentPage(1); }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold transition-all border bg-black border-black text-white">
              {(employerGroups.find(g => g.key === employerFilter)?.display || employerFilter)} <span className="opacity-60">✕</span>
            </button>
          )}
          {isFiltered && (
            <button onClick={resetFilters} className="px-4 py-2 rounded-full text-[10px] font-black text-rose-500 uppercase border border-rose-100 bg-rose-50 hover:bg-rose-100 transition-colors">
              Reset
            </button>
          )}
        </div>

        <div className="space-y-6">
          {loading ? <div className="p-10 text-center text-[10px] font-black text-slate-300 animate-pulse">SYNCING...</div> : sortedAndFilteredJobs.length === 0 ? <div className="p-10 text-center text-slate-400 text-sm italic">Empty.</div> : 
            paginatedJobs.map(job => (
              <div key={job.id} className={`bg-white border p-6 rounded-[32px] shadow-[0_2px_16px_-6px_rgba(15,23,42,0.10)] hover:shadow-[0_10px_28px_-10px_rgba(15,23,42,0.14)] hover:-translate-y-0.5 transition-all ${job.needsAction ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-100'}`}>
                <div className="flex justify-between items-start gap-2 mb-1">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="font-black text-sm text-black uppercase tracking-tight">{job.company}</span>
                    {job.brand && normName(job.brand) !== normName(job.company) && <span className="text-sky-700 font-bold text-[9px] bg-sky-50 px-2 py-0.5 rounded-full">via {job.brand}</span>}
                    {job.salary && <span className="text-emerald-600 font-bold text-[9px] bg-emerald-50 px-2 py-0.5 rounded-full">{job.salary}</span>}
                    {job.jobId && <span className="text-slate-500 font-bold text-[9px] bg-slate-100 px-2 py-0.5 rounded-full">ID {job.jobId}</span>}
                    {job.needsAction && <span className="text-amber-700 font-black text-[9px] bg-amber-100 px-2 py-0.5 rounded-full uppercase">Action needed</span>}
                  </div>
                  <div className="flex gap-1 shrink-0 -mr-2 -mt-2">
                    {job.url && <a href={job.url} target="_blank" rel="noreferrer" className="p-2 text-slate-300 hover:text-black"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>}
                    <button onClick={() => { setEditingJob(job); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-black"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                    <button onClick={() => deleteDoc(doc(db, "jobs", job.id))} className="p-2 text-slate-300 hover:text-rose-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </div>
                <div className="mb-2">
                  <div className="text-slate-500 text-xs font-semibold">{job.title}</div>
                </div>
                  {job.notes && (
                    <div className="mb-4 flex gap-2.5 w-full">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0 mt-4">P</div>
                      <div className="flex-1 min-w-0 w-full">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Note</div>
                        <div className="w-full bg-slate-50 border border-slate-200/70 rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[13px] leading-relaxed text-slate-600 whitespace-pre-wrap break-words overflow-hidden">{job.notes}</div>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[9px] font-black text-black bg-slate-50 px-3 py-1.5 rounded-xl uppercase">{getDaysAgo(job.date)}</span>
                    <span className={`text-[9px] px-3 py-1.5 rounded-xl font-black uppercase ${ (job.status || "").toLowerCase().includes('interviewed') ? 'bg-orange-100 text-orange-700' : (job.status || "").toLowerCase().includes('rejected') ? 'bg-rose-100 text-rose-700' : (job.status || "").toLowerCase() === 'interviewing' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500' }`}>{job.status}</span>
                    <span className="text-[9px] font-bold text-slate-400 self-center ml-1">{job.location} • {job.type}</span>
                  </div>
              </div>
            ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-12">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-6 py-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-20 text-slate-400">Prev</button>
            <span className="text-[10px] font-black bg-white border border-slate-100 w-10 h-10 flex items-center justify-center rounded-xl shadow-sm">{currentPage}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-6 py-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-20 text-slate-400">Next</button>
          </div>
        )}
      </main>

      {showEmployers && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={closeEmployers}>
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl my-auto max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black mb-2 uppercase text-center tracking-tighter">Employers</h2>
            <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{visibleEmployers.length} of {employerGroups.length} employers • tap one to filter</p>
            <input placeholder="Search employers..." value={employerSearch} onChange={e => setEmployerSearch(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm outline-none mb-3" />
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { label: 'Knoxville first', val: 'knoxville' },
                { label: 'Most apps', val: 'total' },
                { label: 'Most active', val: 'active' },
                { label: 'A–Z', val: 'alpha' },
              ].map(s => (
                <button key={s.val} onClick={() => setEmployerSort(s.val)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${employerSort === s.val ? 'bg-black border-black text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {s.label}
                </button>
              ))}
              <button onClick={() => setEmployerKnoxOnly(v => !v)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${employerKnoxOnly ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                Knoxville only
              </button>
              <button onClick={() => setEmployerCapOnly(v => !v)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${employerCapOnly ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                At cap
              </button>
            </div>
            <div className="overflow-y-auto space-y-2 pr-1">
              {visibleEmployers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm italic">No employers match.</div>
              ) : visibleEmployers.map(g => {
                const atCap = employerAtCap(g);
                return (
                  <button key={g.key} onClick={() => { setEmployerFilter(g.key); closeEmployers(); setCurrentPage(1); }}
                    className="w-full flex items-center justify-between gap-3 bg-slate-50 hover:bg-slate-100 rounded-2xl px-4 py-3 transition-all text-left">
                    <span className="font-bold text-sm text-slate-800 truncate">{g.display}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      {g.local > 0 && <span className="text-[9px] font-black uppercase text-sky-600">Knoxville</span>}
                      {atCap && <span className="text-[9px] font-black uppercase text-rose-500">at cap</span>}
                      <span className="text-[10px] font-black text-slate-600 bg-white border border-slate-200 rounded-full px-2.5 py-1">{g.active} active</span>
                      <span className="text-[10px] font-bold text-slate-400">{g.total} total</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <button onClick={closeEmployers} className="w-full py-3 mt-4 text-[10px] font-black text-slate-400 uppercase">Close</button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl my-auto">
            <h2 className="text-xl font-black mb-8 uppercase text-center tracking-tighter">Application Details</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Company</label>
                  <input required className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm outline-none" value={editingJob?.company || ''} onChange={e => setEditingJob({...editingJob, company: e.target.value})} />
                  {editingJob?.company?.trim() ? (() => {
                    const c = companyActiveCount(editingJob.company);
                    return (
                      <div className={`text-[10px] font-bold ml-2 mt-1 ${c >= 2 ? 'text-rose-500' : 'text-slate-400'}`}>
                        {c} active on file{c >= 2 ? ' — at cap, skip new applications' : ''}
                      </div>
                    );
                  })() : null}
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Brand (posting name)</label>
                  <input className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm outline-none" placeholder="e.g. PetSafe" value={editingJob?.brand || ''} onChange={e => setEditingJob({...editingJob, brand: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Position</label>
                  <input className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm outline-none" value={editingJob?.title || ''} onChange={e => setEditingJob({...editingJob, title: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Job / Req ID</label>
                  <input className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm outline-none" placeholder="e.g. 4473940938" value={editingJob?.jobId || ''} onChange={e => setEditingJob({...editingJob, jobId: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Salary</label>
                  <input className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm outline-none" value={editingJob?.salary || ''} onChange={e => setEditingJob({...editingJob, salary: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Date</label>
                  <input type="date" className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold" value={editingJob?.date || ''} onChange={e => setEditingJob({...editingJob, date: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Job URL</label>
                <input className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm outline-none" value={editingJob?.url || ''} onChange={e => setEditingJob({...editingJob, url: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Confirmation #</label>
                  <input className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm outline-none" value={editingJob?.confirmNo || ''} onChange={e => setEditingJob({...editingJob, confirmNo: e.target.value})} />
                </div>
                <label className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-amber-500" checked={!!editingJob?.needsAction} onChange={e => setEditingJob({...editingJob, needsAction: e.target.checked})} />
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Waiting on me</span>
                </label>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Notes</label>
                <div className="flex gap-2.5 bg-slate-50 rounded-2xl px-3.5 py-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[11px] font-black shrink-0">P</div>
                  <textarea rows={2} className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-slate-700 placeholder:text-slate-400" placeholder="Add a note — next step, blocker, follow-up..." value={editingJob?.notes || ''} onChange={e => setEditingJob({...editingJob, notes: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Loc</label>
                  <select className="w-full bg-slate-50 border-none rounded-2xl px-2 py-3.5 text-[10px] font-bold" value={editingJob?.location || 'Remote'} onChange={e => setEditingJob({...editingJob, location: e.target.value})}>
                    <option>Remote</option><option>Local</option><option>Hybrid</option><option>On-site</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Type</label>
                  <select className="w-full bg-slate-50 border-none rounded-2xl px-2 py-3.5 text-[10px] font-bold" value={editingJob?.type || 'Full-Time'} onChange={e => setEditingJob({...editingJob, type: e.target.value})}>
                    <option>Full-Time</option><option>Contract</option><option>Part-Time</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Status</label>
                  <select className="w-full bg-slate-50 border-none rounded-2xl px-2 py-3.5 text-[10px] font-bold text-blue-600" value={editingJob?.status || 'Applied'} onChange={e => setEditingJob({...editingJob, status: e.target.value})}>
                    <option>Applied</option><option>Interviewing</option><option>Interviewed ➔ Rejected</option><option>Rejected</option><option>Ghosted</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-3 pt-6">
                <button type="submit" className="w-full bg-black text-white font-bold py-4 rounded-2xl text-[11px] uppercase tracking-widest shadow-xl">Confirm Entry</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full py-3 text-[10px] font-black text-slate-400 uppercase">Dismiss</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
