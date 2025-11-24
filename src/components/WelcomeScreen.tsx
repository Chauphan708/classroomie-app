import React, { useState } from 'react';
import { UserRole } from '../types';
import { User, GraduationCap, ArrowRight } from 'lucide-react';

interface Props {
  onJoin: (name: string, role: UserRole, group?: string) => void;
}

export const WelcomeScreen: React.FC<Props> = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [group, setGroup] = useState('1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && role) {
      onJoin(name, role, group);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border-4 border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold text-brand-blue mb-3 tracking-tight">ClassRoomie</h1>
          <p className="text-slate-500 font-medium text-lg">Lớp học vui vẻ & kết nối!</p>
        </div>

        {!role ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center text-slate-800 mb-6 uppercase tracking-wide">Bạn là ai?</h2>
            <button
              onClick={() => setRole(UserRole.STUDENT)}
              className="w-full p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-brand-blue hover:bg-blue-50 transition-all flex items-center justify-between group shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-full group-hover:bg-blue-200 transition-colors">
                  <User className="w-8 h-8 text-brand-blue" />
                </div>
                <span className="text-xl font-bold text-slate-700 group-hover:text-brand-blue">Học Sinh</span>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-300 group-hover:text-brand-blue transition-colors" />
            </button>

            <button
              onClick={() => setRole(UserRole.TEACHER)}
              className="w-full p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition-all flex items-center justify-between group shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="bg-purple-100 p-3 rounded-full group-hover:bg-purple-200 transition-colors">
                  <GraduationCap className="w-8 h-8 text-purple-600" />
                </div>
                <span className="text-xl font-bold text-slate-700 group-hover:text-purple-700">Giáo Viên</span>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-300 group-hover:text-purple-600 transition-colors" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            <div>
              <label className="block text-base font-bold text-slate-900 mb-2">
                {role === UserRole.TEACHER ? 'Tên thầy/cô:' : 'Tên của em:'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === UserRole.TEACHER ? "Ví dụ: Cô Hạnh" : "Ví dụ: Nguyễn Văn An"}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all text-lg font-semibold"
                autoFocus
                required
              />
            </div>

            {role === UserRole.STUDENT && (
              <div>
                 <label className="block text-base font-bold text-slate-900 mb-2">
                   Em thuộc tổ mấy?
                 </label>
                 <div className="grid grid-cols-4 gap-2">
                    {['1', '2', '3', '4'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGroup(g)}
                        className={`py-3 rounded-lg font-bold border-2 transition-all text-lg shadow-sm ${
                          group === g 
                            ? 'bg-brand-blue text-white border-brand-blue ring-2 ring-blue-300 ring-offset-1' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                 </div>
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
               <button
                type="button"
                onClick={() => setRole(null)}
                className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors"
              >
                Quay lại
              </button>
              <button
                type="submit"
                className="flex-1 bg-brand-blue text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/30 ring-offset-2 focus:ring-2 ring-brand-blue"
              >
                Vào Lớp Ngay
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};