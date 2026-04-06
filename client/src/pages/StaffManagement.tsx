import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Activity, 
  Lock,
  User,
  Calendar,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StaffManagement = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data: staff } = useQuery({ queryKey: ['staff'], queryFn: () => api.get('/staff').then(res => res.data) });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => 
      api.patch(`/staff/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
  });

  const registerMutation = useMutation({
    mutationFn: (data: any) => api.post('/auth/register', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setIsModalOpen(false);
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string, newPassword: string }) => 
      api.patch(`/staff/${id}/reset-password`, { newPassword }),
    onSuccess: () => {
      setResetModalOpen(false);
      alert('Password reset successfully!');
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, roleName }: { id: string, roleName: string }) => 
      api.patch(`/staff/${id}/role`, { roleName }),
    onSuccess: () => {
      setRoleModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      alert('Role updated successfully!');
    }
  });

  const deleteStaffMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      alert('Staff member deleted successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Error deleting staff member');
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#dcdcde] pb-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-[#1d2327] text-white">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1d2327]">Staff Management</h1>
            <p className="text-sm text-[#646970]">Manage system access and roles</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#2271b1] hover:bg-[#135e96] text-white text-sm font-bold px-4 py-2 rounded-sm shadow-sm transition-all"
        >
          <UserPlus size={16} className="inline mr-2" />
          Register New Staff
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {staff?.map((s: any) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={s.id}
              className="bg-white border border-[#dcdcde] p-5 shadow-sm space-y-5 hover:border-[#2271b1]/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#f6f7f7] border border-[#dcdcde] flex items-center justify-center font-bold text-xl text-[#8c8f94] rounded-sm">
                    {s.name[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#1d2327]">{s.name}</h3>
                    <div className="flex items-center gap-1 text-[#2271b1] font-bold uppercase tracking-tighter">
                      <Shield size={10} />
                      <span className="text-[10px]">{s.role.name}</span>
                    </div>
                  </div>
                </div>
                <div className={`px-2 py-0.5 border text-[9px] font-bold uppercase tracking-wider ${s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-[#d63638] border-red-100'}`}>
                  {s.status}
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-[#f0f0f1]">
                <div className="flex items-center gap-3 text-xs text-[#646970]">
                  <User size={12} />
                  <span className="font-medium">@{s.username}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#646970]">
                  <Calendar size={12} />
                  <span className="font-medium">Last active: {s.lastLogin ? new Date(s.lastLogin).toLocaleDateString() : 'Never'}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <button 
                  onClick={() => { setSelectedUser(s); setRoleModalOpen(true); }}
                  className="flex items-center justify-center gap-1 py-2 bg-[#f6f7f7] border border-[#dcdcde] hover:bg-white text-[#3c434a] font-bold text-[9px] transition-all rounded-sm uppercase tracking-wider"
                >
                  <Shield size={10} />
                  ROLE
                </button>
                <button 
                  onClick={() => { setSelectedUser(s); setResetModalOpen(true); }}
                  className="flex items-center justify-center gap-1 py-2 bg-[#f6f7f7] border border-[#dcdcde] hover:bg-white text-[#3c434a] font-bold text-[9px] transition-all rounded-sm uppercase tracking-wider"
                >
                  <Lock size={10} />
                  PWD
                </button>
                  <Activity size={10} />
                  {s.status === 'ACTIVE' ? 'DEACT' : 'ACT'}
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to permanently delete ${s.name}? This action cannot be undone.`)) {
                      deleteStaffMutation.mutate(s.id);
                    }
                  }}
                  disabled={deleteStaffMutation.isPending}
                  className="flex items-center justify-center gap-1 py-2 border border-[#dcdc68] bg-[#fdfdf0] text-[#856404] hover:bg-[#d63638] hover:text-white hover:border-[#d63638] font-bold text-[9px] transition-all rounded-sm uppercase tracking-wider disabled:opacity-50"
                  title="Delete Staff"
                >
                  <Trash2 size={10} />
                  DEL
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Register Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1d2327]/60 backdrop-blur-[1px]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-[#dcdcde] w-full max-w-md p-6 space-y-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#f0f0f1] pb-3">
              <h2 className="text-xl font-bold text-[#1d2327]">Register Staff</h2>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              registerMutation.mutate(Object.fromEntries(formData));
            }} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#646970] uppercase">Full Name</label>
                <input name="name" className="w-full px-3 py-2 bg-white border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-sm rounded-sm" required />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#646970] uppercase">Username</label>
                <input name="username" className="w-full px-3 py-2 bg-white border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-sm rounded-sm" required />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#646970] uppercase">Initial Password</label>
                <input name="password" type="password" className="w-full px-3 py-2 bg-white border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-sm rounded-sm" required />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#646970] uppercase">Role</label>
                <div className="relative">
                  <select name="roleName" className="w-full px-3 py-2 bg-white border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-sm rounded-sm appearance-none" required>
                    <option value="MANAGER">Manager</option>
                    <option value="WAITER">Waiter</option>
                    <option value="KITCHEN">Kitchen Staff</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-[#f0f0f1]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 text-xs font-bold text-[#646970] hover:bg-[#f6f7f7] border border-[#dcdcde] rounded-sm">CANCEL</button>
                <button type="submit" className="flex-1 bg-[#2271b1] text-white py-2 text-xs font-bold rounded-sm">CREATE USER</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Reset Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1d2327]/60 backdrop-blur-[1px]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-[#dcdcde] w-full max-w-sm p-6 space-y-6 shadow-2xl"
          >
            <div className="border-b border-[#f0f0f1] pb-2">
              <h2 className="text-lg font-bold text-[#1d2327]">Password Reset</h2>
              <p className="text-[11px] text-[#646970] uppercase font-bold tracking-tight">User: {selectedUser?.name}</p>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              resetPasswordMutation.mutate({ id: selectedUser.id, newPassword: formData.get('pwd') as string });
            }} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#646970] uppercase">New Password</label>
                <input name="pwd" type="password" className="w-full px-3 py-2 bg-white border border-[#ccd0d4] focus:border-[#2271b1] outline-none text-sm rounded-sm" required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setResetModalOpen(false)} className="flex-1 py-2 text-xs font-bold text-[#646970] hover:bg-[#f6f7f7] border border-[#dcdcde] rounded-sm">CANCEL</button>
                <button type="submit" className="flex-1 bg-[#d63638] text-white py-2 text-xs font-bold rounded-sm">UPDATE</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Role Change Modal */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1d2327]/60 backdrop-blur-[1px]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-[#dcdcde] w-full max-w-sm p-6 space-y-6 shadow-2xl"
          >
            <div className="border-b border-[#f0f0f1] pb-2">
              <h2 className="text-lg font-bold text-[#1d2327]">Change User Role</h2>
              <p className="text-[11px] text-[#646970] uppercase font-bold tracking-tight">User: {selectedUser?.name}</p>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateRoleMutation.mutate({ id: selectedUser.id, roleName: formData.get('roleName') as string });
            }} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#646970] uppercase">Select Role</label>
                <div className="relative">
                  <select name="roleName" defaultValue={selectedUser?.role?.name} className="w-full px-3 py-2 bg-white border border-[#ccd0d4] focus:border-[#2271b1] text-[#3c434a] outline-none text-sm rounded-sm appearance-none" required>
                    <option value="MANAGER">Manager</option>
                    <option value="WAITER">Waiter</option>
                    <option value="KITCHEN">Kitchen Staff</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setRoleModalOpen(false)} className="flex-1 py-2 text-xs font-bold text-[#646970] hover:bg-[#f6f7f7] border border-[#dcdcde] rounded-sm">CANCEL</button>
                <button type="submit" className="flex-1 bg-[#2271b1] text-white py-2 text-xs font-bold rounded-sm">UPDATE ROLE</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
