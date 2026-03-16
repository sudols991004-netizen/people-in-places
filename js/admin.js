// ============================================================
// admin.js - 이슈 4,5 수정: 상품등록 featured 필드 추가, 전체 기능 점검
// ============================================================

function formatPrice(price) {
  return Number(price || 0).toLocaleString('ko-KR') + '원';
}

function getStatusText(status) {
  return { paid: '결제 완료', preparing: '구매 확정', shipped: '배송 중', delivered: '배송 완료', cancelled: '주문 취소' }[status] || status;
}

function ensureAdminAccess() {
  if (!userService.isAdmin()) {
    document.body.innerHTML = `
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
  const products = await productService.getAll();
  if (!products.length) {
    listEl.innerHTML = `<div class="admin-empty">등록된 상품이 없습니다.</div>`;
    return;
  }
  listEl.innerHTML = products.slice().reverse().map((p) => `
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
          </div>
          <p class="admin-card-sub">${p.description || ''}</p>
        </div>
        <div class="admin-card-actions">
          <button type="button" class="white-btn" data-product-delete="${p.id}">삭제</button>
        </div>
      </div>
    </div>
  `).join('');
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
}

function initProductForm() {
  const form = document.getElementById('productForm');
  if (!form) return;
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    // ✅ 이슈 4 수정: featured 필드 추가
    const result = await productService.create({
      title:       document.getElementById('productTitle').value.trim(),
      category:    document.getElementById('productCategory').value,
      price:       Number(document.getElementById('productPrice').value),
      status:      document.getElementById('productStatus').value,
      thumbnail:   document.getElementById('productThumbnail').value.trim(),
      description: document.getElementById('productDescription').value.trim(),
      featured:    true,
    });

    if (btn) btn.disabled = false;

    if (!result) {
      alert('상품 등록에 실패했습니다. 콘솔을 확인해주세요.');
      return;
    }

    form.reset();
    document.getElementById('productCategory').value = 'postcard';
    document.getElementById('productStatus').value   = 'active';
    await renderProductList();
    alert('상품이 등록되었습니다.');
  });
}

// ── 공지 관리 ─────────────────────────────────────────────

async function renderNoticeList() {
  const listEl = document.getElementById('adminNoticeList');
  if (!listEl) return;
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
  const orders = await orderService.getAll();
  if (!orders.length) {
    listEl.innerHTML = `<div class="admin-empty">주문 데이터가 없습니다.</div>`;
    return;
  }
  listEl.innerHTML = await Promise.all(orders.map(async (order) => {
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
  })).then(items => items.join(''));
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

  // 공통 UI (헤더 등)도 초기화
  initMobileMenu();
  toggleAdminMenu();
  updateLoginNavLink();

  await Promise.all([
    renderProductList(),
    renderNoticeList(),
    renderOrderList(),
  ]);

  initProductForm();
  initNoticeForm();
  initAdminSideMenu();
  initAdminScrollSpy();
}

document.addEventListener('DOMContentLoaded', async function () {
  await initAdminPage();
});
