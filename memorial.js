/* ===================================================
   MEMORIAL SCREEN — Temporary emotional interstitial
   ===================================================
   Self-contained module. Inserted between password unlock
   and the ladder scene.

   TO DISABLE:
     Set MEMORIAL_ENABLED = false below. The module exits
     immediately; initMainApp falls through to the normal
     ladder flow.

   TO FULLY REMOVE:
     1. Delete this file and memorial.css
     2. Delete the <link> + <div id="memorial-screen"> + <script>
        lines from index.html
     3. Revert the ~10-line guard in initMainApp (script.js)

   Exposed API (for testing):
     window.showMemorialScreen({ onComplete })
     window.__memorialGetElapsedDays(date)

   Dependencies:
     - :root tokens in style.css (--space-*, --text-*,
       --leading-*, --tracking-*, --ease-*, --accent-light,
       --soft-pink, --ring-focus)
     - memorial.css (loaded by index.html)
     - #memorial-screen element (defined in index.html)
   =================================================== */

(function () {
    'use strict';

    // Single feature flag — one-line rollback if needed.
    var MEMORIAL_ENABLED = true;
    if (!MEMORIAL_ENABLED) return;

    // ----------------------------------------------------------------
    // Constants — the single source of truth for day counting.
    // Changing the start date is a one-line edit here.
    // ----------------------------------------------------------------
    var MEMORIAL_START_YEAR  = 2026;
    var MEMORIAL_START_MONTH = 7;   // 0-indexed → 7 = August
    var MEMORIAL_START_DAY   = 30;

    var MS_PER_DAY = 86400000;

    // The start date as UTC midnight of the calendar day. Constructed
    // from (year, month, day) so DST, timezone, and calendar
    // boundaries can never shift it.
    var START_UTC_MS = Date.UTC(
        MEMORIAL_START_YEAR,
        MEMORIAL_START_MONTH,
        MEMORIAL_START_DAY
    );

    // ----------------------------------------------------------------
    // Day counting — elapsed calendar days, DST-safe by construction.
    //
    // Convention: Aug 30 2026 is day 0; Oct 19 2026 is day 50.
    // Both endpoints are canonicalised to UTC midnight of their LOCAL
    // calendar day, so the difference is always an exact multiple of
    // 86400000 — no rounding, no off-by-one across timezones.
    // ----------------------------------------------------------------
    function getElapsedDays(now) {
        now = now || new Date();
        var todayUTC = Date.UTC(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );
        return Math.max(0, Math.floor((todayUTC - START_UTC_MS) / MS_PER_DAY));
    }

    // ----------------------------------------------------------------
    // Active state — null when no memorial is showing. Guards the
    // single-instance rule and lets close() cleanly release listeners.
    // ----------------------------------------------------------------
    var _state = null;

    function updateDays(state) {
        if (!state.active || !state.numberEl) return;
        state.numberEl.textContent = String(getElapsedDays());
    }

    // ----------------------------------------------------------------
    // Midnight tick — a single self-rescheduling timeout. Zero polling.
    // ----------------------------------------------------------------
    function scheduleMidnightTick(state) {
        if (!state.active) return;
        var now = new Date();
        var nextMidnight = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1
        );
        var delay = (nextMidnight.getTime() - now.getTime()) + 100;
        state.midnightTimer = setTimeout(function () {
            if (!state.active) return;
            updateDays(state);
            scheduleMidnightTick(state);
        }, delay);
    }

    function onVisibilityChange(state) {
        return function () {
            if (!state.active) return;
            if (document.visibilityState === 'visible') updateDays(state);
        };
    }

    // ----------------------------------------------------------------
    // Close — fade out, hand off to ladder, then release everything.
    // ----------------------------------------------------------------
    function closeMemorial(state) {
        if (!state.active || state.closing) return;
        state.closing = true;

        // Snap any in-flight intro animations to their end state so
        // they can't compete with the fade-out.
        if (state.overlayEl && state.overlayEl.getAnimations) {
            state.overlayEl.getAnimations({ subtree: true }).forEach(function (a) {
                try { a.finish(); } catch (e) { /* noop */ }
            });
        }

        state.overlayEl.classList.add('memorial-leaving');
        state.overlayEl.setAttribute('aria-hidden', 'true');

        // Fire the ladder transition simultaneously — the memorial's
        // fade-out crossfades with the ladder scene's own 1.2 s fade-in.
        try { if (state.onComplete) state.onComplete(); } catch (e) { /* noop */ }

        // Cleanup after the fade completes (matches .memorial-leaving)
        setTimeout(function () {
            if (state.midnightTimer) {
                clearTimeout(state.midnightTimer);
                state.midnightTimer = null;
            }
            if (state.visibilityHandler) {
                document.removeEventListener('visibilitychange', state.visibilityHandler);
                state.visibilityHandler = null;
            }
            if (state.continueBtn && state.clickHandler) {
                state.continueBtn.removeEventListener('click', state.clickHandler);
                state.clickHandler = null;
            }
            if (state.overlayEl && state.keydownHandler) {
                state.overlayEl.removeEventListener('keydown', state.keydownHandler);
                state.keydownHandler = null;
            }
            if (state.overlayEl && state.overlayEl.parentNode) {
                state.overlayEl.parentNode.removeChild(state.overlayEl);
            }
            state.active = false;
            if (_state === state) _state = null;
        }, 500);
    }

    // ----------------------------------------------------------------
    // Public entry point — called from initMainApp() in script.js.
    // ----------------------------------------------------------------
    function showMemorialScreen(options) {
        options = options || {};
        if (_state) return;

        var overlay = document.getElementById('memorial-screen');
        if (!overlay) return;

        overlay.style.display = 'flex';
        overlay.classList.remove('memorial-leaving');
        overlay.removeAttribute('aria-hidden');

        var numberEl    = overlay.querySelector('.memorial-number');
        var continueBtn = overlay.querySelector('.memorial-continue');

        var state = {
            overlayEl:         overlay,
            numberEl:          numberEl,
            continueBtn:       continueBtn,
            onComplete:        options.onComplete || null,
            active:            true,
            closing:           false,
            midnightTimer:     null,
            visibilityHandler: null,
            clickHandler:      null
        };

        // Initial day count
        updateDays(state);

        // Font-gate the counter so the big number never renders in a
        // fallback serif while Playfair Display is still downloading.
        // memorial.css hides .memorial-counter until the .font-ready class
        // lands; the timeout ensures the counter still appears even if the
        // font request fails entirely.
        (function revealCounterWhenFontReady() {
            var counter = overlay.querySelector('.memorial-counter');
            if (!counter) return;
            var reveal = function () { counter.classList.add('font-ready'); };
            if (document.fonts && document.fonts.load) {
                Promise.race([
                    document.fonts.load('600 4rem "Playfair Display"'),
                    new Promise(function (r) { setTimeout(r, 400); })
                ]).then(reveal).catch(reveal);
            } else {
                reveal();
            }
        })();

        // Continue handler
        state.clickHandler = function (e) {
            if (e && e.preventDefault) e.preventDefault();
            closeMemorial(state);
        };
        if (continueBtn) continueBtn.addEventListener('click', state.clickHandler);

        // Focus trap. The dialog declares aria-modal="true", but browsers
        // and assistive tech do not enforce modal focus behaviour on their
        // own — without this, Tab on Continue leaves the dialog and lands
        // on browser chrome or elements rendered behind the overlay.
        // Only Continue is focusable, so Tab and Shift+Tab both loop back
        // to it.
        state.keydownHandler = function (e) {
            if (e.key !== 'Tab') return;
            if (!state.active || state.closing) return;
            if (continueBtn && continueBtn.isConnected) {
                e.preventDefault();
                continueBtn.focus({ preventScroll: true });
            }
        };
        if (overlay) overlay.addEventListener('keydown', state.keydownHandler);

        // Live day count — midnight rollover and tab-restore
        scheduleMidnightTick(state);
        state.visibilityHandler = onVisibilityChange(state);
        document.addEventListener('visibilitychange', state.visibilityHandler);

        // Focus management for screen readers. The dialog container
        // receives focus so its aria-label is announced; Tab then
        // reaches the Continue button naturally.
        if (overlay.focus) {
            try { overlay.focus({ preventScroll: true }); }
            catch (e) { overlay.focus(); }
        }

        _state = state;
    }

    // ----------------------------------------------------------------
    // Expose single API + a day-count helper for verification.
    // ----------------------------------------------------------------
    window.showMemorialScreen = showMemorialScreen;
    window.__memorialGetElapsedDays = getElapsedDays;
})();