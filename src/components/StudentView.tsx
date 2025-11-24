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
  
  // 1. KHAI BÁO TẤT CẢ HOOKS Ở ĐÂY (TRƯỚC KHI RETURN)
  const [buzzerPressed, setBuzzerPressed] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isBuzzerWinner = state.buzzerWinnerId === session.id;
  const isBuzzerLocked = !state.buzzerActive || (state.buzzerWinnerId !== null && !isBuzzerWinner);

  // useEffect 1: Xử lý pháo giấy
  useEffect(() => {
    if (state.buzzerWinnerId === null) {
      setBuzzerPressed(false);
    } else if (isBuzzerWinner) {
       // Dùng bản confetti mặc định để tránh lỗi
       const fire = (confetti as any).default || confetti;
       fire({
         particleCount: 100,
         spread: 70,
         origin: { y: 0.6 }
       });
    }
  }, [state.buzzerWinnerId, isBuzzerWinner]);

  // useEffect 2: Cuộn chat xuống cuối
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, wallConfig.isPublic]);

  // 2. SAU KHI KHAI BÁO HẾT HOOKS, MỚI ĐƯỢC CHECK ĐIỀU KIỆN RETURN
  if (!myStatus) {
     return (
       <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-gray-500 gap-3">
          <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
          <p>Đang kết nối vào lớp...</p>
       </div>
     );
  }

  // --- Logic xử lý sự kiện ---
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white p-4 shadow-sm border-b sticky top-0 z-20">
        <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
                 <img 
                    src={`https://picsum.photos/seed/${myStatus.avatarSeed}/50/50`} 
                    alt="avatar" 
                    className="w-10 h-10 rounded-full border-2 border-brand-blue"
                 />
                 <div>
                    <h2 className="font-bold text-gray-800 leading-tight">{session.name}</h2>
                    <p className="text-xs text-gray-500">Tổ {myStatus.group}</p>
                 </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex gap-1">
                    {myStatus.needsHelp && <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>}
                    {myStatus.isFinished && <div className="w-3 h-3 bg-green-500 rounded-full"></div>}
                    {myStatus.handRaised && <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>}
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors ml-2"
                  title="Thoát lớp học"
                >
                  <LogOut size={20} />
                </button>
            </div>
        </div>
      </header>

      {/* Main Actions */}
      <main className="flex-1 p-4 max-w-md mx-auto w-full space-y-4 pb-4">
        
        {/* Buzzer Section */}
        <div className={`p-6 rounded-3xl transition-all duration-500 ${
            isBuzzerWinner ? 'bg-blue-600 shadow-blue-400/50 shadow-2xl scale-105' : 
            isBuzzerLocked ? 'bg-gray-200 opacity-80' : 'bg-white shadow-lg'
        }`}>
            <h3 className={`text-center font-bold mb-4 uppercase tracking-wider ${isBuzzerWinner ? 'text-white' : 'text-gray-500'}`}>
                {isBuzzerWinner ? 'BẠN ĐÃ NHANH NHẤT!' : isBuzzerLocked ? 'Chuông đã khóa' : 'Nhấn chuông'}
            </h3>
            
            <button
                onClick={pressBuzzer}
                disabled={isBuzzerLocked || buzzerPressed}
                className={`w-full aspect-square rounded-full flex flex-col items-center justify-center shadow-inner transition-all duration-150
                    ${isBuzzerWinner 
                        ? 'bg-yellow-400 text-yellow-900 animate-bounce' 
                        : isBuzzerLocked 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-gradient-to-br from-brand-blue to-blue-700 text-white shadow-blue-900 active:scale-90 active:shadow-none'
                    }
                `}
            >
                <Bell className={`w-16 h-16 ${isBuzzerWinner ? 'animate-wiggle' : ''}`} />
                {isBuzzerWinner && <span className="mt-2 font-bold text-lg">CHIẾN THẮNG!</span>}
            </button>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4">
            <button
                onClick={() => toggleStatus('isFinished')}
                className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border-b-4 active:border-b-0 active:translate-y-1
                    ${myStatus.isFinished 
                        ? 'bg-green-100 border-green-500 text-green-700' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }
                `}
            >
                <CheckCircle className={`w-10 h-10 ${myStatus.isFinished ? 'fill-current' : ''}`} />
                <span className="font-bold">Làm xong</span>
            </button>

             <button
                onClick={() => toggleStatus('handRaised')}
                className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border-b-4 active:border-b-0 active:translate-y-1
                    ${myStatus.handRaised 
                        ? 'bg-yellow-100 border-yellow-500 text-yellow-700' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }
                `}
            >
                <Hand className={`w-10 h-10 ${myStatus.handRaised ? 'fill-current' : ''}`} />
                <span className="font-bold">Giơ tay</span>
            </button>
        </div>

        <button
            onClick={() => toggleStatus('needsHelp')}
            className={`w-full p-6 rounded-2xl flex items-center justify-center gap-4 transition-all border-b-4 active:border-b-0 active:translate-y-1
                ${myStatus.needsHelp 
                    ? 'bg-red-500 border-red-700 text-white animate-pulse' 
                    : 'bg-white border-gray-200 text-red-500 hover:bg-red-50'
                }
            `}
        >
            <AlertCircle className="w-8 h-8" />
            <span className="font-bold text-xl">{myStatus.needsHelp ? 'Đang chờ cô giáo...' : 'Em cần giúp đỡ!'}</span>
        </button>

        {/* CLASS WALL */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col h-[500px]">
          <div className="p-3 bg-brand-light border-b flex justify-between items-center">
             <h3 className="font-bold text-brand-blue flex items-center gap-2">
               Tường Lớp Học
               {!wallConfig.isPublic && <Lock size={14} className="text-gray-400" />}
             </h3>
             <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border">
                {wallConfig.isPublic ? (wallConfig.showNames ? 'Công khai' : 'Công khai (Ẩn danh)') : 'Chỉ mình bạn thấy'}
             </span>
          </div>

          {/* Wall Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
             {visibleMessages.length === 0 && (
               <div className="text-center py-10 text-gray-400 text-sm">
                 <p>{wallConfig.isPublic ? "Chưa có bài đăng nào trên tường." : "Bạn chưa đăng bài nào."}</p>
                 <p className="text-xs mt-1">Hãy chia sẻ suy nghĩ hoặc hình ảnh!</p>
               </div>
             )}
             
             {visibleMessages.map(msg => {
               const isMe = msg.senderId === session.id;
               const showName = isMe || wallConfig.showNames;
               
               return (
                 <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                        isMe ? 'bg-brand-blue text-white rounded-br-none' : 'bg-white border border-gray-200 rounded-bl-none'
                    }`}>
                        <div className={`text-xs font-bold mb-1 ${isMe ? 'text-blue-100' : 'text-gray-500'} flex items-center gap-1`}>
                            {showName ? msg.senderName : <><EyeOff size={10} /> Bạn cùng lớp</>}
                        </div>
                        
                        {msg.imageUrl && (
                          <img src={msg.imageUrl} alt="post" className="rounded-lg mb-2 max-h-40 object-cover w-full border border-black/10" />
                        )}
                        
                        {msg.text && <p className="text-sm break-words">{msg.text}</p>}
                    </div>
                 </div>
               );
             })}
             <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="p-3 border-t bg-white">
             {selectedImage && (
                <div className="relative mb-2 inline-block">
                  <img src={selectedImage} alt="Preview" className="h-16 w-auto rounded-lg border shadow-sm" />
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
                  className="p-3 text-gray-500 bg-gray-100 rounded-xl hover:bg-brand-light hover:text-brand-blue transition-colors"
                >
                  <ImageIcon size={20} />
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
                  placeholder="Viết lên tường lớp..."
                  className="flex-1 bg-gray-100 px-4 rounded-xl outline-none focus:ring-2 focus:ring-brand-blue/50"
                />
                <button 
                  type="submit" 
                  disabled={!messageText.trim() && !selectedImage}
                  className="bg-brand-blue text-white p-3 rounded-xl disabled:opacity-50 hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                >
                  <Send size={20} />
                </button>
              </form>
          </div>
        </div>

      </main>
    </div>
  );
};