// ============================================================
// product-detail.js — pip:ready 이벤트 후 실행 (타이밍 보장)
// ============================================================

const POSTCARD_SHIPPING = 3000; // Postcard 배송비

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
  const isPostcard  = category.toLowerCase() === 'postcard';
  const description = product.description || '상품 설명이 아직 등록되지 않았습니다.';
  const stock       = product.stock != null ? product.stock : null;

  // Postcard: 재고 표시 / 배송비 안내
  const stockInfo = isPostcard && stock !== null
    ? `<p class="product-detail-stock">남은 수량: <strong>${stock}개</strong></p>`
    : '';

  const shippingInfo = isPostcard
    ? `<div class="product-detail-shipping">
        <span class="shipping-label">배송비</span>
        <span class="shipping-value">${formatPrice(POSTCARD_SHIPPING)} (우편 발송)</span>
      </div>
      <p class="shipping-notice">※ Postcard는 실물 상품으로 배송비 ${formatPrice(POSTCARD_SHIPPING)}이 추가됩니다.</p>`
    : `<div class="product-detail-shipping">
        <span class="shipping-label">배송</span>
        <span class="shipping-value">디지털 파일 다운로드 (배송비 없음)</span>
      </div>`;

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
        ${stockInfo}
        <div class="product-detail-desc">${description}</div>
        ${shippingInfo}
        <div class="product-detail-control">
          <div class="detail-row">
            <span class="detail-row-label">수량</span>
            <div class="quantity-box">
              <button type="button" class="quantity-btn" data-qty-minus ${isSoldout ? 'disabled' : ''}>-</button>
              <input type="text" class="quantity-input" id="detailQuantity" value="1" readonly>
              <button type="button" class="quantity-btn" data-qty-plus ${isSoldout ? 'disabled' : ''}>+</button>
            </div>
          </div>
          ${isPostcard ? `
          <div class="detail-row">
            <span class="detail-row-label">배송비</span>
            <span id="detailShipping">${formatPrice(POSTCARD_SHIPPING)}</span>
          </div>` : ''}
          <div class="detail-row detail-total">
            <span class="detail-row-label">총 금액</span>
            <strong id="detailTotalPrice">${formatPrice(product.price + (isPostcard ? POSTCARD_SHIPPING : 0))}</strong>
          </div>
          <div class="detail-button-group">
            <button type="button" class="white-btn" id="backToShopBtn">목록으로</button>
            <button type="button" class="black-btn" id="buyNowBtn" ${isSoldout ? 'disabled' : ''}>
              ${isSoldout ? '품절' : '주문하기'}
            </button>
          </div>
        </div>

        <!-- 배송/환불 정책 -->
        <div class="product-policy-wrap">
          <details class="policy-accordion">
            <summary class="policy-accordion-title">배송 안내</summary>
            <div class="policy-accordion-body">
              ${isPostcard ? `
              <p>· 우편 발송 방식으로 배송됩니다.</p>
              <p>· 결제 완료 후 영업일 기준 3~7일 이내 발송됩니다.</p>
              <p>· 배송비: 3,000원 (주문 금액에 포함)</p>
              <p>· 잘못된 주소 입력으로 인한 배송 실패는 책임지지 않습니다.</p>
              ` : `
              <p>· 디지털 파일로 제공되며 배송이 없습니다.</p>
              <p>· 결제 완료 후 마이페이지에서 즉시 다운로드 가능합니다.</p>
              <p>· 배송비 없음</p>
              `}
            </div>
          </details>
          <details class="policy-accordion">
            <summary class="policy-accordion-title">교환 / 환불 안내</summary>
            <div class="policy-accordion-body">
              ${isPostcard ? `
              <p>· 구매일로부터 7일 이내 환불 신청 가능합니다.</p>
              <p>· 상품 수령 후 포장 훼손 또는 사용한 경우 환불이 불가합니다.</p>
              <p>· 환불 문의: sudols991004@gmail.com</p>
              <p>· 환불은 영업일 기준 3~5일 내 처리됩니다.</p>
              ` : `
              <p>· 디지털 상품 특성상 다운로드 완료 후 환불이 불가합니다.</p>
              <p>· 다운로드 전 환불 신청은 구매일로부터 7일 이내 가능합니다.</p>
              <p>· 환불 문의: sudols991004@gmail.com</p>
              `}
            </div>
          </details>
        </div>

      </div>
    </div>
  `;
}

function updateDetailTotalPrice(unitPrice, quantity, isPostcard) {
  const shipping = isPostcard ? POSTCARD_SHIPPING : 0;
  const el = document.getElementById('detailTotalPrice');
  if (el) el.textContent = formatPrice(unitPrice * quantity + shipping);
}

function initQuantityControl(product) {
  const minusBtn  = document.querySelector('[data-qty-minus]');
  const plusBtn   = document.querySelector('[data-qty-plus]');
  const input     = document.getElementById('detailQuantity');
  const isPostcard = (product.category || '').toLowerCase() === 'postcard';
  const maxQty    = isPostcard && product.stock != null ? product.stock : Infinity;
  if (!minusBtn || !plusBtn || !input) return;
  const getQty = () => Number(input.value) || 1;
  minusBtn.addEventListener('click', () => {
    const q = getQty();
    if (q > 1) { input.value = q - 1; updateDetailTotalPrice(product.price, q - 1, isPostcard); }
  });
  plusBtn.addEventListener('click', () => {
    const q = getQty();
    if (isPostcard && q >= maxQty) {
      alert(`재고가 ${maxQty}개까지만 구매 가능합니다.`);
      return;
    }
    input.value = q + 1;
    updateDetailTotalPrice(product.price, q + 1, isPostcard);
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
      const isPostcard  = (product.category || '').toLowerCase() === 'postcard';
      const shipping    = isPostcard ? POSTCARD_SHIPPING : 0;
      const unitPrice   = Number(product.price || 0);
      const orderDraft = {
        productId:    product.id,
        title:        product.title,
        thumbnail:    product.thumbnail,
        price:        unitPrice,
        quantity,
        shippingFee:  shipping,
        totalPrice:   unitPrice * quantity + shipping,
        category:     product.category || '',
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
