import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { cn } from './lib/utils';
import TeamView from './components/TeamView';
import ReportView from './components/ReportView';

function App() {
  const [activeMenu, setActiveMenu] = useState('HOME');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    axios.get('/api/org-data').then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(console.error);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading || !data) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>;
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      {/* Sidebar Menu */}
      <div className="w-64 bg-white border-r flex flex-col shadow-sm shrink-0">
        <div className="p-4 border-b text-center">
           <h1 className="font-bold text-lg text-blue-800">Trang chủ</h1>
        </div>
        <div className="p-2 font-bold text-sm text-gray-800 uppercase mt-2 pl-4">MENU</div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1 text-sm font-medium">
          
          <button 
            onClick={() => setActiveMenu('ALL')}
            className={cn("w-full text-left px-3 py-2.5 rounded-lg transition mt-2", activeMenu === 'ALL' ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100")}
          >
            Toàn đơn vị
          </button>

          {data.teams.map((t:any) => (
             <button 
                key={t.id}
                onClick={() => setActiveMenu(`TEAM_${t.id}`)}
                className={cn("w-full text-left px-3 py-2.5 rounded-lg transition", activeMenu === `TEAM_${t.id}` ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100")}
             >
                {t.name}
             </button>
          ))}

          <button 
            onClick={() => setActiveMenu('REPORT')}
            className={cn("w-full text-left px-3 py-2.5 rounded-lg transition mt-4 mb-4", activeMenu === 'REPORT' ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100")}
          >
            Tổng hợp – báo cáo
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-white p-10">
         {activeMenu === 'HOME' && (
           <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold uppercase mb-8 text-center text-gray-800 tracking-wide">XÉT HỆ SỐ THÀNH TÍCH HẰNG THÁNG</h2>
              <div className="border border-gray-800 shadow-sm">
                 <div className="p-3 bg-gray-100 border-b border-gray-800 font-bold">Nơi hiển thị các hướng dẫn</div>
                 <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-800">
                        <th className="p-3 border-r border-gray-800 font-bold w-1/3 text-left">Kết quả chấm điểm KPI của đơn vị</th>
                        <th className="p-3 font-bold text-left">Tỷ lệ tối đa kết quả đánh giá cá nhân được phê duyệt</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-800">
                        <td className="p-3 border-r border-gray-800 font-bold">1. Hoàn thành xuất sắc nhiệm vụ</td>
                        <td className="p-3 leading-relaxed text-gray-700">
                          Tỷ lệ cá nhân được đánh giá loại A ≤ 15%; B &lt; 50%; C: Còn lại; xếp theo thứ tự điểm chấm KPI cá nhân từ cao xuống thấp.<br/>
                          - Bộ phận có số lượng CBCNV xếp loại A &lt; 1 người được xét tối đa 1 người.
                        </td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="p-3 border-r border-gray-800 font-bold">2. Hoàn thành tốt nhiệm vụ</td>
                        <td className="p-3 leading-relaxed text-gray-700">
                          Tỷ lệ cá nhân được đánh giá loại A ≤ 10%; B &lt; 40%; C: Còn lại; xếp theo thứ tự điểm chấm KPI cá nhân từ cao xuống thấp.<br/>
                          - Bộ phận có số lượng CBCNV xếp loại A &lt; 1 người được xét tối đa 1 người.
                        </td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="p-3 border-r border-gray-800 font-bold">3. Hoàn thành nhiệm vụ</td>
                        <td className="p-3 leading-relaxed text-gray-700">
                          Tỷ lệ cá nhân được đánh giá loại A ≤ 5%; B &lt; 30%; C: Còn lại; D ≥ 10%; xếp theo thứ tự điểm chấm KPI cá nhân từ cao xuống thấp.<br/>
                           <span className="italic text-gray-500">Tỷ lệ D1, D2, D3 do đơn vị tự xét phù hợp với quy định..</span>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="p-3 border-r border-gray-800 font-bold">4. Không hoàn thành nhiệm vụ</td>
                        <td className="p-3 leading-relaxed text-gray-700">
                          Tỷ lệ cá nhân được đánh giá loại A: Không; B: &lt; 20%; C: Còn lại; D ≥ 20%; xếp theo thứ tự điểm chấm KPI cá nhân từ cao xuống thấp.<br/>
                          <span className="italic text-gray-500">Tỷ lệ D1, D2, D3 do đơn vị tự xét phù hợp với quy định.</span>
                        </td>
                      </tr>
                    </tbody>
                 </table>
                 <div className="p-4 text-sm leading-relaxed italic text-gray-700 border-t border-gray-800">
                   * Riêng các bộ phận trong đơn vị (phòng ban đội...) số lượng cá nhân đưa vào tính tỷ lệ bao gồm cả trưởng bộ phận. Số lượng CBCNV trong đơn vị và từng bộ phận được tính tại thời điểm ngày cuối tháng đánh giá, có tên trên HRMS.<br/>
                   <br/>
                   * Nguyên tắc làm tròn:<br/>
                   - Số lượng cá nhân xếp loại A và B được làm tròn theo nguyên tắc: &lt;1,5 làm tròn thành 1; ≥ 1,5 làm tròn thành 2.<br/>
                   - Đối với trường hợp đơn vị xếp loại "Hoàn thành nhiệm vụ" hoặc "Không hoàn thành nhiệm vụ", số lượng cá nhân xếp loại D được làm tròn lên để đảm bảo tỷ lệ quy định (1,1 làm tròn thành 2).<br/>
                   Đơn vị được xếp loại 1, 2 tuy nhiên nếu có cá nhân vi phạm các tiêu chí vào khung xếp loại D thì cá nhân vẫn bị xếp loại D theo quy định. Tỷ lệ % cá nhân xếp loại A, B không tính số lượng cá nhân xếp loại D này.
                 </div>
              </div>
           </div>
         )}

         {activeMenu === 'ALL' && <TeamView data={data} mode="ALL" onRefresh={fetchData} />}
         
         {activeMenu.startsWith('TEAM_') && (
            <TeamView data={data} mode="TEAM" teamId={parseInt(activeMenu.split('_')[1])} onRefresh={fetchData} />
         )}

         {activeMenu === 'REPORT' && (
            <ReportView data={data}/>
         )}

      </main>
    </div>
  );
}

export default App;
