// ============================================================
// admin.js
// ✅ 수정1: renderProductList — 이벤트 리스너 누적 버그 수정 (innerHTML 방식 유지, outerHTML 클론 제거)
// ✅ 수정2: 재고 직접 수정 버튼 추가 (Postcard용)
// ✅ 수정3: admin.html에 productService 스크립트 추가로 인한 undefined 오류 해소
// ============================================================

function formatPrice(price) {
  return Number(price || 0).toLocaleString('ko-KR') + '원';
}

function getStatusText(status) {
  return { paid: '결제 완료', preparing: '구매 확정', shipped: '배송 중', delivered: '배송 완료', cancelled: '주문 취소' }[status] || status;
}

function ensureAdminAccess() {
  if (!userService.isAdmin()) {
    document.querySelector('.admin-page').innerHTML = `
      <div class="admin-guard">
        <h2>관리자만 접근할 수 있습니다.</h2>
        <p>현재 로그인한 계정은 관리자 권한이 없습니다.<br>관리자 계정으로 로그인한 뒤 다시 시도해주세요.</p>
      </div>
    `;
    return false;
  }
  return true;
}

function setActiveAdminLink(sectionId) {
  document.querySelectorAll('.admin-side-link').forEach((link) => {
    link.classList.toggle('is-active', link.dataset.sectionLink === sectionId);
  });
}

function initAdminSideMenu() {
  document.querySelectorAll('.admin-side-link').forEach((link) => {
    link.addEventListener('click', function () {
      setActiveAdminLink(link.dataset.sectionLink);
    });
  });
}

function initAdminScrollSpy() {
  function update() {
    const scrollY = window.scrollY + 140;
    let current = '';
    document.querySelectorAll('.admin-section').forEach((section) => {
      if (scrollY >= section.offsetTop && scrollY < section.offsetTop + section.offsetHeight) {
        current = section.id;
      }
    });
    if (current) setActiveAdminLink(current);
  }
  window.addEventListener('scroll', update);
  update();
}

// ── 상품 관리 ─────────────────────────────────────────────

async function renderProductList() {
  const listEl = document.getElementById('adminProductList');
  if (!listEl) return;

  // ✅ 로딩 표시
  listEl.innerHTML = `<div class="admin-empty">불러오는 중...</div>`;

  const products = await productService.getAll();

  if (!products.length) {
    listEl.innerHTML = `<div class="admin-empty">등록된 상품이 없습니다.</div>`;
    return;
  }

  // ✅ 최신순 정렬 (DB는 created_at ascending이므로 reverse)
  const sorted = products.slice().reverse();

  listEl.innerHTML = sorted.map((p) => {
    const isPostcard = (p.category || '').toLowerCase() === 'postcard';
    const stockHtml  = isPostcard
      ? `<span>재고: <strong>${p.stock != null ? p.stock + '개' : '-'}</strong>
           <input type="number" class="stock-input" data-product-stock-id="${p.id}"
             value="${p.stock || 0}" min="0"
             style="width:60px;border:1px solid #ddd;padding:2px 6px;font-size:11px;margin-left:6px;">
           <button type="button" class="white-btn" data-stock-save="${p.id}"
             style="height:24px;font-size:10px;padding:0 8px;margin-left:4px;">저장</button>
         </span>`
      : `<span>재고: 디지털 상품</span>`;
    return `
      <div class="admin-card">
        <div class="admin-thumb-row">
          <div class="admin-thumb"><img src="${p.thumbnail}" alt="${p.title}"></div>
          <div>
            <p class="admin-card-title">${p.title}</p>
            <div class="admin-meta-list">
              <span>카테고리: ${p.category || '-'}</span>
              <span>가격: ${formatPrice(p.price)}</span>
              <span>상태: ${p.status || 'active'}</span>
              <span>홈 노출: ${p.featured ? '예' : '아니오'}</span>
              ${stockHtml}
            </div>
            <p class="admin-card-sub">${p.description || ''}</p>
          </div>
          <div class="admin-card-actions">
            <button type="button" class="white-btn" data-product-delete="${p.id}">삭제</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // ✅ 수정: innerHTML 재렌더 후 이벤트 리스너를 새로 붙임 (누적 없음)
  listEl.querySelectorAll('[data-product-delete]').forEach((btn) => {
    btn.addEventListener('click', async function () {
      if (!window.confirm('이 상품을 삭제하시겠습니까?')) return;
      const ok = await productService.delete(btn.dataset.productDelete);
      if (ok) {
        await renderProductList();
        alert('상품이 삭제되었습니다.');
      } else {
        alert('삭제에 실패했습니다. 다시 시도해주세요.');
      }
    });
  });

  // ✅ 재고 저장 버튼
  listEl.querySelectorAll('[data-stock-save]').forEach((btn) => {
    btn.addEventListener('click', async function () {
      const productId = btn.dataset.stockSave;
      const input     = listEl.querySelector(`[data-product-stock-id="${productId}"]`);
      if (!input) return;
      const newStock = Number(input.value);
      const result   = await productService.updateStock(productId, newStock);
      if (result) {
        alert(`재고가 ${newStock}개로 업데이트되었습니다.`);
        await renderProductList();
      } else {
        alert('재고 업데이트에 실패했습니다.');
      }
    });
  });
}

function initProductForm() {
  const form = document.getElementById('productForm');
  if (!form) return;
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    const category = document.getElementById('productCategory').value;
    const stock    = Number(document.getElementById('productStock').value || 0);
    const imagesRaw = document.getElementById('productImages')?.value.trim() || '';
    const images = imagesRaw ? imagesRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];

    const downloadUrl = document.getElementById('productDownloadUrl')?.value.trim() || '';

    const result = await productService.create({
      title:        document.getElementById('productTitle').value.trim(),
      category,
      price:        Number(document.getElementById('productPrice').value),
      status:       document.getElementById('productStatus').value,
      thumbnail:    document.getElementById('productThumbnail').value.trim(),
      images:       images,
      download_url: downloadUrl || null,
      description:  document.getElementById('productDescription').value.trim(),
      featured:     true,
      stock:        category === 'postcard' ? stock : 0,
    });

    if (btn) btn.disabled = false;

    if (!result) {
      alert('상품 등록에 실패했습니다. 콘솔을 확인해주세요.');
      return;
    }

    form.reset();
    document.getElementById('productCategory').value = 'postcard';
    document.getElementById('productStatus').value   = 'active';
    document.getElementById('productStock').value    = '0';
    if (document.getElementById('productImages')) document.getElementById('productImages').value = '';
    if (document.getElementById('productDownloadUrl')) document.getElementById('productDownloadUrl').value = '';
    await renderProductList();
    alert('상품이 등록되었습니다.');
  });
}

// ── 공지 관리 ─────────────────────────────────────────────

async function renderNoticeList() {
  const listEl = document.getElementById('adminNoticeList');
  if (!listEl) return;
  listEl.innerHTML = `<div class="admin-empty">불러오는 중...</div>`;
  const notices = await noticeService.getAll();
  if (!notices.length) {
    listEl.innerHTML = `<div class="admin-empty">등록된 공지가 없습니다.</div>`;
    return;
  }
  listEl.innerHTML = notices.map((n) => `
    <div class="admin-card">
      <div class="admin-card-head">
        <div>
          <p class="admin-card-title">${n.title}</p>
          <p class="admin-card-sub">분류: ${n.category || 'notice'}<br>작성자: ${n.author || '관리자'}<br>날짜: ${n.date || '-'}</p>
        </div>
        <div class="admin-card-actions">
          <button type="button" class="white-btn" data-notice-delete="${n.id}">삭제</button>
        </div>
      </div>
      <p class="admin-card-sub">${n.content || ''}</p>
    </div>
  `).join('');
  listEl.querySelectorAll('[data-notice-delete]').forEach((btn) => {
    btn.addEventListener('click', async function () {
      if (!window.confirm('이 공지를 삭제하시겠습니까?')) return;
      await noticeService.delete(btn.dataset.noticeDelete);
      await renderNoticeList();
      alert('공지가 삭제되었습니다.');
    });
  });
}

function initNoticeForm() {
  const form = document.getElementById('noticeForm');
  if (!form) return;
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    const result = await noticeService.create({
      title:    document.getElementById('noticeTitle').value.trim(),
      category: document.getElementById('noticeCategory').value,
      author:   document.getElementById('noticeAuthor').value.trim() || '관리자',
      content:  document.getElementById('noticeContent').value.trim(),
    });

    if (btn) btn.disabled = false;

    if (!result) {
      alert('공지 등록에 실패했습니다. 콘솔을 확인해주세요.');
      return;
    }

    form.reset();
    document.getElementById('noticeCategory').value = 'notice';
    document.getElementById('noticeAuthor').value   = '관리자';
    await renderNoticeList();
    alert('공지가 등록되었습니다.');
  });
}

// ── 주문 관리 ─────────────────────────────────────────────

async function renderOrderList() {
  const listEl = document.getElementById('adminOrderList');
  if (!listEl) return;
  listEl.innerHTML = `<div class="admin-empty">불러오는 중...</div>`;
  const orders = await orderService.getAll();
  if (!orders.length) {
    listEl.innerHTML = `<div class="admin-empty">주문 데이터가 없습니다.</div>`;
    return;
  }
  const cards = await Promise.all(orders.map(async (order) => {
    const first = order.items?.[0] || {};
    const user  = await userService.getById(order.user_id);
    return `
      <div class="admin-card">
        <div class="admin-thumb-row">
          <div class="admin-thumb"><img src="${first.thumbnail || ''}" alt="${first.title || '상품'}"></div>
          <div>
            <p class="admin-card-title">${first.title || '상품명 없음'}</p>
            <div class="admin-meta-list">
              <span>주문번호: ${order.id}</span>
              <span>주문일자: ${order.orderDate || '-'}</span>
              <span>주문자: ${order.shippingInfo?.recipient || user?.name || '-'}</span>
              <span>연락처: ${order.shippingInfo?.phone || user?.phone || '-'}</span>
              <span>결제금액: ${formatPrice(order.totalPrice)}</span>
              <span>현재상태: ${getStatusText(order.status)}</span>
            </div>
          </div>
          <div class="admin-card-actions">
            <select class="admin-order-status" data-order-status="${order.id}">
              <option value="paid"      ${order.status === 'paid'      ? 'selected' : ''}>결제 완료</option>
              <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>구매 확정</option>
              <option value="shipped"   ${order.status === 'shipped'   ? 'selected' : ''}>배송 중</option>
              <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>배송 완료</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>주문 취소</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }));
  listEl.innerHTML = cards.join('');
  listEl.querySelectorAll('[data-order-status]').forEach((select) => {
    select.addEventListener('change', async function () {
      await orderService.updateStatus(select.dataset.orderStatus, select.value);
      alert('주문 상태가 변경되었습니다.');
    });
  });
}

// ── 초기화 ────────────────────────────────────────────────

async function initAdminPage() {
  await userService.init();
  if (!ensureAdminAccess()) return;

  initMobileMenu();
  toggleAdminMenu();
  updateLoginNavLink();

  // ✅ 순차 실행으로 변경 — Promise.all은 하나 실패 시 전체 실패 위험
  await renderProductList();
  await renderNoticeList();
  await renderOrderList();

  initProductForm();
  initNoticeForm();
  initAdminSideMenu();
  initAdminScrollSpy();
}

document.addEventListener('DOMContentLoaded', async function () {
  await initAdminPage();
});
