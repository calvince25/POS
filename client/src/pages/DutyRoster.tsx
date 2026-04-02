import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  User as UserIcon,
  Clock,
  Briefcase,
  Home,
  Palmtree,
  Info
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns';
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

  const handleCellChange = (staffId: string, day: Date, value: string, existingShift: any) => {
    if (!isManager) return;
    const opt = SHIFT_MAP[value] || SHIFT_MAP[''];
    // Default times based on shift value
    let startTime = null, endTime = null;
    if (value === 'MORNING') {
      const s = new Date(day); s.setHours(8,0,0,0);
      const e = new Date(day); e.setHours(16,0,0,0);
      startTime = s.toISOString(); endTime = e.toISOString();
    } else if (value === 'EVENING') {
      const s = new Date(day); s.setHours(16,0,0,0);
      const e = new Date(day); e.setHours(23,59,0,0);
      startTime = s.toISOString(); endTime = e.toISOString();
    }

    assignMutation.mutate({
      userId: staffId,
      date: day.toISOString(),
      role: value,
      startTime,
      endTime,
      existingId: existingShift?.id,
    });
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
                        {isManager ? (
                          /* MANAGER EDITABLE CELL */
                          <div className="relative group/cell">
                            <select 
                              value={shiftVal}
                              onChange={(e) => handleCellChange(s.id, day, e.target.value, shift)}
                              className={`
                                w-full text-[10px] font-black px-2 py-1.5 pr-6 rounded border transition-all appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[#2271b1]/20
                                ${shiftVal ? shiftMeta.color : 'bg-[#fff] border-[#ccd0d4] text-[#8c8f94] hover:border-[#2271b1]'}
                              `}
                            >
                              {SHIFT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                              <ChevronDown size={10} />
                            </div>
                          </div>
                        ) : (
                          /* STAFF READ-ONLY CELL - THE TINY PRESENTABLE VERSION */
                          <div className={`
                            w-full py-2.5 rounded border text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-sm
                            ${shiftVal ? shiftMeta.color : 'bg-transparent border-dashed border-[#e2e4e7] text-slate-300'}
                          `}>
                            {shiftVal ? (
                              <>
                                <shiftMeta.icon size={11} className="shrink-0" />
                                <span className="truncate">{shiftMeta.label.split(' ')[0]}</span>
                              </>
                            ) : (
                              '–'
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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

const ChevronDown = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export default DutyRoster;
