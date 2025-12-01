import { createClient } from '@supabase/supabase-js';

// Lấy key từ biến môi trường
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Kiểm tra và báo lỗi vào Console thay vì làm sập App (Throw Error)
if (!supabaseUrl || !supabaseKey) {
  console.error("🚨 LỖI NGHIÊM TRỌNG: Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY. Hãy kiểm tra Settings trên Vercel!");
}

// Tạo client với giá trị dự phòng để app vẫn khởi động được (dù không kết nối được DB)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder-key'
);