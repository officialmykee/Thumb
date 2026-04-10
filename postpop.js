/**
 * postpop.js
 * Drop this <script> after your existing babel script.
 * It patches the PostCard so tapping/clicking the image carousel
 * opens a full-screen pop-up.
 *
 * No external dependencies – works with the React + Babel setup
 * already present in index.html.
 */

(function () {
  /* ─────────────────────────────────────────────
     Wait until React + Babel have finished booting
     ───────────────────────────────────────────── */
  function waitForReact(cb) {
    if (window.React && window.ReactDOM) { cb(); }
    else { setTimeout(() => waitForReact(cb), 50); }
  }

  waitForReact(() => {

    /* ── Shared state bus (plain object + subscribers) ── */
    const bus = {
      liked:     false,
      likeCount: 241000,
      comments:  [],          // { id, text }
      shares:    0,
      _subs: [],
      subscribe(fn) { this._subs.push(fn); },
      emit() { this._subs.forEach(fn => fn({ ...this })); },
      toggleLike() {
        this.liked = !this.liked;
        this.likeCount += this.liked ? 1 : -1;
        this.emit();
      },
      addComment(text) {
        this.comments = [...this.comments, { id: Date.now(), text }];
        this.emit();
      },
      addShare() {
        this.shares += 1;
        this.emit();
      },
    };

    /* ── Inject global styles once ── */
    if (!document.getElementById('postpop-styles')) {
      const style = document.createElement('style');
      style.id = 'postpop-styles';
      style.textContent = `
        /* overlay */
        #postpop-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: #000;
          display: flex; flex-direction: column;
          align-items: center; justify-content: flex-start;
          opacity: 0; pointer-events: none;
          transition: opacity 0.28s cubic-bezier(0.4,0,0.2,1);
          overscroll-behavior: contain;
        }
        #postpop-overlay.open {
          opacity: 1; pointer-events: all;
        }

        /* ── top header bar ── */
        #postpop-topbar {
          width: 100%; flex-shrink: 0;
          background: #000;
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 10px 6px 10px 6px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          z-index: 10001;
        }

        /* back arrow button */
        #postpop-close {
          background: none; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          padding: 6px 8px;
          flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
        }
        #postpop-img {
          width: 100%;
          object-fit: cover;
          transform: scale(1);
          transition: opacity 0.2s;
          border-radius: 0;
          display: block;
        }
        #postpop-overlay.open #postpop-img {
          transform: scale(1);
        }

        /* scrollable image area */
        #postpop-imgwrap {
          width: 100%; flex: 1 1 auto;
          overflow-y: auto; overflow-x: hidden;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 0;
        }

        /* dot indicator */
        #postpop-dots {
          display: flex; gap: 6px;
          justify-content: center;
          padding: 10px 0 8px;
        }
        .postpop-dot {
          height: 6px; border-radius: 3px;
          background: rgba(255,255,255,0.4);
          transition: width 0.25s, background 0.25s;
          cursor: pointer;
        }
        .postpop-dot.active {
          background: #fff; width: 18px !important;
        }
      `;
      document.head.appendChild(style);
    }

    /* ── Build the overlay DOM (once) ── */
    let overlay = document.getElementById('postpop-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'postpop-overlay';
      overlay.innerHTML = `
        <!-- ── Top header: back arrow + dots ── -->
        <div id="postpop-topbar">

          <button id="postpop-close" aria-label="Go back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <line x1="22" y1="12" x2="2" y2="12"
                stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
              <path d="M9 5L2 12L9 19"
                stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <!-- ••• menu -->
          <button id="pp-dots-btn" aria-label="More options"
            style="background:none;border:none;cursor:pointer;padding:6px 2px 6px 8px;display:flex;align-items:center;flex-shrink:0;-webkit-tap-highlight-color:transparent;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
              <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
            </svg>
          </button>

        </div>

        <!-- ── Scrollable image area ── -->
        <div id="postpop-imgwrap">
          <img id="postpop-img" src="" alt="Post image" draggable="false" />
          <div id="postpop-dots"></div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    /* ── DOM refs ── */
    const popImg  = document.getElementById('postpop-img');
    const popDots = document.getElementById('postpop-dots');
    const closeBtn = document.getElementById('postpop-close');

    /* ── Image list (same as ImageCarousel in index.html) ── */
    const IMAGES = [
      'https://picsum.photos/seed/socialpost/800/920',
      'https://picsum.photos/seed/nature42/800/920',
    ];
    let currentSlide = 0;

    function buildDots(total, active) {
      popDots.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const d = document.createElement('div');
        d.className = 'postpop-dot' + (i === active ? ' active' : '');
        d.style.width = i === active ? '18px' : '6px';
        d.addEventListener('click', () => goSlide(i));
        popDots.appendChild(d);
      }
    }

    function goSlide(idx) {
      currentSlide = idx;
      popImg.style.transition = 'opacity 0.2s';
      popImg.style.opacity = '0';
      setTimeout(() => {
        popImg.src = IMAGES[idx];
        popImg.style.opacity = '1';
      }, 180);
      buildDots(IMAGES.length, idx);
    }

    /* swipe support on the pop-up image */
    let _sx = null;
    popImg.addEventListener('mousedown',  e => { _sx = e.clientX; });
    popImg.addEventListener('mouseup',    e => {
      if (_sx === null) return;
      const d = _sx - e.clientX;
      if (d > 40 && currentSlide < IMAGES.length - 1) goSlide(currentSlide + 1);
      if (d < -40 && currentSlide > 0)               goSlide(currentSlide - 1);
      _sx = null;
    });
    popImg.addEventListener('touchstart', e => { _sx = e.touches[0].clientX; }, { passive: true });
    popImg.addEventListener('touchend',   e => {
      if (_sx === null) return;
      const d = _sx - e.changedTouches[0].clientX;
      if (d > 40 && currentSlide < IMAGES.length - 1) goSlide(currentSlide + 1);
      if (d < -40 && currentSlide > 0)               goSlide(currentSlide - 1);
      _sx = null;
    });

    /* ── Open / close ── */
    function openPopup(slideIdx) {
      currentSlide = slideIdx || 0;
      popImg.src = IMAGES[currentSlide];
      buildDots(IMAGES.length, currentSlide);
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closePopup() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    closeBtn.addEventListener('click', closePopup);
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closePopup();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closePopup();
    });

    /* ── Hook into the existing ImageCarousel ── */
    function attachCarouselListener() {
      const candidates = document.querySelectorAll('[style*="grab"]');
      const carousel = Array.from(candidates).find(el =>
        el.style.aspectRatio === '1 / 1.15' || el.style.cursor === 'grab'
      );
      if (carousel && !carousel.dataset.postpopAttached) {
        carousel.dataset.postpopAttached = 'true';
        carousel.style.cursor = 'pointer';

        let downX = 0, downY = 0;
        carousel.addEventListener('mousedown',  e => { downX = e.clientX; downY = e.clientY; });
        carousel.addEventListener('mouseup',    e => {
          if (Math.abs(e.clientX - downX) < 6 && Math.abs(e.clientY - downY) < 6) {
            openPopup(0);
          }
        });
        carousel.addEventListener('touchstart', e => {
          downX = e.touches[0].clientX; downY = e.touches[0].clientY;
        }, { passive: true });
        carousel.addEventListener('touchend',   e => {
          const dx = Math.abs(e.changedTouches[0].clientX - downX);
          const dy = Math.abs(e.changedTouches[0].clientY - downY);
          if (dx < 8 && dy < 8) openPopup(0);
        });
        return true;
      }
      return false;
    }

    if (!attachCarouselListener()) {
      const observer = new MutationObserver(() => {
        if (attachCarouselListener()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    /* ── Sync pop-up like state back to React PostCard ── */
    function syncCardLikeButton() {
      const cardHearts = document.querySelectorAll(
        'svg[fill="#F33E58"], svg[stroke="#F33E58"]'
      );
      cardHearts.forEach(svg => {
        if (!overlay.contains(svg)) {
          const btn = svg.closest('button');
          if (btn && !btn.dataset.postpopSynced) {
            btn.dataset.postpopSynced = 'true';
            btn.addEventListener('click', () => {
              setTimeout(() => {
                const nowFilled = svg.getAttribute('fill') === '#F33E58';
                if (bus.liked !== nowFilled) {
                  bus.liked     = nowFilled;
                  bus.likeCount = parseInt(
                    btn.parentElement
                       .querySelector('span')
                       ?.textContent.replace('K','000') || bus.likeCount
                  );
                  bus.emit();
                }
              }, 50);
            });
          }
        }
      });
    }

    setTimeout(syncCardLikeButton, 3000);

    /* Expose bus for external use */
    window.postpopBus = bus;
    console.log('[postpop.js] loaded ✓ — tap the post image to open pop-up');
  });
})();

