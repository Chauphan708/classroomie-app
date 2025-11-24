import React, { useState, useEffect, useRef } from 'react';
import { UserSession, ClassroomState, StudentStatus, ChatMessage, WallConfig } from '../types';
import { 
  Users, Hand, CheckCircle, AlertCircle, Bell, RefreshCw, 
  Trash2, MessageSquare, Send, Sparkles, X, Loader2, LogOut, Clock, ImageIcon, Settings, Globe, Eye, EyeOff, Lock, Filter
} from 'lucide-react';
import { getTeacherAssistantAdvice } from '../services/geminiService';

interface Props {
  store: {
    state: ClassroomState;
    updateWallConfig: (config: Partial<WallConfig>) => void;
    resetBuzzer: () => void;
    resetAllStatuses: () => void;
    removeStudent: (id: string) => void;
  };
  onLogout: () => void;
}

// Sound URLs (using reliable CDN or Data URI ideally, here using standard placeholders)
const SOUNDS = {
  alert: 'https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/alien_shoot.mp3', // Sharp sound for Help
  success: 'https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/bonus.mp3', // Chime for Finished
  hand: 'https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/pause.mp3', // Soft beep for Hand
  message: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3', // Bubble pop
};

export const TeacherView: React.FC<Props> = ({ store, onLogout }) => {
  const { state, updateWallConfig, resetBuzzer, resetAllStatuses, removeStudent } = store;
  const students: StudentStatus[] = Object.values(state.students);
  const messages = state.messages;
  const { wallConfig } = state;

  // Refs for tracking previous state to trigger sounds
  const prevStudentsRef = useRef<Record<string, StudentStatus>>({});
  const prevMessagesLengthRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // UI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(true);

  // Filter State
  const [filterStatus, setFilterStatus] = useState<'all' | 'help' | 'finished' | 'raised'>('all');
  const [filterStudentId, setFilterStudentId] = useState<string>('all');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sound Player Helper
  const playSound = (type: keyof typeof SOUNDS) => {
    if (!audioRef.current) {
        audioRef.current = new Audio();
    }
    audioRef.current.src = SOUNDS[type];
    audioRef.current.play().catch(e => console.log("Audio play blocked", e));
  };

  // Scroll to bottom of chat
  useEffect(() => {
    if (showActivityLog) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showActivityLog, filterStatus, filterStudentId]);

  // Effect to detect changes and play sounds
  useEffect(() => {
    const prevStudents = prevStudentsRef.current;
    
    // Check for Status Changes
    students.forEach(s => {
      const prev = prevStudents[s.id];
      if (!prev) return; // New student, ignore
      
      // If flag flipped from false to true
      if (s.needsHelp && !prev.needsHelp) playSound('alert');
      else if (s.handRaised && !prev.handRaised) playSound('hand');
      else if (s.isFinished && !prev.isFinished) playSound('success');
    });

    // Check for New Messages
    if (messages.length > prevMessagesLengthRef.current) {
        // Only play if it's not the initial load
        if (prevMessagesLengthRef.current > 0) {
            playSound('message');
        }
    }

    // Update refs
    prevStudentsRef.current = { ...state.students };
    prevMessagesLengthRef.current = messages.length;
  }, [state.students, messages]);


  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    
    setIsAiLoading(true);
    setAiResponse(null);
    const advice = await getTeacherAssistantAdvice(aiPrompt, state);
    setAiResponse(advice);
    setIsAiLoading(false);
  };

  const getCardColor = (s: StudentStatus) => {
    if (state.buzzerWinnerId === s.id) return 'bg-blue-100 border-blue-500 ring-2 ring-blue-400';
    if (s.needsHelp) return 'bg-red-50 border-red-300 animate-bounce-short';
    if (s.handRaised) return 'bg-yellow-50 border-yellow-300';
    if (s.isFinished) return 'bg-green-50 border-green-300';
    return 'bg-white border-gray-200';
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const diff = Math.floor((Date.now() - timestamp) / 60000);
    if (diff < 1) return 'Vừa xong';
    return `${diff} phút trước`;
  };

  const formatMessageTime = (ts: number) => {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter Logic
  const filteredMessages = messages.filter(msg => {
    // 1. Filter by Student ID
    if (filterStudentId !== 'all' && msg.senderId !== filterStudentId) {
      return false;
    }

    // 2. Filter by Current Status of the Sender
    const sender = state.students[msg.senderId];
    if (sender) {
        if (filterStatus === 'help' && !sender.needsHelp) return false;
        if (filterStatus === 'finished' && !sender.isFinished) return false;
        if (filterStatus === 'raised' && !sender.handRaised) return false;
    } else if (filterStatus !== 'all') {
        // If sender not found (left class) but we are filtering by status, hide message
        return false;
    }

    return true;
  });

  return (
    <div className="h-screen bg-gray-100 flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar Controls */}
      <aside className="bg-white w-full md:w-64 flex-shrink-0 border-r shadow-sm flex flex-col z-20">
        <div className="p-6 border-b bg-brand-light">
           <h1 className="text-2xl font-extrabold text-brand-blue flex items-center gap-2">
             <Users className="w-8 h-8" />
             Lớp Học
           </h1>
           <p className="text-sm text-gray-500 mt-1">Sĩ số: <span className="font-bold text-gray-800">{students.length}</span></p>
        </div>

        <nav className="p-4 space-y-4 flex-1 overflow-y-auto">
          {/* Stats Summary */}
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100 text-red-700">
               <span className="flex items-center gap-2"><AlertCircle size={16}/> Cần giúp</span>
               <span className="font-bold text-lg">{students.filter(s => s.needsHelp).length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100 text-green-700">
               <span className="flex items-center gap-2"><CheckCircle size={16}/> Xong bài</span>
               <span className="font-bold text-lg">{students.filter(s => s.isFinished).length}</span>
            </div>
             <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-100 text-yellow-700">
               <span className="flex items-center gap-2"><Hand size={16}/> Giơ tay</span>
               <span className="font-bold text-lg">{students.filter(s => s.handRaised).length}</span>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
             <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Điều khiển</h3>
             <button onClick={resetBuzzer} className="w-full btn-control flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl">
                <Bell size={18} /> Đặt lại Chuông
             </button>
             <button onClick={resetAllStatuses} className="w-full btn-control flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl">
                <RefreshCw size={18} /> Reset Trạng thái
             </button>
              <button 
                onClick={() => setShowActivityLog(!showActivityLog)} 
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${showActivityLog ? 'bg-blue-100 text-brand-blue' : 'text-gray-700 bg-gray-50 hover:bg-gray-100'}`}
             >
                <MessageSquare size={18} /> Tường lớp & Tin nhắn
                {messages.length > 0 && <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{messages.length}</span>}
             </button>
          </div>

          <div className="mt-auto border-t pt-4">
             <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl">
                <LogOut size={18} /> Thoát lớp học
            </button>
          </div>
        </nav>
        
        <div className="p-4 bg-gradient-to-t from-purple-50 to-white">
            <button 
                onClick={() => setShowAiModal(true)}
                className="w-full p-3 bg-brand-purple text-white rounded-xl shadow-lg shadow-purple-200 flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors"
            >
                <Sparkles size={18} /> Trợ lý AI
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
          
          {/* Grid Area */}
          <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            {/* Buzzer Banner */}
            {state.buzzerWinnerId && (
                <div className="mb-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl flex items-center justify-between animate-bounce-short">
                    <div className="flex items-center gap-6">
                        <div className="bg-white p-3 rounded-full text-blue-600">
                            <Bell className="w-8 h-8 animate-wiggle" />
                        </div>
                        <div>
                            <p className="text-blue-100 text-sm font-bold uppercase tracking-wide">Người nhanh nhất</p>
                            <h2 className="text-3xl font-extrabold">{state.students[state.buzzerWinnerId]?.name || 'Unknown'}</h2>
                        </div>
                    </div>
                    <button onClick={resetBuzzer} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium text-sm">Reset</button>
                </div>
            )}

            {/* Student Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {students.map(student => (
                    <div 
                        key={student.id} 
                        className={`relative p-4 rounded-2xl border-2 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col items-center gap-3 ${getCardColor(student)}`}
                    >
                        <button 
                            onClick={() => removeStudent(student.id)}
                            className="absolute top-2 right-2 text-gray-300 hover:text-red-400 p-1 rounded-full hover:bg-red-50"
                        >
                            <Trash2 size={14} />
                        </button>

                         <div className="absolute top-2 left-2 bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Tổ {student.group}
                        </div>

                        <div className="relative mt-2">
                            <img 
                                src={`https://picsum.photos/seed/${student.avatarSeed}/100/100`} 
                                alt={student.name}
                                className="w-16 h-16 rounded-full border-2 border-white shadow-sm"
                            />
                            <div className="absolute -bottom-2 -right-2 flex gap-1">
                                {student.needsHelp && <div className="p-1 bg-red-500 rounded-full text-white shadow-sm" title={formatTime(student.needsHelpAt)}><AlertCircle size={12}/></div>}
                                {student.isFinished && <div className="p-1 bg-green-500 rounded-full text-white shadow-sm" title={formatTime(student.isFinishedAt)}><CheckCircle size={12}/></div>}
                                {student.handRaised && <div className="p-1 bg-yellow-400 rounded-full text-white shadow-sm" title={formatTime(student.handRaisedAt)}><Hand size={12}/></div>}
                            </div>
                        </div>
                        
                        <div className="text-center w-full">
                            <h3 className="font-bold text-gray-800 truncate px-2">{student.name}</h3>
                            <div className="text-xs text-gray-500 mt-1 min-h-[20px] font-medium">
                                {student.needsHelp ? <span className="text-red-500 animate-pulse">{formatTime(student.needsHelpAt)}</span> :
                                 student.isFinished ? <span className="text-green-600">{formatTime(student.isFinishedAt)}</span> :
                                 student.handRaised ? <span className="text-yellow-600">{formatTime(student.handRaisedAt)}</span> : ''}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">
                                {student.needsHelp ? 'Cần giúp!' : student.isFinished ? 'Đã xong' : student.handRaised ? 'Xin phát biểu' : ''}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {students.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Users className="w-16 h-16 mb-4 opacity-50" />
                    <p>Đang chờ học sinh tham gia...</p>
                </div>
            )}
          </main>

          {/* Right Panel: Wall & Chat */}
          {showActivityLog && (
            <div className="w-96 bg-white border-l shadow-xl flex flex-col animate-in slide-in-from-right duration-300 absolute md:relative right-0 h-full z-30">
                {/* Wall Controls */}
                <div className="p-4 border-b bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2"><MessageSquare size={18}/> Tường Lớp</h3>
                        <button onClick={() => setShowActivityLog(false)} className="md:hidden text-gray-400"><X size={20}/></button>
                    </div>

                    {/* Quick Filters */}
                    <div className="flex gap-1 mb-2 overflow-x-auto pb-2 scrollbar-hide">
                         <button onClick={() => setFilterStatus('all')} className={`text-xs px-2 py-1 rounded border whitespace-nowrap ${filterStatus === 'all' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white'}`}>Tất cả</button>
                         <button onClick={() => setFilterStatus('help')} className={`text-xs px-2 py-1 rounded border whitespace-nowrap flex items-center gap-1 ${filterStatus === 'help' ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white'}`}><AlertCircle size={10}/> Cần giúp</button>
                         <button onClick={() => setFilterStatus('finished')} className={`text-xs px-2 py-1 rounded border whitespace-nowrap flex items-center gap-1 ${filterStatus === 'finished' ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white'}`}><CheckCircle size={10}/> Đã xong</button>
                         <button onClick={() => setFilterStatus('raised')} className={`text-xs px-2 py-1 rounded border whitespace-nowrap flex items-center gap-1 ${filterStatus === 'raised' ? 'bg-yellow-100 border-yellow-300 text-yellow-700' : 'bg-white'}`}><Hand size={10}/> Giơ tay</button>
                    </div>

                    <div className="flex gap-2 mb-3">
                         <select 
                            value={filterStudentId}
                            onChange={(e) => setFilterStudentId(e.target.value)}
                            className="text-xs border rounded p-1 flex-1 outline-none focus:border-brand-blue"
                         >
                             <option value="all">-- Tất cả học sinh --</option>
                             {students.map(s => (
                                 <option key={s.id} value={s.id}>{s.name} (Tổ {s.group})</option>
                             ))}
                         </select>
                    </div>
                    
                    <div className="flex gap-2 text-xs border-t pt-2 mt-1">
                        <button 
                            onClick={() => updateWallConfig({ isPublic: !wallConfig.isPublic })}
                            className={`flex-1 p-2 rounded-lg flex flex-col items-center gap-1 border transition-colors ${wallConfig.isPublic ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}
                        >
                            {wallConfig.isPublic ? <Globe size={16} /> : <Lock size={16} />}
                            {wallConfig.isPublic ? 'Công khai' : 'Riêng tư'}
                        </button>
                        <button 
                            onClick={() => updateWallConfig({ showNames: !wallConfig.showNames })}
                            className={`flex-1 p-2 rounded-lg flex flex-col items-center gap-1 border transition-colors ${wallConfig.showNames ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}
                        >
                            {wallConfig.showNames ? <Eye size={16} /> : <EyeOff size={16} />}
                            {wallConfig.showNames ? 'Hiện tên' : 'Ẩn tên HS'}
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                    {filteredMessages.length === 0 && <p className="text-center text-gray-400 text-sm italic py-10">Không tìm thấy tin nhắn phù hợp</p>}
                    
                    {filteredMessages.map((msg) => (
                        <div key={msg.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2">
                             <div className="flex justify-between items-start mb-1">
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm text-brand-blue">{msg.senderName}</span>
                                    {/* Show current status icons next to name in chat */}
                                    {state.students[msg.senderId] && (
                                        <div className="flex gap-1 mt-0.5">
                                            {state.students[msg.senderId].needsHelp && <AlertCircle size={10} className="text-red-500"/>}
                                            {state.students[msg.senderId].isFinished && <CheckCircle size={10} className="text-green-500"/>}
                                            {state.students[msg.senderId].handRaised && <Hand size={10} className="text-yellow-500"/>}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                    <Clock size={10} /> {formatMessageTime(msg.timestamp)}
                                </span>
                             </div>
                             
                             {msg.text && <p className="text-gray-700 text-sm mb-2">{msg.text}</p>}
                             
                             {msg.imageUrl && (
                                <div className="rounded-lg overflow-hidden border border-gray-200 mb-1">
                                    <img src={msg.imageUrl} alt="User upload" className="w-full h-auto object-cover" />
                                </div>
                             )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>
          )}
      </div>

      {/* AI Assistant Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-in fade-in slide-in-from-bottom-10">
                <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl text-white">
                    <h2 className="font-bold flex items-center gap-2"><Sparkles size={20}/> Trợ Lý Sư Phạm</h2>
                    <button onClick={() => setShowAiModal(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20}/></button>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto space-y-4">
                    {!aiResponse && !isAiLoading && (
                        <div className="text-center text-gray-500 py-8">
                            <p>Thầy/cô cần hỗ trợ gì cho lớp học hiện tại?</p>
                            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                <button onClick={() => setAiPrompt("Gợi ý hoạt động cho nhóm làm xong rồi")} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full">Gợi ý cho nhóm xong</button>
                                <button onClick={() => setAiPrompt("Viết lời động viên cho bạn đang cần giúp")} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full">Động viên học sinh</button>
                            </div>
                        </div>
                    )}
                    
                    {aiResponse && (
                        <div className="bg-purple-50 p-4 rounded-xl text-gray-800 text-sm leading-relaxed border border-purple-100">
                           <p style={{whiteSpace: 'pre-line'}}>{aiResponse}</p>
                        </div>
                    )}

                    {isAiLoading && (
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin text-purple-600" />
                        </div>
                    )}
                </div>

                <form onSubmit={handleAskAI} className="p-4 border-t bg-gray-50 rounded-b-2xl">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="Nhập câu hỏi..."
                            className="flex-1 px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <button 
                            type="submit" 
                            disabled={isAiLoading || !aiPrompt.trim()}
                            className="bg-purple-600 text-white p-2 rounded-xl hover:bg-purple-700 disabled:opacity-50"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};