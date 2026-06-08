import { create } from 'zustand';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: number;
}

interface ChatState {
  messages: Message[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [
    {
      id: '1',
      text: "Hi! I'm Agent Stella. How can I assist you today?",
      sender: 'agent',
      timestamp: Date.now(),
    }
  ],
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  addMessage: (msg) => set((state) => {
    const newMessage: Message = {
      ...msg,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
    };
    return { messages: [...state.messages, newMessage] };
  }),
}));
