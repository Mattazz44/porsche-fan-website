(function () {
  'use strict';

  const data = window.PORSCHE_DATA;
  const core = window.PorscheCore;
  if (!data || !core) return;

  function initHeroEffects() {
    const hero = document.querySelector('.hero');
    const heroMedia = document.getElementById('hero-media');
    const cta = document.getElementById('hero-cta');
    const videoToggle = document.getElementById('hero-video-toggle');
    const videoFrame = document.getElementById('hero-video-frame');

    if (hero && heroMedia && !core.prefersReducedMotion) {
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const offset = Math.min(window.scrollY, hero.offsetHeight);
          heroMedia.style.transform = `translate3d(0, ${(offset * 0.18).toFixed(1)}px, 0)`;
          ticking = false;
        });
      }, { passive: true });
    }

    if (cta && !core.prefersReducedMotion && window.matchMedia('(pointer: fine)').matches) {
      cta.addEventListener('mousemove', (e) => {
        const rect = cta.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.16;
        const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.22;
        cta.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
      });
      cta.addEventListener('mouseleave', () => {
        cta.style.transform = '';
      });
    }

    if (videoToggle && videoFrame) {
      let iframeEl = null;
      videoToggle.addEventListener('click', () => {
        const active = videoToggle.getAttribute('aria-pressed') === 'true';
        if (active) {
          videoToggle.setAttribute('aria-pressed', 'false');
          videoToggle.textContent = 'Play Track Film';
          videoFrame.classList.remove('is-active');
          if (iframeEl) {
            iframeEl.remove();
            iframeEl = null;
          }
        } else {
          videoToggle.setAttribute('aria-pressed', 'true');
          videoToggle.textContent = 'Pause Track Film';
          iframeEl = document.createElement('iframe');
          iframeEl.title = 'Porsche driving experience background film';
          iframeEl.src = 'https://www.youtube.com/embed/DZAdVY9kKbc?autoplay=1&mute=1&loop=1&playlist=DZAdVY9kKbc&controls=0';
          iframeEl.allow = 'autoplay; encrypted-media';
          videoFrame.appendChild(iframeEl);
          videoFrame.classList.add('is-active');
        }
      });
    }
  }

  function initModelsShowcase() {
    const tablist = document.getElementById('showcase-tabs');
    const selectorList = document.getElementById('model-selector-list');
    const stageImg = document.getElementById('stage-image');
    const stageStatus = document.getElementById('stage-status');
    const titleEl = document.getElementById('stage-title');
    const yearEl = document.getElementById('stage-year');
    const summaryEl = document.getElementById('stage-summary');
    const accelEl = document.getElementById('spec-accel');
    const accelUnitEl = document.getElementById('spec-accel-unit');
    const speedEl = document.getElementById('spec-speed');
    const speedUnitEl = document.getElementById('spec-speed-unit');
    const powerEl = document.getElementById('spec-power');
    const powerUnitEl = document.getElementById('spec-power-unit');
    const drivetrainEl = document.getElementById('stage-drivetrain');
    const dossierLink = document.getElementById('stage-dossier-link');

    if (!tablist || !selectorList || !stageImg) return;

    let currentCategory = 'sport';
    let currentModelId = data.showcaseModels.sport[0].id;
    let loadTimer = null;

    function setStageStatus(mode, text) {
      if (!stageStatus) return;
      if (!mode) {
        stageStatus.hidden = true;
        stageStatus.textContent = '';
        return;
      }
      stageStatus.hidden = false;
      stageStatus.textContent = text;
    }

    function renderSelectorList(models) {
      selectorList.innerHTML = '';
      if (!models || !models.length) {
        setStageStatus('empty', 'No vehicles are registered in this category.');
        return;
      }

      models.forEach((model) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'model-selector-btn';
        btn.setAttribute('data-model-id', model.id);
        btn.setAttribute('aria-pressed', model.id === currentModelId ? 'true' : 'false');

        const left = document.createElement('span');
        const name = document.createElement('span');
        name.className = 'model-selector-name';
        name.textContent = model.name;
        const code = document.createElement('span');
        code.className = 'model-selector-code';
        code.textContent = model.code;
        left.append(name, code);

        const right = document.createElement('span');
        right.className = 'model-selector-power tabular-nums';
        right.textContent = `${model.power} ${model.powerUnit}`;

        btn.append(left, right);
        btn.addEventListener('click', () => selectModel(model.id));
        selectorList.appendChild(btn);
      });
    }

    function selectModel(modelId) {
      const models = data.showcaseModels[currentCategory] || [];
      const model = models.find((m) => m.id === modelId) || models[0];
      if (!model) {
        setStageStatus('empty', 'Model telemetry could not be found.');
        return;
      }
      currentModelId = model.id;

      selectorList.querySelectorAll('.model-selector-btn').forEach((btn) => {
        btn.setAttribute('aria-pressed', btn.getAttribute('data-model-id') === model.id ? 'true' : 'false');
      });

      titleEl.textContent = model.name;
      yearEl.textContent = model.year;
      summaryEl.textContent = model.summary;
      drivetrainEl.textContent = model.drivetrain;
      dossierLink.setAttribute('href', model.href);
      dossierLink.textContent = `Open ${model.name} Dossier`;

      accelUnitEl.textContent = model.accelUnit;
      speedUnitEl.textContent = model.topSpeedUnit;
      powerUnitEl.textContent = model.powerUnit;

      core.animateNumber(accelEl, model.accel, model.accelDecimals, 500);
      core.animateNumber(speedEl, model.topSpeed, 0, 560);
      core.animateNumber(powerEl, model.power, 0, 620);

      stageImg.classList.add('is-transitioning');
      clearTimeout(loadTimer);
      setStageStatus('loading', `Loading ${model.name} visual...`);

      const loader = new Image();
      let settled = false;

      function applyImage(src) {
        if (settled) return;
        settled = true;
        clearTimeout(loadTimer);
        stageImg.src = src;
        stageImg.alt = model.alt;
        stageImg.classList.remove('is-transitioning');
        setStageStatus(null, '');
      }

      loader.onload = () => applyImage(model.image);
      loader.onerror = () => {
        if (model.fallback && model.fallback !== model.image) {
          const fb = new Image();
          fb.onload = () => applyImage(model.fallback);
          fb.onerror = () => {
            settled = true;
            stageImg.classList.remove('is-transitioning');
            setStageStatus('error', `Unable to load photograph for ${model.name}. Telemetry specifications remain available below.`);
          };
          fb.src = model.fallback;
        } else {
          settled = true;
          stageImg.classList.remove('is-transitioning');
          setStageStatus('error', `Unable to load photograph for ${model.name}.`);
        }
      };

      loadTimer = setTimeout(() => {
        if (!settled && model.fallback) {
          applyImage(model.fallback);
        }
      }, 2400);

      loader.src = model.image;
    }

    function switchCategory(cat, tabBtn) {
      if (!data.showcaseModels[cat]) return;
      currentCategory = cat;

      tablist.querySelectorAll('[role="tab"]').forEach((tab) => {
        const selected = tab === tabBtn;
        tab.setAttribute('aria-selected', selected ? 'true' : 'false');
        tab.setAttribute('tabindex', selected ? '0' : '-1');
      });

      const list = data.showcaseModels[cat];
      currentModelId = list[0].id;
      renderSelectorList(list);
      selectModel(currentModelId);
    }

    tablist.querySelectorAll('[role="tab"]').forEach((tab) => {
      tab.addEventListener('click', () => {
        switchCategory(tab.getAttribute('data-category'), tab);
      });
    });

    core.bindTablistKeyboard(tablist, '[role="tab"]', (tab) => {
      switchCategory(tab.getAttribute('data-category'), tab);
    });

    renderSelectorList(data.showcaseModels.sport);
    selectModel(currentModelId);
  }

  function initEngineeringPanel() {
    const nav = document.getElementById('subsystem-tabs');
    const titleEl = document.getElementById('dossier-title');
    const leadEl = document.getElementById('dossier-lead');
    const barsEl = document.getElementById('dossier-bars');
    const tableBody = document.getElementById('dossier-specs-body');

    if (!nav || !barsEl || !tableBody) return;

    function renderSubsystem(sysId) {
      const sys = data.engineeringSystems.find((item) => item.id === sysId) || data.engineeringSystems[0];
      if (!sys) return;

      nav.querySelectorAll('[role="tab"]').forEach((btn) => {
        const active = btn.getAttribute('data-subsystem') === sys.id;
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
        btn.setAttribute('tabindex', active ? '0' : '-1');
      });

      titleEl.textContent = sys.title;
      leadEl.textContent = sys.lead;

      barsEl.innerHTML = '';
      sys.bars.forEach((bar) => {
        const item = document.createElement('div');
        item.className = 'aero-bar-item';

        const meta = document.createElement('div');
        meta.className = 'aero-bar-meta';
        const name = document.createElement('span');
        name.className = 'aero-bar-name';
        name.textContent = bar.name;
        const fig = document.createElement('span');
        fig.className = 'aero-bar-figure tabular-nums';
        fig.textContent = bar.figure;
        meta.append(name, fig);

        const track = document.createElement('div');
        track.className = 'aero-track';
        const fill = document.createElement('div');
        fill.className = 'aero-fill';
        fill.style.setProperty('--bar-width', '0%');
        track.appendChild(fill);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            fill.style.setProperty('--bar-width', `${bar.percent}%`);
          });
        });

        item.append(meta, track);
        barsEl.appendChild(item);
      });

      tableBody.innerHTML = '';
      sys.specs.forEach((spec) => {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.scope = 'row';
        th.textContent = spec.label;
        const td = document.createElement('td');
        td.textContent = spec.value;
        tr.append(th, td);
        tableBody.appendChild(tr);
      });
    }

    nav.querySelectorAll('[role="tab"]').forEach((btn) => {
      btn.addEventListener('click', () => renderSubsystem(btn.getAttribute('data-subsystem')));
    });

    core.bindTablistKeyboard(nav, '[role="tab"]', (btn) => {
      renderSubsystem(btn.getAttribute('data-subsystem'));
    });

    renderSubsystem(data.engineeringSystems[0].id);

    const benchNums = document.querySelectorAll('.benchmark-num[data-count-target]');
    if (benchNums.length) {
      if (core.prefersReducedMotion || !('IntersectionObserver' in window)) {
        benchNums.forEach((el) => {
          const suffix = el.getAttribute('data-suffix') || '';
          el.textContent = `${Number(el.getAttribute('data-count-target')).toLocaleString('en-US')}${suffix}`;
        });
      } else {
        const obs = new IntersectionObserver((entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const target = Number(el.getAttribute('data-count-target'));
            const suffix = el.getAttribute('data-suffix') || '';
            const span = document.createElement('span');
            span.textContent = '0';
            el.textContent = '';
            el.appendChild(span);
            if (suffix) el.appendChild(document.createTextNode(suffix));
            core.animateNumber(span, target, 0, 820);
            observer.unobserve(el);
          });
        }, { threshold: 0.45 });

        benchNums.forEach((el) => obs.observe(el));
      }
    }
  }

  function initHistoryTimeline() {
    const rail = document.getElementById('era-rail');
    const imgEl = document.getElementById('era-image');
    const yearEl = document.getElementById('era-year');
    const titleEl = document.getElementById('era-title');
    const copyEl = document.getElementById('era-copy');
    const factEl = document.getElementById('era-fact');
    const prevBtn = document.getElementById('era-prev');
    const nextBtn = document.getElementById('era-next');

    if (!rail || !imgEl || !data.historyEras.length) return;

    let activeIndex = 0;

    function renderEra(index, shouldScroll) {
      activeIndex = (index + data.historyEras.length) % data.historyEras.length;
      const era = data.historyEras[activeIndex];

      rail.querySelectorAll('[role="tab"]').forEach((btn, idx) => {
        const selected = idx === activeIndex;
        btn.setAttribute('aria-selected', selected ? 'true' : 'false');
        btn.setAttribute('tabindex', selected ? '0' : '-1');
        if (selected && shouldScroll) {
          const left = btn.offsetLeft - rail.clientWidth / 2 + btn.clientWidth / 2;
          rail.scrollTo({ left: Math.max(0, left), behavior: core.prefersReducedMotion ? 'auto' : 'smooth' });
        }
      });

      yearEl.textContent = era.year;
      titleEl.textContent = era.title;
      copyEl.textContent = era.copy;
      factEl.textContent = era.fact;

      imgEl.style.opacity = '0.25';
      const loader = new Image();
      loader.onload = () => {
        imgEl.src = era.image;
        imgEl.alt = era.alt;
        imgEl.style.opacity = '1';
      };
      loader.onerror = () => {
        imgEl.src = era.fallback;
        imgEl.alt = era.alt;
        imgEl.style.opacity = '1';
      };
      loader.src = era.image;
    }

    rail.innerHTML = '';
    data.historyEras.forEach((era, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'era-btn';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('data-era-index', String(idx));
      btn.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
      btn.setAttribute('tabindex', idx === 0 ? '0' : '-1');

      const y = document.createElement('span');
      y.className = 'era-btn-year tabular-nums';
      y.textContent = era.year;
      const n = document.createElement('span');
      n.className = 'era-btn-name';
      n.textContent = era.shortName;

      btn.append(y, n);
      btn.addEventListener('click', () => renderEra(idx, true));
      rail.appendChild(btn);
    });

    core.bindTablistKeyboard(rail, '[role="tab"]', (btn) => {
      renderEra(Number(btn.getAttribute('data-era-index')), true);
    });

    if (prevBtn) prevBtn.addEventListener('click', () => renderEra(activeIndex - 1, true));
    if (nextBtn) nextBtn.addEventListener('click', () => renderEra(activeIndex + 1, true));

    renderEra(0, false);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initHeroEffects();
    initModelsShowcase();
    initEngineeringPanel();
    initHistoryTimeline();
  });
})();
