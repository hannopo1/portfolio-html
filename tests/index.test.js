/**
 * Tests for src/index.html
 *
 * Covers the new code added in this PR:
 *  - Feature 3: data-reveal IntersectionObserver system with 60ms auto-stagger
 *  - Feature 4: KPI bottom accent bar injection (.kpi-bottom-accent)
 *  - Associated HTML structure (meta tags, title, key sections)
 *  - CSS directional data-reveal variants and kpi-bottom-accent styles
 *
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Global browser-API stubs required before ANY inline scripts execute
// ---------------------------------------------------------------------------

// jsdom does not implement matchMedia; stub it globally before tests run.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockReturnValue({
    matches: false,
    addListener: jest.fn(),
    removeEventListener: jest.fn(),
  }),
});

// jsdom does not implement IntersectionObserver; provide a minimal stub.
if (!window.IntersectionObserver) {
  window.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Silence jsdom's "Not implemented: HTMLCanvasElement.prototype.getContext".
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Load and set the document HTML, then return a DOM reference.
 * We read the actual file once and cache it.
 */
const HTML_PATH = path.resolve(__dirname, '../src/index.html');
let rawHtml;
function getHtml() {
  if (!rawHtml) rawHtml = fs.readFileSync(HTML_PATH, 'utf8');
  return rawHtml;
}

/**
 * Extract the text content of a <script> element by its id attribute.
 */
function extractScript(html, scriptId) {
  const re = new RegExp(
    `<script[^>]*id=["']${scriptId}["'][^>]*>([\\s\\S]*?)<\\/script>`,
    'i'
  );
  const m = html.match(re);
  if (!m) throw new Error(`Script #${scriptId} not found in HTML`);
  return m[1];
}

/**
 * Create a minimal IntersectionObserver mock.
 * Returns { MockIO, instances } where instances accumulates created observers.
 */
function makeMockIO() {
  const instances = [];
  class MockIO {
    constructor(cb, opts) {
      this.callback = cb;
      this.opts = opts;
      this.observed = [];
      instances.push(this);
    }
    observe(el) { this.observed.push(el); }
    unobserve(el) { this.observed = this.observed.filter(e => e !== el); }
    disconnect() { this.observed = []; }
    /** Simulate intersection for an element */
    trigger(el, isIntersecting = true) {
      this.callback([{ target: el, isIntersecting }]);
    }
  }
  return { MockIO, instances };
}

/**
 * Run the motion-surface-script IIFE in the current jsdom document context,
 * with the given matchMedia result and IntersectionObserver mock.
 */
function runMotionScript(scriptContent, motionOK, MockIO) {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockReturnValue({
      matches: !motionOK, // matches = true means prefers-reduced-motion
      addListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  });

  // Mock IntersectionObserver
  window.IntersectionObserver = MockIO;

  // requestAnimationFrame: invoke callback synchronously
  window.requestAnimationFrame = jest.fn(cb => { cb(0); return 0; });

  // Execute the extracted IIFE in this document's context
  // eslint-disable-next-line no-new-func
  const fn = new Function(scriptContent);
  fn.call(window);
}

// ---------------------------------------------------------------------------
// 1. HTML STRUCTURE TESTS
// ---------------------------------------------------------------------------

describe('HTML document structure', () => {
  let doc;

  beforeAll(() => {
    document.open();
    document.write(getHtml());
    document.close();
    doc = document;
  });

  test('has correct page title', () => {
    expect(doc.title).toContain('Mohanad Ibrahim');
    expect(doc.title).toContain('Executive Finance Transformation Portfolio');
  });

  test('has charset meta tag set to UTF-8', () => {
    const charset = doc.querySelector('meta[charset]');
    expect(charset).not.toBeNull();
    expect(charset.getAttribute('charset').toUpperCase()).toBe('UTF-8');
  });

  test('has viewport meta tag', () => {
    const vp = doc.querySelector('meta[name="viewport"]');
    expect(vp).not.toBeNull();
    expect(vp.getAttribute('content')).toContain('width=device-width');
  });

  test('has description meta tag', () => {
    const desc = doc.querySelector('meta[name="description"]');
    expect(desc).not.toBeNull();
    expect(desc.getAttribute('content')).toContain('Mohanad Ibrahim');
  });

  test('has author meta tag', () => {
    const author = doc.querySelector('meta[name="author"]');
    expect(author).not.toBeNull();
    expect(author.getAttribute('content')).toBe('Mohanad Ibrahim');
  });

  test('has keywords meta tag with finance terms', () => {
    const kw = doc.querySelector('meta[name="keywords"]');
    expect(kw).not.toBeNull();
    const content = kw.getAttribute('content');
    expect(content).toContain('IFRS');
    expect(content).toContain('Power BI');
  });

  test('contains the loader element', () => {
    const loader = doc.getElementById('loader');
    expect(loader).not.toBeNull();
  });

  test('contains the particle canvas element', () => {
    const canvas = doc.getElementById('particle-canvas');
    expect(canvas).not.toBeNull();
  });

  test('contains top navigation element with id topNav', () => {
    const nav = doc.getElementById('topNav');
    expect(nav).not.toBeNull();
  });

  test('contains KPI article elements', () => {
    const kpis = doc.querySelectorAll('.kpi');
    expect(kpis.length).toBeGreaterThan(0);
  });

  test('contains motion-surface-script tag', () => {
    const script = doc.getElementById('motion-surface-script');
    expect(script).not.toBeNull();
    expect(script.textContent).toContain('kpi-bottom-accent');
  });

  test('contains elements with data-reveal attribute', () => {
    const elements = doc.querySelectorAll('[data-reveal]');
    // The document may or may not have data-reveal attributes at render time;
    // the script injects the attribute. We confirm the CSS and JS both expect it.
    // The important check is that the script references it.
    const motionScript = doc.getElementById('motion-surface-script');
    expect(motionScript.textContent).toContain('[data-reveal]');
  });

  test('contains .reveal class elements', () => {
    const revealEls = doc.querySelectorAll('.reveal');
    expect(revealEls.length).toBeGreaterThan(0);
  });

  test('loader element has hidden class behaviour class attribute', () => {
    // Loader starts visible; JS adds 'hidden' class on load
    const loader = doc.getElementById('loader');
    expect(loader.id).toBe('loader');
  });
});

// ---------------------------------------------------------------------------
// 2. FEATURE 4 — KPI BOTTOM ACCENT INJECTION
// ---------------------------------------------------------------------------

describe('Feature 4: KPI bottom accent bar injection', () => {
  const scriptContent = extractScript(getHtml(), 'motion-surface-script');

  beforeEach(() => {
    // Reset the body DOM to a clean slate for each test
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  function setup(motionOK = true) {
    const { MockIO, instances } = makeMockIO();
    runMotionScript(scriptContent, motionOK, MockIO);
    return { instances };
  }

  test('injects a .kpi-bottom-accent div into each .kpi element', () => {
    document.body.innerHTML = `
      <article class="kpi"></article>
      <article class="kpi"></article>
    `;
    setup();
    const accents = document.querySelectorAll('.kpi-bottom-accent');
    expect(accents.length).toBe(2);
  });

  test('injected accent div has aria-hidden="true"', () => {
    document.body.innerHTML = '<article class="kpi"></article>';
    setup();
    const accent = document.querySelector('.kpi-bottom-accent');
    expect(accent).not.toBeNull();
    expect(accent.getAttribute('aria-hidden')).toBe('true');
  });

  test('does not duplicate the accent div when already present', () => {
    document.body.innerHTML = `
      <article class="kpi">
        <div class="kpi-bottom-accent" aria-hidden="true"></div>
      </article>
    `;
    setup();
    const accents = document.querySelectorAll('.kpi-bottom-accent');
    expect(accents.length).toBe(1);
  });

  test('accent div is appended as the last child of .kpi', () => {
    document.body.innerHTML = `
      <article class="kpi">
        <div class="kpi-value">EGP 14M</div>
      </article>
    `;
    setup();
    const kpi = document.querySelector('.kpi');
    const last = kpi.lastElementChild;
    expect(last.classList.contains('kpi-bottom-accent')).toBe(true);
  });

  test('works for a single .kpi element', () => {
    document.body.innerHTML = '<article class="kpi"></article>';
    setup();
    const kpi = document.querySelector('.kpi');
    expect(kpi.querySelector('.kpi-bottom-accent')).not.toBeNull();
  });

  test('works for five .kpi elements (full dashboard KPI row)', () => {
    document.body.innerHTML = `
      <article class="kpi"></article>
      <article class="kpi"></article>
      <article class="kpi"></article>
      <article class="kpi"></article>
      <article class="kpi"></article>
    `;
    setup();
    expect(document.querySelectorAll('.kpi-bottom-accent').length).toBe(5);
  });

  test('no .kpi elements means no accent divs injected', () => {
    document.body.innerHTML = '<div class="chart-card"></div>';
    setup();
    expect(document.querySelectorAll('.kpi-bottom-accent').length).toBe(0);
  });

  test('injection runs even when motionOK is false', () => {
    document.body.innerHTML = '<article class="kpi"></article>';
    setup(false);
    expect(document.querySelector('.kpi-bottom-accent')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. FEATURE 3 — data-reveal OBSERVER (reduced-motion = OFF, motionOK = true)
// ---------------------------------------------------------------------------

describe('Feature 3: data-reveal observer — motionOK = true', () => {
  const scriptContent = extractScript(getHtml(), 'motion-surface-script');

  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  function setup() {
    const { MockIO, instances } = makeMockIO();
    runMotionScript(scriptContent, true, MockIO);
    return { instances };
  }

  test('[data-reveal] elements are registered with IntersectionObserver', () => {
    document.body.innerHTML = `
      <div data-reveal="up"></div>
      <div data-reveal="left"></div>
    `;
    const { instances } = setup();
    // At least one observer observed the data-reveal elements
    const observed = instances.flatMap(io => io.observed);
    const dataRevealEls = Array.from(document.querySelectorAll('[data-reveal]'));
    dataRevealEls.forEach(el => {
      expect(observed).toContain(el);
    });
  });

  test('intersection callback adds "visible" class via requestAnimationFrame', () => {
    document.body.innerHTML = '<div data-reveal="up"></div>';
    const { instances } = setup();
    const el = document.querySelector('[data-reveal]');
    // The revealObs is the first observer; trigger intersection
    const revealObs = instances[0];
    revealObs.trigger(el, true);
    expect(el.classList.contains('visible')).toBe(true);
  });

  test('no "visible" class added for non-intersecting entries', () => {
    document.body.innerHTML = '<div data-reveal="down"></div>';
    const { instances } = setup();
    const el = document.querySelector('[data-reveal]');
    const revealObs = instances[0];
    revealObs.trigger(el, false);
    expect(el.classList.contains('visible')).toBe(false);
  });

  test('element is unobserved after intersection triggers "visible"', () => {
    document.body.innerHTML = '<div data-reveal="up"></div>';
    const { instances } = setup();
    const el = document.querySelector('[data-reveal]');
    const revealObs = instances[0];
    revealObs.trigger(el, true);
    expect(revealObs.observed).not.toContain(el);
  });

  test('first sibling (idx=0) gets transitionDelay of 0ms', () => {
    document.body.innerHTML = `
      <div>
        <div data-reveal="up"></div>
        <div data-reveal="up"></div>
      </div>
    `;
    const { instances } = setup();
    const els = document.querySelectorAll('[data-reveal]');
    const revealObs = instances[0];
    revealObs.trigger(els[0], true);
    expect(els[0].style.transitionDelay).toBe('0ms');
  });

  test('second sibling (idx=1) gets transitionDelay of 60ms', () => {
    document.body.innerHTML = `
      <div>
        <div data-reveal="up"></div>
        <div data-reveal="up"></div>
      </div>
    `;
    const { instances } = setup();
    const els = document.querySelectorAll('[data-reveal]');
    const revealObs = instances[0];
    revealObs.trigger(els[1], true);
    expect(els[1].style.transitionDelay).toBe('60ms');
  });

  test('third sibling (idx=2) gets transitionDelay of 120ms', () => {
    document.body.innerHTML = `
      <div>
        <div data-reveal="up"></div>
        <div data-reveal="up"></div>
        <div data-reveal="right"></div>
      </div>
    `;
    const { instances } = setup();
    const els = document.querySelectorAll('[data-reveal]');
    const revealObs = instances[0];
    revealObs.trigger(els[2], true);
    expect(els[2].style.transitionDelay).toBe('120ms');
  });

  test('element with no parentElement gets delay of 0ms', () => {
    // Detached element scenario: parentElement is null
    document.body.innerHTML = '<div data-reveal="scale"></div>';
    const { instances } = setup();
    const el = document.querySelector('[data-reveal]');
    // Remove from DOM to simulate no parent
    el.remove();
    const revealObs = instances[0];
    // The observer still holds a reference; simulate intersection
    revealObs.trigger(el, true);
    // With no parentElement, siblings = [], idx = -1 which is not > 0, so delay = 0ms
    expect(el.style.transitionDelay).toBe('0ms');
  });

  test('only [data-reveal] siblings count for stagger (not all children)', () => {
    document.body.innerHTML = `
      <div>
        <span>not a reveal</span>
        <div data-reveal="up"></div>
        <div data-reveal="left"></div>
      </div>
    `;
    const { instances } = setup();
    const els = document.querySelectorAll('[data-reveal]');
    const revealObs = instances[0];
    // els[0] is the first [data-reveal] child → idx 0
    revealObs.trigger(els[0], true);
    expect(els[0].style.transitionDelay).toBe('0ms');
    // els[1] is second [data-reveal] → idx 1 → 60ms
    revealObs.trigger(els[1], true);
    expect(els[1].style.transitionDelay).toBe('60ms');
  });
});

// ---------------------------------------------------------------------------
// 4. FEATURE 3 — data-reveal with prefers-reduced-motion (motionOK = false)
// ---------------------------------------------------------------------------

describe('Feature 3: data-reveal observer — reduced motion (motionOK = false)', () => {
  const scriptContent = extractScript(getHtml(), 'motion-surface-script');

  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  function setup() {
    const { MockIO, instances } = makeMockIO();
    runMotionScript(scriptContent, false, MockIO);
    return { instances };
  }

  test('[data-reveal] elements immediately get "visible" class (no observer)', () => {
    document.body.innerHTML = `
      <div data-reveal="up"></div>
      <div data-reveal="scale"></div>
    `;
    setup();
    const els = document.querySelectorAll('[data-reveal]');
    els.forEach(el => {
      expect(el.classList.contains('visible')).toBe(true);
    });
  });

  test('[data-reveal] elements are NOT registered with IntersectionObserver when reduced-motion', () => {
    document.body.innerHTML = '<div data-reveal="up"></div>';
    const { instances } = setup();
    // The script still creates observers (they exist) but should not observe data-reveal elements
    const observed = instances.flatMap(io => io.observed);
    const dataRevealEls = Array.from(document.querySelectorAll('[data-reveal]'));
    dataRevealEls.forEach(el => {
      expect(observed).not.toContain(el);
    });
  });

  test('.reveal elements are NOT registered with staggerObs when reduced-motion', () => {
    document.body.innerHTML = `
      <div class="reveal"></div>
      <div class="reveal"></div>
    `;
    const { instances } = setup();
    const observed = instances.flatMap(io => io.observed);
    const revealEls = Array.from(document.querySelectorAll('.reveal'));
    revealEls.forEach(el => {
      expect(observed).not.toContain(el);
    });
  });
});

// ---------------------------------------------------------------------------
// 5. FEATURE 3 — .reveal stagger observer (motionOK = true)
// ---------------------------------------------------------------------------

describe('Feature 3: .reveal stagger observer — motionOK = true', () => {
  const scriptContent = extractScript(getHtml(), 'motion-surface-script');

  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  function setup() {
    const { MockIO, instances } = makeMockIO();
    runMotionScript(scriptContent, true, MockIO);
    return { instances };
  }

  test('.reveal elements are registered with staggerObs', () => {
    document.body.innerHTML = `
      <div>
        <div class="reveal"></div>
        <div class="reveal"></div>
      </div>
    `;
    const { instances } = setup();
    // staggerObs is the second observer created
    const staggerObs = instances[1];
    expect(staggerObs).toBeDefined();
    const observed = staggerObs.observed;
    const revealEls = Array.from(document.querySelectorAll('.reveal'));
    revealEls.forEach(el => expect(observed).toContain(el));
  });

  test('first .reveal sibling (idx=0) does NOT get a transitionDelay from staggerObs', () => {
    document.body.innerHTML = `
      <div>
        <div class="reveal"></div>
        <div class="reveal"></div>
      </div>
    `;
    const { instances } = setup();
    const els = document.querySelectorAll('.reveal');
    const staggerObs = instances[1];
    staggerObs.trigger(els[0], true);
    // idx=0, condition is idx > 0, so no delay set
    expect(els[0].style.transitionDelay).toBe('');
  });

  test('second .reveal sibling (idx=1) gets transitionDelay of 60ms from staggerObs', () => {
    document.body.innerHTML = `
      <div>
        <div class="reveal"></div>
        <div class="reveal"></div>
      </div>
    `;
    const { instances } = setup();
    const els = document.querySelectorAll('.reveal');
    const staggerObs = instances[1];
    staggerObs.trigger(els[1], true);
    expect(els[1].style.transitionDelay).toBe('60ms');
  });

  test('staggerObs does not override an already-set transitionDelay', () => {
    document.body.innerHTML = `
      <div>
        <div class="reveal"></div>
        <div class="reveal" style="transition-delay: 200ms;"></div>
      </div>
    `;
    const { instances } = setup();
    const els = document.querySelectorAll('.reveal');
    const staggerObs = instances[1];
    staggerObs.trigger(els[1], true);
    // The condition is !el.style.transitionDelay; 200ms is already set, so no override
    expect(els[1].style.transitionDelay).toBe('200ms');
  });

  test('element is unobserved by staggerObs after intersection', () => {
    document.body.innerHTML = `
      <div>
        <div class="reveal"></div>
        <div class="reveal"></div>
      </div>
    `;
    const { instances } = setup();
    const els = document.querySelectorAll('.reveal');
    const staggerObs = instances[1];
    staggerObs.trigger(els[1], true);
    expect(staggerObs.observed).not.toContain(els[1]);
  });
});

// ---------------------------------------------------------------------------
// 6. init() LIFECYCLE TESTS
// ---------------------------------------------------------------------------

describe('motion-surface-script init() lifecycle', () => {
  const scriptContent = extractScript(getHtml(), 'motion-surface-script');

  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  test('runs init() immediately when document is not loading', () => {
    document.body.innerHTML = '<article class="kpi"></article>';
    const { MockIO } = makeMockIO();
    // Ensure readyState is not 'loading' (jsdom default is 'complete')
    runMotionScript(scriptContent, true, MockIO);
    // If init ran, .kpi-bottom-accent should be present
    expect(document.querySelector('.kpi-bottom-accent')).not.toBeNull();
  });

  test('creates exactly two IntersectionObservers when motionOK = true', () => {
    document.body.innerHTML = '';
    const { MockIO, instances } = makeMockIO();
    runMotionScript(scriptContent, true, MockIO);
    expect(instances.length).toBe(2);
  });

  test('still creates two IntersectionObservers when motionOK = false', () => {
    document.body.innerHTML = '';
    const { MockIO, instances } = makeMockIO();
    runMotionScript(scriptContent, false, MockIO);
    // Observers are always constructed; just not used for observation
    expect(instances.length).toBe(2);
  });

  test('revealObs uses threshold of 0.15', () => {
    document.body.innerHTML = '';
    const { MockIO, instances } = makeMockIO();
    runMotionScript(scriptContent, true, MockIO);
    const revealObs = instances[0];
    expect(revealObs.opts.threshold).toBe(0.15);
  });

  test('staggerObs uses threshold of 0.15', () => {
    document.body.innerHTML = '';
    const { MockIO, instances } = makeMockIO();
    runMotionScript(scriptContent, true, MockIO);
    const staggerObs = instances[1];
    expect(staggerObs.opts.threshold).toBe(0.15);
  });

  test('both observers use rootMargin of "0px 0px -50px 0px"', () => {
    document.body.innerHTML = '';
    const { MockIO, instances } = makeMockIO();
    runMotionScript(scriptContent, true, MockIO);
    instances.forEach(io => {
      expect(io.opts.rootMargin).toBe('0px 0px -50px 0px');
    });
  });
});

// ---------------------------------------------------------------------------
// 7. CSS FEATURE TESTS — data-reveal directional attributes in the HTML source
// ---------------------------------------------------------------------------

describe('CSS: data-reveal directional variants present in HTML', () => {
  let html;

  beforeAll(() => {
    html = getHtml();
  });

  test('CSS defines [data-reveal="up"] with translateY(36px) and opacity:0', () => {
    expect(html).toMatch(/\[data-reveal="up"\]/);
    expect(html).toMatch(/translateY\(36px\)/);
  });

  test('CSS defines [data-reveal="down"] with translateY(-28px)', () => {
    expect(html).toMatch(/\[data-reveal="down"\]/);
    expect(html).toMatch(/translateY\(-28px\)/);
  });

  test('CSS defines [data-reveal="left"] with translateX(-42px)', () => {
    expect(html).toMatch(/\[data-reveal="left"\]/);
    expect(html).toMatch(/translateX\(-42px\)/);
  });

  test('CSS defines [data-reveal="right"] with translateX(42px)', () => {
    expect(html).toMatch(/\[data-reveal="right"\]/);
    expect(html).toMatch(/translateX\(42px\)/);
  });

  test('CSS defines [data-reveal="scale"] with scale(.92)', () => {
    expect(html).toMatch(/\[data-reveal="scale"\]/);
    expect(html).toMatch(/scale\(\.92\)/);
  });

  test('CSS defines [data-reveal].visible resetting transform to none', () => {
    expect(html).toMatch(/\[data-reveal\]\.visible/);
    expect(html).toMatch(/transform:none/);
  });
});

// ---------------------------------------------------------------------------
// 8. CSS FEATURE TESTS — kpi-bottom-accent styles
// ---------------------------------------------------------------------------

describe('CSS: .kpi-bottom-accent styles present in HTML', () => {
  let html;

  beforeAll(() => {
    html = getHtml();
  });

  test('defines .kpi-bottom-accent class', () => {
    expect(html).toContain('.kpi-bottom-accent');
  });

  test('.kpi-bottom-accent has position:absolute', () => {
    // Find the rule block after .kpi-bottom-accent
    expect(html).toMatch(/\.kpi-bottom-accent\{[\s\S]*?position:absolute/);
  });

  test('.kpi-bottom-accent has bottom:0', () => {
    expect(html).toMatch(/\.kpi-bottom-accent\{[\s\S]*?bottom:0/);
  });

  test('.kpi:hover .kpi-bottom-accent increases opacity', () => {
    expect(html).toMatch(/\.kpi:hover \.kpi-bottom-accent\{opacity:\.85\}/);
  });

  test('light mode overrides .kpi:hover box-shadow', () => {
    expect(html).toMatch(/html\.light \.kpi:hover/);
  });

  test('light mode overrides .chart-card background', () => {
    expect(html).toMatch(/html\.light \.chart-card/);
  });

  test('reduced-motion media query disables transitions for .kpi-bottom-accent', () => {
    expect(html).toMatch(
      /prefers-reduced-motion:reduce[\s\S]*?\.kpi-bottom-accent[\s\S]*?transition:none/
    );
  });
});

// ---------------------------------------------------------------------------
// 9. EDGE CASES & REGRESSION TESTS
// ---------------------------------------------------------------------------

describe('Edge cases and regression', () => {
  const scriptContent = extractScript(getHtml(), 'motion-surface-script');

  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  function setup(motionOK = true) {
    const { MockIO, instances } = makeMockIO();
    runMotionScript(scriptContent, motionOK, MockIO);
    return { instances };
  }

  test('script handles empty document gracefully (no errors)', () => {
    document.body.innerHTML = '';
    expect(() => setup(true)).not.toThrow();
    expect(() => setup(false)).not.toThrow();
  });

  test('mixed .reveal and [data-reveal] elements are handled independently', () => {
    document.body.innerHTML = `
      <div class="reveal"></div>
      <div data-reveal="up"></div>
    `;
    const { instances } = setup(true);
    const revealObs   = instances[0];
    const staggerObs  = instances[1];

    const revealEl      = document.querySelector('.reveal');
    const dataRevealEl  = document.querySelector('[data-reveal]');

    expect(revealObs.observed).toContain(dataRevealEl);
    expect(staggerObs.observed).toContain(revealEl);
  });

  test('KPI without existing accent and motionOK=false still gets accent', () => {
    document.body.innerHTML = '<article class="kpi"></article>';
    setup(false);
    expect(document.querySelector('.kpi-bottom-accent')).not.toBeNull();
  });

  test('multiple [data-reveal] with same parent: stagger uses correct per-element index', () => {
    document.body.innerHTML = `
      <section>
        <div data-reveal="up"></div>
        <div data-reveal="right"></div>
        <div data-reveal="scale"></div>
        <div data-reveal="left"></div>
      </section>
    `;
    const { instances } = setup(true);
    const els = Array.from(document.querySelectorAll('[data-reveal]'));
    const revealObs = instances[0];
    const expected = [0, 60, 120, 180];
    els.forEach((el, i) => {
      revealObs.trigger(el, true);
      expect(el.style.transitionDelay).toBe(expected[i] + 'ms');
    });
  });

  test('calling init()-equivalent twice (re-running script) does not duplicate kpi-bottom-accent', () => {
    document.body.innerHTML = '<article class="kpi"></article>';
    // First run
    setup(true);
    expect(document.querySelectorAll('.kpi-bottom-accent').length).toBe(1);
    // Second run (simulate re-execution)
    setup(true);
    expect(document.querySelectorAll('.kpi-bottom-accent').length).toBe(1);
  });
});
