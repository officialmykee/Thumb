/**
 * postpop.js
 * Drop this <script> after your existing babel script.
 * It patches the PostCard so tapping/clicking the image carousel
 * opens a full-screen pop-up that keeps the pill like / comment /
 * share bar in sync with the card's own state.
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
          background: rgba(0,0,0,0.88);
          display: flex; flex-direction: column;
          align-items: center; justify-content: flex-start;
          opacity: 0; pointer-events: none;
          transition: opacity 0.28s cubic-bezier(0.4,0,0.2,1);
          overscroll-behavior: contain;
        }
        #postpop-overlay.open {
          opacity: 1; pointer-events: all;
        }

        /* close button */
        #postpop-close {
          position: absolute; top: 14px; right: 16px;
          background: rgba(255,255,255,0.12);
          border: none; cursor: pointer;
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          z-index: 10001; transition: background 0.18s;
        }
        #postpop-close:hover { background: rgba(255,255,255,0.22); }

        /* scrollable image area */
        #postpop-imgwrap {
          width: 100%; flex: 1 1 auto;
          overflow-y: auto; overflow-x: hidden;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 56px 0 0 0;
        }
        #postpop-img {
          width: 100%; max-width: 560px;
          object-fit: contain;
          transform: scale(0.92);
          transition: transform 0.32s cubic-bezier(0.34,1.56,0.64,1);
          border-radius: 10px;
          display: block;
        }
        #postpop-overlay.open #postpop-img {
          transform: scale(1);
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

        /* bottom action bar */
        #postpop-bar {
          width: 100%; max-width: 560px;
          background: #1c1c1e;
          border-top: 1px solid rgba(255,255,255,0.08);
          padding: 8px 6px 10px;
          flex-shrink: 0;
          transform: translateY(100%);
          transition: transform 0.32s cubic-bezier(0.4,0,0.2,1) 0.06s;
        }
        #postpop-overlay.open #postpop-bar {
          transform: translateY(0);
        }

        /* pill row */
        .pp-pill-row {
          display: flex; align-items: center; gap: 4px;
        }

        /* pill button */
        .pp-pill {
          flex: 1; background: none; border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          gap: 6px; padding: 7px 10px; border-radius: 20px;
          color: #aeaeb2;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-size: 15px; font-weight: 600;
          transition: background 0.15s, color 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .pp-pill:hover { background: rgba(255,255,255,0.07); }
        .pp-pill.liked { color: #F33E58; }

        @keyframes pp-heartPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.45); }
          70%  { transform: scale(0.87); }
          100% { transform: scale(1); }
        }
        .pp-heart-anim { animation: pp-heartPop 0.35s ease; }

        /* comment input pill */
        .pp-comment-wrap {
          flex: 1.6;
          display: flex; align-items: center;
          background: rgba(255,255,255,0.08);
          border-radius: 22px; padding: 7px 12px; gap: 7px;
          cursor: text;
        }
        .pp-comment-input {
          background: none; border: none; outline: none;
          flex: 1; font-size: 14px;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #fff;
        }
        .pp-comment-input::placeholder { color: #636366; }

        /* comment list */
        #postpop-comments {
          max-height: 110px; overflow-y: auto;
          padding: 4px 10px 0 10px;
          scrollbar-width: none;
        }
        #postpop-comments::-webkit-scrollbar { display: none; }
        .pp-comment-item {
          font-size: 13px; color: #aeaeb2;
          padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        .pp-comment-item:last-child { border-bottom: none; }
        .pp-comment-item span { color: #fff; font-weight: 600; margin-right: 5px; }

        /* like count / share label */
        #postpop-meta {
          font-size: 13px; color: rgba(255,255,255,0.45);
          padding: 5px 10px 2px;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
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
        <button id="postpop-close" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
            <line x1="6" y1="6" x2="18" y2="18" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
          </svg>
        </button>

        <div id="postpop-imgwrap">
          <img id="postpop-img" src="" alt="Post image" draggable="false" />
          <div id="postpop-dots"></div>
        </div>

        <div id="postpop-bar">
          <div id="postpop-meta"></div>
          <div id="postpop-comments"></div>
          <div class="pp-pill-row">

            <!-- Like pill -->
            <button class="pp-pill" id="pp-like-btn">
              <svg id="pp-heart-svg" width="20" height="20" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"
                style="display:block;flex-shrink:0">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span id="pp-like-label">241K</span>
            </button>

            <!-- Comment input pill -->
            <div class="pp-comment-wrap" id="pp-comment-wrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="#636366" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                style="flex-shrink:0">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              <input class="pp-comment-input" id="pp-comment-input"
                placeholder="Say something…" maxlength="200" />
            </div>

            <!-- Share pill -->
            <button class="pp-pill" id="pp-share-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              <span id="pp-share-label">Share</span>
            </button>

          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    /* ── DOM refs ── */
    const popImg       = document.getElementById('postpop-img');
    const popDots      = document.getElementById('postpop-dots');
    const popMeta      = document.getElementById('postpop-meta');
    const popComments  = document.getElementById('postpop-comments');
    const likBtn       = document.getElementById('pp-like-btn');
    const heartSvg     = document.getElementById('pp-heart-svg');
    const likeLabel    = document.getElementById('pp-like-label');
    const shareBtn     = document.getElementById('pp-share-btn');
    const shareLabel   = document.getElementById('pp-share-label');
    const commentInput = document.getElementById('pp-comment-input');
    const commentWrap  = document.getElementById('pp-comment-wrap');
    const closeBtn     = document.getElementById('postpop-close');

    /* ── Image list (same as ImageCarousel in index.html) ── */
    const IMAGES = [
      'https://picsum.photos/seed/socialpost/800/920',
      'https://picsum.photos/seed/nature42/800/920',
    ];
    let currentSlide = 0;

    /* ── Helpers ── */
    function fmtCount(n) {
      return n >= 1000
        ? (n % 1000 === 0 ? n / 1000 : (n / 1000).toFixed(1)) + 'K'
        : String(n);
    }

    function renderBar(state) {
      /* like button */
      likBtn.classList.toggle('liked', state.liked);
      heartSvg.setAttribute('fill',   state.liked ? '#F33E58' : 'none');
      heartSvg.setAttribute('stroke', state.liked ? '#F33E58' : 'currentColor');
      likeLabel.textContent = fmtCount(state.likeCount);

      /* share label */
      shareLabel.textContent = state.shares > 0
        ? `Share · ${fmtCount(state.shares)}`
        : 'Share';

      /* meta line */
      const parts = [];
      if (state.liked) parts.push('You liked this');
      if (state.shares > 0) parts.push(`${fmtCount(state.shares)} share${state.shares > 1 ? 's' : ''}`);
      popMeta.textContent = parts.join(' · ');

      /* comments */
      popComments.innerHTML = state.comments
        .map(c => `<div class="pp-comment-item"><span>You</span>${escHtml(c.text)}</div>`)
        .join('');
      popComments.scrollTop = popComments.scrollHeight;
    }

    function escHtml(str) {
      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

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
      renderBar({ ...bus });
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closePopup() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      commentInput.blur();
    }

    closeBtn.addEventListener('click', closePopup);
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closePopup();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closePopup();
    });

    /* ── Bus actions ── */
    bus.subscribe(state => renderBar(state));

    likBtn.addEventListener('click', () => {
      /* mirror back to the card's own React state via the bus */
      bus.toggleLike();
      /* heart animation */
      heartSvg.classList.remove('pp-heart-anim');
      void heartSvg.offsetWidth; // reflow
      if (bus.liked) heartSvg.classList.add('pp-heart-anim');
    });

    shareBtn.addEventListener('click', () => bus.addShare());

    commentInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && commentInput.value.trim()) {
        bus.addComment(commentInput.value.trim());
        commentInput.value = '';
      }
    });

    commentWrap.addEventListener('click', () => commentInput.focus());

    /* ── Hook into the existing ImageCarousel ── */
    /* We use a MutationObserver to wait for the carousel to mount,
       then attach a click listener to its wrapper div.             */
    function attachCarouselListener() {
      /* The carousel is the element with aspectRatio "1 / 1.15"
         and cursor "grab" – find it by its known style signature. */
      const candidates = document.querySelectorAll('[style*="grab"]');
      const carousel = Array.from(candidates).find(el =>
        el.style.aspectRatio === '1 / 1.15' || el.style.cursor === 'grab'
      );
      if (carousel && !carousel.dataset.postpopAttached) {
        carousel.dataset.postpopAttached = 'true';
        carousel.style.cursor = 'pointer';

        /* Detect click vs drag so we don't fire on swipe */
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

    /* Try immediately, then observe for dynamic render */
    if (!attachCarouselListener()) {
      const observer = new MutationObserver(() => {
        if (attachCarouselListener()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    /* ── Sync pop-up like state back to React PostCard ── */
    /* We patch the React PostCard's internal state by intercepting
       the rendered like button inside the card and keeping it in sync. */
    function syncCardLikeButton() {
      /* Find the heart SVG inside the card (not the overlay) */
      const cardHearts = document.querySelectorAll(
        'svg[fill="#F33E58"], svg[stroke="#F33E58"]'
      );
      /* The card like button is the one NOT inside the overlay */
      cardHearts.forEach(svg => {
        if (!overlay.contains(svg)) {
          const btn = svg.closest('button');
          if (btn && !btn.dataset.postpopSynced) {
            btn.dataset.postpopSynced = 'true';
            btn.addEventListener('click', () => {
              /* React handles its own state; just mirror into bus */
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

    /* Re-check after React renders */
    setTimeout(syncCardLikeButton, 3000); // after skeleton clears

    /* Expose bus for external use */
    window.postpopBus = bus;
    console.log('[postpop.js] loaded ✓ — tap the post image to open pop-up');
  });
})();
