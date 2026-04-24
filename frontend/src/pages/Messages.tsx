import React, { useState, useEffect } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Send, User, Search, MessageSquarePlus } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  sender: { fullName: string; role: string };
  createdAt: string;
}

interface Thread {
  id: string;
  subject: string;
  updatedAt: string;
  participants: Array<{ user: { fullName: string; role: string } }>;
  messages: Message[];
}

export const Messages: React.FC = () => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const { currentUser } = useAuthStore();

  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    try {
      setLoading(true);
      const res = await api.get('/messages/threads');
      setThreads(res.data);
      if (res.data[0]) selectThread(res.data[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectThread = async (thread: Thread) => {
    setActiveThread(thread);
    try {
      setMsgLoading(true);
      const res = await api.get(`/messages/threads/${thread.id}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setMsgLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeThread) return;

    try {
      const res = await api.post(`/messages/threads/${activeThread.id}/messages`, {
        content: newMessage,
      });
      setMessages([...messages, { ...res.data, sender: { fullName: currentUser?.email || 'Me', role: currentUser?.role || 'user' } }]);
      setNewMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <PageWrapper title="Messages"><LoadingSpinner /></PageWrapper>;

  return (
    <PageWrapper title="Messages & Communication">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Thread List */}
        <Card className="flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-semibold text-neutral-800">Inbox</h2>
            <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/5">
              <MessageSquarePlus size={18} />
            </Button>
          </div>
          <div className="p-3 border-b border-neutral-100">
             <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <Input className="pl-9 text-sm" placeholder="Search conversations..." />
             </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.map(t => (
              <button
                key={t.id}
                onClick={() => selectThread(t)}
                className={`w-full p-4 flex flex-col gap-1 border-b border-neutral-50 hover:bg-neutral-50 transition-colors text-left ${activeThread?.id === t.id ? 'bg-primary/5 border-r-4 border-r-primary' : ''}`}
              >
                <div className="flex justify-between items-start">
                   <span className="font-medium text-sm text-neutral-900 truncate pr-2">{t.subject}</span>
                   <span className="text-[10px] text-neutral-400 whitespace-nowrap">{format(new Date(t.updatedAt), 'MMM d')}</span>
                </div>
                <p className="text-xs text-neutral-500 truncate">
                  {t.participants.map(p => p.user.fullName).join(', ')}
                </p>
              </button>
            ))}
          </div>
        </Card>

        {/* Message View */}
        <Card className="md:col-span-2 flex flex-col h-full overflow-hidden">
          {activeThread ? (
            <>
              <div className="p-4 border-b border-neutral-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                  <User size={20} />
                </div>
                <div>
                   <h2 className="font-semibold text-neutral-800">{activeThread.subject}</h2>
                   <p className="text-xs text-neutral-500">Participants: {activeThread.participants.map(p => p.user.fullName).join(', ')}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/30">
                {msgLoading ? <LoadingSpinner label="Fetching messages..." /> : (
                  messages.map(m => {
                    const isMe = m.sender?.fullName === (currentUser?.email || 'Me');
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${isMe ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-white border border-neutral-200 text-neutral-800 rounded-tl-none'}`}>
                          {!isMe && <p className="text-[10px] font-bold mb-1 opacity-70 uppercase tracking-tight">{m.sender?.fullName}</p>}
                          <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                          <p className={`text-[10px] mt-1 text-right ${isMe ? 'opacity-70' : 'text-neutral-400'}`}>
                             {format(new Date(m.createdAt), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t border-neutral-100 bg-white">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" variant="primary" disabled={!newMessage.trim()}>
                    <Send size={18} />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
               <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
                  <MessageSquarePlus size={32} />
               </div>
               <h3 className="text-lg font-medium text-neutral-900">Select a conversation</h3>
               <p className="text-neutral-500 max-w-sm mt-2">Choose a thread from the left or start a new conversation with staff and teachers.</p>
            </div>
          )}
        </Card>
      </div>
    </PageWrapper>
  );
};
