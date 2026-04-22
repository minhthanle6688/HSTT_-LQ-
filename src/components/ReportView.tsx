import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileText, ClipboardList } from 'lucide-react';

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export default function ReportView({ data }: { data: any }) {
  const [selectedMonth, setSelectedMonth] = useState(12);
  const [summarizedMonth, setSummarizedMonth] = useState<number | null>(null);

  // Group reporting data by team
  const teams = data.teams;
  const emps = data.employees;
  
  // Create summary counts dynamically based on selected period
  const counts = { '1.4': 0, '1.2': 0, '1.0': 0, '0.9': 0, '0.5': 0 };
  let bld_12 = 0; // specific rule in the image for doi truong/doi pho 1.2
  
  if (summarizedMonth !== null) {
      emps.forEach((e:any) => {
         // Check selected month
         const v = e[`t${summarizedMonth}`]; 
         
         if (v === 1.4) counts['1.4']++;
         if (v === 1.2) {
             if (e.position === 'Đội trưởng' || e.position === 'Đội phó') bld_12++;
             else counts['1.2']++;
         }
         if (v === 1.0) counts['1.0']++;
         if (v && v <= 0.9 && v > 0.5) counts['0.9']++;
         if (v === 0.5) counts['0.5']++;
      });
  }

  const total = emps.length;

  const toLabel = (v: number) => {
      if (v >= 1.4) return 'Hoàn thành xuất sắc nhiệm vụ';
      if (v >= 1.2) return 'Hoàn thành tốt nhiệm vụ';
      if (v >= 1.0) return 'Hoàn thành nhiệm vụ';
      return 'Không hoàn thành nhiệm vụ';
  }

  const handleExportExcel = () => {
    // Flatten data for Excel
    const exportData: any[] = [];
    let index = 1;

    teams.forEach((t: any, tIndex: number) => {
      exportData.push({
        'STT': ROMAN_NUMERALS[tIndex],
        'Họ và tên': t.name.toUpperCase(),
        'Chức danh': '',
        'Tổ xét': '',
        'Tiêu ban TĐKT xét': '',
        'Tổ đánh giá': '',
        'Tiêu ban TĐKT đánh giá': ''
      });

      const teamEmps = emps.filter((e:any) => e.team_id === t.id);
      teamEmps.forEach((e:any) => {
         const val = e[`t${selectedMonth}`];
         const textVal = val ? val.toFixed(1).replace('.', ',') : '';
         const lbl = val ? toLabel(val) : '';
         
         exportData.push({
            'STT': index++,
            'Họ và tên': e.name,
            'Chức danh': e.position || '',
            'Tổ xét': textVal,
            'Tiêu ban TĐKT xét': textVal,
            'Tổ đánh giá': lbl,
            'Tiêu ban TĐKT đánh giá': lbl
         });
      });
    });

    // Add empty row
    exportData.push({});
    // Add Summary header
    exportData.push({
      'STT': 'TỔNG HỢP',
      'Họ và tên': 'HSTT',
      'Chức danh': 'Số lượng CBCNV',
      'Tổ xét': 'Tỷ lệ % (X)'
    });
    
    // Add summary data
    exportData.push({
      'STT': '', 'Họ và tên': '1,2 (B) (Đội trưởng)', 'Chức danh': bld_12, 'Tổ xét': total > 0 ? (bld_12/total*100).toFixed(2).replace('.',',') : '0'
    });
    exportData.push({
      'STT': '', 'Họ và tên': '1,4 (A)', 'Chức danh': counts['1.4'], 'Tổ xét': total > 0 ? (counts['1.4']/total*100).toFixed(2).replace('.',',') : '0'
    });
    exportData.push({
      'STT': '', 'Họ và tên': '1,2 (B)', 'Chức danh': counts['1.2'], 'Tổ xét': total > 0 ? (counts['1.2']/total*100).toFixed(2).replace('.',',') : '0'
    });
    exportData.push({
      'STT': '', 'Họ và tên': '1,0 (C)', 'Chức danh': counts['1.0'], 'Tổ xét': total > 0 ? (counts['1.0']/total*100).toFixed(2).replace('.',',') : '0'
    });
    exportData.push({
      'STT': '', 'Họ và tên': '0,9-0,5 (D)', 'Chức danh': counts['0.9'] + counts['0.5'], 'Tổ xét': '-'
    });
    exportData.push({
      'STT': '', 'Họ và tên': 'Tổng cộng:', 'Chức danh': total, 'Tổ xét': '100'
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `BC_Thang_${selectedMonth}`);
    XLSX.writeFile(workbook, `TongHop_BaoCao_Thang${selectedMonth}.xlsx`);
  };

  return (
    <div className="animate-in fade-in max-w-6xl mx-auto bg-white p-6 pb-20 shadow-sm border">
       
       <div className="flex items-center justify-between mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
             <label className="font-semibold text-gray-700">Chọn tháng tổng hợp:</label>
             <select 
               className="border border-gray-300 rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
               value={selectedMonth} 
               onChange={(e) => setSelectedMonth(Number(e.target.value))}
             >
               {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                 <option key={m} value={m}>Tháng {m}</option>
               ))}
             </select>
             <button 
                onClick={() => setSummarizedMonth(selectedMonth)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition shadow-sm ml-2"
             >
                <ClipboardList className="w-4 h-4"/> Tổng hợp Kết quả
             </button>
          </div>
          {summarizedMonth && (
            <button 
               onClick={handleExportExcel}
               className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition shadow-sm"
            >
               <Download className="w-4 h-4"/> Tải Excel
            </button>
          )}
       </div>

       {!summarizedMonth ? (
          <div className="text-center p-16 text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-300">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">Báo cáo chưa được tổng hợp</p>
              <p className="text-sm mt-1">Vui lòng chọn tháng và bấm nút "<span className="font-semibold text-blue-600">Tổng hợp Kết quả</span>" để xem dữ liệu.</p>
          </div>
       ) : (
          <>
             <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-gray-400">
             <thead>
               <tr className="bg-gray-100">
                 <th className="border border-gray-400 p-2 w-12 font-bold">STT</th>
                 <th className="border border-gray-400 p-2 font-bold text-left">Họ và tên</th>
                 <th className="border border-gray-400 p-2 font-bold text-left">Chức danh</th>
                 <th className="border border-gray-400 p-2 font-bold">Tổ xét</th>
                 <th className="border border-gray-400 p-2 font-bold">Tiêu ban<br/>TĐKT xét</th>
                 <th className="border border-gray-400 p-2 font-bold min-w-[150px]">Tổ đánh giá</th>
                 <th className="border border-gray-400 p-2 font-bold min-w-[150px]">Tiêu ban TĐKT đánh<br/>giá</th>
                 <th className="border border-gray-400 p-2 font-bold">Ghi chú</th>
               </tr>
             </thead>
             <tbody>
                {teams.map((t:any, tIndex:number) => {
                   const teamEmps = emps.filter((e:any) => e.team_id === t.id);
                   if (teamEmps.length === 0) return null;
                   return (
                     <React.Fragment key={t.id}>
                        {/* Team Header Row */}
                        <tr className="bg-orange-100/50">
                           <td className="border border-gray-400 p-2 font-bold text-center text-orange-900">{ROMAN_NUMERALS[tIndex]}</td>
                           <td colSpan={7} className="border border-gray-400 p-2 font-bold text-orange-900 uppercase">
                               {t.name}
                           </td>
                        </tr>
                        {/* Employees */}
                        {teamEmps.map((e:any, eIndex:number) => {
                            const val = e[`t${selectedMonth}`];
                            const textVal = val ? val.toFixed(1).replace('.', ',') : '';
                            const lbl = val ? toLabel(val) : '';
                            return (
                             <tr key={e.id}>
                               <td className="border border-gray-400 p-1.5 text-center">{eIndex + 1}</td>
                               <td className="border border-gray-400 p-1.5">{e.name}</td>
                               <td className="border border-gray-400 p-1.5">{e.position}</td>
                               <td className="border border-gray-400 p-1.5 text-center text-blue-700">{textVal}</td>
                               <td className="border border-gray-400 p-1.5 text-center text-blue-700">{textVal}</td>
                               <td className="border border-gray-400 p-1.5 text-xs text-gray-800">{lbl}</td>
                               <td className="border border-gray-400 p-1.5 text-xs text-gray-800">{lbl}</td>
                               <td className="border border-gray-400 p-1.5"></td>
                             </tr>
                            )
                        })}
                     </React.Fragment>
                   )
                })}
             </tbody>
          </table>
       </div>

       {/* Summary Footer Table */}
       <div className="mt-12 flex justify-start">
         <table className="text-sm border-collapse border border-gray-400 w-3/4">
            <thead>
               <tr className="bg-gray-50">
                 <th className="border border-gray-400 p-2 font-bold w-12"></th>
                 <th className="border border-gray-400 p-2 font-bold">HSTT</th>
                 <th className="border border-gray-400 p-2 font-bold">Số lượng<br/>CBCNV</th>
                 <th className="border border-gray-400 p-2 font-bold">Tỷ lệ<br/>% (X)</th>
                 <th className="border border-gray-400 p-2 font-bold">xếp loại</th>
                 <th className="border border-gray-400 p-2 font-bold min-w-[200px]">Tỷ lệ theo QC xét<br/>thưởng công ty</th>
               </tr>
            </thead>
            <tbody className="text-center">
               <tr>
                 <td className="border border-gray-400 p-2">5</td>
                 <td className="border border-gray-400 p-2 font-semibold">1,2 (B)</td>
                 <td className="border border-gray-400 p-2">{bld_12}</td>
                 <td className="border border-gray-400 p-2">{total > 0 ? (bld_12/total*100).toFixed(2).replace('.',',') : 0}</td>
                 <td className="border border-gray-400 p-2">A</td>
                 <td className="border border-gray-400 p-2 font-bold text-left">ĐỘI TRƯỞNG</td>
               </tr>
               <tr>
                 <td className="border border-gray-400 p-2">7</td>
                 <td className="border border-gray-400 p-2 font-semibold">1,4 (A)</td>
                 <td className="border border-gray-400 p-2">{counts['1.4']}</td>
                 <td className="border border-gray-400 p-2">{total > 0 ? (counts['1.4']/total*100).toFixed(2).replace('.',',') : 0}</td>
                 <td className="border border-gray-400 p-2">A</td>
                 <td className="border border-gray-400 p-2 text-left">≤ 10%</td>
               </tr>
               <tr>
                 <td className="border border-gray-400 p-2">3</td>
                 <td className="border border-gray-400 p-2 font-semibold">1,2 (B)</td>
                 <td className="border border-gray-400 p-2">{counts['1.2']}</td>
                 <td className="border border-gray-400 p-2">{total > 0 ? (counts['1.2']/total*100).toFixed(2).replace('.',',') : 0}</td>
                 <td className="border border-gray-400 p-2">B</td>
                 <td className="border border-gray-400 p-2 text-left">&lt; 40%</td>
               </tr>
               <tr>
                 <td className="border border-gray-400 p-2">9</td>
                 <td className="border border-gray-400 p-2 font-semibold">1,0 (C)</td>
                 <td className="border border-gray-400 p-2">{counts['1.0']}</td>
                 <td className="border border-gray-400 p-2">{total > 0 ? (counts['1.0']/total*100).toFixed(2).replace('.',',') : 0}</td>
                 <td className="border border-gray-400 p-2">C</td>
                 <td className="border border-gray-400 p-2"></td>
               </tr>
               <tr>
                 <td className="border border-gray-400 p-2">0</td>
                 <td className="border border-gray-400 p-2 font-semibold">0,9-0,5 (D)</td>
                 <td className="border border-gray-400 p-2">{counts['0.9'] + counts['0.5']}</td>
                 <td className="border border-gray-400 p-2">-</td>
                 <td className="border border-gray-400 p-2">D</td>
                 <td className="border border-gray-400 p-2"></td>
               </tr>
               <tr className="font-bold">
                 <td className="border border-gray-400 p-3">2</td>
                 <td className="border border-gray-400 p-3">Tổng cộng:</td>
                 <td className="border border-gray-400 p-3">{total}</td>
                 <td className="border border-gray-400 p-3">100</td>
                 <td className="border border-gray-400 p-3">
                   <div className="text-xs">ĐL đã<br/>xét đúng<br/>tỷ lệ theo<br/>quy chế</div>
                 </td>
                 <td className="border border-gray-400 p-3"></td>
               </tr>
            </tbody>
         </table>
       </div>
       </>
       )}
    </div>
  );
}
