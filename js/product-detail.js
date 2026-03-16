// ============================================================
// product-detail.js — pip:ready 이벤트 후 실행 (타이밍 보장)
// ============================================================

function formatPrice(price) {
  return Number(price || 0).toLocaleString('ko-KR') + '원';
}

function getStatusLabel(status) {
  return { active: '판매중', soldout: '품절', hidden: '숨김' }[status] || status;
}

function createStatusBadge(product) {
  const status  = product.status || 'active';
  const soldout = status === 'soldout';
  return `<span class="product-detail-status${soldout ? ' soldout' : ''}">${getStatusLabel(status)}</span>`;
}

function createEmptyDetail() {
  return `
    <div class="product-detail-empty">
      <h2>상품을 찾을 수 없습니다.</h2>
      <p>요청하신 상품 정보가 없거나 삭제되었을 수 있습니다.<br>shop 페이지에서 다시 확인해주세요.</p>
      <a href="shop.html" class="black-btn">Shop으로 이동</a>
    </div>
  `;
}

function createProductDetail(product) {
  const category    = product.category || '';
  const isSoldout   = product.status === 'soldout';
  const description = product.description || '상품 설명이 아직 등록되지 않았습니다.';
  return `
    <div class="product-detail-layout">
      <div class="product-detail-image-wrap">
        <img src="${product.thumbnail}" alt="${product.title}">
      </div>
      <div class="product-detail-info">
        <p class="product-detail-category">${category}</p>
        <h2 class="product-detail-title">${product.title}</h2>
        <p class="product-detail-price">${formatPrice(product.price)}</p>
        ${createStatusBadge(product)}
        <div class="product-detail-desc">${description}</div>
        <div class="product-detail-control">
          <div class="detail-row">
            <span class="detail-row-label">수량</span>
            <div class="quantity-box">
              <button type="button" class="quantity-btn" data-qty-minus ${isSoldout ? 'disabled' : ''}>-</button>
              <input type="text" class="quantity-input" id="detailQuantity" value="1" readonly>
              <button type="button" class="quantity-btn" data-qty-plus ${isSoldout ? 'disabled' : ''}>+</button>
            </div>
          </div>
          <div class="detail-row detail-total">
            <span class="detail-row-label">총 금액</span>
            <strong id="detailTotalPrice">${formatPrice(product.price)}</strong>
          </div>
          <div class="detail-button-group">
            <button type="button" class="white-btn" id="backToShopBtn">목록으로</button>
            <button type="button" class="black-btn" id="buyNowBtn" ${isSoldout ? 'disabled' : ''}>
              ${isSoldout ? '품절' : '주문하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function updateDetailTotalPrice(unitPrice, quantity) {
  const el = document.getElementById('detailTotalPrice');
  if (el) el.textContent = formatPrice(unitPrice * quantity);
}

function initQuantityControl(product) {
  const minusBtn = document.querySelector('[data-qty-minus]');
  const plusBtn  = document.querySelector('[data-qty-plus]');
  const input    = document.getElementById('detailQuantity');
  if (!minusBtn || !plusBtn || !input) return;
  const getQty = () => Number(input.value) || 1;
  minusBtn.addEventListener('click', () => {
    const q = getQty();
    if (q > 1) { input.value = q - 1; updateDetailTotalPrice(product.price, q - 1); }
  });
  plusBtn.addEventListener('click', () => {
    const q = getQty() + 1;
    input.value = q;
    updateDetailTotalPrice(product.price, q);
  });
}

// ── 결제 모달 ────────────────────────────────────────────────
function openPaymentModal(product, quantity) {
  const modal    = document.getElementById('paymentModal');
  const backdrop = document.getElementById('paymentBackdrop');
  if (!modal || !backdrop) return;
  document.getElementById('payModalThumb').src              = product.thumbnail;
  document.getElementById('payModalThumb').alt              = product.title;
  document.getElementById('payModalTitle').textContent      = product.title;
  document.getElementById('payModalCategory').textContent   = product.category || '';
  document.getElementById('payModalQty').textContent        = `${quantity}개`;
  document.getElementById('payModalPrice').textContent      = formatPrice(Number(product.price || 0) * quantity);
  backdrop.classList.add('is-open');
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closePaymentModal() {
  const modal    = document.getElementById('paymentModal');
  const backdrop = document.getElementById('paymentBackdrop');
  if (modal)    modal.classList.remove('is-open');
  if (backdrop) backdrop.classList.remove('is-open');
  document.body.style.overflow = '';
}

function initDetailButtons(product) {
  const backBtn    = document.getElementById('backToShopBtn');
  const buyBtn     = document.getElementById('buyNowBtn');
  const input      = document.getElementById('detailQuantity');
  const backdrop   = document.getElementById('paymentBackdrop');
  const closeBtn   = document.getElementById('payModalClose');
  const cancelBtn  = document.getElementById('payModalCancel');
  const confirmBtn = document.getElementById('payModalConfirm');

  if (backBtn) backBtn.addEventListener('click', () => window.location.href = 'shop.html');

  if (buyBtn) {
    buyBtn.addEventListener('click', function () {
      if (!userService.isLoggedIn()) {
        sessionStorage.setItem('pip_return_url', window.location.href);
        window.location.href = 'login.html';
        return;
      }
      const quantity   = Number(input?.value || 1);
      const orderDraft = {
        productId:  product.id,
        title:      product.title,
        thumbnail:  product.thumbnail,
        price:      Number(product.price || 0),
        quantity,
        totalPrice: Number(product.price || 0) * quantity,
        category:   product.category || '',
      };
      localStorage.setItem('selectedProductOrder', JSON.stringify(orderDraft));
      window.location.href = 'order.html';
    });
  }

  if (backdrop)  backdrop.addEventListener('click',  closePaymentModal);
  if (closeBtn)  closeBtn.addEventListener('click',  closePaymentModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closePaymentModal);
  if (confirmBtn) {
    confirmBtn.addEventListener('click', function () {
      closePaymentModal();
      window.location.href = 'order.html';
    });
  }
}

async function renderProductDetailPage() {
  const container = document.getElementById('productDetailContainer');
  if (!container) return;
  const productId = new URLSearchParams(window.location.search).get('id');
  if (!productId) { container.innerHTML = createEmptyDetail(); return; }
  const product = await productService.getById(productId);
  if (!product)  { container.innerHTML = createEmptyDetail(); return; }
  container.innerHTML = createProductDetail(product);
  initQuantityControl(product);
  initDetailButtons(product);
}

// ✅ pip:ready 이벤트 대기 — userService.init() 완료 보장
window.addEventListener('pip:ready', async function () {
  await renderProductDetailPage();
});
