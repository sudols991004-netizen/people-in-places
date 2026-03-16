// ============================================================
// noticeService.js — Supabase public.notices 연동
// 이슈 6,7 수정: 좋아요/조회수 DB 반영
// ============================================================

const noticeService = {

  async getAll() {
    const { data } = await _supabase
      .from('notices')
      .select('*')
      .order('date', { ascending: false });
    return data || [];
  },

  async getVisible() {
    const { data } = await _supabase
      .from('notices')
      .select('*')
      .eq('visible', true)
      .order('date', { ascending: false });
    return data || [];
  },

  async getSortedByLatest() {
    return this.getVisible();
  },

  async getById(id) {
    const { data } = await _supabase
      .from('notices')
      .select('*')
      .eq('id', id)
      .single();
    return data || null;
  },

  async search(keyword) {
    const text = (keyword || '').trim();
    if (!text) return this.getVisible();
    const { data } = await _supabase
      .from('notices')
      .select('*')
      .eq('visible', true)
      .or(`title.ilike.%${text}%,author.ilike.%${text}%`)
      .order('date', { ascending: false });
    return data || [];
  },

  async create(noticeData) {
    const { data, error } = await _supabase
      .from('notices')
      .insert({
        title:    noticeData.title,
        category: noticeData.category || 'notice',
        author:   noticeData.author   || '관리자',
        content:  noticeData.content  || '',
        visible:  true,
        views:    0,
        likes:    0,
        date:     new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();
    if (error) { console.error('공지 등록 실패:', error); return null; }
    return data;
  },

  async delete(id) {
    const { error } = await _supabase.from('notices').delete().eq('id', id);
    return !error;
  },

  // ✅ 이슈 7 수정: 조회수 1 증가
  async incrementViews(id) {
    const notice = await this.getById(id);
    if (!notice) return;
    await _supabase
      .from('notices')
      .update({ views: (notice.views || 0) + 1 })
      .eq('id', id);
  },

  // ✅ 이슈 6 수정: 좋아요 토글 (좋아요/취소)
  // liked: 현재 좋아요 상태 (true면 취소, false면 추가)
  async toggleLike(id, liked) {
    const notice = await this.getById(id);
    if (!notice) return null;
    const newLikes = liked
      ? Math.max((notice.likes || 0) - 1, 0)
      : (notice.likes || 0) + 1;
    const { data, error } = await _supabase
      .from('notices')
      .update({ likes: newLikes })
      .eq('id', id)
      .select()
      .single();
    if (error) { console.error('좋아요 업데이트 실패:', error); return null; }
    return data;
  },
};
