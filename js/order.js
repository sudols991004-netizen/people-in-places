// ============================================================
// order.js — 부트페이(신버전 SDK 4.x) 카카오페이 연동
// ※ order.html의 SDK 스크립트를 신버전으로 교체해야 합니다.
//    기존:  <script src="https://cdn.bootpay.co.kr/js/bootpay-3.3.2.min.js"></script>
//    변경:  <script src="https://js.bootpay.co.kr/bootpay-4.3.4.min.js"></script>
// ============================================================

const BOOTPAY_APP_ID    = '69c0df54a4c431ccafe65f84';
const POSTCARD_SHIPPING = 3000;

function formatPrice(price) {
  return Number(price || 0).toLocaleString('ko-KR') + '원';
}

function getSelectedProductOrder() {
  const saved = localStorage.getItem('selectedProductOrder');
  return saved ? JSON.parse(saved) : null;
}

function renderEmptyOrderPage() {
  const layout = document.querySelector('.order-layout');
  if (!layout) return;
  layout.innerHTML = `
    <div class="order-empty">
      <h2>주문할 상품이 없습니다.</h2>
      <p>먼저 상품 상세 페이지에서 주문할 상품을 선택해주세요.<br>shop 페이지에서 다시 확인해주세요.</p>
      <button type="button" class="black-btn" id="goShopBtn">Shop으로 이동</button>
    </div>
  `;
  const btn = document.getElementById('goShopBtn');
  if (btn) btn.addEventListener('click', () => window.location.href = 'shop.html');
}

function renderOrderSummary(draft) {
  const container    = document.getElementById('orderSummaryContainer');
  const itemPriceEl  = document.getElementById('summaryItemPrice');
  const quantityEl   = document.getElementById('summaryQuantity');
  const finalPriceEl = document.getElementById('summaryFinalPrice');
  if (!container) return;

  const isPostcard  = (draft.category || '').toLowerCase() === 'postcard';
  const shippingFee = draft.shippingFee != null ? draft.shippingFee : (isPostcard ? POSTCARD_SHIPPING : 0);
  const itemTotal   = draft.price * draft.quantity;
  const finalTotal  = draft.totalPrice || (itemTotal + shippingFee);

  container.innerHTML = `
    <div class="order-product-card">
      <div class="order-product-thumb">
        <img src="${draft.thumbnail}" alt="${draft.title}">
      </div>
      <div>
        <p class="order-product-title">${draft.title}</p>
        <p class="order-product-meta">수량 ${draft.quantity}개<br>단가 ${formatPrice(draft.price)}</p>
        ${isPostcard ? `<p class="order-product-meta" style="margin-top:4px;color:#c00;">배송비 ${formatPrice(shippingFee)} 포함</p>` : ''}
      </div>
    </div>
  `;
  if (itemPriceEl)  itemPriceEl.textContent  = formatPrice(itemTotal);
  if (quantityEl)   quantityEl.textContent   = `${draft.quantity}개`;
  if (finalPriceEl) finalPriceEl.textContent = formatPrice(finalTotal);

  const shippingRow = document.getElementById('summaryShippingRow');
  const shippingEl  = document.getElementById('summaryShipping');
  if (shippingRow) shippingRow.style.display = isPostcard ? 'flex' : 'none';
  if (shippingEl && isPostcard) shippingEl.textContent = formatPrice(shippingFee);
}

function fillOrderFormUserInfo() {
  const user = userService.getCurrent();
  if (!user) return;
  const f = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  f('orderName',    user.name);
  f('orderPhone',   user.phone);
  f('orderEmail',   user.email);
  f('orderAddress', user.address);
}

function validateOrderForm() {
  const recipient = document.getElementById('orderName').value.trim();
  const phone     = document.getElementById('orderPhone').value.trim();
  const email     = document.getElementById('orderEmail').value.trim();
  const address   = document.getElementById('orderAddress').value.trim();

  if (!recipient) { alert('주문자명을 입력해주세요.'); return false; }
  if (!phone)     { alert('휴대폰 번호를 입력해주세요.'); return false; }
  if (!email)     { alert('이메일을 입력해주세요.'); return false; }
  if (!address)   { alert('배송지를 입력해주세요.'); return false; }
  return true;
}

async function requestBootpayPayment(draft) {
  const user    = userService.getCurrent();
  const orderId = 'PIP-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();

  const isPostcard  = (draft.category || '').toLowerCase() === 'postcard';
  const shippingFee = draft.shippingFee != null ? draft.shippingFee : (isPostcard ? POSTCARD_SHIPPING : 0);
  const totalPrice  = Number(draft.totalPrice || draft.price * draft.quantity + shippingFee);

  const pendingOrder = {
    orderId,
    draft,
    shippingInfo: {
      recipient: document.getElementById('orderName').value.trim(),
      phone:     document.getElementById('orderPhone').value.trim(),
      email:     document.getElementById('orderEmail').value.trim(),
      address:   document.getElementById('orderAddress').value.trim(),
      memo:      document.getElementById('orderMemo').value.trim(),
    },
    userId: user?.id || '',
  };
  sessionStorage.setItem('pip_pending_order', JSON.stringify(pendingOrder));

  // ── 신버전 SDK 4.x: Promise 기반 requestPayment ──
  // pg / method 값은 부트페이 관리자 > 개발자 설정 > 연동 코드에 표기된
  // 값과 일치해야 합니다. 계속 에러가 나면 pg/method 두 줄을 지워보세요.
  // (활성화된 결제수단이 카카오페이 하나뿐이면 자동으로 카카오페이가 뜹니다)
  const response = await Bootpay.requestPayment({
    application_id: BOOTPAY_APP_ID,
    price:          totalPrice,
    order_name:     draft.title,
    order_id:       orderId,
    pg:             '카카오페이',
    method:         '간편결제',
    tax_free:       0,
    user: {
      id:       user?.id || '',
      username: document.getElementById('orderName').value.trim(),
      phone:    document.getElementById('orderPhone').value.trim().replace(/-/g, ''),
      email:    document.getElementById('orderEmail').value.trim(),
    },
    items: [{
      id:    String(draft.productId || orderId),
      name:  draft.title,
      qty:   draft.quantity,
      price: draft.price,
    }],
    extra: {
      open_type: 'iframe',
    },
  });

  // 결제 완료(done) 시 성공 페이지로 이동
  if (response.event === 'done') {
    const receiptId =
      (response.data && response.data.receipt_id) || response.receipt_id || '';
    const params = new URLSearchParams({
      orderId,
      amount:    totalPrice,
      receiptId,
    });
    window.location.href = 'order-success.html?' + params.toString();
  }
  return response;
}

function initOrderForm(draft) {
  const submitBtn = document.getElementById('submitOrderBtn');
  if (!submitBtn) return;
  submitBtn.addEventListener('click', async function () {
    if (!validateOrderForm()) return;
    this.disabled    = true;
    this.textContent = '결제창 로딩 중...';
    try {
      await requestBootpayPayment(draft);
    } catch (err) {
      // 신버전 SDK는 취소/에러 모두 throw 됩니다
      if (err && err.event !== 'cancel' && err.event !== 'close') {
        alert('결제 중 오류가 발생했습니다: ' + (err.message || JSON.stringify(err)));
      }
    } finally {
      this.disabled    = false;
      this.textContent = '결제하기';
    }
  });
}

window.addEventListener('pip:ready', async function () {
  if (!userService.isLoggedIn()) {
    alert('로그인이 필요합니다.');
    sessionStorage.setItem('pip_return_url', window.location.href);
    window.location.href = 'login.html';
    return;
  }
  const draft = getSelectedProductOrder();
  if (!draft) { renderEmptyOrderPage(); return; }
  renderOrderSummary(draft);
  fillOrderFormUserInfo();
  initOrderForm(draft);
});
