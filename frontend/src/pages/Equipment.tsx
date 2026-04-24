import React, { useState, useEffect } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Briefcase, Plus, Search, Package, MapPin, Tag } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  status: string;
  centerId: string;
  center: { name: string };
  serialNumber?: string;
  quantity: number;
  notes?: string;
}

export const Equipment: React.FC = () => {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [centers, setCenters] = useState<any[]>([]);
  const [centerFilter, setCenterFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const { currentUser } = useAuthStore();
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Electronics',
    status: 'active',
    serialNumber: '',
    centerId: '',
    quantity: 1,
    notes: ''
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEquipment();
    }, 300);
    return () => clearTimeout(timer);
  }, [centerFilter, searchQuery, categoryFilter]);

  useEffect(() => {
    if (currentUser?.role === 'super_admin' || currentUser?.role === 'tech_admin') {
      fetchCenters();
    }
  }, []);

  const fetchCenters = async () => {
    try {
      const res = await api.get('/centers');
      setCenters(res.data.centers || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const res = await api.get('/equipment', {
        params: { 
          centerId: centerFilter || undefined,
          search: searchQuery || undefined,
          category: categoryFilter !== 'All Categories' ? categoryFilter : undefined
        }
      });
      setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/equipment', {
        ...formData,
        centerId: formData.centerId || currentUser?.centerIds[0]
      });
      setIsModalOpen(false);
      setFormData({ name: '', category: 'Electronics', status: 'active', serialNumber: '', centerId: '', quantity: 1, notes: '' });
      fetchEquipment();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && items.length === 0) return <PageWrapper title="Equipment"><LoadingSpinner /></PageWrapper>;

  return (
    <PageWrapper title="Equipment Inventory">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Equipment Management</h1>
          <p className="text-neutral-500">Track and manage center equipment and assets</p>
        </div>
        <Button variant="primary" className="flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Add Equipment
        </Button>
      </div>

      <Card className="p-4 mb-6">
         <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
               <Input 
                 className="pl-10" 
                 placeholder="Search equipment by name or serial number..." 
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
               />
            </div>
            <div className="flex flex-wrap items-center gap-4">
               {(currentUser?.role === 'super_admin' || currentUser?.role === 'tech_admin') && (
                 <select 
                   className="px-4 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                   value={centerFilter}
                   onChange={e => setCenterFilter(e.target.value)}
                 >
                    <option value="">All Centers</option>
                    {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
               )}
               <select 
                 className="px-4 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                 value={categoryFilter}
                 onChange={e => setCategoryFilter(e.target.value)}
               >
                  <option>All Categories</option>
                  <option>Electronics</option>
                  <option>Furniture</option>
                  <option>Sports</option>
                  <option>Educational</option>
                  <option>Consumables</option>
               </select>
            </div>
         </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.length === 0 ? (
          <div className="lg:col-span-3 py-20 text-center bg-white rounded-2xl border border-dashed border-neutral-200">
             <div className="w-16 h-16 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 mx-auto mb-4">
                <Package size={32} />
             </div>
             <h3 className="text-lg font-medium text-neutral-900">No equipment found</h3>
             <p className="text-neutral-500 mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          items.map(item => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow border-neutral-100">
               <div className="h-2 bg-primary/10 w-full" />
               <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                     <h3 className="font-bold text-lg text-neutral-900">{item.name}</h3>
                     <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                     }`}>
                        {item.status}
                     </span>
                  </div>
                  
                  <div className="space-y-2">
                     <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <Tag size={14} className="text-neutral-400" />
                        <span className="font-medium">Category:</span> {item.category}
                     </div>
                     <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <MapPin size={14} className="text-neutral-400" />
                        <span className="font-medium">Center:</span> {item.center?.name || 'Local Center'}
                     </div>
                     <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <Package size={14} className="text-neutral-400" />
                        <span className="font-medium">Quantity:</span> {item.quantity}
                     </div>
                     {item.serialNumber && (
                        <div className="flex items-center gap-2 text-sm text-neutral-600">
                           <Briefcase size={14} className="text-neutral-400" />
                           <span className="font-medium">S/N:</span> {item.serialNumber}
                        </div>
                     )}
                  </div>

                  <div className="mt-6 flex gap-2">
                     <Button variant="secondary" className="flex-1 text-xs py-2">History</Button>
                     <Button variant="ghost" className="flex-1 text-xs py-2 border border-neutral-100">Update</Button>
                  </div>
               </div>
            </Card>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Equipment"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Equipment Name</label>
            <Input
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="E.g., HP Laptop, Projector Screen..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
               <select 
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
               >
                  <option>Electronics</option>
                  <option>Furniture</option>
                  <option>Sports</option>
                  <option>Educational</option>
                  <option>Consumables</option>
               </select>
            </div>
            <div>
               <label className="block text-sm font-medium text-neutral-700 mb-1">Quantity</label>
               <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
               />
            </div>
          </div>
          <div>
             <label className="block text-sm font-medium text-neutral-700 mb-1">Serial Number / Asset ID (Optional)</label>
             <Input
                value={formData.serialNumber}
                onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                placeholder="E.g., TAG-2024-001"
             />
          </div>
          <div>
             <label className="block text-sm font-medium text-neutral-700 mb-1">Notes / Description</label>
             <textarea
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={3}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Details about condition, purchase info, etc."
             />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Add Item</Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
};
