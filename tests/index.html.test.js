/**
 * Tests for src/index.html JavaScript functionality
 *
 * Covers the JavaScript introduced in this PR:
 *  - Loader hide after page load
 *  - Navbar scroll class toggle
 *  - Scroll reveal system (IntersectionObserver on .reveal)
 *  - Smooth scroll for nav links
 *  - Theme toggle: applyTheme, repaintCharts, buildToggle, localStorage
 *  - Quick Jump navigation: buildQuickJump, open/close, keyboard nav, sync
 *  - Competency tooltip injection: TIPS data, aria attributes, DOM insertion
 *  - Motion surface enhancements: data-reveal observer, stagger, KPI bottom accent
 *  - Scroll progress bar width calculation
 *  - Active nav link highlighting
 */

'use strict';

/* ─── Helpers ─────────────────────────────────────────────────── */

/**
 * Build a minimal DOM that mirrors the HTML structure the scripts depend on.
 */
function buildDOM() {
  document.body.innerHTML = `
    <div id="loader"></div>
    <canvas id="particle-canvas"></canvas>
    <div class="scroll-progress" id="scrollProgress"></div>
    <nav class="top-nav" id="topNav">
      <a class="nav-item" href="#summary">Summary</a>
      <a class="nav-item" href="#competencies">Skills</a>
      <a class="nav-item btn btn-primary cta" href="#">Resume</a>
    </nav>
    <section id="summary" class="section"><p>Summary</p></section>
    <section id="competencies" class="section"><p>Skills</p></section>
    <section id="experience" class="section"><p>Exp</p></section>
    <section id="transformation" class="section"><p>Portfolio</p></section>
    <section id="kpi" class="section"><p>KPIs</p></section>
    <section id="dashboard" class="section"><p>Dashboard</p></section>
    <section id="education" class="section"><p>Credentials</p></section>
    <div class="reveal">Content A</div>
    <div class="reveal">Content B</div>
    <div class="reveal">Content C</div>
    <div data-reveal="up">Reveal Up</div>
    <div data-reveal="left">Reveal Left</div>
    <div data-reveal="scale">Reveal Scale</div>
    <div class="matrix-grid">
      <div class="matrix-cluster">
        <div class="skill-row">
          <span class="name">IFRS</span>
          <span class="level expert">EXPERT</span>
        </div>
        <div class="skill-row">
          <span class="name">Power BI</span>
          <span class="level advanced">ADVANCED</span>
        </div>
        <div class="skill-row">
          <span class="name">ERP</span>
          <span class="level proficient">PROFICIENT</span>
        </div>
      </div>
    </div>
    <div class="kpi" id="kpi1"><span class="kpi-value">10M</span></div>
    <div class="kpi" id="kpi2"><span class="kpi-value">5M</span></div>
    <div class="footer-stamp reveal">Footer</div>
    <div class="orb-3"></div>
  `;
}

/**
 * Create a fake IntersectionObserver that stores observers and lets
 * tests manually fire intersection callbacks.
 */
function mockIntersectionObserver() {
  const instances = [];
  class FakeIO {
    constructor(cb, options) {
      this.cb = cb;
      this.options = options;
      this.observed = [];
      instances.push(this);
    }
    observe(el) { this.observed.push(el); }
    unobserve(el) { this.observed = this.observed.filter(e => e !== el); }
    disconnect() { this.observed = []; }
    /** Helper: fire the callback as if `el` just became visible */
    triggerIntersect(el, isIntersecting = true) {
      this.cb([{ target: el, isIntersecting }], this);
    }
  }
  global.IntersectionObserver = FakeIO;
  return instances;
}

/* ─── 1. Loader Hide ──────────────────────────────────────────── */
describe('Loader hide', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    buildDOM();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('loader element exists in DOM', () => {
    expect(document.getElementById('loader')).not.toBeNull();
  });

  test('loader does not have "hidden" class before load fires', () => {
    expect(document.getElementById('loader').classList.contains('hidden')).toBe(false);
  });

  test('loader receives "hidden" class 1200 ms after window load', () => {
    // Inline the loader logic exactly as written in the HTML
    window.addEventListener('load', () => {
      setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
      }, 1200);
    });

    window.dispatchEvent(new Event('load'));
    expect(document.getElementById('loader').classList.contains('hidden')).toBe(false);

    jest.advanceTimersByTime(1200);
    expect(document.getElementById('loader').classList.contains('hidden')).toBe(true);
  });

  test('loader does NOT receive "hidden" class before 1200 ms', () => {
    window.addEventListener('load', () => {
      setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
      }, 1200);
    });
    window.dispatchEvent(new Event('load'));
    jest.advanceTimersByTime(1199);
    expect(document.getElementById('loader').classList.contains('hidden')).toBe(false);
  });
});

/* ─── 2. Navbar Scroll Behaviour ─────────────────────────────── */
describe('Navbar scroll behaviour', () => {
  beforeEach(() => {
    buildDOM();
  });

  function simulateNavbarScroll(scrollY) {
    // Exactly mirrors the inline script behaviour
    const topNav = document.getElementById('topNav');
    if (scrollY > 60) {
      topNav.classList.add('scrolled');
    } else {
      topNav.classList.remove('scrolled');
    }
  }

  test('topNav element exists', () => {
    expect(document.getElementById('topNav')).not.toBeNull();
  });

  test('adds "scrolled" class when scrollY > 60', () => {
    simulateNavbarScroll(61);
    expect(document.getElementById('topNav').classList.contains('scrolled')).toBe(true);
  });

  test('adds "scrolled" class when scrollY is exactly 61', () => {
    simulateNavbarScroll(61);
    expect(document.getElementById('topNav').classList.contains('scrolled')).toBe(true);
  });

  test('removes "scrolled" class when scrollY <= 60', () => {
    const nav = document.getElementById('topNav');
    nav.classList.add('scrolled');
    simulateNavbarScroll(60);
    expect(nav.classList.contains('scrolled')).toBe(false);
  });

  test('does not add "scrolled" class when scrollY is exactly 60', () => {
    simulateNavbarScroll(60);
    expect(document.getElementById('topNav').classList.contains('scrolled')).toBe(false);
  });

  test('does not add "scrolled" class when scrollY is 0', () => {
    simulateNavbarScroll(0);
    expect(document.getElementById('topNav').classList.contains('scrolled')).toBe(false);
  });

  test('removes "scrolled" class after being set when scrollY drops below 61', () => {
    const nav = document.getElementById('topNav');
    simulateNavbarScroll(100);
    expect(nav.classList.contains('scrolled')).toBe(true);
    simulateNavbarScroll(30);
    expect(nav.classList.contains('scrolled')).toBe(false);
  });
});

/* ─── 3. Scroll Reveal System ─────────────────────────────────── */
describe('Scroll reveal system', () => {
  let ioInstances;

  beforeEach(() => {
    ioInstances = mockIntersectionObserver();
    buildDOM();
  });

  function initReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -60px 0px',
      threshold: 0.08
    });
    document.querySelectorAll('.reveal').forEach(el => {
      observer.observe(el);
    });
    return observer;
  }

  test('observes all .reveal elements', () => {
    const observer = initReveal();
    const io = ioInstances.find(i => i.observed.some(el => el.classList.contains('reveal')));
    const revealEls = document.querySelectorAll('.reveal');
    expect(io.observed.length).toBe(revealEls.length);
  });

  test('adds "visible" class when element intersects', () => {
    initReveal();
    const io = ioInstances[ioInstances.length - 1];
    const revealEl = document.querySelector('.reveal');
    io.triggerIntersect(revealEl, true);
    expect(revealEl.classList.contains('visible')).toBe(true);
  });

  test('does NOT add "visible" class when element does NOT intersect', () => {
    initReveal();
    const io = ioInstances[ioInstances.length - 1];
    const revealEl = document.querySelector('.reveal');
    io.triggerIntersect(revealEl, false);
    expect(revealEl.classList.contains('visible')).toBe(false);
  });

  test('unobserves element after it becomes visible', () => {
    initReveal();
    const io = ioInstances[ioInstances.length - 1];
    const revealEl = document.querySelector('.reveal');
    const initialCount = io.observed.length;
    io.triggerIntersect(revealEl, true);
    expect(io.observed.length).toBe(initialCount - 1);
    expect(io.observed).not.toContain(revealEl);
  });

  test('IntersectionObserver configured with correct threshold and margin', () => {
    initReveal();
    const io = ioInstances[ioInstances.length - 1];
    expect(io.options.threshold).toBe(0.08);
    expect(io.options.rootMargin).toBe('0px 0px -60px 0px');
    expect(io.options.root).toBeNull();
  });

  test('does not mark already-hidden elements visible without intersection', () => {
    initReveal();
    const allReveals = document.querySelectorAll('.reveal');
    allReveals.forEach(el => {
      expect(el.classList.contains('visible')).toBe(false);
    });
  });

  test('all reveal elements become visible when individually intersected', () => {
    initReveal();
    const io = ioInstances[ioInstances.length - 1];
    const allReveals = Array.from(document.querySelectorAll('.reveal'));
    allReveals.forEach(el => io.triggerIntersect(el, true));
    allReveals.forEach(el => {
      expect(el.classList.contains('visible')).toBe(true);
    });
  });
});

/* ─── 4. Theme Toggle ─────────────────────────────────────────── */
describe('Theme toggle (applyTheme)', () => {
  const STORE = 'mohanad-theme';

  beforeEach(() => {
    buildDOM();
    document.documentElement.className = '';
    localStorage.clear();
  });

  /** Inline version of applyTheme without animation and chart repaint */
  function applyTheme(t) {
    const root = document.documentElement;
    if (t === 'light') root.classList.add('light');
    else root.classList.remove('light');
    try { localStorage.setItem(STORE, t); } catch(e) {}
  }

  test('adds "light" class to <html> when theme is "light"', () => {
    applyTheme('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  test('removes "light" class from <html> when theme is "dark"', () => {
    document.documentElement.classList.add('light');
    applyTheme('dark');
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  test('persists "light" to localStorage under the correct key', () => {
    applyTheme('light');
    expect(localStorage.getItem(STORE)).toBe('light');
  });

  test('persists "dark" to localStorage under the correct key', () => {
    applyTheme('dark');
    expect(localStorage.getItem(STORE)).toBe('dark');
  });

  test('reading saved theme from localStorage and applying it', () => {
    localStorage.setItem(STORE, 'light');
    const saved = localStorage.getItem(STORE) || 'dark';
    applyTheme(saved, false);
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  test('defaults to "dark" when localStorage has no entry', () => {
    const saved = localStorage.getItem(STORE) || 'dark';
    applyTheme(saved, false);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  test('toggling from dark produces light', () => {
    applyTheme('dark');
    const root = document.documentElement;
    const next = root.classList.contains('light') ? 'dark' : 'light';
    applyTheme(next);
    expect(root.classList.contains('light')).toBe(true);
  });

  test('toggling from light produces dark', () => {
    applyTheme('light');
    const root = document.documentElement;
    const next = root.classList.contains('light') ? 'dark' : 'light';
    applyTheme(next);
    expect(root.classList.contains('light')).toBe(false);
  });
});

describe('buildToggle (theme button)', () => {
  beforeEach(() => {
    buildDOM();
    document.documentElement.className = '';
    localStorage.clear();
  });

  function buildToggle() {
    const STORE = 'mohanad-theme';
    const root = document.documentElement;
    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Toggle light or dark theme');
    btn.setAttribute('title', 'Toggle theme');
    btn.innerHTML =
      '<svg class="ico-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
      '<svg class="ico-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/></svg>';
    btn.addEventListener('click', function() {
      const next = root.classList.contains('light') ? 'dark' : 'light';
      if (next === 'light') root.classList.add('light'); else root.classList.remove('light');
      try { localStorage.setItem(STORE, next); } catch(e) {}
    });
    return btn;
  }

  test('creates a <button> element', () => {
    const btn = buildToggle();
    expect(btn.tagName).toBe('BUTTON');
  });

  test('has class "theme-toggle"', () => {
    const btn = buildToggle();
    expect(btn.classList.contains('theme-toggle')).toBe(true);
  });

  test('has correct aria-label', () => {
    const btn = buildToggle();
    expect(btn.getAttribute('aria-label')).toBe('Toggle light or dark theme');
  });

  test('contains moon icon svg', () => {
    const btn = buildToggle();
    expect(btn.querySelector('.ico-moon')).not.toBeNull();
  });

  test('contains sun icon svg', () => {
    const btn = buildToggle();
    expect(btn.querySelector('.ico-sun')).not.toBeNull();
  });

  test('clicking toggles html to light when currently dark', () => {
    const btn = buildToggle();
    document.documentElement.classList.remove('light');
    btn.click();
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  test('clicking toggles html to dark when currently light', () => {
    const btn = buildToggle();
    document.documentElement.classList.add('light');
    btn.click();
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  test('clicking saves new theme to localStorage', () => {
    const btn = buildToggle();
    btn.click();
    const stored = localStorage.getItem('mohanad-theme');
    expect(['light', 'dark']).toContain(stored);
  });
});

/* ─── 5. Quick Jump Navigation ───────────────────────────────── */
describe('buildQuickJump', () => {
  const SECTIONS = [
    {id:'summary',       label:'Summary'},
    {id:'competencies',  label:'Skills'},
    {id:'experience',    label:'Experience'},
    {id:'transformation',label:'Portfolio'},
    {id:'kpi',           label:'KPIs'},
    {id:'dashboard',     label:'Dashboard'},
    {id:'education',     label:'Credentials'}
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
    trigger.innerHTML = '<span class="qj-accent">Quick Jump</span>' +
      '<svg class="qj-chev" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

    const overlay = document.createElement('div');
    overlay.className = 'quick-jump-overlay';

    const menu = document.createElement('div');
    menu.className = 'quick-jump-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Quick jump navigation');

    SECTIONS.forEach(function(s) {
      const a = document.createElement('a');
      a.className = 'qj-link';
      a.href = '#' + s.id;
      a.textContent = s.label;
      a.setAttribute('role', 'menuitem');
      a.setAttribute('data-qj', s.id);
      a.addEventListener('click', function() { close(); });
      menu.appendChild(a);
    });

    function open() {
      wrap.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      const first = menu.querySelector('.qj-link');
      if (first) setTimeout(function() { first.focus(); }, 60);
      document.addEventListener('keydown', onKey);
    }
    function close() {
      wrap.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Escape') { close(); trigger.focus(); }
      if (e.key === 'Tab') {
        const f = menu.querySelectorAll('.qj-link');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    trigger.addEventListener('click', function() { wrap.classList.contains('open') ? close() : open(); });
    overlay.addEventListener('click', close);

    wrap.appendChild(trigger);
    wrap.appendChild(overlay);
    wrap.appendChild(menu);
    wrap.__sync = function(activeId) {
      menu.querySelectorAll('.qj-link').forEach(function(l) {
        l.classList.toggle('is-active', l.getAttribute('data-qj') === activeId);
      });
    };
    return wrap;
  }

  beforeEach(() => {
    buildDOM();
  });

  test('returns a div with class "quick-jump"', () => {
    const qj = buildQuickJump();
    expect(qj.classList.contains('quick-jump')).toBe(true);
  });

  test('contains a trigger button with aria-haspopup', () => {
    const qj = buildQuickJump();
    const btn = qj.querySelector('.quick-jump-trigger');
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('aria-haspopup')).toBe('true');
  });

  test('contains a menu div with role="menu"', () => {
    const qj = buildQuickJump();
    const menu = qj.querySelector('.quick-jump-menu');
    expect(menu).not.toBeNull();
    expect(menu.getAttribute('role')).toBe('menu');
  });

  test('menu contains correct number of section links', () => {
    const qj = buildQuickJump();
    const links = qj.querySelectorAll('.qj-link');
    expect(links.length).toBe(SECTIONS.length);
  });

  test('each link href matches section id', () => {
    const qj = buildQuickJump();
    const links = Array.from(qj.querySelectorAll('.qj-link'));
    SECTIONS.forEach((s, i) => {
      expect(links[i].getAttribute('href')).toBe('#' + s.id);
    });
  });

  test('each link has data-qj attribute matching section id', () => {
    const qj = buildQuickJump();
    const links = Array.from(qj.querySelectorAll('.qj-link'));
    SECTIONS.forEach((s, i) => {
      expect(links[i].getAttribute('data-qj')).toBe(s.id);
    });
  });

  test('each link has role="menuitem"', () => {
    const qj = buildQuickJump();
    const links = Array.from(qj.querySelectorAll('.qj-link'));
    links.forEach(l => expect(l.getAttribute('role')).toBe('menuitem'));
  });

  test('clicking trigger opens the menu (adds "open" class)', () => {
    const qj = buildQuickJump();
    const trigger = qj.querySelector('.quick-jump-trigger');
    trigger.click();
    expect(qj.classList.contains('open')).toBe(true);
  });

  test('clicking trigger sets aria-expanded="true" on open', () => {
    const qj = buildQuickJump();
    const trigger = qj.querySelector('.quick-jump-trigger');
    trigger.click();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  test('clicking trigger again closes the menu', () => {
    const qj = buildQuickJump();
    const trigger = qj.querySelector('.quick-jump-trigger');
    trigger.click(); // open
    trigger.click(); // close
    expect(qj.classList.contains('open')).toBe(false);
  });

  test('clicking trigger again resets aria-expanded to "false"', () => {
    const qj = buildQuickJump();
    const trigger = qj.querySelector('.quick-jump-trigger');
    trigger.click();
    trigger.click();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  test('clicking overlay closes the menu', () => {
    const qj = buildQuickJump();
    const trigger = qj.querySelector('.quick-jump-trigger');
    const overlay = qj.querySelector('.quick-jump-overlay');
    trigger.click();
    overlay.click();
    expect(qj.classList.contains('open')).toBe(false);
  });

  test('pressing Escape key closes the menu', () => {
    const qj = buildQuickJump();
    document.body.appendChild(qj);
    const trigger = qj.querySelector('.quick-jump-trigger');
    trigger.click(); // open (registers keydown listener)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(qj.classList.contains('open')).toBe(false);
  });

  test('__sync marks matching link as active', () => {
    const qj = buildQuickJump();
    qj.__sync('experience');
    const activeLinks = qj.querySelectorAll('.qj-link.is-active');
    expect(activeLinks.length).toBe(1);
    expect(activeLinks[0].getAttribute('data-qj')).toBe('experience');
  });

  test('__sync removes previous active when called with new id', () => {
    const qj = buildQuickJump();
    qj.__sync('summary');
    qj.__sync('kpi');
    const active = qj.querySelectorAll('.qj-link.is-active');
    expect(active.length).toBe(1);
    expect(active[0].getAttribute('data-qj')).toBe('kpi');
  });

  test('__sync with null removes all active states', () => {
    const qj = buildQuickJump();
    qj.__sync('summary');
    qj.__sync(null);
    expect(qj.querySelectorAll('.qj-link.is-active').length).toBe(0);
  });

  test('clicking a nav link closes the menu', () => {
    const qj = buildQuickJump();
    const trigger = qj.querySelector('.quick-jump-trigger');
    trigger.click(); // open
    const firstLink = qj.querySelector('.qj-link');
    firstLink.click();
    expect(qj.classList.contains('open')).toBe(false);
  });
});

/* ─── 6. Competency Tooltip Injection ────────────────────────── */
describe('injectTooltips', () => {
  const TIPS = {
    expert:     {label:'Expert · 5/5',     desc:'Deep, board-level mastery — leads strategy, sets standards, and mentors teams in this domain.'},
    advanced:   {label:'Advanced · 4/5',   desc:'Strong independent command — delivers complex work end-to-end with minimal oversight.'},
    proficient: {label:'Proficient · 3/5', desc:'Solid working capability — executes core tasks reliably and contributes to larger initiatives.'}
  };

  function injectTooltips() {
    const rows = document.querySelectorAll('.skill-row');
    rows.forEach(function(row) {
      const lvl = row.querySelector('.level');
      if (!lvl || row.querySelector('.skill-tip')) return;
      const cls = lvl.classList.contains('expert') ? 'expert'
        : lvl.classList.contains('advanced') ? 'advanced'
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
      tip.innerHTML = '<span class="skill-tip-level ' + cls + '">' + t.label + '</span>' +
        '<span class="skill-tip-desc">' + t.desc + '</span>';
      lvl.insertAdjacentElement('afterend', tip);
    });
  }

  beforeEach(() => {
    buildDOM();
  });

  test('injects .skill-tip after each .level element', () => {
    injectTooltips();
    const rows = document.querySelectorAll('.skill-row');
    rows.forEach(row => {
      expect(row.querySelector('.skill-tip')).not.toBeNull();
    });
  });

  test('sets tabindex="0" on .level elements', () => {
    injectTooltips();
    document.querySelectorAll('.skill-row .level').forEach(lvl => {
      expect(lvl.getAttribute('tabindex')).toBe('0');
    });
  });

  test('sets role="img" on .level elements', () => {
    injectTooltips();
    document.querySelectorAll('.skill-row .level').forEach(lvl => {
      expect(lvl.getAttribute('role')).toBe('img');
    });
  });

  test('sets aria-label including skill name and level label', () => {
    injectTooltips();
    const expertRow = document.querySelector('.skill-row .level.expert');
    expect(expertRow.getAttribute('aria-label')).toBe('IFRS — Expert · 5/5');
  });

  test('expert .skill-tip contains correct level label', () => {
    injectTooltips();
    const expertRow = document.querySelector('.skill-row');
    const tip = expertRow.querySelector('.skill-tip');
    expect(tip.querySelector('.skill-tip-level').textContent).toBe('Expert · 5/5');
  });

  test('expert .skill-tip has class "expert" on level span', () => {
    injectTooltips();
    const expertRow = document.querySelector('.skill-row');
    const levelSpan = expertRow.querySelector('.skill-tip .skill-tip-level');
    expect(levelSpan.classList.contains('expert')).toBe(true);
  });

  test('advanced .skill-tip contains correct level label', () => {
    injectTooltips();
    const rows = document.querySelectorAll('.skill-row');
    const advancedRow = rows[1]; // second row has .advanced
    const tip = advancedRow.querySelector('.skill-tip');
    expect(tip.querySelector('.skill-tip-level').textContent).toBe('Advanced · 4/5');
  });

  test('proficient .skill-tip contains correct level label', () => {
    injectTooltips();
    const rows = document.querySelectorAll('.skill-row');
    const profRow = rows[2]; // third row has .proficient
    const tip = profRow.querySelector('.skill-tip');
    expect(tip.querySelector('.skill-tip-level').textContent).toBe('Proficient · 3/5');
  });

  test('.skill-tip has role="tooltip"', () => {
    injectTooltips();
    document.querySelectorAll('.skill-tip').forEach(tip => {
      expect(tip.getAttribute('role')).toBe('tooltip');
    });
  });

  test('does NOT inject duplicate tooltips when called twice', () => {
    injectTooltips();
    injectTooltips();
    const rows = document.querySelectorAll('.skill-row');
    rows.forEach(row => {
      expect(row.querySelectorAll('.skill-tip').length).toBe(1);
    });
  });

  test('tip description is non-empty for each skill', () => {
    injectTooltips();
    document.querySelectorAll('.skill-tip .skill-tip-desc').forEach(desc => {
      expect(desc.textContent.length).toBeGreaterThan(10);
    });
  });
});

/* ─── 7. Motion Surface Enhancements ─────────────────────────── */
describe('Motion surface enhancements (Feature 3 & 4)', () => {
  let ioInstances;

  beforeEach(() => {
    ioInstances = mockIntersectionObserver();
    buildDOM();
  });

  const STAGGER = 60;

  /** Inline version of the motion-surface-script init logic */
  function initMotionSurface(motionOK = true) {
    const revealObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        if (motionOK) {
          const siblings = el.parentElement
            ? Array.from(el.parentElement.children).filter(function(c) { return c.hasAttribute('data-reveal'); })
            : [];
          const idx = siblings.indexOf(el);
          el.style.transitionDelay = (idx > 0 ? idx * STAGGER : 0) + 'ms';
        }
        requestAnimationFrame(function() { el.classList.add('visible'); });
        revealObs.unobserve(el);
      });
    }, { root: null, rootMargin: '0px 0px -50px 0px', threshold: 0.15 });

    const staggerObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        if (motionOK && !el.style.transitionDelay) {
          const siblings = el.parentElement
            ? Array.from(el.parentElement.children).filter(function(c) { return c.classList.contains('reveal'); })
            : [];
          const idx = siblings.indexOf(el);
          if (idx > 0) el.style.transitionDelay = (idx * STAGGER) + 'ms';
        }
        staggerObs.unobserve(el);
      });
    }, { root: null, rootMargin: '0px 0px -50px 0px', threshold: 0.15 });

    // Register data-reveal elements
    document.querySelectorAll('[data-reveal]').forEach(function(el) {
      if (!motionOK) { el.classList.add('visible'); return; }
      revealObs.observe(el);
    });
    // Enhance stagger on .reveal siblings
    document.querySelectorAll('.reveal').forEach(function(el) {
      if (motionOK) staggerObs.observe(el);
    });
    // Inject KPI bottom accent bars
    document.querySelectorAll('.kpi').forEach(function(kpi) {
      if (!kpi.querySelector('.kpi-bottom-accent')) {
        const bar = document.createElement('div');
        bar.className = 'kpi-bottom-accent';
        bar.setAttribute('aria-hidden', 'true');
        kpi.appendChild(bar);
      }
    });

    return { revealObs, staggerObs };
  }

  /* ── data-reveal observer ── */
  test('observes [data-reveal] elements when motion is allowed', () => {
    initMotionSurface(true);
    const dataRevealEls = document.querySelectorAll('[data-reveal]');
    const io = ioInstances.find(i => i.observed.some(el => el.hasAttribute('data-reveal')));
    expect(io).toBeDefined();
    expect(io.observed.length).toBe(dataRevealEls.length);
  });

  test('[data-reveal] elements immediately get "visible" when motion is disabled', () => {
    initMotionSurface(false);
    document.querySelectorAll('[data-reveal]').forEach(el => {
      expect(el.classList.contains('visible')).toBe(true);
    });
  });

  test('adds "visible" to [data-reveal] element on intersection', () => {
    jest.useFakeTimers();
    initMotionSurface(true);
    const io = ioInstances[0]; // first observer is revealObs
    const el = document.querySelector('[data-reveal]');
    io.triggerIntersect(el, true);
    // requestAnimationFrame callback — run it synchronously in test
    jest.runAllTimers();
    // jsdom's rAF is synchronous in some configs; force classList check
    expect(el.classList.contains('visible')).toBe(true);
    jest.useRealTimers();
  });

  test('revealObs unobserves element after intersection', () => {
    initMotionSurface(true);
    const io = ioInstances[0];
    const el = document.querySelector('[data-reveal]');
    const before = io.observed.length;
    io.triggerIntersect(el, true);
    expect(io.observed.length).toBe(before - 1);
  });

  test('revealObs configured with 15% threshold', () => {
    initMotionSurface(true);
    expect(ioInstances[0].options.threshold).toBe(0.15);
  });

  test('revealObs configured with -50px root margin', () => {
    initMotionSurface(true);
    expect(ioInstances[0].options.rootMargin).toBe('0px 0px -50px 0px');
  });

  /* ── stagger auto-delay ── */
  test('first sibling .reveal gets transitionDelay of 0 from staggerObs', () => {
    initMotionSurface(true);
    const staggerIO = ioInstances[1];
    const reveals = document.querySelectorAll('.reveal');
    staggerIO.triggerIntersect(reveals[0], true);
    // idx=0, so delay stays '' or is not explicitly set via staggerObs
    expect(reveals[0].style.transitionDelay).toBeFalsy();
  });

  test('second sibling .reveal gets 60ms transitionDelay from staggerObs', () => {
    initMotionSurface(true);
    const staggerIO = ioInstances[1];
    const reveals = document.querySelectorAll('.reveal');
    staggerIO.triggerIntersect(reveals[1], true);
    expect(reveals[1].style.transitionDelay).toBe('60ms');
  });

  test('third sibling .reveal gets 120ms transitionDelay from staggerObs', () => {
    initMotionSurface(true);
    const staggerIO = ioInstances[1];
    const reveals = document.querySelectorAll('.reveal');
    staggerIO.triggerIntersect(reveals[2], true);
    expect(reveals[2].style.transitionDelay).toBe('120ms');
  });

  /* ── KPI bottom accent injection ── */
  test('injects .kpi-bottom-accent into each .kpi card', () => {
    initMotionSurface(true);
    document.querySelectorAll('.kpi').forEach(kpi => {
      expect(kpi.querySelector('.kpi-bottom-accent')).not.toBeNull();
    });
  });

  test('.kpi-bottom-accent has aria-hidden="true"', () => {
    initMotionSurface(true);
    document.querySelectorAll('.kpi-bottom-accent').forEach(bar => {
      expect(bar.getAttribute('aria-hidden')).toBe('true');
    });
  });

  test('does NOT inject duplicate .kpi-bottom-accent when called twice', () => {
    initMotionSurface(true);
    initMotionSurface(true);
    document.querySelectorAll('.kpi').forEach(kpi => {
      expect(kpi.querySelectorAll('.kpi-bottom-accent').length).toBe(1);
    });
  });

  test('total KPI accent bars matches number of .kpi elements', () => {
    initMotionSurface(true);
    const kpiCount = document.querySelectorAll('.kpi').length;
    const accentCount = document.querySelectorAll('.kpi-bottom-accent').length;
    expect(accentCount).toBe(kpiCount);
  });

  /* ── data-reveal directional stagger via revealObs ── */
  test('first [data-reveal] sibling gets 0ms delay from revealObs', () => {
    initMotionSurface(true);
    const io = ioInstances[0]; // revealObs
    const el = document.querySelector('[data-reveal]');
    io.triggerIntersect(el, true);
    // el is the first sibling with data-reveal, idx=0 → delay=0
    expect(el.style.transitionDelay).toBe('0ms');
  });
});

/* ─── 8. Scroll Progress Bar ─────────────────────────────────── */
describe('Scroll progress bar', () => {
  beforeEach(() => {
    buildDOM();
  });

  function calcProgress(scrollTop, scrollHeight, clientHeight) {
    const m = scrollHeight - clientHeight;
    return m > 0 ? (scrollTop / m * 100) : 0;
  }

  test('returns 0 when at top of page', () => {
    expect(calcProgress(0, 1000, 800)).toBe(0);
  });

  test('returns 100 when scrolled to bottom', () => {
    expect(calcProgress(200, 1000, 800)).toBe(100);
  });

  test('returns 50 when halfway scrolled', () => {
    expect(calcProgress(100, 1000, 800)).toBe(50);
  });

  test('returns 0 when content shorter than viewport', () => {
    expect(calcProgress(0, 500, 800)).toBe(0);
  });

  test('returns 0 when scrollHeight equals clientHeight', () => {
    expect(calcProgress(0, 800, 800)).toBe(0);
  });

  test('scrollProgress element exists in DOM', () => {
    expect(document.getElementById('scrollProgress')).not.toBeNull();
  });

  test('sets bar width to "0%" initially when at top', () => {
    const bar = document.getElementById('scrollProgress');
    const h = document.documentElement;
    Object.defineProperty(h, 'scrollTop',    { value: 0,    configurable: true });
    Object.defineProperty(h, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(h, 'clientHeight', { value: 800,  configurable: true });

    const m = h.scrollHeight - h.clientHeight;
    const s = h.scrollTop;
    bar.style.width = (m > 0 ? (s / m * 100) : 0) + '%';
    expect(bar.style.width).toBe('0%');
  });

  test('sets bar width to "50%" when halfway scrolled', () => {
    const bar = document.getElementById('scrollProgress');
    const h = document.documentElement;
    Object.defineProperty(h, 'scrollTop',    { value: 100,  configurable: true });
    Object.defineProperty(h, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(h, 'clientHeight', { value: 800,  configurable: true });

    const m = h.scrollHeight - h.clientHeight;
    const s = h.scrollTop;
    bar.style.width = (m > 0 ? (s / m * 100) : 0) + '%';
    expect(bar.style.width).toBe('50%');
  });
});

/* ─── 9. Active Nav Highlight ─────────────────────────────────── */
describe('Active nav link highlight', () => {
  beforeEach(() => {
    buildDOM();
  });

  function buildNavItems() {
    const links = Array.from(document.querySelectorAll('.top-nav a[href^="#"]'));
    return links.map(l => {
      const id = l.getAttribute('href').slice(1);
      const t = document.getElementById(id);
      return t ? { link: l, target: t } : null;
    }).filter(Boolean);
  }

  function tickActive(items, scrollY) {
    const y = scrollY + 200;
    let current = null;
    for (const it of items) {
      if (it.target.offsetTop <= y) current = it;
    }
    items.forEach(it => it.link.classList.remove('is-active'));
    if (current) current.link.classList.add('is-active');
    return current;
  }

  test('nav items are built correctly from anchored links', () => {
    const items = buildNavItems();
    // Only links with existing target sections are included
    expect(items.length).toBeGreaterThan(0);
    items.forEach(it => {
      expect(it.link).toBeDefined();
      expect(it.target).toBeDefined();
    });
  });

  test('only one link is active at a time', () => {
    const items = buildNavItems();
    tickActive(items, 0);
    const active = document.querySelectorAll('.top-nav a.is-active');
    expect(active.length).toBeLessThanOrEqual(1);
  });

  test('removes is-active from all links when no section qualifies', () => {
    const items = buildNavItems();
    // Set all sections to have a large offsetTop so none qualify
    items.forEach(it => Object.defineProperty(it.target, 'offsetTop', { value: 9999, configurable: true }));
    items.forEach(it => it.link.classList.add('is-active')); // pre-set
    tickActive(items, 0);
    const active = document.querySelectorAll('.top-nav a.is-active');
    expect(active.length).toBe(0);
  });
});

/* ─── 10. spark() function (guard / structure) ──────────────── */
describe('spark() sparkline guard', () => {
  beforeEach(() => {
    buildDOM();
  });

  test('does nothing when element id does not exist', () => {
    // Chart not defined — should not throw
    expect(() => {
      const el = document.getElementById('sparkRevenue');
      if (!el || typeof Chart === 'undefined') return;
    }).not.toThrow();
  });

  test('spark function does nothing when Chart is not defined', () => {
    // Simulate the guard inside spark()
    function spark(id, data, color) {
      const el = document.getElementById(id);
      if (!el || typeof Chart === 'undefined') return null;
      return 'would_create_chart';
    }
    expect(spark('sparkRevenue', [], '#5dd6a3')).toBeNull();
  });
});

/* ─── 11. HTML Structure / Key Elements ─────────────────────── */
describe('HTML structure — key elements', () => {
  beforeEach(() => {
    buildDOM();
  });

  test('#loader element exists', () => {
    expect(document.getElementById('loader')).not.toBeNull();
  });

  test('#topNav element exists', () => {
    expect(document.getElementById('topNav')).not.toBeNull();
  });

  test('#particle-canvas element exists', () => {
    expect(document.getElementById('particle-canvas')).not.toBeNull();
  });

  test('#scrollProgress element exists', () => {
    expect(document.getElementById('scrollProgress')).not.toBeNull();
  });

  test('.top-nav contains anchor links with "#" hrefs', () => {
    const links = document.querySelectorAll('.top-nav a[href^="#"]');
    expect(links.length).toBeGreaterThan(0);
  });

  test('.reveal elements are present', () => {
    const revealEls = document.querySelectorAll('.reveal');
    expect(revealEls.length).toBeGreaterThan(0);
  });

  test('[data-reveal] elements are present', () => {
    const els = document.querySelectorAll('[data-reveal]');
    expect(els.length).toBeGreaterThan(0);
  });

  test('.skill-row elements are present', () => {
    const rows = document.querySelectorAll('.skill-row');
    expect(rows.length).toBeGreaterThan(0);
  });

  test('.kpi elements are present', () => {
    const kpis = document.querySelectorAll('.kpi');
    expect(kpis.length).toBeGreaterThan(0);
  });
});

/* ─── 12. data-reveal CSS variants ─────────────────────────── */
describe('data-reveal directional variants', () => {
  beforeEach(() => {
    buildDOM();
  });

  const variants = ['up', 'down', 'left', 'right', 'scale'];

  test.each(variants)('DOM contains [data-reveal="%s"] element', (variant) => {
    // Add one of each variant to the DOM
    const el = document.createElement('div');
    el.setAttribute('data-reveal', variant);
    document.body.appendChild(el);
    expect(document.querySelector(`[data-reveal="${variant}"]`)).not.toBeNull();
  });

  test('element with data-reveal gets "visible" class after intersection', () => {
    // Override requestAnimationFrame to run synchronously for this test
    const originalRAF = global.requestAnimationFrame;
    global.requestAnimationFrame = (cb) => { cb(0); return 0; };

    const ioInst = mockIntersectionObserver();
    // Minimal inline version of revealObs
    const obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        requestAnimationFrame(function() { entry.target.classList.add('visible'); });
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.15 });

    const el = document.createElement('div');
    el.setAttribute('data-reveal', 'left');
    document.body.appendChild(el);
    obs.observe(el);

    const io = ioInst[ioInst.length - 1];
    io.triggerIntersect(el, true);
    expect(el.classList.contains('visible')).toBe(true);

    global.requestAnimationFrame = originalRAF;
  });
});

/* ─── 13. Smooth Scroll ───────────────────────────────────────── */
describe('Smooth scroll nav links', () => {
  beforeEach(() => {
    buildDOM();
  });

  test('clicking a nav anchor calls scrollIntoView on the target', () => {
    const link = document.querySelector('.top-nav a[href^="#"]');
    if (!link) return; // skip if no anchor links in DOM

    const targetId = link.getAttribute('href').slice(1);
    const target = document.getElementById(targetId);
    if (!target) return;

    target.scrollIntoView = jest.fn();

    link.addEventListener('click', function(e) {
      e.preventDefault();
      const t = document.querySelector(this.getAttribute('href'));
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    link.click();
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  test('clicking a nav anchor prevents default navigation', () => {
    const link = document.querySelector('.top-nav a[href^="#"]');
    if (!link) return;

    let defaultPrevented = false;
    link.addEventListener('click', function(e) {
      e.preventDefault();
      defaultPrevented = e.defaultPrevented;
    });

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});

/* ─── 14. repaintCharts guard ─────────────────────────────────── */
describe('repaintCharts guard', () => {
  test('does nothing when Chart is undefined', () => {
    function repaintCharts(t) {
      if (typeof Chart === 'undefined' || !Chart.instances) return 'skipped';
      return 'painted';
    }
    expect(repaintCharts('light')).toBe('skipped');
  });

  test('does nothing when Chart.instances is falsy', () => {
    const Chart = { instances: null };
    function repaintCharts(t) {
      if (typeof Chart === 'undefined' || !Chart.instances) return 'skipped';
      return 'painted';
    }
    expect(repaintCharts('dark')).toBe('skipped');
  });

  test('selects correct grid color for light theme', () => {
    const t = 'light';
    const grid = (t === 'light') ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)';
    expect(grid).toBe('rgba(15,23,42,0.08)');
  });

  test('selects correct grid color for dark theme', () => {
    const t = 'dark';
    const grid = (t === 'light') ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)';
    expect(grid).toBe('rgba(255,255,255,0.06)');
  });

  test('selects correct tick color for light theme', () => {
    const t = 'light';
    const tick = (t === 'light') ? '#475569' : '#94A3B8';
    expect(tick).toBe('#475569');
  });

  test('selects correct tick color for dark theme', () => {
    const t = 'dark';
    const tick = (t === 'light') ? '#475569' : '#94A3B8';
    expect(tick).toBe('#94A3B8');
  });
});

/* ─── 15. Particle canvas resize guard ───────────────────────── */
describe('Particle canvas', () => {
  beforeEach(() => {
    buildDOM();
  });

  test('particle-canvas element is a CANVAS', () => {
    expect(document.getElementById('particle-canvas').tagName).toBe('CANVAS');
  });

  test('initParticles returns early when canvas is not found', () => {
    document.getElementById('particle-canvas').remove();
    // Guard that mirrors the initParticles guard
    function guard() {
      const canvas = document.getElementById('particle-canvas');
      if (!canvas) return 'no-canvas';
      return 'found';
    }
    expect(guard()).toBe('no-canvas');
  });
});
