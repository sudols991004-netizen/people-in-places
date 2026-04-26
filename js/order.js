// ============================================================
// order.js — 부트페이 카카오페이 연동
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

  return new Promise((resolve, reject) => {
    BootPay.request({
      price:          totalPrice,
      application_id: BOOTPAY_APP_ID,
      name:           draft.title,
      order_id:       orderId,
      pg:             'kakao',
      method:         'easy',
      show_agree_window: 0,
      user: {
        username: document.getElementById('orderName').value.trim(),
        phone:    document.getElementById('orderPhone').value.trim().replace(/-/g, ''),
        email:    document.getElementById('orderEmail').value.trim(),
      },
      items: [{
        item_name: draft.title,
        qty:       draft.quantity,
        unique:    draft.productId || orderId,
        price:     draft.price,
      }],
      extra: {
        open_type: 'iframe',
      },
    }).error(function(data) {
      reject(data);
    }).cancel(function(data) {
      reject({ event: 'cancel', ...data });
    }).done(function(data) {
      const params = new URLSearchParams({
        orderId,
        amount:    totalPrice,
        receiptId: data.receipt_id || '',
      });
      window.location.href = 'order-success.html?' + params.toString();
      resolve(data);
    });
  });
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
      if (err.event !== 'cancel' && err.event !== 'close') {
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
