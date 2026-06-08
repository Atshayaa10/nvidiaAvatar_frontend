import { create } from 'zustand';

export interface Ticket {
  id: string;
  user_id?: string;
  user_name?: string;
  contact_number?: string;
  email?: string;
  query_summary?: string;
  full_transcript?: string;
  department: string;
  category?: string;
  priority: string;
  status: string;
  location?: string;
  attachments?: string;
  assignee_id?: string;
  sla_deadline?: string;
  created_at: string;
}

interface TicketState {
  tickets: Ticket[];
  loading: boolean;
  error: string | null;
  fetchTickets: (filters?: { department?: string; priority?: string; status?: string }) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: string) => Promise<void>;
  assignTicket: (ticketId: string, assigneeId: string) => Promise<void>;
}

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  loading: false,
  error: null,
  
  fetchTickets: async (filters) => {
    set({ loading: true, error: null });
    try {
      let url = 'http://localhost:8000/api/tickets';
      if (filters) {
        const params = new URLSearchParams();
        if (filters.department) params.append('department', filters.department);
        if (filters.priority) params.append('priority', filters.priority);
        if (filters.status) params.append('status', filters.status);
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch tickets');
      
      const data = await res.json();
      set({ tickets: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  updateTicketStatus: async (ticketId: string, status: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update status');
      
      // Update local state
      const { tickets } = get();
      set({
        tickets: tickets.map(t => t.id === ticketId ? { ...t, status } : t)
      });
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  },

  assignTicket: async (ticketId: string, assigneeId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/tickets/${ticketId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee_id: assigneeId })
      });
      if (!res.ok) throw new Error('Failed to assign ticket');
      
      // Update local state
      const { tickets } = get();
      set({
        tickets: tickets.map(t => t.id === ticketId ? { ...t, assignee_id: assigneeId } : t)
      });
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  }
}));
