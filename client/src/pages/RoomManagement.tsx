import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { BedDouble, Edit3, Check, X, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ROOM_TYPES = ['Single', 'Double', 'Twin', 'Suite', 'Deluxe', 'Executive', 'Family'];

const ROOM_STATUS_COLORS: Record<string, string> = {
  AVAILABLE:   'bg-emerald-100 text-emerald-700 border-emerald-200',
  OCCUPIED:    'bg-blue-100 text-blue-700 border-blue-200',
  CLEANING:    'bg-amber-100 text-amber-700 border-amber-200',
  RESERVED:    'bg-violet-100 text-violet-700 border-violet-200',
  MAINTENANCE: 'bg-red-100 text-red-600 border-red-200',
};

const RoomManagement = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.get('/rooms').then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => api.patch(`/rooms/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setEditingId(null);
    }
  });

  const createRoomMutation = useMutation({
    mutationFn: (data: any) => api.post(`/rooms`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setIsAddModalOpen(false);
    },
    onError: (err: any) => {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'An error occurred while creating the room');
    }
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/rooms/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
    onError: (err: any) => alert(err.response?.data?.message || 'Error deleting room')
  });

  const startEdit = (room: any) => {
    setEditingId(room.id);
    setEditData({ price: room.price, amenities: room.amenities || '', type: room.type });
  };

  const saveEdit = (id: string) => {
    updateMutation.mutate({ id, data: { price: Number(editData.price), amenities: editData.amenities, type: editData.type } });
  };

  if (isLoading) return <div className="flex items-center justify-center h-64 text-sm font-medium text-[#646970]">Loading rooms…</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#dcdcde] pb-5">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-[#1d2327] text-white rounded-sm"><BedDouble size={22} /></div>
          <div>
            <h1 className="text-2xl font-bold text-[#1d2327]">Room Management</h1>
            <p className="text-sm text-[#646970]">Edit room prices, types and amenity packages</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#2271b1] hover:bg-[#135e96] text-white text-sm font-bold px-4 py-2 rounded-sm shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Add New Room
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(ROOM_STATUS_COLORS).map(([status, cls]) => (
          <span key={status} className={`px-2.5 py-1 border rounded-full text-[10px] font-bold uppercase tracking-wide ${cls}`}>
            {status}
          </span>
        ))}
      </div>

      {/* Room Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <AnimatePresence>
          {rooms?.map((room: any) => (
            <motion.div
              key={room.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-[#dcdcde] rounded-sm shadow-sm overflow-hidden"
            >
              {/* Card top accent */}
              <div className={`h-1.5 ${
                room.status === 'AVAILABLE' ? 'bg-emerald-500' :
                room.status === 'OCCUPIED'  ? 'bg-blue-500' :
                room.status === 'CLEANING'  ? 'bg-amber-500' : 'bg-slate-400'
              }`} />

              <div className="p-5 space-y-4">
                {/* Room number + status */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-[#646970] uppercase tracking-widest">Room</p>
                    <p className="text-3xl font-black text-[#1d2327]">{room.number}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-0.5 border text-[9px] font-bold uppercase rounded-sm ${ROOM_STATUS_COLORS[room.status] || ''}`}>
                      {room.status}
                    </span>
                    <button 
                      onClick={() => { if(confirm('Are you sure you want to delete this room?')) deleteRoomMutation.mutate(room.id); }}
                      className="p-1 text-[#a7aaad] hover:text-[#d63638] hover:bg-[#fcf0f1] rounded-sm transition-colors"
                      title="Delete Room"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Edit Mode */}
                {editingId === room.id ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#646970] uppercase">Room Type</label>
                      <div className="relative">
                        <select
                          value={editData.type}
                          onChange={e => setEditData((p: any) => ({ ...p, type: e.target.value }))}
                          className="w-full px-3 pr-8 py-2 border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-sm rounded-sm appearance-none bg-white"
                        >
                          {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#646970] uppercase">Price per Night (KES)</label>
                      <input
                        type="number" min="0"
                        value={editData.price}
                        onChange={e => setEditData((p: any) => ({ ...p, price: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-sm rounded-sm"
                        placeholder="e.g. 5000"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#646970] uppercase">Amenities (comma-separated)</label>
                      <textarea
                        value={editData.amenities}
                        onChange={e => setEditData((p: any) => ({ ...p, amenities: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-sm rounded-sm resize-none"
                        placeholder="e.g. WiFi, TV, Air Conditioning, En-Suite Bathroom, Breakfast"
                      />
                      <p className="text-[9px] text-[#8c8f94]">Tip: Separate each item with a comma</p>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => saveEdit(room.id)}
                        disabled={updateMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#2271b1] hover:bg-[#135e96] text-white text-xs font-bold rounded-sm disabled:opacity-60 transition-all"
                      >
                        <Check size={14} /> Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-2 bg-white border border-[#dcdcde] text-[#646970] hover:bg-[#f6f7f7] text-xs font-bold rounded-sm transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display Mode */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-[#646970] uppercase">Type</p>
                        <p className="text-sm font-bold text-[#1d2327]">{room.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-[#646970] uppercase">Rate</p>
                        <p className="text-lg font-black text-[#2271b1]">KES {room.price?.toLocaleString()}<span className="text-[10px] font-bold text-[#8c8f94]">/night</span></p>
                      </div>
                    </div>

                    {/* Amenities */}
                    <div>
                      <p className="text-[10px] font-bold text-[#646970] uppercase mb-1.5">Package Includes</p>
                      {room.amenities ? (
                        <div className="flex flex-wrap gap-1.5">
                          {room.amenities.split(',').map((a: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-[#f6f7f7] border border-[#dcdcde] text-[10px] font-bold text-[#3c434a] rounded-full">
                              {a.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#8c8f94] italic">No amenities listed — click Edit to add</p>
                      )}
                    </div>

                    <button
                      onClick={() => startEdit(room)}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-[#f6f7f7] hover:bg-white border border-[#dcdcde] hover:border-[#2271b1] text-[#3c434a] hover:text-[#2271b1] text-xs font-bold rounded-sm transition-all"
                    >
                      <Edit3 size={13} /> Edit Room Details
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Room Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1d2327]/60 backdrop-blur-[1px]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-[#dcdcde] w-full max-w-sm shadow-2xl overflow-hidden"
          >
            <div className="bg-[#1d2327] text-white p-4 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest">Add New Room</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#a7aaad] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createRoomMutation.mutate(Object.fromEntries(formData));
            }} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#646970] uppercase">Room Number</label>
                <input name="number" className="w-full px-3 py-2 bg-[#f6f7f7] border border-[#ccd0d4] focus:border-[#2271b1] focus:bg-white outline-none text-sm transition-all" required placeholder="e.g. 101" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#646970] uppercase">Room Type</label>
                <div className="relative">
                  <select name="type" className="w-full px-3 py-2 bg-[#f6f7f7] border border-[#ccd0d4] focus:border-[#2271b1] focus:bg-white outline-none text-sm appearance-none transition-all" required>
                    {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#646970] uppercase">Price per Night (KES)</label>
                <input name="price" type="number" min="0" className="w-full px-3 py-2 bg-[#f6f7f7] border border-[#ccd0d4] focus:border-[#2271b1] focus:bg-white outline-none text-sm transition-all" required placeholder="e.g. 5000" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#646970] uppercase">Amenities</label>
                <textarea name="amenities" rows={3} className="w-full px-3 py-2 bg-[#f6f7f7] border border-[#ccd0d4] focus:border-[#2271b1] focus:bg-white outline-none text-sm transition-all resize-none" placeholder="e.g. WiFi, TV, View" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 text-xs font-black text-[#646970] bg-[#f6f7f7] hover:bg-[#eaeaec] border border-[#dcdcde] rounded-sm transition-all uppercase tracking-widest">Cancel</button>
                <button type="submit" disabled={createRoomMutation.isPending} className="flex-1 bg-[#2271b1] hover:bg-[#135e96] text-white py-3 text-xs font-black shadow-lg rounded-sm transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                  {createRoomMutation.isPending ? 'ADDING...' : 'ADD ROOM'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default RoomManagement;
