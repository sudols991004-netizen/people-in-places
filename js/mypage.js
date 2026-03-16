// ============================================================
// mypage.js
// 수정: 주문상세 연결 + wallpaper 다운로드 버튼
// ============================================================

function formatPrice(price) {
  return Number(price || 0).toLocaleString('ko-KR') + '원';
}

function getStatusText(status) {
  return { paid: '결제 완료', preparing: '구매 확정', shipped: '배송 중', delivered: '배송 완료', cancelled: '주문 취소' }[status] || status;
}

function setGreetingText(userName, donationAmount) {
  ['historyUserName', 'detailUserName', 'profileUserName', 'deleteUserName'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = `${userName} 님 안녕하세요.`;
  });
  ['historyDonationAmount', 'detailDonationAmount', 'profileDonationAmount', 'deleteDonationAmount'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = formatPrice(donationAmount);
  });
}

// ── 주문 조회 ────────────────────────────────────────────────
function renderOrderHistory(orders) {
  const listEl = document.getElementById('orderHistoryList');
  if (!listEl) return;
  if (!orders.length) {
    listEl.innerHTML = `<p class="mypage-empty-msg">주문 내역이 없습니다.</p>`;
    return;
  }
  listEl.innerHTML = orders.map((order) => {
    const first = order.items && order.items[0];
    if (!first) return '';
    const isWallpaper = (first.category || '').toLowerCase() === 'wallpaper';
    return `
      <div class="order-card" data-order-id="${order.id}">
        <div class="order-card-head">
          <span>주문번호 ${order.id.slice(0,8)}...</span>
          <span>주문일자 ${order.orderDate || '-'}</span>
        </div>
        <div class="order-card-body">
          <div class="order-thumb"><img src="${first.thumbnail}" alt="${first.title}"></div>
          <div class="order-item-info">
            <p class="order-item-title">${first.title}</p>
            <p class="order-item-meta">수량 ${first.quantity}개<br>총 주문금액 ${formatPrice(order.totalPrice)}</p>
            <p class="order-item-status">${getStatusText(order.status)}</p>
          </div>
          <div class="order-card-actions">
            <button type="button" class="white-btn order-detail-btn" data-order-id="${order.id}">상세보기</button>
            ${isWallpaper ? `<button type="button" class="black-btn order-download-btn" data-thumbnail="${first.thumbnail}" data-title="${first.title}">다운로드</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // 상세보기 버튼 — 주문상세 섹션으로 이동 + 데이터 채우기
  listEl.querySelectorAll('.order-detail-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const orderId = btn.dataset.orderId;
      const order   = orders.find(o => o.id === orderId);
      if (!order) return;
      renderOrderDetail(order);
      // 주문상세 섹션으로 스크롤
      const detailSection = document.getElementById('order-detail');
      if (detailSection) {
        detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveMypageLink('order-detail');
      }
    });
  });

  // 다운로드 버튼
  listEl.querySelectorAll('.order-download-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      downloadWallpaper(btn.dataset.thumbnail, btn.dataset.title);
    });
  });
}

// ── Wallpaper 다운로드 ───────────────────────────────────────
function downloadWallpaper(thumbnailUrl, title) {
  const a = document.createElement('a');
  a.href     = thumbnailUrl;
  a.download = (title || 'wallpaper') + '.jpg';
  a.target   = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── 주문 상세 ────────────────────────────────────────────────
function renderOrderDetail(order) {
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '-';
  };

  setEl('detailOrderId',   order.id.slice(0, 8) + '...');
  setEl('detailOrderDate', order.orderDate || '-');
  setEl('detailRecipient', order.shippingInfo?.recipient || '-');
  setEl('detailPhone',     order.shippingInfo?.phone     || '-');
  setEl('detailEmail',     order.shippingInfo?.email     || '-');
  setEl('detailAddress',   order.shippingInfo?.address   || '-');
  setEl('detailItemPrice', formatPrice(order.totalPrice));
  setEl('detailFinalPrice', formatPrice(order.totalPrice));

  // 주문 상품 목록
  const productEl = document.getElementById('orderDetailProduct');
  if (productEl && order.items?.length) {
    productEl.innerHTML = order.items.map((item) => {
      const isWallpaper = (item.category || '').toLowerCase() === 'wallpaper';
      return `
        <div class="order-card">
          <div class="order-card-body">
            <div class="order-thumb"><img src="${item.thumbnail}" alt="${item.title}"></div>
            <div class="order-item-info">
              <p class="order-item-title">${item.title}</p>
              <p class="order-item-meta">
                수량 ${item.quantity}개<br>
                단가 ${formatPrice(item.price)}<br>
                상태 ${getStatusText(order.status)}
              </p>
            </div>
            <div class="order-card-actions">
              ${isWallpaper ? `<button type="button" class="black-btn" onclick="downloadWallpaper('${item.thumbnail}', '${item.title}')">다운로드</button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// ── 프로필 폼 ────────────────────────────────────────────────
function renderProfileForm(user) {
  const f = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  f('profileName',    user.name);
  f('profilePhone',   user.phone);
  f('profileEmail',   user.email);
  f('profileAddress', user.address);
}

function initProfileForm(user) {
  const form = document.getElementById('profileForm');
  if (!form) return;
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const password   = document.getElementById('profilePassword').value.trim();
    const updateData = {
      name:    document.getElementById('profileName').value.trim(),
      phone:   document.getElementById('profilePhone').value.trim(),
      email:   document.getElementById('profileEmail').value.trim(),
      address: document.getElementById('profileAddress')?.value.trim() || '',
    };
    await userService.update(user.id, updateData);
    if (password) {
      const result = await userService.updatePassword(password);
      if (!result.success) { alert('비밀번호 변경 실패: ' + result.message); return; }
    }
    alert('회원 정보가 수정되었습니다.');
    location.reload();
  });
}

// ── 회원 탈퇴 ────────────────────────────────────────────────
function initDeleteAccount(user) {
  const btn = document.getElementById('deleteAccountBtn');
  if (!btn) return;
  btn.addEventListener('click', async function () {
    if (!window.confirm('정말 탈퇴하시겠습니까?')) return;
    const ok = await userService.delete(user.id);
    if (ok) { alert('회원 탈퇴가 완료되었습니다.'); window.location.href = 'homepage.html'; }
    else    { alert('탈퇴 처리 중 오류가 발생했습니다.'); }
  });
}

// ── 사이드 메뉴 ──────────────────────────────────────────────
function setActiveMypageLink(sectionId) {
  document.querySelectorAll('.mypage-side-link').forEach((link) => {
    link.classList.toggle('is-active', link.dataset.sectionLink === sectionId);
  });
}

function initMypageSideMenu() {
  document.querySelectorAll('.mypage-side-link').forEach((link) => {
    link.addEventListener('click', function () { setActiveMypageLink(link.dataset.sectionLink); });
  });
}

function initMypageScrollSpy() {
  const HEADER_HEIGHT = 90;
  function getActiveSectionId() {
    const sections = Array.from(document.querySelectorAll('.mypage-section'));
    if (!sections.length) return '';
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    if (scrollY + window.innerHeight >= document.documentElement.scrollHeight - 10)
      return sections[sections.length - 1].id;
    let activeId = sections[0].id;
    for (const section of sections) {
      const top = section.getBoundingClientRect().top + scrollY;
      if (scrollY + HEADER_HEIGHT >= top) activeId = section.id;
    }
    return activeId;
  }
  function update() { const id = getActiveSectionId(); if (id) setActiveMypageLink(id); }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  setTimeout(update, 900);
}

// ── 초기화 ───────────────────────────────────────────────────
async function initMypage() {
  if (!userService.isLoggedIn()) {
    await userService.init();
  }
  const user = userService.getCurrent();
  if (!user) {
    alert('로그인이 필요합니다.');
    window.location.href = 'login.html';
    return;
  }

  const [orders, donation] = await Promise.all([
    orderService.getByUserId(user.id),
    orderService.getTotalPriceByUserId(user.id),
  ]);

  setGreetingText(user.name, donation);
  renderOrderHistory(orders);

  // 주문이 있으면 첫 번째 주문을 주문상세에 기본으로 표시
  if (orders.length > 0) {
    renderOrderDetail(orders[0]);
  }

  renderProfileForm(user);
  initProfileForm(user);
  initDeleteAccount(user);
  initMypageSideMenu();
  initMypageScrollSpy();
}

window.addEventListener('pip:ready', async function () {
  await initMypage();
});
