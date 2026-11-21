(function () {
  'use strict';

  function initModelsCatalog() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;

    const filterBtns = document.querySelectorAll('.filter-pill[data-filter]');
    const searchInput = document.getElementById('catalog-search');
    const statusLine = document.getElementById('catalog-count');
    const emptyState = document.getElementById('catalog-empty');
    const resetBtn = document.getElementById('catalog-reset');
    const cards = Array.from(grid.querySelectorAll('.catalog-card[data-category]'));

    let activeFilter = 'all';

    function applyFilter() {
      const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
      let visibleCount = 0;

      cards.forEach((card) => {
        const cat = card.getAttribute('data-category') || '';
        const haystack = (card.getAttribute('data-keywords') || card.textContent).toLowerCase();
        const matchesCat = activeFilter === 'all' || cat === activeFilter;
        const matchesQuery = !query || haystack.includes(query);
        const show = matchesCat && matchesQuery;
        card.hidden = !show;
        if (show) visibleCount += 1;
      });

      if (statusLine) {
        statusLine.textContent = `${visibleCount} ${visibleCount === 1 ? 'model' : 'models'} shown`;
      }
      if (emptyState) {
        emptyState.hidden = visibleCount > 0;
      }
    }

    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFilter = btn.getAttribute('data-filter') || 'all';
        filterBtns.forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
        applyFilter();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', applyFilter);
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        activeFilter = 'all';
        if (searchInput) searchInput.value = '';
        filterBtns.forEach((b) => b.setAttribute('aria-pressed', b.getAttribute('data-filter') === 'all' ? 'true' : 'false'));
        applyFilter();
        if (searchInput) searchInput.focus();
      });
    }

    applyFilter();
  }

  function initHistoryJumpSync() {
    const links = document.querySelectorAll('.era-jump-link[href^="#"]');
    const timeline = document.getElementById('vertical-timeline');
    const progressEl = document.getElementById('timeline-axis-progress');
    const items = Array.from(document.querySelectorAll('.timeline-item'));

    if (items.length) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
        items.forEach((item) => {
          item.classList.add('is-visible', 'is-reached');
        });
      } else {
        const revealObs = new IntersectionObserver((entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible', 'is-reached');
              observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.16, rootMargin: '0px 0px -60px 0px' });

        items.forEach((item) => revealObs.observe(item));
      }
    }

    if (timeline && progressEl) {
      let ticking = false;
      const updateProgress = () => {
        ticking = false;
        const rect = timeline.getBoundingClientRect();
        const triggerY = window.innerHeight * 0.55;
        const raw = (triggerY - rect.top) / Math.max(1, rect.height);
        const clamped = Math.max(0, Math.min(1, raw));
        progressEl.style.transform = `scaleY(${clamped.toFixed(4)})`;

        items.forEach((item) => {
          const itemTop = item.getBoundingClientRect().top + 32;
          if (itemTop <= triggerY) {
            item.classList.add('is-reached');
          }
        });
      };

      updateProgress();
      window.addEventListener('scroll', () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(updateProgress);
        }
      }, { passive: true });
      window.addEventListener('resize', updateProgress, { passive: true });
    }

    if (!links.length || !('IntersectionObserver' in window)) return;

    const map = new Map();
    links.forEach((link) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) map.set(target, link);
    });

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          links.forEach((l) => l.classList.remove('is-active'));
          const match = map.get(entry.target);
          if (match) match.classList.add('is-active');
        }
      });
    }, { threshold: 0.35, rootMargin: '-120px 0px -30% 0px' });

    map.forEach((_, section) => obs.observe(section));
  }

  function initGalleryLightbox() {
    const triggers = Array.from(document.querySelectorAll('.gallery-trigger'));
    const dialog = document.getElementById('gallery-lightbox');
    if (!triggers.length || !dialog) return;

    const imgEl = document.getElementById('lightbox-img');
    const captionEl = document.getElementById('lightbox-caption');
    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    let currentIdx = 0;

    function showIndex(idx) {
      currentIdx = (idx + triggers.length) % triggers.length;
      const sourceImg = triggers[currentIdx].querySelector('img');
      if (!sourceImg) return;
      imgEl.src = sourceImg.currentSrc || sourceImg.src;
      imgEl.alt = sourceImg.alt;
      captionEl.textContent = sourceImg.alt;
    }

    triggers.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        showIndex(idx);
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => dialog.close());
    }
    if (prevBtn) {
      prevBtn.addEventListener('click', () => showIndex(currentIdx - 1));
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => showIndex(currentIdx + 1));
    }

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });

    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') showIndex(currentIdx - 1);
      if (e.key === 'ArrowRight') showIndex(currentIdx + 1);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initModelsCatalog();
    initHistoryJumpSync();
    initGalleryLightbox();
  });
})();
