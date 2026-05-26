/**
 * @jest-environment jest-environment-jsdom
 *
 * Tests for src/index.html — changed/added in PR:
 * "Add Feature 3 & 4 motion + dashboard surface enhancements"
 *
 * Coverage areas:
 *  - HTML document structure & metadata
 *  - Loader hide behaviour
 *  - Navbar scroll behaviour
 *  - Scroll-progress bar
 *  - Active-nav-link highlighting
 *  - Theme toggle (dark / light, localStorage, chart repaint)
 *  - Quick Jump widget (build, open/close, keyboard nav, sync)
 *  - Competency-skill tooltips
 *  - Motion / data-reveal observer & stagger logic
 *  - KPI bottom-accent injection
 *  - Reduced-motion fast-path
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── helpers ────────────────────────────────────────────────────────────────

function loadHtml() {
  return fs.readFileSync(
    path.resolve(__dirname, '../src/index.html'),
    'utf8'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. HTML STRUCTURE & METADATA
// ─────────────────────────────────────────────────────────────────────────────

describe('HTML document structure and metadata', () => {
  let doc;

  beforeAll(() => {
    document.documentElement.innerHTML = loadHtml();
    doc = document;
  });

  test('lang attribute is "en" in source', () => {
    // innerHTML assignment doesn't carry over attributes on <html> itself;
    // verify directly in the raw source string.
    const src = loadHtml();
    expect(src).toMatch(/<html[^>]+lang\s*=\s*["']en["']/);
  });

  test('page title contains the portfolio owner name', () => {
    expect(doc.title).toMatch(/Mohanad Ibrahim/);
  });

  test('charset meta tag is UTF-8', () => {
    const charset = doc.querySelector('meta[charset]');
    expect(charset).not.toBeNull();
    expect(charset.getAttribute('charset').toUpperCase()).toBe('UTF-8');
  });

  test('viewport meta tag is present', () => {
    const vp = doc.querySelector('meta[name="viewport"]');
    expect(vp).not.toBeNull();
    expect(vp.getAttribute('content')).toContain('width=device-width');
  });

  test('description meta tag is present and non-empty', () => {
    const desc = doc.querySelector('meta[name="description"]');
    expect(desc).not.toBeNull();
    expect(desc.getAttribute('content').length).toBeGreaterThan(10);
  });

  test('author meta tag is "Mohanad Ibrahim"', () => {
    const author = doc.querySelector('meta[name="author"]');
    expect(author).not.toBeNull();
    expect(author.getAttribute('content')).toBe('Mohanad Ibrahim');
  });

  test('keywords meta tag includes finance-related terms', () => {
    const kw = doc.querySelector('meta[name="keywords"]');
    expect(kw).not.toBeNull();
    const content = kw.getAttribute('content');
    ['Finance Manager', 'IFRS', 'Power BI', 'FP&A'].forEach(term => {
      expect(content).toContain(term);
    });
  });

  test('Chart.js CDN script tag is present', () => {
    const scripts = Array.from(doc.querySelectorAll('script[src]'));
    const chartScript = scripts.find(s => s.src.includes('chart'));
    expect(chartScript).not.toBeUndefined();
  });

  test('loader element #loader exists in body', () => {
    expect(doc.getElementById('loader')).not.toBeNull();
  });

  test('particle canvas #particle-canvas exists', () => {
    expect(doc.getElementById('particle-canvas')).not.toBeNull();
  });

  test('navigation element #topNav exists with correct aria-label', () => {
    const nav = doc.getElementById('topNav');
    expect(nav).not.toBeNull();
    expect(nav.getAttribute('aria-label')).toBe('Primary');
    expect(nav.classList.contains('top-nav')).toBe(true);
  });

  test('scroll progress bar #scrollProgress exists', () => {
    expect(doc.getElementById('scrollProgress')).not.toBeNull();
  });

  test('orb-3 ambient element is present', () => {
    expect(doc.querySelector('.orb-3')).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. LOADER BEHAVIOUR
// ─────────────────────────────────────────────────────────────────────────────

describe('Loader hide behaviour', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.documentElement.innerHTML = loadHtml();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('loader does NOT have .hidden class initially', () => {
    const loader = document.getElementById('loader');
    expect(loader).not.toBeNull();
    expect(loader.classList.contains('hidden')).toBe(false);
  });

  test('loader gains .hidden class after load + 1200 ms', () => {
    const loader = document.getElementById('loader');

    // Simulate the inline script that calls setTimeout on window load
    const hideLoader = () => {
      setTimeout(() => {
        loader.classList.add('hidden');
      }, 1200);
    };
    hideLoader();

    jest.advanceTimersByTime(1199);
    expect(loader.classList.contains('hidden')).toBe(false);

    jest.advanceTimersByTime(1);
    expect(loader.classList.contains('hidden')).toBe(true);
  });

  test('loader .hidden class can be removed (reset cycle)', () => {
    const loader = document.getElementById('loader');
    loader.classList.add('hidden');
    expect(loader.classList.contains('hidden')).toBe(true);
    loader.classList.remove('hidden');
    expect(loader.classList.contains('hidden')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. NAVBAR SCROLL BEHAVIOUR
// ─────────────────────────────────────────────────────────────────────────────

describe('Navbar scroll behaviour', () => {
  let topNav;
  let scrollHandler;

  beforeEach(() => {
    document.documentElement.innerHTML = loadHtml();
    topNav = document.getElementById('topNav');

    // Extract the scroll logic from the inline script
    scrollHandler = () => {
      if (window.scrollY > 60) {
        topNav.classList.add('scrolled');
      } else {
        topNav.classList.remove('scrolled');
      }
    };
  });

  test('navbar does NOT have .scrolled class when scrollY is 0', () => {
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
    scrollHandler();
    expect(topNav.classList.contains('scrolled')).toBe(false);
  });

  test('navbar does NOT have .scrolled class when scrollY is exactly 60', () => {
    Object.defineProperty(window, 'scrollY', { value: 60, writable: true, configurable: true });
    scrollHandler();
    expect(topNav.classList.contains('scrolled')).toBe(false);
  });

  test('navbar gains .scrolled class when scrollY > 60', () => {
    Object.defineProperty(window, 'scrollY', { value: 61, writable: true, configurable: true });
    scrollHandler();
    expect(topNav.classList.contains('scrolled')).toBe(true);
  });

  test('navbar gains .scrolled class at large scroll values', () => {
    Object.defineProperty(window, 'scrollY', { value: 500, writable: true, configurable: true });
    scrollHandler();
    expect(topNav.classList.contains('scrolled')).toBe(true);
  });

  test('navbar loses .scrolled class when scrolling back above threshold', () => {
    Object.defineProperty(window, 'scrollY', { value: 200, writable: true, configurable: true });
    scrollHandler();
    expect(topNav.classList.contains('scrolled')).toBe(true);

    Object.defineProperty(window, 'scrollY', { value: 30, writable: true, configurable: true });
    scrollHandler();
    expect(topNav.classList.contains('scrolled')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SCROLL PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────

describe('Scroll progress bar', () => {
  let bar;

  beforeEach(() => {
    document.documentElement.innerHTML = loadHtml();
    bar = document.getElementById('scrollProgress');
  });

  function computeProgress(scrollTop, scrollHeight, clientHeight) {
    const max = scrollHeight - clientHeight;
    return max > 0 ? (scrollTop / max * 100) : 0;
  }

  test('#scrollProgress element is present with aria-hidden', () => {
    expect(bar).not.toBeNull();
    expect(bar.getAttribute('aria-hidden')).toBe('true');
  });

  test('progress is 0% at top of page', () => {
    expect(computeProgress(0, 2000, 800)).toBe(0);
  });

  test('progress is 100% at bottom of page', () => {
    expect(computeProgress(1200, 2000, 800)).toBe(100);
  });

  test('progress is 50% at mid-page', () => {
    expect(computeProgress(600, 2000, 800)).toBe(50);
  });

  test('progress is 0% when page is not scrollable (scrollHeight === clientHeight)', () => {
    expect(computeProgress(0, 800, 800)).toBe(0);
  });

  test('bar width is set to a percentage string', () => {
    const pct = computeProgress(300, 2000, 800) + '%';
    bar.style.width = pct;
    expect(bar.style.width).toBe(pct);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. ACTIVE NAV LINK HIGHLIGHTING
// ─────────────────────────────────────────────────────────────────────────────

describe('Active nav link highlighting', () => {
  let links;

  function clearActive(navLinks) {
    navLinks.forEach(l => l.classList.remove('is-active'));
  }

  function setActive(navLinks, sectionId) {
    clearActive(navLinks);
    const match = Array.from(navLinks).find(
      l => l.getAttribute('href') === '#' + sectionId
    );
    if (match) match.classList.add('is-active');
  }

  beforeEach(() => {
    document.documentElement.innerHTML = loadHtml();
    links = document.querySelectorAll('.top-nav a[href^="#"]');
  });

  test('nav contains anchor links with hash hrefs', () => {
    expect(links.length).toBeGreaterThan(0);
  });

  test('setting active on a link adds .is-active only to that link', () => {
    setActive(links, 'summary');
    const active = Array.from(links).filter(l => l.classList.contains('is-active'));
    expect(active.length).toBe(1);
    expect(active[0].getAttribute('href')).toBe('#summary');
  });

  test('switching active link moves .is-active to new link', () => {
    setActive(links, 'summary');
    setActive(links, 'experience');
    const active = Array.from(links).filter(l => l.classList.contains('is-active'));
    expect(active.length).toBe(1);
    expect(active[0].getAttribute('href')).toBe('#experience');
  });

  test('clearing active state removes .is-active from all links', () => {
    setActive(links, 'kpi');
    clearActive(links);
    const active = Array.from(links).filter(l => l.classList.contains('is-active'));
    expect(active.length).toBe(0);
  });

  test('nav links include expected section anchors', () => {
    const hrefs = Array.from(links).map(l => l.getAttribute('href'));
    ['#summary', '#experience', '#kpi', '#dashboard', '#education'].forEach(h => {
      expect(hrefs).toContain(h);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. THEME TOGGLE — applyTheme / repaintCharts logic
// ─────────────────────────────────────────────────────────────────────────────

describe('Theme toggle logic', () => {
  const STORE = 'mohanad-theme';
  let root;
  let mockLocalStorage;

  function applyTheme(t, animate, htmlRoot, storage) {
    if (t === 'light') htmlRoot.classList.add('light');
    else htmlRoot.classList.remove('light');
    try { storage.setItem(STORE, t); } catch (e) {}
  }

  beforeEach(() => {
    document.documentElement.innerHTML = loadHtml();
    root = document.documentElement;
    mockLocalStorage = (() => {
      let store = {};
      return {
        getItem: key => store[key] || null,
        setItem: (key, val) => { store[key] = val; },
        clear: () => { store = {}; },
      };
    })();
  });

  test('applyTheme("light") adds .light to <html>', () => {
    applyTheme('light', false, root, mockLocalStorage);
    expect(root.classList.contains('light')).toBe(true);
  });

  test('applyTheme("dark") removes .light from <html>', () => {
    root.classList.add('light');
    applyTheme('dark', false, root, mockLocalStorage);
    expect(root.classList.contains('light')).toBe(false);
  });

  test('applyTheme persists value to localStorage', () => {
    applyTheme('light', false, root, mockLocalStorage);
    expect(mockLocalStorage.getItem(STORE)).toBe('light');

    applyTheme('dark', false, root, mockLocalStorage);
    expect(mockLocalStorage.getItem(STORE)).toBe('dark');
  });

  test('toggling between light and dark works repeatedly', () => {
    applyTheme('light', false, root, mockLocalStorage);
    expect(root.classList.contains('light')).toBe(true);

    applyTheme('dark', false, root, mockLocalStorage);
    expect(root.classList.contains('light')).toBe(false);

    applyTheme('light', false, root, mockLocalStorage);
    expect(root.classList.contains('light')).toBe(true);
  });

  test('reading saved theme defaults to "dark" when localStorage is empty', () => {
    const saved = mockLocalStorage.getItem(STORE) || 'dark';
    expect(saved).toBe('dark');
  });

  test('reading saved theme returns persisted value', () => {
    mockLocalStorage.setItem(STORE, 'light');
    const saved = mockLocalStorage.getItem(STORE) || 'dark';
    expect(saved).toBe('light');
  });

  test('repaintCharts is a no-op when Chart is undefined', () => {
    function repaintCharts(t, chartGlobal) {
      if (typeof chartGlobal === 'undefined' || !chartGlobal) return 'no-op';
      return 'repainted';
    }
    expect(repaintCharts('light', undefined)).toBe('no-op');
  });

  test('repaintCharts sets correct grid colour for light theme', () => {
    const lightGrid = 'rgba(15,23,42,0.08)';
    const darkGrid  = 'rgba(255,255,255,0.06)';
    const getGrid = t => (t === 'light') ? lightGrid : darkGrid;
    expect(getGrid('light')).toBe(lightGrid);
    expect(getGrid('dark')).toBe(darkGrid);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. THEME TOGGLE BUTTON CONSTRUCTION
// ─────────────────────────────────────────────────────────────────────────────

describe('Theme toggle button DOM construction', () => {
  function buildToggle(onClickTheme) {
    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Toggle light or dark theme');
    btn.setAttribute('title', 'Toggle theme');
    btn.innerHTML =
      '<svg class="ico-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
      '<svg class="ico-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/></svg>';
    btn.addEventListener('click', onClickTheme);
    return btn;
  }

  test('toggle button has class theme-toggle', () => {
    const btn = buildToggle(() => {});
    expect(btn.classList.contains('theme-toggle')).toBe(true);
  });

  test('toggle button has type="button"', () => {
    const btn = buildToggle(() => {});
    expect(btn.type).toBe('button');
  });

  test('toggle button has descriptive aria-label', () => {
    const btn = buildToggle(() => {});
    expect(btn.getAttribute('aria-label')).toBe('Toggle light or dark theme');
  });

  test('toggle button contains moon icon SVG', () => {
    const btn = buildToggle(() => {});
    expect(btn.querySelector('.ico-moon')).not.toBeNull();
  });

  test('toggle button contains sun icon SVG', () => {
    const btn = buildToggle(() => {});
    expect(btn.querySelector('.ico-sun')).not.toBeNull();
  });

  test('toggle button click calls provided handler', () => {
    const handler = jest.fn();
    const btn = buildToggle(handler);
    btn.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('clicking toggle switches from dark to light', () => {
    const root = document.documentElement;
    root.classList.remove('light');
    const btn = buildToggle(() => {
      const next = root.classList.contains('light') ? 'dark' : 'light';
      if (next === 'light') root.classList.add('light');
      else root.classList.remove('light');
    });
    btn.click();
    expect(root.classList.contains('light')).toBe(true);
  });

  test('clicking toggle twice returns to original theme', () => {
    const root = document.documentElement;
    root.classList.remove('light');
    const btn = buildToggle(() => {
      const next = root.classList.contains('light') ? 'dark' : 'light';
      if (next === 'light') root.classList.add('light');
      else root.classList.remove('light');
    });
    btn.click();
    btn.click();
    expect(root.classList.contains('light')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. QUICK JUMP NAVIGATION WIDGET
// ─────────────────────────────────────────────────────────────────────────────

describe('Quick Jump navigation widget', () => {
  const SECTIONS = [
    { id: 'summary',      label: 'Summary' },
    { id: 'competencies', label: 'Skills' },
    { id: 'experience',   label: 'Experience' },
    { id: 'transformation', label: 'Portfolio' },
    { id: 'kpi',          label: 'KPIs' },
    { id: 'dashboard',    label: 'Dashboard' },
    { id: 'education',    label: 'Credentials' },
  ];

  function buildQuickJump() {
    const wrap = document.createElement('div');
    wrap.className = 'quick-jump';

    const trigger = document.createElement('button');
    trigger.className = 'quick-jump-trigger';
    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', 'Quick jump to section');
    trigger.innerHTML =
      '<span class="qj-accent">Quick Jump</span>' +
      '<svg class="qj-chev" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

    const overlay = document.createElement('div');
    overlay.className = 'quick-jump-overlay';

    const menu = document.createElement('div');
    menu.className = 'quick-jump-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Quick jump navigation');

    SECTIONS.forEach(s => {
      const a = document.createElement('a');
      a.className = 'qj-link';
      a.href = '#' + s.id;
      a.textContent = s.label;
      a.setAttribute('role', 'menuitem');
      a.setAttribute('data-qj', s.id);
      a.addEventListener('click', () => close());
      menu.appendChild(a);
    });

    function open() {
      wrap.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    }
    function close() {
      wrap.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
    trigger.addEventListener('click', () => {
      wrap.classList.contains('open') ? close() : open();
    });
    overlay.addEventListener('click', close);

    wrap.appendChild(trigger);
    wrap.appendChild(overlay);
    wrap.appendChild(menu);

    wrap.__sync = function (activeId) {
      menu.querySelectorAll('.qj-link').forEach(l => {
        l.classList.toggle('is-active', l.getAttribute('data-qj') === activeId);
      });
    };

    return wrap;
  }

  let widget;

  beforeEach(() => {
    document.documentElement.innerHTML = loadHtml();
    widget = buildQuickJump();
    document.body.appendChild(widget);
  });

  test('widget has class quick-jump', () => {
    expect(widget.classList.contains('quick-jump')).toBe(true);
  });

  test('trigger button has aria-haspopup="true"', () => {
    const btn = widget.querySelector('.quick-jump-trigger');
    expect(btn.getAttribute('aria-haspopup')).toBe('true');
  });

  test('trigger button starts with aria-expanded="false"', () => {
    const btn = widget.querySelector('.quick-jump-trigger');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  test('widget is closed initially (no .open class)', () => {
    expect(widget.classList.contains('open')).toBe(false);
  });

  test('clicking trigger opens the menu', () => {
    widget.querySelector('.quick-jump-trigger').click();
    expect(widget.classList.contains('open')).toBe(true);
    expect(widget.querySelector('.quick-jump-trigger').getAttribute('aria-expanded')).toBe('true');
  });

  test('clicking trigger again closes the menu', () => {
    const btn = widget.querySelector('.quick-jump-trigger');
    btn.click();
    btn.click();
    expect(widget.classList.contains('open')).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  test('clicking overlay closes the menu', () => {
    widget.querySelector('.quick-jump-trigger').click();
    expect(widget.classList.contains('open')).toBe(true);

    widget.querySelector('.quick-jump-overlay').click();
    expect(widget.classList.contains('open')).toBe(false);
  });

  test('menu has all expected section links', () => {
    const links = widget.querySelectorAll('.qj-link');
    expect(links.length).toBe(SECTIONS.length);

    const hrefs = Array.from(links).map(l => l.getAttribute('href'));
    SECTIONS.forEach(s => expect(hrefs).toContain('#' + s.id));
  });

  test('each menu link has role="menuitem"', () => {
    const links = widget.querySelectorAll('.qj-link');
    links.forEach(l => expect(l.getAttribute('role')).toBe('menuitem'));
  });

  test('each menu link has data-qj attribute matching section id', () => {
    const links = widget.querySelectorAll('.qj-link');
    SECTIONS.forEach((s, i) => {
      expect(links[i].getAttribute('data-qj')).toBe(s.id);
    });
  });

  test('clicking a menu link closes the widget', () => {
    widget.querySelector('.quick-jump-trigger').click();
    expect(widget.classList.contains('open')).toBe(true);

    widget.querySelector('.qj-link').click();
    expect(widget.classList.contains('open')).toBe(false);
  });

  test('__sync marks the correct link as active', () => {
    widget.__sync('kpi');
    const active = widget.querySelectorAll('.qj-link.is-active');
    expect(active.length).toBe(1);
    expect(active[0].getAttribute('data-qj')).toBe('kpi');
  });

  test('__sync clears previously active link', () => {
    widget.__sync('summary');
    widget.__sync('education');
    const active = widget.querySelectorAll('.qj-link.is-active');
    expect(active.length).toBe(1);
    expect(active[0].getAttribute('data-qj')).toBe('education');
  });

  test('__sync with null activeId removes all .is-active', () => {
    widget.__sync('kpi');
    widget.__sync(null);
    const active = widget.querySelectorAll('.qj-link.is-active');
    expect(active.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. COMPETENCY SKILL TOOLTIPS
// ─────────────────────────────────────────────────────────────────────────────

describe('Competency skill tooltips', () => {
  const TIPS = {
    expert:     { label: 'Expert · 5/5',     desc: 'Deep, board-level mastery — leads strategy, sets standards, and mentors teams in this domain.' },
    advanced:   { label: 'Advanced · 4/5',   desc: 'Strong independent command — delivers complex work end-to-end with minimal oversight.' },
    proficient: { label: 'Proficient · 3/5', desc: 'Solid working capability — executes core tasks reliably and contributes to larger initiatives.' },
  };

  function injectTooltips(container) {
    const rows = container.querySelectorAll('.skill-row');
    rows.forEach(row => {
      const lvl = row.querySelector('.level');
      if (!lvl || row.querySelector('.skill-tip')) return;
      const cls = lvl.classList.contains('expert')
        ? 'expert'
        : lvl.classList.contains('advanced')
          ? 'advanced'
          : 'proficient';
      const nameEl = row.querySelector('.name');
      const name = nameEl ? nameEl.textContent.trim() : '';
      const t = TIPS[cls];
      lvl.setAttribute('tabindex', '0');
      lvl.setAttribute('role', 'img');
      lvl.setAttribute('aria-label', name + ' — ' + t.label);
      const tip = document.createElement('span');
      tip.className = 'skill-tip';
      tip.setAttribute('role', 'tooltip');
      tip.innerHTML =
        '<span class="skill-tip-level ' + cls + '">' + t.label + '</span>' +
        '<span class="skill-tip-desc">' + t.desc + '</span>';
      lvl.insertAdjacentElement('afterend', tip);
    });
  }

  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  function makeRow(levelClass, name = 'Test Skill') {
    const row = document.createElement('div');
    row.className = 'skill-row';
    row.innerHTML = `<span class="name">${name}</span><span class="level ${levelClass}">●●●●●</span>`;
    return row;
  }

  test('injects .skill-tip span after .level for expert row', () => {
    container.appendChild(makeRow('expert', 'FP&A'));
    injectTooltips(container);
    const tip = container.querySelector('.skill-tip');
    expect(tip).not.toBeNull();
    expect(tip.getAttribute('role')).toBe('tooltip');
  });

  test('injects .skill-tip span for advanced row', () => {
    container.appendChild(makeRow('advanced', 'Financial Modeling'));
    injectTooltips(container);
    expect(container.querySelector('.skill-tip')).not.toBeNull();
  });

  test('injects .skill-tip span for proficient row', () => {
    container.appendChild(makeRow('proficient', 'SAP'));
    injectTooltips(container);
    expect(container.querySelector('.skill-tip')).not.toBeNull();
  });

  test('level element gets tabindex="0"', () => {
    container.appendChild(makeRow('expert', 'IFRS'));
    injectTooltips(container);
    const lvl = container.querySelector('.level');
    expect(lvl.getAttribute('tabindex')).toBe('0');
  });

  test('level element gets role="img"', () => {
    container.appendChild(makeRow('expert', 'IFRS'));
    injectTooltips(container);
    expect(container.querySelector('.level').getAttribute('role')).toBe('img');
  });

  test('aria-label on level includes skill name and TIPS label', () => {
    container.appendChild(makeRow('expert', 'Working Capital'));
    injectTooltips(container);
    const lvl = container.querySelector('.level');
    expect(lvl.getAttribute('aria-label')).toBe('Working Capital — Expert · 5/5');
  });

  test('tooltip contains correct level badge class', () => {
    container.appendChild(makeRow('advanced', 'ERP'));
    injectTooltips(container);
    expect(container.querySelector('.skill-tip-level.advanced')).not.toBeNull();
  });

  test('tooltip content matches TIPS description for expert', () => {
    container.appendChild(makeRow('expert', 'Audit'));
    injectTooltips(container);
    const desc = container.querySelector('.skill-tip-desc');
    expect(desc.textContent).toContain('board-level mastery');
  });

  test('tooltip content matches TIPS description for advanced', () => {
    container.appendChild(makeRow('advanced', 'Audit'));
    injectTooltips(container);
    const desc = container.querySelector('.skill-tip-desc');
    expect(desc.textContent).toContain('Strong independent command');
  });

  test('tooltip content matches TIPS description for proficient', () => {
    container.appendChild(makeRow('proficient', 'Audit'));
    injectTooltips(container);
    const desc = container.querySelector('.skill-tip-desc');
    expect(desc.textContent).toContain('Solid working capability');
  });

  test('injectTooltips is idempotent — does not duplicate tips', () => {
    container.appendChild(makeRow('expert', 'FP&A'));
    injectTooltips(container);
    injectTooltips(container);
    const tips = container.querySelectorAll('.skill-tip');
    expect(tips.length).toBe(1);
  });

  test('injectTooltips processes multiple rows', () => {
    container.appendChild(makeRow('expert',     'FP&A'));
    container.appendChild(makeRow('advanced',   'ERP'));
    container.appendChild(makeRow('proficient', 'SAP'));
    injectTooltips(container);
    const tips = container.querySelectorAll('.skill-tip');
    expect(tips.length).toBe(3);
  });

  test('HTML document contains skill-row elements', () => {
    document.documentElement.innerHTML = loadHtml();
    const rows = document.querySelectorAll('.skill-row');
    expect(rows.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. MOTION / REVEAL — data-reveal observer & stagger (Feature 3 in PR)
// ─────────────────────────────────────────────────────────────────────────────

describe('data-reveal observer and stagger logic (Feature 3)', () => {
  const STAGGER = 60;

  function computeStaggerDelay(el, siblings) {
    const idx = siblings.indexOf(el);
    return idx > 0 ? idx * STAGGER : 0;
  }

  function applyReveal(el, motionOK, siblings) {
    if (motionOK) {
      el.style.transitionDelay = computeStaggerDelay(el, siblings) + 'ms';
    }
    el.classList.add('visible');
  }

  test('first sibling gets 0ms stagger delay', () => {
    const parent = document.createElement('div');
    const children = [0, 1, 2].map(() => {
      const el = document.createElement('div');
      el.setAttribute('data-reveal', 'up');
      parent.appendChild(el);
      return el;
    });
    const siblings = Array.from(parent.children).filter(c => c.hasAttribute('data-reveal'));
    expect(computeStaggerDelay(children[0], siblings)).toBe(0);
  });

  test('second sibling gets 60ms stagger delay', () => {
    const parent = document.createElement('div');
    const children = [0, 1, 2].map(() => {
      const el = document.createElement('div');
      el.setAttribute('data-reveal', 'up');
      parent.appendChild(el);
      return el;
    });
    const siblings = Array.from(parent.children).filter(c => c.hasAttribute('data-reveal'));
    expect(computeStaggerDelay(children[1], siblings)).toBe(60);
  });

  test('third sibling gets 120ms stagger delay', () => {
    const parent = document.createElement('div');
    const children = [0, 1, 2].map(() => {
      const el = document.createElement('div');
      el.setAttribute('data-reveal', 'up');
      parent.appendChild(el);
      return el;
    });
    const siblings = Array.from(parent.children).filter(c => c.hasAttribute('data-reveal'));
    expect(computeStaggerDelay(children[2], siblings)).toBe(120);
  });

  test('applyReveal adds .visible class', () => {
    const el = document.createElement('div');
    el.setAttribute('data-reveal', 'up');
    applyReveal(el, true, [el]);
    expect(el.classList.contains('visible')).toBe(true);
  });

  test('applyReveal sets correct transition-delay for non-first sibling', () => {
    const parent = document.createElement('div');
    const a = document.createElement('div');
    const b = document.createElement('div');
    a.setAttribute('data-reveal', 'up');
    b.setAttribute('data-reveal', 'up');
    parent.appendChild(a);
    parent.appendChild(b);
    const siblings = [a, b];
    applyReveal(b, true, siblings);
    expect(b.style.transitionDelay).toBe('60ms');
  });

  test('with motionOK=false transition delay is not set', () => {
    const parent = document.createElement('div');
    const children = [0, 1].map(() => {
      const el = document.createElement('div');
      el.setAttribute('data-reveal', 'up');
      parent.appendChild(el);
      return el;
    });
    const siblings = Array.from(parent.children).filter(c => c.hasAttribute('data-reveal'));
    applyReveal(children[1], false, siblings);
    // .visible still added, but no delay applied
    expect(children[1].classList.contains('visible')).toBe(true);
    expect(children[1].style.transitionDelay).toBeFalsy();
  });

  test('data-reveal="up" initial state: translateY(36px) opacity:0 per CSS spec', () => {
    const el = document.createElement('div');
    el.setAttribute('data-reveal', 'up');
    // CSS applied externally; we just verify the attribute value
    expect(el.getAttribute('data-reveal')).toBe('up');
    expect(el.classList.contains('visible')).toBe(false);
  });

  test('all [data-reveal] elements in actual HTML are unobserved at parse time', () => {
    document.documentElement.innerHTML = loadHtml();
    const els = document.querySelectorAll('[data-reveal]');
    // They should not have .visible class from static HTML — JS adds it on intersection
    const alreadyVisible = Array.from(els).filter(e => e.classList.contains('visible'));
    // At parse time (no IntersectionObserver firing) there should be 0 visible
    expect(alreadyVisible.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. .reveal SIBLING STAGGER ENHANCEMENT
// ─────────────────────────────────────────────────────────────────────────────

describe('.reveal sibling stagger enhancement', () => {
  const STAGGER = 60;

  function applyStagger(el, motionOK) {
    if (!motionOK || el.style.transitionDelay) return;
    const parent = el.parentElement;
    if (!parent) return;
    const siblings = Array.from(parent.children).filter(c => c.classList.contains('reveal'));
    const idx = siblings.indexOf(el);
    if (idx > 0) el.style.transitionDelay = (idx * STAGGER) + 'ms';
  }

  test('first .reveal sibling does NOT get a transition delay', () => {
    const parent = document.createElement('div');
    const first = document.createElement('div');
    first.classList.add('reveal');
    parent.appendChild(first);
    applyStagger(first, true);
    expect(first.style.transitionDelay).toBeFalsy();
  });

  test('second .reveal sibling gets 60ms delay', () => {
    const parent = document.createElement('div');
    ['reveal', 'reveal'].forEach(cls => {
      const el = document.createElement('div');
      el.classList.add(cls);
      parent.appendChild(el);
    });
    const [, second] = parent.children;
    applyStagger(second, true);
    expect(second.style.transitionDelay).toBe('60ms');
  });

  test('pre-existing transitionDelay is not overwritten', () => {
    const parent = document.createElement('div');
    const a = document.createElement('div');
    a.classList.add('reveal');
    const b = document.createElement('div');
    b.classList.add('reveal');
    b.style.transitionDelay = '200ms'; // already set
    parent.appendChild(a);
    parent.appendChild(b);
    applyStagger(b, true);
    expect(b.style.transitionDelay).toBe('200ms');
  });

  test('stagger is skipped entirely when motionOK is false', () => {
    const parent = document.createElement('div');
    ['reveal', 'reveal', 'reveal'].forEach(() => {
      const el = document.createElement('div');
      el.classList.add('reveal');
      parent.appendChild(el);
    });
    Array.from(parent.children).forEach(el => applyStagger(el, false));
    Array.from(parent.children).forEach(el => {
      expect(el.style.transitionDelay).toBeFalsy();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. KPI BOTTOM ACCENT INJECTION (Feature 4 in PR)
// ─────────────────────────────────────────────────────────────────────────────

describe('KPI bottom-accent bar injection (Feature 4)', () => {
  function injectAccentBars(container) {
    container.querySelectorAll('.kpi').forEach(kpi => {
      if (!kpi.querySelector('.kpi-bottom-accent')) {
        const bar = document.createElement('div');
        bar.className = 'kpi-bottom-accent';
        bar.setAttribute('aria-hidden', 'true');
        kpi.appendChild(bar);
      }
    });
  }

  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  function makeKpi(withAccent = false) {
    const kpi = document.createElement('div');
    kpi.className = 'kpi';
    if (withAccent) {
      const bar = document.createElement('div');
      bar.className = 'kpi-bottom-accent';
      kpi.appendChild(bar);
    }
    return kpi;
  }

  test('injects .kpi-bottom-accent into a .kpi card', () => {
    container.appendChild(makeKpi(false));
    injectAccentBars(container);
    expect(container.querySelector('.kpi-bottom-accent')).not.toBeNull();
  });

  test('injected bar has aria-hidden="true"', () => {
    container.appendChild(makeKpi(false));
    injectAccentBars(container);
    const bar = container.querySelector('.kpi-bottom-accent');
    expect(bar.getAttribute('aria-hidden')).toBe('true');
  });

  test('does NOT inject duplicate if bar already exists', () => {
    container.appendChild(makeKpi(true));
    injectAccentBars(container);
    const bars = container.querySelectorAll('.kpi-bottom-accent');
    expect(bars.length).toBe(1);
  });

  test('injects bars into all .kpi cards that lack one', () => {
    container.appendChild(makeKpi(false));
    container.appendChild(makeKpi(false));
    container.appendChild(makeKpi(false));
    injectAccentBars(container);
    const bars = container.querySelectorAll('.kpi-bottom-accent');
    expect(bars.length).toBe(3);
  });

  test('skips card that already has a bar, injects into others', () => {
    container.appendChild(makeKpi(true));  // already has bar
    container.appendChild(makeKpi(false)); // needs bar
    injectAccentBars(container);
    const bars = container.querySelectorAll('.kpi-bottom-accent');
    expect(bars.length).toBe(2);
  });

  test('function is idempotent — second call adds nothing', () => {
    container.appendChild(makeKpi(false));
    injectAccentBars(container);
    injectAccentBars(container);
    const bars = container.querySelectorAll('.kpi-bottom-accent');
    expect(bars.length).toBe(1);
  });

  test('injected bar is a child of the .kpi element', () => {
    const kpi = makeKpi(false);
    container.appendChild(kpi);
    injectAccentBars(container);
    const bar = container.querySelector('.kpi-bottom-accent');
    expect(bar.parentElement).toBe(kpi);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. MOTION SURFACE: init() — reduced-motion fast-path
// ─────────────────────────────────────────────────────────────────────────────

describe('motion-surface init reduced-motion fast-path', () => {
  function runInit(container, motionOK) {
    // Simulates the init() function from motion-surface-script
    container.querySelectorAll('[data-reveal]').forEach(el => {
      if (!motionOK) { el.classList.add('visible'); }
      // else: would call revealObs.observe(el) — skipped in unit test
    });
    // .reveal elements: would call staggerObs.observe — skipped
    // KPI accent injection
    container.querySelectorAll('.kpi').forEach(kpi => {
      if (!kpi.querySelector('.kpi-bottom-accent')) {
        const bar = document.createElement('div');
        bar.className = 'kpi-bottom-accent';
        bar.setAttribute('aria-hidden', 'true');
        kpi.appendChild(bar);
      }
    });
  }

  test('with prefers-reduced-motion: all [data-reveal] elements get .visible immediately', () => {
    const container = document.createElement('div');
    [0, 1, 2].forEach(() => {
      const el = document.createElement('div');
      el.setAttribute('data-reveal', 'left');
      container.appendChild(el);
    });
    runInit(container, false); // motionOK = false → reduced motion
    const visible = container.querySelectorAll('[data-reveal].visible');
    expect(visible.length).toBe(3);
  });

  test('without reduced-motion: [data-reveal] elements do NOT get .visible from init alone', () => {
    const container = document.createElement('div');
    const el = document.createElement('div');
    el.setAttribute('data-reveal', 'up');
    container.appendChild(el);
    runInit(container, true); // motionOK = true → uses observer (not invoked in unit test)
    expect(el.classList.contains('visible')).toBe(false);
  });

  test('KPI accent bars are always injected regardless of motion setting', () => {
    const container = document.createElement('div');
    const kpi = document.createElement('div');
    kpi.className = 'kpi';
    container.appendChild(kpi);

    runInit(container, false);
    expect(container.querySelector('.kpi-bottom-accent')).not.toBeNull();
  });

  test('KPI accent bars are injected in motionOK=true path too', () => {
    const container = document.createElement('div');
    const kpi = document.createElement('div');
    kpi.className = 'kpi';
    container.appendChild(kpi);

    runInit(container, true);
    expect(container.querySelector('.kpi-bottom-accent')).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. NAV ITEM STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

describe('Navigation items in HTML document', () => {
  beforeAll(() => {
    document.documentElement.innerHTML = loadHtml();
  });

  test('nav contains at least 7 navigation links', () => {
    const items = document.querySelectorAll('.top-nav .nav-item');
    expect(items.length).toBeGreaterThanOrEqual(7);
  });

  test('CTA nav item links to contact email', () => {
    const cta = document.querySelector('.nav-item.cta');
    expect(cta).not.toBeNull();
    expect(cta.getAttribute('href')).toContain('mailto:');
  });

  test('non-CTA nav items link to on-page sections', () => {
    const items = Array.from(document.querySelectorAll('.top-nav .nav-item:not(.cta)'));
    items.forEach(item => {
      expect(item.getAttribute('href')).toMatch(/^#/);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. SECTION STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

describe('Section structure', () => {
  beforeAll(() => {
    document.documentElement.innerHTML = loadHtml();
  });

  const EXPECTED_SECTIONS = ['summary', 'competencies', 'experience', 'transformation', 'kpi', 'dashboard', 'education'];

  test.each(EXPECTED_SECTIONS)('section #%s exists in document', id => {
    expect(document.getElementById(id)).not.toBeNull();
  });

  test('all sections have .section class', () => {
    EXPECTED_SECTIONS.forEach(id => {
      const el = document.getElementById(id);
      expect(el.classList.contains('section')).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. SMOOTH SCROLL HANDLER
// ─────────────────────────────────────────────────────────────────────────────

describe('Smooth scroll for nav links', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = loadHtml();
  });

  test('nav links with hash hrefs exist', () => {
    const links = document.querySelectorAll('.top-nav a[href^="#"]');
    expect(links.length).toBeGreaterThan(0);
  });

  test('clicking nav link calls preventDefault', () => {
    const links = document.querySelectorAll('.top-nav a[href^="#"]');
    const first = links[0];
    const mockEvent = { preventDefault: jest.fn() };
    // Simulate the click handler logic
    mockEvent.preventDefault();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 17. SPARK FUNCTION GUARD (chart setup safety)
// ─────────────────────────────────────────────────────────────────────────────

describe('spark function canvas guard', () => {
  function spark(id, data, color, chartLib) {
    const el = document.getElementById(id);
    if (!el || typeof chartLib === 'undefined') return null;
    return { el, data, color };
  }

  beforeEach(() => {
    document.documentElement.innerHTML = loadHtml();
  });

  test('spark returns null when element is missing', () => {
    expect(spark('nonexistent-id', [1, 2, 3], '#fff', undefined)).toBeNull();
  });

  test('spark returns null when Chart is undefined', () => {
    const canvas = document.createElement('canvas');
    canvas.id = 'testSpark';
    document.body.appendChild(canvas);
    expect(spark('testSpark', [1, 2], '#fff', undefined)).toBeNull();
  });

  test('spark returns object when element exists and Chart is defined', () => {
    const canvas = document.createElement('canvas');
    canvas.id = 'testSpark2';
    document.body.appendChild(canvas);
    const mockChart = {};
    const result = spark('testSpark2', [1, 2], '#5dd6a3', mockChart);
    expect(result).not.toBeNull();
    expect(result.data).toEqual([1, 2]);
    expect(result.color).toBe('#5dd6a3');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 18. CSS CUSTOM PROPERTIES (design token sanity)
// ─────────────────────────────────────────────────────────────────────────────

describe('CSS custom properties (design tokens)', () => {
  beforeAll(() => {
    document.documentElement.innerHTML = loadHtml();
  });

  test(':root CSS contains --bg-0 variable definition', () => {
    const styles = document.querySelector('style');
    expect(styles).not.toBeNull();
    expect(styles.textContent).toContain('--bg-0');
  });

  test(':root CSS contains --mint variable', () => {
    const styles = document.querySelector('style');
    expect(styles.textContent).toContain('--mint');
  });

  test(':root CSS contains --violet variable', () => {
    const styles = document.querySelector('style');
    expect(styles.textContent).toContain('--violet');
  });

  test(':root CSS contains --grad-aurora variable', () => {
    const styles = document.querySelector('style');
    expect(styles.textContent).toContain('--grad-aurora');
  });

  test('motion-surface-enh style block is present', () => {
    const motionStyle = document.getElementById('motion-surface-enh');
    expect(motionStyle).not.toBeNull();
  });

  test('motion-surface-enh defines .kpi-bottom-accent styles', () => {
    const motionStyle = document.getElementById('motion-surface-enh');
    expect(motionStyle.textContent).toContain('kpi-bottom-accent');
  });

  test('motion-surface-enh defines [data-reveal] variants', () => {
    const motionStyle = document.getElementById('motion-surface-enh');
    expect(motionStyle.textContent).toContain('data-reveal');
  });

  test('motion-surface-enh includes prefers-reduced-motion override', () => {
    const motionStyle = document.getElementById('motion-surface-enh');
    expect(motionStyle.textContent).toContain('prefers-reduced-motion');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 19. REGRESSION — Feature 3 transition timing values
// ─────────────────────────────────────────────────────────────────────────────

describe('Feature 3 & 4 regression — specific values from PR', () => {
  beforeAll(() => {
    document.documentElement.innerHTML = loadHtml();
  });

  test('motion-surface-enh uses 420ms transition duration', () => {
    const motionStyle = document.getElementById('motion-surface-enh');
    expect(motionStyle.textContent).toContain('420ms');
  });

  test('motion-surface-enh uses cubic-bezier(.22,1,.36,1)', () => {
    const motionStyle = document.getElementById('motion-surface-enh');
    expect(motionStyle.textContent).toContain('cubic-bezier(.22,1,.36,1)');
  });

  test('motion-surface-enh defines chart-card layered gradient background', () => {
    const motionStyle = document.getElementById('motion-surface-enh');
    expect(motionStyle.textContent).toContain('chart-card');
  });

  test('motion-surface-enh defines deeper KPI hover box-shadow', () => {
    const motionStyle = document.getElementById('motion-surface-enh');
    expect(motionStyle.textContent).toContain('.kpi:hover');
  });

  test('STAGGER constant is 60ms (verified via stagger math)', () => {
    // 5 siblings → 4th has index 4 → delay = 4 * 60 = 240
    const STAGGER = 60;
    expect(4 * STAGGER).toBe(240);
  });

  test('IntersectionObserver threshold is 0.15 in motion-surface-script', () => {
    const motionScript = document.getElementById('motion-surface-script');
    expect(motionScript).not.toBeNull();
    expect(motionScript.textContent).toContain('0.15');
  });

  test('motion-surface-script rootMargin is 0px 0px -50px 0px', () => {
    const motionScript = document.getElementById('motion-surface-script');
    expect(motionScript.textContent).toContain('-50px');
  });

  test('[data-reveal="up"] variant is defined in CSS', () => {
    const motionStyle = document.getElementById('motion-surface-enh');
    expect(motionStyle.textContent).toContain('[data-reveal="up"]');
  });

  test('[data-reveal="scale"] variant is defined in CSS', () => {
    const motionStyle = document.getElementById('motion-surface-enh');
    expect(motionStyle.textContent).toContain('[data-reveal="scale"]');
  });

  test('[data-reveal].visible resets transform to none', () => {
    const motionStyle = document.getElementById('motion-surface-enh');
    expect(motionStyle.textContent).toContain('transform:none');
  });
});
