/**
 * Before / After Slider
 * Supports: mouse drag, touch drag, keyboard (arrow keys), autoplay, vertical mode.
 */

class BeforeAfterSlider {
  /**
   * @param {HTMLElement} el  — the .ba-slider element
   */
  constructor(el) {
    this.el = el;
    this.orientation = el.dataset.orientation || 'horizontal';
    this.isVertical = this.orientation === 'vertical';

    this.before    = el.querySelector('.ba-slider__before');
    this.divider   = el.querySelector('.ba-slider__divider');
    this.handle    = el.querySelector('.ba-slider__handle');

    // position as a fraction 0–1
    this.position = parseFloat(el.dataset.startPosition ?? 0.5);
    this._clamp();
    this._render();

    // autoplay
    this.autoplaySpeed   = parseInt(el.dataset.autoplaySpeed ?? 0, 10);   // ms per frame
    this.autoplayDir     = 1;
    this._autoplayTimer  = null;

    this._bindEvents();
    if (this.autoplaySpeed > 0) this._startAutoplay();
  }

  /* ---- core render ---- */
  _render() {
    const pct = (this.position * 100).toFixed(3);

    if (this.isVertical) {
      const inv = (100 - this.position * 100).toFixed(3);
      this.before.style.clipPath    = `inset(0 0 ${inv}% 0)`;
      this.divider.style.top        = pct + '%';
      this.divider.style.left       = '';
      this.handle.style.top         = pct + '%';
      this.handle.style.left        = '50%';
    } else {
      const inv = (100 - this.position * 100).toFixed(3);
      this.before.style.clipPath    = `inset(0 ${inv}% 0 0)`;
      this.divider.style.left       = pct + '%';
      this.divider.style.top        = '';
      this.handle.style.left        = pct + '%';
      this.handle.style.top         = '50%';
    }

    // label edge-fade classes
    this.el.classList.toggle('ba-slider--near-start', this.position < 0.08);
    this.el.classList.toggle('ba-slider--near-end',   this.position > 0.92);
  }

  _clamp() {
    this.position = Math.min(1, Math.max(0, this.position));
  }

  /* ---- position from pointer event ---- */
  _posFromEvent(e) {
    const rect = this.el.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (this.isVertical) {
      return (clientY - rect.top) / rect.height;
    }
    return (clientX - rect.left) / rect.width;
  }

  /* ---- event binding ---- */
  _bindEvents() {
    // mouse
    this.el.addEventListener('mousedown',  e => this._onDragStart(e));
    window.addEventListener('mousemove',   e => this._onDragMove(e));
    window.addEventListener('mouseup',     ()  => this._onDragEnd());

    // touch
    this.el.addEventListener('touchstart', e => this._onDragStart(e), { passive: true });
    window.addEventListener('touchmove',   e => this._onDragMove(e), { passive: false });
    window.addEventListener('touchend',    ()  => this._onDragEnd());

    // keyboard on handle
    this.handle.setAttribute('tabindex', '0');
    this.handle.setAttribute('role', 'slider');
    this.handle.setAttribute('aria-valuemin', '0');
    this.handle.setAttribute('aria-valuemax', '100');
    this.handle.addEventListener('keydown', e => this._onKey(e));

    // pause autoplay on hover
    this.el.addEventListener('mouseenter', () => this._stopAutoplay());
    this.el.addEventListener('mouseleave', () => {
      if (this.autoplaySpeed > 0) this._startAutoplay();
    });
  }

  _onDragStart(e) {
    this._dragging = true;
    this.el.classList.add('ba-slider--dragging');
    this._stopAutoplay();
    this._updateFromEvent(e);
  }

  _onDragMove(e) {
    if (!this._dragging) return;
    if (e.cancelable) e.preventDefault();
    this._updateFromEvent(e);
  }

  _onDragEnd() {
    if (!this._dragging) return;
    this._dragging = false;
    this.el.classList.remove('ba-slider--dragging');
    if (this.autoplaySpeed > 0) this._startAutoplay();
  }

  _updateFromEvent(e) {
    this.position = this._posFromEvent(e);
    this._clamp();
    this._render();
    this._updateAria();
  }

  _onKey(e) {
    const STEP_NORMAL = 0.03;
    const STEP_LARGE  = 0.1;
    const fwd  = this.isVertical ? 'ArrowDown'  : 'ArrowRight';
    const back = this.isVertical ? 'ArrowUp'    : 'ArrowLeft';

    let delta = 0;
    if (e.key === fwd)         delta =  (e.shiftKey ? STEP_LARGE : STEP_NORMAL);
    else if (e.key === back)   delta = -(e.shiftKey ? STEP_LARGE : STEP_NORMAL);
    else if (e.key === 'Home') { this.position = 0; this._render(); this._updateAria(); return; }
    else if (e.key === 'End')  { this.position = 1; this._render(); this._updateAria(); return; }
    else return;

    e.preventDefault();
    this.position += delta;
    this._clamp();
    this._render();
    this._updateAria();
  }

  _updateAria() {
    this.handle.setAttribute('aria-valuenow', Math.round(this.position * 100));
  }

  /* ---- autoplay ---- */
  _startAutoplay() {
    if (this._autoplayTimer) return;
    const step = 0.002;
    this._autoplayTimer = setInterval(() => {
      this.position += step * this.autoplayDir;
      if (this.position >= 1) { this.position = 1; this.autoplayDir = -1; }
      if (this.position <= 0) { this.position = 0; this.autoplayDir =  1; }
      this._render();
    }, this.autoplaySpeed);
  }

  _stopAutoplay() {
    clearInterval(this.autoplayTimer);
    this._autoplayTimer = null;
  }

  destroy() {
    this._stopAutoplay();
  }
}

/* ---- auto-init all sliders on the page ---- */
function initBeforeAfterSliders(root = document) {
  root.querySelectorAll('.ba-slider:not([data-ba-init])').forEach(el => {
    el.dataset.baInit = '1';
    new BeforeAfterSlider(el);
  });
}

document.addEventListener('DOMContentLoaded', () => initBeforeAfterSliders());

// Shopify section re-renders (theme editor)
document.addEventListener('shopify:section:load', e => {
  initBeforeAfterSliders(e.target);
});
