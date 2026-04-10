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

const getDaysAgo = (dateString: string) => {
  if (!dateString) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const appliedDate = new Date(dateString.replace(/-/g, '\/'));
  appliedDate.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - appliedDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Future'; 
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    if (pinInput.length === 4) {
      if (pinInput === APP_PIN) setIsAuthenticated(true);
      else setTimeout(() => setPinInput(''), 400);
    }
  }, [pinInput]);

  useEffect(() => {
    if (isAuthenticated) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') { if (pinInput.length < 4) setPinInput(prev => prev + e.key); }
      else if (e.key === 'Backspace') { setPinInput(prev => prev.slice(0, -1)); }
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
    });
    return () => unsubscribe();
  }, [isAuthenticated]);

  const resetFilters = () => {
    setSearchTerm(''); setStatusFilter('all'); setDateFilter('all'); setLocationFilter('all'); setTypeFilter('all');
    setCurrentPage(1);
  };

  const handleStatClick = (type: string, val: string) => {
    resetFilters();
    if (type === 'status') setStatusFilter(val);
    if (type === 'date') setDateFilter(val);
    setCurrentPage(1);
  };

  const isFiltered = searchTerm || statusFilter !== 'all' || dateFilter !== 'all' || locationFilter !== 'all' || typeFilter !== 'all';

  const sortedAndFilteredJobs = useMemo(() => {
    const todayStr = getLocalTodayStr();
    return jobs
      .filter(j => {
        const company = (j.company || "").toLowerCase();
        const title = (j.title || "").toLowerCase();
        const status = (j.status || "Applied").toLowerCase();
        const jobDate = (j.date || "");
        const location = (j.location || "Remote").toLowerCase();
        const type = (j.type || "Full-Time").toLowerCase();
        const matchSearch = (company + title).includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'all' || status === statusFilter.toLowerCase();
        const matchDate = dateFilter === 'all' || jobDate === todayStr;
        const matchLocation = locationFilter === 'all' || location === locationFilter.toLowerCase();
        const matchType = typeFilter === 'all' || type === typeFilter.toLowerCase();
        return matchSearch && matchStatus && matchDate && matchLocation && matchType;
      })
      .sort((a, b) => {
        const dateA = new Date((a.date || "1970-01-01").replace(/-/g, '\/')).getTime();
        const dateB = new Date((b.date || "1970-01-01").replace(/-/g, '\/')).getTime();
        if (dateB === dateA) return (b.createdAt || 0) - (a.createdAt || 0);
        return dateB - dateA;
      });
  }, [jobs, searchTerm, statusFilter, dateFilter, locationFilter, typeFilter]);

  const paginatedJobs = sortedAndFilteredJobs.slice((currentPage - 1) * JOBS_PER_PAGE, currentPage * JOBS_PER_PAGE);
  const totalPages = Math.ceil(sortedAndFilteredJobs.length / JOBS_PER_PAGE);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      company: editingJob.company || '',
      title: editingJob.title || '',
      date: editingJob.date || getLocalTodayStr(),
      status: editingJob.status || 'Applied',
      location: editingJob.location || 'Remote',
      url: editingJob.url || '',
      salary: editingJob.salary || '',
      type: editingJob.type || 'Full-Time',
      createdAt: editingJob.createdAt || Date.now()
    };
    if (editingJob.id) await updateDoc(doc(db, "jobs", editingJob.id), data);
    else await addDoc(collection(db, "jobs"), data);
    setIsModalOpen(false);
    setEditingJob(null);
  };

  const getCount = (key: string, val: string) => jobs.filter(j => (j[key] || "").toLowerCase() === val.toLowerCase()).length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-black text-white flex items-center justify-center rounded-3xl mx-auto mb-4 text-2xl font-black shadow-xl">JT</div>
          <h1 className="text-2xl font-black mb-8">Job Tracker</h1>
          <div className="flex justify-center gap-3 mb-10">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center text-xl font-bold transition-all ${pinInput[i] ? 'border-slate-300 bg-white text-slate-400' : 'border-slate-100 bg-white'}`}>
                {pinInput[i] ? '●' : ''}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 px-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((btn, idx) => (
              <button key={idx} onClick={() => { if(btn==='del') setPinInput(p=>p.slice(0,-1)); else if(btn!=='') if(pinInput.length<4) setPinInput(p=>p+btn); }} className={`h-14 rounded-xl font-bold transition-all ${btn === '' ? 'opacity-0 cursor-default' : 'bg-white border border-slate-100 active:scale-95 hover:bg-slate-50'}`}>
                {btn === 'del' ? '←' : btn}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const todayStr = getLocalTodayStr();

  return (
    <div className="min-h-screen bg-[#f9fafb] text-slate-900 pb-20 font-sans">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-black tracking-tighter uppercase italic">Job Tracker</h1>
        <button onClick={() => { setEditingJob({ date: getLocalTodayStr(), status: 'Applied', location: 'Remote', type: 'Full-Time' }); setIsModalOpen(true); }} className="bg-black text-white px-5 py-2.5 rounded-full font-bold text-[11px] uppercase tracking-widest">+ Add Entry</button>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total', val: jobs.length, filter: 'all', type: 'status' },
            { label: 'Today', val: jobs.filter(j => (j.date) === todayStr).length, filter: 'today', type: 'date' },
            { label: 'Intv', val: jobs.filter(j => (j.status || "").toLowerCase() === 'interviewing').length, filter: 'Interviewing', type: 'status' },
          ].map((stat) => {
            const isActive = stat.filter === 'all' 
              ? (statusFilter === 'all' && dateFilter === 'all' && !searchTerm && locationFilter === 'all' && typeFilter === 'all')
              : (stat.type === 'status' ? statusFilter === stat.filter : dateFilter === stat.filter);

            return (
              <button key={stat.label} onClick={() => handleStatClick(stat.type, stat.filter)}
                className={`p-6 rounded-[32px] text-left transition-all border-2 ${ isActive ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-white border-transparent' } shadow-sm`}>
                <div className="text-3xl font-black mb-1 text-black">{stat.val}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</div>
              </button>
            );
          })}
        </div>

        <div className="relative mb-8">
          <input className="w-full bg-white border border-slate-200 pl-6 pr-14 py-4 rounded-[24px] outline-none focus:border-slate-400 transition-all text-sm font-semibold shadow-sm" 
            placeholder="Search company, title..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          <div className="absolute right-6 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-10">
          {[
            { label: 'Remote', val: 'remote', type: 'location', count: getCount('location', 'remote') },
            { label: 'Local', val: 'local', type: 'location', count: getCount('location', 'local') },
            { label: 'Contract', val: 'contract', type: 'type', count: getCount('type', 'contract') },
            { label: 'Intv ➔ Rej', val: 'interviewed ➔ rejected', type: 'status', count: getCount('status', 'interviewed ➔ rejected') },
            { label: 'Rejected', val: 'rejected', type: 'status', count: getCount('status', 'rejected') },
            { label: 'Ghosted', val: 'ghosted', type: 'status', count: getCount('status', 'ghosted') },
          ].map(f => (
            <button key={f.label} onClick={() => {
              if (f.type === 'location') setLocationFilter(locationFilter === f.val ? 'all' : f.val);
              if (f.type === 'type') setTypeFilter(typeFilter === f.val ? 'all' : f.val);
              if (f.type === 'status') setStatusFilter(statusFilter === f.val ? 'all' : f.val);
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold transition-all border ${ (locationFilter === f.val || typeFilter === f.val || statusFilter === f.val) ? 'bg-black border-black text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300' }`}>
              {f.label} <span className="opacity-50">{f.count}</span>
            </button>
          ))}
          {isFiltered && (
            <button onClick={resetFilters} className="px-4 py-2 rounded-full text-[10px] font-black text-rose-500 uppercase border border-rose-100 bg-rose-50 hover:bg-rose-100 transition-colors">
              Reset
            </button>
          )}
        </div>

        <div className="space-y-6">
          {loading ? <div className="p-10 text-center text-[10px] font-black text-slate-300 animate-pulse">SYNCING...</div> : sortedAndFilteredJobs.length === 0 ? <div className="p-10 text-center text-slate-400 text-sm italic">Empty.</div> : 
            paginatedJobs.map(job => (
              <div key={job.id} className="bg-white border border-slate-100 p-6 rounded-[28px] flex justify-between items-start shadow-sm hover:shadow-md transition-all">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-black text-sm text-black uppercase tracking-tight">{job.company}</span>
                    {job.salary && <span className="text-emerald-600 font-bold text-[9px] bg-emerald-50 px-2 py-0.5 rounded-full">{job.salary}</span>}
                  </div>
                  <div className="text-slate-500 text-xs font-semibold mb-4">{job.title}</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[9px] font-black text-black bg-slate-50 px-3 py-1.5 rounded-xl uppercase">{getDaysAgo(job.date)}</span>
                    <span className={`text-[9px] px-3 py-1.5 rounded-xl font-black uppercase ${ (job.status || "").toLowerCase().includes('interviewed') ? 'bg-orange-100 text-orange-700' : (job.status || "").toLowerCase().includes('rejected') ? 'bg-rose-100 text-rose-700' : (job.status || "").toLowerCase() === 'interviewing' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500' }`}>{job.status}</span>
                    <span className="text-[9px] font-bold text-slate-400 self-center ml-1">{job.location} • {job.type}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {job.url && <a href={job.url} target="_blank" rel="noreferrer" className="p-2 text-slate-300 hover:text-black"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>}
                  <button onClick={() => { setEditingJob(job); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-black"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                  <button onClick={() => deleteDoc(doc(db, "jobs", job.id))} className="p-2 text-slate-300 hover:text-rose-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl my-auto">
            <h2 className="text-xl font-black mb-8 uppercase text-center tracking-tighter">Application Details</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Company</label>
                  <input required className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm outline-none" value={editingJob?.company || ''} onChange={e => setEditingJob({...editingJob, company: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Position</label>
                  <input required className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm outline-none" value={editingJob?.title || ''} onChange={e => setEditingJob({...editingJob, title: e.target.value})} />
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
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Loc</label>
                  <select className="w-full bg-slate-50 border-none rounded-2xl px-2 py-3.5 text-[10px] font-bold" value={editingJob?.location || 'Remote'} onChange={e => setEditingJob({...editingJob, location: e.target.value})}>
                    <option>Remote</option><option>Local</option><option>Hybrid</option>
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