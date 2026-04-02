import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  Utensils, TrendingUp,
  UserCheck, BedDouble, UtensilsCrossed, ArrowUpRight,
  Package, Plus, Pencil, Trash2, Save, X, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#2271b1', '#10b981', '#f59e0b', '#8b5cf6', '#d63638'];

const ManagerDashboard = () => {
  // Restaurant data
  const { data: report }  = useQuery({ queryKey: ['daily-report'],   queryFn: () => api.get('/payments/reports/daily').then(r => r.data) });
  const { data: staff }   = useQuery({ queryKey: ['staff'],           queryFn: () => api.get('/staff').then(r => r.data) });
  const { data: menu }    = useQuery({ queryKey: ['menu-items'],      queryFn: () => api.get('/menu/items').then(r => r.data) });

  // Lodging data
  const { data: lodging } = useQuery({ queryKey: ['lodging-report'],  queryFn: () => api.get('/rooms/report').then(r => r.data) });

  // Inventory data
  const { data: inventory } = useQuery({ 
    queryKey: ['manager-inventory'], 
    queryFn: () => api.get('/inventory').then(r => r.data) 
  });

  const queryClient = useQueryClient();

  // Inventory state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ stock: 0, allocated: 0, minStock: 5, unit: 'pcs' });
  const [addForm, setAddForm] = useState({ menuItemId: '', stock: 0, unit: 'pcs' });

  // Mutations
  const replenishMutation = useMutation({
    mutationFn: (data: { menuItemId: string, amount: number, unit: string, isAllocation: boolean }) =>
      api.post(`/inventory/replenish/${data.menuItemId}`, { amount: data.amount, unit: data.unit, isAllocation: data.isAllocation }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-inventory'] });
      setShowAddModal(false);
      setAddForm({ menuItemId: '', stock: 0, unit: 'pcs' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string, stock: number, allocated: number, minStock: number, unit: string }) =>
      api.patch(`/inventory/${data.id}`, { stock: data.stock, allocated: data.allocated, minStock: data.minStock, unit: data.unit }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-inventory'] });
      setEditingId(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manager-inventory'] })
  });

  const restaurantRevenue = report?.totalRevenue || 0;
  const lodgingRevenue    = lodging?.todayRevenue || 0;
  const totalRevenue      = restaurantRevenue + lodgingRevenue;

  const paymentData  = report?.perMethod  ? Object.entries(report.perMethod).map(([name, value]) => ({ name, value })) : [];
  const waiterData   = report?.perWaiter  ? Object.entries(report.perWaiter).map(([name, value]) => ({ name, value })) : [];
  const lodgingTypes = lodging?.perType   ? Object.entries(lodging.perType).map(([name, value]) => ({ name, value })) : [];

  // Menu items not yet in inventory
  const trackedMenuItemIds = new Set((inventory || []).map((inv: any) => inv.menuItemId));
  const untrackedMenuItems = (menu || []).filter((m: any) => !trackedMenuItemIds.has(m.id));

  const startEdit = (inv: any) => {
    setEditingId(inv.id);
    setEditForm({ stock: inv.stock, allocated: inv.allocated, minStock: inv.minStock, unit: inv.unit });
  };

  return (
    <div className="space-y-8">

      {/* ── Page header ── */}
      <div className="border-b border-[#dcdcde] pb-4">
        <h1 className="text-2xl font-bold text-[#1d2327]">Manager Dashboard</h1>
        <p className="text-sm text-[#646970]">
          Performance overview · {format(new Date(), 'EEEE, MMMM do yyyy')}
        </p>
      </div>

      {/* ── Combined Revenue Hero ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#1d2327] to-[#2c3338] text-white p-6 rounded-sm shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Total Revenue Today</p>
          <p className="text-3xl lg:text-4xl font-black mt-1">KES {totalRevenue.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-3 text-emerald-400 text-[10px] lg:text-xs font-bold">
            <ArrowUpRight size={14} />
            Combined from both departments
          </div>
        </div>
        <div className="bg-white border border-[#dcdcde] p-5 shadow-sm rounded-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 border border-orange-100 rounded-sm shrink-0">
            <UtensilsCrossed size={24} className="text-orange-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#646970]">Restaurant Sales</p>
            <p className="text-xl lg:text-2xl font-black text-[#1d2327] truncate">KES {restaurantRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-[#8c8f94] mt-0.5 truncate">{report?.totalOrders || 0} orders today</p>
          </div>
        </div>
        <div className="bg-white border border-[#dcdcde] p-5 shadow-sm rounded-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-sm shrink-0">
            <BedDouble size={24} className="text-[#2271b1]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#646970]">Lodging Revenue</p>
            <p className="text-xl lg:text-2xl font-black text-[#1d2327] truncate">KES {lodgingRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-[#8c8f94] mt-0.5 truncate">
              {lodging?.occupancy?.occupied || 0} occupied · {lodging?.occupancy?.available || 0} available
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[
          { label: 'Active Staff',  value: staff?.filter((s:any) => s.status === 'ACTIVE').length || 0, Icon: UserCheck,  color: 'text-[#2271b1]', bg: 'bg-blue-50 border-blue-100' },
          { label: 'Menu Items',    value: menu?.length || 0,                                            Icon: Utensils,   color: 'text-slate-700',  bg: 'bg-slate-50 border-slate-200' },
          { label: 'Total Rooms',   value: lodging?.occupancy?.total || 0,                              Icon: BedDouble,  color: 'text-violet-700', bg: 'bg-violet-50 border-violet-100' },
          { label: 'Top Waiter',    value: waiterData.sort((a:any,b:any) => (b.value as number) - (a.value as number))[0]?.name?.split(' ')[0] || 'N/A', Icon: TrendingUp, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#dcdcde] p-3 lg:p-4 flex items-center gap-3 lg:gap-4 shadow-sm rounded-sm">
            <div className={`p-2 lg:p-2.5 border rounded-sm shrink-0 ${s.bg} ${s.color}`}>
              <s.Icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] lg:text-[10px] font-bold text-[#646970] uppercase tracking-wider truncate">{s.label}</p>
              <h3 className="text-sm lg:text-lg font-bold text-[#1d2327] truncate">{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════  RESTAURANT SECTION  ══════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-600 text-white rounded-sm"><UtensilsCrossed size={16} /></div>
          <h2 className="text-lg font-bold text-[#1d2327]">Restaurant Performance</h2>
          <span className="ml-auto text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-sm uppercase">Today</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Revenue by Waiter bar chart */}
          <div className="lg:col-span-2 bg-white border border-[#dcdcde] p-5 shadow-sm rounded-sm">
            <h3 className="text-sm font-bold text-[#1d2327] mb-4">Revenue by Waiter</h3>
            {waiterData.length > 0 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waiterData} barSize={32}>
                    <CartesianGrid strokeDasharray="1 1" vertical={false} stroke="#f0f0f1" />
                    <XAxis dataKey="name" tickLine={false} tick={{ fill: '#646970', fontSize: 11 }} />
                    <YAxis tickLine={false} tick={{ fill: '#646970', fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: '12px', border: '1px solid #dcdcde' }} />
                    <Bar dataKey="value" fill="#f97316" name="Sales (KES)" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-[#8c8f94] text-sm italic">No sales data yet today</div>
            )}
          </div>

          {/* Payment methods */}
          <div className="bg-white border border-[#dcdcde] p-5 shadow-sm rounded-sm space-y-4">
            <h3 className="text-sm font-bold text-[#1d2327]">Payment Methods</h3>
            {paymentData.length > 0 ? (
              <>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                        {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {paymentData.map((d: any, i) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs font-bold text-[#646970] uppercase">{d.name}</span>
                      </div>
                      <span className="text-xs font-bold text-[#1d2327]">KES {Number(d.value).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-[#8c8f94] text-sm italic">No payments recorded</div>
            )}
          </div>
        </div>

        {/* Top selling items */}
        <div className="mt-5 bg-white border border-[#dcdcde] p-5 shadow-sm rounded-sm">
          <h3 className="text-sm font-bold text-[#1d2327] mb-3">Top Selling Menu Items</h3>
          {report?.perItem && Object.keys(report.perItem).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(report.perItem)
                .sort((a: any, b: any) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, qty]: any, i) => (
                  <div key={name} className="flex items-center gap-3 p-3 bg-[#f6f7f7] border border-[#dcdcde] rounded-sm">
                    <span className="w-6 h-6 bg-[#1d2327] text-white flex items-center justify-center font-bold text-[10px] rounded-sm shrink-0">{i + 1}</span>
                    <div className="overflow-hidden">
                      <p className="text-[10px] lg:text-xs font-bold text-[#1d2327] truncate">{name}</p>
                      <p className="text-[9px] lg:text-[10px] text-[#2271b1] font-bold">{qty} sold</p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-[#8c8f94] italic">No items sold yet today</p>
          )}
        </div>
      </div>

      {/* ══════════════  INVENTORY MANAGEMENT  ══════════════ */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-sm"><Package size={16} /></div>
            <h2 className="text-lg font-bold text-[#1d2327]">Inventory Management</h2>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['manager-inventory'] })}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-bold text-slate-500 bg-white border border-[#dcdcde] rounded-sm hover:bg-slate-50 transition-all uppercase tracking-wider"
            >
              <RefreshCw size={12} /> Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-sm transition-all uppercase tracking-wider shadow-sm"
            >
              <Plus size={12} /> Add Item
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#dcdcde] rounded-sm shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#f6f7f7] border-b border-[#dcdcde]">
                  <th className="px-6 py-4 text-[10px] font-black text-[#646970] uppercase tracking-widest">Menu Item</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#646970] uppercase tracking-widest text-center">Allocated</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#646970] uppercase tracking-widest text-center">Current Stock</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#646970] uppercase tracking-widest text-center">Min Stock</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#646970] uppercase tracking-widest text-center">Unit</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#646970] uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#646970] uppercase tracking-widest text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dcdcde]">
                {inventory?.map((inv: any) => {
                  const isLow = inv.stock <= inv.minStock;
                  const isEditing = editingId === inv.id;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <span className="text-sm font-bold text-[#1d2327]">{inv.menuItem.name}</span>
                          {inv.menuItem.category && (
                            <p className="text-[10px] text-slate-400 font-medium">{inv.menuItem.category.name}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <input type="number" value={editForm.allocated} onChange={e => setEditForm({...editForm, allocated: Number(e.target.value)})}
                            className="w-20 text-center border border-[#2271b1] rounded px-2 py-1 text-xs font-bold outline-none" />
                        ) : (
                          <span className="text-xs font-black text-slate-400">{inv.allocated}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <input type="number" value={editForm.stock} onChange={e => setEditForm({...editForm, stock: Number(e.target.value)})}
                            className="w-20 text-center border border-[#2271b1] rounded px-2 py-1 text-xs font-bold outline-none" />
                        ) : (
                          <span className={`text-sm font-black ${isLow ? 'text-red-600' : 'text-[#2271b1]'}`}>{inv.stock}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <input type="number" value={editForm.minStock} onChange={e => setEditForm({...editForm, minStock: Number(e.target.value)})}
                            className="w-20 text-center border border-[#2271b1] rounded px-2 py-1 text-xs font-bold outline-none" />
                        ) : (
                          <span className="text-xs font-bold text-slate-400">{inv.minStock}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <select value={editForm.unit} onChange={e => setEditForm({...editForm, unit: e.target.value})}
                            className="border border-[#2271b1] rounded px-2 py-1 text-xs font-bold outline-none">
                            <option value="pcs">pcs</option>
                            <option value="kg">kg</option>
                            <option value="liters">liters</option>
                            <option value="plates">plates</option>
                            <option value="cups">cups</option>
                          </select>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 uppercase">{inv.unit}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-sm ${
                          inv.stock === 0 ? 'bg-red-100 text-red-700' : 
                          isLow ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {inv.stock === 0 ? 'Out of Stock' : isLow ? 'Low Stock' : 'Good'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => updateMutation.mutate({ id: inv.id, ...editForm })}
                                disabled={updateMutation.isPending}
                                className="p-1.5 bg-emerald-600 text-white rounded-sm hover:bg-emerald-700 transition-all"
                              >
                                <Save size={12} />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 bg-slate-200 text-slate-600 rounded-sm hover:bg-slate-300 transition-all"
                              >
                                <X size={12} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(inv)}
                                className="p-1.5 bg-blue-50 text-[#2271b1] rounded-sm hover:bg-blue-100 transition-all"
                                title="Edit"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Remove "${inv.menuItem.name}" from inventory?`)) {
                                    deleteMutation.mutate(inv.id);
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                                className="p-1.5 bg-red-50 text-red-600 rounded-sm hover:bg-red-100 transition-all"
                                title="Remove"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {(!inventory || inventory.length === 0) && (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Package size={48} className="mx-auto opacity-20" />
              <p className="text-xs font-black uppercase tracking-widest">No inventory items tracked yet</p>
              <p className="text-[10px] font-bold">Click "Add Item" to link menu items to inventory.</p>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════  LODGING SECTION  ══════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#2271b1] text-white rounded-sm"><BedDouble size={16} /></div>
          <h2 className="text-lg font-bold text-[#1d2327]">Lodging Overview</h2>
          <span className="ml-auto text-[10px] font-bold text-[#2271b1] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-sm uppercase">Live</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Occupancy grid */}
          <div className="bg-white border border-[#dcdcde] p-5 shadow-sm rounded-sm space-y-3">
            <h3 className="text-sm font-bold text-[#1d2327]">Room Occupancy</h3>
            {[
              { label: 'Total Rooms',  key: 'total',       color: 'bg-[#1d2327]' },
              { label: 'Available',    key: 'available',   color: 'bg-emerald-500' },
              { label: 'Occupied',     key: 'occupied',    color: 'bg-blue-500' },
              { label: 'Reserved',     key: 'reserved',    color: 'bg-violet-500' },
              { label: 'Cleaning',     key: 'cleaning',    color: 'bg-amber-500' },
              { label: 'Maintenance',  key: 'maintenance', color: 'bg-red-500' },
            ].map(s => (
              <div key={s.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-sm ${s.color}`} />
                  <span className="text-xs text-[#646970] font-bold uppercase tracking-wide">{s.label}</span>
                </div>
                <span className="text-sm font-black text-[#1d2327]">{lodging?.occupancy?.[s.key] ?? 0}</span>
              </div>
            ))}
            {/* Occupancy bar */}
            {lodging?.occupancy?.total > 0 && (
              <div className="mt-2 pt-2 border-t border-[#f0f0f1]">
                <div className="flex gap-0.5 h-3 rounded-sm overflow-hidden">
                  {lodging.occupancy.occupied    > 0 && <div className="bg-blue-500"    style={{ flex: lodging.occupancy.occupied }} />}
                  {lodging.occupancy.reserved    > 0 && <div className="bg-violet-500"  style={{ flex: lodging.occupancy.reserved }} />}
                  {lodging.occupancy.cleaning    > 0 && <div className="bg-amber-500"   style={{ flex: lodging.occupancy.cleaning }} />}
                  {lodging.occupancy.maintenance > 0 && <div className="bg-red-500"     style={{ flex: lodging.occupancy.maintenance }} />}
                  {lodging.occupancy.available   > 0 && <div className="bg-emerald-500" style={{ flex: lodging.occupancy.available }} />}
                </div>
                <p className="text-[9px] text-[#8c8f94] mt-1">
                  {Math.round(((lodging.occupancy.occupied + lodging.occupancy.reserved) / lodging.occupancy.total) * 100)}% occupancy rate
                </p>
              </div>
            )}
          </div>

          {/* Revenue by room type chart */}
          <div className="bg-white border border-[#dcdcde] p-5 shadow-sm rounded-sm">
            <h3 className="text-sm font-bold text-[#1d2327] mb-4">Revenue by Room Type</h3>
            {lodgingTypes.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lodgingTypes} barSize={28}>
                    <CartesianGrid strokeDasharray="1 1" vertical={false} stroke="#f0f0f1" />
                    <XAxis dataKey="name" tickLine={false} tick={{ fill: '#646970', fontSize: 10 }} />
                    <YAxis tickLine={false} tick={{ fill: '#646970', fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: '12px', border: '1px solid #dcdcde' }} />
                    <Bar dataKey="value" name="Revenue (KES)" radius={[2,2,0,0]}>
                      {lodgingTypes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-[#8c8f94] text-sm italic">No lodging revenue today</div>
            )}
          </div>

          {/* Recent bookings */}
          <div className="bg-white border border-[#dcdcde] p-5 shadow-sm rounded-sm">
            <h3 className="text-sm font-bold text-[#1d2327] mb-3">Recent Bookings</h3>
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {lodging?.recentBookings?.length > 0 ? lodging.recentBookings.map((b: any) => (
                <div key={b.id} className="flex items-start gap-3 p-2.5 bg-[#f6f7f7] border border-[#dcdcde] rounded-sm">
                  <div className="w-8 h-8 bg-[#2271b1] text-white flex items-center justify-center font-black text-xs rounded-sm shrink-0">
                    {b.room?.number}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-[#1d2327] truncate">{b.guestName}</p>
                    <p className="text-[9px] text-[#646970]">{b.room?.type} · KES {b.totalAmount?.toLocaleString()}</p>
                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-sm border inline-block mt-0.5 ${
                      b.status === 'CHECKED_IN'  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      b.status === 'CONFIRMED'   ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      b.status === 'CHECKED_OUT' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                      'bg-red-50 text-red-600 border-red-200'
                    }`}>{b.status.replace('_',' ')}</span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-[#8c8f94] italic text-center py-6">No bookings found</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Live Orders Feed ── */}
      <div className="bg-white border border-[#dcdcde] p-5 shadow-sm rounded-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#1d2327]">Live Restaurant Orders</h3>
          <span className="flex h-2 w-2 bg-emerald-500 animate-pulse rounded-full" />
        </div>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {report?.recentOrders?.length > 0 ? report.recentOrders.map((o: any) => (
            <div key={o.id} className="flex gap-4 items-center p-2.5 bg-[#f6f7f7] border border-[#dcdcde] rounded-sm">
              <div className="px-2 py-1 bg-[#1d2327] text-white font-black text-[10px] rounded-sm">T{o.table?.number}</div>
              <div className="flex-1">
                <p className="text-xs font-bold text-[#1d2327]">{o.items?.length} items · KES {o.totalAmount?.toLocaleString()}</p>
                <p className="text-[9px] text-[#646970]">{o.waiter?.name} · {new Date(o.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</p>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 border font-bold uppercase rounded-sm ${
                o.status==='READY'     ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                o.status==='PREPARING' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                o.status==='PAID'      ? 'bg-blue-50 border-blue-200 text-blue-700' :
                'bg-slate-50 border-slate-200 text-slate-500'
              }`}>{o.status}</span>
            </div>
          )) : (
            <p className="text-sm text-[#8c8f94] italic text-center py-4">No orders today</p>
          )}
        </div>
      </div>

      {/* ── ADD INVENTORY MODAL ── */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#dcdcde] rounded-sm shadow-2xl w-[95%] sm:max-w-md overflow-hidden my-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 bg-[#f6f7f7] border-b border-[#dcdcde]">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#1d2327] flex items-center gap-2">
                  <Plus size={14} className="text-emerald-600" />
                  Add Menu Item to Inventory
                </h3>
              </div>
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Select Menu Item</label>
                  <select
                    value={addForm.menuItemId}
                    onChange={e => setAddForm({...addForm, menuItemId: e.target.value})}
                    className="w-full border border-[#ccd0d4] rounded px-4 py-2.5 text-sm font-medium outline-none focus:border-[#2271b1]"
                  >
                    <option value="">-- Select an item --</option>
                    {untrackedMenuItems.map((item: any) => (
                      <option key={item.id} value={item.id}>{item.name} (KES {item.price})</option>
                    ))}
                  </select>
                  {untrackedMenuItems.length === 0 && (
                    <p className="text-[10px] text-amber-600 font-bold">All menu items are already tracked in inventory.</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Initial Stock</label>
                    <input
                      type="number"
                      value={addForm.stock}
                      onChange={e => setAddForm({...addForm, stock: Number(e.target.value)})}
                      className="w-full border border-[#ccd0d4] rounded px-4 py-2.5 text-sm font-medium outline-none focus:border-[#2271b1]"
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unit</label>
                    <select
                      value={addForm.unit}
                      onChange={e => setAddForm({...addForm, unit: e.target.value})}
                      className="w-full border border-[#ccd0d4] rounded px-4 py-2.5 text-sm font-medium outline-none focus:border-[#2271b1]"
                    >
                      <option value="pcs">Pieces</option>
                      <option value="kg">Kilograms</option>
                      <option value="liters">Liters</option>
                      <option value="plates">Plates</option>
                      <option value="cups">Cups</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-[#f6f7f7] border-t border-[#dcdcde] flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 border border-[#dcdcde] bg-white text-slate-600 rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!addForm.menuItemId) return alert('Please select a menu item');
                    if (addForm.stock <= 0) return alert('Stock must be greater than 0');
                    replenishMutation.mutate({
                      menuItemId: addForm.menuItemId,
                      amount: addForm.stock,
                      unit: addForm.unit,
                      isAllocation: true
                    });
                  }}
                  disabled={replenishMutation.isPending}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm text-xs font-bold uppercase tracking-wider shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {replenishMutation.isPending ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  Add to Inventory
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ManagerDashboard;
