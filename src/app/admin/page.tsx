'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTicketStore, Ticket } from '../../store/ticketStore';
import { 
  ArrowLeft, LayoutDashboard, Ticket as TicketIcon, Users, Settings, Activity, 
  FileText, Search, Filter, X, MessageSquare, Send, Download, User, Clock, AlertCircle, Zap
} from 'lucide-react';

export default function AdminDashboard() {
  const { tickets, loading, fetchTickets, updateTicketStatus, assignTicket } = useTicketStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tickets'>('dashboard');
  
  // Analytics State
  const [analytics, setAnalytics] = useState<any>(null);
  
  // Filtering State
  const [filterDept, setFilterDept] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Modal State
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [uploadingKb, setUploadingKb] = useState(false);
  const [kbStatus, setKbStatus] = useState('');

  // Fetch initial data
  useEffect(() => {
    fetchTickets();
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/analytics');
      if (res.ok) {
        setAnalytics(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    }
  };

  const fetchNotes = async (ticketId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/tickets/${ticketId}/notes`);
      if (res.ok) setNotes(await res.json());
    } catch (err) {
      console.error('Failed to fetch notes', err);
    }
  };

  const handleApplyFilters = () => {
    fetchTickets({
      department: filterDept || undefined,
      priority: filterPriority || undefined,
      status: filterStatus || undefined
    });
  };

  const handleClearFilters = () => {
    setFilterDept('');
    setFilterPriority('');
    setFilterStatus('');
    fetchTickets();
  };

  const handleOpenModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    fetchNotes(ticket.id);
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedTicket) return;
    try {
      const res = await fetch(`http://localhost:8000/api/tickets/${selectedTicket.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_text: newNote })
      });
      if (res.ok) {
        setNewNote('');
        fetchNotes(selectedTicket.id);
      }
    } catch (err) {
      console.error('Failed to add note', err);
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!selectedTicket) return;
    const newStatus = e.target.value;
    await updateTicketStatus(selectedTicket.id, newStatus);
    setSelectedTicket({ ...selectedTicket, status: newStatus });
    fetchAnalytics();
  };

  const handleAssignChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!selectedTicket) return;
    const newAssignee = e.target.value;
    await assignTicket(selectedTicket.id, newAssignee);
    setSelectedTicket({ ...selectedTicket, assignee_id: newAssignee });
  };

  const handleKbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploadingKb(true);
    setKbStatus('');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('http://localhost:8000/api/kb/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setKbStatus(`Indexed ${data.chunks} chunks from "${file.name}"!`);
      } else {
        setKbStatus(`Error: ${data.detail || 'Failed to ingest document'}`);
      }
    } catch (err) {
      console.error(err);
      setKbStatus('Upload failed. Please check the backend connection.');
    } finally {
      setUploadingKb(false);
    }
  };

  const exportToCSV = () => {
    if (tickets.length === 0) return;
    const headers = ['ID', 'Department', 'Priority', 'Status', 'Created At', 'Assignee'];
    const rows = tickets.map(t => [
      t.id, t.department, t.priority, t.status, new Date(t.created_at).toLocaleString(), t.assignee_id || 'Unassigned'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "stella_tickets_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Safe parse transcript
  let parsedTranscript: any[] = [];
  if (selectedTicket?.full_transcript) {
    try {
      parsedTranscript = JSON.parse(selectedTicket.full_transcript);
    } catch (e) {
      parsedTranscript = [];
    }
  }

  const getSLAStatus = (ticket: Ticket) => {
    if (ticket.status === 'Resolved' || ticket.status === 'Closed') return null;
    if (!ticket.sla_deadline) return { label: 'No SLA', color: 'bg-zinc-800 text-zinc-500 border-zinc-700' };
    
    const deadline = new Date(ticket.sla_deadline).getTime();
    const now = new Date().getTime();
    
    if (now > deadline) return { label: 'Breached', color: 'bg-red-500/15 text-red-400 border-red-500/20 font-bold' };
    if (deadline - now < 4 * 60 * 60 * 1000) return { label: 'At Risk', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20 font-bold' };
    return { label: 'On Track', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' };
  };

  return (
    <div className="flex h-screen bg-[#0a0b0f] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0e0f16] border-r border-white/[0.06] text-white flex flex-col hidden sm:flex">
        <div className="p-6 border-b border-white/[0.06]">
          <h2 className="text-xl font-bold tracking-tight text-gradient">Agent Stella</h2>
          <p className="text-zinc-600 text-sm mt-1">Super Admin</p>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1">
          <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5' : 'text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300'}`}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button onClick={() => setActiveTab('tickets')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'tickets' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5' : 'text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300'}`}>
            <TicketIcon size={18} /> All Tickets
          </button>
        </nav>
        <div className="p-4 border-t border-white/[0.06]">
          <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-indigo-400 transition-colors text-sm">
            <ArrowLeft size={18} /> Back to Website
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 sm:p-12 max-w-7xl mx-auto">
          
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">
              {activeTab === 'dashboard' ? 'Platform Overview' : 'Ticket Management'}
            </h1>
            <div className="flex items-center gap-4">
              {activeTab === 'tickets' && (
                <button onClick={exportToCSV} className="glass px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-all">
                  <Download size={16} /> Export CSV
                </button>
              )}
              <div className="glass px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium text-zinc-400">
                <Activity size={14} className="text-emerald-400 animate-pulse" /> System Online
              </div>
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <div className="animate-fade-in">
              {/* Analytics Section */}
              <div className="mb-10">
                <h2 className="text-lg font-bold text-zinc-300 mb-6 flex items-center gap-2"><Zap size={18} className="text-indigo-400" /> Analytics Overview</h2>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="glass-light p-6 rounded-2xl hover:bg-white/[0.04] transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full group-hover:scale-125 transition-transform duration-500"></div>
                    <p className="text-zinc-500 text-sm font-medium mb-1">Total Tickets</p>
                    <h3 className="text-4xl font-bold text-white">{analytics?.total_tickets || 0}</h3>
                  </div>
                  <div className="glass-light p-6 rounded-2xl hover:bg-white/[0.04] transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-red-500/5 rounded-bl-full group-hover:scale-125 transition-transform duration-500"></div>
                    <p className="text-zinc-500 text-sm font-medium mb-1">High Priority</p>
                    <h3 className="text-4xl font-bold text-red-400">{analytics?.priority_breakdown?.High || 0}</h3>
                  </div>
                  <div className="glass-light p-6 rounded-2xl hover:bg-white/[0.04] transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/5 rounded-bl-full group-hover:scale-125 transition-transform duration-500"></div>
                    <p className="text-zinc-500 text-sm font-medium mb-1">In Progress</p>
                    <h3 className="text-4xl font-bold text-amber-400">{analytics?.status_breakdown?.['In Progress'] || 0}</h3>
                  </div>
                  <div className="glass-light p-6 rounded-2xl hover:bg-white/[0.04] transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full group-hover:scale-125 transition-transform duration-500"></div>
                    <p className="text-zinc-500 text-sm font-medium mb-1">Resolved</p>
                    <h3 className="text-4xl font-bold text-emerald-400">{analytics?.status_breakdown?.Resolved || 0}</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Department Breakdown Bar Chart */}
                  <div className="glass-light p-6 rounded-2xl">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-6">Tickets by Department</h3>
                    <div className="flex flex-col gap-5">
                      {analytics?.department_breakdown ? Object.entries(analytics.department_breakdown).map(([dept, count]: any) => {
                        const percentage = analytics.total_tickets > 0 ? (count / analytics.total_tickets) * 100 : 0;
                        return (
                          <div key={dept}>
                            <div className="flex justify-between text-sm mb-1.5 text-zinc-400">
                              <span className="font-medium">{dept}</span>
                              <span className="font-semibold text-white">{count}</span>
                            </div>
                            <div className="w-full bg-white/[0.04] rounded-full h-2 overflow-hidden">
                              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                            </div>
                          </div>
                        );
                      }) : <p className="text-sm text-zinc-600 py-4">No department data available.</p>}
                    </div>
                  </div>

                  {/* Priority Breakdown */}
                  <div className="glass-light p-6 rounded-2xl">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-6">Tickets by Priority</h3>
                    <div className="flex flex-col gap-5">
                      {['Critical', 'High', 'Medium', 'Low'].map(priority => {
                        const count = analytics?.priority_breakdown?.[priority] || 0;
                        const percentage = analytics?.total_tickets > 0 ? (count / analytics.total_tickets) * 100 : 0;
                        const colorClass = priority === 'Critical' || priority === 'High' ? 'from-red-500 to-pink-500' : priority === 'Medium' ? 'from-amber-400 to-orange-500' : 'from-emerald-400 to-teal-500';
                        return (
                          <div key={priority}>
                            <div className="flex justify-between text-sm mb-1.5 text-zinc-400">
                              <span className="font-medium">{priority}</span>
                              <span className="font-semibold text-white">{count}</span>
                            </div>
                            <div className="w-full bg-white/[0.04] rounded-full h-2 overflow-hidden">
                              <div className={`bg-gradient-to-r ${colorClass} h-full rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* KB Ingestion Panel */}
              <div className="glass-light p-8 rounded-3xl border-indigo-500/10 mb-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-indigo-500/5 via-transparent to-transparent rounded-full pointer-events-none" />
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-3 relative z-10">
                  <FileText size={24} className="text-indigo-400" /> Train Agent Stella Knowledge Base
                </h2>
                <p className="text-zinc-500 text-sm mb-6 max-w-2xl leading-relaxed relative z-10">
                  Upload documentation, guidelines, policies, or FAQs (in .pdf or .txt formats). The files will be chunked, embedded, and indexed so Stella can retrieve them to answer user questions accurately.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center relative z-10">
                  <label className="relative cursor-pointer">
                    <span className="block text-sm text-zinc-300 glass hover:bg-white/[0.06] px-6 py-3 rounded-xl font-medium transition-all">
                      Choose File...
                    </span>
                    <input 
                      type="file" 
                      accept=".pdf,.txt"
                      onChange={handleKbUpload}
                      disabled={uploadingKb}
                      className="hidden"
                    />
                  </label>
                  {uploadingKb && (
                    <div className="flex items-center gap-2 text-sm text-indigo-400 font-medium">
                      <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      Processing & indexing into vector db...
                    </div>
                  )}
                  {!uploadingKb && kbStatus && (
                    <div className={`text-sm font-medium p-3 px-5 rounded-xl border ${kbStatus.startsWith('Error') ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                      {kbStatus}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tickets' && (
             <div className="animate-fade-in">
               {/* Filters */}
               <div className="glass-light p-6 rounded-2xl mb-6 flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Department</label>
                    <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm text-zinc-200">
                      <option value="">All Departments</option>
                      <option value="IT">IT</option>
                      <option value="HR">HR</option>
                      <option value="Finance">Finance</option>
                      <option value="Facilities">Facilities</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Priority</label>
                    <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm text-zinc-200">
                      <option value="">All Priorities</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Status</label>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm text-zinc-200">
                      <option value="">All Statuses</option>
                      <option value="New">New</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleApplyFilters} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                      <Filter size={16} /> Filter
                    </button>
                    <button onClick={handleClearFilters} className="glass text-zinc-400 hover:text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all">
                      Clear
                    </button>
                  </div>
               </div>

               {/* Table */}
               <div className="glass-light rounded-2xl overflow-hidden">
                 {loading ? (
                   <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
                 ) : (
                   <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                       <thead className="bg-white/[0.02] border-b border-white/[0.06]">
                         <tr>
                           <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">ID</th>
                           <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Department</th>
                           <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Priority</th>
                           <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                           <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">SLA</th>
                           <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Assignee</th>
                           <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-white/[0.04]">
                         {tickets.map(ticket => (
                           <tr key={ticket.id} onClick={() => handleOpenModal(ticket)} className="hover:bg-white/[0.03] transition-colors cursor-pointer group">
                             <td className="px-6 py-4 font-medium text-zinc-200 group-hover:text-indigo-400 transition-colors">{ticket.id}</td>
                             <td className="px-6 py-4 text-zinc-400 text-sm">{ticket.department}</td>
                             <td className="px-6 py-4">
                               <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border
                                 ${ticket.priority === 'High' || ticket.priority === 'Critical' ? 'bg-red-500/15 text-red-400 border-red-500/20' : ''}
                                 ${ticket.priority === 'Medium' ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : ''}
                                 ${ticket.priority === 'Low' ? 'bg-blue-500/15 text-blue-400 border-blue-500/20' : ''}
                               `}>
                                 {ticket.priority}
                               </span>
                             </td>
                             <td className="px-6 py-4">
                               <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border
                                 ${ticket.status === 'Resolved' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : ''}
                                 ${ticket.status === 'In Progress' ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : ''}
                                 ${ticket.status === 'New' ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20' : ''}
                                 ${ticket.status === 'Closed' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : ''}
                               `}>
                                 <span className={`w-1.5 h-1.5 rounded-full
                                   ${ticket.status === 'New' ? 'bg-indigo-400' : ''}
                                   ${ticket.status === 'In Progress' ? 'bg-amber-400' : ''}
                                   ${ticket.status === 'Resolved' ? 'bg-emerald-400' : ''}
                                   ${ticket.status === 'Closed' ? 'bg-zinc-500' : ''}
                                 `}></span>
                                 {ticket.status}
                               </span>
                             </td>
                             <td className="px-6 py-4">
                               {(() => {
                                 const sla = getSLAStatus(ticket);
                                 if (!sla) return <span className="text-zinc-600 text-xs italic">-</span>;
                                 return (
                                   <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] uppercase tracking-wider border ${sla.color}`}>
                                     {sla.label}
                                   </span>
                                 );
                               })()}
                             </td>
                             <td className="px-6 py-4 text-zinc-400 text-sm flex items-center gap-2">
                               {ticket.assignee_id ? (
                                 <><div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold">{ticket.assignee_id.charAt(0).toUpperCase()}</div> <span className="text-zinc-300">{ticket.assignee_id}</span></>
                               ) : (
                                 <span className="text-zinc-600 italic text-xs">Unassigned</span>
                               )}
                             </td>
                             <td className="px-6 py-4 text-zinc-500 text-sm">
                               {new Date(ticket.created_at).toLocaleDateString()}
                             </td>
                           </tr>
                         ))}
                         {tickets.length === 0 && (
                           <tr><td colSpan={7} className="px-6 py-12 text-center text-zinc-600">No tickets found matching the criteria.</td></tr>
                         )}
                       </tbody>
                     </table>
                   </div>
                 )}
               </div>
             </div>
          )}
        </div>
      </main>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-[#0e0f16] w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-white/[0.06] animate-fade-in">
            
            {/* Header */}
            <div className="p-6 border-b border-white/[0.06] flex justify-between items-start bg-white/[0.02]">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-white">{selectedTicket.id}</h2>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider border
                    ${selectedTicket.priority === 'High' ? 'bg-red-500/15 text-red-400 border-red-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                    {selectedTicket.priority} Priority
                  </span>
                </div>
                <p className="text-sm text-zinc-500 flex items-center gap-1.5">
                  <Clock size={14} /> Created {new Date(selectedTicket.created_at).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-white/[0.06] rounded-full transition-colors text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
              
              {/* Quick Actions & Meta */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Status</label>
                  <select value={selectedTicket.status} onChange={handleStatusChange} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-medium">
                    <option value="New">New</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Assignee</label>
                  <select value={selectedTicket.assignee_id || ''} onChange={handleAssignChange} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-medium">
                    <option value="">Unassigned</option>
                    <option value="Admin">Admin</option>
                    <option value="Support_Agent_1">Support Agent 1</option>
                    <option value="Support_Agent_2">Support Agent 2</option>
                  </select>
                </div>
              </div>

              {/* User & Request Details */}
              <div className="glass-light rounded-2xl p-5">
                 <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 border-b border-white/[0.06] pb-2">Ticket Information</h3>
                 <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                   <div>
                     <p className="text-zinc-500 mb-1">User</p>
                     <p className="font-medium text-zinc-200 flex items-center gap-2"><User size={14}/> {selectedTicket.user_name || 'Guest'}</p>
                   </div>
                   <div>
                     <p className="text-zinc-500 mb-1">Contact</p>
                     <p className="font-medium text-zinc-200">{selectedTicket.email || selectedTicket.contact_number || 'N/A'}</p>
                   </div>
                   <div className="col-span-2">
                     <p className="text-zinc-500 mb-1">Query Summary</p>
                     <p className="font-medium text-zinc-200 bg-white/[0.03] p-3 rounded-lg border border-white/[0.06] mt-1">{selectedTicket.query_summary || 'N/A'}</p>
                   </div>
                   <div>
                     <p className="text-zinc-500 mb-1">Department</p>
                     <p className="font-medium text-zinc-200">{selectedTicket.department}</p>
                   </div>
                   <div>
                     <p className="text-zinc-500 mb-1">Category</p>
                     <p className="font-medium text-zinc-200">{selectedTicket.category || 'General'}</p>
                   </div>
                 </div>
              </div>

              {/* Internal Notes */}
              <div>
                <h3 className="text-sm font-bold text-zinc-200 mb-4 flex items-center gap-2">
                  <MessageSquare size={16} className="text-amber-400" /> Internal Notes
                </h3>
                <div className="glass-light rounded-2xl p-1 mb-4 flex flex-col gap-2 max-h-60 overflow-y-auto">
                  {notes.length === 0 ? (
                    <p className="text-center text-sm text-zinc-600 py-6">No internal notes yet.</p>
                  ) : (
                    notes.map(note => (
                      <div key={note.id} className="bg-white/[0.03] p-4 rounded-xl border border-white/[0.06]">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-zinc-300 bg-white/[0.06] px-2 py-1 rounded">{note.author_name}</span>
                          <span className="text-[10px] text-zinc-600 uppercase">{new Date(note.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-zinc-400">{note.note_text}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                    placeholder="Add an internal note (only visible to staff)..."
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                  />
                  <button onClick={handleAddNote} className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 px-4 py-2 rounded-xl transition-colors border border-amber-500/20">
                    <Send size={18} />
                  </button>
                </div>
              </div>

              {/* Transcript */}
              {parsedTranscript.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-zinc-200 mb-4 flex items-center gap-2">
                    <AlertCircle size={16} className="text-indigo-400" /> AI Conversation Transcript
                  </h3>
                  <div className="glass-light rounded-2xl p-4 max-h-80 overflow-y-auto flex flex-col gap-3">
                    {parsedTranscript.map((msg: any, idx: number) => (
                      <div key={idx} className={`text-sm p-3 rounded-xl max-w-[85%] ${msg.sender === 'user' ? 'bg-indigo-500/15 text-indigo-200 self-end rounded-tr-sm' : 'bg-white/[0.04] border border-white/[0.06] text-zinc-300 self-start rounded-tl-sm'}`}>
                        <span className="font-bold block mb-1 text-[10px] uppercase tracking-wider text-zinc-500">{msg.sender === 'user' ? 'User' : 'Agent Stella'}</span>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
