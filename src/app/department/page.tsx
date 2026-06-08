'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTicketStore, Ticket } from '../../store/ticketStore';
import { ArrowLeft, Inbox, CheckCircle, Clock, Zap } from 'lucide-react';

export default function DepartmentDashboard() {
  const { tickets } = useTicketStore();
  const [activeDept, setActiveDept] = useState('IT');

  // Filter tickets by department
  const deptTickets = tickets.filter(t => t.department === activeDept);
  
  const resolveTicket = (ticketId: string) => {
    // In a real app, this would be an API call. Here we just mock state update by mutating the store.
    // Since Zustand doesn't have a built-in update function in our basic store yet, we'll just alert.
    alert(`Ticket ${ticketId} marked as Resolved!`);
  };

  return (
    <div className="flex h-screen bg-[#0a0b0f] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0e0f16] border-r border-white/[0.06] flex flex-col hidden sm:flex">
        <div className="p-6 border-b border-white/[0.06]">
          <h2 className="text-xl font-bold text-gradient tracking-tight">Department Hub</h2>
          <p className="text-zinc-600 text-xs mt-1">Manage department queues</p>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1">
          {['IT', 'Operations', 'Administration'].map((dept) => (
            <button
              key={dept}
              onClick={() => setActiveDept(dept)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-left transition-all duration-200 ${
                activeDept === dept 
                  ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5' 
                  : 'text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300'
              }`}
            >
              <Inbox size={18} /> {dept}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/[0.06]">
          <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-indigo-400 transition-colors text-sm">
            <ArrowLeft size={18} /> Back to Website
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 sm:p-12 max-w-5xl mx-auto">
          <div className="flex justify-between items-end mb-8 border-b border-white/[0.06] pb-6">
            <div>
              <p className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                <Zap size={14} /> {activeDept} Department
              </p>
              <h1 className="text-3xl font-bold text-white">Active Queue</h1>
            </div>
            <div className="text-sm text-zinc-500 font-medium bg-white/[0.03] px-4 py-2 rounded-lg border border-white/[0.06]">
              {deptTickets.length} Total Tickets
            </div>
          </div>

          <div className="grid gap-4">
            {deptTickets.length === 0 ? (
              <div className="glass rounded-3xl border-dashed p-12 text-center">
                <CheckCircle className="mx-auto mb-4 text-zinc-700" size={48} />
                <p className="font-medium text-lg text-zinc-300">No tickets found!</p>
                <p className="text-zinc-600">The queue for {activeDept} is currently empty.</p>
              </div>
            ) : (
              deptTickets.map((ticket: Ticket) => (
                <div key={ticket.id} className="glass-light rounded-2xl p-6 hover:bg-white/[0.04] transition-all duration-300 flex flex-col sm:flex-row justify-between gap-6 group">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">{ticket.id}</h3>
                      <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold border
                          ${ticket.status === 'Resolved' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : ''}
                          ${ticket.status === 'In Progress' ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : ''}
                          ${ticket.status === 'New' ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20' : ''}
                        `}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-zinc-400 mb-4">{ticket.query_summary}</p>
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <Clock size={14} /> Created {new Date(ticket.created_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 sm:w-48 justify-center border-t sm:border-t-0 sm:border-l border-white/[0.06] pt-4 sm:pt-0 sm:pl-6">
                    {ticket.status !== 'Resolved' ? (
                      <>
                        <button className="w-full py-2.5 bg-indigo-500/10 text-indigo-400 font-medium rounded-xl hover:bg-indigo-500/20 transition-all border border-indigo-500/20 text-sm">
                          Start Working
                        </button>
                        <button 
                          onClick={() => resolveTicket(ticket.id)}
                          className="w-full py-2.5 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 text-sm"
                        >
                          Mark Resolved
                        </button>
                      </>
                    ) : (
                      <div className="text-center text-emerald-400 font-medium flex items-center justify-center gap-2">
                        <CheckCircle size={20} /> Resolved
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
