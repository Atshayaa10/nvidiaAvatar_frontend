'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, CheckCircle, Clock, Send, AlertCircle } from 'lucide-react';
import { useTicketStore } from '../../store/ticketStore';

export default function PortalPage() {
  const [searchInput, setSearchInput] = useState('');
  const [searchedId, setSearchedId] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchMessages = async (ticketId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/tickets/${ticketId}/notes`);
      if (res.ok) {
        const data = await res.json();
        // Only show public messages to the user
        setMessages(data.filter((note: any) => note.is_internal === 'false'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeTicket) return;
    try {
      const res = await fetch(`http://localhost:8000/api/tickets/${activeTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage })
      });
      if (res.ok) {
        setNewMessage('');
        fetchMessages(activeTicket.id);
        // Optimistically update status if it was resolved
        if (activeTicket.status === 'Resolved' || activeTicket.status === 'Closed') {
          setActiveTicket({ ...activeTicket, status: 'In Progress' });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReopen = async () => {
    if (!activeTicket) return;
    try {
      const res = await fetch(`http://localhost:8000/api/tickets/${activeTicket.id}/reopen`, {
        method: 'POST'
      });
      if (res.ok) {
        setActiveTicket({ ...activeTicket, status: 'In Progress' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    setLoading(true);
    setError(false);
    setActiveTicket(null);
    setSearchedId(searchInput);

    try {
      const res = await fetch(`http://localhost:8000/api/tickets/${searchInput}`);
      if (res.ok) {
        const data = await res.json();
        setActiveTicket({
          id: data.id,
          userName: data.user_name,
          contactNumber: data.contact_number,
          email: data.email,
          querySummary: data.query_summary,
          fullTranscript: data.full_transcript,
          department: data.department,
          category: data.category,
          priority: data.priority,
          status: data.status,
          location: data.location,
          attachments: data.attachments,
          createdAt: data.created_at,
        });
        fetchMessages(data.id);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Safe parse transcript
  let parsedTranscript: any[] = [];
  try {
    if (activeTicket?.fullTranscript) {
      parsedTranscript = JSON.parse(activeTicket.fullTranscript);
    }
  } catch (e) {
    parsedTranscript = [];
  }

  return (
    <main className="min-h-screen bg-[#0a0b0f] flex flex-col items-center py-12 px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-indigo-500/8 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl mb-8 flex items-center relative z-10">
        <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-indigo-400 transition-colors">
          <ArrowLeft size={20} /> Back to Home
        </Link>
      </div>

      <div className="w-full max-w-2xl glass rounded-3xl p-8 sm:p-12 relative z-10 animate-slide-up">
        <h1 className="text-3xl font-bold text-white mb-2">Track Your Ticket</h1>
        <p className="text-zinc-500 mb-8">Enter the Ticket ID provided by Agent Stella to check your status.</p>

        <form 
          onSubmit={handleSearch}
          className="flex gap-3 mb-10"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
              placeholder="e.g. TKT-1234"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30 text-white font-medium placeholder:text-zinc-600 transition-all"
            />
          </div>
          <button 
            type="submit"
            className="bg-indigo-600 text-white px-8 rounded-xl font-medium hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
          >
            Track
          </button>
        </form>

        {loading && (
          <div className="flex justify-center items-center p-6">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && searchedId && error && (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 flex items-center gap-3 animate-fade-in">
            <AlertCircle size={20} />
            <span className="font-medium">Ticket not found.</span> Please check the ID and try again.
          </div>
        )}

        {activeTicket && (
          <div className="animate-fade-in">
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Ticket Details</h2>
            <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/[0.06]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">{activeTicket.id}</h3>
                  <p className="text-zinc-500 mt-1 text-sm flex items-center gap-1.5">
                    <Clock size={14} /> Created on {new Date(activeTicket.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider
                    ${activeTicket.priority === 'High' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : ''}
                    ${activeTicket.priority === 'Medium' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : ''}
                    ${activeTicket.priority === 'Low' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' : ''}
                  `}>
                    {activeTicket.priority}
                  </span>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5
                    ${activeTicket.status === 'Resolved' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : ''}
                    ${activeTicket.status === 'In Progress' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : ''}
                    ${activeTicket.status === 'New' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20' : ''}
                  `}>
                    {activeTicket.status}
                  </span>
                </div>
              </div>
              
              {(activeTicket.status === 'Resolved' || activeTicket.status === 'Closed') && (
                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-amber-400 text-sm">Issue not resolved?</p>
                    <p className="text-xs text-amber-500/70 mt-0.5">You can reopen this ticket to get further assistance.</p>
                  </div>
                  <button onClick={handleReopen} className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Reopen Ticket
                  </button>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/[0.06]">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Issue Summary</p>
                  <p className="font-medium text-zinc-200 text-sm">{activeTicket.querySummary || 'N/A'}</p>
                </div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/[0.06]">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Department & Category</p>
                  <p className="font-medium text-zinc-200 text-sm">{activeTicket.department} - {activeTicket.category || 'General'}</p>
                </div>
                
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/[0.06]">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">User Information</p>
                  <p className="text-sm font-medium text-zinc-200">{activeTicket.userName || 'Guest User'}</p>
                  <p className="text-xs text-zinc-500 mt-1">{activeTicket.email || 'No Email'}</p>
                  <p className="text-xs text-zinc-500">{activeTicket.contactNumber || 'No Contact Number'}</p>
                </div>

                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/[0.06]">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Attachments</p>
                  <p className="text-sm text-zinc-400 font-medium">{activeTicket.attachments || 'No files attached'}</p>
                </div>
              </div>

              {parsedTranscript.length > 0 && (
                <div className="bg-white/[0.03] p-6 rounded-xl border border-white/[0.06]">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-4">Conversation Transcript</p>
                  <div className="max-h-48 overflow-y-auto flex flex-col gap-3 pr-2">
                    {parsedTranscript.map((msg: any, idx: number) => (
                      <div key={idx} className={`text-xs p-2.5 rounded-xl max-w-[85%] ${msg.sender === 'user' ? 'bg-indigo-500/15 text-indigo-200 self-end' : 'bg-white/[0.05] text-zinc-300 self-start'}`}>
                        <span className="font-bold block mb-1 text-[10px] uppercase tracking-wider text-zinc-500">{msg.sender === 'user' ? 'User' : 'Stella'}</span>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messaging Interface */}
              <div className="bg-white/[0.03] p-6 rounded-xl border border-white/[0.06] mt-6">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-4">Messages & Updates</p>
                <div className="mb-4 max-h-60 overflow-y-auto flex flex-col gap-3">
                  {messages.length === 0 ? (
                    <p className="text-sm text-zinc-600 italic text-center py-4">No additional updates.</p>
                  ) : (
                    messages.map((msg: any) => (
                      <div key={msg.id} className={`text-sm p-3 rounded-xl max-w-[85%] ${msg.author_name === activeTicket.userName ? 'bg-indigo-600 text-white self-end' : 'bg-white/[0.05] text-zinc-300 self-start'}`}>
                        <div className="flex justify-between items-baseline mb-1 gap-4">
                          <span className={`font-bold text-[10px] uppercase tracking-wider ${msg.author_name === activeTicket.userName ? 'text-indigo-200' : 'text-zinc-500'}`}>{msg.author_name}</span>
                          <span className={`text-[9px] ${msg.author_name === activeTicket.userName ? 'text-indigo-300' : 'text-zinc-600'}`}>{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.note_text}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message or provide more info..."
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                  <button onClick={handleSendMessage} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
