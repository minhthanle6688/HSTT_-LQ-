import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Save, ShieldCheck, Lock, Play, Filter, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { VALID_COEFS } from '../App';

export default function PeriodDetail({ periodId, userRole, onBack }: { periodId: number, userRole: string, onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [evals, setEvals] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'SETUP' | 'RATING' | 'ENTRY' | 'APPROVAL' | 'REPORT'>('SETUP');
  
  // Realtime entry state (temporary memory before save)
  const [entryDrafts, setEntryDrafts] = useState<Record<number, any>>({});
  
  useEffect(() => {
    fetchData();
  }, [periodId]);

  const fetchData = async () => {
    try {
      const res = await axios.get(`/api/periods/${periodId}`);
      setData(res.data);
      const evalsRes = await axios.get(`/api/periods/${periodId}/evaluations`);
      setEvals(evalsRes.data);
      if (res.data.period.status) setActiveTab(res.data.period.status);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await axios.put(`/api/periods/${periodId}/status`, { status: newStatus });
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi'); }
  };

  const handleTeamRatingChange = async (tpId: number, rating: string) => {
    if (data.period.status !== 'RATING') return alert('Chỉ được sửa trong giai đoạn Xét Loại Tổ');
    try {
      await axios.put(`/api/team-periods/${tpId}`, { team_rating: rating });
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi'); }
  };

  const handleGenerateQuota = async () => {
    try {
      await axios.post(`/api/periods/${periodId}/generate-quota`);
      alert('Đã tính toán quota thành công!');
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi khi tính quota'); }
  };

  // Quota Visualization Helper
  const getQuotaDisplay = (teamId: number | null, coef: number) => {
    if (!data.quotas) return { max: 0, used: 0 };
    const quota = data.quotas.find((q:any) => q.team_id === teamId && q.coef === coef);
    if (!quota) return null; // No quota limit for this coef

    // Calculate used
    let used = 0;
    if (teamId) {
      // Local check (proposed by team)
      used = evals.filter(e => e.team_id === teamId && e.proposed_coef === coef).length;
      // Add unsaved drafts
      Object.keys(entryDrafts).forEach(evalId => {
        const ev = evals.find(e => e.id === Number(evalId));
        if (ev && ev.team_id === teamId) {
           if (entryDrafts[Number(evalId)].proposed_coef === coef && ev.proposed_coef !== coef) used++;
           if (ev.proposed_coef === coef && entryDrafts[Number(evalId)].proposed_coef !== coef) used--;
        }
      });
    } else {
      // Global check (approved by council)
      used = evals.filter(e => e.approved_coef === coef).length;
    }

    return { max: quota.max_count, used };
  };

  const saveEvaluation = async (evalId: number, side: 'proposed' | 'approved') => {
    try {
       const updates = entryDrafts[evalId];
       if (!updates) return;

       if (side === 'approved' && updates.approved_coef && updates.approved_coef !== evals.find(e=>e.id===evalId).proposed_coef) {
           const reason = prompt('Hệ số duyệt KHÁC với đề xuất. Vui lòng nhập lý do bắt buộc:');
           if (!reason) { alert('Hủy lưu vì không nhập lý do.'); return; }
           updates.reason = reason;
       }

       await axios.put(`/api/evaluations/${evalId}`, updates);
       
       // Clear draft
       const newDrafts = {...entryDrafts};
       delete newDrafts[evalId];
       setEntryDrafts(newDrafts);
       
       fetchData();
    } catch (e: any) {
        alert(e.response?.data?.error || 'Lỗi lưu dữ liệu');
    }
  };

  if (!data) return <div>Loading...</div>;
  const p = data.period;

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5"/></button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Kỳ Đánh Giá: Tháng {p.month}/{p.year}</h2>
              <div className="text-sm text-gray-500 flex gap-4 mt-1">
                <span>Khối xếp loại: <strong className="text-emerald-700">{p.unit_rating}</strong></span>
                <span>Trạng thái: <strong className="text-blue-700">{p.status}</strong></span>
              </div>
            </div>
         </div>
         <div className="flex gap-2">
            {(userRole === 'ADMIN' || userRole === 'HOI_DONG') && (
              <>
                {p.status === 'RATING' && <button onClick={() => handleStatusChange('SETUP')} className="text-gray-500 hover:bg-gray-100 px-3 py-2 rounded text-sm font-medium transition mr-2">« Quay lại Setup</button>}
                {p.status === 'ENTRY' && <button onClick={() => handleStatusChange('RATING')} className="text-gray-500 hover:bg-gray-100 px-3 py-2 rounded text-sm font-medium transition mr-2">« Quay lại Xét Tổ</button>}
                {p.status === 'APPROVAL' && <button onClick={() => handleStatusChange('ENTRY')} className="text-gray-500 hover:bg-gray-100 px-3 py-2 rounded text-sm font-medium transition mr-2">« Quay lại Nhập Liệu</button>}
                
                {p.status === 'SETUP' && <button onClick={() => handleStatusChange('RATING')} className="btn-primary">Chuyển sang Xét Tổ</button>}
                {p.status === 'RATING' && <button onClick={() => handleStatusChange('ENTRY')} className="btn-primary">Mở form nhập liệu</button>}
                {p.status === 'ENTRY' && <button onClick={() => handleStatusChange('APPROVAL')} className="btn-primary">Báo cáo lên Hội Đồng</button>}
                {p.status === 'APPROVAL' && <button onClick={() => handleStatusChange('LOCKED')} className="btn-danger flex gap-2"><Lock className="w-4 h-4"/> Khóa dữ liệu</button>}
                {p.status === 'LOCKED' && <button onClick={() => handleStatusChange('APPROVAL')} className="btn-secondary flex gap-2"><Lock className="w-4 h-4"/> Mở khóa</button>}
              </>
            )}
         </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border-b px-2">
         {['SETUP', 'RATING', 'ENTRY', 'APPROVAL', 'REPORT'].map(tab => (
           <button 
             key={tab} 
             onClick={() => setActiveTab(tab as any)}
             className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", 
                activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700")}
           >
             {tab === 'SETUP' && 'Cấu hình chung'}
             {tab === 'RATING' && 'Xét loại Tổ'}
             {tab === 'ENTRY' && 'Nhập Liệu Tổ'}
             {tab === 'APPROVAL' && 'Hội Đồng Duyệt'}
             {tab === 'REPORT' && 'Báo cáo xuất'}
           </button>
         ))}
      </div>

      {/* Content Area */}
      <div className="bg-white flex-1 overflow-auto rounded-xl shadow-sm border p-6">
         
         {/* RATING TAB */}
         {activeTab === 'RATING' && (
           <div className="max-w-3xl space-y-6">
              {p.status !== 'RATING' && (
                 <div className="bg-amber-50 text-amber-800 p-4 rounded text-sm font-medium border border-amber-200">
                    Trạng thái hiện tại của kỳ không phải là bước Xét Loại Tổ (hiện đang là <strong>{p.status}</strong>). Bạn chỉ có thể xét hạng khi kỳ đang ở trạng thái RATING. Nếu muốn sửa, vui lòng dùng nút <strong>"« Quay lại"</strong> ở góc trên bên phải.
                 </div>
              )}
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex items-start gap-3">
                 <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" />
                 <p className="text-sm">Vui lòng xét hạng cho từng tổ. Hạng của tổ không được vượt quá hạng của đơn vị ({p.unit_rating}). Sau đó, ấn <strong>Tính Toán Quota</strong> để chia chỉ tiêu trước khi cho phép Tổ Trưởng nhập liệu.</p>
              </div>

              <table className="w-full text-left">
                <thead><tr className="bg-gray-50"><th className="p-3">Tổ</th><th className="p-3">Hạng Hiện Tại</th><th className="p-3">Thay đổi</th></tr></thead>
                <tbody className="divide-y">
                   {data.team_periods.map((tp: any) => (
                      <tr key={tp.id}>
                        <td className="p-3 font-medium">{tp.name}</td>
                        <td className="p-3">{tp.team_rating || <span className="text-gray-400">Chưa xét</span>}</td>
                        <td className="p-3">
                           <select 
                             className="border rounded p-1.5 text-sm"
                             value={tp.team_rating || ''}
                             onChange={(e) => handleTeamRatingChange(tp.id, e.target.value)}
                             disabled={p.status !== 'RATING'}
                           >
                              <option value="">-- Chọn hạng --</option>
                              {['A','B','C','D'].map(r => <option key={r} value={r}>{r}</option>)}
                           </select>
                        </td>
                      </tr>
                   ))}
                </tbody>
              </table>

              {(userRole === 'ADMIN' || userRole === 'HOI_DONG') && (
                 <button onClick={handleGenerateQuota} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow font-medium flex items-center gap-2">
                    <Play className="w-4 h-4"/> Tính Toán Phân Bổ Quota
                 </button>
              )}
           </div>
         )}

         {/* ENTRY TAB (TỔ TRƯỞNG View usually) */}
         {activeTab === 'ENTRY' && (
            <div className="space-y-4">
               {userRole === 'TO_TRUONG' && p.status !== 'ENTRY' && (
                 <div className="bg-amber-50 text-amber-800 p-4 rounded">Hiện không trong giai đoạn nhập liệu.</div>
               )}
               
               <div className="flex gap-4 mb-4 flex-wrap">
                  {/* Realtime Quota display for Team (Assuming user sees their team's quota) */}
                  {[1.4, 1.2].map(coef => {
                     // Find team id if TO_TRUONG
                     const myTeamTp = data.team_periods.find((t:any) => t.leader_id === userRole); // simplified
                     const myEvals = evals; // It's already filtered by backend
                     if(myEvals.length===0) return null;
                     const teamId = myEvals[0].team_id;
                     
                     const qInfo = getQuotaDisplay(teamId, coef);
                     if (!qInfo) return null;
                     const isOver = qInfo.used > qInfo.max;

                     return (
                       <div key={coef} className={cn("px-4 py-2 rounded-lg border flex flex-col items-center min-w-32 shadow-sm font-medium", isOver ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-800")}>
                          <span className="text-xs uppercase mb-1">Quota HSTT {coef}</span>
                          <span className="text-xl font-bold">{qInfo.used} / {qInfo.max}</span>
                       </div>
                     )
                  })}
               </div>

               <table className="w-full text-left bg-white border">
                  <thead><tr className="bg-gray-50 border-b">
                     <th className="p-3 w-12 text-center">STT</th>
                     <th className="p-3">Mã NV</th>
                     <th className="p-3">Họ Tên</th>
                     <th className="p-3">Đề Xuất (Tổ)</th>
                     <th className="p-3">Thao tác</th>
                  </tr></thead>
                  <tbody className="divide-y">
                     {evals.map((e:any, idx) => (
                        <tr key={e.id} className="hover:bg-gray-50">
                           <td className="p-3 text-center text-gray-500">{idx+1}</td>
                           <td className="p-3 text-sm text-gray-600">{e.code}</td>
                           <td className="p-3 font-medium">{e.name}</td>
                           <td className="p-3">
                              <select 
                                className={cn("border rounded p-1.5 w-24 text-center font-medium", entryDrafts[e.id]?.proposed_coef ? "border-blue-500 bg-blue-50 text-blue-700" : "")}
                                value={entryDrafts[e.id]?.proposed_coef ?? e.proposed_coef ?? ''}
                                onChange={(evt) => setEntryDrafts({...entryDrafts, [e.id]: { ...entryDrafts[e.id], proposed_coef: parseFloat(evt.target.value) }})}
                                disabled={p.status !== 'ENTRY' || userRole !== 'TO_TRUONG'}
                              >
                                 <option value="">--</option>
                                 {VALID_COEFS.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                           </td>
                           <td className="p-3">
                             {(entryDrafts[e.id] && p.status === 'ENTRY' && userRole === 'TO_TRUONG') && (
                                <button onClick={() => saveEvaluation(e.id, 'proposed')} className="bg-blue-600 text-white p-1.5 rounded hover:bg-blue-700">
                                   <Save className="w-4 h-4"/>
                                </button>
                             )}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
         
         {/* APPROVAL TAB (HỘI ĐỒNG View) */}
         {activeTab === 'APPROVAL' && (
            <div className="space-y-4">
                 <div className="flex gap-4 mb-4 flex-wrap">
                  {/* Realtime Quota display for Global */}
                  {[1.4, 1.2].map(coef => {
                     const qInfo = getQuotaDisplay(null, coef);
                     if (!qInfo) return null;
                     const isOver = qInfo.used > qInfo.max;

                     return (
                       <div key={coef} className={cn("px-4 py-2 rounded-lg border flex flex-col items-center min-w-32 shadow-sm font-medium", isOver ? "bg-red-50 border-red-200 text-red-700" : "bg-purple-50 border-purple-200 text-purple-800")}>
                          <span className="text-xs uppercase mb-1">Toàn viện HSTT {coef}</span>
                          <span className="text-xl font-bold">{qInfo.used} / {qInfo.max}</span>
                       </div>
                     )
                  })}
               </div>
               
               <table className="w-full text-left bg-white border">
                  <thead><tr className="bg-gray-50 border-b">
                     <th className="p-3">Tổ</th>
                     <th className="p-3">HTên / Mã</th>
                     <th className="p-3 text-center">Đề Xuất</th>
                     <th className="p-3 text-center">HĐ Duyệt</th>
                     <th className="p-3">Lý do (Nếu khác)</th>
                     <th className="p-3 pt-4"></th>
                  </tr></thead>
                  <tbody className="divide-y text-sm">
                     {evals.map((e:any) => (
                        <tr key={e.id} className="hover:bg-gray-50">
                           <td className="p-3 font-medium text-gray-700">{e.team_name}</td>
                           <td className="p-3">
                              <div className="font-medium">{e.name}</div>
                              <div className="text-xs text-gray-500">{e.code}</div>
                           </td>
                           <td className="p-3 text-center font-bold text-blue-700 bg-blue-50/50">{e.proposed_coef ?? '-'}</td>
                           <td className="p-3 text-center">
                              <select 
                                className={cn("border rounded p-1 sm w-20 text-center font-bold", 
                                   (entryDrafts[e.id]?.approved_coef ?? e.approved_coef) !== e.proposed_coef ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200"
                                )}
                                value={entryDrafts[e.id]?.approved_coef ?? e.approved_coef ?? e.proposed_coef ?? ''}
                                onChange={(evt) => setEntryDrafts({...entryDrafts, [e.id]: { ...entryDrafts[e.id], approved_coef: parseFloat(evt.target.value) }})}
                                disabled={p.status !== 'APPROVAL' || (userRole !== 'HOI_DONG' && userRole !== 'ADMIN')}
                              >
                                 <option value="">--</option>
                                 {VALID_COEFS.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                           </td>
                           <td className="p-3 text-gray-600 max-w-[200px] truncate" title={e.reason}>{e.reason}</td>
                           <td className="p-3 text-right">
                             {(entryDrafts[e.id] && p.status === 'APPROVAL' && (userRole === 'HOI_DONG' || userRole === 'ADMIN')) && (
                                <button onClick={() => saveEvaluation(e.id, 'approved')} className="bg-purple-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-purple-700 flex items-center gap-1">
                                   Lưu HD
                                </button>
                             )}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}

         {/* REPORT TAB */}
         {activeTab === 'REPORT' && (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 border rounded-lg border-dashed">
               <FileText className="w-12 h-12 text-gray-400 mb-4" />
               <h3 className="text-lg font-bold text-gray-900 mb-2">Báo Cáo Tổng Hợp Đã Sẵn Sàng</h3>
               <p className="text-gray-500 mb-6 max-w-md">Dữ liệu tổng hợp xếp loại CBCNV của kỳ này và Phụ lục tháng theo Tổ đã được tạo. Bạn có thể xuất ra file Excel hoặc PDF để lưu trữ nội bộ.</p>
               <div className="flex gap-4">
                 <button className="btn-secondary" onClick={()=>alert('Demo: Đang tải xuống Excel')}>Xuất Excel (.xlsx)</button>
                 <button className="btn-secondary text-red-600 border-red-200 hover:bg-red-50" onClick={()=>alert('Demo: Đang tải xuống PDF')}>Xuất PDF</button>
               </div>
            </div>
         )}
      </div>
      
      {/* Global CSS for buttons in this context */}
      <style>{`
        .btn-primary { @apply bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-sm text-sm font-medium transition; }
        .btn-secondary { @apply bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded shadow-sm text-sm font-medium transition; }
        .btn-danger { @apply bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow-sm text-sm font-medium transition; }
      `}</style>
    </div>
  );
}
