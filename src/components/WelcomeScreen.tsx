import React, { useState } from 'react';
import { UserRole } from '../types';
import { User, GraduationCap, ArrowRight, Lock, KeyRound, Hash } from 'lucide-react';

interface Props {
  onJoin: (name: string, role: UserRole, roomId: string, group?: string) => void;
}

export const WelcomeScreen: React.FC<Props> = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [roomId, setRoomId] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [group, setGroup] = useState('1');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!roomId.trim()) {
        setError('Vui lòng nhập Mã lớp học (VD: 5A2)');
        return;
    }

    if (role === UserRole.TEACHER) {
      if (passcode === 'Chau') {
        onJoin('Thầy Châu', UserRole.TEACHER, roomId);
      } else {
        setError('Mã bảo mật giáo viên không đúng!');
      }
    } else {
      if (name.trim()) {
        onJoin(name, UserRole.STUDENT, roomId, group);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4 font-sans">
      <div className="bg-white/95 backdrop-blur-sm p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/50 relative overflow-hidden">
        <div className="text-center mb-8 relative z-10">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2 tracking-tight drop-shadow-sm">ClassRoomie</h1>
          <p className="text-slate-500 font-medium text-lg">Lớp học vui vẻ & kết nối!</p>
        </div>

        {!role ? (
          <div className="space-y-4 relative z-10">
            <h2 className="text-xl font-bold text-center text-slate-700 mb-6 uppercase tracking-wide">Bạn là ai?</h2>
            <button onClick={() => setRole(UserRole.STUDENT)} className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 flex items-center justify-between group shadow-sm hover:shadow-lg transform hover:-translate-y-1"><div className="flex items-center gap-4"><div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300"><User className="w-8 h-8 text-blue-600 group-hover:text-white" /></div><div className="text-left"><span className="block text-xl font-bold text-slate-700 group-hover:text-blue-700">Học Sinh</span><span className="text-xs text-slate-400 font-medium">Tham gia lớp học</span></div></div><ArrowRight className="w-6 h-6 text-slate-300 group-hover:text-blue-500 transition-transform group-hover:translate-x-1" /></button>
            <button onClick={() => setRole(UserRole.TEACHER)} className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 hover:border-purple-400 hover:bg-purple-50 transition-all duration-300 flex items-center justify-between group shadow-sm hover:shadow-lg transform hover:-translate-y-1"><div className="flex items-center gap-4"><div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300"><GraduationCap className="w-8 h-8 text-purple-600 group-hover:text-white" /></div><div className="text-left"><span className="block text-xl font-bold text-slate-700 group-hover:text-purple-700">Giáo Viên</span><span className="text-xs text-slate-400 font-medium">Quản lý lớp học</span></div></div><ArrowRight className="w-6 h-6 text-slate-300 group-hover:text-purple-500 transition-transform group-hover:translate-x-1" /></button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 animate-in slide-in-from-right duration-300 relative z-10">
            {/* Ô NHẬP MÃ LỚP */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide flex items-center gap-2">
                  <Hash size={16} className="text-indigo-500"/> Mã Lớp Học
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="VD: 5A2"
                  className="w-full px-5 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-lg font-bold tracking-wider placeholder:font-normal placeholder:tracking-normal"
                  autoFocus
                  required
                />
            </div>

            {role === UserRole.TEACHER ? (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide flex items-center gap-2"><Lock size={16} className="text-purple-500"/> Mật khẩu GV</label>
                <div className="relative">
                  <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Nhập mã code..." className="w-full px-5 py-3 pl-12 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-lg font-bold tracking-widest" />
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Tên của em là gì?</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Nguyễn Văn An" className="w-full px-5 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-lg font-bold" required />
              </div>
            )}

            {role === UserRole.STUDENT && (
              <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Em thuộc tổ mấy?</label>
                 <div className="grid grid-cols-4 gap-3">
                    {['1', '2', '3', '4'].map((g) => ( <button key={g} type="button" onClick={() => setGroup(g)} className={`py-3 rounded-xl font-extrabold border-2 transition-all text-xl shadow-sm ${group === g ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-transparent scale-105 shadow-blue-300' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300 hover:text-blue-500'}`}>{g}</button> ))}
                 </div>
              </div>
            )}
            
            {error && <p className="text-red-500 text-sm font-semibold flex items-center gap-1 justify-center bg-red-50 p-2 rounded-lg border border-red-100">{error}</p>}

            <div className="flex gap-3 pt-2">
               <button type="button" onClick={() => { setRole(null); setError(''); setPasscode(''); setRoomId(''); }} className="px-6 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Quay lại</button>
               <button type="submit" className={`flex-1 py-3 rounded-xl font-bold text-lg text-white shadow-lg shadow-purple-200 active:scale-95 transition-all ${role === UserRole.TEACHER ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}`}>{role === UserRole.TEACHER ? 'Tạo/Mở Lớp' : 'Vào Lớp'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};