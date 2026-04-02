import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import MainLayout from './components/layout/MainLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WaiterDashboard from './pages/WaiterDashboard';
import KitchenDashboard from './pages/KitchenDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import MenuManagement from './pages/MenuManagement';
import StaffManagement from './pages/StaffManagement';
import OrderManagement from './pages/OrderManagement';
import Reports from './pages/Reports';
import DutyRoster from './pages/DutyRoster';
import MessagingCenter from './pages/MessagingCenter';
import ReceptionistDashboard from './pages/ReceptionistDashboard';
import RoomManagement from './pages/RoomManagement';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;

  return <>{children}</>;
};

const DashboardRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  
  if (['MANAGER', 'OWNER'].includes(user.role)) return <Navigate to="/manager" />;
  if (user.role === 'KITCHEN') return <Navigate to="/kitchen" />;
  if (user.role === 'WAITER') return <Navigate to="/waiter" />;
  if (user.role === 'RECEPTIONIST') return <Navigate to="/reception" />;
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Welcome, {user.name}</h1>
      <p className="text-slate-500">Role: {user.role}</p>
    </div>
  );
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      
      {/* Modern High-Aesthetic Routes (Self-Contained Layouts) */}
      <Route path="/waiter" element={<ProtectedRoute roles={['WAITER', 'MANAGER', 'OWNER']}><WaiterDashboard /></ProtectedRoute>} />
      <Route path="/menu" element={<ProtectedRoute roles={['MANAGER', 'OWNER']}><MenuManagement /></ProtectedRoute>} />

      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        {/* Dashboards based on role */}
        <Route index element={<DashboardRedirect />} />
        
        {/* Role Specific Routes */}
        <Route path="kitchen" element={<ProtectedRoute roles={['KITCHEN', 'MANAGER', 'OWNER']}><KitchenDashboard /></ProtectedRoute>} />
        <Route path="manager" element={<ProtectedRoute roles={['MANAGER', 'OWNER']}><ManagerDashboard /></ProtectedRoute>} />
        <Route path="reception" element={<ProtectedRoute roles={['RECEPTIONIST', 'MANAGER', 'OWNER']}><ReceptionistDashboard /></ProtectedRoute>} />
        
        {/* Common / Shared Routes with Protection */}
        <Route path="orders" element={<ProtectedRoute roles={['MANAGER', 'OWNER', 'WAITER']}><OrderManagement /></ProtectedRoute>} />
        <Route path="staff" element={<ProtectedRoute roles={['MANAGER', 'OWNER']}><StaffManagement /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute roles={['MANAGER', 'OWNER']}><Reports /></ProtectedRoute>} />
        <Route path="rooms" element={<ProtectedRoute roles={['MANAGER', 'OWNER']}><RoomManagement /></ProtectedRoute>} />
        <Route path="roster" element={<ProtectedRoute><DutyRoster /></ProtectedRoute>} />
        <Route path="messages" element={<ProtectedRoute><MessagingCenter /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
