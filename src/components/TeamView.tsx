import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Upload, Save, Edit3, X, Trash2, Download, Sparkles, Bot, Send, Loader2, Plus, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import Markdown from 'react-markdown';
import { GoogleGenAI } from '@google/genai';

const INPUT_OPTIONS = ['1.4', '1.2', '1.0', '0.9', '0.8', '0.7', '0.6', '0.5'];

const mapInputToCoef = (input: string | null) => {
  if (input === null || input === "") return null;
  const num = parseFloat(input.replace(',', '.'));
  if (!isNaN(num)) return num;
  return null;
};

const mapCoefToInput = (coef: number | null) => {
  if (coef === null) return '';
  // Return with dot to match INPUT_OPTIONS values
  return coef.toFixed(1);
};

export default function TeamView({ data, mode, teamId, onRefresh }: { data: any, mode: 'ALL' | 'TEAM', teamId?: number, onRefresh?: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftData, setDraftData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(12); // Added state to allow month selection for quota row

  // AI Assistant states
  const [showAIModal, setShowAIModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll AI chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, showAIModal]);

  // Employee Management states
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [newEmp, setNewEmp] = useState({ code: '', name: '', position: '', team_id: teamId || '' });
  const [employeeToDelete, setEmployeeToDelete] = useState<{id: number, name: string} | null>(null);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.code || !newEmp.name || !newEmp.team_id) {
       alert("Vui lòng điền đủ mã, tên và tổ/bộ phận.");
       return;
    }
    try {
      await axios.post('/api/employees', newEmp);
      setShowAddEmpModal(false);
      setNewEmp({ code: '', name: '', position: '', team_id: teamId || '' });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Lỗi khi thêm nhân viên: " + (err.response?.data?.error || err.message));
    }
  };

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    try {
      await axios.delete(`/api/employees/${employeeToDelete.id}`);
      setEmployeeToDelete(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Lỗi khi xóa nhân viên: " + (err.response?.data?.error || err.message));
    }
  };


  let targetQuotas = [];
  let targetEmployees = [];
  let name = "";
  let note = "";

  if (mode === 'ALL') {
     name = "TOÀN ĐƠN VỊ";
     note = "Nơi Tổ trưởng hoặc admin nhập kết quả xét";
     targetQuotas = data.quotas.filter((q:any) => q.team_id === null);
     targetEmployees = data.employees;
  } else {
     const t = data.teams.find((t:any) => t.id === teamId);
     name = t.name?.toUpperCase();
     note = "Nơi Tổ trưởng hoặc admin nhập kết quả xét";
     targetQuotas = data.quotas.filter((q:any) => q.team_id === teamId);
     targetEmployees = data.employees.filter((e:any) => e.team_id === teamId);
  }

  const q14 = targetQuotas.find((q:any) => q.coef === 1.4)?.max_count || 0;
  const q12 = targetQuotas.find((q:any) => q.coef === 1.2)?.max_count || 0;
  const q10 = targetQuotas.find((q:any) => q.coef === 1.0)?.max_count || 0;

  const handleEditChange = (empId: number, month: number, value: string) => {
    setDraftData((prev: any) => ({
      ...prev,
      [`${empId}_${month}`]: value === "" ? null : value
    }));
  };

  const getCoefDisplay = (emp: any, m: number) => {
     const draftKey = `${emp.id}_${m}`;
     
     // Only allow editing for the currently selected month
     if (isEditing && m === currentMonth) {
        let currentDraftValue = draftData[draftKey];
        // If not in draft, try to map from db
        let dbValue = mapCoefToInput(emp[`t${m}`]);
        let currentVal = currentDraftValue !== undefined ? currentDraftValue : dbValue;
        
        return (
          <select 
            className="w-10 bg-blue-50 text-blue-900 border-blue-400 text-center cursor-pointer border rounded text-[10px] outline-none shadow-inner"
            value={currentVal || ""}
            onChange={(e) => handleEditChange(emp.id, m, e.target.value)}
          >
            <option value="">-</option>
            {INPUT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        );
     }

     const draftVal = draftData[draftKey];
     if (draftVal !== undefined) {
         if (draftVal === null || draftVal === "") return '';
         const numVal = mapInputToCoef(draftVal);
         return numVal !== null ? numVal.toFixed(1).replace('.', ',') : '';
     }
     const val = emp[`t${m}`];
     return val ? val.toFixed(1).replace('.', ',') : '';
  };

  const [confirmClear, setConfirmClear] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const parsedData = XLSX.utils.sheet_to_json(ws);
      
      const newDrafts = { ...draftData };

      // Map parsed data by Name -> empId
      parsedData.forEach((row: any) => {
        // Normalize row keys to handle line breaks or multiple spaces in headers
        const normalizedRow: any = {};
        Object.keys(row).forEach(k => {
          const normK = k.replace(/\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
          normalizedRow[normK] = row[k];
        });

        const empName = normalizedRow['Họ và tên'] || normalizedRow['Họ tên'] || normalizedRow['Name'];
        if (empName) {
           const normEmpName = String(empName).trim().toLowerCase().replace(/\s+/g, ' ');
           const emp = targetEmployees.find((e:any) => String(e.name).trim().toLowerCase().replace(/\s+/g, ' ') === normEmpName);
           if (emp) {
              for (let m = 1; m <= 12; m++) {
                 // Check common header formats
                 const mVal = normalizedRow[`HSTT T${m}`] || normalizedRow[`T${m}`] || normalizedRow[`Tháng ${m}`];
                 if (mVal !== undefined) {
                    const numVal = parseFloat(String(mVal).trim().replace(',', '.'));
                    if (!isNaN(numVal)) {
                        const parsedVal = numVal.toFixed(1);
                        if (INPUT_OPTIONS.includes(parsedVal)) {
                            newDrafts[`${emp.id}_${m}`] = parsedVal;
                        }
                    }
                 }
              }
           }
        }
      });

      setDraftData(newDrafts);
      setIsEditing(true);
      // Removed alert, just let it show on UI
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // reset input
  };

  const handleClearData = () => {
    if (!confirmClear) {
       setConfirmClear(true);
       setTimeout(() => setConfirmClear(false), 3000); // reset after 3s
       return;
    }

    const newDrafts = { ...draftData };
    targetEmployees.forEach(emp => {
      for (let m = 1; m <= 12; m++) {
        newDrafts[`${emp.id}_${m}`] = ""; // use "" so that the <select> displays empty
      }
    });
    setDraftData(newDrafts);
    setIsEditing(true); // force editing mode so they can save
    setConfirmClear(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
       const updates = [];
       Object.keys(draftData).forEach(key => {
          const [empId, month] = key.split('_');
          const finalCoef = mapInputToCoef(draftData[key]);
          
          updates.push({
             employee_id: parseInt(empId),
             month: parseInt(month),
             year: 2024,
             coef: finalCoef
          });
       });

       await axios.post('/api/evaluations/bulk', { updates });
       if (onRefresh) onRefresh();
       setIsEditing(false);
       setDraftData({});
    } catch (e: any) {
        console.error(e);
        // Silently log or display error locally to avoid alerts
    }
    setIsSaving(false);
  };

  const handleExportExcel = () => {
    const exportData = targetEmployees.map((emp: any, index: number) => {
      let tName = data.teams.find((t:any) => t.id === emp.team_id)?.short_name || data.teams.find((t:any) => t.id === emp.team_id)?.name;
      
      const rowData: any = {
        'STT': index + 1,
        'Họ và tên': emp.name,
        'Chức danh': emp.position || '',
        'Bộ phận': tName,
      };

      let sum = 0, count = 0;
      for(let m = 1; m <= 12; m++) {
        const draftKey = `${emp.id}_${m}`;
        let finalVal;
        
        const draftVal = draftData[draftKey];
        if (isEditing && draftVal !== undefined) {
          finalVal = draftVal === "" ? null : mapInputToCoef(draftVal);
        } else {
          finalVal = emp[`t${m}`];
        }

        rowData[`Tháng ${m}`] = finalVal !== null && finalVal !== undefined ? finalVal.toFixed(1).replace('.', ',') : '';
        if (finalVal) { sum += finalVal; count++; }
      }

      rowData['HSTT Trung bình'] = count > 0 ? (sum / count).toFixed(2).replace('.', ',') : '';
      rowData['Ghi chú'] = '';

      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'KetQuaXet');
    XLSX.writeFile(workbook, `KetQuaXet_Thang${currentMonth}_${name}.xlsx`);
  };

  const handleAskAI = async () => {
    if (!chatInput.trim()) return;
    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsAiLoading(true);

    try {
      // Build context from current table data
      const contextData = targetEmployees.map((emp: any) => {
         let tName = data.teams.find((t:any) => t.id === emp.team_id)?.short_name || data.teams.find((t:any) => t.id === emp.team_id)?.name;
         let row = `Nhân viên: ${emp.name}, Chức danh: ${emp.position || ''}, Bộ phận: ${tName}. `;
         const scores = [];
         for(let m = 1; m <= 12; m++) {
             let v = emp[`t${m}`];
             if(v !== null) scores.push(`T${m}: ${v}`);
         }
         row += `Điểm các tháng: ${scores.join(', ')}`;
         return row;
      }).join('\n');

      const systemPrompt = `Bạn là trợ lý AI chuyên phân tích dữ liệu nhân sự của đơn vị ${name}. 
Dữ liệu nhân sự chi tiết hiện tại (các tháng):
${contextData}

Tỷ lệ quota của đơn vị xếp loại 1 (Hoàn thành xuất sắc) là A <= 15%, B <= 50%.
Điểm số: 1.4 (xuất sắc), 1.2 (tốt), 1.0 (hoàn thành), 0.9-0.5 (không hoàn thành).

Nhiệm vụ: Trả lời ngắn gọn, chính xác bằng tiếng Việt dựa TRÊN DỮ LIỆU ĐÃ CUNG CẤP. KHÔNG tự bịa dữ liệu. Nếu không tìm thấy thông tin thì nói rõ là không có thông tin. Format văn bản bằng Markdown đẹp mắt.`;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt
        }
      });

      setChatMessages(prev => [...prev, { role: 'model', text: response.text || '' }]);
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { role: 'model', text: 'Xin lỗi, đã có lỗi xảy ra khi kết nối với AI.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Calculate active counts dynamically from current table data (Month state for summary)
  let countA = 0, countB = 0, countC = 0, countD = 0;

  targetEmployees.forEach(emp => {
      const draftKey = `${emp.id}_${currentMonth}`;
      let val;

      if (draftData[draftKey] !== undefined) {
         if (draftData[draftKey] !== null && draftData[draftKey] !== "") {
            val = mapInputToCoef(draftData[draftKey]);
         } else {
            val = null;
         }
      } else {
         val = emp[`t${currentMonth}`];
      }

      if (val === 1.4) countA++;
      else if (val === 1.2) countB++;
      else if (val === 1.0) countC++;
      else if (val !== null && val <= 0.9) countD++;
  });

  const [activeUnitRating, setActiveUnitRating] = useState('1');

  // Calculate limits based on unit rating
  let maxAPercent = 0;
  let maxBPercent = 0;

  if (activeUnitRating === '1') { maxAPercent = 0.15; maxBPercent = 0.50; }
  else if (activeUnitRating === '2') { maxAPercent = 0.10; maxBPercent = 0.40; }
  else if (activeUnitRating === '3') { maxAPercent = 0.05; maxBPercent = 0.30; }
  else if (activeUnitRating === '4') { maxAPercent = 0.00; maxBPercent = 0.20; }

  const totalEmps = targetEmployees.length;

  const maxA = Math.floor(totalEmps * maxAPercent);
  const maxB = Math.floor(totalEmps * maxBPercent);

  return (
    <div className="animate-in fade-in max-w-6xl mx-auto space-y-6">
      <h2 className="text-xl font-bold uppercase mb-6">MENU {name} ( Ghi chú: {note})</h2>

      <div className="border border-black overflow-hidden bg-white mb-8">
         <div className="p-3 bg-gray-50 border-b border-black text-sm flex items-center gap-4 flex-wrap">
           <div className="flex items-center gap-2">
             <span className="font-bold whitespace-nowrap">Tháng xét: </span>
             <select 
               className="border border-gray-300 rounded p-1 outline-none font-semibold text-blue-700 bg-white"
               value={currentMonth}
               onChange={(e) => setCurrentMonth(Number(e.target.value))}
             >
               {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                 <option key={m} value={m}>Tháng {m}</option>
               ))}
             </select>
           </div>
           
           <div className="w-px h-6 bg-gray-300 mx-1 border-l hidden sm:block"></div>
           
           <div className="flex items-center gap-2">
             <span className="font-bold whitespace-nowrap">Loại xếp hạng của đơn vị: </span>
             <select 
               className="border border-gray-300 rounded p-1 outline-none font-semibold text-blue-700 bg-white"
               value={activeUnitRating}
               onChange={(e) => setActiveUnitRating(e.target.value)}
             >
               <option value="1">1. Hoàn thành xuất sắc nhiệm vụ</option>
               <option value="2">2. Hoàn thành tốt nhiệm vụ</option>
               <option value="3">3. Hoàn thành nhiệm vụ</option>
               <option value="4">4. Không hoàn thành nhiệm vụ</option>
             </select>
           </div>
           <span className="ml-auto flex-[1_1_100%] lg:flex-none mt-2 lg:mt-0 text-right">
             Loại A: Hoàn thành xuất sắc nhiệm vụ A ≤ {maxAPercent * 100}%; B {activeUnitRating === '1' ? '≤' : '<'} {maxBPercent * 100}%; C: còn lại
           </span>
         </div>
         <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border-r border-b border-black font-semibold text-sm w-1/4 align-middle" rowSpan={2}>
                   {mode === 'ALL' ? 'ĐL Quảng Điền' : data.teams.find((t:any) => t.id === teamId)?.name}
                </th>
                <th className="border-r border-black font-semibold p-1">1,4</th>
                <th className="border-r border-black font-semibold p-1">1,2</th>
                <th className="border-r border-black font-semibold p-1">1,0</th>
                <th className="font-semibold p-1">0.9-0.5</th>
              </tr>
              <tr className="bg-gray-100">
                <th className="border-r border-b border-black font-semibold p-2">
                   X &lt;= {maxAPercent * 100}%<br/>
                   <span className="text-xs font-normal">(Max: {maxA})</span>
                </th>
                <th className="border-r border-b border-black font-semibold p-2">
                   X {activeUnitRating === '1' ? '<=' : '<'}{maxBPercent * 100}%<br/>
                   <span className="text-xs font-normal">(Max: {maxB})</span>
                </th>
                <th className="border-r border-b border-black font-semibold p-2">Còn <br/> lại</th>
                <th className="border-b border-black font-semibold text-sm p-2 align-middle">
                  Có thể xét hoặc không (nếu có xét thì <br/> nhập vào đây để ra đúng số lượng các <br/> loại còn lại)
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Database Quota Row */}
              <tr>
                <td className="border-r border-black p-2">{totalEmps}</td>
                <td className="border-r border-black p-2">{q14}</td>
                <td className="border-r border-black p-2">{q12}</td>
                <td className="border-r border-black p-2">{q10}</td>
                <td className="p-2"></td>
              </tr>
              {/* Dynamic Actuals Row */}
              <tr className="bg-yellow-50 font-semibold border-t border-black text-blue-900">
                <td className="border-r border-black p-2 text-right">Kết quả đánh giá thực tế: </td>
                <td className={`border-r border-black p-2 ${countA > maxA ? 'text-red-500 font-bold' : ''}`}>{countA}</td>
                <td className={`border-r border-black p-2 ${activeUnitRating === '1' ? (countB > maxB ? 'text-red-500 font-bold' : '') : (countB >= maxB ? 'text-red-500 font-bold' : '')}`}>{countB}</td>
                <td className="border-r border-black p-2">{countC}</td>
                <td className="p-2">{countD}</td>
              </tr>
            </tbody>
         </table>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
           <p>Danh sách chi tiết {targetEmployees.length} nhân viên đơn vị và Hệ số thành tích tháng của {mode === 'ALL' ? 'được lấy từ các tổ sang' : data.teams.find((t:any) => t.id === teamId)?.name}</p>
           
           <div className="flex gap-2">
              <button 
                 onClick={() => setShowAIModal(true)} 
                 className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition shadow-[0_0_15px_rgba(79,70,229,0.5)]">
                 <Sparkles className="w-4 h-4"/> AI Phân tích
              </button>

              <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition">
                 <Upload className="w-4 h-4"/> 
                 Upload Excel
                 <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
              </label>

              <button onClick={handleExportExcel} className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition">
                 <Download className="w-4 h-4"/> Xuất Excel
              </button>

              <button 
                 onClick={() => setShowAddEmpModal(true)} 
                 className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition">
                 <Plus className="w-4 h-4"/> Thêm nhân sự
              </button>

              <button onClick={handleClearData} className={`${confirmClear ? 'bg-red-700 animate-pulse' : 'bg-red-500'} hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition`}>
                 <Trash2 className="w-4 h-4"/> {confirmClear ? 'Bấm lần nữa để Xóa' : 'Xóa dữ liệu'}
              </button>

              {!isEditing ? (
                 <button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition">
                    <Edit3 className="w-4 h-4"/> Sửa / Nhập liệu
                 </button>
              ) : (
                 <>
                   <button onClick={() => { setIsEditing(false); setDraftData({}); }} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition">
                      <X className="w-4 h-4"/> Hủy
                   </button>
                   <button onClick={handleSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition">
                      <Save className="w-4 h-4"/> {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                   </button>
                 </>
              )}
           </div>
        </div>
        
        <div className="overflow-x-auto shadow-sm border border-gray-300">
          <table className="w-full text-sm border-collapse text-center whitespace-nowrap">
             <thead>
               <tr className="bg-gray-200">
                 <th className="border border-gray-300 p-2 bg-gray-300 w-10">STT</th>
                 <th className="border border-gray-300 p-2 text-left bg-gray-300 min-w-[150px]">Họ và tên</th>
                 <th className="border border-gray-300 p-2 text-left bg-gray-300 min-w-[150px]">Bộ phận</th>
                 {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                   <th key={m} className={`border border-gray-300 p-1 text-[10px] w-12 ${m === currentMonth ? 'bg-blue-100 text-blue-900 shadow-inner' : 'bg-gray-300'}`}>HSTT<br/>T{m}</th>
                 ))}
                 <th className="border border-gray-300 p-1 text-[10px] w-14 bg-gray-300">HSTT<br/>TRUNG<br/>BÌNH</th>
                 <th className="border border-gray-300 p-2 min-w-[100px] bg-gray-300">Ghi chú</th>
               </tr>
             </thead>
             <tbody>
               {targetEmployees.map((emp:any, index:number) => {
                 let tName = data.teams.find((t:any) => t.id === emp.team_id)?.short_name;
                 if (!tName) tName = data.teams.find((t:any) => t.id === emp.team_id)?.name;

                 // Calculate avg
                 let sum = 0, count = 0;
                 for(let i=1; i<=12; i++) {
                   let draftVal = draftData[`${emp.id}_${i}`];
                   let finalVal;
                   if (isEditing && draftVal !== undefined) {
                       finalVal = mapInputToCoef(draftVal);
                   } else {
                       finalVal = emp[`t${i}`];
                   }

                   if (finalVal) { sum += finalVal; count++; }
                 }
                 const avg = count > 0 ? (sum / count).toFixed(2) : '';

                 return (
                 <tr key={emp.id} className="hover:bg-gray-50 text-[11px]">
                   <td className="border border-gray-300 p-1.5 text-center font-medium bg-gray-50">{index + 1}</td>
                   <td className="border border-gray-300 p-1.5 text-left text-blue-700 font-medium whitespace-break-spaces w-[180px]">{emp.name}</td>
                   <td className="border border-gray-300 p-1.5 text-left text-blue-800 whitespace-break-spaces w-[180px]">{tName}</td>
                   {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                     <td key={m} className={`border border-gray-300 p-1 font-bold ${m === currentMonth ? 'bg-blue-50/50' : ''} ${emp[`t${m}`] || draftData[`${emp.id}_${m}`] ? 'text-red-600' : ''}`}>
                       {getCoefDisplay(emp, m)}
                     </td>
                   ))}
                   <td className="border border-gray-300 p-1 font-bold text-red-600">{avg ? avg.replace('.',',') : ''}</td>
                   <td className="border border-gray-300 p-1">
                      {isEditing && (
                         <button 
                             onClick={() => setEmployeeToDelete({ id: emp.id, name: emp.name })} 
                             className="text-red-500 hover:text-red-700 p-0.5 rounded transition"
                             title="Xóa nhân viên này"
                         >
                            <Trash2 className="w-3.5 h-3.5" />
                         </button>
                      )}
                   </td>
                 </tr>
               )})}
             </tbody>
          </table>
        </div>
      </div>

      {/* AI Assistant Modal */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between bg-indigo-600 p-4 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-200" />
                <h3 className="font-semibold text-lg">AI Phân tích số liệu ({name})</h3>
              </div>
              <button 
                onClick={() => setShowAIModal(false)}
                className="text-indigo-200 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 min-h-[300px] max-h-[500px] overflow-y-auto p-4 space-y-4 bg-gray-50">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 gap-2">
                  <Bot className="w-12 h-12 text-indigo-300" />
                  <p>Chào bạn! Tôi đã nắm được dữ liệu bảng điểm của {totalEmps} nhân viên đơn vị {name}.</p>
                  <p className="text-sm">Hãy thử hỏi: "Ai có điểm trung bình cao nhất?" hoặc "Có bao nhiêu người không hoàn thành nhiệm vụ tháng 1?"</p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                     }`}>
                        {msg.role === 'user' ? (
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                        ) : (
                          <div className="prose prose-sm prose-indigo align-middle prose-p:my-1 prose-ul:my-1 prose-headings:my-2">
                            <Markdown>{msg.text}</Markdown>
                          </div>
                        )}
                     </div>
                  </div>
                ))
              )}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600"/> Đang phân tích dữ liệu...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-200">
              <form 
                className="flex gap-2"
                onSubmit={(e) => { e.preventDefault(); handleAskAI(); }}
              >
                <input
                  type="text"
                  placeholder="Hỏi AI về dữ liệu này..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isAiLoading}
                />
                <button 
                  type="submit" 
                  disabled={isAiLoading || !chatInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white p-2 rounded-lg transition"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddEmpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between bg-blue-600 p-4 text-white">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <h3 className="font-semibold text-lg">Thêm nhân sự mới</h3>
              </div>
              <button 
                onClick={() => setShowAddEmpModal(false)}
                className="text-white hover:text-gray-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddEmployee} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã nhân viên *</label>
                <input 
                  type="text" 
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  value={newEmp.code}
                  onChange={(e) => setNewEmp({...newEmp, code: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên *</label>
                <input 
                  type="text" 
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  value={newEmp.name}
                  onChange={(e) => setNewEmp({...newEmp, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chức danh</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  value={newEmp.position}
                  onChange={(e) => setNewEmp({...newEmp, position: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bộ phận/Tổ *</label>
                <select 
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  value={newEmp.team_id}
                  onChange={(e) => setNewEmp({...newEmp, team_id: Number(e.target.value)})}
                >
                  <option value="">-- Chọn Tổ/Bộ phận --</option>
                  {data?.teams?.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddEmpModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md font-medium"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md font-medium"
                >
                  Thêm nhân viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Employee Confirmation Modal */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between bg-red-600 p-4 text-white">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-semibold text-lg">Xác nhận xóa</h3>
              </div>
              <button 
                onClick={() => setEmployeeToDelete(null)}
                className="text-white hover:text-gray-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 text-gray-800 text-center">
              <p>Bạn có chắc chắn muốn xóa nhân viên <span className="font-bold text-red-600">"{employeeToDelete.name}"</span> khỏi hệ thống?</p>
              <p className="text-sm text-gray-500 mt-2">Dữ liệu đánh giá lịch sử của nhân viên này cũng sẽ bị xóa vĩnh viễn.</p>
            </div>
              
            <div className="flex justify-end gap-2 p-4 bg-gray-50 border-t border-gray-100">
              <button 
                type="button" 
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-md font-medium transition"
              >
                Hủy
              </button>
              <button 
                type="button"
                onClick={confirmDeleteEmployee}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md font-medium transition"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
