import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  Briefcase,
  Home,
  Palmtree,
  Info,
  X,
  Check
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks, setHours, setMinutes } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// — Shift definitions —
const SHIFT_OPTIONS = [
  { value: '',        label: '— Vacant —',          icon: Briefcase, color: 'text-slate-400 bg-slate-50 border-slate-200' },
  { value: 'MORNING', label: 'Morning (08-16)',    icon: Clock,     color: 'text-[#2271b1] bg-[#f0f6fb] border-[#72aee6]' },
  { value: 'EVENING', label: 'Evening (16-00)',    icon: Clock,     color: 'text-[#6d28d9] bg-[#f5f3ff] border-[#c4b5fd]' },
  { value: 'OFF',     label: 'Off Duty',           icon: Home,      color: 'text-slate-500 bg-slate-100 border-slate-300' },
  { value: 'LEAVE',   label: 'On Leave',           icon: Palmtree,  color: 'text-[#059669] bg-[#ecfdf5] border-[#6ee7b7]' },
];

const SHIFT_MAP: Record<string, typeof SHIFT_OPTIONS[0]> = SHIFT_OPTIONS.reduce((acc, opt) => ({ ...acc, [opt.value]: opt }), {});

const DutyRoster = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedCell, setSelectedCell] = useState<{ staffId: string, day: Date, shift: any } | null>(null);
  const [timeForm, setTimeForm] = useState({ role: '', startTime: '08:00', endTime: '16:00' });
  
  const isManager = ['MANAGER', 'OWNER'].includes(user?.role || '');

  // Always fetch all staff and all shifts now
  const { data: staff, isLoading: staffLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then(r => r.data),
  });

  const { data: shifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', format(currentWeekStart, 'yyyy-MM-dd')],
    queryFn: () => api.get('/staff/shifts').then(r => r.data),
  });

  const assignMutation = useMutation({
    mutationFn: (data: any) => data.existingId ? api.put(`/staff/shifts/${data.existingId}`, data) : api.post('/staff/shifts', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
    onError: (error: any) => alert(error.response?.data?.message || 'Failed to update shift.')
  });

  const weekDays = [...Array(7)].map((_, i) => addDays(currentWeekStart, i));

  const getShiftForCell = useCallback((staffId: string, day: Date) => 
    shifts?.find((s: any) => s.userId === staffId && isSameDay(parseISO(s.date), day)) || null, 
  [shifts]);

  const handleCellClick = (staffId: string, day: Date, shift: any) => {
    if (!isManager) return;
    setSelectedCell({ staffId, day, shift });
    
    // Initialize form with existing data or defaults
    const shiftRole = shift?.role?.toUpperCase() || 'MORNING';
    const sDate = shift?.startTime ? parseISO(shift.startTime) : null;
    const eDate = shift?.endTime ? parseISO(shift.endTime) : null;

    setTimeForm({
      role: shiftRole,
      startTime: sDate ? format(sDate, 'HH:mm') : (shiftRole === 'EVENING' ? '16:00' : '08:00'),
      endTime: eDate ? format(eDate, 'HH:mm') : (shiftRole === 'EVENING' ? '23:59' : '16:00')
    });
  };

  const handleSaveShift = () => {
    if (!selectedCell) return;
    const { staffId, day, shift } = selectedCell;
    const { role, startTime, endTime } = timeForm;

    if (role === 'OFF' || role === 'LEAVE' || role === '') {
      assignMutation.mutate({
        userId: staffId,
        date: day.toISOString(),
        role: role || '',
        startTime: null,
        endTime: null,
        existingId: shift?.id,
      });
    } else {
      const [sH, sM] = startTime.split(':').map(Number);
      const [eH, eM] = endTime.split(':').map(Number);

      const s = setMinutes(setHours(new Date(day), sH), sM);
      const e = setMinutes(setHours(new Date(day), eH), eM);

      assignMutation.mutate({
        userId: staffId,
        date: day.toISOString(),
        role,
        startTime: s.toISOString(),
        endTime: e.toISOString(),
        existingId: shift?.id,
      });
    }
    setSelectedCell(null);
  };

  if (staffLoading || shiftsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-4 border-[#2271b1]/20 border-t-[#2271b1] rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Loading Schedule...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#dcdcde] shadow-sm overflow-hidden animate-in fade-in duration-500">
      {/* HEADER SECTION */}
      <div className="px-6 py-5 border-b border-[#f0f0f1] bg-[#fdfdfd] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#2271b1] text-white rounded flex items-center justify-center shadow-lg shadow-blue-100">
            <Calendar size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-[#1d2327]">Team Duty Roster</h2>
            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
              <Info size={12} className="text-[#2271b1]" />
              {isManager ? 'Shift management and allocation terminal' : 'Weekly staff deployment schedule'}
            </p>
          </div>
        </div>

        {/* WEEK NAVIGATOR */}
        <div className="flex items-center bg-[#f0f0f1] p-1 rounded-md border border-[#dcdcde] self-start md:self-center">
          <button 
            onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
            className="p-1.5 hover:bg-white hover:text-[#2271b1] transition-all rounded text-slate-500"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="px-4 text-[11px] font-black uppercase tracking-tighter text-[#1d2327] min-w-[180px] text-center">
            {format(currentWeekStart, 'MMM d')} — {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
          </div>
          <button 
            onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
            className="p-1.5 hover:bg-white hover:text-[#2271b1] transition-all rounded text-slate-500"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* COMPACT ROSTER GRID */}
      <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
        <table className="w-full border-collapse border-hidden">
          <thead>
            <tr className="bg-slate-50 border-b border-[#dcdcde]">
              <th className="px-5 py-3 text-left border-r border-[#dcdcde] w-48 sticky left-0 bg-slate-50 z-20">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Team Member</span>
              </th>
              {weekDays.map(day => (
                <th key={day.toISOString()} className={`px-2 py-3 border-r border-[#dcdcde] text-center min-w-[110px] ${isSameDay(day, new Date()) ? 'bg-blue-50/50' : ''}`}>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{format(day, 'EEE')}</div>
                  <div className={`text-lg font-black leading-none mt-0.5 ${isSameDay(day, new Date()) ? 'text-[#2271b1]' : 'text-[#1d2327]'}`}>
                    {format(day, 'd')}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0f1]">
            {staff?.map((s: any) => {
              const isCurrentUser = s.id === user?.id;
              return (
                <tr key={s.id} className={`group ${isCurrentUser ? 'bg-blue-50/20' : 'hover:bg-slate-50/50'} transition-colors`}>
                  {/* STAFF CELL */}
                  <td className={`px-5 py-2.5 border-r border-[#dcdcde] sticky left-0 z-10 transition-colors ${isCurrentUser ? 'bg-blue-50/80 shadow-[2px_0_10px_rgba(0,0,0,0.02)]' : 'bg-white group-hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center font-black text-xs transition-transform group-hover:scale-105 ${isCurrentUser ? 'bg-[#2271b1] text-white shadow-md' : 'bg-[#1d2327] text-white/90'}`}>
                        {s.name[0]}
                      </div>
                      <div className="overflow-hidden">
                        <p className={`text-[12px] font-bold leading-tight truncate ${isCurrentUser ? 'text-[#2271b1]' : 'text-[#1d2327]'}`}>{s.name} {isCurrentUser && '(You)'}</p>
                        <p className="text-[9px] font-black uppercase tracking-tighter text-slate-400">{s.role?.name || 'Staff'}</p>
                      </div>
                    </div>
                  </td>

                  {/* DAY CELLS - TINY DESIGN */}
                  {weekDays.map(day => {
                    const shift = getShiftForCell(s.id, day);
                    const shiftVal = shift?.role?.toUpperCase() || '';
                    const shiftMeta = SHIFT_MAP[shiftVal] || SHIFT_MAP[''];
                    const isToday = isSameDay(day, new Date());

                    return (
                      <td key={day.toISOString()} className={`px-1.5 py-2 border-r border-[#dcdcde] transition-colors relative ${isToday ? 'bg-blue-50/30 ring-1 ring-inset ring-blue-100/50' : ''}`}>
                        <button
                          onClick={() => handleCellClick(s.id, day, shift)}
                          disabled={!isManager}
                          className={`
                            w-full py-2.5 rounded border text-[9px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-0.5 transition-all shadow-sm
                            ${shiftVal ? shiftMeta.color : 'bg-transparent border-dashed border-[#e2e4e7] text-slate-300'}
                            ${isManager ? 'hover:scale-[1.02] active:scale-95 cursor-pointer' : 'cursor-default'}
                          `}
                        >
                          {shiftVal ? (
                            <>
                              <div className="flex items-center gap-1.5">
                                <shiftMeta.icon size={11} className="shrink-0" />
                                <span className="truncate">{shiftMeta.label.split(' ')[0]}</span>
                              </div>
                              {(shift?.startTime || shift?.endTime) && (
                                <span className="text-[7px] opacity-70">
                                  {shift.startTime ? format(parseISO(shift.startTime), 'HH:mm') : '??'}–{shift.endTime ? format(parseISO(shift.endTime), 'HH:mm') : '??'}
                                </span>
                              )}
                            </>
                          ) : (
                            '–'
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedCell && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden border border-[#dcdcde]"
            >
              <div className="bg-[#2271b1] p-5 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest">Assign Shift</h3>
                  <p className="text-[13px] font-bold mt-0.5">{staff?.find((st: any) => st.id === selectedCell.staffId)?.name} · {format(selectedCell.day, 'EEE, MMM d')}</p>
                </div>
                <button onClick={() => setSelectedCell(null)} className="hover:rotate-90 transition-transform"><X size={18} /></button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SHIFT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setTimeForm({ ...timeForm, role: opt.value })}
                        className={`px-3 py-2.5 rounded border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${timeForm.role === opt.value ? 'bg-[#2271b1] text-white border-[#2271b1] shadow-md shadow-blue-100' : 'bg-white text-slate-400 border-[#dcdcde] hover:border-[#2271b1] hover:text-[#2271b1]'}`}
                      >
                        <opt.icon size={12} />
                        {opt.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {['MORNING', 'EVENING'].includes(timeForm.role) && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Time</label>
                      <input 
                        type="time" 
                        value={timeForm.startTime}
                        onChange={(e) => setTimeForm({ ...timeForm, startTime: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-[#dcdcde] rounded text-sm font-bold focus:border-[#2271b1] outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End Time</label>
                      <input 
                        type="time" 
                        value={timeForm.endTime}
                        onChange={(e) => setTimeForm({ ...timeForm, endTime: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-[#dcdcde] rounded text-sm font-bold focus:border-[#2271b1] outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button 
                    onClick={() => setSelectedCell(null)}
                    className="flex-1 px-4 py-3 border border-[#ccd0d4] rounded text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveShift}
                    disabled={assignMutation.isPending}
                    className="flex-1 px-4 py-3 bg-[#2271b1] text-white rounded text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-[#135e96] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {assignMutation.isPending ? 'Saving...' : <><Check size={14} /> Update Shift</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER LEGEND AND INFO */}
      <div className="px-6 py-4 bg-slate-50/50 border-t border-[#f0f0f1] flex flex-wrap gap-x-6 gap-y-3">
        {SHIFT_OPTIONS.filter(o => o.value).map(opt => (
          <div key={opt.value} className="flex items-center gap-2">
             <div className={`w-3 h-3 rounded-full border shadow-sm ${opt.color.split(' ').slice(1).join(' ')}`} />
             <span className="text-[10px] font-bold text-slate-500 lowercase tracking-wide">{opt.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};


export default DutyRoster;
