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

function updateLoginNavLink() {
  const isLoggedIn = userService.isLoggedIn();
  const allLoginLinks = document.querySelectorAll('a[href="login.html"]');
  allLoginLinks.forEach(function (link) {
    if (isLoggedIn) {
      link.textContent = 'Logout';
      link.href = '#';
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

function initLoginLinks() {
  if (window.location.pathname.includes('login.html')) return;
  const loginLinks = document.querySelectorAll('a[href="login.html"]');
  loginLinks.forEach(function (link) {
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

  // ✅ userService.init() 완료 후 pip:ready 이벤트 발행
  // 각 페이지 JS는 이 이벤트를 받은 후 실행 → 타이밍 충돌 해결
  window.dispatchEvent(new CustomEvent('pip:ready'));
}

document.addEventListener('DOMContentLoaded', async function () {
  const path = window.location.pathname;
  if (path.includes('admin.html')) return;
  await initCommon();
});
