import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { 
  Mail, 
  Send, 
  Users, 
  Search, 
  MoreHorizontal, 
  Clock, 
  Bell,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ArrowUpRight
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday, isThisWeek } from 'date-fns';
import { motion } from 'framer-motion';

const MessagingCenter = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'All'|'Today'|'Yesterday'|'This Week'>('All');

  const isManager = ['MANAGER', 'OWNER'].includes(user?.role || '');

  // Queries
  const { data: messages, isLoading } = useQuery({ 
    queryKey: ['messages'], 
    queryFn: () => api.get('/messages').then(res => res.data) 
  });

  const { data: staff } = useQuery({ 
    queryKey: ['staff'], 
    queryFn: () => api.get('/staff').then(res => res.data),
    enabled: isManager && isComposeOpen
  });

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: (data: any) => api.post('/messages', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setIsComposeOpen(false);
    }
  });

  // Real-time updates
  useEffect(() => {
    if (socket) {
      const handleNewMessage = (msg: any) => {
        queryClient.setQueryData(['messages'], (old: any) => [msg, ...(old || [])]);
      };

      socket.on('new_broadcast_message', handleNewMessage);
      socket.on('new_direct_message', handleNewMessage);

      return () => {
        socket.off('new_broadcast_message');
        socket.off('new_direct_message');
      };
    }
  }, [socket, queryClient]);

  const filteredMessages = messages?.filter((msg: any) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = msg.content.toLowerCase().includes(term) || msg.sender.name.toLowerCase().includes(term);
    if (!matchesSearch) return false;

    if (dateFilter !== 'All') {
      const date = parseISO(msg.createdAt);
      if (dateFilter === 'Today' && !isToday(date)) return false;
      if (dateFilter === 'Yesterday' && !isYesterday(date)) return false;
      if (dateFilter === 'This Week' && !isThisWeek(date)) return false;
    }
    return true;
  });

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col space-y-4">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#dcdcde] pb-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-[#1d2327] text-white">
            <Mail size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1d2327]">Inbox</h1>
            <p className="text-sm text-[#646970]">
              {isManager ? 'Manage internal communication' : 'Your latest notifications'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a7aaad]" size={14} />
            <input 
              type="text" 
              placeholder="Search messages..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-sm rounded-sm w-64 transition-all"
            />
          </div>
          <div className="flex bg-[#f6f7f7] border border-[#dcdcde] rounded-sm text-xs font-bold">
            {['All', 'Today', 'Yesterday', 'This Week'].map(f => (
              <button
                key={f}
                onClick={() => setDateFilter(f as any)}
                className={`px-3 py-1.5 transition-colors ${dateFilter === f ? 'bg-[#2271b1] text-white' : 'text-[#646970] hover:bg-white'}`}
              >
                {f}
              </button>
            ))}
          </div>
          {isManager && (
            <button 
              onClick={() => setIsComposeOpen(true)}
              className="bg-[#2271b1] hover:bg-[#135e96] text-white text-sm font-bold px-4 py-2 rounded-sm shadow-sm transition-all flex items-center gap-2"
            >
              <Send size={16} />
              New Message
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex bg-white border border-[#dcdcde] shadow-sm overflow-hidden">
        {/* Message List */}
        <div className="w-full md:w-80 border-r border-[#dcdcde] flex flex-col bg-[#f6f7f7]">
          <div className="p-4 border-b border-[#dcdcde] bg-white">
            <h2 className="text-[11px] font-bold text-[#646970] uppercase tracking-widest">Recent Activity</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-[#a7aaad]">Loading messages...</div>
            ) : filteredMessages?.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="inline-flex p-3 bg-white border border-[#ccd0d4] rounded-full text-[#a7aaad]">
                  <Mail size={24} />
                </div>
                <p className="text-xs font-bold text-[#646970] uppercase tracking-tighter">No messages found</p>
              </div>
            ) : (
              filteredMessages?.map((msg: any) => (
                <button
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className={`w-full text-left p-4 border-b border-[#dcdcde] hover:bg-white transition-colors flex items-start gap-3 relative ${selectedMessage?.id === msg.id ? 'bg-white border-l-4 border-l-[#2271b1]' : ''}`}
                >
                  <div className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-sm font-bold text-xs ${msg.isBroadcast ? 'bg-[#2271b1] text-white' : (msg.senderId === user?.id ? 'bg-emerald-600 text-white' : 'bg-[#e0e0e0] text-[#1d2327]')}`}>
                    {msg.isBroadcast ? <Users size={16} /> : (msg.senderId === user?.id ? <ArrowUpRight size={16} /> : msg.sender.name[0])}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-1 gap-2">
                       <div className="flex items-center gap-1.5 overflow-hidden">
                        {msg.senderId === user?.id && <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1 py-0.5 rounded-sm uppercase tracking-widest shrink-0">SENT</span>}
                        <span className="font-bold text-[13px] text-[#1d2327] truncate">
                          {msg.isBroadcast ? 'Global Broadcast' : (msg.senderId === user?.id ? (msg.recipient?.name ? `To: ${msg.recipient.name}` : 'Broadcast') : msg.sender.name)}
                        </span>
                       </div>
                      <span className="text-[9px] text-[#a7aaad] font-bold shrink-0">{format(parseISO(msg.createdAt), 'HH:mm')}</span>
                    </div>
                    <p className="text-[12px] text-[#646970] truncate leading-snug">
                      {msg.content}
                    </p>
                    <div className="mt-1 flex items-center gap-1.2 text-[9px] font-bold uppercase tracking-tighter text-[#2271b1]">
                      <Clock size={8} />
                      {format(parseISO(msg.createdAt), 'MMM do')}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Content Area */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedMessage ? (
            <>
              <div className="p-6 border-b border-[#f0f0f1] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 flex items-center justify-center rounded-sm font-bold text-lg ${selectedMessage.isBroadcast ? 'bg-[#2271b1] text-white' : (selectedMessage.senderId === user?.id ? 'bg-emerald-600 text-white' : 'bg-[#f6f7f7] border border-[#dcdcde] text-[#1d2327]')}`}>
                    {selectedMessage.isBroadcast ? <Users size={20} /> : (selectedMessage.senderId === user?.id ? <ArrowUpRight size={20} /> : selectedMessage.sender.name[0])}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#1d2327] flex items-center gap-2">
                      {selectedMessage.senderId === user?.id && <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest">SENT</span>}
                      {selectedMessage.isBroadcast ? 'Notice: Store Broadcast' : (selectedMessage.senderId === user?.id ? `Message to ${selectedMessage.recipient?.name || 'Unknown'}` : `Message from ${selectedMessage.sender.name}`)}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-[#646970] mt-0.5">
                      <span className="bg-[#f0f6fb] text-[#2271b1] text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                        {selectedMessage.sender.role.name}
                      </span>
                      <span>•</span>
                      <span>{format(parseISO(selectedMessage.createdAt), 'EEEE, MMMM do yyyy @ HH:mm')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-[#f6f7f7] text-[#a7aaad] rounded-sm transition-all border border-transparent hover:border-[#ccd0d4]">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
              </div>
              <div className="p-8 flex-1 overflow-y-auto">
                <div className="max-w-2xl prose prose-slate prose-sm text-[#3c434a] leading-relaxed whitespace-pre-wrap">
                  {selectedMessage.content}
                </div>
                
                {selectedMessage.isBroadcast && (
                  <div className="mt-12 p-4 bg-emerald-50 border border-emerald-100 flex items-start gap-3 items-center">
                    <CheckCircle2 size={16} className="text-emerald-600 mt-0.5" />
                    <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-tight">
                      This is a verified system broadcast from management.
                    </p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-[#f0f0f1] bg-[#f9f9f9]">
                <p className="text-[10px] text-[#a7aaad] italic">
                  Messages are archived for 30 days. Contact IT for logs.
                </p>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center text-[#a7aaad] space-y-4">
              <div className="w-20 h-20 bg-[#f6f7f7] rounded-full flex items-center justify-center border-2 border-dashed border-[#ccd0d4]">
                <Bell size={32} />
              </div>
              <div className="max-w-xs">
                <h3 className="text-lg font-bold text-[#1d2327]">Select a message</h3>
                <p className="text-sm mt-1">Pick a notification from the list on the left to read its full content.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1d2327]/60 backdrop-blur-[1px]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-[#dcdcde] w-full max-w-lg p-0 shadow-2xl overflow-hidden"
          >
            <div className="bg-[#1d2327] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send size={16} />
                <h2 className="text-sm font-bold uppercase tracking-widest">Compose Message</h2>
              </div>
              <button onClick={() => setIsComposeOpen(false)} className="text-[#a7aaad] hover:text-white transition-colors">
                <AlertCircle size={20} />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = {
                content: formData.get('content'),
                recipientId: formData.get('recipientId') === 'BROADCAST' ? null : formData.get('recipientId'),
                isBroadcast: formData.get('recipientId') === 'BROADCAST',
              };
              sendMessageMutation.mutate(data);
            }} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#646970] uppercase">Target Recipient</label>
                <div className="relative">
                  <select name="recipientId" className="w-full px-3 py-2 bg-white border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-sm rounded-sm appearance-none" required>
                    <option value="BROADCAST">📣 ALL STAFF (Global Broadcast)</option>
                    <optgroup label="Direct Message">
                      {staff?.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.role.name})</option>
                      ))}
                    </optgroup>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#646970] uppercase">Message Content</label>
                <textarea 
                  name="content" 
                  rows={6}
                  className="w-full px-3 py-3 bg-white border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-sm rounded-sm resize-none" 
                  placeholder="Type your message here..."
                  required
                ></textarea>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsComposeOpen(false)} className="flex-1 py-3 text-xs font-bold text-[#646970] hover:bg-[#f6f7f7] border border-[#dcdcde] rounded-sm uppercase">Cancel</button>
                <button type="submit" disabled={sendMessageMutation.isPending} className="flex-1 bg-[#2271b1] hover:bg-[#135e96] text-white py-3 text-xs font-bold rounded-sm uppercase flex items-center justify-center gap-2">
                  <Send size={14} />
                  {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MessagingCenter;
