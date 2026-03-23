// ============================================================
// orderService.js — Supabase public.orders + order_items 연동
// ✅ 수정: 주문 생성 시 Postcard 재고 차감 로직 추가
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

    // ✅ 수정: Postcard인 경우 재고 차감
    // 각 아이템을 순회하며 category가 postcard인 것만 stock 감소
    for (const item of (orderData.items || [])) {
      const isPostcard = (item.category || '').toLowerCase() === 'postcard';
      if (!isPostcard || !item.productId) continue;

      // 현재 재고 조회
      const { data: product } = await _supabase
        .from('products')
        .select('stock, status')
        .eq('id', item.productId)
        .single();

      if (!product) continue;

      const currentStock = Number(product.stock || 0);
      const newStock     = Math.max(currentStock - Number(item.quantity || 1), 0);
      const newStatus    = newStock <= 0 ? 'soldout' : 'active';

      const { error: stockError } = await _supabase
        .from('products')
        .update({ stock: newStock, status: newStatus })
        .eq('id', item.productId);

      if (stockError) {
        console.error('재고 차감 실패:', stockError);
      } else {
        console.log(`재고 차감 완료 — 상품 ${item.productId}: ${currentStock} → ${newStock}`);
      }
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
