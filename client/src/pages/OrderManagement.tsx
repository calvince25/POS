import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { 
  Receipt, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  ChevronRight, 
  Printer,
  History,
  Clock,
  User,
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OrderManagement = () => {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [paymentModal, setPaymentModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);

  const { data: orders } = useQuery({ 
    queryKey: ['all-orders'], 
    queryFn: () => api.get('/orders/status/ALL').then(res => res.data) 
  });

  const mpesaMutation = useMutation({
    mutationFn: (data: any) => api.post('/payments/mpesa/initiate', data),
    onSuccess: () => alert('M-Pesa STK Push initiated! Please check your phone.'),
  });

  const cashMutation = useMutation({
    mutationFn: (data: any) => api.post('/payments/process', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
      setPaymentModal(false);
      setSelectedOrder(null);
      alert('Payment confirmed!');
    }
  });

  const renderStatusBadge = (status: string) => {
    const colors: any = {
      PENDING: 'bg-red-50 text-[#d63638] border-[#d63638]',
      PREPARING: 'bg-blue-50 text-[#2271b1] border-[#2271b1]',
      READY: 'bg-emerald-50 text-emerald-700 border-emerald-600',
      PAID: 'bg-[#f6f7f7] text-[#1d2327] border-[#dcdcde]',
    };
    return <span className={`px-1.5 py-0.5 border text-[9px] font-bold uppercase tracking-wider rounded-sm ${colors[status]}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#dcdcde] pb-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-[#1d2327] text-white">
            <Receipt size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1d2327]">Order Management</h1>
            <p className="text-xs text-[#646970] font-medium tracking-tight">Track billing and settle transactions</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-2 space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-2 custom-scrollbar">
          {orders?.map((order: any) => (
            <button
              key={order.id}
              onClick={() => { setSelectedOrder(order); setPaymentAmount(Number(order.totalAmount)); }}
              className={`w-full text-left bg-white p-4 border transition-all flex items-center justify-between group rounded-sm shadow-sm ${selectedOrder?.id === order.id ? 'border-[#2271b1]' : 'border-[#dcdcde] hover:border-[#2271b1]/50'}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#f6f7f7] border border-[#dcdcde] flex items-center justify-center font-bold text-lg text-[#1d2327] group-hover:bg-[#2271b1] group-hover:text-white transition-colors rounded-sm">
                  {order.table.number}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-sm text-[#1d2327]">Order #{order.id.slice(0, 5).toUpperCase()}</span>
                    {renderStatusBadge(order.status)}
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-[#646970] font-bold uppercase tracking-tight">
                    <span className="flex items-center gap-1"><User size={10} /> {order.waiter.name}</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="flex items-center gap-1"><Hash size={10} /> {order.items.length} Items</span>
                  </div>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div>
                  <p className="text-[10px] font-bold text-[#8c8f94] uppercase tracking-widest leading-none">Total</p>
                  <p className={`text-lg font-black ${order.status === 'PAID' ? 'text-[#1d2327]' : 'text-[#2271b1]'}`}>KES {Number(order.totalAmount).toLocaleString()}</p>
                </div>
                <ChevronRight className={`text-[#dcdcde] transition-transform ${selectedOrder?.id === order.id ? 'translate-x-1 text-[#2271b1]' : ''}`} size={16} />
              </div>
            </button>
          ))}
        </div>

        {/* Selected Order Detail / Actions */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedOrder ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white border border-[#dcdcde] p-6 shadow-sm space-y-6 sticky top-0 rounded-sm"
              >
                <div className="flex items-center justify-between border-b border-[#f0f0f1] pb-3">
                  <h3 className="text-lg font-bold text-[#1d2327] uppercase tracking-tight">Billing Receipt</h3>
                  <button className="p-1.5 text-slate-300 hover:text-[#2271b1] transition-colors"><Printer size={18} /></button>
                </div>

                <div className="space-y-3 font-mono text-[11px] py-4">
                  {selectedOrder.items.map((it: any) => (
                    <div key={it.id} className="flex justify-between text-[#3c434a]">
                      <span className="flex-1 truncate pr-4">{it.quantity}x {it.menuItem.name}</span>
                      <span className="flex-shrink-0">KES {Number(it.price * it.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="pt-3 mt-3 border-t border-dashed border-[#dcdcde] flex justify-between font-bold text-sm text-[#1d2327]">
                    <span>Subtotal</span>
                    <span>KES {Number(selectedOrder.totalAmount).toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#646970] text-center bg-[#f6f7f7] py-1">Payment Settlement</p>
                  {selectedOrder.status !== 'PAID' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setPaymentModal(true)}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-[#2271b1] hover:bg-[#135e96] text-white rounded-sm transition-all shadow-sm"
                      >
                        <Banknote size={20} />
                        <span className="font-bold text-[10px]">CASH</span>
                      </button>
                      <button 
                        onClick={() => setPaymentModal(true)}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm transition-all shadow-sm"
                      >
                        <Smartphone size={20} />
                        <span className="font-bold text-[10px]">M-PESA</span>
                      </button>
                      <button 
                        onClick={() => setPaymentModal(true)}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-[#ccd0d4] hover:bg-[#f6f7f7] text-[#3c434a] rounded-sm transition-all"
                      >
                        <CreditCard size={20} />
                        <span className="font-bold text-[10px]">CARD</span>
                      </button>
                      <button 
                        onClick={() => setPaymentModal(true)}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-[#ccd0d4] hover:bg-[#f6f7f7] text-[#3c434a] rounded-sm transition-all"
                      >
                        <History size={20} />
                        <span className="font-bold text-[10px]">SPLIT</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-blue-50 border border-blue-200 flex flex-col items-center gap-3 rounded-sm">
                      <CheckCircle className="text-[#2271b1]" size={32} />
                      <div className="text-center">
                        <p className="font-bold text-sm text-[#2271b1] uppercase tracking-wider">Transaction Settled</p>
                        <p className="text-[9px] font-bold text-[#646970] mt-1 italic">REF: #PAY-{selectedOrder.id.slice(0,8).toUpperCase()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center bg-white border border-[#dcdcde] rounded-sm p-8 text-[#8c8f94] space-y-3 shadow-sm border-dashed">
                <Receipt size={48} strokeWidth={1} className="opacity-30" />
                <div className="text-center">
                  <p className="font-bold text-xs text-[#3c434a] uppercase tracking-widest">No Selection</p>
                  <p className="text-[10px] mt-2 leading-relaxed">Select an active order from the list to process payment or view itemized billing.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1d2327]/60 backdrop-blur-[1px]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-[#dcdcde] w-full max-w-md p-6 space-y-8 shadow-2xl rounded-sm"
          >
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-[#1d2327] uppercase tracking-tight">Settle Transaction</h2>
              <p className="text-[11px] text-[#646970] font-bold uppercase tracking-tight">Table {selectedOrder.table.number} · Total KES {Number(selectedOrder.totalAmount).toLocaleString()}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#646970] uppercase">Settlement Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-[#8c8f94]">KES</span>
                  <input 
                    type="number" 
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full pl-12 pr-3 py-2 bg-[#f6f7f7] border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-xl font-black text-[#1d2327] rounded-sm" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#646970] uppercase">M-Pesa Number (Required for Mobile Pay)</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="2547XXXXXXXX" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-white border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-sm rounded-sm" 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#f0f0f1]">
              <button 
                onClick={() => setPaymentModal(false)}
                className="py-2.5 font-bold text-[11px] text-[#646970] hover:bg-[#f6f7f7] border border-[#dcdcde] rounded-sm transition-all"
              >
                CANCEL
              </button>
              <button 
                onClick={() => {
                  if (phoneNumber) {
                    mpesaMutation.mutate({ orderId: selectedOrder.id, phoneNumber, amount: paymentAmount });
                  } else {
                    cashMutation.mutate({ orderId: selectedOrder.id, amount: paymentAmount, method: 'CASH', reference: 'CASH-TRX' });
                  }
                }}
                className="bg-[#2271b1] hover:bg-[#135e96] text-white rounded-sm font-bold text-[11px] py-2.5 shadow-sm uppercase tracking-wider"
              >
                CONFIRM SETTLEMENT
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const CheckCircle = ({ className, size }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

export default OrderManagement;
