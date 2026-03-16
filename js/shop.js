// ============================================================
// shop.js - productService 사용 (async/await)
// ============================================================

const PRODUCTS_PER_PAGE = 6;
let currentPage   = 1;
let currentFilter = 'all';
let cachedProducts = [];

function formatPrice(price) {
  return Number(price || 0).toLocaleString('ko-KR') + '원';
}

function getSoldOutBadge(product) {
  return product.status === 'soldout'
    ? `<span class="product-badge soldout">SOLD OUT</span>`
    : '';
}

function createProductCard(product) {
  return `
    <a href="product-detail.html?id=${product.id}" class="product-card">
      <div class="product-thumb">
        <img src="${product.thumbnail}" alt="${product.title}">
        ${getSoldOutBadge(product)}
      </div>
      <div class="product-meta">
        <p class="product-name">${product.title}</p>
        <p class="product-price">${formatPrice(product.price)}</p>
      </div>
    </a>
  `;
}

function renderPagination(totalPages) {
  const pageNumbers = document.getElementById('shopPageNumbers');
  const prevBtn     = document.querySelector('[data-shop-prev]');
  const nextBtn     = document.querySelector('[data-shop-next]');
  if (!pageNumbers || !prevBtn || !nextBtn) return;

  pageNumbers.innerHTML = '';
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages || totalPages === 0;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'page-number';
    btn.textContent = i;
    if (i === currentPage) { btn.classList.add('is-active'); btn.disabled = true; }
    btn.addEventListener('click', function () { currentPage = i; renderShopProducts(); });
    pageNumbers.appendChild(btn);
  }
}

function renderShopProducts() {
  const productList = document.getElementById('shopProductList');
  if (!productList) return;

  const filtered   = cachedProducts;
  const totalPages = Math.ceil(filtered.length / PRODUCTS_PER_PAGE);
  if (totalPages > 0 && currentPage > totalPages) currentPage = totalPages;

  if (!filtered.length) {
    productList.innerHTML = `<div class="shop-empty">등록된 상품이 없습니다.</div>`;
    renderPagination(0);
    return;
  }

  const start   = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const current = filtered.slice(start, start + PRODUCTS_PER_PAGE);
  productList.innerHTML = `<div class="product-grid">${current.map(createProductCard).join('')}</div>`;
  renderPagination(totalPages);
}

async function loadAndRender() {
  cachedProducts = await productService.getByCategory(currentFilter);
  currentPage = 1;
  renderShopProducts();
}

function initShopTabs() {
  const tabs = document.querySelectorAll('.shop-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', async function () {
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      currentFilter = tab.dataset.filter;
      await loadAndRender();
    });
  });
}

function initShopPaginationButtons() {
  const prevBtn = document.querySelector('[data-shop-prev]');
  const nextBtn = document.querySelector('[data-shop-next]');
  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      if (currentPage > 1) { currentPage--; renderShopProducts(); }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      const total = Math.ceil(cachedProducts.length / PRODUCTS_PER_PAGE);
      if (currentPage < total) { currentPage++; renderShopProducts(); }
    });
  }
}

window.addEventListener('pip:ready', async function () {
  initShopTabs();
  initShopPaginationButtons();
  await loadAndRender();
});
