// ============================================================
// orderService.js — Supabase public.orders + order_items 연동
// ============================================================

const orderService = {

  async getAll() {
    const { data } = await _supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    return (data || []).map(normalizeOrder);
  },

  async getByUserId(userId) {
    const { data } = await _supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return (data || []).map(normalizeOrder);
  },

  async getById(id) {
    const { data } = await _supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .single();
    return data ? normalizeOrder(data) : null;
  },

  async getTotalPriceByUserId(userId) {
    const orders = await this.getByUserId(userId);
    return orders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
  },

  async create(orderData) {
    // 1. orders 행 삽입
    const { data: order, error: orderError } = await _supabase
      .from('orders')
      .insert({
        user_id:       orderData.userId,
        status:        'paid',
        total_price:   orderData.totalPrice,
        shipping_fee:  orderData.shippingFee  || 0,
        shipping_info: orderData.shippingInfo || {},
        order_date:    new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (orderError) { console.error('주문 생성 실패:', orderError); return null; }

    // 2. order_items 행 삽입
    const items = (orderData.items || []).map(item => ({
      order_id:   order.id,
      product_id: item.productId || null,
      title:      item.title,
      thumbnail:  item.thumbnail || '',
      category:   item.category  || '',
      price:      item.price,
      quantity:   item.quantity,
    }));

    if (items.length) {
      const { error: itemError } = await _supabase.from('order_items').insert(items);
      if (itemError) { console.error('주문 아이템 생성 실패:', itemError); }
    }

    return order;
  },

  async updateStatus(id, status) {
    const { error } = await _supabase
      .from('orders')
      .update({ status })
      .eq('id', id);
    return !error;
  },
};

// ── Supabase 컬럼명(snake_case) → 기존 코드(camelCase) 변환 ──
// 기존 JS 코드가 order.totalPrice, order.orderDate, order.items 등을
// 참조하므로 필드명을 맞춰줍니다.
function normalizeOrder(order) {
  return {
    ...order,
    totalPrice:   order.total_price,
    shippingFee:  order.shipping_fee  || 0,
    orderDate:    order.order_date,
    shippingInfo: order.shipping_info,
    items:        (order.order_items || []).map(item => ({
      ...item,
      productId: item.product_id,
    })),
  };
}
