// ============================================================
// common.js - 모든 페이지 공통 기능
// ============================================================

function initMobileMenu() {
  const menuBtn = document.querySelector('.menu-btn');
  const header  = document.querySelector('.header');
  if (!menuBtn || !header) return;
  menuBtn.addEventListener('click', function () {
    header.classList.toggle('nav-open');
  });
}

function initRevealAnimation() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
          entry.target.classList.add('is-visible');
        }
      });
    },
    { threshold: 0.15 }
  );
  reveals.forEach((item) => observer.observe(item));
}

function toggleAdminMenu() {
  const desktopLink = document.getElementById('adminMenuLink');
  const mobileLink  = document.getElementById('mobileAdminMenuLink');
  const isAdmin = userService.isAdmin();
  if (desktopLink) desktopLink.style.display = isAdmin ? 'inline-block' : 'none';
  if (mobileLink)  mobileLink.style.display  = isAdmin ? 'block'        : 'none';
}

// ✅ 이슈 2 수정: Login → Logout 전환
// login.html 페이지 자체는 모달 방식이므로 제외
function updateLoginNavLink() {
  const isLoggedIn  = userService.isLoggedIn();
  const isLoginPage = window.location.pathname.includes('login.html');
  if (isLoginPage) return;

  document.querySelectorAll('a[href="login.html"]').forEach(function (link) {
    if (isLoggedIn) {
      link.textContent = 'Logout';
      link.removeAttribute('href');
      link.style.cursor = 'pointer';
      const newLink = link.cloneNode(true);
      newLink.addEventListener('click', async function (e) {
        e.preventDefault();
        await userService.logout();
        window.location.href = 'homepage.html';
      });
      link.parentNode.replaceChild(newLink, link);
    } else {
      link.textContent = 'Login';
      link.href = 'login.html';
    }
  });
}

// login.html이 아닌 페이지에서 Login 링크 클릭 시 return URL 저장
// updateLoginNavLink() 이후 실행 → Logout으로 바뀐 링크(href 없음)는 자동 제외
function initLoginLinks() {
  if (window.location.pathname.includes('login.html')) return;
  document.querySelectorAll('a[href="login.html"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      sessionStorage.setItem('pip_return_url', window.location.href);
      window.location.href = 'login.html';
    });
  });
}

async function initCommon() {
  await userService.init();
  initMobileMenu();
  initRevealAnimation();
  toggleAdminMenu();
  updateLoginNavLink();
  initLoginLinks();

  window.dispatchEvent(new CustomEvent('pip:ready'));
}

document.addEventListener('DOMContentLoaded', async function () {
  const path = window.location.pathname;
  if (path.includes('admin.html')) return;
  if (path.includes('login.html')) return;
  await initCommon();
});
