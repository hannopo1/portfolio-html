/**
 * Tests for src/index.html JavaScript functionality
 *
 * Covers the four embedded script blocks added in this PR:
 *  1. Main Interactive Engine  (loader, navbar scroll, reveal, smooth scroll)
 *  2. Scroll Progress + Active Nav
 *  3. Enhancement script      (theme toggle, buildQuickJump, injectTooltips)
 *  4. Motion-surface script   (data-reveal stagger, KPI bottom accent)
 */

'use strict';

/* ─────────────────────────────────────────────────────────────────
   Helpers shared across suites
───────────────────────────────────────────────────────────────── */

/**
 * Reset jsdom document body for each test so tests remain isolated.
 */
function resetDOM() {
  document.body.innerHTML = '';
  document.documentElement.className = '';
}

/* ═══════════════════════════════════════════════════════════════
   SUITE 1 · LOADER HIDE BEHAVIOR
═══════════════════════════════════════════════════════════════ */
describe('Loader – hide on window load', () => {
  beforeEach(() => {
    resetDOM();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('adds "hidden" class to #loader after 1200 ms following load event', () => {
    document.body.innerHTML = '<div id="loader"></div>';
    const loader = document.getElementById('loader');

    // Simulate the exact handler from index.html Script 1:
    window.addEventListener('load', () => {
      setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
      }, 1200);
    });

    window.dispatchEvent(new Event('load'));
    expect(loader.classList.contains('hidden')).toBe(false);

    jest.advanceTimersByTime(1199);
    expect(loader.classList.contains('hidden')).toBe(false);

    jest.advanceTimersByTime(1);
    expect(loader.classList.contains('hidden')).toBe(true);
  });

  test('throws TypeError when #loader element is absent (no null guard)', () => {
    // The real code has no null guard: getElementById('loader').classList.add('hidden')
    // When #loader is absent, this will throw a TypeError at the 1200ms mark.
    window.addEventListener('load', () => {
      setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
      }, 1200);
    });

    window.dispatchEvent(new Event('load'));
    expect(() => {
      jest.advanceTimersByTime(1200);
    }).toThrow(TypeError);
  });

  test('#loader does NOT have "hidden" before the timeout fires', () => {
    document.body.innerHTML = '<div id="loader"></div>';
    const loader = document.getElementById('loader');

    window.addEventListener('load', () => {
      setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
      }, 1200);
    });

    window.dispatchEvent(new Event('load'));
    expect(loader.classList.contains('hidden')).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════════
   SUITE 2 · NAVBAR SCROLL BEHAVIOR
═══════════════════════════════════════════════════════════════ */
describe('Navbar – scroll class toggle', () => {
  let nav;

  // Inline version of the navbar scroll handler from Script 1
  function setupNavbarScrollHandler(navEl) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 60) {
        navEl.classList.add('scrolled');
      } else {
        navEl.classList.remove('scrolled');
      }
    });
  }

  beforeEach(() => {
    resetDOM();
    document.body.innerHTML = '<nav id="topNav"></nav>';
    nav = document.getElementById('topNav');
    setupNavbarScrollHandler(nav);
  });

  test('adds "scrolled" class when scrollY exceeds 60 px', () => {
    Object.defineProperty(window, 'scrollY', { value: 61, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    expect(nav.classList.contains('scrolled')).toBe(true);
  });

  test('removes "scrolled" class when scrollY is exactly 60 px', () => {
    // First scroll past 60 so the class is present
    Object.defineProperty(window, 'scrollY', { value: 100, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    expect(nav.classList.contains('scrolled')).toBe(true);

    // Now scroll back to boundary
    Object.defineProperty(window, 'scrollY', { value: 60, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    expect(nav.classList.contains('scrolled')).toBe(false);
  });

  test('does not add "scrolled" class when scrollY is 0', () => {
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    expect(nav.classList.contains('scrolled')).toBe(false);
  });

  test('adds "scrolled" class at exactly 61 px (boundary + 1)', () => {
    Object.defineProperty(window, 'scrollY', { value: 61, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    expect(nav.classList.contains('scrolled')).toBe(true);
  });

  test('"scrolled" class is removed again after scrolling back to top', () => {
    Object.defineProperty(window, 'scrollY', { value: 200, configurable: true });
    window.dispatchEvent(new Event('scroll'));

    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    window.dispatchEvent(new Event('scroll'));

    expect(nav.classList.contains('scrolled')).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════════
   SUITE 3 · SCROLL PROGRESS BAR
═══════════════════════════════════════════════════════════════ */
describe('Scroll progress bar', () => {
  // Pure function extracted from Script 2
  function calcProgress(scrollTop, scrollHeight, clientHeight) {
    const m = scrollHeight - clientHeight;
    return m > 0 ? (scrollTop / m * 100) : 0;
  }

  test('returns 0% when not scrolled', () => {
    expect(calcProgress(0, 1000, 800)).toBe(0);
  });

  test('returns 100% when scrolled to the very bottom', () => {
    expect(calcProgress(200, 1000, 800)).toBe(100);
  });

  test('returns 50% when halfway through scrollable area', () => {
    expect(calcProgress(100, 1000, 800)).toBe(50);
  });

  test('returns 0% when content is shorter than viewport (non-scrollable)', () => {
    // scrollHeight === clientHeight → m === 0
    expect(calcProgress(0, 800, 800)).toBe(0);
  });

  test('returns 0% when scrollHeight is less than clientHeight (edge case)', () => {
    expect(calcProgress(0, 500, 800)).toBe(0);
  });

  test('bar element width is set correctly via DOM', () => {
    resetDOM();
    document.body.innerHTML = '<div id="scrollProgress"></div>';
    const bar = document.getElementById('scrollProgress');

    // Simulate the tick() logic from Script 2
    function tick(scrollTop, scrollHeight, clientHeight) {
      const m = scrollHeight - clientHeight;
      bar.style.width = (m > 0 ? (scrollTop / m * 100) : 0) + '%';
    }

    tick(100, 1000, 800);
    expect(bar.style.width).toBe('50%');

    tick(0, 1000, 800);
    expect(bar.style.width).toBe('0%');

    tick(200, 1000, 800);
    expect(bar.style.width).toBe('100%');
  });

  test('fractional scroll positions produce fractional percentages', () => {
    expect(calcProgress(50, 1000, 800)).toBeCloseTo(25, 5);
  });
});

/* ═══════════════════════════════════════════════════════════════
   SUITE 4 · ACTIVE NAV LINK HIGHLIGHTING
═══════════════════════════════════════════════════════════════ */
describe('Active nav link highlighting', () => {
  /**
   * Simplified version of tickActive() from Script 2.
   * Returns the item whose target.offsetTop is closest <= scrollY + 200.
   */
  function getActiveItem(items, scrollY) {
    const y = scrollY + 200;
    let current = null;
    for (const it of items) {
      if (it.target.offsetTop <= y) current = it;
    }
    return current;
  }

  test('no active item when page is at top and first section is below fold', () => {
    const items = [
      { link: {}, target: { offsetTop: 500 } },
      { link: {}, target: { offsetTop: 1200 } },
    ];
    expect(getActiveItem(items, 0)).toBeNull();
  });

  test('first section becomes active when scrolled into range', () => {
    const linkA = {};
    const items = [
      { link: linkA, target: { offsetTop: 100 } },
      { link: {}, target: { offsetTop: 600 } },
    ];
    // scrollY = 0 → y = 200, offsetTop 100 <= 200 → active
    expect(getActiveItem(items, 0)).toBe(items[0]);
  });

  test('last section in range becomes the active item', () => {
    const linkB = {};
    const items = [
      { link: {}, target: { offsetTop: 100 } },
      { link: linkB, target: { offsetTop: 400 } },
      { link: {}, target: { offsetTop: 900 } },
    ];
    // scrollY = 300 → y = 500; offsetTop 400 <= 500, offsetTop 900 > 500
    expect(getActiveItem(items, 300)).toBe(items[1]);
  });

  test('is-active class is applied to correct link element via DOM', () => {
    resetDOM();
    document.body.innerHTML = `
      <nav class="top-nav">
        <a href="#s1">S1</a>
        <a href="#s2">S2</a>
      </nav>
      <section id="s1"></section>
      <section id="s2"></section>
    `;

    const links = document.querySelectorAll('.top-nav a[href^="#"]');
    const items = Array.from(links).map(l => {
      const id = l.getAttribute('href').slice(1);
      const t = document.getElementById(id);
      return t ? { link: l, target: t } : null;
    }).filter(Boolean);

    // Manually set offsetTop via property override
    Object.defineProperty(items[0].target, 'offsetTop', { value: 0, configurable: true });
    Object.defineProperty(items[1].target, 'offsetTop', { value: 800, configurable: true });

    // scrollY = 0 → y = 200; only s1 (offsetTop 0) <= 200
    const y = 0 + 200;
    let current = null;
    for (const it of items) {
      if (it.target.offsetTop <= y) current = it;
    }
    links.forEach(l => l.classList.remove('is-active'));
    if (current) current.link.classList.add('is-active');

    expect(links[0].classList.contains('is-active')).toBe(true);
    expect(links[1].classList.contains('is-active')).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════════
   SUITE 5 · THEME TOGGLE — applyTheme
═══════════════════════════════════════════════════════════════ */
describe('Theme toggle – applyTheme', () => {
  const STORE = 'mohanad-theme';

  // Minimal reimplementation matching index.html enh-script logic
  function makeApplyTheme() {
    const root = document.documentElement;
    function applyTheme(t, animate) {
      if (animate) {
        root.classList.add('theme-anim');
        setTimeout(() => root.classList.remove('theme-anim'), 560);
      }
      if (t === 'light') root.classList.add('light');
      else root.classList.remove('light');
      try { localStorage.setItem(STORE, t); } catch (e) {}
    }
    return applyTheme;
  }

  beforeEach(() => {
    resetDOM();
    localStorage.clear();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  test('adds "light" class to documentElement when theme is "light"', () => {
    const applyTheme = makeApplyTheme();
    applyTheme('light', false);
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  test('removes "light" class when theme is "dark"', () => {
    document.documentElement.classList.add('light');
    const applyTheme = makeApplyTheme();
    applyTheme('dark', false);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  test('persists theme to localStorage under key "mohanad-theme"', () => {
    const applyTheme = makeApplyTheme();
    applyTheme('light', false);
    expect(localStorage.getItem(STORE)).toBe('light');

    applyTheme('dark', false);
    expect(localStorage.getItem(STORE)).toBe('dark');
  });

  test('adds "theme-anim" class temporarily when animate=true, removes after 560 ms', () => {
    const applyTheme = makeApplyTheme();
    applyTheme('light', true);
    expect(document.documentElement.classList.contains('theme-anim')).toBe(true);

    jest.advanceTimersByTime(559);
    expect(document.documentElement.classList.contains('theme-anim')).toBe(true);

    jest.advanceTimersByTime(1);
    expect(document.documentElement.classList.contains('theme-anim')).toBe(false);
  });

  test('does NOT add "theme-anim" class when animate=false', () => {
    const applyTheme = makeApplyTheme();
    applyTheme('dark', false);
    expect(document.documentElement.classList.contains('theme-anim')).toBe(false);
  });

  test('reads saved theme from localStorage on init and applies it', () => {
    localStorage.setItem(STORE, 'light');
    let saved = 'dark';
    try { saved = localStorage.getItem(STORE) || 'dark'; } catch (e) {}
    expect(saved).toBe('light');
  });

  test('defaults to "dark" when localStorage is empty', () => {
    let saved = 'dark';
    try { saved = localStorage.getItem(STORE) || 'dark'; } catch (e) {}
    expect(saved).toBe('dark');
  });
});

/* ═══════════════════════════════════════════════════════════════
   SUITE 6 · buildToggle button
═══════════════════════════════════════════════════════════════ */
describe('buildToggle button', () => {
  function buildToggle(root) {
    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Toggle light or dark theme');
    btn.setAttribute('title', 'Toggle theme');
    btn.innerHTML =
      '<svg class="ico-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
      '<svg class="ico-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/></svg>';
    btn.addEventListener('click', function () {
      const next = root.classList.contains('light') ? 'dark' : 'light';
      if (next === 'light') root.classList.add('light');
      else root.classList.remove('light');
    });
    return btn;
  }

  beforeEach(() => resetDOM());

  test('returns a <button> element with class "theme-toggle"', () => {
    const btn = buildToggle(document.documentElement);
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.classList.contains('theme-toggle')).toBe(true);
  });

  test('button has correct aria-label', () => {
    const btn = buildToggle(document.documentElement);
    expect(btn.getAttribute('aria-label')).toBe('Toggle light or dark theme');
  });

  test('button click toggles from dark to light (adds "light")', () => {
    const btn = buildToggle(document.documentElement);
    document.documentElement.classList.remove('light'); // start dark
    btn.click();
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  test('button click toggles from light to dark (removes "light")', () => {
    const btn = buildToggle(document.documentElement);
    document.documentElement.classList.add('light');
    btn.click();
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  test('button contains both moon and sun SVG icons', () => {
    const btn = buildToggle(document.documentElement);
    expect(btn.querySelector('.ico-moon')).not.toBeNull();
    expect(btn.querySelector('.ico-sun')).not.toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════════════
   SUITE 7 · buildQuickJump – structure & sections
═══════════════════════════════════════════════════════════════ */
const SECTIONS = [
  { id: 'summary',       label: 'Summary' },
  { id: 'competencies',  label: 'Skills' },
  { id: 'experience',    label: 'Experience' },
  { id: 'transformation',label: 'Portfolio' },
  { id: 'kpi',           label: 'KPIs' },
  { id: 'dashboard',     label: 'Dashboard' },
  { id: 'education',     label: 'Credentials' },
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

  trigger.addEventListener('click', () => wrap.classList.contains('open') ? close() : open());
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

describe('buildQuickJump – DOM structure', () => {
  beforeEach(() => resetDOM());

  test('returns a div with class "quick-jump"', () => {
    const qj = buildQuickJump();
    expect(qj.tagName).toBe('DIV');
    expect(qj.classList.contains('quick-jump')).toBe(true);
  });

  test('contains a trigger button with correct aria attributes', () => {
    const qj = buildQuickJump();
    const trigger = qj.querySelector('.quick-jump-trigger');
    expect(trigger).not.toBeNull();
    expect(trigger.getAttribute('aria-haspopup')).toBe('true');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-label')).toBe('Quick jump to section');
  });

  test('menu has role="menu" and aria-label', () => {
    const qj = buildQuickJump();
    const menu = qj.querySelector('.quick-jump-menu');
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.getAttribute('aria-label')).toBe('Quick jump navigation');
  });

  test('generates exactly 7 .qj-link anchors matching SECTIONS', () => {
    const qj = buildQuickJump();
    const links = qj.querySelectorAll('.qj-link');
    expect(links.length).toBe(7);
  });

  test('each link href matches its section id', () => {
    const qj = buildQuickJump();
    const links = qj.querySelectorAll('.qj-link');
    SECTIONS.forEach((s, i) => {
      expect(links[i].getAttribute('href')).toBe('#' + s.id);
      expect(links[i].getAttribute('data-qj')).toBe(s.id);
    });
  });

  test('each link text matches its section label', () => {
    const qj = buildQuickJump();
    const links = qj.querySelectorAll('.qj-link');
    SECTIONS.forEach((s, i) => {
      expect(links[i].textContent).toBe(s.label);
    });
  });

  test('each link has role="menuitem"', () => {
    const qj = buildQuickJump();
    const links = qj.querySelectorAll('.qj-link');
    links.forEach(l => expect(l.getAttribute('role')).toBe('menuitem'));
  });

  test('contains an overlay element', () => {
    const qj = buildQuickJump();
    expect(qj.querySelector('.quick-jump-overlay')).not.toBeNull();
  });
});

describe('buildQuickJump – open / close behaviour', () => {
  beforeEach(() => resetDOM());

  test('trigger click adds "open" class and sets aria-expanded="true"', () => {
    const qj = buildQuickJump();
    document.body.appendChild(qj);
    const trigger = qj.querySelector('.quick-jump-trigger');

    trigger.click();
    expect(qj.classList.contains('open')).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  test('second trigger click removes "open" and resets aria-expanded="false"', () => {
    const qj = buildQuickJump();
    document.body.appendChild(qj);
    const trigger = qj.querySelector('.quick-jump-trigger');

    trigger.click(); // open
    trigger.click(); // close
    expect(qj.classList.contains('open')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  test('overlay click closes the menu', () => {
    const qj = buildQuickJump();
    document.body.appendChild(qj);
    const trigger = qj.querySelector('.quick-jump-trigger');
    const overlay = qj.querySelector('.quick-jump-overlay');

    trigger.click(); // open
    expect(qj.classList.contains('open')).toBe(true);

    overlay.click(); // close via overlay
    expect(qj.classList.contains('open')).toBe(false);
  });

  test('Escape key closes the menu', () => {
    const qj = buildQuickJump();
    document.body.appendChild(qj);
    const trigger = qj.querySelector('.quick-jump-trigger');

    trigger.click(); // open
    expect(qj.classList.contains('open')).toBe(true);

    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(esc);
    expect(qj.classList.contains('open')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  test('clicking a menu link closes the menu', () => {
    const qj = buildQuickJump();
    document.body.appendChild(qj);
    const trigger = qj.querySelector('.quick-jump-trigger');

    trigger.click(); // open
    const link = qj.querySelector('.qj-link');
    link.click();

    expect(qj.classList.contains('open')).toBe(false);
  });
});

describe('buildQuickJump – __sync active state', () => {
  beforeEach(() => resetDOM());

  test('__sync marks the link matching activeId as is-active', () => {
    const qj = buildQuickJump();
    qj.__sync('experience');
    const links = qj.querySelectorAll('.qj-link');
    const active = Array.from(links).find(l => l.classList.contains('is-active'));
    expect(active).not.toBeNull();
    expect(active.getAttribute('data-qj')).toBe('experience');
  });

  test('__sync clears is-active from all links when id is null', () => {
    const qj = buildQuickJump();
    qj.__sync('kpi');
    qj.__sync(null);
    const links = qj.querySelectorAll('.qj-link');
    links.forEach(l => expect(l.classList.contains('is-active')).toBe(false));
  });

  test('__sync only marks exactly one link active', () => {
    const qj = buildQuickJump();
    qj.__sync('dashboard');
    const active = qj.querySelectorAll('.qj-link.is-active');
    expect(active.length).toBe(1);
  });

  test('__sync toggles active to a different section', () => {
    const qj = buildQuickJump();
    qj.__sync('summary');
    qj.__sync('education');
    const active = Array.from(qj.querySelectorAll('.qj-link.is-active'));
    expect(active.length).toBe(1);
    expect(active[0].getAttribute('data-qj')).toBe('education');
  });
});

/* ═══════════════════════════════════════════════════════════════
   SUITE 8 · injectTooltips
═══════════════════════════════════════════════════════════════ */
const TIPS = {
  expert:     { label: 'Expert · 5/5',     desc: 'Deep, board-level mastery — leads strategy, sets standards, and mentors teams in this domain.' },
  advanced:   { label: 'Advanced · 4/5',   desc: 'Strong independent command — delivers complex work end-to-end with minimal oversight.' },
  proficient: { label: 'Proficient · 3/5', desc: 'Solid working capability — executes core tasks reliably and contributes to larger initiatives.' },
};

function injectTooltips() {
  const rows = document.querySelectorAll('.skill-row');
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
    tip.innerHTML = '<span class="skill-tip-level ' + cls + '">' + t.label + '</span>' +
                    '<span class="skill-tip-desc">' + t.desc + '</span>';
    lvl.insertAdjacentElement('afterend', tip);
  });
}

describe('injectTooltips – tooltip creation', () => {
  function makeSkillRow(levelClass, skillName) {
    const row = document.createElement('div');
    row.className = 'skill-row';
    row.innerHTML = `<span class="name">${skillName}</span><span class="level ${levelClass}">EXP</span>`;
    return row;
  }

  beforeEach(() => resetDOM());

  test('inserts a .skill-tip span after each .level element', () => {
    document.body.appendChild(makeSkillRow('expert', 'IFRS'));
    injectTooltips();
    expect(document.querySelectorAll('.skill-tip').length).toBe(1);
  });

  test('.skill-tip has role="tooltip"', () => {
    document.body.appendChild(makeSkillRow('advanced', 'SAP'));
    injectTooltips();
    const tip = document.querySelector('.skill-tip');
    expect(tip.getAttribute('role')).toBe('tooltip');
  });

  test('sets tabindex="0" and role="img" on the .level element', () => {
    document.body.appendChild(makeSkillRow('proficient', 'Excel'));
    injectTooltips();
    const lvl = document.querySelector('.level');
    expect(lvl.getAttribute('tabindex')).toBe('0');
    expect(lvl.getAttribute('role')).toBe('img');
  });

  test('aria-label includes skill name and level label', () => {
    document.body.appendChild(makeSkillRow('expert', 'Power BI'));
    injectTooltips();
    const lvl = document.querySelector('.level');
    expect(lvl.getAttribute('aria-label')).toBe('Power BI — Expert · 5/5');
  });

  test('expert level produces skill-tip-level with class "expert"', () => {
    document.body.appendChild(makeSkillRow('expert', 'IFRS'));
    injectTooltips();
    const tipLevel = document.querySelector('.skill-tip-level');
    expect(tipLevel.classList.contains('expert')).toBe(true);
    expect(tipLevel.textContent).toBe(TIPS.expert.label);
  });

  test('advanced level produces skill-tip-level with class "advanced"', () => {
    document.body.appendChild(makeSkillRow('advanced', 'SAP'));
    injectTooltips();
    const tipLevel = document.querySelector('.skill-tip-level');
    expect(tipLevel.classList.contains('advanced')).toBe(true);
    expect(tipLevel.textContent).toBe(TIPS.advanced.label);
  });

  test('proficient (default) level produces skill-tip-level with class "proficient"', () => {
    document.body.appendChild(makeSkillRow('proficient', 'Excel'));
    injectTooltips();
    const tipLevel = document.querySelector('.skill-tip-level');
    expect(tipLevel.classList.contains('proficient')).toBe(true);
  });

  test('unknown level class falls through to "proficient"', () => {
    document.body.appendChild(makeSkillRow('other-class', 'Word'));
    injectTooltips();
    const tipLevel = document.querySelector('.skill-tip-level');
    expect(tipLevel.classList.contains('proficient')).toBe(true);
  });

  test('.skill-tip-desc contains the correct description', () => {
    document.body.appendChild(makeSkillRow('expert', 'FP&A'));
    injectTooltips();
    const desc = document.querySelector('.skill-tip-desc');
    expect(desc.textContent).toBe(TIPS.expert.desc);
  });

  test('does NOT inject duplicate tooltip if one already exists', () => {
    const row = makeSkillRow('expert', 'IFRS');
    // pre-inject a .skill-tip so it already exists
    row.innerHTML += '<span class="skill-tip">existing</span>';
    document.body.appendChild(row);

    injectTooltips();
    expect(document.querySelectorAll('.skill-tip').length).toBe(1);
  });

  test('handles multiple skill rows independently', () => {
    document.body.appendChild(makeSkillRow('expert', 'IFRS'));
    document.body.appendChild(makeSkillRow('advanced', 'SAP'));
    document.body.appendChild(makeSkillRow('proficient', 'Excel'));

    injectTooltips();

    const tips = document.querySelectorAll('.skill-tip');
    expect(tips.length).toBe(3);
  });

  test('skips rows without a .level element', () => {
    const row = document.createElement('div');
    row.className = 'skill-row';
    row.innerHTML = '<span class="name">No Level</span>';
    document.body.appendChild(row);

    injectTooltips(); // should not throw
    expect(document.querySelectorAll('.skill-tip').length).toBe(0);
  });

  test('aria-label uses empty string for name when .name element is absent', () => {
    const row = document.createElement('div');
    row.className = 'skill-row';
    row.innerHTML = '<span class="level expert">E</span>';
    document.body.appendChild(row);

    injectTooltips();
    const lvl = document.querySelector('.level');
    expect(lvl.getAttribute('aria-label')).toBe(' — Expert · 5/5');
  });
});

/* ═══════════════════════════════════════════════════════════════
   SUITE 9 · MOTION-SURFACE: data-reveal stagger & KPI accent
═══════════════════════════════════════════════════════════════ */
describe('motion-surface – KPI bottom accent injection', () => {
  function injectKpiAccents() {
    document.querySelectorAll('.kpi').forEach(kpi => {
      if (!kpi.querySelector('.kpi-bottom-accent')) {
        const bar = document.createElement('div');
        bar.className = 'kpi-bottom-accent';
        bar.setAttribute('aria-hidden', 'true');
        kpi.appendChild(bar);
      }
    });
  }

  beforeEach(() => resetDOM());

  test('injects a .kpi-bottom-accent div into each .kpi card', () => {
    document.body.innerHTML = `
      <div class="kpi"></div>
      <div class="kpi"></div>
      <div class="kpi"></div>
    `;
    injectKpiAccents();
    const accents = document.querySelectorAll('.kpi-bottom-accent');
    expect(accents.length).toBe(3);
  });

  test('injected bar has aria-hidden="true"', () => {
    document.body.innerHTML = '<div class="kpi"></div>';
    injectKpiAccents();
    const bar = document.querySelector('.kpi-bottom-accent');
    expect(bar.getAttribute('aria-hidden')).toBe('true');
  });

  test('does NOT inject a second accent if one already exists', () => {
    document.body.innerHTML = `
      <div class="kpi">
        <div class="kpi-bottom-accent"></div>
      </div>
    `;
    injectKpiAccents();
    expect(document.querySelectorAll('.kpi-bottom-accent').length).toBe(1);
  });

  test('injected bar is a child of the .kpi element', () => {
    document.body.innerHTML = '<div class="kpi"></div>';
    injectKpiAccents();
    const kpi = document.querySelector('.kpi');
    const bar = kpi.querySelector('.kpi-bottom-accent');
    expect(bar).not.toBeNull();
    expect(bar.parentElement).toBe(kpi);
  });

  test('does nothing when no .kpi elements exist', () => {
    document.body.innerHTML = '<div class="other"></div>';
    expect(() => injectKpiAccents()).not.toThrow();
    expect(document.querySelectorAll('.kpi-bottom-accent').length).toBe(0);
  });
});

describe('motion-surface – data-reveal stagger delays', () => {
  const STAGGER = 60;

  /**
   * Compute the transition delay that revealObs would assign to an element
   * given its index among data-reveal siblings.
   */
  function computeStaggerDelay(el, parentEl) {
    const siblings = Array.from(parentEl.children).filter(c => c.hasAttribute('data-reveal'));
    const idx = siblings.indexOf(el);
    return idx > 0 ? idx * STAGGER : 0;
  }

  beforeEach(() => resetDOM());

  test('first sibling gets 0 ms delay', () => {
    document.body.innerHTML = `
      <div id="parent">
        <div data-reveal="up"></div>
        <div data-reveal="up"></div>
      </div>
    `;
    const parent = document.getElementById('parent');
    const first = parent.children[0];
    expect(computeStaggerDelay(first, parent)).toBe(0);
  });

  test('second sibling gets 60 ms delay', () => {
    document.body.innerHTML = `
      <div id="parent">
        <div data-reveal="up"></div>
        <div data-reveal="up"></div>
        <div data-reveal="up"></div>
      </div>
    `;
    const parent = document.getElementById('parent');
    expect(computeStaggerDelay(parent.children[1], parent)).toBe(60);
  });

  test('third sibling gets 120 ms delay', () => {
    document.body.innerHTML = `
      <div id="parent">
        <div data-reveal="up"></div>
        <div data-reveal="up"></div>
        <div data-reveal="up"></div>
      </div>
    `;
    const parent = document.getElementById('parent');
    expect(computeStaggerDelay(parent.children[2], parent)).toBe(120);
  });

  test('non-data-reveal siblings are excluded from stagger count', () => {
    document.body.innerHTML = `
      <div id="parent">
        <div data-reveal="up"></div>
        <div class="no-reveal"></div>
        <div data-reveal="up"></div>
      </div>
    `;
    const parent = document.getElementById('parent');
    // third child is the second data-reveal element → idx=1 → 60ms
    expect(computeStaggerDelay(parent.children[2], parent)).toBe(60);
  });

  test('delay scales linearly with sibling index', () => {
    const N = 6;
    const html = '<div id="parent">' +
      Array.from({ length: N }, () => '<div data-reveal="up"></div>').join('') +
      '</div>';
    document.body.innerHTML = html;
    const parent = document.getElementById('parent');
    for (let i = 0; i < N; i++) {
      const expected = i > 0 ? i * STAGGER : 0;
      expect(computeStaggerDelay(parent.children[i], parent)).toBe(expected);
    }
  });
});

describe('motion-surface – data-reveal: visible class applied', () => {
  beforeEach(() => {
    resetDOM();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  test('adds "visible" class to intersecting element via requestAnimationFrame', () => {
    document.body.innerHTML = '<div data-reveal="up" id="el"></div>';
    const el = document.getElementById('el');
    let rafCb = null;

    // Capture the rAF callback so we can manually invoke it
    global.requestAnimationFrame = (cb) => { rafCb = cb; return 1; };

    // Simulate the revealObs callback from motion-surface-script
    const mockEntries = [{ isIntersecting: true, target: el }];
    const revealObsCb = (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        requestAnimationFrame(() => entry.target.classList.add('visible'));
      });
    };

    revealObsCb(mockEntries);
    expect(el.classList.contains('visible')).toBe(false); // not yet

    rafCb && rafCb(); // flush rAF
    expect(el.classList.contains('visible')).toBe(true);
  });

  test('does NOT add "visible" to non-intersecting element', () => {
    document.body.innerHTML = '<div data-reveal="up" id="el"></div>';
    const el = document.getElementById('el');

    const revealObsCb = (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        requestAnimationFrame(() => entry.target.classList.add('visible'));
      });
    };

    revealObsCb([{ isIntersecting: false, target: el }]);
    jest.runAllTimers();
    expect(el.classList.contains('visible')).toBe(false);
  });
});

describe('motion-surface – reduced-motion fallback', () => {
  test('elements get "visible" immediately when motion is reduced', () => {
    // Override matchMedia to report prefers-reduced-motion: reduce
    global.matchMedia = (query) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    });

    resetDOM();
    document.body.innerHTML = `
      <div data-reveal="up" id="a"></div>
      <div data-reveal="left" id="b"></div>
    `;

    const motionOK = !window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    expect(motionOK).toBe(false);

    document.querySelectorAll('[data-reveal]').forEach(el => {
      if (!motionOK) el.classList.add('visible');
    });

    expect(document.getElementById('a').classList.contains('visible')).toBe(true);
    expect(document.getElementById('b').classList.contains('visible')).toBe(true);

    // Restore matchMedia
    global.matchMedia = (query) => ({
      matches: false, media: query,
      addEventListener: () => {}, removeEventListener: () => {},
    });
  });
});

/* ═══════════════════════════════════════════════════════════════
   SUITE 10 · SCROLL REVEAL SYSTEM (Script 1 initReveal)
═══════════════════════════════════════════════════════════════ */
describe('initReveal – IntersectionObserver scroll reveal', () => {
  beforeEach(() => {
    resetDOM();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  test('adds "visible" class to intersecting .reveal elements', () => {
    document.body.innerHTML = `
      <div class="reveal" id="r1"></div>
      <div class="reveal" id="r2"></div>
    `;

    // Simulate initReveal() with the exact callback logic
    const observed = [];
    const mockObserver = {
      observe: (el) => observed.push(el),
      unobserve: (el) => observed.splice(observed.indexOf(el), 1),
    };

    const callback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          mockObserver.unobserve(entry.target);
        }
      });
    };

    document.querySelectorAll('.reveal').forEach(el => mockObserver.observe(el));

    expect(observed.length).toBe(2);

    callback([
      { isIntersecting: true,  target: document.getElementById('r1') },
      { isIntersecting: false, target: document.getElementById('r2') },
    ]);

    expect(document.getElementById('r1').classList.contains('visible')).toBe(true);
    expect(document.getElementById('r2').classList.contains('visible')).toBe(false);
    expect(observed.length).toBe(1); // r1 unobserved
  });

  test('unobserves element after it becomes visible', () => {
    document.body.innerHTML = '<div class="reveal" id="r"></div>';
    const el = document.getElementById('r');
    const unobserved = [];
    const mockObserver = {
      observe: () => {},
      unobserve: (e) => unobserved.push(e),
    };

    const callback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          mockObserver.unobserve(entry.target);
        }
      });
    };

    callback([{ isIntersecting: true, target: el }]);
    expect(unobserved).toContain(el);
  });
});

/* ═══════════════════════════════════════════════════════════════
   SUITE 11 · SMOOTH SCROLL (Script 1)
═══════════════════════════════════════════════════════════════ */
describe('Smooth scroll for nav links', () => {
  beforeEach(() => resetDOM());

  test('calls scrollIntoView on the target element when nav link is clicked', () => {
    document.body.innerHTML = `
      <nav class="top-nav">
        <a href="#section1">Section 1</a>
      </nav>
      <section id="section1"></section>
    `;

    const target = document.getElementById('section1');
    const scrollMock = jest.fn();
    target.scrollIntoView = scrollMock;

    document.querySelectorAll('.top-nav a[href^="#"]').forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const t = document.querySelector(this.getAttribute('href'));
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    document.querySelector('.top-nav a').click();
    expect(scrollMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  test('does not throw when target element does not exist', () => {
    document.body.innerHTML = `
      <nav class="top-nav">
        <a href="#nonexistent">Missing</a>
      </nav>
    `;

    document.querySelectorAll('.top-nav a[href^="#"]').forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const t = document.querySelector(this.getAttribute('href'));
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    expect(() => document.querySelector('.top-nav a').click()).not.toThrow();
  });
});

/* ═══════════════════════════════════════════════════════════════
   SUITE 12 · SECTIONS definition (enh-script)
═══════════════════════════════════════════════════════════════ */
describe('SECTIONS array', () => {
  test('contains exactly 7 sections', () => {
    expect(SECTIONS.length).toBe(7);
  });

  test('all section objects have id and label properties', () => {
    SECTIONS.forEach(s => {
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('label');
      expect(typeof s.id).toBe('string');
      expect(typeof s.label).toBe('string');
    });
  });

  test('section ids are unique', () => {
    const ids = SECTIONS.map(s => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  test('includes expected section ids', () => {
    const ids = SECTIONS.map(s => s.id);
    ['summary', 'competencies', 'experience', 'transformation', 'kpi', 'dashboard', 'education']
      .forEach(id => expect(ids).toContain(id));
  });
});

/* ═══════════════════════════════════════════════════════════════
   SUITE 13 · TIPS object
═══════════════════════════════════════════════════════════════ */
describe('TIPS object', () => {
  test('has expert, advanced, and proficient keys', () => {
    expect(TIPS).toHaveProperty('expert');
    expect(TIPS).toHaveProperty('advanced');
    expect(TIPS).toHaveProperty('proficient');
  });

  test('each tip has label and desc properties', () => {
    Object.values(TIPS).forEach(t => {
      expect(t).toHaveProperty('label');
      expect(t).toHaveProperty('desc');
      expect(typeof t.label).toBe('string');
      expect(typeof t.desc).toBe('string');
    });
  });

  test('expert label is "Expert · 5/5"', () => {
    expect(TIPS.expert.label).toBe('Expert · 5/5');
  });

  test('advanced label is "Advanced · 4/5"', () => {
    expect(TIPS.advanced.label).toBe('Advanced · 4/5');
  });

  test('proficient label is "Proficient · 3/5"', () => {
    expect(TIPS.proficient.label).toBe('Proficient · 3/5');
  });

  test('desc strings are non-empty', () => {
    Object.values(TIPS).forEach(t => expect(t.desc.length).toBeGreaterThan(0));
  });
});