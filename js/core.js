(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header || header.classList.contains('is-solid')) return;

    const updateHeader = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 36);
    };

    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  function initMobileNav() {
    const toggle = document.getElementById('nav-toggle');
    const drawer = document.getElementById('mobile-drawer');
    if (!toggle || !drawer) return;

    const links = drawer.querySelectorAll('a[href]');
    let lastFocused = null;

    function openDrawer() {
      lastFocused = document.activeElement;
      drawer.classList.add('is-open');
      drawer.removeAttribute('aria-hidden');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      if (links.length) links[0].focus();
    }

    function closeDrawer(restoreFocus) {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      if (restoreFocus && lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
    }

    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        closeDrawer(true);
      } else {
        openDrawer();
      }
    });

    links.forEach((link) => {
      link.addEventListener('click', () => closeDrawer(false));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        closeDrawer(true);
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 860 && toggle.getAttribute('aria-expanded') === 'true') {
        closeDrawer(false);
      }
    }, { passive: true });
  }

  function initScrollReveal() {
    const nodes = document.querySelectorAll('.reveal');
    if (!nodes.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      nodes.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });

    nodes.forEach((el) => observer.observe(el));
  }

  function initImageFallbacks() {
    function swapToFallback(img) {
      const fallback = img.getAttribute('data-fallback');
      if (fallback && img.getAttribute('src') !== fallback) {
        img.setAttribute('src', fallback);
      }
    }

    document.querySelectorAll('img[data-fallback]').forEach((img) => {
      if (img.complete && img.naturalWidth === 0) {
        swapToFallback(img);
        return;
      }
      img.addEventListener('error', function onError() {
        swapToFallback(img);
        img.removeEventListener('error', onError);
      });
    });
  }

  function animateNumber(el, target, decimals, duration) {
    if (!el) return;
    const dec = Number(decimals) || 0;
    const ms = Number(duration) || 520;

    if (prefersReducedMotion) {
      el.textContent = dec > 0 ? Number(target).toFixed(dec) : Math.round(target).toLocaleString('en-US');
      return;
    }

    const parsedStart = parseFloat(String(el.textContent).replace(/,/g, ''));
    const startVal = Number.isFinite(parsedStart) ? parsedStart : 0;
    const endVal = Number(target);
    const startTime = performance.now();

    if (el._rafId) cancelAnimationFrame(el._rafId);

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / ms);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * eased;
      el.textContent = dec > 0 ? current.toFixed(dec) : Math.round(current).toLocaleString('en-US');
      if (progress < 1) {
        el._rafId = requestAnimationFrame(tick);
      } else {
        el.textContent = dec > 0 ? endVal.toFixed(dec) : Math.round(endVal).toLocaleString('en-US');
        el._rafId = null;
      }
    }

    el._rafId = requestAnimationFrame(tick);
  }

  function bindTablistKeyboard(tablistEl, selector, onSelect) {
    if (!tablistEl) return;
    tablistEl.addEventListener('keydown', (e) => {
      const tabs = Array.from(tablistEl.querySelectorAll(selector));
      const idx = tabs.indexOf(document.activeElement);
      if (idx === -1) return;

      let nextIdx = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextIdx = (idx + 1) % tabs.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        nextIdx = (idx - 1 + tabs.length) % tabs.length;
      } else if (e.key === 'Home') {
        nextIdx = 0;
      } else if (e.key === 'End') {
        nextIdx = tabs.length - 1;
      }

      if (nextIdx >= 0) {
        e.preventDefault();
        tabs[nextIdx].focus();
        onSelect(tabs[nextIdx]);
      }
    });
  }

  window.PorscheCore = {
    prefersReducedMotion,
    animateNumber,
    bindTablistKeyboard
  };

  document.addEventListener('DOMContentLoaded', () => {
    initHeaderScroll();
    initMobileNav();
    initScrollReveal();
    initImageFallbacks();
  });
})();
