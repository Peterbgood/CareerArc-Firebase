import React, { useState, useEffect, useMemo } from 'react'
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, addDoc 
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
  const [locationFilter, setLocationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    if (!isAuthenticated) return;
    const q = query(collection(db, "jobs"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isAuthenticated]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === APP_PIN) {
      setIsAuthenticated(true);
    } else {
      alert("Incorrect PIN");
      setPinInput('');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setLocationFilter('all');
    setTypeFilter('all');
    setCurrentPage(1);
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const company = (j.company || j.Company || "").toLowerCase();
      const title = (j.title || j.JobTitle || "").toLowerCase();
      const status = (j.status || j.Status || "Applied").toLowerCase();
      const location = (j.location || j.Locations || "Remote").toLowerCase();
      const type = (j.type || j.Type || "Full-Time").toLowerCase();

      const matchSearch = (company + title).includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || status === statusFilter.toLowerCase();
      const matchLocation = locationFilter === 'all' || location === locationFilter.toLowerCase();
      const matchType = typeFilter === 'all' || type === typeFilter.toLowerCase();
      
      return matchSearch && matchStatus && matchLocation && matchType;
    });
  }, [jobs, searchTerm, statusFilter, locationFilter, typeFilter]);

  const paginatedJobs = filteredJobs.slice((currentPage - 1) * JOBS_PER_PAGE, currentPage * JOBS_PER_PAGE);
  const totalPages = Math.ceil(filteredJobs.length / JOBS_PER_PAGE);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      company: editingJob.company || editingJob.Company || '',
      title: editingJob.title || editingJob.JobTitle || '',
      date: editingJob.date || editingJob.DateApplied || '',
      status: editingJob.status || editingJob.Status || 'Applied',
      location: editingJob.location || editingJob.Locations || 'Remote',
      url: editingJob.url || editingJob.URL || '',
      salary: editingJob.salary || editingJob.Salary || '',
      type: editingJob.type || editingJob.Type || 'Full-Time'
    };
    if (editingJob.id) {
      await updateDoc(doc(db, "jobs", editingJob.id), data);
    } else {
      await addDoc(collection(db, "jobs"), data);
    }
    setIsModalOpen(false);
    setEditingJob(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <form onSubmit={handlePinSubmit} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-xs text-center">
          <div className="bg-slate-900 text-white w-10 h-10 flex items-center justify-center rounded-lg mx-auto mb-4 text-xl font-black">⚡</div>
          <h1 className="text-lg font-black tracking-tighter uppercase mb-6">CareerArc Login</h1>
          <input 
            type="password" 
            placeholder="PIN"
            className="w-full border-2 border-slate-100 bg-slate-50 rounded-xl px-4 py-3 text-center text-xl font-bold tracking-[0.5em] outline-none focus:border-slate-900 transition-all"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            autoFocus
          />
          <button className="w-full mt-4 bg-slate-900 text-white font-black py-3 rounded-xl hover:bg-indigo-600 transition-all uppercase text-xs tracking-widest">
            Unlock System
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 pb-10 font-sans">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-2 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 text-white px-2 py-1 rounded text-sm font-black">⚡</div>
          <h1 className="text-sm font-black tracking-tighter uppercase">CareerArc</h1>
        </div>
        <button 
          onClick={() => { setEditingJob({ date: new Date().toISOString().split('T')[0], status: 'Applied', location: 'Remote', type: 'Full-Time' }); setIsModalOpen(true); }}
          className="bg-slate-900 text-white px-3 py-1.5 rounded-md font-bold text-xs hover:bg-indigo-600 transition-all"
        >
          + NEW APP
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {/* RESPONSIVE SUMMARY GRID */}
        <div className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4 items-stretch">
            {[
                { label: 'Total Apps', val: jobs.length, filter: 'all', type: 'status' },
                { label: 'Interviewing', val: jobs.filter(j => (j.status || j.Status || "").toLowerCase() === 'interviewing').length, filter: 'Interviewing', type: 'status' },
                { label: 'Ghosted', val: jobs.filter(j => (j.status || j.Status || "").toLowerCase() === 'ghosted').length, filter: 'Ghosted', type: 'status' },
                { label: 'Rejected', val: jobs.filter(j => (j.status || j.Status || "").toLowerCase() === 'rejected').length, filter: 'Rejected', type: 'status' },
                { label: 'Contract', val: jobs.filter(j => (j.type || j.Type || "").toLowerCase() === 'contract').length, filter: 'Contract', type: 'type' },
                { label: 'Remote', val: jobs.filter(j => (j.location || j.Locations || "").toLowerCase() === 'remote').length, filter: 'Remote', type: 'location' }
            ].map((stat) => {
                const isActive = stat.label !== 'Total Apps' && (statusFilter === stat.filter || locationFilter === stat.filter || typeFilter === stat.filter);
                
                return (
                    <button 
                    key={stat.label}
                    onClick={() => {
                        if (stat.type === 'status') { setStatusFilter(stat.filter); setTypeFilter('all'); setLocationFilter('all'); }
                        else if (stat.type === 'type') { setTypeFilter(stat.filter); setStatusFilter('all'); setLocationFilter('all'); }
                        else { setLocationFilter(stat.filter); setStatusFilter('all'); setTypeFilter('all'); }
                        setCurrentPage(1);
                    }}
                    className={`py-4 px-2 border-2 transition-all text-center rounded-2xl h-full flex flex-col justify-center items-center bg-white ${
                        isActive 
                        ? 'border-slate-900 shadow-md' 
                        : 'border-transparent hover:border-slate-200'
                    }`}
                    >
                    <div className="text-2xl md:text-3xl font-black leading-none">{stat.val}</div>
                    <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mt-1.5 tracking-tight whitespace-nowrap">{stat.label}</div>
                    </button>
                );
            })}
            </div>
        </div>

        {/* Search Bar + Reset */}
        <div className="mb-4 flex gap-2">
          <input 
            className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-lg outline-none text-xs" 
            placeholder="Search company or title..." 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
          <button 
            onClick={resetFilters}
            className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-[10px] font-bold text-slate-400 hover:text-slate-900 hover:border-slate-400 transition-all uppercase"
          >
            Reset
          </button>
        </div>

        {/* List */}
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-[10px] font-bold text-slate-300 animate-pulse uppercase tracking-[0.2em]">Syncing...</div>
          ) : (
            paginatedJobs.map(job => (
              <div key={job.id} className="group flex items-center justify-between p-2 px-3 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold text-[13px] text-slate-800 shrink-0 uppercase tracking-tight">{job.company || job.Company}</span>
                    <span className="text-slate-300 font-bold">/</span>
                    <span className="text-slate-500 font-medium text-[12px] truncate italic">{job.title || job.JobTitle}</span>
                    <span className="text-blue-600 font-black text-[10px] ml-1">{job.salary || job.Salary}</span>
                    {(job.url || job.URL) && (
                      <a href={job.url || job.URL} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-600 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 mt-0.5 items-center">
                    <span className="text-[9px] font-bold text-slate-400">{job.date || job.DateApplied}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter ${
                      (job.status || job.Status || "").toLowerCase() === 'interviewing' ? 'bg-green-100 text-green-700' : 
                      (job.status || job.Status || "").toLowerCase() === 'rejected' ? 'bg-red-100 text-red-700' : 
                      (job.status || job.Status || "").toLowerCase() === 'ghosted' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {job.status || job.Status || 'Applied'}
                    </span>
                    <span className="text-[9px] font-bold text-blue-500 uppercase">{job.location || job.Locations || 'Remote'}</span>
                    <span className="text-[9px] font-bold text-slate-400 border-l border-slate-200 pl-2 uppercase">{job.type || job.Type || 'FT'}</span>
                  </div>
                </div>
                <div className="flex gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingJob(job); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-slate-900"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                  <button onClick={() => deleteDoc(doc(db, "jobs", job.id))} className="p-1.5 text-slate-300 hover:text-red-500"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => { setCurrentPage(i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`w-7 h-7 rounded text-[10px] font-bold ${currentPage === i + 1 ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>{i + 1}</button>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-xl p-6 shadow-xl">
            <h2 className="text-sm font-black mb-4 uppercase">App Record</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <input placeholder="Company" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none" value={editingJob?.company || editingJob?.Company || ''} onChange={e => setEditingJob({...editingJob, company: e.target.value})} />
              <input placeholder="Position Title" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none" value={editingJob?.title || editingJob?.JobTitle || ''} onChange={e => setEditingJob({...editingJob, title: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Salary Range" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none" value={editingJob?.salary || editingJob?.Salary || ''} onChange={e => setEditingJob({...editingJob, salary: e.target.value})} />
                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none" value={editingJob?.type || editingJob?.Type || 'Full-Time'} onChange={e => setEditingJob({...editingJob, type: e.target.value})}>
                  <option>Full-Time</option><option>Contract</option><option>Part-Time</option>
                </select>
              </div>
              <input placeholder="Application URL" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none" value={editingJob?.url || editingJob?.URL || ''} onChange={e => setEditingJob({...editingJob, url: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none" value={editingJob?.date || editingJob?.DateApplied || ''} onChange={e => setEditingJob({...editingJob, date: e.target.value})} />
                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none" value={editingJob?.status || editingJob?.Status || 'Applied'} onChange={e => setEditingJob({...editingJob, status: e.target.value})}>
                  <option>Applied</option><option>Interviewing</option><option>Rejected</option><option>Ghosted</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-slate-900 text-white font-bold py-2 rounded-lg text-xs hover:bg-blue-600 transition-all">SAVE RECORD</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 text-[10px] font-bold text-slate-400 uppercase">CANCEL</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}