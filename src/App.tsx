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

  // Logic for PIN Verification
  useEffect(() => {
    if (pinInput.length === 4) {
      if (pinInput === APP_PIN) setIsAuthenticated(true);
      else setTimeout(() => setPinInput(''), 400);
    }
  }, [pinInput]);

  // Keyboard support for Desktop users
  useEffect(() => {
    if (isAuthenticated) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (pinInput.length < 4) setPinInput(prev => prev + e.key);
      } else if (e.key === 'Backspace') {
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
    });
    return () => unsubscribe();
  }, [isAuthenticated]);

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('all');
    setLocationFilter('all');
    setTypeFilter('all');
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
    if (editingJob.id) {
      await updateDoc(doc(db, "jobs", editingJob.id), data);
    } else {
      await addDoc(collection(db, "jobs"), data);
    }
    setIsModalOpen(false);
    setEditingJob(null);
  };

  const handlePinPress = (val: string) => {
    if (pinInput.length < 4) setPinInput(prev => prev + val);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-50 rounded-full blur-[100px] opacity-40" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-50 rounded-full blur-[100px] opacity-40" />
        
        <div className="relative z-10 w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center rounded-[24px] mx-auto mb-4 text-2xl font-black shadow-2xl">⚡</div>
            <h1 className="text-slate-900 text-2xl font-black tracking-tight">CareerArc</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Identity Required</p>
          </div>

          <div className="flex justify-center gap-4 mb-10">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-14 h-20 rounded-2xl border-2 flex items-center justify-center text-2xl font-bold transition-all duration-300 ${pinInput[i] ? 'border-slate-900 bg-white text-slate-900 shadow-xl -translate-y-1' : 'border-slate-100 bg-white text-slate-200'}`}>
                {pinInput[i] ? pinInput[i] : ''}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 px-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'delete'].map((btn, idx) => (
              <button 
                key={idx}
                onClick={() => {
                  if (btn === 'delete') setPinInput(prev => prev.slice(0, -1));
                  else if (btn !== '') handlePinPress(btn.toString());
                }}
                className={`h-16 rounded-2xl text-xl font-bold transition-all flex items-center justify-center ${btn === '' ? 'pointer-events-none opacity-0' : 'bg-white border border-slate-100 shadow-sm active:scale-90 active:bg-slate-50 text-slate-900 hover:border-slate-200'}`}
              >
                {btn === 'delete' ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" /></svg> : btn}
              </button>
            ))}
          </div>
          <p className="text-center mt-8 text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">Keyboard typing enabled</p>
        </div>
      </div>
    );
  }

  const todayStr = getLocalTodayStr();
  const getCount = (key: string, val: string) => jobs.filter(j => (j[key] || "").toLowerCase() === val.toLowerCase()).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-10 font-sans">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 text-white px-2 py-1 rounded text-sm font-black">⚡</div>
          <h1 className="text-sm font-black tracking-tighter uppercase">CareerArc</h1>
        </div>
        <button onClick={() => { setEditingJob({ date: getLocalTodayStr(), status: 'Applied', location: 'Remote', type: 'Full-Time' }); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 uppercase tracking-wider">+ New Job</button>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Apps', val: jobs.length, filter: 'all', type: 'status', color: 'slate' },
            { label: 'Applied Today', val: jobs.filter(j => (j.date || j.DateApplied) === todayStr).length, filter: 'today', type: 'date', color: 'indigo' },
            { label: 'Interviewing', val: jobs.filter(j => (j.status || "").toLowerCase() === 'interviewing').length, filter: 'Interviewing', type: 'status', color: 'green' },
          ].map((stat) => (
            <button 
              key={stat.label} 
              onClick={() => { resetFilters(); if (stat.type === 'status') setStatusFilter(stat.filter); else setDateFilter(stat.filter); }}
              className={`p-4 rounded-2xl text-left transition-all border-2 ${
                (statusFilter === stat.filter || dateFilter === stat.filter) 
                ? 'bg-white border-slate-900 shadow-lg scale-[1.02]' 
                : 'bg-white border-transparent shadow-sm hover:border-slate-200'
              }`}
            >
              <div className={`text-2xl md:text-3xl font-black mb-1 ${stat.color === 'indigo' ? 'text-indigo-600' : stat.color === 'green' ? 'text-emerald-500' : 'text-slate-900'}`}>{stat.val}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
            </button>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="space-y-4 mb-6">
          <div className="relative group">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input className="w-full bg-white border border-slate-200 pl-10 pr-4 py-3 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium" placeholder="Search companies, roles, or keywords..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {[
              { label: 'Remote', val: 'remote', type: 'location', count: getCount('location', 'remote') },
              { label: 'Contract', val: 'contract', type: 'type', count: getCount('type', 'contract') },
              { label: 'Intv ➔ Rej', val: 'interviewed ➔ rejected', type: 'status', count: getCount('status', 'interviewed ➔ rejected') },
              { label: 'Rejected', val: 'rejected', type: 'status', count: getCount('status', 'rejected') },
              { label: 'Ghosted', val: 'ghosted', type: 'status', count: getCount('status', 'ghosted') },
            ].map(f => (
              <button key={f.label} onClick={() => {
                  if (f.type === 'location') setLocationFilter(locationFilter === f.val ? 'all' : f.val);
                  if (f.type === 'type') setTypeFilter(typeFilter === f.val ? 'all' : f.val);
                  if (f.type === 'status') setStatusFilter(statusFilter === f.val ? 'all' : f.val);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border ${
                  (locationFilter === f.val || typeFilter === f.val || statusFilter === f.val)
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                }`}
              >
                {f.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${ (locationFilter === f.val || typeFilter === f.val || statusFilter === f.val) ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>{f.count}</span>
              </button>
            ))}
            {isFiltered && <button onClick={resetFilters} className="text-[10px] font-black text-indigo-500 uppercase px-2 shrink-0">Clear</button>}
          </div>
        </div>

        {/* Jobs List */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-xs font-bold text-slate-300 animate-pulse">SYNCING...</div>
          ) : sortedAndFilteredJobs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 italic text-sm">Empty state. Try clearing filters.</div>
          ) : (
            paginatedJobs.map(job => (
              <div key={job.id} className="group flex items-center justify-between p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-slate-900 uppercase tracking-tight">{job.company}</span>
                    {job.url && <a href={job.url} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-indigo-500"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>}
                    {job.salary && <span className="text-indigo-600 font-black text-[9px] bg-indigo-50 px-1 rounded border border-indigo-100">{job.salary}</span>}
                  </div>
                  <div className="text-slate-500 text-xs font-medium mb-3">{job.title}</div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">{getDaysAgo(job.date)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase ${ 
                        (job.status || "").toLowerCase() === 'interviewing' ? 'bg-emerald-100 text-emerald-700' : 
                        (job.status || "").toLowerCase().includes('rejected') ? 'bg-rose-100 text-rose-700' : 
                        (job.status || "").toLowerCase() === 'ghosted' ? 'bg-slate-800 text-white' : 
                        'bg-slate-100 text-slate-500' }`}>
                      {job.status || 'Applied'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{job.location} • {job.type || 'Full-Time'}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingJob(job); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-slate-900"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                  <button onClick={() => deleteDoc(doc(db, "jobs", job.id))} className="p-2 text-slate-300 hover:text-rose-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Modal - Preserving all fields */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl my-auto">
            <h2 className="text-xl font-black mb-6 uppercase text-slate-900">App Entry</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Company</label>
                  <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500" value={editingJob?.company || ''} onChange={e => setEditingJob({...editingJob, company: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Position</label>
                  <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500" value={editingJob?.title || ''} onChange={e => setEditingJob({...editingJob, title: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Salary</label>
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" value={editingJob?.salary || ''} onChange={e => setEditingJob({...editingJob, salary: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Date</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" value={editingJob?.date || ''} onChange={e => setEditingJob({...editingJob, date: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">URL</label>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" value={editingJob?.url || ''} onChange={e => setEditingJob({...editingJob, url: e.target.value})} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Loc</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-3 text-[11px] font-bold outline-none" value={editingJob?.location || 'Remote'} onChange={e => setEditingJob({...editingJob, location: e.target.value})}>
                    <option>Remote</option><option>Local</option><option>Hybrid</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Type</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-3 text-[11px] font-bold outline-none" value={editingJob?.type || 'Full-Time'} onChange={e => setEditingJob({...editingJob, type: e.target.value})}>
                    <option>Full-Time</option><option>Contract</option><option>Part-Time</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Status</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-3 text-[11px] font-bold outline-none text-indigo-600" value={editingJob?.status || 'Applied'} onChange={e => setEditingJob({...editingJob, status: e.target.value})}>
                    <option>Applied</option><option>Interviewing</option><option>Interviewed ➔ Rejected</option><option>Rejected</option><option>Ghosted</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-6">
                <button type="submit" className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl text-xs hover:bg-indigo-600 transition-all uppercase shadow-lg shadow-slate-200">Save</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 text-xs font-bold text-slate-400 uppercase">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}