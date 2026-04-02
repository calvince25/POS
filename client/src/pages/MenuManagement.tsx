import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Camera, 
  X, 
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  ListTree,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SERVER_URL = 'http://localhost:5000'; // Base URL for uploaded images

const MenuManagement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'menus' | 'categories' | 'subcategories' | 'items'>('items');
  
  // Modal States
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [editingInventoryItem, setEditingInventoryItem] = useState<any>(null);
  const [inventoryForm, setInventoryForm] = useState({ stock: 0, unit: 'pcs' });
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);

  // Edit States
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<any>(null);
  const [editingMenu, setEditingMenu] = useState<any>(null);

  const [search, setSearch] = useState('');
  
  // Refs
  const catFileRef = useRef<HTMLInputElement>(null);
  const subCatFileRef = useRef<HTMLInputElement>(null);
  const itemFileRef = useRef<HTMLInputElement>(null);

  // Modifiers state for editingItem
  const [itemModifiers, setItemModifiers] = useState<{name: string, price: number}[]>([]);

  // Queries
  const { data: menus } = useQuery({ 
    queryKey: ['menus'], 
    queryFn: () => api.get('/menu/menus').then(res => res.data) 
  });
  
  const { data: categories } = useQuery({ 
    queryKey: ['categories'], 
    queryFn: () => api.get('/menu/categories').then(res => res.data) 
  });

  const { data: subCategories } = useQuery({ 
    queryKey: ['subcategories'], 
    queryFn: () => api.get('/menu/subcategories').then(res => res.data) 
  });

  const { data: items } = useQuery({ 
    queryKey: ['menu-items'], 
    queryFn: () => api.get('/menu/items').then(res => res.data) 
  });

  // Mutations - Menus
  const saveMenuMutation = useMutation({
    mutationFn: (data: any) => editingMenu ? api.put(`/menu/menus/${editingMenu.id}`, data) : api.post('/menu/menus', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['menus'] }); setIsMenuModalOpen(false); }
  });

  const deleteMenuMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/menu/menus/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menus'] }),
  });

  // Mutations - Categories
  const saveCategoryMutation = useMutation({
    mutationFn: (formData: FormData) => 
      editingCategory 
        ? api.put(`/menu/categories/${editingCategory.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }) 
        : api.post('/menu/categories', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); setIsCategoryModalOpen(false); }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/menu/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  // Mutations - SubCategories
  const saveSubCategoryMutation = useMutation({
    mutationFn: (formData: FormData) => 
      editingSubCategory 
        ? api.put(`/menu/subcategories/${editingSubCategory.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }) 
        : api.post('/menu/subcategories', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subcategories'] }); setIsSubCategoryModalOpen(false); }
  });

  const deleteSubCategoryMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/menu/subcategories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subcategories'] }),
  });

  // Mutations - Items
  const saveItemMutation = useMutation({
    mutationFn: (formData: FormData) => 
      editingItem 
        ? api.put(`/menu/items/${editingItem.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }) 
        : api.post('/menu/items', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      setIsItemModalOpen(false);
      setEditingItem(null);
      setItemModifiers([]);
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to save item.')
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/menu/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu-items'] }),
  });

  const saveInventoryMutation = useMutation({
    mutationFn: (data: any) => api.post(`/inventory/replenish/${data.menuItemId}`, {
      amount: data.stock,
      unit: data.unit,
      isAllocation: true
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-inventory'] });
      setIsInventoryModalOpen(false);
      setEditingInventoryItem(null);
    }
  });

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${SERVER_URL}${path}`;
  };

  const openItemModal = (item: any = null) => {
    setEditingItem(item);
    setItemModifiers(item?.modifiers || []);
    setIsItemModalOpen(true);
  };

  const handleModifierChange = (index: number, field: 'name' | 'price', value: string | number) => {
    const updated = [...itemModifiers];
    updated[index] = { ...updated[index], [field]: field === 'price' ? Number(value) : value };
    setItemModifiers(updated);
  };

  const addModifier = () => setItemModifiers([...itemModifiers, { name: '', price: 0 }]);
  const removeModifier = (index: number) => setItemModifiers(itemModifiers.filter((_, i) => i !== index));

  const filteredItems = items?.filter((item: any) => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    item.category?.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.subCategory?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E5E7EB] pb-2">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-black text-[#1F2937] tracking-tight">Menu Management</h1>
            <p className="text-sm font-medium text-[#9CA3AF]">Organize your catalog hierarchy and options with precision</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'menus', label: 'Menus', icon: LayoutGrid },
              { id: 'categories', label: 'Categories', icon: Layers },
              { id: 'subcategories', label: 'Sub-Categories', icon: ListTree },
              { id: 'items', label: 'Menu Items', icon: Tag },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-2.5 text-xs font-black uppercase tracking-[0.15em] border-b-4 transition-all flex items-center gap-2 ${activeTab === tab.id ? 'border-[#2271b1] text-[#2271b1] bg-white rounded-t-lg' : 'border-transparent text-slate-400 hover:text-[#2271b1]'}`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="pb-4">
          <button 
            onClick={() => {
              if (activeTab === 'menus') { setEditingMenu(null); setIsMenuModalOpen(true); }
              if (activeTab === 'categories') { setEditingCategory(null); setIsCategoryModalOpen(true); }
              if (activeTab === 'subcategories') { setEditingSubCategory(null); setIsSubCategoryModalOpen(true); }
              if (activeTab === 'items') openItemModal();
            }}
            className="bg-[#2271b1] hover:bg-[#135e96] text-white flex items-center gap-2 px-6 py-3 text-xs font-black shadow-lg shadow-blue-200 transition-all rounded-md uppercase tracking-widest"
          >
            <Plus size={18} />
            {activeTab === 'menus' ? 'New Menu' : activeTab === 'categories' ? 'Add Category' : activeTab === 'subcategories' ? 'Add Sub-Category' : 'Add New Item'}
          </button>
        </div>
      </div>

      {/* Content Rendering based on Tab */}
      {activeTab === 'menus' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {menus?.map((m: any) => (
            <div key={m.id} className="bg-white border border-[#E5E7EB] p-6 rounded-lg group hover:border-[#2271b1] transition-all shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded flex items-center justify-center text-[#2271b1] mb-2"><LayoutGrid size={24} /></div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => { setEditingMenu(m); setIsMenuModalOpen(true); }} className="p-2 text-[#2271b1] hover:bg-blue-50 rounded"><Edit size={16} /></button>
                  <button onClick={() => { if(confirm('Delete menu?')) deleteMenuMutation.mutate(m.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                </div>
              </div>
              <h3 className="font-bold text-sm text-[#1d2327] uppercase tracking-tight">{m.name}</h3>
              <p className="text-[11px] text-[#646970] line-clamp-2 mt-2 font-medium">{m.description || 'No description provided.'}</p>
              <div className="mt-6 flex items-center gap-2">
                 <span className="text-[9px] font-black bg-[#2271b1] text-white px-2 py-0.5 rounded-sm uppercase tracking-widest">{(m.categories?.length || 0)} Categories</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories?.map((c: any) => (
            <div key={c.id} className="bg-white border border-[#E5E7EB] p-4 rounded-lg flex items-center justify-between shadow-sm hover:border-[#2271b1] transition-all group">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="w-14 h-14 bg-[#f6f7f7] border border-[#dcdcde] rounded flex items-center justify-center shrink-0 overflow-hidden">
                  {c.image ? <img src={getImageUrl(c.image)!} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-slate-300" />}
                </div>
                <div className="overflow-hidden">
                  <span className="font-bold text-sm text-[#1d2327] truncate block uppercase tracking-tight">{c.name}</span>
                  <span className="text-[9px] text-[#2271b1] font-black uppercase tracking-widest">MENU: {c.menu?.name || 'NONE'}</span>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => { setEditingCategory(c); setIsCategoryModalOpen(true); }} className="p-2 text-[#2271b1] hover:bg-blue-50 rounded"><Edit size={16} /></button>
                <button onClick={() => { if(confirm('Delete category?')) deleteCategoryMutation.mutate(c.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'subcategories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {subCategories?.map((s: any) => (
            <div key={s.id} className="bg-white border border-[#dcdcde] p-3 flex items-center justify-between shadow-sm hover:border-[#2271b1] transition-all group">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 bg-[#f6f7f7] border border-[#dcdcde] rounded-sm flex items-center justify-center shrink-0 overflow-hidden">
                  {s.image ? <img src={getImageUrl(s.image)!} className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-slate-400" />}
                </div>
                <div className="overflow-hidden">
                  <span className="font-bold text-[13px] text-[#1d2327] truncate block">{s.name}</span>
                  <span className="text-[9px] text-[#2271b1] font-bold uppercase tracking-tighter">Cat: {s.category?.name || 'None'}</span>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => { setEditingSubCategory(s); setIsSubCategoryModalOpen(true); }} className="p-1.5 text-[#2271b1] hover:bg-blue-50 rounded-sm"><Edit size={14} /></button>
                <button onClick={() => { if(confirm('Delete sub-category?')) deleteSubCategoryMutation.mutate(s.id); }} className="p-1.5 text-[#d63638] hover:bg-red-50 rounded-sm"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'items' && (
        <>
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search dishes, burgers, drinks..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-[#dcdcde] focus:border-[#2271b1] outline-none text-xs font-bold rounded-lg transition-all shadow-sm" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            <AnimatePresence>
              {filteredItems?.map((item: any) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-[#dcdcde] rounded-lg overflow-hidden group hover:border-[#2271b1] transition-all shadow-sm flex flex-col"
                >
                  <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                     {item.image ? (
                       <img src={getImageUrl(item.image)!} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={48} /></div>
                     )}
                     <div className="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-sm px-2 py-1 font-black text-[9px] text-[#2271b1] shadow-sm uppercase">
                        KES {item.price}
                     </div>
                  </div>
                  <div className="p-5 space-y-4 flex-1 flex flex-col">
                    <div>
                      <h3 className="font-bold text-[14px] text-[#1d2327] leading-tight truncate uppercase tracking-tight">{item.name}</h3>
                      <div className="flex gap-2 items-center mt-1.5">
                        <span className="text-[9px] font-black text-[#2271b1] uppercase tracking-widest">{item.category?.name || 'NO CAT'}</span>
                        {item.subCategory && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">/ {item.subCategory.name}</span>}
                      </div>
                    </div>
 
                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-[#f0f0f1]">
                       <div className="flex flex-col gap-1">
                         <span className={`px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest w-fit ${item.isAvailable ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-[#d63638] border border-red-100'}`}>
                          {item.isAvailable ? 'Live' : 'Hidden'}
                         </span>
                         <button 
                            onClick={() => {
                              setEditingInventoryItem(item);
                              setInventoryForm({ stock: item.inventory?.allocated || 0, unit: item.inventory?.unit || 'pcs' });
                              setIsInventoryModalOpen(true);
                            }}
                            className="text-[9px] font-black text-[#2271b1] hover:underline uppercase tracking-tighter mt-1"
                         >
                           {item.inventory ? `Qty: ${item.inventory.stock}/${item.inventory.allocated} ${item.inventory.unit}` : 'Setup Inventory'}
                         </button>
                       </div>
                       <div className="flex gap-2">
                        <button onClick={() => openItemModal(item)} className="p-2 text-[#2271b1] bg-blue-50 rounded hover:bg-[#2271b1] hover:text-white transition-all"><Edit size={14} /></button>
                        <button onClick={() => { if(confirm('Delete item?')) deleteItemMutation.mutate(item.id); }} className="p-2 text-red-500 bg-red-50 rounded hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14} /></button>
                       </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Menu Modal */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1F2937]/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-sm rounded shadow-2xl overflow-hidden">
            <div className="bg-[#2271b1] p-5 flex justify-between items-center text-white">
              <h2 className="font-bold uppercase tracking-widest text-xs">{editingMenu ? 'Edit Menu' : 'New Menu'}</h2>
              <button onClick={() => setIsMenuModalOpen(false)} className="hover:rotate-90 transition-transform"><X size={18} /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              saveMenuMutation.mutate({ name: f.get('name'), description: f.get('description') });
            }} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Menu Name</label>
                <input name="name" defaultValue={editingMenu?.name} className="w-full px-4 py-2.5 bg-white border border-[#dcdcde] rounded text-sm font-bold focus:border-[#2271b1] outline-none transition-all" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                <textarea name="description" defaultValue={editingMenu?.description} className="w-full px-4 py-2.5 bg-white border border-[#dcdcde] rounded text-sm font-bold focus:border-[#2271b1] outline-none h-24 resize-none transition-all" />
              </div>
              <button type="submit" className="w-full bg-[#2271b1] hover:bg-[#135e96] text-white py-3 rounded font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 transition-all">
                {saveMenuMutation.isPending ? 'Saving...' : 'Save Menu'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1F2937]/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-sm rounded shadow-2xl overflow-hidden">
            <div className="bg-[#2271b1] p-5 flex justify-between items-center text-white">
              <h2 className="font-bold uppercase tracking-widest text-xs">{editingCategory ? 'Edit Category' : 'New Category'}</h2>
              <button onClick={() => setIsCategoryModalOpen(false)} className="hover:rotate-90 transition-transform"><X size={18} /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              saveCategoryMutation.mutate(new FormData(e.currentTarget));
            }} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category Name</label>
                <input name="name" defaultValue={editingCategory?.name} className="w-full px-4 py-2.5 bg-white border border-[#dcdcde] rounded text-sm font-bold focus:border-[#2271b1] outline-none transition-all" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parent Menu</label>
                <select name="menuId" defaultValue={editingCategory?.menuId} className="w-full px-4 py-2.5 bg-white border border-[#dcdcde] rounded text-sm font-bold focus:border-[#2271b1] outline-none transition-all appearance-none">
                  <option value="">None (Standalone)</option>
                  {menus?.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category Image</label>
                <input type="file" name="image" ref={catFileRef} className="hidden" accept="image/*" />
                <button type="button" onClick={() => catFileRef.current?.click()} className="w-full border-2 border-dashed border-[#dcdcde] py-6 rounded text-[10px] font-black flex items-center justify-center gap-2 text-slate-400 hover:border-[#2271b1] hover:text-[#2271b1] transition-all bg-slate-50 uppercase tracking-widest"><Camera size={16} /> Choose Image</button>
              </div>
              <button type="submit" className="w-full bg-[#2271b1] hover:bg-[#135e96] text-white py-3 rounded font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 transition-all">
                {saveCategoryMutation.isPending ? 'Saving...' : 'Save Category'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Sub-Category Modal */}
      {isSubCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1F2937]/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-sm rounded shadow-2xl overflow-hidden">
            <div className="bg-[#2271b1] p-5 flex justify-between items-center text-white">
              <h2 className="font-bold uppercase tracking-widest text-xs">{editingSubCategory ? 'Edit Sub-Category' : 'New Sub-Category'}</h2>
              <button onClick={() => setIsSubCategoryModalOpen(false)} className="hover:rotate-90 transition-transform"><X size={18} /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              saveSubCategoryMutation.mutate(new FormData(e.currentTarget));
            }} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sub-Category Name</label>
                <input name="name" defaultValue={editingSubCategory?.name} className="w-full px-4 py-2.5 bg-white border border-[#dcdcde] rounded text-sm font-bold focus:border-[#2271b1] outline-none transition-all" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parent Category</label>
                <select name="categoryId" defaultValue={editingSubCategory?.categoryId} className="w-full px-4 py-2.5 bg-white border border-[#dcdcde] rounded text-sm font-bold focus:border-[#2271b1] outline-none transition-all appearance-none" required>
                  <option value="" disabled>Select category...</option>
                  {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sub-Category Image</label>
                <input type="file" name="image" ref={subCatFileRef} className="hidden" accept="image/*" />
                <button type="button" onClick={() => subCatFileRef.current?.click()} className="w-full border-2 border-dashed border-[#dcdcde] py-6 rounded text-[10px] font-black flex items-center justify-center gap-2 text-slate-400 hover:border-[#2271b1] hover:text-[#2271b1] transition-all bg-slate-50 uppercase tracking-widest"><Camera size={16} /> Choose Image</button>
              </div>
              <button type="submit" className="w-full bg-[#2271b1] hover:bg-[#135e96] text-white py-3 rounded font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 transition-all">
                {saveSubCategoryMutation.isPending ? 'Saving...' : 'Save Sub-Category'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white w-full max-w-2xl rounded shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#2271b1] text-white p-6 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest">{editingItem ? 'Edit MenuItem' : 'Create MenuItem'}</h2>
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-0.5">Refine your public catalog</p>
              </div>
              <button onClick={() => setIsItemModalOpen(false)} className="hover:rotate-90 transition-transform focus:outline-none"><X size={20} /></button>
            </div>
 
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              fd.append('modifiers', JSON.stringify(itemModifiers));
              saveItemMutation.mutate(fd);
            }} className="p-8 overflow-y-auto space-y-8 custom-scrollbar bg-white">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Image</label>
                  <input type="file" name="image" ref={itemFileRef} className="hidden" accept="image/*" />
                  <button type="button" onClick={() => itemFileRef.current?.click()} className="w-full border-2 border-dashed border-[#dcdcde] py-4 rounded text-[10px] font-black flex items-center justify-center gap-2 text-slate-400 hover:border-[#2271b1] hover:text-[#2271b1] transition-all bg-slate-50 uppercase tracking-widest">
                    <Camera size={16} /> {editingItem?.image ? 'Change Image' : 'Add Image'}
                  </button>
                </div>
                <div className="space-y-1.5 opacity-50 cursor-not-allowed">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preview</label>
                  <div className="h-[52px] bg-slate-100 rounded border border-[#dcdcde] flex items-center justify-center text-[9px] font-bold text-slate-400">
                    {editingItem?.image ? <img src={getImageUrl(editingItem.image)!} className="h-full object-contain" /> : 'No image'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name</label>
                  <input name="name" defaultValue={editingItem?.name} className="w-full px-4 py-2.5 bg-white border border-[#dcdcde] rounded text-sm font-bold focus:border-[#2271b1] outline-none transition-all" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Price (KES)</label>
                  <input name="price" type="number" step="0.01" defaultValue={editingItem?.price} className="w-full px-4 py-2.5 bg-white border border-[#dcdcde] rounded text-sm font-bold focus:border-[#2271b1] outline-none transition-all" required />
                </div>
              </div>
 
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                  <select name="categoryId" defaultValue={editingItem?.categoryId} className="w-full px-4 py-2.5 bg-white border border-[#dcdcde] rounded text-sm font-bold focus:border-[#2271b1] outline-none transition-all appearance-none">
                    <option value="">None</option>
                    {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sub-Category</label>
                  <select name="subCategoryId" defaultValue={editingItem?.subCategoryId} className="w-full px-4 py-2.5 bg-white border border-[#dcdcde] rounded text-sm font-bold focus:border-[#2271b1] outline-none transition-all appearance-none">
                    <option value="">None</option>
                    {subCategories?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
 
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                <textarea name="description" defaultValue={editingItem?.description} className="w-full px-4 py-2.5 bg-white border border-[#dcdcde] rounded text-sm font-bold focus:border-[#2271b1] outline-none h-24 resize-none transition-all" />
              </div>
 
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modifiers / Options</label>
                  <button type="button" onClick={addModifier} className="text-[10px] font-black text-[#2271b1] hover:underline flex items-center gap-1 uppercase tracking-widest"><Plus size={12} /> Add Option</button>
                </div>
                <div className="space-y-3">
                  {itemModifiers.map((mod, idx) => (
                    <div key={idx} className="flex gap-3 items-center bg-slate-50 p-3 rounded border border-[#dcdcde] animate-in slide-in-from-left-2 transition-all">
                      <input placeholder="Name (e.g. Large)" value={mod.name} onChange={(e) => handleModifierChange(idx, 'name', e.target.value)} className="flex-1 px-3 py-2 bg-white border border-[#dcdcde] rounded text-[11px] font-bold outline-none focus:border-[#2271b1]" required />
                      <input placeholder="Ex. Price" type="number" value={mod.price} onChange={(e) => handleModifierChange(idx, 'price', e.target.value)} className="w-24 px-3 py-2 bg-white border border-[#dcdcde] rounded text-[11px] font-bold outline-none focus:border-[#2271b1]" />
                      <button type="button" onClick={() => removeModifier(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"><X size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
 
              <div className="flex items-center gap-4 py-2">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input name="isAvailable" type="checkbox" defaultChecked={editingItem ? editingItem.isAvailable : true} id="item_avail" className="sr-only peer" />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2271b1]"></div>
                  <label htmlFor="item_avail" className="ml-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Visible in Menu</label>
                </div>
              </div>
 
              <div className="flex gap-4 pt-6 sticky bottom-0 bg-white">
                <button type="button" onClick={() => setIsItemModalOpen(false)} className="flex-1 py-3.5 text-xs font-black text-slate-400 border border-[#dcdcde] rounded uppercase tracking-widest hover:bg-slate-50 transition-all">Discard</button>
                <button type="submit" disabled={saveItemMutation.isPending} className="flex-1 bg-[#2271b1] text-white py-3.5 text-xs font-black uppercase tracking-widest rounded shadow-lg shadow-blue-100 hover:bg-[#135e96] transition-all disabled:opacity-50">
                  {saveItemMutation.isPending ? 'Publishing...' : (editingItem ? 'Update Item' : 'Publish to Menu')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
 
      {/* Inventory Allocation Modal */}
      {isInventoryModalOpen && (
        <div className="fixed inset-0 z-[111] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-xs rounded shadow-2xl overflow-hidden border border-[#dcdcde]">
            <div className="bg-[#2271b1] p-4 text-white flex justify-between items-center">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest">Inventory Assignment</h3>
                <p className="text-[13px] font-bold truncate mt-0.5 uppercase tracking-tight">{editingInventoryItem?.name}</p>
              </div>
              <button onClick={() => setIsInventoryModalOpen(false)} className="hover:rotate-90 transition-transform focus:outline-none"><X size={18} /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              saveInventoryMutation.mutate({
                menuItemId: editingInventoryItem.id,
                ...inventoryForm
              });
            }} className="p-6 space-y-5 bg-white">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Allocation</label>
                <input 
                  type="number" 
                  value={inventoryForm.stock} 
                  onChange={(e) => setInventoryForm({ ...inventoryForm, stock: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-white border border-[#dcdcde] rounded text-sm font-bold focus:border-[#2271b1] outline-none transition-all" 
                  required 
                />
                <p className="text-[9px] text-slate-400 font-bold uppercase italic tracking-tighter">Enter total available for today/shift</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit of Measure</label>
                <select 
                   value={inventoryForm.unit} 
                   onChange={(e) => setInventoryForm({ ...inventoryForm, unit: e.target.value })}
                   className="w-full px-4 py-2.5 bg-white border border-[#dcdcde] rounded text-sm font-bold focus:border-[#2271b1] outline-none appearance-none"
                >
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="ml">Milliliters (ml)</option>
                  <option value="portion">Portions</option>
                  <option value="bottle">Bottles</option>
                </select>
              </div>
              <button 
                type="submit" 
                disabled={saveInventoryMutation.isPending}
                className="w-full bg-[#2271b1] hover:bg-[#135e96] text-white py-3 rounded font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 transition-all disabled:opacity-50"
              >
                {saveInventoryMutation.isPending ? 'Syncing...' : 'Update Inventory'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;
