import React, { useState, useEffect, useRef } from 'react';
import { ClassroomState, StudentStatus, WallConfig, UserRole } from '../types';
import { 
  Users, Hand, CheckCircle, AlertCircle, Bell, RefreshCw, 
  Trash2, MessageSquare, Send, Sparkles, X, Loader2, LogOut, Globe, Eye, EyeOff, Lock, Unlock,
  Download, Image as ImageIcon, Mic, MicOff, Shield, ShieldOff // Thêm icon mới
} from 'lucide-react';
import { getTeacherAssistantAdvice } from '../services/geminiService';

interface Props {
  store: {
    state: ClassroomState;
    updateWallConfig: (config: Partial<WallConfig>) => void;
    sendMessage: (senderId: string, senderName: string, role: UserRole, text?: string, imageUrl?: string) => void;
    resetBuzzer: () => void;
    lockBuzzer: () => void;
    resetAllStatuses: () => void;
    removeStudent: (id: string) => void;
  };
  onLogout: () => void;
}

const SOUNDS = {
  alert: 'https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/alien_shoot.mp3',
  success: 'https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/bonus.mp3',
  hand: 'https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/pause.mp3',
  message: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
  buzzer: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
};

export const TeacherView: React.FC<Props> = ({ store, onLogout }) => {
  const { state, updateWallConfig, resetBuzzer, lockBuzzer, resetAllStatuses, removeStudent, sendMessage } = store;
  const students: StudentStatus[] = Object.values(state.students);
  const messages = state.messages;
  const { wallConfig } = state;

  const prevStudentsRef = useRef<Record<string, StudentStatus>>({});
  const prevMessagesLengthRef = useRef(0);
  const prevWinnerRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'help' | 'finished' | 'raised'>('all');
  const [filterStudentId, setFilterStudentId] = useState<string>('all');
  
  const [messageText, setMessageText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const playSound = (type: keyof typeof SOUNDS) => {
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = SOUNDS[type];
    audioRef.current.volume = 1.0;
    audioRef.current.play().catch(e => console.log("Audio play blocked", e));
  };
  useEffect(() => { if (showActivityLog) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, showActivityLog, filterStatus, filterStudentId, wallConfig.isPublic]);
  useEffect(() => { const prevStudents = prevStudentsRef.current; students.forEach(s => { const prev = prevStudents[s.id]; if (!prev) return; if (s.needsHelp && !prev.needsHelp) playSound('alert'); else if (s.handRaised && !prev.handRaised) playSound('hand'); else if (s.isFinished && !prev.isFinished) playSound('success'); }); if (messages.length > prevMessagesLengthRef.current && prevMessagesLengthRef.current > 0) playSound('message'); if (state.buzzerWinnerId && state.buzzerWinnerId !== prevWinnerRef.current) { playSound('buzzer'); } prevStudentsRef.current = { ...state.students }; prevMessagesLengthRef.current = messages.length; prevWinnerRef.current = state.buzzerWinnerId; }, [state.students, messages, state.buzzerWinnerId]);
  const handleAskAI = async (e: React.FormEvent) => { e.preventDefault(); if (!aiPrompt.trim()) return; setIsAiLoading(true); setAiResponse(null); const advice = await getTeacherAssistantAdvice(aiPrompt, state); setAiResponse(advice); setIsAiLoading(false); };
  const formatTime = (timestamp?: number) => { if (!timestamp) return ''; const diff = Math.floor((Date.now() - timestamp) / 60000); return diff < 1 ? 'Vừa xong' : `${diff} phút trước`; };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() || selectedImage) {
      sendMessage('teacher', 'Cô Giáo', UserRole.TEACHER, messageText, selectedImage || undefined);
      setMessageText('');
      setSelectedImage(null);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { const img = new Image(); img.src = reader.result as string; img.onload = () => { const canvas = document.createElement('canvas'); const MAX_WIDTH = 500; const scaleSize = MAX_WIDTH / img.width; canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize; const ctx = canvas.getContext('2d'); ctx?.drawImage(img, 0, 0, canvas.width, canvas.height); setSelectedImage(canvas.toDataURL('image/jpeg', 0.8)); }; };
      reader.readAsDataURL(file);
    }
  };

  const handleExportWord = () => {
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Lịch sử Chat Lớp Học</title></head><body><h1 style="color: #4F46E5">Nhật Ký Tường Lớp Học</h1><p>Ngày xuất: ${new Date().toLocaleString()}</p><hr/>`;
    const body = messages.map(msg => `<div style="margin-bottom: 15px; padding: 10px; border-bottom: 1px solid #eee;"><p><strong>${msg.senderName}</strong> <span style="color: #888; font-size: 0.8em">(${new Date(msg.timestamp).toLocaleTimeString()})</span></p>${msg.text ? `<p>${msg.text}</p>` : ''}${msg.imageUrl ? `<img src="${msg.imageUrl}" width="300" style="border-radius: 8px; margin-top: 5px;" />` : ''}</div>`).join('');
    const footer = "</body></html>";
    const blob = new Blob(['\ufeff', header + body + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `Tuong_Lop_${new Date().toLocaleDateString().replace(/\//g, '-')}.doc`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // --- LOGIC PHÂN QUYỀN CHAT ---
  const toggleStudentChat = (studentId: string) => {
     let newAllowed = [...wallConfig.allowedStudentIds];
     if (newAllowed.includes(studentId)) {
        newAllowed = newAllowed.filter(id => id !== studentId); // Xóa khỏi danh sách cho phép
     } else {
        newAllowed.push(studentId); // Thêm vào danh sách cho phép
     }
     updateWallConfig({ allowedStudentIds: newAllowed });
  };

  const filteredMessages = messages.filter(msg => { if (filterStudentId !== 'all' && msg.senderId !== filterStudentId) return false; const sender = state.students[msg.senderId]; if (sender) { if (filterStatus === 'help' && !sender.needsHelp) return false; if (filterStatus === 'finished' && !sender.isFinished) return false; if (filterStatus === 'raised' && !sender.handRaised) return false; } return true; });
  const getCardColor = (s: StudentStatus) => { if (state.buzzerWinnerId === s.id) return 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-300 transform scale-105 ring-4 ring-yellow-400'; if (s.needsHelp) return 'bg-white border-l-4 border-red-500 shadow-md animate-pulse'; if (s.handRaised) return 'bg-white border-l-4 border-yellow-400 shadow-md'; if (s.isFinished) return 'bg-white border-l-4 border-green-500 shadow-md'; return 'bg-white border border-gray-100 hover:border-purple-200 hover:shadow-md'; };

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden font-sans">
      <aside className="bg-white w-full md:w-72 flex-shrink-0 border-r border-slate-200 shadow-sm flex flex-col z-20">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-white">
           <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center gap-2"><Users className="w-8 h-8 text-purple-600" /> Lớp Học</h1>
           <div className="mt-2 flex items-center gap-2 text-sm text-slate-500 font-medium"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Trực tuyến: <span className="font-bold text-slate-800">{students.length}</span></div>
        </div>
        <nav className="p-4 space-y-3 flex-1 overflow-y-auto">
             <div className="space-y-2">
                 {state.buzzerActive ? (<button onClick={lockBuzzer} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all shadow-md animate-pulse"><Lock size={18} /> Khóa Chuông</button>) : (<button onClick={resetBuzzer} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition-all shadow-sm"><Unlock size={18} /> Mở Chuông Mới</button>)}
                 <button onClick={resetAllStatuses} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm"><RefreshCw size={18} /> Reset Trạng thái</button>
                 <button onClick={() => setShowActivityLog(!showActivityLog)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all shadow-sm border ${showActivityLog ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><MessageSquare size={18} /> Tường lớp {messages.length > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{messages.length}</span>}</button>
             </div>
        </nav>
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
             <button onClick={() => setShowAiModal(true)} className="w-full p-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-purple-200 flex items-center justify-center gap-2 hover:opacity-90 transition-all font-bold"><Sparkles size={18} /> Trợ lý AI</button>
             <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"><LogOut size={14} /> Thoát lớp học</button>
        </div>
      </aside>

      <div className="flex-1 flex overflow-hidden relative">
          <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50">
             {state.buzzerWinnerId && (<div className="mb-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200 flex items-center justify-between animate-in zoom-in duration-300"><div className="flex items-center gap-6"><div className="bg-white/20 p-4 rounded-full backdrop-blur-sm"><Bell className="w-10 h-10 animate-bounce" /></div><div><p className="text-indigo-100 text-sm font-bold uppercase tracking-wide opacity-80">Người nhanh nhất</p><h2 className="text-4xl font-black tracking-tight">{state.students[state.buzzerWinnerId]?.name || 'Unknown'}</h2></div></div><button onClick={resetBuzzer} className="bg-white text-indigo-600 px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-indigo-50 transition-colors">Mở Vòng Mới</button></div>)}
             <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {students.map(student => {
                    // Logic hiển thị nút Mic trên thẻ HS
                    const isChatAllowed = !wallConfig.isLocked || wallConfig.allowedStudentIds.includes(student.id);
                    return (
                        <div key={student.id} className={`relative p-4 rounded-2xl transition-all duration-300 flex flex-col items-center gap-3 group ${getCardColor(student)}`}>
                            {/* Nút xóa HS */}
                            <button onClick={() => removeStudent(student.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                            
                            {/* NÚT BẬT/TẮT CHAT (Chỉ hiện khi tường bị khóa) */}
                            {wallConfig.isLocked && (
                                <button 
                                    onClick={() => toggleStudentChat(student.id)} 
                                    className={`absolute top-2 right-9 p-1.5 rounded-full transition-all shadow-sm border-2 ${isChatAllowed ? 'bg-green-100 text-green-600 border-green-200' : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-green-50 hover:text-green-500'}`}
                                    title={isChatAllowed ? "Đang được phép chat" : "Đang bị cấm chat"}
                                >
                                    {isChatAllowed ? <Mic size={14} /> : <MicOff size={14} />}
                                </button>
                            )}

                            <div className="absolute top-2 left-2 bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-1 rounded-md">TỔ {student.group}</div>
                            <div className="relative mt-2">
                                <img src={`https://picsum.photos/seed/${student.avatarSeed}/100/100`} alt={student.name} className={`w-20 h-20 rounded-full border-4 shadow-sm object-cover ${state.buzzerWinnerId === student.id ? 'border-white' : 'border-slate-50'}`} />
                                <div className="absolute -bottom-2 -right-2 flex gap-1">{student.needsHelp && <div className="p-1.5 bg-red-500 rounded-full text-white shadow-sm border-2 border-white"><AlertCircle size={14}/></div>}{student.isFinished && <div className="p-1.5 bg-green-500 rounded-full text-white shadow-sm border-2 border-white"><CheckCircle size={14}/></div>}{student.handRaised && <div className="p-1.5 bg-yellow-400 rounded-full text-white shadow-sm border-2 border-white"><Hand size={14}/></div>}</div>
                            </div>
                            <div className="text-center w-full"><h3 className={`font-bold truncate px-2 text-lg ${state.buzzerWinnerId === student.id ? 'text-white' : 'text-slate-700'}`}>{student.name}</h3><div className="text-xs font-medium mt-1 min-h-[20px]">{student.needsHelp ? <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Cần giúp {formatTime(student.needsHelpAt)}</span> : student.isFinished ? <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Xong {formatTime(student.isFinishedAt)}</span> : student.handRaised ? <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">Giơ tay {formatTime(student.handRaisedAt)}</span> : ''}</div></div>
                        </div>
                    );
                })}
             </div>
          </main>

          {showActivityLog && (
            <div className="w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 absolute md:relative right-0 h-full z-30">
                <div className="p-4 border-b border-slate-100 bg-white">
                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-800 flex items-center gap-2"><MessageSquare size={18} className="text-indigo-600"/> Tường Lớp</h3><div className="flex gap-2"><button onClick={handleExportWord} className="text-green-600 bg-green-50 hover:bg-green-100 p-2 rounded-lg" title="Tải file Word"><Download size={18}/></button><button onClick={() => setShowActivityLog(false)} className="md:hidden text-slate-400"><X size={20}/></button></div></div>
                    {/* Filter Tabs */}
                    <div className="flex gap-1 mb-3 bg-slate-100 p-1 rounded-xl">{['all', 'help', 'finished', 'raised'].map((t) => ( <button key={t} onClick={() => setFilterStatus(t as any)} className={`flex-1 text-[10px] py-1.5 rounded-lg font-bold uppercase transition-all ${filterStatus === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{t === 'all' ? 'Tất cả' : t === 'help' ? 'Cần giúp' : t === 'finished' ? 'Đã xong' : 'Giơ tay'}</button> ))}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                        {/* NÚT KHÓA TƯỜNG (Thay nút Công khai cũ hoặc thêm vào cạnh) */}
                        <button onClick={() => updateWallConfig({ isLocked: !wallConfig.isLocked })} className={`p-2 rounded-xl flex flex-col items-center gap-1 border-2 transition-all font-bold ${wallConfig.isLocked ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                             {wallConfig.isLocked ? <Shield size={20} /> : <ShieldOff size={20} />}
                             {wallConfig.isLocked ? 'Đã Khóa Chat' : 'Cho phép Chat'}
                        </button>
                        
                        <button onClick={() => updateWallConfig({ isPublic: !wallConfig.isPublic })} className={`p-2 rounded-xl flex flex-col items-center gap-1 border-2 transition-all font-bold ${wallConfig.isPublic ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>{wallConfig.isPublic ? <Globe size={20} /> : <Lock size={20} />}{wallConfig.isPublic ? 'Công khai' : 'Riêng tư'}</button>
                    </div>
                    <div className="mt-2 text-xs text-center text-slate-400">
                        <button disabled={!wallConfig.isPublic} onClick={() => updateWallConfig({ showNames: !wallConfig.showNames })} className={`w-full py-1.5 rounded-lg border flex items-center justify-center gap-1 ${wallConfig.showNames ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white border-slate-200'}`}> {wallConfig.showNames ? <Eye size={12}/> : <EyeOff size={12}/>} {wallConfig.showNames ? 'Hiện tên HS' : 'Ẩn tên HS'} </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {filteredMessages.length === 0 && <p className="text-center text-slate-400 text-sm font-medium py-10">Chưa có tin nhắn nào</p>}
                    {filteredMessages.map((msg) => {
                       const isTeacher = msg.role === UserRole.TEACHER;
                       return (
                        <div key={msg.id} className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-2 ${isTeacher ? 'border-purple-200 bg-purple-50' : ''}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`font-bold text-sm ${isTeacher ? 'text-purple-700' : 'text-indigo-600'}`}>{isTeacher ? 'Cô Giáo' : wallConfig.showNames ? msg.senderName : 'Bạn giấu tên'}</span>
                                    {isTeacher && <Sparkles size={12} className="text-yellow-500 fill-yellow-500"/>}
                                    {!wallConfig.showNames && !isTeacher && <EyeOff size={12} className="text-slate-300"/>}
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            {msg.text && <p className="text-slate-700 text-sm leading-relaxed">{msg.text}</p>}
                            {msg.imageUrl && (<div className="mt-2 rounded-xl overflow-hidden border border-slate-200"><img src={msg.imageUrl} alt="upload" className="w-full h-auto object-cover" /></div>)}
                        </div>
                       );
                    })}
                    <div ref={messagesEndRef} />
                </div>
                
                <div className="p-3 border-t border-slate-100 bg-white">
                     {selectedImage && (<div className="relative mb-2 inline-block"><img src={selectedImage} alt="Preview" className="h-16 w-auto rounded-xl border-2 border-slate-200 shadow-sm" /><button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"><X size={12} /></button></div>)}
                     <form onSubmit={handleSend} className="flex gap-2"> 
                         <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 bg-slate-100 rounded-2xl hover:bg-purple-50 hover:text-purple-600 transition-colors"><ImageIcon size={24} /></button> 
                         <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} /> 
                         <input type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Nhắn cả lớp..." className="flex-1 bg-slate-100 px-4 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500/50 font-medium text-slate-700 transition-all focus:bg-white border border-transparent focus:border-purple-200" /> 
                         <button type="submit" disabled={!messageText.trim() && !selectedImage} className="bg-purple-600 text-white p-3 rounded-2xl disabled:opacity-50 hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 active:scale-95"><Send size={24} /></button> 
                    </form>
                </div>
            </div>
          )}
      </div>
      {showAiModal && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"><div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"><div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-3xl text-white"> <h2 className="font-bold text-lg flex items-center gap-2"><Sparkles size={22}/> Trợ Lý Sư Phạm</h2> <button onClick={() => setShowAiModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={20}/></button> </div><div className="p-6 flex-1 overflow-y-auto space-y-4 bg-slate-50"> {!aiResponse && !isAiLoading && ( <div className="text-center text-slate-500 py-10"> <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Sparkles className="text-purple-600" size={32} /></div> <p className="font-medium">Thầy/cô cần hỗ trợ gì ngay lúc này?</p> <div className="mt-6 flex flex-wrap gap-2 justify-center"> <button onClick={() => setAiPrompt("Gợi ý hoạt động cho nhóm làm xong rồi")} className="text-xs font-bold bg-white border border-slate-200 hover:border-purple-400 text-slate-600 hover:text-purple-600 px-4 py-2 rounded-full transition-all shadow-sm">💡 Gợi ý cho nhóm xong</button> <button onClick={() => setAiPrompt("Viết lời động viên cho bạn đang cần giúp")} className="text-xs font-bold bg-white border border-slate-200 hover:border-purple-400 text-slate-600 hover:text-purple-600 px-4 py-2 rounded-full transition-all shadow-sm">❤️ Động viên học sinh</button> </div> </div> )} {aiResponse && ( <div className="bg-white p-5 rounded-2xl text-slate-700 text-sm leading-relaxed border border-purple-100 shadow-sm"><p style={{whiteSpace: 'pre-line'}}>{aiResponse}</p></div> )} {isAiLoading && ( <div className="flex flex-col items-center justify-center py-10 gap-3"><Loader2 className="animate-spin text-purple-600 w-8 h-8" /><span className="text-xs font-bold text-purple-600 uppercase tracking-wider">AI đang suy nghĩ...</span></div> )} </div><form onSubmit={handleAskAI} className="p-4 border-t border-slate-100 bg-white rounded-b-3xl"> <div className="flex gap-2 relative"> <input type="text" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Nhập câu hỏi..." className="flex-1 px-5 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all font-medium" /> <button type="submit" disabled={isAiLoading || !aiPrompt.trim()} className="bg-purple-600 text-white p-3 rounded-2xl hover:bg-purple-700 disabled:opacity-50 transition-all shadow-lg shadow-purple-200 active:scale-95"><Send size={20} /></button> </div> </form></div></div> )}
    </div>
  );
};