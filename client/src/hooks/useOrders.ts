import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export interface Modifier {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  categoryId: string | null;
  subCategoryId: string | null;
  image?: string;
  modifiers?: Modifier[];
}

export interface SubCategory {
  id: string;
  name: string;
  image?: string;
  categoryId: string;
  items?: MenuItem[];
}

export interface Category {
  id: string;
  name: string;
  image?: string;
  menuId: string | null;
  subCategories?: SubCategory[];
  items?: MenuItem[];
}

export interface Menu {
  id: string;
  name: string;
  description?: string;
  categories?: Category[];
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  menuItem: MenuItem;
  selectedModifiers?: { name: string; price: number }[];
}

export interface Table {
  id: string;
  number: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  capacity: number;
}

export interface Order {
  id: string;
  tableId: string;
  waiterId: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED' | 'PAID';
  totalAmount: number;
  items: OrderItem[];
  table: Table;
  waiter?: { name: string };
  createdAt: string;
}

export const useOrders = () => {
  const queryClient = useQueryClient();

  const fetchOrders = async (status: string = 'ALL') => {
    const { data } = await api.get(`/orders/status/${status}`);
    return data as Order[];
  };

  const fetchMyOrders = async () => {
    const { data } = await api.get('/orders/my');
    return data as Order[];
  };

  const fetchTables = async () => {
    const { data } = await api.get('/orders/tables');
    return data as Table[];
  };

  const createOrderMutation = useMutation({
    mutationFn: async (newOrder: { tableId: string; items: any[] }) => {
      const { data } = await api.post('/orders', newOrder);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/orders/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ id, method }: { id: string; method: string }) => {
      const { data } = await api.patch(`/orders/${id}/pay`, { method });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  const revertPaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/orders/${id}/revert-payment`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  return {
    fetchOrders,
    fetchMyOrders,
    fetchTables,
    createOrder: createOrderMutation.mutateAsync,
    updateOrderStatus: updateOrderStatusMutation.mutateAsync,
    confirmPayment: confirmPaymentMutation.mutateAsync,
    revertPayment: revertPaymentMutation.mutateAsync,
    isCreating: createOrderMutation.isPending,
    isUpdating: updateOrderStatusMutation.isPending,
    isPaying: confirmPaymentMutation.isPending,
    isReverting: revertPaymentMutation.isPending,
  };
};

export const useMenu = () => {
  const fetchMenu = async () => {
    const { data } = await api.get('/menu/items');
    return data as MenuItem[];
  };

  const fetchHierarchicalMenu = async () => {
    const { data } = await api.get('/menu/menus');
    return data as Menu[];
  };

  const fetchCategories = async () => {
    const { data } = await api.get('/menu/categories');
    return data as Category[];
  };

  const fetchSubCategories = async () => {
    const { data } = await api.get('/menu/subcategories');
    return data as SubCategory[];
  };

  return { 
    fetchMenu, 
    fetchHierarchicalMenu, 
    fetchCategories, 
    fetchSubCategories 
  };
};
