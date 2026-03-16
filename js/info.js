// ============================================================
// info.js - noticeService 사용 (async/await)
// ============================================================

const POSTS_PER_PAGE = 5;
let currentPage  = 1;
let filteredData = [];

function renderNoticeTable() {
  const noticeTableBody = document.getElementById('noticeTableBody');
  if (!noticeTableBody) return;

  noticeTableBody.innerHTML = '';
  const start   = (currentPage - 1) * POSTS_PER_PAGE;
  const current = filteredData.slice(start, start + POSTS_PER_PAGE);

  if (!current.length) {
    noticeTableBody.innerHTML = '<div class="notice-empty">게시물이 없습니다.</div>';
    renderPagination();
    return;
  }

  current.forEach(function (post) {
    const row = document.createElement('div');
    row.className  = 'notice-row';
    row.dataset.id = post.id;
    row.innerHTML =
      `<div class="notice-col notice-col-title">${post.title}</div>` +
      `<div class="notice-col notice-col-author">${post.author}</div>` +
      `<div class="notice-col notice-col-date">${post.date}</div>` +
      `<div class="notice-col notice-col-view">${post.views}</div>` +
      `<div class="notice-col notice-col-like">${post.likes}</div>`;
    row.addEventListener('click', function () {
      window.location.href = 'notice-detail.html?id=' + post.id;
    });
    noticeTableBody.appendChild(row);
  });

  renderPagination();
}

function renderPagination() {
  const noticePagination = document.getElementById('noticePagination');
  if (!noticePagination) return;
  noticePagination.innerHTML = '';

  const totalPages = Math.ceil(filteredData.length / POSTS_PER_PAGE);
  if (totalPages <= 0) return;

  const prevBtn = document.createElement('button');
  prevBtn.className   = 'page-arrow';
  prevBtn.textContent = '<';
  prevBtn.disabled    = currentPage === 1;
  prevBtn.addEventListener('click', function () {
    if (currentPage > 1) { currentPage--; renderNoticeTable(); }
  });
  noticePagination.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className   = 'page-number';
    btn.textContent = i;
    if (i === currentPage) { btn.classList.add('is-active'); btn.disabled = true; }
    btn.addEventListener('click', function () { currentPage = i; renderNoticeTable(); });
    noticePagination.appendChild(btn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.className   = 'page-arrow';
  nextBtn.textContent = '>';
  nextBtn.disabled    = currentPage === totalPages;
  nextBtn.addEventListener('click', function () {
    if (currentPage < totalPages) { currentPage++; renderNoticeTable(); }
  });
  noticePagination.appendChild(nextBtn);
}

window.addEventListener('pip:ready', async function () {
  filteredData = await noticeService.getSortedByLatest();
  renderNoticeTable();

  const noticeSearchForm  = document.getElementById('noticeSearchForm');
  const noticeSearchInput = document.getElementById('noticeSearchInput');

  if (noticeSearchForm) {
    noticeSearchForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      filteredData = await noticeService.search(noticeSearchInput.value);
      currentPage  = 1;
      renderNoticeTable();
    });
  }
});
