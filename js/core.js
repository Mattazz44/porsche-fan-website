(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && !prefersReducedMotion;
  const hasScrollTrigger = hasGsap && typeof window.ScrollTrigger !== 'undefined';

  // Exact solver for cubic-bezier(0.16, 1, 0.3, 1) luxury deceleration curve
  function createCubicBezier(x1, y1, x2, y2) {
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;

    const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
    const sampleDX = (t) => (3 * ax * t + 2 * bx) * t + cx;
    const sampleY = (t) => ((ay * t + by) * t + cy) * t;

    return function luxuryBezier(x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i += 1) {
        const err = sampleX(t) - x;
        if (Math.abs(err) < 1e-6) break;
        const d = sampleDX(t);
        if (Math.abs(d) < 1e-6) break;
        t -= err / d;
      }
      t = Math.max(0, Math.min(1, t));
      return sampleY(t);
    };
  }

  const luxuryEase = createCubicBezier(0.16, 1, 0.3, 1);

  if (hasScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
  }
  if (hasGsap) {
    document.documentElement.classList.add('has-gsap');
  }

  function initPageTransitions() {
    if (prefersReducedMotion) return;

    const main = document.getElementById('main-content');
    if (hasGsap && main && !main.querySelector('.hero')) {
      const heroTitle = main.querySelector('.page-hero-title, .detail-article h1');
      const heroLead = main.querySelector('.page-hero-lead, .detail-subtitle');
      const breadcrumb = main.querySelector('.breadcrumb-nav');

      const tl = window.gsap.timeline({ defaults: { ease: luxuryEase } });
      if (breadcrumb) {
        tl.fromTo(breadcrumb, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1.1, clearProps: 'transform' });
      }
      if (heroTitle) {
        tl.fromTo(heroTitle, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 1.35, clearProps: 'transform' }, breadcrumb ? '-=0.82' : 0);
      }
      if (heroLead) {
        tl.fromTo(heroLead, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1.2, clearProps: 'transform' }, '-=0.95');
      }
    }
  }

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
    const nodes = Array.from(document.querySelectorAll('.reveal'));
    if (!nodes.length) return;

    if (prefersReducedMotion) {
      nodes.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    if (hasScrollTrigger) {
      nodes.forEach((el) => {
        window.gsap.fromTo(
          el,
          { autoAlpha: 0, y: 30 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 1.26,
            ease: luxuryEase,
            clearProps: 'transform',
            scrollTrigger: {
              trigger: el,
              start: 'top 90%',
              once: true,
              onEnter: () => el.classList.add('is-visible')
            }
          }
        );
      });
      return;
    }

    if (!('IntersectionObserver' in window)) {
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
    }, { threshold: 0.1, rootMargin: '0px 0px -24px 0px' });

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
    const ms = Number(duration) || 1150;
    const endVal = Number(target);

    const format = (val) => (dec > 0 ? val.toFixed(dec) : Math.round(val).toLocaleString('en-US'));

    if (prefersReducedMotion) {
      el.textContent = format(endVal);
      return;
    }

    const parsedStart = parseFloat(String(el.textContent).replace(/,/g, ''));
    const startVal = Number.isFinite(parsedStart) ? parsedStart : 0;

    if (hasGsap) {
      if (el._gsapTween) el._gsapTween.kill();
      const counter = { val: startVal };
      el._gsapTween = window.gsap.to(counter, {
        val: endVal,
        duration: ms / 1000,
        ease: luxuryEase,
        onUpdate: () => {
          el.textContent = format(counter.val);
        },
        onComplete: () => {
          el.textContent = format(endVal);
          el._gsapTween = null;
        }
      });
      return;
    }

    const startTime = performance.now();
    if (el._rafId) cancelAnimationFrame(el._rafId);

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / ms);
      const eased = luxuryEase(progress);
      el.textContent = format(startVal + (endVal - startVal) * eased);
      if (progress < 1) {
        el._rafId = requestAnimationFrame(tick);
      } else {
        el.textContent = format(endVal);
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
    hasGsap,
    hasScrollTrigger,
    luxuryEase,
    animateNumber,
    bindTablistKeyboard
  };

  document.addEventListener('DOMContentLoaded', () => {
    initPageTransitions();
    initHeaderScroll();
    initMobileNav();
    initScrollReveal();
    initImageFallbacks();
  });
})();
