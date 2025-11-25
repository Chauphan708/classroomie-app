import React, { useState, useEffect, useRef } from 'react';
import { UserSession, StudentStatus, ClassroomState } from '../types';
import { Hand, CheckCircle, AlertCircle, Bell, Send, Image as ImageIcon, X, LogOut, Lock, EyeOff } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  session: UserSession;
  store: {
    state: ClassroomState;
    updateStudentStatus: (id: string, updates: Partial<StudentStatus>) => void;
    sendMessage: (senderId: string, senderName: string, text?: string, imageUrl?: string) => void;
  };
  onLogout: () => void;
}

export const StudentView: React.FC<Props> = ({ session, store, onLogout }) => {
  const { state, updateStudentStatus, sendMessage } = store;
  const myStatus = state.students[session.id];
  const { wallConfig, messages } = state;
  
  const [buzzerPressed, setBuzzerPressed] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isBuzzerWinner = state.buzzerWinnerId === session.id;
  const isBuzzerLocked = !state.buzzerActive || (state.buzzerWinnerId !== null && !isBuzzerWinner);

  useEffect(() => {
    if (state.buzzerWinnerId === null) {
      setBuzzerPressed(false);
    } else if (isBuzzerWinner) {
       const fire = (confetti as any).default || confetti;
       fire({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
  }, [state.buzzerWinnerId, isBuzzerWinner]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, wallConfig.isPublic]);

  if (!myStatus) {
     return (
       <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-500 gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold animate-pulse">Đang kết nối vào lớp...</p>
       </div>
     );
  }

  const toggleStatus = (key: keyof StudentStatus) => {
    // @ts-ignore
    updateStudentStatus(session.id, { [key]: !myStatus[key] });
  };

  const pressBuzzer = () => {
    if (!isBuzzerLocked && !buzzerPressed) {
      setBuzzerPressed(true);
      updateStudentStatus(session.id, { buzzerPressedAt: Date.now() });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          setSelectedImage(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() || selectedImage) {
      sendMessage(session.id, session.name, messageText, selectedImage || undefined);
      setMessageText('');
      setSelectedImage(null);
    }
  };

  const visibleMessages = messages.filter(msg => {
    if (wallConfig.isPublic) return true;
    return msg.senderId === session.id;
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white px-4 py-3 shadow-sm border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
                 <img 
                    src={`https://picsum.photos/seed/${myStatus.avatarSeed}/50/50`} 
                    alt="avatar" 
                    className="w-10 h-10 rounded-full border-2 border-indigo-500 shadow-sm"
                 />
                 <div>
                    <h2 className="font-bold text-slate-800 leading-tight text-lg">{session.name}</h2>
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-wide">Tổ {myStatus.group}</p>
                 </div>
            </div>
            <button onClick={onLogout} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
              <LogOut size={24} />
            </button>
        </div>
      </header>

      {/* Main Actions */}
      <main className="flex-1 p-4 max-w-md mx-auto w-full space-y-4 pb-6">
        
        {/* Buzzer Section */}
        <div className={`p-1 rounded-[2.5rem] bg-white shadow-xl transition-all duration-300 ${isBuzzerWinner ? 'scale-105 ring-4 ring-yellow-400' : ''}`}>
            <div className={`rounded-[2.2rem] p-6 text-center transition-all duration-500 ${isBuzzerWinner ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-slate-50'}`}>
                <h3 className={`font-black uppercase tracking-widest text-sm mb-4 ${isBuzzerWinner ? 'text-white' : 'text-slate-400'}`}>
                    {isBuzzerWinner ? 'CHIẾN THẮNG!' : isBuzzerLocked ? 'ĐÃ KHÓA' : 'NHẤN CHUÔNG'}
                </h3>
                
                <button
                    onClick={pressBuzzer}
                    disabled={isBuzzerLocked || buzzerPressed}
                    className={`w-full aspect-square rounded-full flex flex-col items-center justify-center transition-all duration-150 relative overflow-hidden group
                        ${isBuzzerWinner 
                            ? 'bg-yellow-400 text-yellow-900 shadow-[0_10px_0_rgb(202,138,4)] translate-y-0' 
                            : isBuzzerLocked 
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                                : 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-[0_8px_0_rgb(55,48,163)] active:shadow-none active:translate-y-[8px] hover:brightness-110'
                        }
                    `}
                >
                    <Bell className={`w-20 h-20 ${isBuzzerWinner ? 'animate-wiggle' : ''} drop-shadow-md`} strokeWidth={2.5} />
                    {isBuzzerWinner && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                </button>
            </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4">
            <button
                onClick={() => toggleStatus('isFinished')}
                className={`p-5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-[0_4px_0_rgb(0,0,0,0.1)] active:shadow-none active:translate-y-[4px] border-2
                    ${myStatus.isFinished 
                        ? 'bg-green-500 border-green-600 text-white shadow-[0_4px_0_rgb(21,128,61)]' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }
                `}
            >
                <CheckCircle className="w-8 h-8" strokeWidth={3} />
                <span className="font-bold text-lg">Xong Bài</span>
            </button>

             <button
                onClick={() => toggleStatus('handRaised')}
                className={`p-5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-[0_4px_0_rgb(0,0,0,0.1)] active:shadow-none active:translate-y-[4px] border-2
                    ${myStatus.handRaised 
                        ? 'bg-yellow-400 border-yellow-500 text-yellow-900 shadow-[0_4px_0_rgb(202,138,4)]' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }
                `}
            >
                <Hand className="w-8 h-8" strokeWidth={3} />
                <span className="font-bold text-lg">Giơ Tay</span>
            </button>
        </div>

        <button
            onClick={() => toggleStatus('needsHelp')}
            className={`w-full p-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_4px_0_rgb(0,0,0,0.1)] active:shadow-none active:translate-y-[4px] border-2
                ${myStatus.needsHelp 
                    ? 'bg-red-500 border-red-600 text-white shadow-[0_4px_0_rgb(185,28,28)] animate-pulse' 
                    : 'bg-white border-slate-200 text-red-500 hover:bg-red-50'
                }
            `}
        >
            <AlertCircle className="w-8 h-8" />
            <span className="font-bold text-xl">{myStatus.needsHelp ? 'ĐANG CHỜ CÔ...' : 'EM CẦN GIÚP!'}</span>
        </button>

        {/* CLASS WALL */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden flex flex-col h-[450px]">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
             <h3 className="font-bold text-indigo-600 flex items-center gap-2">
               <span className="bg-indigo-100 p-1.5 rounded-lg"><Send size={16}/></span> Tường Lớp
             </h3>
             <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${wallConfig.isPublic ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                {wallConfig.isPublic ? (wallConfig.showNames ? 'CÔNG KHAI' : 'ẨN DANH') : 'RIÊNG TƯ'}
             </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
             {visibleMessages.length === 0 && (
               <div className="text-center py-10 text-slate-300">
                 <p className="font-bold">{wallConfig.isPublic ? "Chưa có tin nhắn nào" : "Bạn chưa gửi gì"}</p>
                 <p className="text-xs mt-1">Gửi lời chào đến cả lớp nhé!</p>
               </div>
             )}
             
             {visibleMessages.map(msg => {
               const isMe = msg.senderId === session.id;
               const showName = isMe || wallConfig.showNames;
               
               return (
                 <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                        isMe ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-none' : 'bg-white border border-slate-100 rounded-bl-none text-slate-700'
                    }`}>
                        <div className={`text-[10px] font-bold mb-1 ${isMe ? 'text-indigo-200' : 'text-slate-400'} flex items-center gap-1 uppercase tracking-wide`}>
                            {showName ? msg.senderName : 'Bạn bí ẩn'}
                            {!showName && <EyeOff size={10} />}
                        </div>
                        
                        {msg.imageUrl && (
                          <img src={msg.imageUrl} alt="post" className="rounded-lg mb-2 max-h-40 object-cover w-full border border-black/10" />
                        )}
                        
                        {msg.text && <p className="text-sm font-medium">{msg.text}</p>}
                    </div>
                 </div>
               );
             })}
             <div ref={messagesEndRef} />
          </div>
          
          <div className="p-3 border-t border-slate-100 bg-white">
             {selectedImage && (
                <div className="relative mb-2 inline-block">
                  <img src={selectedImage} alt="Preview" className="h-16 w-auto rounded-xl border-2 border-slate-200 shadow-sm" />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <form onSubmit={handleSend} className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-slate-400 bg-slate-100 rounded-2xl hover:bg-indigo-50 hover:text-indigo-500 transition-colors"
                >
                  <ImageIcon size={24} />
                </button>
                <input 
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageSelect}
                />
                <input 
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 bg-slate-100 px-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 font-medium text-slate-700 transition-all focus:bg-white border border-transparent focus:border-indigo-200"
                />
                <button 
                  type="submit" 
                  disabled={!messageText.trim() && !selectedImage}
                  className="bg-indigo-600 text-white p-3 rounded-2xl disabled:opacity-50 disabled:shadow-none hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
                >
                  <Send size={24} />
                </button>
              </form>
          </div>
        </div>

      </main>
    </div>
  );
};