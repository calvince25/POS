import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  Calendar, 
  ArrowUpRight,
  PieChart as PieIcon,
  ShoppingBag,
  UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { exportToPDF } from '../utils/pdfExport';

const Reports = () => {
  const { data: report, isLoading: isReportLoading } = useQuery({ 
    queryKey: ['daily-report-full'], 
    queryFn: () => api.get('/payments/reports/daily').then(res => res.data) 
  });

  const { data: lodging, isLoading: isLodgingLoading } = useQuery({
    queryKey: ['lodging-report'],
    queryFn: () => api.get('/rooms/report').then(res => res.data)
  });

  if (isReportLoading || isLodgingLoading) return <div className="flex items-center justify-center h-[calc(100vh-140px)] text-sm font-medium">Generating performance report...</div>;

  const totalRevenue = (report?.totalRevenue || 0) + (lodging?.todayRevenue || 0);
  const totalTransactions = (report?.totalOrders || 0) + (lodging?.totalBookings || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#dcdcde] pb-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-[#1d2327] text-white">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1d2327]">Sales & Analytics</h1>
            <p className="text-sm text-[#646970]">Performance review for {format(new Date(), 'MMMM do, yyyy')}</p>
          </div>
        </div>
        <button 
          onClick={() => {
            const paymentData = report?.perMethod 
              ? Object.entries(report.perMethod).map(([method, amount]: any) => [method, `KES ${amount.toLocaleString()}`])
              : [['No data', '-']];
            const waiterData = report?.perWaiter 
              ? Object.entries(report.perWaiter).map(([name, amount]: any) => [name, `KES ${amount.toLocaleString()}`])
              : [['No data', '-']];
              
            const lodgingData = lodging?.perType 
              ? Object.entries(lodging.perType).map(([type, amount]: any) => [type, `KES ${amount.toLocaleString()}`])
              : [['No data', '-']];
              
            const overallData = [
              ['Metric', 'Value'],
              ['Total Transactions', totalTransactions?.toString()],
              ['Total Revenue', `KES ${totalRevenue?.toLocaleString()}`],
              ['Lodging Revenue', `KES ${lodging?.todayRevenue?.toLocaleString() || '0'}`],
              ['Restaurant Revenue', `KES ${report?.totalRevenue?.toLocaleString() || '0'}`]
            ];
            
            const combinedData = [
              ...overallData,
              ['---', '---'],
              ['RESTAURANT SALES', '---'],
              ...paymentData,
              ['---', '---'],
              ['LODGING BY TYPE', '---'],
              ...lodgingData,
              ['---', '---'],
              ['STAFF ACTIVITY', '---'],
              ...waiterData
            ];
            
            exportToPDF('Manager Daily Performance Report', ['Category', 'Value'], combinedData, 'daily_performance_report');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#ccd0d4] hover:border-[#2271b1] rounded-sm font-bold text-xs text-[#3c434a] transition-all shadow-sm uppercase tracking-wider"
        >
          <Download size={14} />
          EXPORT DATA
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Stats Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#1d2327] p-6 border border-[#1d2327] text-white shadow-md rounded-sm">
              <div className="flex justify-between items-start mb-8">
                <div className="p-2 bg-white/10 border border-white/10">
                  <TrendingUp size={18} />
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold bg-white/10 px-2 py-0.5 border border-white/10 uppercase tracking-tighter">
                  <ArrowUpRight size={10} />
                  <span>+18.2% vs Prev</span>
                </div>
              </div>
              <p className="text-slate-400 font-bold tracking-widest uppercase text-[10px] mb-1">Total Daily Revenue</p>
              <h2 className="text-4xl font-black">KES {totalRevenue?.toLocaleString()}</h2>
            </div>

            <div className="bg-white p-6 border border-[#dcdcde] flex flex-col justify-between shadow-sm rounded-sm">
               <div className="flex justify-between items-start">
                  <div className="p-2 bg-blue-50 text-[#2271b1] border border-blue-100">
                    <ShoppingBag size={18} />
                  </div>
                  <span className="text-[10px] font-bold text-[#8c8f94] uppercase tracking-widest">{format(new Date(), 'HH:mm')}</span>
               </div>
               <div className="mt-8">
                 <p className="text-[#646970] font-bold text-[10px] mb-1 uppercase tracking-widest">Transactions processed</p>
                 <h2 className="text-3xl font-black text-[#1d2327]">{totalTransactions} <span className="text-sm font-bold text-[#8c8f94] uppercase tracking-tighter ml-1">transactions</span></h2>
               </div>
            </div>
          </div>

          <div className="bg-white p-6 border border-[#dcdcde] shadow-sm rounded-sm space-y-6">
            <h3 className="text-sm font-bold flex items-center gap-2 text-[#1d2327] uppercase tracking-tight">
              <PieIcon size={16} className="text-[#2271b1]" />
              Payment Distribution
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {report?.perMethod ? Object.entries(report.perMethod).map(([method, amount]: any) => (
                <div key={method} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#646970] uppercase tracking-wider">{method}</span>
                    <span className="text-[9px] text-[#2271b1] font-black uppercase">
                      {Math.round((amount / report.totalRevenue) * 100)}%
                    </span>
                  </div>
                  <div className="h-1 w-full bg-[#f6f7f7] border border-[#f0f0f1] rounded-sm overflow-hidden">
                    <div 
                      className="h-full bg-[#2271b1]" 
                      style={{ width: `${report.totalRevenue > 0 ? (amount / report.totalRevenue) * 100 : 0}%` }} 
                    />
                  </div>
                  <p className="font-bold text-sm text-[#1d2327]">KES {amount?.toLocaleString()}</p>
                </div>
              )) : (
                <p className="col-span-full text-center text-[#8c8f94] py-10 text-[11px] font-bold uppercase tracking-widest">No payment data recorded</p>
              )}
            </div>
          </div>
        </div>

        {/* Sales by Waiter Side Card */}
        <div className="lg:col-span-1 bg-white border border-[#dcdcde] p-6 shadow-sm flex flex-col gap-6 rounded-sm">
          <div className="space-y-1">
            <h3 className="text-sm font-bold flex items-center gap-2 text-[#1d2327] uppercase tracking-tight">
              <UserCheck size={16} className="text-emerald-600" />
              Staff Activity
            </h3>
            <p className="text-[10px] text-[#646970] font-medium">Sales contribution monitoring</p>
          </div>

          <div className="flex-1 space-y-4">
            {report?.perWaiter ? Object.entries(report.perWaiter).map(([name, amount]: any) => (
              <div key={name} className="flex items-center justify-between p-3 border border-[#f0f0f1] bg-[#f6f7f7] rounded-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white border border-[#dcdcde] flex items-center justify-center font-bold text-xs text-[#2271b1] rounded-sm shadow-xs">
                    {name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-[#1d2327]">{name}</p>
                    <p className="text-[9px] text-[#8c8f94] font-bold uppercase tracking-widest">Team Member</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs text-[#1d2327]">KES {amount?.toLocaleString()}</p>
                  <p className="text-[9px] font-black text-emerald-600">{(amount / report.totalRevenue * 100).toFixed(1)}%</p>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12 italic">
                <p className="text-[10px] font-bold uppercase tracking-widest">No Activity Yet</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 space-y-2 rounded-sm shadow-sm">
             <div className="flex items-center gap-2 text-[#2271b1]">
                <Calendar size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">Operational Forecast</span>
             </div>
             <p className="text-[11px] font-medium text-[#3c434a] leading-relaxed">Based on today's velocity, you are projected to settle <span className="font-bold text-[#2271b1]">KES {(totalRevenue * 7).toLocaleString()}</span> by end of week.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
