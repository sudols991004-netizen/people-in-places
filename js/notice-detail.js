// ============================================================
// notice-detail.js - noticeService 사용 (async/await)
// 이슈 6,7 수정: 좋아요 버튼 추가, 조회수 자동 증가
// ============================================================

// 좋아요 상태를 localStorage로 관리 (로그인 없이도 동작)
function getLikedKey(id) { return 'pip_liked_notice_' + id; }
function isLiked(id)     { return localStorage.getItem(getLikedKey(id)) === 'true'; }
function setLiked(id, v) { localStorage.setItem(getLikedKey(id), v ? 'true' : 'false'); }

async function renderNoticeDetail() {
  const titleEl   = document.getElementById('noticeTitle');
  const authorEl  = document.getElementById('noticeAuthor');
  const dateEl    = document.getElementById('noticeDate');
  const viewsEl   = document.getElementById('noticeViews');
  const likesEl   = document.getElementById('noticeLikes');
  const contentEl = document.getElementById('noticeContent');

  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) {
    if (titleEl)   titleEl.textContent = '존재하지 않는 게시물입니다.';
    if (contentEl) contentEl.innerHTML = '<p>요청하신 게시물을 찾을 수 없습니다.</p>';
    return;
  }

  // ✅ 이슈 7: 조회수 증가 (페이지 진입 시)
  await noticeService.incrementViews(id);

  const notice = await noticeService.getById(id);

  if (!notice) {
    if (titleEl)   titleEl.textContent = '존재하지 않는 게시물입니다.';
    if (contentEl) contentEl.innerHTML = '<p>요청하신 게시물을 찾을 수 없습니다.</p>';
    return;
  }

  if (titleEl)   titleEl.textContent  = notice.title;
  if (authorEl)  authorEl.textContent = notice.author;
  if (dateEl)    dateEl.textContent   = notice.date;
  if (viewsEl)   viewsEl.textContent  = notice.views;
  if (likesEl)   likesEl.textContent  = notice.likes;
  if (contentEl) contentEl.innerHTML  = notice.content;

  // ✅ 이슈 6: 좋아요 버튼 추가
  initLikeButton(id, notice.likes);
}

function initLikeButton(id, initialLikes) {
  // 기존 좋아요 버튼이 있으면 제거 후 재생성
  const existingBtn = document.getElementById('likeBtn');
  if (existingBtn) existingBtn.remove();

  const liked = isLiked(id);

  const likeBtn = document.createElement('button');
  likeBtn.id        = 'likeBtn';
  likeBtn.type      = 'button';
  likeBtn.className = 'like-btn' + (liked ? ' is-liked' : '');
  likeBtn.innerHTML = `
    <span class="like-icon">${liked ? '♥' : '♡'}</span>
    <span class="like-count" id="likeBtnCount">${initialLikes || 0}</span>
  `;

  // notice-detail-bottom 위에 삽입
  const bottomEl = document.querySelector('.notice-detail-bottom');
  if (bottomEl) {
    bottomEl.parentNode.insertBefore(likeBtn, bottomEl);
  }

  likeBtn.addEventListener('click', async function () {
    const currentLiked = isLiked(id);
    const updated = await noticeService.toggleLike(id, currentLiked);
    if (!updated) return;

    const newLiked = !currentLiked;
    setLiked(id, newLiked);

    likeBtn.className = 'like-btn' + (newLiked ? ' is-liked' : '');
    likeBtn.querySelector('.like-icon').textContent  = newLiked ? '♥' : '♡';
    likeBtn.querySelector('.like-count').textContent = updated.likes;

    // info 페이지 좋아요 수도 동기화
    const likesEl = document.getElementById('noticeLikes');
    if (likesEl) likesEl.textContent = updated.likes;
  });
}

window.addEventListener('pip:ready', async function () {
  await renderNoticeDetail();
});
