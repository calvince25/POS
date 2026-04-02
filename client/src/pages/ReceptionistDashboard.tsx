import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  BedDouble, Plus, User, Phone, X,
  CheckCircle2, LogIn, LogOut, Download, Search,
  ChevronDown, AlertCircle, Clock, Smartphone,
  FileText
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { exportToPDF } from '../utils/pdfExport';

// ─── Status colour tokens ───────────────────────────────────────────
const ROOM_BADGE: Record<string, { bar: string; card: string; text: string; badge: string }> = {
  AVAILABLE:   { bar: 'bg-emerald-500', card: 'bg-white border-[#ccd0d4] hover:border-emerald-400',   text: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  RESERVED:    { bar: 'bg-violet-500',  card: 'bg-violet-50 border-violet-300',                        text: 'text-violet-700',  badge: 'bg-violet-50 text-violet-700 border-violet-200'   },
  OCCUPIED:    { bar: 'bg-blue-500',    card: 'bg-blue-50 border-blue-300',                            text: 'text-blue-700',    badge: 'bg-blue-50 text-blue-700 border-blue-200'         },
  CLEANING:    { bar: 'bg-amber-500',   card: 'bg-amber-50 border-amber-300',                          text: 'text-amber-700',   badge: 'bg-amber-50 text-amber-700 border-amber-200'      },
  MAINTENANCE: { bar: 'bg-red-500',     card: 'bg-red-50 border-red-300',                              text: 'text-red-700',     badge: 'bg-red-50 text-red-600 border-red-200'            },
};

const BOOKING_BADGE: Record<string, string> = {
  CONFIRMED:   'bg-blue-50 text-blue-700 border-blue-200',
  CHECKED_IN:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  CHECKED_OUT: 'bg-slate-100 text-slate-500 border-slate-200',
  CANCELLED:   'bg-red-50 text-red-600 border-red-200',
  COMPLETED:   'bg-purple-50 text-purple-600 border-purple-200',
};

// ─── Component ──────────────────────────────────────────────────────
const ReceptionistDashboard = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'rooms' | 'bookings'>('rooms');
  const [statusFilter, setStatusFilter] = useState<string | null>(null); // null = show all
  const [bookingModal, setBookingModal] = useState(false);
  const [preselectedRoom, setPreselectedRoom] = useState<any>(null);
  const [formError, setFormError] = useState('');
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [selectedBookingForPay, setSelectedBookingForPay] = useState<any>(null);

  // ── Queries ──
  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.get('/rooms').then(r => r.data),
    refetchInterval: 15000,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => api.get('/rooms/bookings').then(r => r.data),
    refetchInterval: 15000,
  });

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/rooms/bookings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setBookingModal(false);
      setPreselectedRoom(null);
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || 'Failed to create booking. Please try again.');
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/rooms/bookings/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });

  const mpesaMutation = useMutation({
    mutationFn: (data: { bookingId: string; phoneNumber: string; amount: number }) =>
      api.post('/payments/mpesa/booking/initiate', data),
    onSuccess: () => {
      alert('STK Push sent successfully. Please check the phone to complete payment.');
      setShowMpesaModal(false);
      setMpesaPhone('');
      setSelectedBookingForPay(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to initiate STK Push');
    }
  });

  const processMpesaPay = () => {
    if (mpesaPhone.length < 9) {
      alert('Please enter a valid phone number');
      return;
    }
    const totalPaid = selectedBookingForPay.payments?.filter((p: any) => p.status === 'COMPLETED').reduce((acc: any, p: any) => acc + p.amount, 0) || 0;
    const balance = selectedBookingForPay.totalAmount - totalPaid;

    if (balance <= 0) {
      alert('Booking is already fully paid.');
      return;
    }

    mpesaMutation.mutate({
      bookingId: selectedBookingForPay.id,
      phoneNumber: `254${mpesaPhone}`,
      amount: balance
    });
  };

  // ── Stats ──
  const stats = {
    total:     rooms.length,
    available: rooms.filter((r: any) => r.status === 'AVAILABLE').length,
    occupied:  rooms.filter((r: any) => r.status === 'OCCUPIED').length,
    reserved:  rooms.filter((r: any) => r.status === 'RESERVED').length,
    cleaning:  rooms.filter((r: any) => r.status === 'CLEANING').length,
  };

  const checkedInBookings = bookings.filter((b: any) => b.status === 'CHECKED_IN');
  void checkedInBookings; // used for display count only

  // For each room, find the active booking (CONFIRMED or CHECKED_IN)
  const getActiveBooking = (room: any) =>
    room.bookings?.find((b: any) => ['CONFIRMED', 'CHECKED_IN'].includes(b.status)) || null;

  // ── Filtered lists ──
  const q = search.toLowerCase();
  const filteredRooms = rooms.filter((r: any) => {
    const matchSearch = r.number.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
    const matchStatus = statusFilter ? r.status === statusFilter : true;
    return matchSearch && matchStatus;
  });
  const filteredBookings = bookings.filter((b: any) =>
    b.guestName?.toLowerCase().includes(q) ||
    b.room?.number?.toLowerCase().includes(q) ||
    b.guestPhone?.includes(q)
  );

  // ── Open new booking modal ──
  const openBook = (room?: any) => {
    setPreselectedRoom(room || null);
    setFormError('');
    setBookingModal(true);
  };

  // ── Handle booking form submit ──
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const roomId   = fd.get('roomId') as string;
    const checkIn  = fd.get('checkIn') as string;
    const checkOut = fd.get('checkOut') as string;

    if (!roomId) { setFormError('Please select a room.'); return; }
    if (!checkIn || !checkOut) { setFormError('Please select check-in and check-out dates.'); return; }
    if (new Date(checkOut) <= new Date(checkIn)) { setFormError('Check-out must be after check-in.'); return; }

    setFormError('');
    createMutation.mutate({
      guestName:  fd.get('guestName'),
      guestPhone: fd.get('guestPhone') || null,
      roomId,
      checkIn:    new Date(checkIn).toISOString(),
      checkOut:   new Date(checkOut).toISOString(),
      notes:      fd.get('notes') || null,
    });
  };

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#dcdcde] pb-5">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-[#1d2327] text-white rounded-sm">
            <BedDouble size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1d2327]">Lodging Management</h1>
            <p className="text-sm text-[#646970]">
              {stats.available} available · {stats.occupied} occupied · {stats.reserved} reserved
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              const data = bookings.map((b: any) => [
                b.id.substring(0, 8), b.guestName, `Room ${b.room?.number}`,
                format(new Date(b.checkIn), 'MMM dd yyyy'),
                format(new Date(b.checkOut), 'MMM dd yyyy'),
                b.status
              ]);
              exportToPDF('Lodging Bookings Report',
                ['ID', 'Guest', 'Room', 'Check In', 'Check Out', 'Status'],
                data, 'bookings_report');
            }}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-[#ccd0d4] hover:border-[#2271b1] rounded-sm font-bold text-xs text-[#3c434a] transition-all"
          >
            <Download size={13} /> PDF Report
          </button>
          <button
            onClick={() => openBook()}
            className="flex items-center gap-2 px-4 py-2 bg-[#2271b1] hover:bg-[#135e96] text-white rounded-sm font-bold text-sm shadow-sm transition-all"
          >
            <Plus size={16} /> Lodge Guest
          </button>
        </div>
      </div>

      {/* ── Stats Row — CLICKABLE FILTERS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'All Rooms',  key: null,        value: stats.total,    color: 'bg-[#1d2327] text-white',   ring: 'ring-slate-500' },
          { label: 'Available', key: 'AVAILABLE',  value: stats.available, color: 'bg-emerald-500 text-white', ring: 'ring-emerald-300' },
          { label: 'Occupied',  key: 'OCCUPIED',   value: stats.occupied,  color: 'bg-blue-600 text-white',    ring: 'ring-blue-300' },
          { label: 'Reserved',  key: 'RESERVED',   value: stats.reserved,  color: 'bg-violet-500 text-white',  ring: 'ring-violet-300' },
          { label: 'Cleaning',  key: 'CLEANING',   value: stats.cleaning,  color: 'bg-amber-500 text-white',   ring: 'ring-amber-300' },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => {
              setStatusFilter(statusFilter === s.key ? null : s.key);
              setActiveTab('rooms');
            }}
            title={s.key ? `Click to show only ${s.label} rooms` : 'Show all rooms'}
            className={`
              ${s.color} p-4 rounded-sm shadow-sm text-left transition-all cursor-pointer relative
              ${statusFilter === s.key ? `ring-4 ${s.ring} scale-[1.03] shadow-lg` : 'hover:opacity-90 hover:scale-[1.01]'}
            `}
          >
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-70">{s.label}</p>
            <p className="text-3xl font-black mt-0.5">{s.value}</p>
            {statusFilter === s.key && (
              <span className="absolute top-1.5 right-1.5 text-[7px] bg-white/25 px-1 py-0.5 rounded-full font-black uppercase">Active</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tabs + Search ── */}
      <div className="flex items-center border-b border-[#dcdcde]">
        {(['rooms', 'bookings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all -mb-px ${
              activeTab === tab
                ? 'border-[#2271b1] text-[#2271b1]'
                : 'border-transparent text-[#646970] hover:text-[#2271b1]'
            }`}
          >
            {tab === 'rooms' ? `🏨 Room Grid (${rooms.length})` : `📋 All Bookings (${bookings.length})`}
          </button>
        ))}
        {statusFilter && (
          <button
            onClick={() => setStatusFilter(null)}
            className="ml-2 flex items-center gap-1 px-2.5 py-1 bg-[#2271b1]/10 text-[#2271b1] border border-[#2271b1]/30 rounded-full text-[10px] font-bold uppercase"
          >
            <X size={10} /> Clear filter: {statusFilter}
          </button>
        )}
        <div className="ml-auto mb-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input
            type="text"
            placeholder={activeTab === 'rooms' ? 'Filter rooms…' : 'Search name/room…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-xs w-44 rounded-sm"
          />
        </div>
      </div>

      {/* ═══════════════════  ROOM GRID TAB  ═══════════════════ */}
      {activeTab === 'rooms' && (
        <>
          {/* Legend */}
          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
            {Object.entries(ROOM_BADGE).map(([s, c]) => (
              <span key={s} className={`px-2.5 py-1 border rounded-full uppercase ${c.badge}`}>{s}</span>
            ))}
          </div>

          {roomsLoading ? (
            <div className="text-center py-16 text-[#646970] text-sm">Loading rooms…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {filteredRooms.map((room: any) => {
                const t  = ROOM_BADGE[room.status] || ROOM_BADGE.AVAILABLE;
                const activeB = getActiveBooking(room);
                const isAvail = room.status === 'AVAILABLE';

                return (
                  <div
                    key={room.id}
                    className={`relative rounded-sm border overflow-hidden shadow-sm transition-all ${t.card} ${isAvail ? 'cursor-pointer' : ''}`}
                    onClick={() => isAvail && openBook(room)}
                  >
                    {/* Status bar */}
                    <div className={`h-1.5 w-full ${t.bar}`} />

                    <div className="p-3 space-y-1.5">
                      {/* Room number + status badge */}
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-2xl font-black text-[#1d2327] leading-none">{room.number}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 border rounded-sm font-bold uppercase whitespace-nowrap ${t.badge}`}>
                          {room.status}
                        </span>
                      </div>

                      {/* Type & rate */}
                      <div>
                        <p className="text-[10px] font-bold text-[#646970] uppercase">{room.type}</p>
                        <p className={`text-[11px] font-black ${t.text}`}>KES {room.price?.toLocaleString()}<span className="font-medium text-[#8c8f94">/night</span></p>
                      </div>

                      {/* Amenities pills */}
                      {room.amenities && (
                        <p className="text-[8px] text-[#8c8f94] leading-tight line-clamp-2">{room.amenities}</p>
                      )}

                      {/* Active guest info */}
                      {activeB && (
                        <div className={`mt-1 pt-1.5 border-t ${room.status === 'OCCUPIED' ? 'border-blue-200' : 'border-violet-200'}`}>
                          <div className="flex items-center gap-1 text-[9px] font-bold text-[#1d2327] uppercase truncate">
                            <User size={9} />
                            <span className="truncate">{activeB.guestName}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[8px] text-[#646970] mt-0.5">
                            <Clock size={8} />
                            <span>{format(new Date(activeB.checkIn), 'MMM dd')} → {format(new Date(activeB.checkOut), 'MMM dd')}</span>
                          </div>
                        </div>
                      )}

                      {/* CTA */}
                      {isAvail ? (
                        <button
                          onClick={e => { e.stopPropagation(); openBook(room); }}
                          className="w-full mt-2 md:mt-1 text-xs md:text-[9px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 md:py-1.5 rounded-sm transition-all active:scale-[0.98]"
                        >
                          + Book Now
                        </button>
                      ) : room.status === 'CLEANING' ? (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            api.patch(`/rooms/${room.id}/status`, { status: 'AVAILABLE' })
                              .then(() => queryClient.invalidateQueries({ queryKey: ['rooms'] }));
                          }}
                          className="w-full mt-2 md:mt-1 text-xs md:text-[9px] font-bold bg-amber-600 hover:bg-amber-700 text-white py-2.5 md:py-1.5 rounded-sm transition-all active:scale-[0.98]"
                        >
                          ✓ Mark as Clean
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════  BOOKINGS TABLE TAB  ═══════════════════ */}
      {activeTab === 'bookings' && (
        <div className="bg-white border border-[#dcdcde] shadow-sm rounded-sm overflow-hidden">
          {bookingsLoading ? (
            <div className="p-16 text-center text-sm text-[#646970]">Loading bookings…</div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-16 text-center text-sm text-[#8c8f94] italic">No bookings found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" style={{ minWidth: '800px' }}>
                <thead>
                  <tr className="bg-[#f6f7f7] border-b border-[#dcdcde]">
                    {['Guest', 'Contact', 'Room', 'Check In', 'Check Out', 'Nights', 'Total (KES)', 'Status', 'Actions'].map(h => (
                      <th key={h} className="p-3 text-[10px] font-bold uppercase tracking-wider text-[#646970] whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f1]">
                  {filteredBookings.map((b: any) => {
                    const nights = Math.max(differenceInDays(new Date(b.checkOut), new Date(b.checkIn)), 1);
                    return (
                      <tr key={b.id} className="hover:bg-[#f9f9f9] transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-sm text-[#1d2327]">{b.guestName}</div>
                          <div className="text-[9px] text-[#8c8f94] font-mono">{b.id.substring(0, 8)}</div>
                        </td>
                        <td className="p-3 text-xs text-[#646970]">{b.guestPhone || '—'}</td>
                        <td className="p-3">
                          <div className="font-black text-base text-[#1d2327]">{b.room?.number}</div>
                          <div className="text-[9px] text-[#2271b1] font-bold uppercase">{b.room?.type}</div>
                        </td>
                        <td className="p-3 text-xs whitespace-nowrap">{format(new Date(b.checkIn), 'EEE, MMM dd yyyy')}</td>
                        <td className="p-3 text-xs whitespace-nowrap">{format(new Date(b.checkOut), 'EEE, MMM dd yyyy')}</td>
                        <td className="p-3 text-center font-bold text-sm">{nights}</td>
                        <td className="p-3 font-bold text-sm text-[#1d2327]">
                          <div className="flex flex-col">
                            <span>{b.totalAmount?.toLocaleString()}</span>
                            {b.payments && b.payments.filter((p: any) => p.status === 'COMPLETED').reduce((acc: any, p: any) => acc + p.amount, 0) > 0 && (
                              <span className="text-[10px] text-green-600 font-bold">
                                Paid: {b.payments.filter((p: any) => p.status === 'COMPLETED').reduce((acc: any, p: any) => acc + p.amount, 0).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 border text-[9px] font-bold uppercase rounded-sm whitespace-nowrap ${BOOKING_BADGE[b.status] || ''}`}>
                            {b.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {['CONFIRMED', 'CHECKED_IN'].includes(b.status) && (
                              <button
                                onClick={() => { setSelectedBookingForPay(b); setShowMpesaModal(true); }}
                                className="flex items-center gap-1 px-2.5 py-1 bg-[#4caf50] text-white text-[9px] font-bold rounded-sm hover:bg-[#388e3c] whitespace-nowrap"
                              >
                                <Smartphone size={10} /> Pay Balance
                              </button>
                            )}
                            {b.status === 'CONFIRMED' && (
                              <button
                                onClick={() => statusMutation.mutate({ id: b.id, status: 'CHECKED_IN' })}
                                disabled={statusMutation.isPending}
                                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white text-[9px] font-bold rounded-sm hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
                              >
                                <LogIn size={10} /> Check In
                              </button>
                            )}
                            {b.status === 'CHECKED_IN' && (
                              <button
                                onClick={() => statusMutation.mutate({ id: b.id, status: 'CHECKED_OUT' })}
                                disabled={statusMutation.isPending}
                                className="flex items-center gap-1 px-2.5 py-1 bg-[#1d2327] text-white text-[9px] font-bold rounded-sm hover:bg-slate-700 disabled:opacity-50 whitespace-nowrap"
                              >
                                <LogOut size={10} /> Check Out
                              </button>
                            )}
                            {['CONFIRMED', 'CHECKED_IN'].includes(b.status) && (
                              <button
                                onClick={() => statusMutation.mutate({ id: b.id, status: 'CANCELLED' })}
                                disabled={statusMutation.isPending}
                                className="flex items-center gap-1 px-2.5 py-1 border border-red-200 bg-red-50 text-red-600 text-[9px] font-bold rounded-sm hover:bg-red-100 disabled:opacity-50"
                              >
                                <X size={10} /> Cancel
                              </button>
                            )}
                            <button
                              onClick={() => {
                                const paid = b.payments?.filter((p: any) => p.status === 'COMPLETED').reduce((acc: any, p: any) => acc + p.amount, 0) || 0;
                                const receiptData = [
                                  ['Description', 'Detail'],
                                  ['Guest Name', b.guestName],
                                  ['Room Number', b.room?.number || 'N/A'],
                                  ['Room Type', b.room?.type || 'N/A'],
                                  ['Check In', format(new Date(b.checkIn), 'MMM dd, yyyy')],
                                  ['Check Out', format(new Date(b.checkOut), 'MMM dd, yyyy')],
                                  ['Nights', Math.max(differenceInDays(new Date(b.checkOut), new Date(b.checkIn)), 1).toString()],
                                  ['Total Amount', `KES ${b.totalAmount.toLocaleString()}`],
                                  ['Amount Paid', `KES ${paid.toLocaleString()}`],
                                  ['Balance', `KES ${(b.totalAmount - paid).toLocaleString()}`],
                                  ['Status', b.status]
                                ];
                                exportToPDF(`Booking Receipt - ${b.id.substring(0, 8)}`, ['Field', 'Value'], receiptData, `receipt_${b.id.substring(0, 8)}`);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 border border-slate-200 bg-white text-slate-600 text-[9px] font-bold rounded-sm hover:bg-slate-50"
                            >
                              <FileText size={10} /> Receipt
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════  BOOKING MODAL  ═══════════════════ */}
      <AnimatePresence>
        {bookingModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#1d2327]/70 backdrop-blur-[2px]">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white w-full max-w-lg shadow-2xl rounded-sm overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-[#1d2327] text-white">
                <div>
                  <h2 className="text-lg font-bold">New Guest Booking</h2>
                  {preselectedRoom && (
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Preselected: Room {preselectedRoom.number} · {preselectedRoom.type} · KES {preselectedRoom.price?.toLocaleString()}/night
                    </p>
                  )}
                </div>
                <button onClick={() => { setBookingModal(false); setFormError(''); }} className="p-1.5 hover:bg-white/10 rounded-sm">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Error banner */}
                {formError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-sm text-red-700 text-xs font-bold">
                    <AlertCircle size={14} className="shrink-0" />
                    {formError}
                  </div>
                )}

                {/* Guest name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#646970] uppercase">Guest Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      name="guestName" required autoFocus
                      className="w-full pl-9 pr-3 py-2.5 border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-sm rounded-sm"
                      placeholder="e.g. John Kamau"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#646970] uppercase">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      name="guestPhone"
                      className="w-full pl-9 pr-3 py-2.5 border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-sm rounded-sm"
                      placeholder="07xxxxxxxx"
                    />
                  </div>
                </div>

                {/* Room selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#646970] uppercase">Select Room *</label>
                  <div className="relative">
                    <select
                      name="roomId" required
                      defaultValue={preselectedRoom?.id || ''}
                      className="w-full pl-3 pr-8 py-2.5 border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-sm rounded-sm appearance-none bg-white"
                    >
                      <option value="">— Choose available room —</option>
                      {rooms
                        .filter((r: any) => r.status === 'AVAILABLE')
                        .map((r: any) => (
                          <option key={r.id} value={r.id}>
                            Room {r.number} · {r.type} · KES {r.price?.toLocaleString()}/night
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                  {rooms.filter((r: any) => r.status === 'AVAILABLE').length === 0 && (
                    <p className="text-[10px] text-red-500 font-bold">⚠ No available rooms right now</p>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#646970] uppercase">Check-In Date *</label>
                    <input
                      name="checkIn" type="date" required
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full px-3 py-2.5 border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-sm rounded-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#646970] uppercase">Check-Out Date *</label>
                    <input
                      name="checkOut" type="date" required
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full px-3 py-2.5 border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-sm rounded-sm"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#646970] uppercase">Notes / Special Requests</label>
                  <textarea
                    name="notes" rows={2}
                    className="w-full px-3 py-2 border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-sm rounded-sm resize-none"
                    placeholder="Any special requests or dietary needs…"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2 border-t border-[#f0f0f1]">
                  <button
                    type="button"
                    onClick={() => { setBookingModal(false); setFormError(''); }}
                    className="flex-1 py-2.5 text-xs font-bold text-[#646970] hover:bg-[#f6f7f7] border border-[#dcdcde] rounded-sm"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex-1 bg-[#2271b1] hover:bg-[#135e96] text-white py-2.5 text-xs font-bold rounded-sm disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                  >
                    {createMutation.isPending ? (
                      <><span className="animate-spin inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full" /> SAVING…</>
                    ) : (
                      <><CheckCircle2 size={14} /> CONFIRM BOOKING</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* M-PESA LOGIC FOR RECEPTIONIST */}
      <AnimatePresence>
        {showMpesaModal && selectedBookingForPay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowMpesaModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 bg-gradient-to-r from-[#4caf50] to-[#2e7d32] text-white">
                <div className="flex items-center gap-3 mb-2">
                  <Smartphone size={24} />
                  <h3 className="text-lg font-black">M-Pesa Checkout</h3>
                </div>
                <p className="text-sm text-green-100">Booking: {selectedBookingForPay.guestName}</p>
              </div>
              
              <div className="p-6 space-y-5">
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-green-700 font-medium">Balance</span>
                    <span className="text-green-900 font-black text-lg">
                      KES {Math.max(0, selectedBookingForPay.totalAmount - (selectedBookingForPay.payments?.filter((p: any) => p.status === 'COMPLETED').reduce((acc: any, p: any) => acc + p.amount, 0) || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Safaricom Phone Number
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-2.5 bg-slate-100 border border-[#dcdcde] rounded text-sm font-bold text-slate-500">+254</span>
                    <input
                      type="tel"
                      placeholder="7XXXXXXXX"
                      value={mpesaPhone}
                      onChange={e => setMpesaPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      className="flex-1 border border-[#ccd0d4] rounded px-4 py-2.5 text-sm font-medium outline-none focus:border-[#4caf50] focus:ring-2 focus:ring-green-100"
                      autoFocus
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium">
                    Sandbox test number: 254708374149
                  </p>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-[#dcdcde] flex gap-3">
                <button
                  onClick={() => { setShowMpesaModal(false); setMpesaPhone(''); }}
                  className="flex-1 px-4 py-3 border border-[#dcdcde] bg-white text-slate-600 rounded text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={processMpesaPay}
                  disabled={mpesaMutation.isPending || mpesaPhone.length < 9}
                  className="flex-1 px-4 py-3 bg-[#4caf50] hover:bg-[#388e3c] text-white rounded text-xs font-black uppercase tracking-wider shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {mpesaMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Smartphone size={14} /> Send Link
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReceptionistDashboard;
