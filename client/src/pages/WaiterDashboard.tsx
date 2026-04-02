import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { useOrders, useMenu } from '../hooks/useOrders';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import DutyRoster from './DutyRoster';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  CalendarDays, 
  MessageSquare, 
  History, 
  CreditCard, 
  Settings,
  Search,
  Bell,
  ChevronDown,
  Plus,
  Minus,
  X,
  CreditCard as CardIcon,
  Wallet,
  Banknote,
  ShoppingBag,
  Clock,
  TrendingUp,
  DollarSign,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Download,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isToday, isYesterday, isThisWeek } from 'date-fns';
import { exportToPDF } from '../utils/pdfExport';

const SERVER_URL = 'http://localhost:5000';

const CATEGORY_ICONS: Record<string, string> = {
  'Donuts': '🍩',
  'Burger': '🍔',
  'Ice': '🍦',
  'Potato': '🍟',
  'Pizza': '🍕',
  'Hot dog': '🌭',
  'Chicken': '🍗',
  'Drinks': '🥤',
  'Default': '🍴'
};

type PaymentMethod = 'CASH' | 'MPESA' | 'CARD' | 'CHEQUE' | null;

const WaiterDashboard = () => {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState<'dashboard' | 'menu' | 'roster' | 'messages' | 'history' | 'payments' | 'settings'>('menu');
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'All' | 'Today' | 'Yesterday' | 'This Week'>('All');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>(null);
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [lastAddedItem, setLastAddedItem] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { createOrder, fetchTables, confirmPayment, revertPayment } = useOrders();
  const { fetchCategories } = useMenu();

  // Queries
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const { data: tables } = useQuery({ queryKey: ['tables'], queryFn: fetchTables });
  
  const { data: myOrders } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.get('/orders/my').then(res => res.data),
    enabled: true
  });

  const { data: messages } = useQuery({ 
    queryKey: ['messages'], 
    queryFn: () => api.get('/messages').then(res => res.data),
    enabled: activeView === 'messages'
  });

  // M-Pesa STK Push mutation
  const mpesaMutation = useMutation({
    mutationFn: (data: { orderId: string, phoneNumber: string, amount: number }) =>
      api.post('/payments/mpesa/initiate', data),
    onSuccess: () => {
      setShowMpesaModal(false);
      setMpesaPhone('');
    }
  });

  useEffect(() => {
    if (socket) {
      const handleUpdate = () => {
        queryClient.invalidateQueries({ queryKey: ['my-orders'] });
        queryClient.invalidateQueries({ queryKey: ['tables'] });
        queryClient.invalidateQueries({ queryKey: ['messages'] });
      };
      socket.on('order_status_update', handleUpdate);
      socket.on('new_broadcast_message', handleUpdate);
      socket.on('payment_completed', handleUpdate);
      socket.on('payment_failed', (data: any) => {
        alert(`M-Pesa payment failed: ${data.reason || 'Unknown error'}`);
        handleUpdate();
      });
      return () => { 
        socket.off('order_status_update', handleUpdate);
        socket.off('new_broadcast_message', handleUpdate);
        socket.off('payment_completed', handleUpdate);
        socket.off('payment_failed');
      };
    }
  }, [socket, queryClient]);

  const getCurrentDisplayData = () => {
    if (activeCategory) {
       const cat = (categories as any[])?.find(c => c.id === activeCategory);
       return cat?.items || [];
    }
    return (categories as any[])?.flatMap(c => c.items || []) || [];
  };

  const filteredItems = getCurrentDisplayData().filter((item: any) => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMessages = messages?.filter((msg: any) => {
    if (dateFilter === 'All') return true;
    const date = parseISO(msg.createdAt);
    if (dateFilter === 'Today') return isToday(date);
    if (dateFilter === 'Yesterday') return isYesterday(date);
    if (dateFilter === 'This Week') return isThisWeek(date);
    return true;
  });

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
    
    // Feedback and UI updates
    setLastAddedItem(item.name);
    setIsTrayOpen(true);
    setTimeout(() => setLastAddedItem(null), 2000);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => 
      i.id === itemId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
    ));
  };

  const subTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tax = subTotal * 0.05;
  const total = subTotal + tax;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    if (!selectedPayment) {
      alert('Please select a payment method before placing the order.');
      return;
    }

    // If M-Pesa, show phone modal first
    if (selectedPayment === 'MPESA') {
      setShowMpesaModal(true);
      return;
    }

    await processOrder();
  };

  const processOrder = async (mpesaPhoneNumber?: string) => {
    if (!selectedTableId) {
      alert('Please select a table.');
      return;
    }

    setIsProcessingOrder(true);

    try {
      // 1. Create the order
      const order = await createOrder({
        tableId: selectedTableId,
        items: cart.map(i => ({ 
          menuItemId: i.id, 
          quantity: i.quantity,
          price: i.price
        }))
      });

      // 2. Process payment
      if (selectedPayment === 'MPESA' && mpesaPhoneNumber) {
        // Initiate STK Push
        await mpesaMutation.mutateAsync({
          orderId: order.id,
          phoneNumber: mpesaPhoneNumber,
          amount: Math.round(total)
        });
      } else {
        // For CASH, CARD, WALLET - confirm payment immediately
        await confirmPayment({
          id: order.id,
          method: selectedPayment!
        });
      }

      setCart([]);
      setSelectedPayment(null);
      setSelectedTableId('');
      setShowMpesaModal(false);
      setMpesaPhone('');
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const handleRevertPayment = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to mark this order as UNPAID? This will re-occupy the table.')) return;
    try {
      await revertPayment(orderId);
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to revert payment.');
    }
  };

  const handleQuickSettle = async (orderId: string) => {
    const method = window.prompt('Enter payment method (CASH, MPESA, CARD, CHEQUE):', 'CASH');
    if (!method) return;
    
    if (['CASH', 'MPESA', 'CARD', 'CHEQUE'].includes(method.toUpperCase())) {
      try {
        await confirmPayment({ id: orderId, method: method.toUpperCase() });
        queryClient.invalidateQueries({ queryKey: ['my-orders'] });
        queryClient.invalidateQueries({ queryKey: ['tables'] });
      } catch (err) {
        alert('Failed to settle order.');
      }
    } else {
      alert('Invalid payment method.');
    }
  };

  const PAYMENT_METHODS = [
    { id: 'CASH' as PaymentMethod, label: 'Cash', icon: Banknote, color: 'emerald' },
    { id: 'MPESA' as PaymentMethod, label: 'M-Pesa', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Mpesa.svg/1200px-Mpesa.svg.png', color: 'green' },
    { id: 'CARD' as PaymentMethod, label: 'Card', icon: CardIcon, color: 'blue' },
    { id: 'CHEQUE' as PaymentMethod, label: 'Cheque', icon: Wallet, color: 'purple' },
  ];

  return (
    <div className="fixed inset-0 flex bg-[#f0f0f1] text-[#1d2327] antialiased font-sans overflow-hidden">
      {/* MOBILE SIDEBAR OVERLAY */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-[40] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR NAVIGATION */}
      <aside className={`fixed inset-y-0 left-0 z-[45] w-[260px] bg-[#1d2327] flex flex-col pt-8 shrink-0 transition-transform duration-300 lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-6 mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#2271b1] rounded flex items-center justify-center text-white">
              <UtensilsCrossed size={20} />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">RestoPOS</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} title="Close Sidebar" className="lg:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'menu', icon: UtensilsCrossed, label: 'Food Order' },
            { id: 'messages', icon: MessageSquare, label: 'Messages' },
            { id: 'history', icon: History, label: 'Order History' },
            { id: 'roster', icon: CalendarDays, label: 'Duty Roster' },
            { id: 'payments', icon: CreditCard, label: 'Payments' },
            { id: 'settings', icon: Settings, label: 'Customization' },
          ].map((item: any) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-6 py-3.5 transition-all font-medium text-[13.5px] border-l-4 ${
                activeView === item.id 
                ? 'bg-[#2271b1] text-white border-white' 
                : 'text-slate-400 border-transparent hover:bg-[#2c3338] hover:text-[#72aee6]'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
           <button 
             onClick={logout}
             className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 text-sm font-medium transition-colors"
           >
             <LogOut size={18} /> Logout
           </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* HEADER */}
        <header className="h-[60px] bg-white border-b border-[#dcdcde] flex items-center justify-between px-4 lg:px-8 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 lg:hidden text-slate-600 hover:bg-slate-50 rounded-md"
              title="Open Sidebar"
            >
              <ChevronDown size={20} className="rotate-90" />
            </button>
            <h1 className="font-black text-sm lg:text-lg uppercase tracking-widest text-[#1d2327] truncate">
              {activeView === 'menu' ? 'Menu' : activeView.toUpperCase()}
            </h1>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <button 
              onClick={() => setIsTrayOpen(true)}
              className="relative p-2 lg:hidden text-[#2271b1] bg-blue-50 rounded-md"
              title="View Tray"
            >
              <ShoppingBag size={20} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#d63638] text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {cart.length}
                </span>
              )}
            </button>

            <div className="relative group hidden sm:block">
              <Bell size={20} className="text-slate-400 group-hover:text-[#2271b1] transition-colors cursor-pointer" />
              <span className="w-2 h-2 bg-[#d63638] rounded-full absolute -top-0.5 -right-0.5 border border-white" />
            </div>
            
            <div className="flex items-center gap-2 lg:gap-3 lg:pl-6 lg:border-l lg:border-[#dcdcde]">
              <div className="text-right hidden xs:block">
                <p className="text-[12px] font-bold text-[#1d2327] leading-none mb-0.5 truncate max-w-[80px]">{user?.name?.split(' ')[0] || 'Waiter'}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{user?.role || 'Staff'}</p>
              </div>
              <img src={`https://ui-avatars.com/api/?name=${user?.name || 'W'}&background=2271b1&color=fff`} className="w-8 h-8 rounded shrink-0" alt="profile" />
            </div>
          </div>
        </header>

        {/* FEEDBACK TOAST */}
        <AnimatePresence>
          {lastAddedItem && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-20 right-8 z-[100] bg-[#2271b1] text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 border border-white/20"
            >
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <Plus size={14} className="text-white" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest">{lastAddedItem} Added to Tray</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VIEWS */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          {activeView === 'menu' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* CATEGORIES BAR */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Quick Filters</h2>
                   <div className="relative w-64">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                     <input 
                      type="text" 
                      placeholder="Find a dish..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-white border border-[#ccd0d4] rounded-md pl-9 pr-4 py-1.5 text-xs outline-none focus:border-[#2271b1]"
                     />
                   </div>
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-4 scrollbar-none">
                   <button 
                     onClick={() => setActiveCategory(null)}
                     className={`px-6 py-2.5 rounded shadow-sm border transition-all shrink-0 font-bold text-xs uppercase tracking-widest ${!activeCategory ? 'bg-[#2271b1] border-[#2271b1] text-white' : 'bg-white border-[#ccd0d4] text-slate-600 hover:border-[#2271b1]'}`}
                   >
                     All Items
                   </button>
                   {categories?.map((cat: any) => (
                     <button
                       key={cat.id}
                       onClick={() => setActiveCategory(cat.id)}
                       className={`flex items-center gap-2.5 px-6 py-2.5 rounded shadow-sm border transition-all shrink-0 font-bold text-xs uppercase tracking-widest ${activeCategory === cat.id ? 'bg-[#2271b1] border-[#2271b1] text-white' : 'bg-white border-[#ccd0d4] text-slate-600 hover:border-[#2271b1]'}`}
                     >
                       <span>{CATEGORY_ICONS[cat.name] || CATEGORY_ICONS['Default']}</span>
                       {cat.name}
                     </button>
                   ))}
                </div>
              </div>

              {/* ITEM GRID */}
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                {filteredItems?.map((item: any) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-lg border border-[#dcdcde] overflow-hidden hover:border-[#2271b1] transition-all shadow-sm hover:shadow-md group flex flex-col"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                       <img 
                        src={item.image ? (item.image.startsWith('http') ? item.image : `${SERVER_URL}${item.image}`) : 'https://placehold.co/400x250?text=Food'} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        alt={item.name} 
                       />
                       <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded shadow text-[10px] font-black text-[#2271b1] uppercase">
                          KES {item.price}
                       </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="mb-4">
                        <h3 className="font-bold text-sm lg:text-base text-[#1d2327] mb-1 line-clamp-2">{item.name}</h3>
                        <p className="text-[11px] lg:text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {item.description || 'Delicious freshly prepared dish.'}
                        </p>
                      </div>
                      <button 
                        onClick={() => addToCart(item)} 
                        className="w-full bg-[#2271b1] hover:bg-[#135e96] active:scale-95 text-white py-3.5 lg:py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Plus size={16} /> Add to Tray
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'dashboard' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Active Orders', value: tables?.filter((t: any) => t.status !== 'AVAILABLE')?.length || 0, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Sales Today', value: `KES ${myOrders?.filter((o:any)=>o.status === 'PAID' && isToday(parseISO(o.createdAt))).reduce((a:any,c:any)=>a+Number(c.totalAmount),0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Completed', value: myOrders?.filter((o:any)=>o.status === 'PAID' && isToday(parseISO(o.createdAt))).length || 0, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
                  ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 border border-[#dcdcde] rounded shadow-sm flex items-center gap-5">
                       <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded flex items-center justify-center`}>
                          <stat.icon size={24} />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                          <p className="text-xl font-bold text-[#1d2327]">{stat.value}</p>
                       </div>
                    </div>
                  ))}
               </div>

               <div className="bg-white border border-[#dcdcde] rounded shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-[#dcdcde] bg-slate-50 flex justify-between items-center">
                     <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Recent Activity</h3>
                     <button onClick={() => setActiveView('history')} className="text-[10px] font-bold text-[#2271b1] hover:underline">View All History</button>
                  </div>
                  <div className="divide-y divide-[#f0f0f1]">
                     {myOrders?.slice(0, 5).map((order: any) => (
                       <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-xs font-bold">
                                #{order.id.slice(-4).toUpperCase()}
                             </div>
                             <div>
                                <p className="text-sm font-bold text-[#1d2327]">Table {order.table.number}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{format(parseISO(order.createdAt), 'HH:mm aaa')}</p>
                             </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${order.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                             {order.status}
                          </span>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {activeView === 'messages' && (
            <div className="bg-white border border-[#dcdcde] rounded shadow-sm h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
               <div className="p-6 border-b border-[#dcdcde] bg-slate-50 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest">Team Communication</h2>
                    <p className="text-[11px] text-slate-400 font-medium">Broadcasts and notifications from management</p>
                  </div>
                  <div className="flex bg-white border border-[#dcdcde] rounded shadow-sm overflow-hidden">
                     {['All', 'Today', 'Yesterday', 'This Week'].map(f => (
                       <button
                         key={f}
                         onClick={() => setDateFilter(f as any)}
                         className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-tighter transition-all ${dateFilter === f ? 'bg-[#2271b1] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                       >
                         {f}
                       </button>
                     ))}
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto divide-y divide-[#f0f0f1]">
                  {filteredMessages?.map((msg: any) => (
                    <div key={msg.id} className="p-6 hover:bg-slate-50 transition-colors group">
                       <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 bg-[#2271b1] text-white rounded flex items-center justify-center font-bold text-xs">
                                {msg.sender.name[0]}
                             </div>
                             <div>
                                <p className="text-xs font-black text-[#1d2327]">{msg.sender.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{msg.sender.role.name}</p>
                             </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">{format(parseISO(msg.createdAt), 'MMM d, HH:mm')}</span>
                       </div>
                       <p className="text-sm text-slate-600 leading-relaxed pl-11">
                          {msg.content}
                       </p>
                    </div>
                  ))}
                  {filteredMessages?.length === 0 && (
                    <div className="p-20 text-center text-slate-400">
                       <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                       <p className="text-xs font-black uppercase tracking-widest">No messages found</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeView === 'history' && (
            <div className="bg-white border border-[#dcdcde] rounded shadow-sm overflow-hidden animate-in fade-in duration-500">
               <div className="p-4 border-b border-[#dcdcde] bg-slate-50">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">All Served Orders</h3>
               </div>
               <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#dcdcde] text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       <th className="px-6 py-4">Order ID</th>
                       <th className="px-6 py-4">Table</th>
                       <th className="px-6 py-4">Time</th>
                       <th className="px-6 py-4">Total</th>
                       <th className="px-6 py-4">Status</th>
                       <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f1]">
                     {myOrders?.map((order: any) => (
                       <tr key={order.id} className="hover:bg-slate-50 transition-colors text-sm">
                          <td className="px-6 py-4 font-mono text-xs text-slate-600">#{order.id.slice(0, 8).toUpperCase()}</td>
                          <td className="px-6 py-4 font-bold">Table {order.table.number}</td>
                          <td className="px-6 py-4 text-slate-400 text-xs">{format(parseISO(order.createdAt), 'MMM d, hh:mm aaa')}</td>
                          <td className="px-6 py-4 font-black text-[#2271b1]">KES {Number(order.totalAmount).toLocaleString()}</td>
                          <td className="px-6 py-4">
                             <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${order.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-[#2271b1]'}`}>
                                {order.status}
                             </span>
                          </td>
                          <td className="px-6 py-4">
                             <button onClick={() => setActiveView('payments')} className="text-[#2271b1] hover:underline font-bold text-xs uppercase">Settle</button>
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          )}

          {activeView === 'payments' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {[
                   { label: 'Unpaid Orders', value: myOrders?.filter((o:any)=>o.status !== 'PAID').length || 0, color: 'text-orange-600', icon: Clock },
                   { label: 'Total Settled Today', value: `KES ${myOrders?.filter((o:any)=>o.status === 'PAID' && isToday(parseISO(o.createdAt))).reduce((a:any,c:any)=>a+Number(c.totalAmount),0).toLocaleString()}`, color: 'text-[#2271b1]', icon: CreditCard },
                   { label: 'Pending Payment', value: `KES ${myOrders?.filter((o:any)=>o.status !== 'PAID').reduce((a:any,c:any)=>a+Number(c.totalAmount),0).toLocaleString()}`, color: 'text-slate-400', icon: Banknote },
                 ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 border border-[#dcdcde] rounded shadow-sm">
                       <stat.icon className={`mb-4 ${stat.color}`} size={24} />
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                       <p className="text-xl font-bold text-[#1d2327]">{stat.value}</p>
                    </div>
                 ))}
               </div>
               
               <div className="bg-white border border-orange-200 rounded shadow-sm overflow-hidden ring-1 ring-orange-100">
                  <div className="p-4 border-b border-orange-100 bg-orange-50 flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-widest text-orange-700 flex items-center gap-2">
                       <AlertCircle size={14} /> Pending Settlements
                    </h3>
                  </div>
                  <div className="divide-y divide-orange-50">
                    {myOrders?.filter((o:any) => o.status !== 'PAID').map((order: any) => (
                      <div key={order.id} className="p-4 flex items-center justify-between hover:bg-orange-50/30 transition-colors">
                        <div className="flex items-center gap-4">
                           <Clock className="text-orange-400" size={20} />
                           <div>
                              <p className="text-sm font-bold text-[#1d2327]">Order #{order.id.slice(-4).toUpperCase()}</p>
                              <p className="text-[10px] text-slate-400">Table {order.table.number} · {format(parseISO(order.createdAt), 'HH:mm aaa')}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="text-right mr-4">
                              <p className="text-sm font-black text-orange-600">KES {Number(order.totalAmount).toLocaleString()}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{order.status}</p>
                           </div>
                           <button 
                             onClick={() => handleQuickSettle(order.id)}
                             className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-black uppercase tracking-widest transition-all"
                           >
                             Settle
                           </button>
                        </div>
                      </div>
                    ))}
                    {myOrders?.filter((o:any) => o.status !== 'PAID').length === 0 && (
                      <div className="p-12 text-center text-slate-400 italic text-xs">All orders have been settled. Great job!</div>
                    )}
                  </div>
               </div>
               
               <div className="bg-white border border-[#dcdcde] rounded shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-[#dcdcde] bg-slate-50 flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Recent Settled Orders</h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          if (!myOrders) return;
                          
                          const todayOrders = myOrders.filter((o: any) => o.status === 'PAID' && isToday(parseISO(o.createdAt)));
                          
                          if (todayOrders.length === 0) {
                            alert('No settled orders to export for today.');
                            return;
                          }

                          const headers = ['Order ID', 'Table', 'Time', 'Total (KES)', 'Status'];
                          const data = todayOrders.map((o: any) => [
                            o.id.slice(-6).toUpperCase(),
                            `Table ${o.table.number}`,
                            format(parseISO(o.createdAt), 'HH:mm aaa'),
                            Number(o.totalAmount).toLocaleString(),
                            o.status
                          ]);

                          const totalRevenue = todayOrders.reduce((acc: number, o: any) => acc + Number(o.totalAmount), 0);
                          data.push(['---', '---', '---', '---', '---']);
                          data.push(['TOTAL REVENUE', '', '', `KES ${totalRevenue.toLocaleString()}`, '']);

                          exportToPDF(`Daily Sales Report - ${user?.name}`, headers, data, `waiter_sales_${user?.name?.toLowerCase().replace(/\s/g, '_')}`);
                        }}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white rounded text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                      >
                        <Download size={14} />
                        Export Sales
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-[#f0f0f1]">
                    {myOrders?.filter((o:any) => o.status === 'PAID').slice(0, 10).map((order: any) => (
                      <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                        <div className="flex items-center gap-4">
                           <CheckCircle2 className="text-emerald-500" size={20} />
                           <div>
                              <p className="text-sm font-bold text-[#1d2327]">Order #{order.id.slice(-4).toUpperCase()} Settled</p>
                              <p className="text-[10px] text-slate-400">Table {order.table.number} · {format(parseISO(order.createdAt), 'MMM d, hh:mm aaa')}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="text-right">
                              <p className="text-sm font-black text-emerald-600">KES {Number(order.totalAmount).toLocaleString()}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Paid</p>
                           </div>
                           <button 
                             onClick={() => handleRevertPayment(order.id)}
                             title="Mark as Unpaid"
                             className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                           >
                             <RefreshCw size={16} />
                           </button>
                        </div>
                      </div>
                    ))}
                    {myOrders?.filter((o:any) => o.status === 'PAID').length === 0 && (
                      <div className="p-20 text-center text-slate-400 italic text-xs">No paid orders recorded yet today.</div>
                    )}
                  </div>
               </div>
            </div>
          )}

          {activeView === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-top-2 duration-500">
               <div className="bg-white border border-[#dcdcde] rounded shadow-sm overflow-hidden">
                  <div className="p-8 bg-[#2271b1] text-white flex items-center gap-6">
                     <img src={`https://ui-avatars.com/api/?name=${user?.name || 'W'}&size=128&background=fff&color=2271b1`} className="w-20 h-20 rounded shadow-xl border-4 border-white/20" alt="avatar" />
                     <div>
                        <h2 className="text-2xl font-black">{user?.name}</h2>
                        <p className="text-blue-100 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">{user?.role} · Restaurant Staff</p>
                     </div>
                  </div>
                  <div className="p-8 space-y-8">
                     <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</label>
                           <input type="text" readOnly value={user?.name} className="w-full bg-slate-50 border border-[#dcdcde] rounded px-4 py-2.5 text-sm font-medium outline-none" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Employee ID</label>
                           <input type="text" readOnly value={`ID-${user?.id.slice(-6).toUpperCase()}`} className="w-full bg-slate-50 border border-[#dcdcde] rounded px-4 py-2.5 text-sm font-medium outline-none" />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Preferences</label>
                        <div className="flex gap-4">
                           <button className="flex-1 px-4 py-4 border-2 border-[#2271b1] bg-blue-50 text-[#2271b1] rounded flex flex-col items-center gap-2 transition-all">
                              <LayoutDashboard size={20} />
                              <span className="text-[10px] font-black uppercase tracking-[0.1em]">Vibrant WP Blue</span>
                           </button>
                           <button className="flex-1 px-4 py-4 border border-[#dcdcde] text-slate-400 rounded flex flex-col items-center gap-2 hover:bg-slate-50 grayscale transition-all opacity-50">
                              <LayoutDashboard size={20} />
                              <span className="text-[10px] font-black uppercase tracking-[0.1em]">Classic Slate</span>
                           </button>
                        </div>
                     </div>
                     <div className="pt-8 border-t border-[#f0f0f1]">
                        <button className="bg-[#2271b1] hover:bg-[#135e96] text-white px-8 py-3 rounded text-xs font-black uppercase tracking-[0.1em] shadow-lg shadow-blue-100 transition-all">
                           Update Profile Settings
                        </button>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeView === 'roster' && (
             <div className="bg-white rounded border border-[#dcdcde] p-8 shadow-sm">
               <DutyRoster />
             </div>
          )}
        </div>
      </main>

      {/* RIGHT SIDEBAR: INVOICE / TRAY (RESPONSIVE) */}
      <AnimatePresence>
        {(isTrayOpen || window.innerWidth >= 1024) && (
          <motion.aside 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto z-[50] w-full sm:w-[380px] bg-white flex flex-col shrink-0 overflow-hidden shadow-2xl lg:static ${isTrayOpen ? 'flex lg:translate-x-0' : 'hidden'}`}
          >
            <div className="p-4 lg:p-6 border-b border-[#f0f0f1] bg-slate-50 flex items-center justify-between">
               <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#1d2327] flex items-center gap-2">
                  <ShoppingBag size={14} className="text-[#2271b1]" />
                  Current Tray
               </h2>
               <button 
                 onClick={() => setIsTrayOpen(false)}
                 className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                 title="Close Tray"
               >
                 <X size={18} />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 custom-scrollbar">
               <AnimatePresence mode="popLayout">
                 {cart.map((item) => (
                   <motion.div 
                     key={item.id}
                     layout
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 transition-colors border border-transparent hover:border-[#f0f0f1]"
                   >
                     <div className="w-12 h-12 lg:w-14 lg:h-14 bg-slate-100 rounded overflow-hidden shrink-0 border border-[#dcdcde]">
                       <img src={item.image ? (item.image.startsWith('http') ? item.image : `${SERVER_URL}${item.image}`) : 'https://placehold.co/100x100'} className="w-full h-full object-cover" alt="" />
                     </div>
                     <div className="flex-1 min-w-0">
                        <h4 className="text-[12px] font-bold text-[#1d2327] truncate mb-0.5">{item.name}</h4>
                        <p className="text-[11px] font-black text-[#2271b1]">KES {item.price.toLocaleString()}</p>
                     </div>
                     <div className="flex items-center gap-2 bg-slate-50 border border-[#dcdcde] rounded-lg p-1">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-[#2271b1] active:bg-blue-50 rounded"><Minus size={14} /></button>
                        <span className="text-sm font-black w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-[#2271b1] active:bg-blue-50 rounded"><Plus size={14} /></button>
                     </div>
                     <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors ml-1"><X size={16} /></button>
                   </motion.div>
                 ))}
               </AnimatePresence>
               {cart.length === 0 && (
                 <div className="text-center py-20">
                    <ShoppingBag size={48} className="mx-auto text-slate-100 mb-4" />
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Selection</p>
                 </div>
               )}
            </div>
    
            <div className="p-4 lg:p-6 bg-slate-50 border-t border-[#dcdcde] space-y-6">
               <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                     <span className="font-bold text-slate-400 uppercase tracking-widest">Sub Total</span>
                     <span className="font-bold text-slate-600">KES {subTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                     <span className="font-bold text-slate-400 uppercase tracking-widest">Tax (5%)</span>
                     <span className="font-bold text-slate-600">KES {tax.toLocaleString()}</span>
                  </div>
                  <div className="pt-3 mt-3 border-t border-[#ccd0d4] flex justify-between items-baseline">
                     <span className="text-xs font-black uppercase text-[#1d2327]">Total Bill</span>
                     <span className="text-lg lg:text-xl font-black text-[#2271b1]">KES {total.toLocaleString()}</span>
                  </div>
               </div>
    
               <div className="space-y-2 pb-4 border-b border-[#ccd0d4]">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex justify-between">
                     Select Table {!selectedTableId && cart.length > 0 && <span className="text-red-500">*</span>}
                  </label>
                  <select 
                    value={selectedTableId}
                    onChange={e => setSelectedTableId(e.target.value)}
                    className="w-full bg-slate-50 border border-[#dcdcde] rounded px-3 py-2.5 text-xs font-bold outline-none focus:border-[#2271b1]"
                  >
                     <option value="">— Choose Table —</option>
                     {tables?.map((t: any) => (
                       <option key={t.id} value={t.id} disabled={t.status !== 'AVAILABLE'}>
                          Table {t.number} {t.status !== 'AVAILABLE' ? `(Occupied)` : ''}
                       </option>
                     ))}
                  </select>
               </div>
    
               <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
                    Select Payment Method {!selectedPayment && cart.length > 0 && <span className="text-red-500">*</span>}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                     {PAYMENT_METHODS.map((method) => (
                       <button 
                        key={method.id} 
                        onClick={() => setSelectedPayment(selectedPayment === method.id ? null : method.id)}
                        className={`flex flex-col items-center justify-center p-3 bg-white border rounded transition-all hover:shadow-sm ${
                          selectedPayment === method.id 
                            ? 'border-[#2271b1] ring-2 ring-[#2271b1]/20 shadow-md bg-blue-50' 
                            : 'border-[#dcdcde] hover:border-[#2271b1]'
                        }`}
                       >
                         {method.img ? (
                           <img src={method.img} className="h-4 object-contain" alt="" />
                         ) : (
                           method.icon && <method.icon className={`transition-colors ${selectedPayment === method.id ? 'text-[#2271b1]' : 'text-slate-400'}`} size={16} />
                         )}
                         <span className={`text-[7px] font-black uppercase mt-1.5 tracking-wider ${selectedPayment === method.id ? 'text-[#2271b1]' : 'text-slate-400'}`}>
                           {method.label}
                         </span>
                         {selectedPayment === method.id && (
                           <motion.div 
                             initial={{ scale: 0 }} 
                             animate={{ scale: 1 }}
                             className="absolute -top-1 -right-1"
                           >
                             <CheckCircle2 size={12} className="text-[#2271b1] fill-blue-50" />
                           </motion.div>
                         )}
                       </button>
                     ))}
                  </div>
               </div>
    
               {/* Success Toast */}
               <AnimatePresence>
                 {orderSuccess && (
                   <motion.div
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0 }}
                     className="bg-emerald-50 border border-emerald-200 rounded p-3 flex items-center gap-3"
                   >
                     <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                     <div>
                       <p className="text-xs font-bold text-emerald-700">Order Placed Successfully!</p>
                       <p className="text-[10px] text-emerald-600">Sent to kitchen & payment recorded.</p>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
    
               <button 
                 disabled={cart.length === 0 || isProcessingOrder || !selectedPayment || !selectedTableId} 
                 onClick={handlePlaceOrder}
                 className="w-full py-4 bg-[#2271b1] hover:bg-[#135e96] text-white rounded font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-200 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-3"
               >
                 {isProcessingOrder ? (
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                 ) : (
                   <>
                     <Plus size={18} />
                     {selectedPayment ? `Pay & Send` : `Select Payment`}
                   </>
                 )}
               </button>
               {!selectedPayment && cart.length > 0 && (
                 <p className="text-[9px] text-center text-red-500/70 font-bold">
                   <AlertCircle size={10} className="inline mr-1" />
                   Please select a payment method above
                 </p>
               )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* M-PESA PHONE NUMBER MODAL */}
      <AnimatePresence>
        {showMpesaModal && (
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
                  <h3 className="text-lg font-black">M-Pesa Payment</h3>
                </div>
                <p className="text-sm text-green-100">Enter the customer's phone number to send an STK push.</p>
              </div>
              
              <div className="p-6 space-y-5">
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700 font-medium">Amount to Pay</span>
                    <span className="text-green-900 font-black">KES {Math.round(total).toLocaleString()}</span>
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
                  className="flex-1 px-4 py-2.5 border border-[#dcdcde] text-slate-600 rounded text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => processOrder(mpesaPhone)}
                  disabled={mpesaPhone.length < 9 || isProcessingOrder}
                  className="flex-1 px-4 py-2.5 bg-[#4caf50] hover:bg-[#2e7d32] text-white rounded text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                >
                  {isProcessingOrder ? (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Smartphone size={14} />
                      Send STK Push
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

export default WaiterDashboard;
