// ============================================================
// supabase.js — Supabase 클라이언트 초기화 (CDN UMD 방식)
// CDN이 window.supabase를 이미 선언하므로 const 재선언 금지
// ============================================================

const SUPABASE_URL  = 'https://kracfwphcfoxsapwauyh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyYWNmd3BoY2ZveHNhcHdhdXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NDI1MzYsImV4cCI6MjA4OTExODUzNn0.RDDU30twemaRzGbhfdEs20BsfRf3jiqv3irRwpE-bi8';

var _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storageKey: 'pip-auth-token',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    lock: {
      acquire: async (name, acquireLockFn) => {
        return acquireLockFn();
      }
    }
  }
});
