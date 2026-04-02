import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ChefHat, 
  Users, 
  BarChart3, 
  LogOut, 
  Clock, 
  Menu as MenuIcon, 
  Calendar,
  Mail,
  Home,
  BedDouble,
  X 
} from 'lucide-react';
import { format } from 'date-fns';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['OWNER', 'MANAGER', 'WAITER', 'KITCHEN', 'RECEPTIONIST'] },
    { name: 'Lodgings', icon: Home, path: '/reception', roles: ['OWNER', 'MANAGER', 'RECEPTIONIST'] },
    { name: 'Orders', icon: UtensilsCrossed, path: '/orders', roles: ['OWNER', 'MANAGER', 'WAITER'] },
    { name: 'Kitchen', icon: ChefHat, path: '/kitchen', roles: ['OWNER', 'MANAGER', 'KITCHEN'] },
    { name: 'Staff', icon: Users, path: '/staff', roles: ['OWNER', 'MANAGER'] },
    { name: 'Menu', icon: MenuIcon, path: '/menu', roles: ['OWNER', 'MANAGER'] },
    { name: 'Reports',  icon: BarChart3,       path: '/reports',  roles: ['OWNER', 'MANAGER'] },
    { name: 'Rooms',    icon: BedDouble,        path: '/rooms',    roles: ['OWNER', 'MANAGER'] },
    { name: 'Roster',   icon: Calendar,         path: '/roster',   roles: ['OWNER', 'MANAGER', 'WAITER', 'KITCHEN', 'RECEPTIONIST'] },
    { name: 'Messages', icon: Mail,             path: '/messages', roles: ['OWNER', 'MANAGER', 'WAITER', 'KITCHEN', 'RECEPTIONIST'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user?.role || ''));

  const { data: messages } = useQuery({ 
    queryKey: ['messages'], 
    queryFn: () => api.get('/messages').then(res => res.data),
    refetchInterval: 30000 // Refetch every 30s for notifications
  });

  const hasNewMessages = (messages?.length || 0) > 0;

  return (
    <div className="flex h-screen bg-[#f0f0f1] dark:bg-slate-950 font-sans text-[#3c434a] dark:text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#1d2327] dark:bg-black transition-transform duration-300 lg:translate-x-0 lg:static
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col pt-4 overflow-y-auto">
          <div className="px-4 mb-8 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-[#2271b1] text-white">
                <UtensilsCrossed size={20} />
              </div>
              <span className="text-white text-lg font-bold tracking-tight">RestoPOS</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1">
            {filteredMenu.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center space-x-3 px-4 py-3 transition-colors text-[14px]
                  ${isActive 
                    ? 'bg-[#2271b1] text-white font-medium border-l-4 border-white lg:border-l-0 lg:border-r-4' 
                    : 'text-slate-300 hover:bg-[#2c3338] hover:text-[#72aee6]'
                  }
                `}
              >
                <item.icon size={18} />
                <span className="flex-1">{item.name}</span>
                {item.name === 'Messages' && hasNewMessages && (
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-700">
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center space-x-3 px-4 py-3 w-full text-left text-slate-400 hover:text-red-400 text-sm transition-colors"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-[#dcdcde] dark:border-slate-800 flex items-center justify-between px-6 z-40 shadow-sm">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-sm"
            >
              <MenuIcon size={20} />
            </button>
            <div className="hidden sm:flex items-center space-x-2 text-[#646970] text-xs">
              <Clock size={14} />
              <span className="font-medium">{format(time, 'EEEE, MMM do, yyyy · HH:mm:ss')}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-[#1d2327] dark:text-white">Howdy, {user?.name}</p>
              <p className="text-[10px] text-[#646970] uppercase font-bold">{user?.role}</p>
            </div>
            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 border border-[#ccd0d4] dark:border-slate-700 flex items-center justify-center font-bold text-[#2271b1] text-xs">
              {user?.name?.[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#f0f0f1] dark:bg-slate-950">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
