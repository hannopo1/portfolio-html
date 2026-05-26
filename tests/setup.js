// jsdom setup: provide minimal globals that the portfolio scripts rely on.

// IntersectionObserver stub (jsdom does not implement it)
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observed = [];
  }
  observe(el) { this.observed.push(el); }
  unobserve(el) { this.observed = this.observed.filter(e => e !== el); }
  disconnect() { this.observed = []; }
  // Helper: manually trigger for test assertions
  trigger(entries) { this.callback(entries, this); }
};

// requestAnimationFrame stub (jsdom does not implement it)
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// matchMedia stub
global.matchMedia = (query) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
});

// Canvas stub (jsdom does not implement canvas)
HTMLCanvasElement.prototype.getContext = () => ({
  clearRect: () => {},
  beginPath: () => {},
  arc: () => {},
  fill: () => {},
  fillStyle: '',
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => {},
  strokeStyle: '',
  lineWidth: 0,
  createLinearGradient: () => ({
    addColorStop: () => {},
  }),
});
