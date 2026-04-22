import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, ChevronRight } from 'lucide-react';

export default function Dashboard({ onSelectPeriod, userRole }: { onSelectPeriod: (id: number) => void, userRole: string }) {
  const [periods, setPeriods] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  
  // New Period Form
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [unitRating, setUnitRating] = useState('A');

  useEffect(() => {
    fetchPeriods();
  }, [userRole]);

  const fetchPeriods = async () => {
    try {
      const res = await axios.get('/api/periods');
      setPeriods(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/periods', { month, year, unit_rating: unitRating });
      setShowCreate(false);
      fetchPeriods();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Lỗi tạo mới');
    }
  };

  const getStatusColor = (status: string) => {
    const map: any = {
      'SETUP': 'bg-gray-100 text-gray-800',
      'RATING': 'bg-blue-100 text-blue-800',
      'ENTRY': 'bg-amber-100 text-amber-800',
      'APPROVAL': 'bg-purple-100 text-purple-800',
      'LOCKED': 'bg-green-100 text-green-800',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-900">Danh sách Kỳ Xếp Loại</h3>
        {userRole === 'ADMIN' && (
          <button 
            onClick={() => setShowCreate(!showCreate)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Tạo kỳ mới
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl border shadow-sm flex items-end gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Tháng</label>
            <input type="number" min="1" max="12" value={month} onChange={e=>setMonth(Number(e.target.value))} className="w-24 block border-gray-300 rounded-md shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Năm</label>
            <input type="number" min="2020" max="2100" value={year} onChange={e=>setYear(Number(e.target.value))} className="w-32 block border-gray-300 rounded-md shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Xếp loại khối/đơn vị</label>
            <select value={unitRating} onChange={e=>setUnitRating(e.target.value)} className="w-32 block border-gray-300 rounded-md shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
              {['A','B','C','D'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="pt-6">
            <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800">Xác nhận tạo</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="p-4 text-sm font-semibold text-slate-600">Thời gian</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Loại Đơn Vị</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Trạng thái</th>
              <th className="p-4 text-right text-sm font-semibold text-slate-600">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {periods.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">Chưa có kỳ nào. Hãy tạo mới.</td></tr>
            )}
            {periods.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onSelectPeriod(p.id)}>
                <td className="p-4 font-medium text-gray-900">Tháng {p.month} / {p.year}</td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Hạng {p.unit_rating}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(p.status)}`}>
                    {p.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
