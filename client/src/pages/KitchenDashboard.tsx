import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { useOrders } from '../hooks/useOrders';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  PlayCircle, 
  AlertCircle,
  Timer,
  Download,
  BarChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { exportToPDF } from '../utils/pdfExport';
import { 
  XAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface OrderItem {
  id: string;
  menuItem: { name: string };
  quantity: number;
}

interface Order {
  id: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED';
  items: OrderItem[];
  table: { number: string };
  waiter: { name: string };
  createdAt: string;
}

const KitchenDashboard = () => {
  const { socket } = useSocket();
  const { fetchOrders, updateOrderStatus } = useOrders();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'analytics' | 'inventory'>('queue');

  const { data: initialOrders, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: () => fetchOrders('ALL').then((data: any) => data.filter((o: Order) => ['PENDING', 'PREPARING', 'READY', 'PAID'].includes(o.status))),
    refetchInterval: 10000
  });

  const { data: analytics } = useQuery({
    queryKey: ['kitchen-analytics'],
    queryFn: () => api.get('/kitchen/analytics').then(res => res.data),
    enabled: activeTab === 'analytics',
    refetchInterval: 60000
  });

  const { data: inventory } = useQuery({
    queryKey: ['kitchen-inventory'],
    queryFn: () => api.get('/inventory').then(res => res.data),
    enabled: activeTab === 'inventory' || activeTab === 'queue',
    refetchInterval: 30000
  });

  useEffect(() => {
    if (initialOrders) {
      setOrders(prev => {
        // Only update if the order count/ids changed significantly or it's first load
        const diff = initialOrders.filter((o: any) => !prev.find(p => p.id === o.id)).length > 0;
        if (prev.length === 0 || diff) return initialOrders;
        // Map individual status updates if they changed in the fetch
        return initialOrders; 
      });
    }
  }, [initialOrders]);

  useEffect(() => {
    if (socket) {
      socket.on('new_order', (newOrder: Order) => {
        setOrders(prev => {
          if (prev.find(o => o.id === newOrder.id)) return prev;
          return [newOrder, ...prev];
        });
        
        // Sound notification
        const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
        audio.play().catch(() => console.log('Autoplay blocked'));
      });

      socket.on('order_status_update', (updatedOrder: Order) => {
        setOrders(prev => {
          if (updatedOrder.status === 'SERVED') {
            return prev.filter(o => o.id !== updatedOrder.id);
          }
          return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
        });
      });
    }

    return () => {
      socket?.off('new_order');
      socket?.off('order_status_update');
    };
  }, [socket]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateOrderStatus({ id, status });
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-red-50 text-[#d63638] border-[#d63638]';
      case 'PREPARING': return 'bg-blue-50 text-[#2271b1] border-[#2271b1]';
      case 'READY': return 'bg-emerald-50 text-emerald-700 border-emerald-600';
      default: return 'bg-slate-50 text-slate-500 border-slate-300';
    }
  };

  const isInitialLoading = isOrdersLoading && orders.length === 0;

  if (isInitialLoading) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] gap-4">
      <div className="w-10 h-10 border-4 border-[#2271b1] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-bold text-[#646970] uppercase tracking-widest">Warming up the stove...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#dcdcde] pb-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4 py-4">
            <div className="p-2 bg-[#2271b1] text-white">
              <ChefHat size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1d2327]">Kitchen Hub</h1>
              <p className="text-xs text-[#646970] font-medium tracking-tight">Enterprise Culinary Management</p>
            </div>
          </div>
          
          <nav className="flex items-center h-full gap-1 pt-4 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {[
              { id: 'queue', label: 'Live Queue', icon: Clock },
              { id: 'analytics', label: 'Analytics', icon: BarChart },
              { id: 'inventory', label: 'Inventory', icon: AlertCircle },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all ${
                  activeTab === tab.id 
                  ? 'border-[#2271b1] text-[#2271b1] bg-blue-50/50' 
                  : 'border-transparent text-[#646970] hover:text-[#1d2327] hover:bg-slate-50'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 pb-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#dcdcde] shadow-sm rounded-sm">
            <Timer size={14} className="text-[#2271b1]" />
            <span className="text-xs font-bold text-[#1d2327] uppercase tracking-tighter">
              {activeTab === 'queue' ? `${orders.length} ACTIVE` : 'STATION ONLINE'}
            </span>
          </div>
          {activeTab === 'analytics' && (
            <button 
              onClick={() => {
                const data = analytics?.topItems?.map((item: any) => [item.name, item.count.toString()]) || [];
                exportToPDF('Kitchen Performance Report', ['Menu Item', 'Quantity Prepared'], data, 'kitchen_analytics');
              }}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white rounded-sm font-bold text-xs transition-all shadow-sm uppercase tracking-wider"
            >
              <Download size={14} />
              DOWNLOAD PDF
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'queue' && (
          <motion.div 
            key="queue"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
        <AnimatePresence>
          {orders.map((order) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              key={order.id}
              className="bg-white border border-[#dcdcde] rounded-sm overflow-hidden flex flex-col shadow-sm transition-all hover:border-[#2271b1]/50"
            >
              {/* Header */}
              <div className="p-4 bg-[#f6f7f7] border-b border-[#dcdcde] flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-[#1d2327]">Table {order.table.number}</h3>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[#646970] uppercase mt-0.5">
                    <Clock size={10} />
                    <span>{formatDistanceToNow(new Date(order.createdAt))} ago</span>
                  </div>
                </div>
                <div className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                  {order.status}
                </div>
              </div>

              {/* Items */}
              <div className="flex-1 p-4 space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 border border-[#dcdcde] bg-white flex items-center justify-center font-bold text-xs text-[#1d2327]">
                        {item.quantity}
                      </div>
                      <span className="font-bold text-base text-[#1d2327]">{item.menuItem.name}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="p-4 bg-[#f6f7f7] border-t border-[#dcdcde] gap-2 grid grid-cols-2">
                {order.status === 'PENDING' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                    className="col-span-2 py-3 md:py-2.5 bg-[#2271b1] hover:bg-[#135e96] text-white flex items-center justify-center gap-2 font-bold text-sm md:text-xs shadow-sm transition-all active:scale-[0.98]"
                  >
                    <PlayCircle size={14} />
                    START PREPARING
                  </button>
                )}
                {order.status === 'PREPARING' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'READY')}
                      className="col-span-2 py-3 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 font-bold text-sm md:text-xs shadow-sm transition-all active:scale-[0.98]"
                    >
                      <CheckCircle2 size={14} />
                      MARK AS READY
                    </button>
                  </>
                )}
                {order.status === 'READY' && (
                  <div className="col-span-2 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center gap-2 font-bold text-xs italic">
                    <AlertCircle size={14} />
                    WAITING FOR SERVICE
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

          {orders.length === 0 && (
            <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-300 space-y-3 opacity-50">
              <ChefHat size={48} strokeWidth={1} />
              <p className="text-sm font-bold uppercase tracking-widest">Kitchen Queue Empty</p>
            </div>
          )}
        </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div 
            key="analytics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Completed Today', value: analytics?.summary?.completedToday || 0, icon: CheckCircle2, color: 'text-emerald-600' },
                { label: 'Active Orders', value: analytics?.summary?.activeNow || 0, icon: Clock, color: 'text-blue-600' },
                { label: 'Base Efficiency', value: analytics?.summary?.efficiency || '0%', icon: Timer, color: 'text-purple-600' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 border border-[#dcdcde] rounded-sm shadow-sm">
                  <div className="flex items-center justify-between">
                    <stat.icon size={20} className={stat.color} />
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Live Static</span>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-3xl font-black text-[#1d2327]">{stat.value}</h4>
                    <p className="text-[10px] font-bold text-[#646970] uppercase tracking-widest mt-1">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 border border-[#dcdcde] rounded-sm shadow-sm h-[400px] flex flex-col">
                <h3 className="text-sm font-black text-[#1d2327] uppercase tracking-widest mb-8">Hourly Preparation Volume</h3>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics?.hourlyData || []}>
                      <defs>
                        <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2271b1" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#2271b1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f1" />
                      <XAxis dataKey="hour" fontSize={10} fontStyle="bold" axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '0px', border: '1px solid #dcdcde', fontWeight: 'bold', fontSize: '12px' }} />
                      <Area type="monotone" dataKey="orders" stroke="#2271b1" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 border border-[#dcdcde] rounded-sm shadow-sm h-[400px] flex flex-col">
                <h3 className="text-sm font-black text-[#1d2327] uppercase tracking-widest mb-8">Top Selling Menu Items</h3>
                <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                  {analytics?.topItems?.map((item: any, i: number) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                        <span>{item.name}</span>
                        <span className="text-[#2271b1]">{item.count} Prepared</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.count / (analytics.topItems[0].count || 1)) * 100}%` }}
                          className="bg-[#2271b1] h-full"
                        />
                      </div>
                    </div>
                  ))}
                  {(!analytics?.topItems || analytics.topItems.length === 0) && (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase">No data for today yet</div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'inventory' && (
          <motion.div 
            key="inventory"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="bg-white border border-[#dcdcde] rounded-sm shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#f6f7f7] border-b border-[#dcdcde]">
                    <th className="px-6 py-4 text-[10px] font-black text-[#646970] uppercase tracking-widest">Item Name</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[#646970] uppercase tracking-widest text-center">Allocated Stock</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[#646970] uppercase tracking-widest text-center">Current Stock</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[#646970] uppercase tracking-widest text-center">Usage Rate</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[#646970] uppercase tracking-widest text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dcdcde]">
                  {inventory?.map((inv: any) => {
                    const usage = inv.allocated > 0 ? ((inv.allocated - inv.stock) / inv.allocated) * 100 : 0;
                    const isLow = inv.stock <= inv.minStock;
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-[#1d2327]">{inv.menuItem.name}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-black text-slate-400">{inv.allocated} {inv.unit}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-sm font-black ${isLow ? 'text-red-600' : 'text-[#2271b1]'}`}>
                            {inv.stock} {inv.unit}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 justify-center">
                             <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-slate-300 h-full" style={{ width: `${usage}%` }} />
                             </div>
                             <span className="text-[10px] font-black text-slate-400 w-8">{Math.round(usage)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-sm ${
                            inv.stock === 0 ? 'bg-red-100 text-red-700' : 
                            isLow ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {inv.stock === 0 ? 'Out of Stock' : isLow ? 'Low Stock' : 'Good'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {(!inventory || inventory.length === 0) && (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <p className="text-xs font-black uppercase tracking-widest">No inventory items tracked yet</p>
                <p className="text-[10px] font-bold">Managers can link menu items to inventory from the dashboard.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KitchenDashboard;
