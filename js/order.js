// ============================================================
// order.js — 토스페이먼츠 v2 연동
// ============================================================

const TOSS_CLIENT_KEY = 'test_ck_6bJXmgo28ew2NMPx6l4YVLAnGKWx';

function formatPrice(price) {
  return Number(price || 0).toLocaleString('ko-KR') + '원';
}

function getSelectedProductOrder() {
  const saved = localStorage.getItem('selectedProductOrder');
  return saved ? JSON.parse(saved) : null;
}

function clearSelectedProductOrder() {
  localStorage.removeItem('selectedProductOrder');
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

  container.innerHTML = `
    <div class="order-product-card">
      <div class="order-product-thumb">
        <img src="${draft.thumbnail}" alt="${draft.title}">
      </div>
      <div>
        <p class="order-product-title">${draft.title}</p>
        <p class="order-product-meta">수량 ${draft.quantity}개<br>단가 ${formatPrice(draft.price)}</p>
      </div>
    </div>
  `;
  if (itemPriceEl)  itemPriceEl.textContent  = formatPrice(draft.price);
  if (quantityEl)   quantityEl.textContent   = `${draft.quantity}개`;
  if (finalPriceEl) finalPriceEl.textContent = formatPrice(draft.totalPrice);
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

// ── 입력값 유효성 체크 ───────────────────────────────────────
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

// ── 토스페이먼츠 결제 요청 ───────────────────────────────────
async function requestTossPayment(draft) {
  const user = userService.getCurrent();

  // 주문 고유 ID 생성 (타임스탬프 + 랜덤)
  const orderId = 'PIP-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();

  // 결제 전 임시 주문 정보 저장 (결제 완료 콜백에서 사용)
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

  // 토스페이먼츠 클라이언트 초기화
  const tossPayments = TossPayments(TOSS_CLIENT_KEY);
  const payment = tossPayments.payment({
    customerKey: user?.id || 'GUEST-' + Date.now(),
  });

  // 결제창 호출
  await payment.requestPayment({
    method: 'CARD',
    amount: {
      currency: 'KRW',
      value: Number(draft.totalPrice),
    },
    orderId,
    orderName: draft.title,
    customerName: document.getElementById('orderName').value.trim(),
    customerEmail: document.getElementById('orderEmail').value.trim(),
    customerMobilePhone: document.getElementById('orderPhone').value.trim().replace(/-/g, ''),
    successUrl: window.location.origin + '/order-success.html',
    failUrl:    window.location.origin + '/order-fail.html',
  });
}

// ── 결제하기 버튼 ────────────────────────────────────────────
function initOrderForm(draft) {
  const submitBtn = document.getElementById('submitOrderBtn');
  if (!submitBtn) return;

  submitBtn.addEventListener('click', async function () {
    if (!validateOrderForm()) return;

    this.disabled    = true;
    this.textContent = '결제창 로딩 중...';

    try {
      await requestTossPayment(draft);
    } catch (err) {
      // 사용자가 결제창을 닫은 경우 등
      if (err.code === 'USER_CANCEL') {
        // 취소는 에러 아님 — 조용히 처리
      } else {
        alert('결제 중 오류가 발생했습니다: ' + (err.message || ''));
      }
    } finally {
      this.disabled    = false;
      this.textContent = '결제하기';
    }
  });
}

async function initOrderPage() {
  await userService.init();

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
}

document.addEventListener('DOMContentLoaded', async function () {
  await initOrderPage();
});
