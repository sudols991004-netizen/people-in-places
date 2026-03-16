// ============================================================
// homepage.js - productService 사용 (async/await)
// ============================================================

function createGalleryItem(product) {
  return `
    <div class="gallery-item">
      <a href="product-detail.html?id=${product.id}">
        <img src="${product.thumbnail}" alt="${product.title}">
      </a>
    </div>
  `;
}

async function renderHomepageGallery() {
  const wallpaperTrack = document.getElementById('wallpaperTrack');
  const postcardTrack  = document.getElementById('postcardTrack');
  if (!wallpaperTrack || !postcardTrack) return;

  const products = await productService.getFeatured();

  const wallpapers = products.filter(p => (p.category || p.type || '') === 'wallpaper');
  const postcards  = products.filter(p => (p.category || p.type || '') === 'postcard');

  wallpaperTrack.innerHTML = wallpapers.length
    ? wallpapers.map(createGalleryItem).join('')
    : `<div class="gallery-item"><p>등록된 wallpaper 상품이 없습니다.</p></div>`;

  postcardTrack.innerHTML = postcards.length
    ? postcards.map(createGalleryItem).join('')
    : `<div class="gallery-item"><p>등록된 postcard 상품이 없습니다.</p></div>`;

  initGallerySliders();
}

function initGallerySliders() {
  const sliders = document.querySelectorAll('[data-slider]');
  sliders.forEach((slider) => {
    const track   = slider.querySelector('.gallery-track');
    const prevBtn = slider.querySelector('[data-prev]');
    const nextBtn = slider.querySelector('[data-next]');
    if (!track || !prevBtn || !nextBtn) return;

    let currentIndex = 0;

    function getItems()    { return slider.querySelectorAll('.gallery-item'); }
    function getPerView()  {
      if (window.innerWidth <= 768)  return 1;
      if (window.innerWidth <= 1024) return 2;
      return 3;
    }
    function getItemWidth() {
      const items = getItems();
      if (!items[0]) return 0;
      const style = window.getComputedStyle(items[0]);
      return items[0].offsetWidth + (parseFloat(style.marginRight) || 0);
    }
    function updateSlider() {
      const items    = getItems();
      const perView  = getPerView();
      const maxIndex = Math.max(items.length - perView, 0);
      const itemWidth = getItemWidth();
      if (currentIndex > maxIndex) currentIndex = maxIndex;
      if (currentIndex < 0)        currentIndex = 0;
      track.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex >= maxIndex;
    }

    prevBtn.addEventListener('click', () => { currentIndex -= 1; updateSlider(); });
    nextBtn.addEventListener('click', () => { currentIndex += 1; updateSlider(); });
    window.addEventListener('resize', updateSlider);
    updateSlider();
  });
}

window.addEventListener('pip:ready', async function () {
  await renderHomepageGallery();
});
