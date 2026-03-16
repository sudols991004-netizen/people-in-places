// ============================================================
// productService.js — Supabase public.products 연동
// ============================================================

const productService = {

  async getAll() {
    const { data } = await _supabase.from('products').select('*').order('created_at', { ascending: true });
    return data || [];
  },

  async getById(id) {
    const { data } = await _supabase.from('products').select('*').eq('id', id).single();
    return data || null;
  },

  async getVisible() {
    const { data } = await _supabase
      .from('products')
      .select('*')
      .neq('status', 'hidden')
      .order('created_at', { ascending: true });
    return data || [];
  },

  async getByCategory(category) {
    if (category === 'all') return this.getVisible();
    const { data } = await _supabase
      .from('products')
      .select('*')
      .neq('status', 'hidden')
      .eq('category', category)
      .order('created_at', { ascending: true });
    return data || [];
  },

  async getFeatured() {
    const { data } = await _supabase
      .from('products')
      .select('*')
      .neq('status', 'hidden')
      .eq('featured', true)
      .order('created_at', { ascending: true });
    return data || [];
  },

  async create(productData) {
    const { data, error } = await _supabase
      .from('products')
      .insert({ ...productData })
      .select()
      .single();
    if (error) { console.error('상품 등록 실패:', error); return null; }
    return data;
  },

  async delete(id) {
    const { error } = await _supabase.from('products').delete().eq('id', id);
    return !error;
  },

  async update(id, updateData) {
    const { data, error } = await _supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) { console.error('상품 수정 실패:', error); return null; }
    return data;
  },
};
