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
    const compareWorkbench = document.getElementById('compare-workbench');
    const core = window.PorscheCore || {};

    let activeFilter = 'all';
    let lastCompareJumpQuery = '';

    function applyFilter() {
      const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
      const isCompareKeyword = query === 'compare' || query === 'vs' || query.startsWith('compare ');
      let visibleCount = 0;

      cards.forEach((card) => {
        const cat = card.getAttribute('data-category') || '';
        const haystack = (card.getAttribute('data-keywords') || card.textContent).toLowerCase();
        const matchesCat = activeFilter === 'all' || cat === activeFilter;
        const matchesQuery = !query || isCompareKeyword || haystack.includes(query);
        const show = matchesCat && matchesQuery;
        card.hidden = !show;
        if (show) visibleCount += 1;
      });

      if (statusLine) {
        statusLine.textContent = isCompareKeyword
          ? 'Side-by-side Compare matrix open below'
          : `${visibleCount} ${visibleCount === 1 ? 'model' : 'models'} shown`;
      }
      if (emptyState) {
        emptyState.hidden = visibleCount > 0;
      }
      if (isCompareKeyword && compareWorkbench && lastCompareJumpQuery !== query) {
        lastCompareJumpQuery = query;
        compareWorkbench.scrollIntoView({ behavior: core.prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      } else if (!isCompareKeyword) {
        lastCompareJumpQuery = '';
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

  function initCompareWorkbench() {
    const workbench = document.getElementById('compare-workbench');
    const data = window.PORSCHE_DATA;
    if (!workbench || !data || !Array.isArray(data.compareModels) || !data.compareModels.length) return;

    const core = window.PorscheCore || {};
    const catalog = data.compareModels;
    const byId = new Map(catalog.map((m) => [m.id, m]));
    const MAX_SLOTS = 3;
    const STORAGE_KEY = 'porsche_compare_ids_v1';

    const slotSelects = [
      document.getElementById('compare-slot-1'),
      document.getElementById('compare-slot-2'),
      document.getElementById('compare-slot-3')
    ].filter(Boolean);

    const tableWrap = document.getElementById('compare-table-wrap');
    const statusText = document.getElementById('compare-status-text');
    const clearBtn = document.getElementById('compare-clear-btn');
    const swapBtn = document.getElementById('compare-swap-btn');
    const quickFilterInput = document.getElementById('compare-quick-filter');
    const quickFilterChips = document.getElementById('compare-quick-chips');
    const trayEl = document.getElementById('compare-tray');
    const trayList = document.getElementById('compare-tray-list');
    const trayCount = document.getElementById('compare-tray-count');
    const trayClearBtn = document.getElementById('compare-tray-clear');
    const trayJumpBtn = document.getElementById('compare-tray-jump');
    const navCompareJump = document.getElementById('compare-open-btn');

    const defaultPairAttr = workbench.getAttribute('data-default-compare') || '911-turbo-s,911-gt3-rs';
    const defaultPair = defaultPairAttr.split(',').map((s) => s.trim()).filter((id) => byId.has(id));

    let selectedIds = [];

    function parseInitialSelection() {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get('compare');
      if (fromUrl) {
        const parsed = fromUrl
          .split(',')
          .map((s) => s.trim())
          .filter((id, idx, arr) => byId.has(id) && arr.indexOf(id) === idx)
          .slice(0, MAX_SLOTS);
        if (parsed.length) return parsed;
      }

      try {
        const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
        if (Array.isArray(stored)) {
          const valid = stored.filter((id, idx, arr) => byId.has(id) && arr.indexOf(id) === idx).slice(0, MAX_SLOTS);
          if (valid.length >= 2) return valid;
        }
      } catch {}

      return defaultPair.length >= 2 ? defaultPair.slice(0, MAX_SLOTS) : catalog.slice(0, 2).map((m) => m.id);
    }

    function persistSelection() {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds));
      } catch {}
    }

    function populateSelectOptions() {
      const groups = ['Street Lineup', 'Track & Motorsport', 'Heritage Icons'];
      slotSelects.forEach((select, slotIdx) => {
        select.innerHTML = '';
        if (slotIdx === 2) {
          const emptyOpt = document.createElement('option');
          emptyOpt.value = '';
          emptyOpt.textContent = 'None (Compare 2 Models)';
          select.appendChild(emptyOpt);
        }
        groups.forEach((groupName) => {
          const items = catalog.filter((m) => m.group === groupName);
          if (!items.length) return;
          const og = document.createElement('optgroup');
          og.label = groupName;
          items.forEach((m) => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = `${m.name} (${m.power})`;
            og.appendChild(opt);
          });
          select.appendChild(og);
        });
      });
    }

    function syncCardToggleButtons() {
      document.querySelectorAll('[data-compare-toggle]').forEach((btn) => {
        const id = btn.getAttribute('data-compare-toggle');
        const active = selectedIds.includes(id);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.classList.toggle('is-active', active);
        btn.textContent = active ? 'In Compare' : '+ Compare';
      });
    }

    function syncSelectControls() {
      slotSelects.forEach((select, idx) => {
        select.value = selectedIds[idx] || '';
      });
    }

    function syncFloatingTray() {
      if (!trayEl || !trayList) return;
      const count = selectedIds.length;
      if (navCompareJump) {
        navCompareJump.textContent = `Compare (${count})`;
      }
      if (trayCount) {
        trayCount.textContent = `${count} of ${MAX_SLOTS} models selected`;
      }
      if (trayJumpBtn) {
        trayJumpBtn.textContent = count >= 2 ? `View Comparison (${count})` : 'Select 2+ Models';
      }

      trayList.innerHTML = '';
      selectedIds.forEach((id) => {
        const model = byId.get(id);
        if (!model) return;
        const pill = document.createElement('span');
        pill.className = 'compare-tray-chip';

        const label = document.createElement('span');
        label.textContent = model.name;

        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'compare-tray-remove';
        rm.setAttribute('aria-label', `Remove ${model.name} from comparison`);
        rm.textContent = 'x';
        rm.addEventListener('click', () => {
          selectedIds = selectedIds.filter((item) => item !== id);
          renderAll(true);
        });

        pill.append(label, rm);
        trayList.appendChild(pill);
      });

      trayEl.classList.toggle('is-visible', count > 0);
      trayEl.hidden = count === 0;
      document.body.classList.toggle('has-compare-tray', count > 0);
    }

    function computeRowWinners(models) {
      if (models.length < 2) return {};
      const maxPower = Math.max(...models.map((m) => m.powerNum));
      const minAccel = Math.min(...models.map((m) => m.accelNum));
      const maxSpeed = Math.max(...models.map((m) => m.topSpeedNum));
      const minWeight = Math.min(...models.map((m) => m.weightNum));

      const uniqueCheck = (vals) => new Set(vals).size > 1;
      return {
        power: uniqueCheck(models.map((m) => m.powerNum)) ? maxPower : null,
        accel: uniqueCheck(models.map((m) => m.accelNum)) ? minAccel : null,
        topSpeed: uniqueCheck(models.map((m) => m.topSpeedNum)) ? maxSpeed : null,
        weight: uniqueCheck(models.map((m) => m.weightNum)) ? minWeight : null
      };
    }

    function renderComparisonTable(animate) {
      if (!tableWrap) return;
      const models = selectedIds.map((id) => byId.get(id)).filter(Boolean);

      if (statusText) {
        if (models.length < 2) {
          statusText.textContent = 'Select at least 2 Porsche models below to compare full technical specifications side by side.';
        } else {
          statusText.textContent = `Comparing ${models.map((m) => m.name).join(' vs ')}`;
        }
      }

      if (models.length < 2) {
        tableWrap.innerHTML = `
          <div class="compare-empty-state">
            <h3 class="state-panel-title">Select At Least Two Porsche Models</h3>
            <p class="state-panel-desc">Choose vehicles from the dropdown slots above, type a model code in the quick search box, or click "+ Compare" on any vehicle card.</p>
          </div>
        `;
        return;
      }

      const winners = computeRowWinners(models);
      const rows = [
        { label: 'Engine / Propulsion', get: (m) => m.engine },
        { label: 'Power Output', get: (m) => m.power, isBest: (m) => winners.power !== null && m.powerNum === winners.power, bestTag: 'Highest' },
        { label: 'Peak Torque', get: (m) => m.torque },
        { label: '0 - 100 km/h', get: (m) => m.accel, isBest: (m) => winners.accel !== null && m.accelNum === winners.accel, bestTag: 'Fastest' },
        { label: 'Top Speed', get: (m) => m.topSpeed, isBest: (m) => winners.topSpeed !== null && m.topSpeedNum === winners.topSpeed, bestTag: 'Fastest' },
        { label: 'Weight', get: (m) => m.weight, isBest: (m) => winners.weight !== null && m.weightNum === winners.weight, bestTag: 'Lightest' },
        { label: 'Transmission & Drive', get: (m) => m.drivetrain },
        { label: 'Engineering Highlight', get: (m) => m.highlight },
        { label: 'Production / Seasons', get: (m) => m.years }
      ];

      const table = document.createElement('table');
      table.className = 'compare-table tabular-nums';

      const caption = document.createElement('caption');
      caption.className = 'sr-only';
      caption.textContent = 'Side-by-side Porsche technical specification comparison';
      table.appendChild(caption);

      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      const cornerTh = document.createElement('th');
      cornerTh.scope = 'col';
      cornerTh.className = 'compare-spec-col';
      cornerTh.textContent = 'Specification';
      headRow.appendChild(cornerTh);

      models.forEach((m) => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.className = 'compare-model-col';
        th.innerHTML = `
          <div class="compare-col-card">
            <div class="compare-col-media">
              <img src="${m.image}" width="${m.width}" height="${m.height}" alt="${m.alt}">
            </div>
            <div class="compare-col-meta">
              <span class="compare-col-code">${m.code}</span>
              <span class="compare-col-name">${m.name}</span>
              <div class="compare-col-actions">
                <a class="compare-col-link" href="${m.href}">Read About</a>
                <button type="button" class="compare-col-remove" data-remove-id="${m.id}" aria-label="Remove ${m.name}">Remove</button>
              </div>
            </div>
          </div>
        `;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      rows.forEach((row) => {
        const tr = document.createElement('tr');
        const labelTh = document.createElement('th');
        labelTh.scope = 'row';
        labelTh.textContent = row.label;
        tr.appendChild(labelTh);

        models.forEach((m) => {
          const td = document.createElement('td');
          const best = typeof row.isBest === 'function' && row.isBest(m);
          if (best) td.className = 'compare-cell-best';
          const valSpan = document.createElement('span');
          valSpan.textContent = row.get(m);
          td.appendChild(valSpan);
          if (best && row.bestTag) {
            const badge = document.createElement('span');
            badge.className = 'compare-best-badge';
            badge.textContent = row.bestTag;
            td.appendChild(badge);
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);

      tableWrap.innerHTML = '';
      tableWrap.appendChild(table);

      tableWrap.querySelectorAll('[data-remove-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-remove-id');
          selectedIds = selectedIds.filter((item) => item !== id);
          renderAll(true);
        });
      });

      if (animate && core.hasGsap && !core.prefersReducedMotion) {
        window.gsap.fromTo(
          tableWrap.querySelectorAll('.compare-col-card, tbody tr'),
          { opacity: 0.35, y: 10 },
          { opacity: 1, y: 0, duration: 0.42, stagger: 0.025, ease: 'power2.out', clearProps: 'transform' }
        );
      }
    }

    function renderQuickFilterChips() {
      if (!quickFilterInput || !quickFilterChips) return;
      const q = quickFilterInput.value.trim().toLowerCase();
      quickFilterChips.innerHTML = '';
      if (!q) {
        quickFilterChips.hidden = true;
        return;
      }

      const matches = catalog.filter((m) => {
        const hay = `${m.name} ${m.code} ${m.group} ${m.engine} ${m.years}`.toLowerCase();
        return hay.includes(q);
      });

      quickFilterChips.hidden = false;
      if (!matches.length) {
        const empty = document.createElement('p');
        empty.className = 'compare-chip-empty';
        empty.textContent = `No Porsche models match "${quickFilterInput.value.trim()}". Try "911", "963", "GT4", "Taycan", or "919".`;
        quickFilterChips.appendChild(empty);
        return;
      }

      matches.slice(0, 8).forEach((m) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        const isAdded = selectedIds.includes(m.id);
        chip.className = `compare-quick-chip${isAdded ? ' is-selected' : ''}`;
        chip.textContent = isAdded ? `${m.name} (Selected)` : `+ Add ${m.name}`;
        chip.addEventListener('click', () => {
          toggleModel(m.id, true);
        });
        quickFilterChips.appendChild(chip);
      });
    }

    function syncPresetButtons() {
      const currentKey = selectedIds.join(',');
      workbench.querySelectorAll('.compare-presets [data-compare-pair]').forEach((btn) => {
        const active = btn.getAttribute('data-compare-pair') === currentKey;
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }

    function renderAll(animate) {
      persistSelection();
      syncSelectControls();
      syncCardToggleButtons();
      syncPresetButtons();
      syncFloatingTray();
      renderComparisonTable(animate);
      renderQuickFilterChips();
    }

    function toggleModel(id, scrollIfReady) {
      if (!byId.has(id)) return;
      let added = false;
      if (selectedIds.includes(id)) {
        selectedIds = selectedIds.filter((item) => item !== id);
      } else if (selectedIds.length < MAX_SLOTS) {
        selectedIds = [...selectedIds, id];
        added = true;
      } else {
        selectedIds = [selectedIds[0], selectedIds[1], id];
        added = true;
      }
      renderAll(true);
      if (added && trayEl && !trayEl.hidden && core.hasGsap && !core.prefersReducedMotion) {
        window.gsap.fromTo(trayEl, { y: 8 }, { y: 0, duration: 0.28, ease: 'power2.out', clearProps: 'transform' });
      }
      if (scrollIfReady && selectedIds.length >= 2) {
        workbench.scrollIntoView({ behavior: core.prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
    }

    function setPair(ids, shouldScroll) {
      const valid = ids.filter((id, idx, arr) => byId.has(id) && arr.indexOf(id) === idx).slice(0, MAX_SLOTS);
      if (!valid.length) return;
      selectedIds = valid;
      renderAll(true);
      if (shouldScroll) {
        workbench.scrollIntoView({ behavior: core.prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
    }

    populateSelectOptions();
    selectedIds = parseInitialSelection();

    slotSelects.forEach((select, idx) => {
      select.addEventListener('change', () => {
        const nextVal = select.value;
        const nextList = slotSelects.map((s, sIdx) => (sIdx === idx ? nextVal : s.value)).filter(Boolean);
        selectedIds = nextList.filter((id, i, arr) => byId.has(id) && arr.indexOf(id) === i).slice(0, MAX_SLOTS);
        renderAll(true);
      });
    });

    document.querySelectorAll('[data-compare-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        toggleModel(btn.getAttribute('data-compare-toggle'), false);
      });
    });

    document.querySelectorAll('[data-compare-pair]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pair = (btn.getAttribute('data-compare-pair') || '').split(',').map((s) => s.trim());
        setPair(pair, true);
      });
    });

    if (swapBtn) {
      swapBtn.addEventListener('click', () => {
        if (selectedIds.length >= 2) {
          const next = [...selectedIds];
          const tmp = next[0];
          next[0] = next[1];
          next[1] = tmp;
          selectedIds = next;
          renderAll(true);
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        selectedIds = [];
        renderAll(true);
      });
    }

    if (trayClearBtn) {
      trayClearBtn.addEventListener('click', () => {
        selectedIds = [];
        renderAll(true);
      });
    }

    if (trayJumpBtn) {
      trayJumpBtn.addEventListener('click', () => {
        workbench.scrollIntoView({ behavior: core.prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      });
    }

    if (navCompareJump) {
      navCompareJump.addEventListener('click', () => {
        workbench.scrollIntoView({ behavior: core.prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      });
    }

    if (quickFilterInput) {
      quickFilterInput.addEventListener('input', renderQuickFilterChips);
      quickFilterInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const firstChip = quickFilterChips ? quickFilterChips.querySelector('.compare-quick-chip:not(.is-selected)') : null;
        if (firstChip) {
          e.preventDefault();
          firstChip.click();
          quickFilterInput.value = '';
          renderQuickFilterChips();
        }
      });
    }

    renderAll(false);

    if (window.location.hash === '#compare-workbench' || new URLSearchParams(window.location.search).has('compare')) {
      setTimeout(() => {
        workbench.scrollIntoView({ behavior: core.prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      }, 120);
    }
  }

  function initHistoryJumpSync() {
    const links = document.querySelectorAll('.era-jump-link[href^="#"]');
    const timeline = document.getElementById('vertical-timeline');
    const progressEl = document.getElementById('timeline-axis-progress');
    const items = Array.from(document.querySelectorAll('.timeline-item'));
    const core = window.PorscheCore || {};

    if (items.length) {
      if (core.prefersReducedMotion || (!core.hasScrollTrigger && !('IntersectionObserver' in window))) {
        items.forEach((item) => {
          item.classList.add('is-visible', 'is-reached');
        });
      } else if (core.hasScrollTrigger) {
        items.forEach((item) => {
          window.ScrollTrigger.create({
            trigger: item,
            start: 'top 82%',
            once: true,
            onEnter: () => item.classList.add('is-visible', 'is-reached')
          });
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
    initCompareWorkbench();
    initHistoryJumpSync();
    initGalleryLightbox();
  });
})();
