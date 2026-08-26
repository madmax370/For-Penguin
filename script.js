/* ===================================================
   BIRTHDAY WEBSITE — Scene Controller & Interactions
   Preserved: Password, PIN, Anti-tamper, Privacy
   =================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ===== PASSWORD LOGIC (FIXED LOCKOUT PERSISTENCE) =====
    const passwordOverlay = document.getElementById('password-overlay');
    const passwordInput = document.getElementById('password-input');
    const unlockBtn = document.getElementById('unlock-btn');
    const passwordError = document.getElementById('password-error');
    const mainContent = document.getElementById('main-content');

    // SHA-256 hash of the correct password (REDACTED)
    // Generated using: echo -n "REDACTED" | sha256sum
    const CORRECT_PASSWORD_HASH = '277375b99e186c72ac38ac47b03199038342fe0389be8765476fa2be0c5b5649';

    // Initialize from session storage safely
    let failedAttempts = parseInt(sessionStorage.getItem('pwd_attempts') || '0');
    let lockoutEndTime = parseInt(sessionStorage.getItem('pwd_lockout_end') || '0');
    let isLockedOut = false;

    // Check if still locked out on page load
    const now = Date.now();
    if (lockoutEndTime > now) {
        isLockedOut = true;
        passwordInput.disabled = true;
        unlockBtn.disabled = true;
        
        // Start countdown timer for remaining lockout time
        const lockTimer = setInterval(() => {
            const remaining = Math.ceil((lockoutEndTime - Date.now()) / 1000);
            if (remaining <= 0) {
                clearInterval(lockTimer);
                isLockedOut = false;
                failedAttempts = 0;
                passwordInput.disabled = false;
                unlockBtn.disabled = false;
                sessionStorage.removeItem('pwd_attempts');
                sessionStorage.removeItem('pwd_lockout_end');
                passwordInput.focus();
            } else {
                const lockoutMsg = document.querySelector('.lockout-msg');
                if (lockoutMsg) {
                    lockoutMsg.textContent = `Too many attempts. Locked out for ${remaining} seconds.`;
                    lockoutMsg.style.display = 'block';
                }
            }
        }, 1000);
    } else {
        // Clear stale lockout data
        sessionStorage.removeItem('pwd_lockout_end');
        if (failedAttempts > 0 && failedAttempts < 3) {
            // Reset partial attempts on new session
            failedAttempts = 0;
            sessionStorage.removeItem('pwd_attempts');
        }
    }

    // Create lockout message element dynamically
    const lockoutMsg = document.createElement('p');
    lockoutMsg.className = 'lockout-msg';
    lockoutMsg.style.display = 'none';
    passwordError.parentNode.insertBefore(lockoutMsg, passwordError.nextSibling);

    // Hash the input password and compare
    const checkPassword = async () => {
        if (isLockedOut) return;

        try {
            // Convert input to ArrayBuffer
            const encoder = new TextEncoder();
            const data = encoder.encode(passwordInput.value);
            
            // Generate SHA-256 hash
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            
            // Convert hash to hex string
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const inputHash = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
            
            // Compare hashes
            if (inputHash === CORRECT_PASSWORD_HASH) {
                failedAttempts = 0;
                passwordOverlay.style.opacity = '0';
                setTimeout(() => {
                    passwordOverlay.style.display = 'none';
                    mainContent.style.display = 'block';

                    // Trigger professional intro transition
                    requestAnimationFrame(() => {
                        mainContent.style.opacity = '1';
                        mainContent.style.transform = 'scale(1)';
                    });
                    // Drop the transform after the intro so position:fixed chat
                    // locks to the real viewport (a parent transform breaks it).
                    setTimeout(() => { mainContent.style.transform = 'none'; }, 1300);

                    // Start the birthday experience
                    initMainApp();
                }, 500);
            } else {
                failedAttempts++;
                passwordInput.value = '';

                if (failedAttempts >= 3) {
                    isLockedOut = true;
                    const lockoutDuration = 15000; // 15 seconds
                    const lockoutEndTime = Date.now() + lockoutDuration;
                    
                    // Save to session storage
                    sessionStorage.setItem('pwd_attempts', '3');
                    sessionStorage.setItem('pwd_lockout_end', lockoutEndTime.toString());
                    
                    passwordInput.disabled = true;
                    unlockBtn.disabled = true;
                    passwordError.style.display = 'none';
                    lockoutMsg.textContent = 'Too many attempts. Locked out for 15 seconds.';
                    lockoutMsg.style.display = 'block';

                    let countdown = 15;
                    const lockTimer = setInterval(() => {
                        countdown--;
                        lockoutMsg.textContent = `Too many attempts. Locked out for ${countdown} seconds.`;
                        if (countdown <= 0) {
                            clearInterval(lockTimer);
                            isLockedOut = false;
                            failedAttempts = 0;
                            passwordInput.disabled = false;
                            unlockBtn.disabled = false;
                            lockoutMsg.style.display = 'none';
                            sessionStorage.removeItem('pwd_attempts');
                            sessionStorage.removeItem('pwd_lockout_end');
                            passwordInput.focus();
                        }
                    }, 1000);
                } else {
                    // Save current attempt count to session storage
                    sessionStorage.setItem('pwd_attempts', failedAttempts.toString());
                    passwordError.textContent = `Incorrect code. ${3 - failedAttempts} attempts remaining. 🐧`;
                    passwordError.style.display = 'block';
                    setTimeout(() => { passwordError.style.display = 'none'; }, 2000);
                }
            }
        } catch (error) {
            console.error('Password hashing error:', error);
            passwordError.textContent = 'An error occurred. Please try again.';
            passwordError.style.display = 'block';
        }
    };

    unlockBtn.addEventListener('click', checkPassword);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkPassword();
    });

    // ===== SECURITY & NETWORK HANDLING (PRESERVED) =====
    const offlineOverlay = document.getElementById('offline-overlay');

    const handleNetworkChange = () => {
        if (!navigator.onLine) {
            offlineOverlay.style.display = 'flex';
            mainContent.style.display = 'none';
        } else {
            offlineOverlay.style.display = 'none';
            if (passwordOverlay.style.display === 'none') {
                mainContent.style.display = 'block';
            }
        }
    };

    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    handleNetworkChange();

    // Privacy Protection: RELOCK on tab switch (PRESERVED)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            let blackout = document.getElementById('privacy-blackout');
            if (!blackout) {
                blackout = document.createElement('div');
                blackout.id = 'privacy-blackout';
                blackout.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#05020a;z-index:999999;';
                document.body.appendChild(blackout);
            }
            blackout.style.display = 'block';
            passwordInput.value = '';
            // Privacy: drop any staged media upload + close the photo viewer on re-lock
            cancelPendingAttachment(false);
            closeLightbox();
            closeMessageInfoSheet();
            removeSkeleton();
            setUnreadCount(0);
            clearNewMessagesDivider();
            stopPresence(); // heartbeat off + best-effort offline write (identity is going away)
            if (chatState.activeVideo) { try { chatState.activeVideo.pause(); } catch (e) { /* noop */ } }
            // Privacy: full chat teardown — identity is never silently resumed.
            // Next unlock = PIN again, then "Who are you?" again.
            cleanupReadReceiptObserver();
            relockChatForLifecycle();
            const notifyBtn = document.getElementById('notify-bhatari-btn');
            if (notifyBtn) notifyBtn.style.display = 'none';
            document.querySelectorAll('#chat-identity-toggle .toggle-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-checked', 'false');
            });
        } else {
            const blackout = document.getElementById('privacy-blackout');
            if (blackout) blackout.style.display = 'none';

            // Re-show the main password overlay
            mainContent.style.display = 'none';
            passwordOverlay.style.display = 'flex';
            passwordOverlay.style.opacity = '1';
            passwordInput.value = '';
            passwordInput.focus();

            // Reset scene controller state so it replays from Scene 1 on re-unlock
            document.body.classList.remove('scene-chat-active');
            if (window._sceneController) {
                window._sceneController.reset();
            }
        }
    });

    // A reload/navigation destroys JavaScript memory, but pagehide also
    // invalidates a digest that may still be resolving during teardown.
    window.addEventListener('pagehide', () => {
        // Also relock bfcache restores; pagehide is not always followed by a
        // full JavaScript teardown when the browser keeps a page snapshot.
        relockChatForLifecycle();
    });
    window.addEventListener('pageshow', () => {
        const chatScene = document.getElementById('scene-chat');
        if (chatScene && chatScene.classList.contains('scene-active') && !chatState.chatUnlocked) {
            armChatPinHistoryGuard();
            initChatLockOverlay();
        }
    });


    // ===================================================
    //  SCENE CONTROLLER — Cinematic Flow Manager
    // ===================================================

    class SceneController {
        constructor() {
            // Chat scene replaces scene-dua and scene-q1 through scene-q5
            this.scenes = [
                'scene-ladder',
                'scene-envelope',
                'scene-chat'
            ];
            this.currentIndex = -1;
            this.isTransitioning = false;
        }

        reset() {
            // Resetting the scene is a teardown boundary for the PIN as well.
            chatState.pinVerificationRunId++;
            chatState.identitySelectionRunId++;
            chatState.pinVerificationInFlight = false;
            chatState.pinInput = '';
            chatState.sendInFlight = false;
            chatState.identitySelecting = false;
            clearChatPinTimers();
            resetGifPickerForLifecycle(true);

            // Hide all scenes
            this.scenes.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.remove('scene-active', 'scene-exit');
                }
            });
            this.currentIndex = -1;
            this.isTransitioning = false;

            // Reset ladder
            document.body.classList.remove('scene-chat-active');
            stashLadderImages();
            document.querySelectorAll('.ladder-card').forEach(card => card.classList.remove('visible'));
            const ladderBtn = document.getElementById('ladder-continue-btn');
            if (ladderBtn) ladderBtn.classList.remove('show');
            const ladderContainer = document.getElementById('ladder-container');
            if (ladderContainer) ladderContainer.scrollTop = 0;
            const scrollHintEl = document.getElementById('ladder-scroll-hint');
            if (scrollHintEl) {
                scrollHintEl.style.opacity = '0.8';
                scrollHintEl.style.transform = 'translate3d(-50%, 0, 0)';
            }

            // Reset envelope
            const envelope = document.getElementById('envelope-element');
            if (envelope) envelope.classList.remove('opened');
            const envelopeBtn = document.getElementById('open-envelope-btn');
            if (envelopeBtn) {
                envelopeBtn.style.display = '';
                envelopeBtn.disabled = false;
            }
            const envelopeCue = document.getElementById('envelope-cue');
            if (envelopeCue) envelopeCue.style.opacity = '1';
            const envContinueBtn = document.getElementById('envelope-continue-btn');
            if (envContinueBtn) envContinueBtn.style.opacity = '0';
            const letterFs = document.getElementById('letter-fullscreen');
            if (letterFs) letterFs.classList.remove('active');
            envelopeOpened = false;

            // Clear confetti
            const confettiContainer = document.getElementById('confetti-container');
            if (confettiContainer) confettiContainer.innerHTML = '';

            // Reset reply box
            const replyMsg = document.getElementById('reply-message');
            if (replyMsg) replyMsg.value = '';
            const charCountEl2 = document.getElementById('char-count');
            if (charCountEl2) charCountEl2.textContent = '0';
            const feedbackEl2 = document.getElementById('reply-feedback');
            if (feedbackEl2) { feedbackEl2.textContent = ''; feedbackEl2.className = 'reply-feedback'; }
            setReplyLoading(false);
        }

        showScene(index) {
            if (index < 0 || index >= this.scenes.length || this.isTransitioning) return;
            this.isTransitioning = true;

            // Exit current scene
            if (this.currentIndex >= 0) {
                const currentEl = document.getElementById(this.scenes[this.currentIndex]);
                if (currentEl) {
                    currentEl.classList.remove('scene-active');
                    currentEl.classList.add('scene-exit');
                    setTimeout(() => {
                        currentEl.classList.remove('scene-exit');
                    }, 1000);
                }
                // Leaving a scene: put it to sleep after the exit fade, and
                // disconnect chat observers so they cannot fire on a hidden list.
                const leavingId = this.scenes[this.currentIndex];
                if (leavingId === 'scene-chat') {
                    cleanupReadReceiptObserver();
                    closeMessageInfoSheet();
                    // Scene teardown invalidates any pending digest/send and drops
                    // the runtime-only PIN buffer without changing existing chat state.
                    chatState.pinVerificationRunId++;
                    chatState.identitySelectionRunId++;
                    chatState.pinVerificationInFlight = false;
                    chatState.pinInput = '';
                    chatState.sendInFlight = false;
                    clearChatPinTimers();
                    resetGifPickerForLifecycle(true);
                    document.body.classList.remove('scene-chat-active');
                }
                if (leavingId === 'scene-ladder') {
                    stashLadderImages();
                }
            }

            // Enter new scene
            const nextEl = document.getElementById(this.scenes[index]);
            if (nextEl) {
                // Small delay for exit to begin
                setTimeout(() => {
                    nextEl.classList.add('scene-active');
                    this.currentIndex = index;
                    this.isTransitioning = false;
                    document.body.classList.toggle('scene-chat-active', this.scenes[index] === 'scene-chat');

                    // Trigger scene-specific entrance
                    this.onSceneEnter(index);

                    // Returning to the chat scene with an active identity: re-arm read receipts
                    if (this.scenes[index] === 'scene-chat' && chatState.currentIdentity) {
                        initReadReceiptObserver();
                        observeAllIncomingBubbles();
                    }
                }, this.currentIndex >= 0 ? 400 : 0);
            }
        }

        nextScene() {
            this.showScene(this.currentIndex + 1);
        }

        previousScene() {
            this.showScene(this.currentIndex - 1);
        }

        onSceneEnter(index) {
            switch (index) {
                case 0: enterLadderScene(); break;
                case 1: enterEnvelopeScene(); break;
                case 2: initChatScene(); break;
            }
        }
    }

    // ===================================================
    //  MAIN APP INIT
    // ===================================================

    function initMainApp() {
        // Start all three ladder photos now (scene is still display:none
        // for 600ms). Otherwise photo 3, below the fold, waited to download.
        ['images/image1-640.webp', 'images/image2-640.webp', 'images/image3-640.webp'].forEach(href => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = href;
            document.head.appendChild(link);
        });

        // Setup bokeh particles
        setupBokeh();

        // Create scene controller
        const controller = new SceneController();
        window._sceneController = controller;

        // Create floating hearts on background taps.
        let lastHeartTime = 0;
        document.addEventListener('click', (e) => {
            // Chat is tap-heavy — floating hearts there steal frames from scrolling/typing
            const chatScene = document.getElementById('scene-chat');
            if (chatScene && chatScene.classList.contains('scene-active')) return;
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'A' && e.target.tagName !== 'INPUT') {
                const now = Date.now();
                if (now - lastHeartTime > 250) {
                    createHeart(e.pageX, e.pageY);
                    lastHeartTime = now;
                }
            }
        });

        // Start Scene 1 after a brief pause for the content to render
        setTimeout(() => {
            controller.showScene(0);
        }, 600);
    }


    // ===================================================
    //  BOKEH PARTICLES
    // ===================================================

    function setupBokeh() {
        const container = document.getElementById('bokeh-container');
        if (!container) return;
        if (window.innerWidth < 768) return; // skip particle DOM on phones
        container.innerHTML = '';

        const BOKEH_COUNT = 8;
        for (let i = 0; i < BOKEH_COUNT; i++) {
            const el = document.createElement('div');
            el.className = 'bokeh-particle';
            container.appendChild(el);
            resetBokeh(el, true);
        }

        function resetBokeh(el, initial = false) {
            const size = Math.random() * 30 + 10;
            const left = Math.random() * 100;
            const duration = Math.random() * 12 + 8;
            const delay = initial ? Math.random() * -10 : Math.random() * 2;

            el.style.cssText = `width:${size}px;height:${size}px;left:${left}%;animation-duration:${duration}s;animation-delay:${delay}s;`;
            el.style.animationName = 'none';
            void el.offsetWidth;
            el.style.animationName = 'bokehFloat';

            setTimeout(() => resetBokeh(el), (duration + delay) * 1000);
        }
    }


    // Confetti system
    function fireConfetti() {
        const container = document.getElementById('confetti-container');
        if (!container) return;
        container.innerHTML = '';

        // Reduced count for mobile performance (60 -> 40)
        const colors = ['#c77dff', '#e0aaff', '#ff85a1', '#f9c74f', '#90e0ef', '#f4845f', '#fff'];
        const isMobile = window.innerWidth < 768;
        const count = isMobile ? 30 : 50;

        for (let i = 0; i < count; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + '%';
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            // Smaller sizes for better performance
            piece.style.width = (Math.random() * 6 + 5) + 'px';
            piece.style.height = (Math.random() * 8 + 6) + 'px';
            piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
            piece.style.animationDelay = (Math.random() * 0.8) + 's';
            piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            piece.style.willChange = 'transform, opacity'; // GPU acceleration
            container.appendChild(piece);
        }

        // Clean up confetti after animations complete
        setTimeout(() => {
            container.innerHTML = '';
        }, 4000); // Reduced cleanup time
    }


    // ===================================================
    //  SCENE 3 — IMAGE LADDER
    // ===================================================

    function adjustLadderString() {
        const stringEl = document.querySelector('.ladder-string');
        const card0 = document.querySelector('.ladder-card[data-index="0"]');
        const card2 = document.querySelector('.ladder-card[data-index="2"]');
        const container = document.getElementById('ladder-container');

        if (!stringEl || !card0 || !card2 || !container) return;

        const clip0 = card0.querySelector('.ladder-clip');
        const clip2 = card2.querySelector('.ladder-clip');

        if (!clip0 || !clip2) return;

        // Offset measurements stay stable while the scroll container moves or cards animate.
        const startY = card0.offsetTop + clip0.offsetTop + (clip0.offsetHeight / 2);
        const endY = card2.offsetTop + clip2.offsetTop + (clip2.offsetHeight / 2);
        const stringHeight = Math.max(0, endY - startY);

        stringEl.style.top = `${startY}px`;
        stringEl.style.height = `${stringHeight}px`;
        stringEl.style.bottom = 'auto'; // override CSS bottom
    }

    // Adjust the string position/size on window resize
    window.addEventListener('resize', adjustLadderString);

    function loadDisplayFonts() {
        if (loadDisplayFonts._done) return;
        loadDisplayFonts._done = true;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Caveat:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap';
        document.head.appendChild(link);
    }

    function stashLadderImages() {
        document.querySelectorAll('#scene-ladder picture').forEach(pic => {
            const source = pic.querySelector('source');
            const img = pic.querySelector('img');
            if (source) {
                const srcset = source.getAttribute('srcset');
                if (srcset && !source.dataset.origSrcset) source.dataset.origSrcset = srcset;
                source.removeAttribute('srcset');
            }
            if (img) {
                const src = img.getAttribute('src');
                if (src && !img.dataset.origSrc) img.dataset.origSrc = src;
                img.removeAttribute('src');
                img.removeAttribute('srcset');
            }
        });
    }

    function restoreLadderImages() {
        document.querySelectorAll('#scene-ladder picture').forEach(pic => {
            const source = pic.querySelector('source');
            const img = pic.querySelector('img');
            if (source && source.dataset.origSrcset) source.setAttribute('srcset', source.dataset.origSrcset);
            if (img && img.dataset.origSrc) img.setAttribute('src', img.dataset.origSrc);
        });
    }

    function enterLadderScene() {
        loadDisplayFonts();
        restoreLadderImages();
        // Adjust the hanging string dynamically to fit the cards perfectly
        adjustLadderString();

        const cards = document.querySelectorAll('.ladder-card');
        const continueBtn = document.getElementById('ladder-continue-btn');

        // Reveal on a short stagger — do NOT wait for each image to load.
        // Waiting used to stack on loading="lazy" + a 2s timeout, so photo 3
        // could sit invisible for ~3.5s. Images are eager now; the card
        // fades in and the photo paints when it arrives.
        const STAGGER_MS = 220;
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('visible');
                requestAnimationFrame(adjustLadderString);
                if (index === cards.length - 1) {
                    setTimeout(() => {
                        adjustLadderString();
                        if (continueBtn) continueBtn.classList.add('show');
                    }, 280);
                }
            }, 160 + (index * STAGGER_MS));
        });
    }

    const ladderContinueBtn = document.getElementById('ladder-continue-btn');
    if (ladderContinueBtn) {
        ladderContinueBtn.addEventListener('click', () => {
            if (window._sceneController) window._sceneController.nextScene();
        });
    }

    // "Jump to Chat" button — skips straight to chat scene (index 2)
    const ladderJumpChatBtn = document.getElementById('ladder-jump-chat-btn');
    if (ladderJumpChatBtn) {
        ladderJumpChatBtn.addEventListener('click', () => {
            if (window._sceneController) window._sceneController.showScene(2);
        });
    }

    // Fade the scroll hint once the ladder's actual scroll container moves.
    const ladderContainer = document.getElementById('ladder-container');
    const scrollHintEl = document.getElementById('ladder-scroll-hint');
    if (ladderContainer && scrollHintEl) {
        ladderContainer.addEventListener('scroll', () => {
            if (ladderContainer.scrollTop > 40) {
                scrollHintEl.style.opacity = '0';
                scrollHintEl.style.transform = 'translate3d(-50%, 10px, 0)';
            } else {
                scrollHintEl.style.opacity = '0.8';
                scrollHintEl.style.transform = 'translate3d(-50%, 0, 0)';
            }
        }, { passive: true });
    }


    // ===================================================
    //  SCENE 4 — ENVELOPE LETTER
    // ===================================================

    let envelopeOpened = false;

    function enterEnvelopeScene() {
        loadDisplayFonts();
        envelopeOpened = false;
        const envelope = document.getElementById('envelope-element');
        if (envelope) envelope.classList.remove('opened');
        const openBtn = document.getElementById('open-envelope-btn');
        if (openBtn) {
            openBtn.style.display = '';
            openBtn.disabled = false;
        }
        const envelopeCue = document.getElementById('envelope-cue');
        if (envelopeCue) envelopeCue.style.opacity = '1';
        const envContinueBtn = document.getElementById('envelope-continue-btn');
        if (envContinueBtn) {
            envContinueBtn.style.opacity = '0';
            envContinueBtn.classList.remove('show');
        }
    }

    const openEnvelopeBtn = document.getElementById('open-envelope-btn');
    const envelopeEl = document.getElementById('envelope-element');

    function openEnvelope() {
        if (envelopeOpened) return;
        envelopeOpened = true;

        const envelope = document.getElementById('envelope-element');
        const letterFs = document.getElementById('letter-fullscreen');
        const envelopeCue = document.getElementById('envelope-cue');

        // Stage the sequence: seal releases → flap opens → letter lifts → fullscreen fades in.
        if (openEnvelopeBtn) openEnvelopeBtn.disabled = true;
        if (envelopeCue) envelopeCue.style.opacity = '0';
        if (navigator.vibrate) navigator.vibrate([15, 25, 15]);

        setTimeout(() => {
            if (envelope) envelope.classList.add('opened');
        }, 180);

        // Fullscreen appears after the flap + lift have finished animating.
        setTimeout(() => {
            if (letterFs) letterFs.classList.add('active');
        }, 2050);
    }

    if (openEnvelopeBtn) {
        openEnvelopeBtn.addEventListener('click', openEnvelope);
    }
    // Close letter
    const letterCloseBtn = document.getElementById('letter-close-btn');
    if (letterCloseBtn) {
        letterCloseBtn.addEventListener('click', () => {
            const letterFs = document.getElementById('letter-fullscreen');
            if (letterFs) letterFs.classList.remove('active');

            // Keep the opened envelope visible and reveal the next step after the letter is read.
            const envContinueBtn = document.getElementById('envelope-continue-btn');
            if (envContinueBtn) {
                envContinueBtn.style.opacity = '1';
                envContinueBtn.classList.add('show');
            }
        });
    }

    // Envelope continue
    const envelopeContinueBtn = document.getElementById('envelope-continue-btn');
    if (envelopeContinueBtn) {
        envelopeContinueBtn.addEventListener('click', () => {
            // Close letter first if open
            const letterFs = document.getElementById('letter-fullscreen');
            if (letterFs) letterFs.classList.remove('active');

            setTimeout(() => {
                if (window._sceneController) window._sceneController.nextScene();
            }, 300);
        });
    }


    // ===================================================
    //  REPLY DELIVERY
    // ===================================================

    // Telegram Bot credentials
    const TG_BOT_TOKEN = '8695269828:AAEa1pffPXcEfXZJIWiSMvE3BIxJtqINV94';
    const TG_CHAT_ID = '6219378525';

    // ── Helper: show inline feedback (error or success) ──
    function setReplyFeedback(msg, type) {
        const el = document.getElementById('reply-feedback');
        if (!el) return;
        el.textContent = msg;
        el.className = 'reply-feedback' + (msg ? ' show ' + type : '');
    }

    // Keep old name for compat
    function setReplyError(msg) { setReplyFeedback(msg, 'error'); }

    // ── Helper: toggle loading state on the send button ──
    function setReplyLoading(isLoading) {
        const btn = document.getElementById('send-reply-btn');
        const spinner = document.getElementById('btn-spinner');
        const label = document.getElementById('send-btn-label');
        if (!btn) return;
        btn.disabled = isLoading;
        if (spinner) spinner.style.display = isLoading ? 'block' : 'none';
        if (label) label.style.display = isLoading ? 'none' : 'inline';
    }

    // ===================================================
    //  CHAT SCENE - Firebase Firestore (Real-Time Chat)
    // ===================================================

    const FIREBASE_CONFIG = {
        apiKey: 'AIzaSyDzcftZ3qMZJ86-WdrSioH9Y6Dt9JFeCAk',
        authDomain: 'web-app-511d5.firebaseapp.com',
        projectId: 'web-app-511d5',
        storageBucket: 'web-app-511d5.firebasestorage.app',
        messagingSenderId: '885726215189',
        appId: '1:885726215189:web:50bcacb46d43f823d5221c'
    };

    // Firebase is loaded only when Chat opens — keeps the password/ladder/letter screens light
    const FB_APP_SRC = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js';
    const FB_FS_SRC  = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js';
    let db = null;
    let TYPING_DOC = null;
    let PRESENCE_DOC = null;
    let firebaseReady = null;

    function loadExternalScript(src) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                if (existing.getAttribute('data-loaded') === '1' || (typeof firebase !== 'undefined' && src.includes('firestore') ? firebase.firestore : typeof firebase !== 'undefined')) {
                    return resolve();
                }
                existing.addEventListener('load', () => resolve(), { once: true });
                existing.addEventListener('error', () => reject(new Error('Failed to load ' + src)), { once: true });
                return;
            }
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = () => { s.setAttribute('data-loaded', '1'); resolve(); };
            s.onerror = () => reject(new Error('Failed to load ' + src));
            document.head.appendChild(s);
        });
    }

    function ensureFirebase() {
        if (firebaseReady) return firebaseReady;
        firebaseReady = (async () => {
            await loadExternalScript(FB_APP_SRC);
            await loadExternalScript(FB_FS_SRC);
            let _fbApp;
            try { _fbApp = firebase.app(); } catch { _fbApp = firebase.initializeApp(FIREBASE_CONFIG); }
            db = firebase.firestore(_fbApp);
            try {
                db.enablePersistence().catch(err => {
                    if (err.code === 'failed-precondition') {
                        console.warn('Persistence failed: multiple tabs open');
                    } else if (err.code === 'unimplemented') {
                        console.warn('Persistence not supported by browser');
                    } else {
                        console.warn('Persistence error:', err);
                    }
                });
            } catch (e) {
                console.warn('Persistence enable failed:', e);
            }
            TYPING_DOC = db.doc('typing/status');
            PRESENCE_DOC = db.doc('presence/status');
            return db;
        })();
        firebaseReady.catch(() => { firebaseReady = null; });
        return firebaseReady;
    }

    const CHATS_COL = 'web_chat_v2';

    // ─── Cloudinary Media Config ─────────────────────────
    // Unsigned uploads only: the API secret must NEVER be in client code.
    // The upload preset below must be created (unsigned) in the Cloudinary console.
    const CLOUDINARY_CLOUD_NAME     = 'dyua5q73q';
    const CLOUDINARY_UPLOAD_PRESET  = 'chat_videos'; // unsigned upload preset name
    const CLOUDINARY_UPLOAD_URL     = 'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/auto/upload';
    const CLOUDINARY_URL_PREFIX     = 'https://res.cloudinary.com/';
    // GIPHY web key: visible by design because this app calls GIPHY directly.
    // Replace this value if the key is rotated; never treat it as a server secret.
    const GIPHY_API_KEY             = 'uFmNuub4QWQAWW3uwaKHtEuvKHoEhPAU';
    const GIPHY_API_BASE            = 'https://api.giphy.com/v1';
    const GIPHY_RATING              = 'g';
    const GIPHY_RESULT_LIMIT        = 18;
    const GIPHY_QUERY_MAX_LENGTH    = 50;
    const GIPHY_REQUEST_TIMEOUT_MS  = 10000;
    const GIPHY_ID_RE               = /^[A-Za-z0-9_-]{1,128}$/;
    const GIPHY_MEDIA_HOST_RE       = /(^|\.)giphy\.com$/i;
    const MAX_IMAGE_BYTES           = 25 * 1024 * 1024;   // 25 MB
    const MAX_VIDEO_BYTES           = 100 * 1024 * 1024;  // 100 MB

    // ─── Read Receipt Config ─────────────────────────────
    // A message counts as "read" only when ≥70% of its bubble stays visibly
    // in the recipient's viewport for the dwell duration (tall bubbles get a
    // capped ratio so they can be read without scrolling the full height).
    const READ_VISIBILITY_THRESHOLD = 0.7;
    const READ_DWELL_MS             = 300;
    const READ_TALL_RATIO           = 0.4;  // for bubbles taller than ~90% of viewport
    const LONG_PRESS_MS             = 480;  // hold to open the Message info sheet
    const DOUBLE_TAP_MS             = 350;  // max gap between taps for a heart reaction
    const REACTION_EMOJI            = '💜'; // app's signature purple heart (swap to '❤️' if ever wanted)
    const PRESENCE_STALE_MS         = 75000; // heartbeat older than this → treat as offline
    const PRESENCE_HEARTBEAT_MS     = 25000;

    // ─── Telegram Notify (uses TG_BOT_TOKEN / TG_CHAT_ID from REPLY DELIVERY above) ──
    const NOTIFY_COOLDOWN_MS = 10_000; // 10 seconds
    let notifyLastSentAt = 0;
    let notifyCooldownTimer = null;

    async function notifyBhatari() {
        if (chatState.currentIdentity !== 'Bhandhari') return; // identity-scoped control
        const btn = document.getElementById('notify-bhatari-btn');
        const now = Date.now();
        const remaining = NOTIFY_COOLDOWN_MS - (now - notifyLastSentAt);
        if (remaining > 0) return; // still in cooldown

        // Disable button
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="notify-icon" aria-hidden="true">⏳</span><span class="notify-label">Sending…</span>';
        }

        try {
            const res = await fetch(
                `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: TG_CHAT_ID,
                        text: '🔔 Bhandhari is waiting for you in the chat! Come say hi 💜',
                        parse_mode: 'HTML'
                    })
                }
            );
            if (!res.ok) throw new Error('Telegram error');
            notifyLastSentAt = Date.now();
            showToast('Bhatari has been notified! 💜');
        } catch (err) {
            console.warn('Notify failed:', err);
            showToast('Could not send notification 😢', true);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span class="notify-icon" aria-hidden="true">🔔</span><span class="notify-label">Notify Bhatari</span>';
            }
            return;
        }

        // Start cooldown countdown
        if (notifyCooldownTimer) clearInterval(notifyCooldownTimer);
        const startTime = Date.now();
        updateNotifyBtn(btn, NOTIFY_COOLDOWN_MS / 1000);
        notifyCooldownTimer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const secLeft = Math.ceil((NOTIFY_COOLDOWN_MS - elapsed) / 1000);
            if (secLeft <= 0) {
                clearInterval(notifyCooldownTimer);
                notifyCooldownTimer = null;
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<span class="notify-icon" aria-hidden="true">🔔</span><span class="notify-label">Notify Bhatari</span>';
                }
            } else {
                updateNotifyBtn(btn, secLeft);
            }
        }, 1000);
    }

    function updateNotifyBtn(btn, secLeft) {
        if (btn) {
            btn.innerHTML = `<span class="notify-icon" aria-hidden="true">⏳</span><span class="notify-label">Wait ${secLeft}s</span>`;
        }
    }

    // ─── Toast (styling lives in style.css #chat-toast; JS drives classes + timers) ──
    function showToast(message, isError = false, type = 'default') {
        let toast = document.getElementById('chat-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'chat-toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }
        toast.textContent = message;

        // Variant classes replace the old per-call inline styling
        toast.classList.remove('toast-info', 'toast-error', 'toast-visible');
        if (type === 'info') {
            toast.classList.add('toast-info');
        } else if (isError) {
            toast.classList.add('toast-error');
        }

        // Restart the entrance animation on rapid successive toasts
        void toast.offsetWidth;
        toast.classList.add('toast-visible');

        clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(() => {
            toast.classList.remove('toast-visible');
        }, 2800);
    }

    // ─── Chat State ──────────────────────────────────────
    const chatState = {
        currentIdentity: null,    // No default — user MUST pick Bhatari/Bhandhari after the Chat PIN
        messages: [],
        unsubMessages: null,
        unsubTyping: null,
        replyToMessage: null,
        lastTypingSentTime: 0,
        typingResetTimer: null,
        remoteTyping: { sender: null, timer: null, el: null, removeTimer: null },
        renderedIds: new Map(),   // id → DOM element for reconciliation
        editingMessageId: null,   // Track which message is being edited
        editBoxes: new Map(),     // messageId → { bubble, textEl, editBox, originalText }
        chatUnlocked: false,      // Chat lock state
        pinInput: '',             // Current PIN input (memory-only; never written to DOM/storage)
        failedAttempts: 0,        // Failed PIN attempts
        lockoutEndTime: 0,        // Lockout end time
        pinVerificationInFlight: false,
        pinVerificationRunId: 0,  // invalidates async PIN results after reset/hide
        pinLockoutTimer: null,    // lockout countdown interval
        pinErrorTimer: null,      // transient error message timer
        pinSuccessTimer: null,    // delayed identity selector after successful unlock
        pendingAttachment: null,  // { file, previewUrl, kind, fileName, fileSize, status: 'uploading'|'ready'|'error', progress, media, xhr }
        pendingGif: null,         // selected GIPHY item awaiting explicit Send
        sendInFlight: false,      // duplicate-send guard
        chatAddMenuOpen: false,   // attachment/GIF chooser state
        giphyPickerOpen: false,
        giphySearchTimer: null,
        giphySearchAbortController: null,
        giphySearchRunId: 0,
        giphySearchOffset: 0,
        giphySearchQuery: '',
        giphySearchItems: [],
        giphySearchHasMore: false,
        giphySearchLoading: false,
        giphyRuntimeById: new Map(), // in-memory only; never persisted to Firestore/localStorage
        giphyLookupById: new Map(),  // active metadata lookups, keyed by GIPHY ID
        giphyLifecycleRunId: 0,      // invalidates media hydration after relock/teardown
        activeVideo: null,        // Currently playing <video> element (one at a time)
        mediaObserver: null,      // IntersectionObserver singleton for auto-pausing off-screen videos
        identitySelecting: false, // Double-click guard for the identity-selection overlay
        identitySelectionRunId: 0, // invalidates stale identity selection after relock
        readObserver: null,       // IntersectionObserver singleton for read receipts (starts after identity selection)
        readTimers: new Map(),    // messageId → { timerId, identity } dwell timers
        readPending: new Set(),   // messageIds with a read-receipt write in flight (prevents duplicates)
        readQueue: new Map(),     // id → { identity, legacyReadBy, readBy } waiting to flush as one batch
        readFlushTimer: null,     // debounce handle for batched read receipts
        infoSheetMessageId: null, // messageId shown in the long-press "Message info" sheet (null = closed)
        reactionPending: new Set(), // messageIds with a reaction toggle write in flight
        unreadCount: 0,           // incoming messages missed while scrolled up / scene hidden
        firstUnseenId: null,      // id of the first missed message ("New messages" divider sits above it)
        presenceData: null,       // last presence/status snapshot payload
        presenceHeartbeat: null,  // setInterval handle for own heartbeat writes
        presenceEvalTimer: null,  // setInterval handle re-evaluating the other side's staleness
        presenceIdentity: null,   // identity owning the active presence session
        presenceSessionId: null,  // unique tab/session key for multi-tab correctness
        presenceBeat: null,       // immediate heartbeat function for reconnect recovery
        presenceListenerError: false,
        presenceRunId: 0,         // invalidates stale listeners/timers after restarts
        presenceLifecycleBound: false,
        unsubPresence: null       // presence doc listener unsubscribe
    };

    // ─── Helpers ─────────────────────────────────────────
    function normalizeSender(s) {
        if (!s) return 'Bhatari';
        if (s === 'me') return 'Bhatari';
        if (s === 'sanobar') return 'Bhandhari';
        return s;
    }

    // Trust boundary: Firestore media payloads are user-controlled — keep only
    // whitelisted fields and force each media type through its provider gate.
    // GIPHY message records intentionally contain an ID, not a stored media URL.
    function sanitizeMedia(m) {
        if (!m || typeof m !== 'object') return null;
        const num = v => (typeof v === 'number' && isFinite(v) && v > 0) ? v : 0;

        if (m.type === 'gif') {
            if (m.provider !== 'giphy' || typeof m.providerId !== 'string' || !GIPHY_ID_RE.test(m.providerId)) return null;
            const allowedRenditions = new Set(['fixed_width', 'fixed_width_small', 'fixed_height', 'downsized_medium', 'original']);
            const rendition = allowedRenditions.has(m.rendition) ? m.rendition : 'fixed_width';
            const title = typeof m.title === 'string' ? m.title.slice(0, 160) : '';
            const alt = typeof m.alt === 'string' ? m.alt.slice(0, 160) : (title || 'GIF shared in chat');
            return {
                type: 'gif',
                provider: 'giphy',
                providerId: m.providerId,
                rendition,
                width: num(m.width),
                height: num(m.height),
                title,
                alt,
                rating: m.rating === 'g' ? 'g' : ''
            };
        }

        if (m.type !== 'image' && m.type !== 'video') return null;
        if (!isCloudinaryUrl(m.url)) return null;
        return {
            type:     m.type,
            publicId: typeof m.publicId === 'string' ? m.publicId : '',
            url:      m.url,
            width:    num(m.width),
            height:   num(m.height),
            duration: num(m.duration) || null,
            format:   typeof m.format === 'string' ? m.format : '',
            bytes:    num(m.bytes)
        };
    }

    // Reaction field: single slot per message — only the recipient of a message
    // can react to it, so `{ by }` is sufficient. Anything else is junk → null.
    function sanitizeReaction(r) {
        if (!r || typeof r !== 'object') return null;
        if (r.by !== 'Bhatari' && r.by !== 'Bhandhari') return null;
        return { by: r.by };
    }

    function formatDateLabel(ts) {
        const d = new Date(ts);
        const today    = new Date(); today.setHours(0,0,0,0);
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        d.setHours(0,0,0,0);
        if (d.getTime() === today.getTime())     return 'Today';
        if (d.getTime() === yesterday.getTime()) return 'Yesterday';
        return new Date(ts).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    }

    function sameDay(ts1, ts2) {
        const a = new Date(ts1), b = new Date(ts2);
        return a.getFullYear() === b.getFullYear() &&
               a.getMonth()    === b.getMonth()    &&
               a.getDate()     === b.getDate();
    }

    // ─── Scene Init ───────────────────────────────────────
    let chatSceneInited = false;
    let chatInitialStaggerDone = false; // cold-render cascade fires once per page load
    // Guards against duplicate listener registration when the chat scene is re-entered
    let chatLockOverlayInited = false;
    let keyboardHandlingInited = false;

    // ─── Chat Lock / PIN Logic ────────────────────────────
    // The PIN is entered through the custom keypad and keyboard handlers only.
    // No input/form field exists, so password managers have no credential field
    // to detect or save. The lockout record never contains the PIN itself.
    const CHAT_PIN_HASH = '277375b99e186c72ac38ac47b03199038342fe0389be8765476fa2be0c5b5649';
    const CHAT_PIN_LENGTH = 4;
    const CHAT_PIN_MAX_ATTEMPTS = 3;
    const CHAT_PIN_LOCKOUT_MS = 15000;
    const CHAT_PIN_ATTEMPT_WINDOW_MS = 5 * 60 * 1000;
    const CHAT_PIN_LOCKOUT_KEY = 'for-penguin-chat-pin-lockout-v1';

    function getChatPinStorageAreas() {
        const areas = [];
        try {
            if (window.localStorage) areas.push(window.localStorage);
        } catch (e) { /* storage unavailable */ }
        try {
            if (window.sessionStorage && areas.indexOf(window.sessionStorage) === -1) {
                areas.push(window.sessionStorage);
            }
        } catch (e) { /* storage unavailable */ }
        return areas;
    }

    function clearStoredChatPinLockout() {
        getChatPinStorageAreas().forEach(storage => {
            try { storage.removeItem(CHAT_PIN_LOCKOUT_KEY); } catch (e) { /* noop */ }
        });
    }

    function readStoredChatPinLockout() {
        let raw = null;
        for (const storage of getChatPinStorageAreas()) {
            try {
                raw = storage.getItem(CHAT_PIN_LOCKOUT_KEY);
                if (raw) break;
            } catch (e) { /* try the next storage area */ }
        }
        if (!raw) return { attempts: 0, lockoutEndTime: 0 };

        try {
            const saved = JSON.parse(raw);
            const attempts = Number.isInteger(saved.attempts) ? saved.attempts : 0;
            const lockoutEndTime = Number.isFinite(saved.lockoutEndTime) ? saved.lockoutEndTime : 0;
            const updatedAt = Number.isFinite(saved.updatedAt) ? saved.updatedAt : 0;
            const now = Date.now();
            const malformedLockout = lockoutEndTime < 0 ||
                lockoutEndTime > now + CHAT_PIN_LOCKOUT_MS + 1000 ||
                (attempts < CHAT_PIN_MAX_ATTEMPTS && lockoutEndTime !== 0) ||
                (attempts === CHAT_PIN_MAX_ATTEMPTS && lockoutEndTime === 0);
            if (attempts < 0 || attempts > CHAT_PIN_MAX_ATTEMPTS || !updatedAt || updatedAt > now + 1000 || now - updatedAt > CHAT_PIN_ATTEMPT_WINDOW_MS || malformedLockout) {
                clearStoredChatPinLockout();
                return { attempts: 0, lockoutEndTime: 0 };
            }
            if (lockoutEndTime > 0 && lockoutEndTime <= now) {
                clearStoredChatPinLockout();
                return { attempts: 0, lockoutEndTime: 0 };
            }
            return { attempts, lockoutEndTime };
        } catch (e) {
            clearStoredChatPinLockout();
            return { attempts: 0, lockoutEndTime: 0 };
        }
    }

    function writeStoredChatPinLockout(attempts, lockoutEndTime = 0) {
        const value = JSON.stringify({ attempts, lockoutEndTime, updatedAt: Date.now() });
        for (const storage of getChatPinStorageAreas()) {
            try {
                storage.setItem(CHAT_PIN_LOCKOUT_KEY, value);
                return;
            } catch (e) { /* try the next storage area */ }
        }
    }

    function clearChatPinTimers() {
        if (chatState.pinLockoutTimer) {
            clearInterval(chatState.pinLockoutTimer);
            chatState.pinLockoutTimer = null;
        }
        if (chatState.pinErrorTimer) {
            clearTimeout(chatState.pinErrorTimer);
            chatState.pinErrorTimer = null;
        }
        if (chatState.pinSuccessTimer) {
            clearTimeout(chatState.pinSuccessTimer);
            chatState.pinSuccessTimer = null;
        }
    }

    function relockChatForLifecycle() {
        chatState.currentIdentity = null;
        chatState.chatUnlocked = false;
        chatState.pinVerificationRunId++;
        chatState.identitySelectionRunId++;
        chatState.pinVerificationInFlight = false;
        chatState.pinInput = '';
        chatState.sendInFlight = false;
        chatState.identitySelecting = false;
        clearChatPinTimers();
        resetGifPickerForLifecycle(true);

        const chatLockOverlay = document.getElementById('chat-lock-overlay');
        if (chatLockOverlay) {
            chatLockOverlay.classList.remove('hidden');
            chatLockOverlay.setAttribute('aria-hidden', 'false');
            chatLockOverlay.setAttribute('aria-busy', 'false');
        }
        hideIdentitySelector();
        document.querySelectorAll('#chat-identity-toggle .toggle-btn').forEach(button => {
            button.classList.remove('active');
            button.setAttribute('aria-checked', 'false');
        });
    }

    let chatPinHistoryGuardActive = false;
    let chatPinHistoryGuardUrl = '';

    function armChatPinHistoryGuard() {
        if (chatPinHistoryGuardActive || !window.history || !window.history.pushState) return;
        try {
            chatPinHistoryGuardUrl = window.location.href;
            const state = window.history.state && typeof window.history.state === 'object'
                ? window.history.state
                : {};
            window.history.pushState({ ...state, __forPenguinChatPinGuard: true }, '', chatPinHistoryGuardUrl);
            chatPinHistoryGuardActive = true;
        } catch (e) { /* history may be unavailable in an embedded document */ }
    }

    function removeChatPinHistoryGuard() {
        if (!chatPinHistoryGuardActive) return;
        try {
            const state = window.history.state && typeof window.history.state === 'object'
                ? { ...window.history.state }
                : {};
            delete state.__forPenguinChatPinGuard;
            window.history.replaceState(state, '', window.location.href);
        } catch (e) { /* noop */ }
        chatPinHistoryGuardActive = false;
        chatPinHistoryGuardUrl = '';
    }

    function handleChatPinHistoryNavigation() {
        const chatScene = document.getElementById('scene-chat');
        if (!chatScene || !chatScene.classList.contains('scene-active') || chatState.chatUnlocked) return;

        // Back/Forward must never turn a pending or partially entered PIN into
        // an unlocked chat. Restore the app URL and start from a clean buffer.
        relockChatForLifecycle();
        if (chatPinHistoryGuardActive && window.history && window.history.pushState) {
            try {
                const state = window.history.state && typeof window.history.state === 'object'
                    ? window.history.state
                    : {};
                window.history.pushState({ ...state, __forPenguinChatPinGuard: true }, '', chatPinHistoryGuardUrl || window.location.href);
            } catch (e) { /* noop */ }
        }
        initChatLockOverlay();
    }

    window.addEventListener('popstate', handleChatPinHistoryNavigation);

    function initChatLockOverlay() {
        const lockOverlay = document.getElementById('chat-lock-overlay');
        const pinDisplay = document.getElementById('chat-pin-display');
        const pinPad = document.getElementById('chat-pin-pad');
        const pinError = document.getElementById('chat-pin-error');
        const pinStatus = document.getElementById('chat-pin-status');

        if (!lockOverlay || !pinDisplay || !pinPad) return;

        const updatePinStatus = (message) => {
            if (pinStatus) pinStatus.textContent = message;
        };

        const updatePinDots = () => {
            const count = Math.min(chatState.pinInput.length, CHAT_PIN_LENGTH);
            const dots = pinDisplay.querySelectorAll('.pin-dot');
            dots.forEach((dot, index) => {
                dot.classList.toggle('filled', index < count);
            });
            pinDisplay.setAttribute('aria-label', `${count} of ${CHAT_PIN_LENGTH} digits entered`);
            if (!chatState.pinVerificationInFlight) {
                updatePinStatus(`${count} of ${CHAT_PIN_LENGTH} digits entered.`);
            }
        };

        const setPinPadDisabled = (disabled) => {
            pinPad.querySelectorAll('.pin-key').forEach(key => {
                key.disabled = disabled;
            });
            lockOverlay.setAttribute('aria-busy', disabled ? 'true' : 'false');
        };

        const clearPinError = () => {
            if (chatState.pinErrorTimer) {
                clearTimeout(chatState.pinErrorTimer);
                chatState.pinErrorTimer = null;
            }
            if (pinError) {
                pinError.textContent = '';
                pinError.style.display = 'none';
            }
        };

        const showPinError = (message, transient = false) => {
            if (!pinError) return;
            if (chatState.pinErrorTimer) clearTimeout(chatState.pinErrorTimer);
            pinError.textContent = message;
            pinError.style.display = 'block';
            if (transient) {
                chatState.pinErrorTimer = setTimeout(() => {
                    pinError.textContent = '';
                    pinError.style.display = 'none';
                    chatState.pinErrorTimer = null;
                }, 2200);
            }
        };

        const clearExpiredLockout = () => {
            if (chatState.lockoutEndTime > 0 && chatState.lockoutEndTime <= Date.now()) {
                chatState.failedAttempts = 0;
                chatState.lockoutEndTime = 0;
                clearStoredChatPinLockout();
                clearPinError();
                setPinPadDisabled(false);
                updatePinStatus(`0 of ${CHAT_PIN_LENGTH} digits entered.`);
            }
        };

        const isPinLockedOut = () => {
            clearExpiredLockout();
            return chatState.lockoutEndTime > Date.now();
        };

        const scheduleLockout = () => {
            if (chatState.pinLockoutTimer) clearInterval(chatState.pinLockoutTimer);
            const updateLockout = () => {
                const remaining = Math.max(0, Math.ceil((chatState.lockoutEndTime - Date.now()) / 1000));
                if (remaining <= 0) {
                    clearExpiredLockout();
                    if (chatState.pinLockoutTimer) {
                        clearInterval(chatState.pinLockoutTimer);
                        chatState.pinLockoutTimer = null;
                    }
                    return;
                }
                setPinPadDisabled(true);
                showPinError(`Too many attempts. Try again in ${remaining}s.`);
                updatePinStatus(`PIN entry locked. Try again in ${remaining} seconds.`);
            };
            updateLockout();
            focusFirstAvailableKey();
            chatState.pinLockoutTimer = setInterval(updateLockout, 1000);
        };

        const resetPinEntry = () => {
            chatState.pinInput = '';
            updatePinDots();
            clearPinError();
        };

        const focusFirstAvailableKey = () => {
            const firstKey = pinPad.querySelector('.pin-key:not(:disabled)');
            const target = firstKey || lockOverlay;
            try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
        };

        const acceptDigit = (digit) => {
            if (isPinLockedOut() || chatState.pinVerificationInFlight) return;
            if (!/^[0-9]$/.test(digit) || chatState.pinInput.length >= CHAT_PIN_LENGTH) return;
            chatState.pinInput += digit;
            clearPinError();
            updatePinDots();
            if (navigator.vibrate) {
                try { navigator.vibrate(10); } catch (e) { /* noop */ }
            }
            if (chatState.pinInput.length === CHAT_PIN_LENGTH) verifyPin();
        };

        const handlePinAction = (action) => {
            if (isPinLockedOut() || chatState.pinVerificationInFlight) return;
            if (action === 'clear') {
                resetPinEntry();
                return;
            }
            if (action === 'back') {
                chatState.pinInput = chatState.pinInput.slice(0, -1);
                clearPinError();
                updatePinDots();
            }
        };

        const finishVerificationError = (message) => {
            if (!chatState.pinVerificationInFlight) return;
            chatState.pinVerificationInFlight = false;
            chatState.pinInput = '';
            updatePinDots();
            setPinPadDisabled(false);
            clearPinError();
            showPinError(message);
            updatePinStatus('PIN verification failed. Try again.');
        };

        const handleFailedVerification = () => {
            chatState.pinVerificationInFlight = false;
            chatState.failedAttempts = Math.min(CHAT_PIN_MAX_ATTEMPTS, chatState.failedAttempts + 1);
            chatState.pinInput = '';
            updatePinDots();

            const dots = pinDisplay.querySelectorAll('.pin-dot');
            dots.forEach(dot => {
                dot.classList.add('error');
                setTimeout(() => dot.classList.remove('error'), 400);
            });

            if (chatState.failedAttempts >= CHAT_PIN_MAX_ATTEMPTS) {
                chatState.lockoutEndTime = Date.now() + CHAT_PIN_LOCKOUT_MS;
                writeStoredChatPinLockout(chatState.failedAttempts, chatState.lockoutEndTime);
                scheduleLockout();
            } else {
                writeStoredChatPinLockout(chatState.failedAttempts, 0);
                setPinPadDisabled(false);
                showPinError(`Incorrect PIN. ${CHAT_PIN_MAX_ATTEMPTS - chatState.failedAttempts} attempts left.`, true);
                updatePinStatus(`Incorrect PIN. ${CHAT_PIN_MAX_ATTEMPTS - chatState.failedAttempts} attempts remaining.`);
            }
        };

        const handleSuccessfulVerification = () => {
            chatState.pinVerificationInFlight = false;
            chatState.chatUnlocked = true;
            chatState.pinInput = '';
            chatState.failedAttempts = 0;
            chatState.lockoutEndTime = 0;
            chatState.currentIdentity = null; // never silently resume an old identity
            clearStoredChatPinLockout();
            removeChatPinHistoryGuard();
            clearChatPinTimers();
            updatePinDots();
            clearPinError();
            setPinPadDisabled(true);
            lockOverlay.classList.add('hidden');
            lockOverlay.setAttribute('aria-hidden', 'true');
            updatePinStatus('PIN accepted. Choose your identity.');

            const dots = pinDisplay.querySelectorAll('.pin-dot');
            dots.forEach(dot => {
                dot.classList.remove('filled', 'error');
                dot.style.background = '#4ade80';
                dot.style.borderColor = '#4ade80';
            });
            setTimeout(() => {
                dots.forEach(dot => {
                    dot.style.background = '';
                    dot.style.borderColor = '';
                });
            }, 500);

            // Identity selection comes AFTER the PIN — the user must choose every time.
            clearTimeout(chatState.pinSuccessTimer);
            chatState.pinSuccessTimer = setTimeout(() => {
                chatState.pinSuccessTimer = null;
                if (!document.hidden && chatState.chatUnlocked) showIdentitySelector();
            }, 600);
        };

        function verifyPin() {
            if (isPinLockedOut() || chatState.pinVerificationInFlight) return;
            const candidate = chatState.pinInput;
            if (!/^[0-9]{4}$/.test(candidate)) return;

            const verificationRunId = ++chatState.pinVerificationRunId;
            chatState.pinVerificationInFlight = true;
            chatState.pinInput = '';
            updatePinDots();
            clearPinError();
            setPinPadDisabled(true);
            updatePinStatus('Checking PIN…');

            if (!window.crypto || !window.crypto.subtle || typeof TextEncoder === 'undefined') {
                finishVerificationError('Unable to verify PIN securely. Please reload and try again.');
                return;
            }

            window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(candidate))
                .then(hashBuffer => {
                    if (verificationRunId !== chatState.pinVerificationRunId || document.hidden || lockOverlay.classList.contains('hidden')) return;
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    const inputHash = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
                    if (inputHash === CHAT_PIN_HASH) {
                        handleSuccessfulVerification();
                    } else {
                        handleFailedVerification();
                    }
                })
                .catch(() => {
                    if (verificationRunId === chatState.pinVerificationRunId && !document.hidden) {
                        finishVerificationError('Unable to verify PIN securely. Please reload and try again.');
                    }
                });
        }

        const handlePinKeydown = (e) => {
            if (e.key === 'Tab') {
                const keys = Array.from(pinPad.querySelectorAll('.pin-key:not(:disabled)'));
                e.preventDefault();
                if (!keys.length) {
                    focusFirstAvailableKey();
                    return;
                }
                const currentIndex = keys.indexOf(document.activeElement);
                const nextIndex = currentIndex === -1
                    ? (e.shiftKey ? keys.length - 1 : 0)
                    : (currentIndex + (e.shiftKey ? -1 : 1) + keys.length) % keys.length;
                keys[nextIndex].focus();
                return;
            }

            // Let Enter/Space activate a keypad button natively for keyboard and
            // assistive-technology users; the delegated click handler does the work.
            const focusedKey = e.target.closest && e.target.closest('.pin-key');
            if (focusedKey && (e.key === 'Enter' || e.key === ' ')) return;
            if (e.isComposing || e.keyCode === 229) return;

            if (isPinLockedOut() || chatState.pinVerificationInFlight) {
                if (e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Meta') e.preventDefault();
                return;
            }
            const keyboardDigit = /^[0-9]$/.test(e.key)
                ? e.key
                : (/^Numpad[0-9]$/.test(e.code || '') ? e.code.slice(-1) : null);
            if (keyboardDigit !== null) {
                e.preventDefault();
                acceptDigit(keyboardDigit);
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                handlePinAction('back');
            } else if (e.key === 'Delete') {
                e.preventDefault();
                handlePinAction('back');
            } else if (e.key === 'Escape') {
                // Escape clears the current entry but never dismisses the required lock.
                e.preventDefault();
                handlePinAction('clear');
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (chatState.pinInput.length === CHAT_PIN_LENGTH) verifyPin();
            }
        };

        if (!chatLockOverlayInited) {
            chatLockOverlayInited = true;
            pinPad.addEventListener('click', e => {
                const key = e.target.closest('.pin-key');
                if (!key || !pinPad.contains(key)) return;
                if (isPinLockedOut() || chatState.pinVerificationInFlight) return;
                const digit = key.dataset.digit;
                const action = key.dataset.action;
                if (digit) acceptDigit(digit);
                else if (action) handlePinAction(action);
            });
            lockOverlay.addEventListener('keydown', handlePinKeydown);
            document.addEventListener('focusin', e => {
                if (!lockOverlay.classList.contains('hidden') && !lockOverlay.contains(e.target)) {
                    focusFirstAvailableKey();
                }
            });
            window.addEventListener('storage', e => {
                if (e.key !== CHAT_PIN_LOCKOUT_KEY || chatState.chatUnlocked) return;
                const saved = readStoredChatPinLockout();
                chatState.failedAttempts = Math.max(chatState.failedAttempts, saved.attempts);
                chatState.lockoutEndTime = Math.max(chatState.lockoutEndTime, saved.lockoutEndTime);
                if (isPinLockedOut()) scheduleLockout();
            });
        }

        const savedLockout = readStoredChatPinLockout();
        chatState.failedAttempts = Math.max(chatState.failedAttempts, savedLockout.attempts);
        chatState.lockoutEndTime = Math.max(chatState.lockoutEndTime, savedLockout.lockoutEndTime);
        updatePinDots();

        if (!chatState.chatUnlocked) {
            lockOverlay.classList.remove('hidden');
            lockOverlay.setAttribute('aria-hidden', 'false');
            if (isPinLockedOut()) {
                scheduleLockout();
            } else {
                setPinPadDisabled(false);
                focusFirstAvailableKey();
            }
        } else {
            lockOverlay.setAttribute('aria-hidden', 'true');
        }
    }

    function initChatScene() {
        const chatMessages   = document.getElementById('chat-messages');
        const chatInput      = document.getElementById('chat-input');
        const chatSendBtn    = document.getElementById('chat-send-btn');
        const chatReplyCancel = document.getElementById('chat-reply-cancel');
        const toggleBtns     = document.querySelectorAll('#chat-identity-toggle .toggle-btn');
        const notifyBtn      = document.getElementById('notify-bhatari-btn');
        const lockOverlay    = document.getElementById('chat-lock-overlay');

        if (!chatMessages || !chatInput || !chatSendBtn) return;

        // Start Firebase download during PIN so identity-select is ready
        ensureFirebase().catch(err => console.warn('Firebase prefetch failed:', err));

        // Initialize keyboard handling for mobile
        initKeyboardHandling();

        // Keep browser Back/Forward from bypassing a locked Chat Scene.
        if (!chatState.chatUnlocked) armChatPinHistoryGuard();

        // Initialize chat lock overlay
        initChatLockOverlay();
        syncSendButtonState();

        // Only wire up listeners once
        if (!chatSceneInited) {
            chatSceneInited = true;

            // Identity is NOT defaulted. It stays null until the user picks one
            // on the post-PIN identity selector (see verifyPin → showIdentitySelector).
            chatState.currentIdentity = null;

            // Toggle buttons start with NO active state (nobody is "you" yet)
            toggleBtns.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-checked', 'false');

                btn.addEventListener('click', () => {
                    const identity = btn.getAttribute('data-identity') || 'Bhatari';
                    if (!chatState.currentIdentity) return; // selector overlay owns the first choice
                    if (identity === chatState.currentIdentity) return; // no-op re-click
                    applyIdentityUI(identity);

                    // Show identity switch toast
                    showToast(`Switched to ${chatState.currentIdentity}`, false, 'info');
                    onChatIdentityChanged(); // read receipts: cancel old timers, re-observe, refresh ticks
                });
            });
            
            // Show initial identity notification toast after a short delay (only if already unlocked)
            // Note: Toast is now shown after PIN unlock in verifyPin() function
            // This code is kept for compatibility if chat is already unlocked

            chatSendBtn.addEventListener('click', handleSend);
            chatInput.addEventListener('keydown', e => {
                if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;

                // A phone keyboard's Return/Enter key is a line-break control,
                // like WhatsApp. Only the explicit Send button sends on touch
                // devices. Keep the faster Enter-to-send shortcut on desktop,
                // while Shift+Enter remains a newline everywhere.
                const isTouchDevice = (navigator.maxTouchPoints || 0) > 0 ||
                    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
                if (isTouchDevice || e.shiftKey) return;

                e.preventDefault();
                handleSend();
            });
            chatInput.addEventListener('input', handleOutgoingTyping);
            if (chatReplyCancel) chatReplyCancel.addEventListener('click', cancelReply);

            // Unified add menu + media attachments/GIF picker (wired once)
            initChatAddMenu();
            initMediaAttachments();
            initGifPicker();

            // Long-press "Message info" bottom sheet (wired once)
            initMessageInfoSheet();

            // Double-tap heart reactions on received messages (wired once)
            initChatReactions();

            // Message actions stay quiet until a bubble is selected (wired once)
            initChatMessageActions();

            // Header polish: sliding toggle glider + compress-on-scroll (also one-time)
            initHeaderPolish();

            // Identity-selection overlay buttons (wired once)
            initIdentitySelector();

            // Notify button stays hidden until an identity is selected.
            // It is only meaningful for Bhandhari (notifies the other person).
            if (notifyBtn) {
                notifyBtn.style.display = 'none';
                notifyBtn.addEventListener('click', notifyBhatari);
            }

            // NOTE: Firestore listeners (messages/typing) and the read-receipt observer
            // are deliberately NOT started here. They boot in selectChatIdentity()
            // once the user has explicitly chosen an identity.
        }
    }

    // ─── Identity Selection (post-PIN, pre-chat) ─────────
    let identitySelectorInited = false;
    let positionToggleGlider = null; // assigned by initHeaderPolish(); repositions the identity glider

    function initIdentitySelector() {
        if (identitySelectorInited) return;
        identitySelectorInited = true;
        const btnBhatari   = document.getElementById('chat-identity-bhatari');
        const btnBhandhari = document.getElementById('chat-identity-bhandhari');
        [btnBhatari, btnBhandhari].forEach(btn => {
            if (!btn) return;
            btn.addEventListener('click', () => {
                const identity = btn.getAttribute('data-identity');
                if (!identity || chatState.identitySelecting) return;
                selectChatIdentity(identity);
            });
        });
        // Esc must NOT dismiss this overlay — identity is required, not optional
    }

    function showIdentitySelector() {
        const overlay = document.getElementById('chat-identity-overlay');
        if (!overlay) return;
        chatState.identitySelecting = false;
        overlay.querySelectorAll('.chat-identity-btn').forEach(b => { b.disabled = false; });
        overlay.style.display = 'flex';
        haptic(10);
        const first = document.getElementById('chat-identity-bhatari');
        if (first) first.focus();
    }

    function hideIdentitySelector() {
        const overlay = document.getElementById('chat-identity-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    async function selectChatIdentity(identity) {
        // Double-click / double-tap protection
        if (chatState.identitySelecting) return;
        chatState.identitySelecting = true;
        const selectionRunId = ++chatState.identitySelectionRunId;
        const overlay = document.getElementById('chat-identity-overlay');
        if (overlay) overlay.querySelectorAll('.chat-identity-btn').forEach(b => { b.disabled = true; });

        try {
            await ensureFirebase();
        } catch (err) {
            if (selectionRunId !== chatState.identitySelectionRunId) return;
            console.warn('Firebase load failed:', err);
            showToast('Could not connect to chat 😢', true);
            if (overlay) overlay.querySelectorAll('.chat-identity-btn').forEach(b => { b.disabled = false; });
            chatState.identitySelecting = false;
            return;
        }

        if (selectionRunId !== chatState.identitySelectionRunId || !chatState.chatUnlocked || document.hidden) return;

        chatState.currentIdentity = identity;
        applyIdentityUI(identity);
        hideIdentitySelector();
        haptic(12);

        // Identity-dependent systems boot HERE, not earlier
        setUnreadCount(0);          // fresh session = clean slate (relock may have left residue)
        clearNewMessagesDivider();
        if (chatState.messages.length === 0 && chatState.renderedIds.size === 0) renderSkeleton();
        startMessageListener();
        startTypingListener();
        initReadReceiptObserver();
        observeAllIncomingBubbles();
        startPresence();

        showToast(`You are chatting as ${identity}`, false, 'info');
        const chatInput = document.getElementById('chat-input');
        if (chatInput) chatInput.focus();
        chatState.identitySelecting = false;
        syncSendButtonState();
    }

    // Shared UI updates for both the initial selection and the manual toggle
    function applyIdentityUI(identity) {
        chatState.currentIdentity = identity;
        const toggleBtns = document.querySelectorAll('#chat-identity-toggle .toggle-btn');
        toggleBtns.forEach(btn => {
            const isActive = btn.getAttribute('data-identity') === identity;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
        });
        if (positionToggleGlider) {
            try { positionToggleGlider(); } catch (e) { /* noop */ }
        }
        const notifyBtn = document.getElementById('notify-bhatari-btn');
        if (notifyBtn) {
            notifyBtn.style.display = identity === 'Bhandhari' ? 'inline-flex' : 'none';
        }
        // Edit buttons + delivery ticks depend on which messages are "mine"
        document.querySelectorAll('.chat-edit-btn').forEach(editBtn => {
            const ownerId = editBtn.dataset.ownerId;
            editBtn.style.display = (ownerId === chatState.currentIdentity) ? 'inline-flex' : 'none';
        });
        refreshAllTicks();
    }

    // ─── Read Receipts (WhatsApp-style, visibility-based) ──
    function getOtherIdentity(identity) {
        return identity === 'Bhatari' ? 'Bhandhari' : 'Bhatari';
    }

    // readBy v2: a MAP of identity → read-at time instead of the old array.
    //   { "Bhatari": 1724480000000, "Bhandhari": 1724480500000 }
    // Legacy docs may still carry an array ("readBy": ["Bhatari"]) — those are
    // normalized transparently: array entries become keys with a null timestamp
    // (their original read times were never recorded).
    function readAtToMillis(v) {
        if (!v) return null;
        if (typeof v.toMillis === 'function') {                 // Firestore Timestamp
            try { const ms = v.toMillis(); return isFinite(ms) ? ms : null; } catch (e) { return null; }
        }
        if (typeof v === 'number' && isFinite(v) && v > 0) return v;
        if (typeof v === 'string') {
            const ms = new Date(v).getTime();
            return isFinite(ms) ? ms : null;
        }
        return null;
    }

    function sanitizeReadBy(raw) {
        const out = {};
        if (!raw) return out;
        if (Array.isArray(raw)) {                               // legacy shape → keys with unknown time
            raw.forEach(v => { if (v === 'Bhatari' || v === 'Bhandhari') out[v] = null; });
            return out;
        }
        if (typeof raw === 'object') {                          // map shape → normalize each timestamp to ms
            Object.keys(raw).forEach(k => {
                if (k === 'Bhatari' || k === 'Bhandhari') out[k] = readAtToMillis(raw[k]);
            });
        }
        return out;
    }

    function hasReadEntry(message, identity) {
        if (!message || !message.readBy || !identity) return false;
        return Object.prototype.hasOwnProperty.call(message.readBy, identity);
    }

    function isMessageRead(message) {
        if (!message) return false;
        return hasReadEntry(message, getOtherIdentity(message.sender));
    }

    function initReadReceiptObserver() {
        if (chatState.readObserver) return; // one observer, reused
        if (!chatState.currentIdentity) return; // never observe before identity selection
        if (!('IntersectionObserver' in window)) return;
        chatState.readObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const el = entry.target;
                const msgId = el.dataset ? el.dataset.id : null;
                if (!msgId) return;
                const msg = chatState.messages.find(m => m.id === msgId);
                const rect = entry.boundingClientRect;
                const isTall = rect.height > window.innerHeight * 0.9;
                const threshold = isTall ? READ_TALL_RATIO : READ_VISIBILITY_THRESHOLD;
                const visibleEnough = entry.isIntersecting && entry.intersectionRatio >= threshold;
                if (visibleEnough && msg) {
                    startReadDwell(msg, el);
                } else {
                    clearReadTimer(msgId);
                }
            });
        }, { threshold: [0, READ_TALL_RATIO, READ_VISIBILITY_THRESHOLD, 1] });
    }

    function observeMessageForRead(element, message) {
        if (!chatState.readObserver || !element || !message || !message.id) return;
        if (!chatState.currentIdentity) return;                          // identity required
        if (message.sender === chatState.currentIdentity) return;        // never read-mark own messages
        if (message.pending) return;                                     // never on unsynced/optimistic writes
        if (hasReadEntry(message, chatState.currentIdentity)) return;    // already read → nothing to do
        chatState.readObserver.observe(element);
    }

    function unobserveReadReceiptElement(element) {
        if (chatState.readObserver && element) chatState.readObserver.unobserve(element);
    }

    function startReadDwell(message, element) {
        if (!chatState.currentIdentity || !chatState.chatUnlocked) return;
        if (chatState.readTimers.has(message.id)) return; // already counting
        const identityAtObservation = chatState.currentIdentity; // capture: switch cancels
        const timerId = setTimeout(() => {
            chatState.readTimers.delete(message.id);
            if (chatState.currentIdentity !== identityAtObservation) return; // switched mid-dwell
            if (document.visibilityState !== 'visible') return;              // locked/hidden
            if (!chatState.chatUnlocked) return;
            if (!isElementVisibleEnough(element)) return;                    // scrolled away mid-dwell
            // Re-read latest message state (reconciliation may have updated it)
            const latest = chatState.messages.find(m => m.id === message.id);
            if (!latest) return;
            markMessageAsRead(latest, identityAtObservation);
        }, READ_DWELL_MS);
        chatState.readTimers.set(message.id, { timerId, identity: identityAtObservation });
    }

    function clearReadTimer(messageId) {
        const entry = chatState.readTimers.get(messageId);
        if (!entry) return;
        clearTimeout(entry.timerId);
        chatState.readTimers.delete(messageId);
    }

    function clearAllReadTimers() {
        chatState.readTimers.forEach(({ timerId }) => clearTimeout(timerId));
        chatState.readTimers.clear();
    }

    function isElementVisibleEnough(el) {
        if (!el || !el.getBoundingClientRect) return false;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return false;
        const vw = window.innerWidth, vh = window.innerHeight;
        const ix = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
        const iy = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
        const ratio = (ix * iy) / (r.width * r.height);
        const isTall = r.height > vh * 0.9;
        return ratio >= (isTall ? READ_TALL_RATIO : READ_VISIBILITY_THRESHOLD);
    }

    async function markMessageAsRead(message, identityAtObservation) {
        if (!message || !message.id) return;                                   // needs a real Firestore doc ID
        if (!identityAtObservation || chatState.currentIdentity !== identityAtObservation) return;
        if (!chatState.chatUnlocked) return;                                   // chat must be active
        if (document.visibilityState !== 'visible') return;                    // never in background
        if (message.sender === identityAtObservation) return;                  // never own messages
        if (hasReadEntry(message, identityAtObservation)) return;              // already read → skip write
        if (message.pending) return;                                           // persisted messages only
        if (chatState.readPending.has(message.id)) return;                     // one write in flight max
        if (chatState.readQueue.has(message.id)) return;                       // already queued in this batch
        if (!navigator.onLine) return;                                         // respect offline; stays observed for retry
        if (!db) return;
        chatState.readQueue.set(message.id, {
            identity: identityAtObservation,
            legacyReadBy: !!message.legacyReadBy,
            readBy: message.readBy || {}
        });
        if (!chatState.readFlushTimer) {
            chatState.readFlushTimer = setTimeout(flushReadReceipts, 500);
        }
    }

    function clearReadQueue() {
        if (chatState.readFlushTimer) {
            clearTimeout(chatState.readFlushTimer);
            chatState.readFlushTimer = null;
        }
        chatState.readQueue.clear();
    }

    async function flushReadReceipts() {
        chatState.readFlushTimer = null;
        if (!db || !chatState.currentIdentity) { chatState.readQueue.clear(); return; }
        const identity = chatState.currentIdentity;
        const entries = Array.from(chatState.readQueue.entries());
        chatState.readQueue.clear();
        if (!entries.length) return;
        const FV = firebase.firestore.FieldValue;
        const batch = db.batch();
        const applied = [];
        for (const [id, meta] of entries) {
            if (chatState.readPending.has(id)) continue;
            if (identity !== meta.identity) continue;
            if (!chatState.chatUnlocked || document.visibilityState !== 'visible') continue;
            chatState.readPending.add(id);
            const ref = db.collection(CHATS_COL).doc(id);
            if (meta.legacyReadBy) {
                const migrated = {};
                Object.keys(meta.readBy || {}).forEach(k => { migrated[k] = FV.serverTimestamp(); });
                migrated[identity] = FV.serverTimestamp();
                batch.update(ref, { readBy: migrated });
            } else {
                const patch = {};
                patch[`readBy.${identity}`] = FV.serverTimestamp();
                batch.update(ref, patch);
            }
            applied.push(id);
        }
        if (!applied.length) return;
        try {
            await batch.commit();
            const now = Date.now();
            applied.forEach(id => {
                const live = chatState.messages.find(m => m.id === id);
                if (live && !hasReadEntry(live, identity)) {
                    if (!live.readBy || typeof live.readBy !== 'object' || Array.isArray(live.readBy)) {
                        live.readBy = sanitizeReadBy(live.readBy);
                    }
                    live.readBy[identity] = now;
                }
            });
        } catch (err) {
            console.warn('[ReadReceipt] Batch mark failed:', err && err.code ? err.code : err);
        } finally {
            applied.forEach(id => chatState.readPending.delete(id));
        }
    }

    function observeAllIncomingBubbles() {
        if (!chatState.readObserver) return;
        chatState.messages.forEach(msg => {
            const el = chatState.renderedIds.get(msg.id);
            if (el) observeMessageForRead(el, msg);
        });
    }

    function refreshAllTicks() {
        chatState.renderedIds.forEach((el, id) => {
            const msg = chatState.messages.find(m => m.id === id);
            if (msg) syncTick(el, msg);
        });
    }

    function cleanupReadReceiptObserver() {
        if (chatState.readObserver) {
            chatState.readObserver.disconnect();
            chatState.readObserver = null;
        }
        clearAllReadTimers();
        chatState.readPending.clear();
    }

    // Identity switch (manual toggle) while the chat is live
    function onChatIdentityChanged() {
        clearReadQueue();
        clearAllReadTimers();               // kill every in-flight dwell timer from the old identity
        closeMessageInfoSheet();            // sheet content was sender-relative — stale after a switch
        if (chatState.readObserver) {       // fresh observer → re-evaluates visibility for the new identity
            chatState.readObserver.disconnect();
            chatState.readObserver = null;
        }
        if (chatState.currentIdentity) {
            initReadReceiptObserver();
            observeAllIncomingBubbles();
            // Presence is identity-scoped too. Restart it after a manual toggle
            // so the new identity owns the heartbeat and dot target is correct.
            startPresence();
        }
    }

    // ─── Firestore Listeners ─────────────────────────────
    // Skeleton shimmer shown while the first batch of messages loads — only when
    // there's genuinely nothing rendered yet (identity switch with a warm cache
    // must NOT flash skeletons over live content).
    function renderSkeleton() {
        removeSkeleton();
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        const wrap = document.createElement('div');
        wrap.className = 'chat-skeleton';
        wrap.id = 'chat-skeleton';
        [62, 44, 70, 38, 55].forEach((widthPct, i) => {
            const row = document.createElement('div');
            row.className = 'skel-row ' + (i % 2 ? 'right' : 'left');
            const bubble = document.createElement('div');
            bubble.className = 'skel-bubble';
            bubble.style.width = widthPct + '%';
            if (i % 3 === 0) bubble.style.height = '64px'; // vary heights like real bubbles
            row.appendChild(bubble);
            wrap.appendChild(row);
        });
        chatMessages.appendChild(wrap);
    }

    function removeSkeleton() {
        const skel = document.getElementById('chat-skeleton');
        if (skel) skel.remove();
    }

    function startMessageListener() {
        if (!db) return;
        if (chatState.unsubMessages) chatState.unsubMessages();

        // Optimized query: fetch only last 20 messages to minimize reads
        chatState.unsubMessages = db.collection(CHATS_COL)
            .orderBy('timestamp', 'asc')
            .limitToLast(20)
            .onSnapshot(snapshot => {
                updateConnectionStatus(true);
                removeSkeleton(); // first data (or a genuinely empty chat) arrived

                chatState.messages = snapshot.docs.map(doc => {
                    const d = doc.data();
                    let ts = Date.now();
                    if (d.timestamp) {
                        ts = typeof d.timestamp.toMillis === 'function'
                            ? d.timestamp.toMillis()
                            : (new Date(d.timestamp).getTime() || Date.now());
                    }
                    return {
                        id:       doc.id,
                        sender:   normalizeSender(d.sender),
                        text:     d.text     || '',
                        timestamp: ts,
                        replyTo:  d.replyTo  ? { ...d.replyTo, sender: normalizeSender(d.replyTo.sender) } : null,
                        isEdited: !!d.isEdited,
                        media:    sanitizeMedia(d.media),
                        reaction: sanitizeReaction(d.reaction),
                        // Backward compatible: legacy array readBy → map with unknown times
                        readBy:        sanitizeReadBy(d.readBy),
                        legacyReadBy:  Array.isArray(d.readBy), // array docs need a one-time migration write
                        pending:  doc.metadata ? doc.metadata.hasPendingWrites : false
                    };
                });

                reconcileMessages();
            }, err => {
                console.error(`Message listener error [${CHATS_COL}]:`, err);
                updateConnectionStatus(false);
            });
    }

    function startTypingListener() {
        if (!TYPING_DOC) return;
        if (chatState.unsubTyping) chatState.unsubTyping();

        chatState.unsubTyping = TYPING_DOC.onSnapshot(doc => {
            if (!doc.exists) { hideRemoteTypingIndicator(); return; }
            const data = doc.data();
            const other = chatState.currentIdentity === 'Bhatari' ? 'Bhandhari' : 'Bhatari';
            const typingData = data[other];

            if (typingData && typingData.isTyping) {
                // Handle both server timestamps and pending local writes
                let ageMs = Infinity;
                if (typingData.at) {
                    const atMs = typeof typingData.at.toMillis === 'function'
                        ? typingData.at.toMillis()
                        : Date.now(); // if pending local write, treat as fresh
                    ageMs = Date.now() - atMs;
                }
                if (ageMs < 6000) {
                    showRemoteTypingIndicator(other);
                    return;
                }
            }
            hideRemoteTypingIndicator();
        }, err => console.warn('Typing listener:', err));
    }

    // ─── Smart DOM Reconciliation ─────────────────────────
    // Greeting card shows only when the chat is truly empty — never alongside
    // the typing bubble (shared by reconciliation and the typing indicator).
    function syncEmptyState() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        let emptyState = chatMessages.querySelector('.chat-empty-state');
        const typingBubblePresent = !!chatMessages.querySelector('.typing-indicator-bubble:not(.hiding)');
        const typingBar = document.getElementById('chat-typing-bar');
        const typingBarActive = !!(typingBar && typingBar.classList.contains('has-typing'));
        const shouldShow = chatState.messages.length === 0 && !typingBubblePresent && !typingBarActive;
        if (shouldShow && !emptyState) {
            emptyState = document.createElement('div');
            emptyState.className = 'chat-empty-state';
            const icon = document.createElement('div');
            icon.className = 'chat-empty-icon';
            icon.textContent = '🐧';
            const title = document.createElement('div');
            title.className = 'chat-empty-title';
            title.textContent = 'Say hi 💜';
            const sub = document.createElement('div');
            sub.className = 'chat-empty-sub';
            sub.textContent = 'Start the conversation — photos, videos, and GIFs work too!';
            emptyState.appendChild(icon);
            emptyState.appendChild(title);
            emptyState.appendChild(sub);
            chatMessages.appendChild(emptyState);
        } else if (!shouldShow && emptyState) {
            emptyState.remove();
        }
    }

    // ─── Unread count + "New messages" divider ────────────
    function setUnreadCount(n) {
        chatState.unreadCount = Math.max(0, n);
        const fab = document.getElementById('chat-scroll-fab');
        if (!fab) return;
        const label = document.getElementById('chat-scroll-fab-count');
        if (label) label.textContent = chatState.unreadCount > 99 ? '99+' : (chatState.unreadCount || '');
        fab.classList.toggle('unread', chatState.unreadCount > 0);
    }

    function clearNewMessagesDivider() {
        chatState.firstUnseenId = null;
        document.querySelectorAll('#chat-messages .chat-new-divider').forEach(el => el.remove());
    }

    function reconcileMessages() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const wasAtBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 80;

        // "Engaged" = genuinely watching the live edge right now. Being scrolled
        // up OR having the scene hidden (ladder/envelope, or privacy-locked) means
        // incoming messages count as missed.
        const sceneEl = document.getElementById('scene-chat');
        const sceneActive = !!(sceneEl && sceneEl.classList.contains('scene-active'));
        const engaged = wasAtBottom && sceneActive;

        // Compute sender runs for grouped rendering (same sender within 5 min = one run)
        const RUN_GAP_MS = 5 * 60 * 1000;
        for (let i = 0; i < chatState.messages.length; i++) {
            const cur = chatState.messages[i];
            const prev = chatState.messages[i - 1];
            const next = chatState.messages[i + 1];
            const contPrev = prev && prev.sender === cur.sender && (cur.timestamp - prev.timestamp) < RUN_GAP_MS;
            const contNext = next && next.sender === cur.sender && (next.timestamp - cur.timestamp) < RUN_GAP_MS;
            cur.groupStart = !contPrev;
            cur.groupEnd   = !contNext;
        }

        const expectedMsgIds = new Set(chatState.messages.map(m => m.id));

        syncEmptyState();

        // History is a rolling last-20 window — if the first unseen message aged
        // out of it, the divider concept no longer applies
        if (chatState.firstUnseenId && !expectedMsgIds.has(chatState.firstUnseenId)) {
            chatState.firstUnseenId = null;
        }

        // Single "New messages" divider per pass (already in DOM → don't duplicate)
        let newDividerPlaced = !!chatMessages.querySelector('.chat-new-divider');

        // Build ordered list of expected message IDs (preserving order)
        const expectedOrder = chatState.messages.map(m => m.id);

        // Step 1: Remove orphaned nodes (messages that no longer exist)
        for (const [id, el] of chatState.renderedIds) {
            if (!expectedMsgIds.has(id)) {
                releaseMediaIn(el); // pause + unload any videos and unobserve before removal
                unobserveReadReceiptElement(el); // stop watching for read eligibility
                clearReadTimer(id);              // kill any pending dwell timer (no leaks)
                el.remove();
                chatState.renderedIds.delete(id);
            }
        }

        // Build expected divider keys for current messages to remove orphaned dividers
        const expectedDividerKeys = new Set();
        let tempLastDateTs = null;
        for (const msg of chatState.messages) {
            if (tempLastDateTs === null || !sameDay(tempLastDateTs, msg.timestamp)) {
                const d = new Date(msg.timestamp);
                const dividerKey = `divider-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
                expectedDividerKeys.add(dividerKey);
                tempLastDateTs = msg.timestamp;
            }
        }

        // Remove any date dividers in DOM that are no longer expected
        const allDividers = chatMessages.querySelectorAll('.chat-date-divider');
        for (const div of allDividers) {
            const key = div.dataset.dividerKey;
            if (!expectedDividerKeys.has(key)) {
                div.remove();
            }
        }

        // Step 2: Append ONLY new messages at the end (no full rebuild)
        let lastDateTs = null;
        let lastInsertedNode = null;
        let newBubblesThisPass = 0; // counts new bubbles for entrance stagger

        for (const msg of chatState.messages) {
            // Handle date divider insertion
            if (lastDateTs === null || !sameDay(lastDateTs, msg.timestamp)) {
                const d = new Date(msg.timestamp);
                const dividerKey = `divider-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
                let divider = chatMessages.querySelector(`[data-divider-key="${dividerKey}"]`);
                if (!divider) {
                    divider = document.createElement('div');
                    divider.className = 'chat-date-divider divider-pop';
                    divider.addEventListener('animationend', () => divider.classList.remove('divider-pop'), { once: true });
                    divider.dataset.dividerKey = dividerKey;
                    divider.textContent = formatDateLabel(msg.timestamp);
                    // Insert at correct position
                    if (lastInsertedNode) {
                        lastInsertedNode.insertAdjacentElement('afterend', divider);
                    } else {
                        chatMessages.insertBefore(divider, chatMessages.firstChild);
                    }
                }
                lastInsertedNode = divider;
                lastDateTs = msg.timestamp;
            }

            // "New messages" separator above the first message missed while away
            if (!newDividerPlaced && chatState.firstUnseenId && msg.id === chatState.firstUnseenId) {
                const nd = document.createElement('div');
                nd.className = 'chat-new-divider divider-pop';
                nd.textContent = 'New messages';
                if (lastInsertedNode) {
                    lastInsertedNode.insertAdjacentElement('afterend', nd);
                } else {
                    chatMessages.insertBefore(nd, chatMessages.firstChild);
                }
                lastInsertedNode = nd;
                newDividerPlaced = true;
            }

            // Handle message bubble
            const existing = chatState.renderedIds.get(msg.id);
            if (existing) {
                // Update in place without moving
                updateBubble(existing, msg);
                lastInsertedNode = existing;
            } else {
                // Create new bubble and append after last node
                const bubble = createBubble(msg);
                // Receive haptic: soft nudge only for the other person's live messages
                // while the user is engaged (watching the bottom, scene visible) —
                // never on cold render. Otherwise it's a MISSED message → unread
                // count + "New messages" divider.
                if (chatInitialStaggerDone && chatState.currentIdentity &&
                    msg.sender !== chatState.currentIdentity && !msg.pending) {
                    if (engaged) {
                        haptic([6]);
                        bubble.classList.add('bubble-receive-glow');
                        bubble.addEventListener('animationend', () => bubble.classList.remove('bubble-receive-glow'), { once: true });
                        setTimeout(() => bubble.classList.remove('bubble-receive-glow'), 900); // fallback cleanup
                    } else {
                        setUnreadCount(chatState.unreadCount + 1);
                        if (!chatState.firstUnseenId) chatState.firstUnseenId = msg.id;
                    }
                }
                // Entrance animation: spring pop from the sender's side. On the very first
                // reconcile (history restore) bubbles cascade with a small stagger.
                const staggerIdx = newBubblesThisPass;
                newBubblesThisPass++;
                if (!chatInitialStaggerDone) {
                    bubble.style.animationDelay = Math.min(staggerIdx * 40, 320) + 'ms';
                }
                bubble.classList.add('bubble-enter');
                bubble.addEventListener('animationend', () => {
                    bubble.classList.remove('bubble-enter');
                    bubble.style.animationDelay = '';
                }, { once: true });
                chatState.renderedIds.set(msg.id, bubble);
                observeMessageForRead(bubble, msg); // read receipts: watch incoming visible bubbles
                if (lastInsertedNode) {
                    lastInsertedNode.insertAdjacentElement('afterend', bubble);
                } else {
                    chatMessages.insertBefore(bubble, chatMessages.firstChild);
                }
                lastInsertedNode = bubble;
            }
        }

        // After the first pass, future messages enter instantly (no stagger)
        chatInitialStaggerDone = true;

        // Get typing bubble to keep it at bottom (ignore hiding bubbles that are fading out)
        const typingBubble = chatMessages.querySelector('.typing-indicator-bubble:not(.hiding)');
        if (typingBubble && lastInsertedNode && typingBubble.previousElementSibling !== lastInsertedNode) {
            chatMessages.appendChild(typingBubble);
        }

        // Smooth scroll to bottom only if user was already near bottom
        if (wasAtBottom && newBubblesThisPass > 0) {
            smoothScrollToBottom(chatMessages);
        }

        // Info sheet stays live: a read receipt arriving while it's open updates the sheet
        refreshMessageInfoSheet();
    }

    function messageRenderSig(msg) {
        const readKeys = msg.readBy ? Object.keys(msg.readBy).sort().join(',') : '';
        const react = (msg.reaction && msg.reaction.by) ? msg.reaction.by : '';
        const media = msg.media;
        const mediaSig = media
            ? [media.type || '', media.provider || '', media.providerId || '', media.rendition || '', media.width || 0, media.height || 0].join(':')
            : '';
        return [
            msg.sender || '',
            msg.text || '',
            mediaSig,
            msg.isEdited ? '1' : '0',
            msg.pending ? '1' : '0',
            msg.groupStart ? '1' : '0',
            msg.groupEnd ? '1' : '0',
            react,
            readKeys,
            chatState.currentIdentity || ''
        ].join('\x1f');
    }

    // Update an existing bubble's mutable parts without re-creating it
    function updateBubble(bubble, msg) {
        const sig = messageRenderSig(msg);
        if (bubble.dataset.renderSig === sig) return;

        // Preserve 'has-media' so pending→confirmed acks don't strip media styling or reload media.
        // bubbleClassName() re-derives grouping classes so run changes don't require a rebuild.
        bubble.className = bubbleClassName(msg);

        // Skip text update if currently being edited by user
        const isBeingEdited = chatState.editingMessageId === msg.id;
        const textEl = bubble.querySelector('.chat-message-text');
        if (textEl && !isBeingEdited && textEl.dataset.raw !== msg.text) {
            setTextWithLinks(textEl, msg.text);
            textEl.dataset.raw = msg.text;
        }

        // Edited badge - ensure it appears when isEdited is true
        let editedTag = bubble.querySelector('.chat-edited-tag');
        if (msg.isEdited && !editedTag) {
            const ts = bubble.querySelector('.chat-timestamp');
            editedTag = document.createElement('span');
            editedTag.className = 'chat-edited-tag';
            editedTag.textContent = '(edited)';
            if (ts) ts.insertAdjacentElement('beforebegin', editedTag);
        } else if (!msg.isEdited && editedTag) {
            editedTag.remove();
        }

        // Delivery/read tick: 🕓 → ✓ → ✓✓ (read) — updated in place, never rebuilt
        syncTick(bubble, msg);
        syncReactionBadge(bubble, msg);
        // If this update says I've now read it (identity switch edge), stop observing
        if (chatState.currentIdentity && hasReadEntry(msg, chatState.currentIdentity)) {
            unobserveReadReceiptElement(bubble);
            clearReadTimer(msg.id);
        }

        // Update actions row visibility based on current identity toggle
        const editBtn = bubble.querySelector('.chat-edit-btn');
        if (editBtn) {
            // Show/hide edit button based on whether message belongs to current identity
            // (media-only messages have no caption to edit, so Edit stays hidden there)
            const shouldShow = msg.sender === chatState.currentIdentity && !!(msg.text && msg.text.trim());
            editBtn.style.display = shouldShow ? 'inline-flex' : 'none';
        }
        
        // Clean up edit box if message was saved (no longer in editBoxes map)
        // This handles the case when Firestore snapshot triggers after our manual cleanup
        if (!isBeingEdited && chatState.editBoxes.has(msg.id)) {
            const editData = chatState.editBoxes.get(msg.id);
            if (editData && editData.editBox && editData.editBox.parentNode) {
                editData.editBox.remove();
            }
            chatState.editBoxes.delete(msg.id);
            if (chatState.editingMessageId === msg.id) {
                chatState.editingMessageId = null;
            }
            // Restore text display if it was hidden
            if (textEl) textEl.style.display = '';
        }
        bubble.dataset.renderSig = sig;
    }

    // Shared class list for a message bubble (grouping classes activate CSS at style.css)
    function bubbleClassName(message, extra = '') {
        const isBhatari = message.sender === 'Bhatari';
        const hasMedia = !!(message.media && ['image', 'video', 'gif'].includes(message.media.type));
        let cls = `chat-bubble ${isBhatari ? 'left' : 'right'}`;
        if (message.pending) cls += ' pending';
        if (hasMedia) cls += ' has-media';
        if (message.groupStart !== undefined) cls += message.groupStart ? ' grouped-start' : ' grouped-mid';
        if (message.groupEnd) cls += ' grouped-end';
        return cls + extra;
    }

    // ─── Delivery/Read Tick Sync ─────────────────────────
    // Tick semantics (own messages only):
    //   🕓  pending  — written locally, waiting for Firestore ack
    //   ✓   sent     — persisted in Firestore
    //   ✓✓  read     — recipient identity marked it visible (blue)
    // Ticks live in the meta row, which is right-aligned and stable in size,
    // so the ✓ → ✓✓ upgrade never causes the message text to jump.
    function syncTick(bubble, msg) {
        const metaRow = bubble.querySelector('.chat-meta-row');
        if (!metaRow) return;
        let tick = metaRow.querySelector('.chat-tick');
        const isOwn = msg.sender === chatState.currentIdentity;

        if (!isOwn) {
            if (tick) tick.remove(); // not my message → no tick (identity switches refresh this)
            return;
        }

        const isRead = isMessageRead(msg);
        let glyph, cls, label;
        if (msg.pending)     { glyph = '🕓'; cls = 'tick-pending'; label = 'Sending'; }
        else if (isRead)     { glyph = '✓✓'; cls = 'tick-read';    label = 'Read'; }
        else                 { glyph = '✓';  cls = 'tick-sent';    label = 'Sent'; }

        if (!tick) {
            tick = document.createElement('span');
            metaRow.appendChild(tick);
        }

        const prevClass = tick.className;
        const upgraded = (prevClass.includes('tick-pending') && cls !== 'tick-pending')
                      || (prevClass.includes('tick-sent') && cls === 'tick-read');

        tick.className = 'chat-tick ' + cls;
        tick.textContent = glyph;
        tick.setAttribute('aria-label', label);

        if (upgraded) {
            tick.classList.add('tick-pop');
            tick.addEventListener('animationend', () => tick.classList.remove('tick-pop'), { once: true });
            if (cls === 'tick-read') haptic(10); // soft buzz the moment your message is read
        }
    }

    // ─── Jump to Quoted Message ──────────────────────────
    // Scrolls the quoted original into view (if still within the loaded window)
    // and flash-highlights it. History is capped at the last 20 messages, so
    // older targets get a gentle "not available" toast instead.
    function jumpToQuotedMessage(replyToId) {
        if (!replyToId) return;
        const target = chatState.renderedIds.get(replyToId);
        if (!target || !target.isConnected) {
            showToast('Original message not available', false, 'info');
            return;
        }
        const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        // Restart the flash even if it's mid-animation from a previous tap
        target.classList.remove('message-highlight');
        void target.offsetWidth;
        target.classList.add('message-highlight');
        const clearFlash = () => target.classList.remove('message-highlight');
        target.addEventListener('animationend', clearFlash, { once: true });
        setTimeout(clearFlash, 1600); // fallback in case the animation is cut short
    }

    // ─── Heart Reactions (double-tap a received message) ──
    // Single slot per message: only its recipient ever reacts, stored as
    // `reaction: { by }`. Double-tap toggles it on/off.
    function syncReactionBadge(bubble, msg) {
        let badge = bubble.querySelector('.chat-reaction');
        if (msg.reaction) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'chat-reaction';
                badge.textContent = REACTION_EMOJI;
                bubble.appendChild(badge);
                requestAnimationFrame(() => badge.classList.add('pop')); // entrance pop
            }
        } else if (badge) {
            badge.remove();
        }
    }

    function burstHearts(x, y) {
        const offsets = [[0, 0], [-20, -14], [18, -18]];
        offsets.forEach(([dx, dy], i) => {
            setTimeout(() => createHeart(x + dx, y + dy), i * 45);
        });
    }

    async function reactToMessage(msg, clientX, clientY) {
        if (!msg || !msg.id || msg.pending) return;
        if (!chatState.currentIdentity || !chatState.chatUnlocked) return;
        if (msg.sender === chatState.currentIdentity) return;   // own messages aren't reactable
        if (chatState.reactionPending.has(msg.id)) return;      // one toggle in flight per message
        if (!navigator.onLine) { showToast('You are offline 📡', true); return; }
        if (!db) return;
        chatState.reactionPending.add(msg.id);
        const mine = !!(msg.reaction && msg.reaction.by === chatState.currentIdentity);
        const live = chatState.messages.find(m => m.id === msg.id);
        try {
            const FV = firebase.firestore.FieldValue;
            if (mine) {
                await db.collection(CHATS_COL).doc(msg.id).update({ reaction: FV.delete() });
                if (live) live.reaction = null;
            } else {
                burstHearts(clientX, clientY);                  // burst only when adding
                haptic([10]);
                await db.collection(CHATS_COL).doc(msg.id)
                    .update({ reaction: { by: chatState.currentIdentity, at: FV.serverTimestamp() } });
                if (live) live.reaction = { by: chatState.currentIdentity }; // optimistic until snapshot
            }
        } catch (err) {
            console.warn('[Reaction] toggle failed:', msg.id, err && err.code ? err.code : err);
            // No local rollback needed — the next authoritative snapshot corrects the badge.
        } finally {
            chatState.reactionPending.delete(msg.id);
            const el = chatState.renderedIds.get(msg.id);
            if (el && live) syncReactionBadge(el, live);
        }
    }

    function initChatReactions() {
        const container = document.getElementById('chat-messages');
        if (!container || initChatReactions._inited) return;
        initChatReactions._inited = true;
        let lastTap = { id: null, time: 0, identity: null };

        container.addEventListener('click', e => {
            const bubble = e.target.closest('.chat-bubble');
            if (!bubble || !bubble.dataset.id) return;
            // Inner controls own their clicks: quote jumps, action buttons, links, media/lightbox
            if (e.target.closest('.chat-quote-box, .chat-action-btn, a.chat-link, .chat-media-image, .chat-media-video, .chat-media-gif')) return;
            const msg = chatState.messages.find(m => m.id === bubble.dataset.id);
            // Received text messages only — media bubbles click to lightbox, own messages open info sheet
            if (!msg || msg.media || msg.pending || msg.sender === chatState.currentIdentity) return;
            if (!chatState.currentIdentity || !chatState.chatUnlocked) return;
            if (document.visibilityState !== 'visible') return;

            const now = Date.now();
            if (lastTap.id === msg.id && lastTap.identity === chatState.currentIdentity && now - lastTap.time <= DOUBLE_TAP_MS) {
                lastTap = { id: null, time: 0, identity: null };
                reactToMessage(msg, e.clientX, e.clientY);
            } else {
                lastTap = { id: msg.id, time: now, identity: chatState.currentIdentity };
            }
        });
    }

    // Keep Reply/Edit actions quiet until the user selects a message. Hover
    // reveals them on desktop; click/focus reveals them on touch and keyboard.
    function initChatMessageActions() {
        const container = document.getElementById('chat-messages');
        if (!container || initChatMessageActions._inited) return;
        initChatMessageActions._inited = true;

        const closeOpenActions = except => {
            container.querySelectorAll('.chat-bubble.actions-open').forEach(bubble => {
                if (bubble !== except) bubble.classList.remove('actions-open');
            });
        };

        container.addEventListener('click', e => {
            const bubble = e.target.closest('.chat-bubble');
            if (!bubble || !bubble.dataset.id) {
                closeOpenActions(null);
                return;
            }

            // Let the action, quote, link, and media handlers keep ownership of
            // their clicks; selecting the surrounding bubble is for discovery.
            if (e.target.closest('.chat-action-btn, .chat-quote-box, a.chat-link, .chat-media-image, .chat-media-video, .chat-media-gif, .chat-reaction')) return;

            closeOpenActions(bubble);
            bubble.classList.toggle('actions-open');
        });

        container.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            const bubble = e.target.closest('.chat-bubble');
            if (bubble) bubble.classList.remove('actions-open');
        });

        document.addEventListener('click', e => {
            if (!e.target.closest('.chat-bubble')) closeOpenActions(null);
        });
    }

    // ─── Create Bubble ────────────────────────────────────
    function createBubble(message) {
        const bubble = document.createElement('div');
        const hasText  = !!(message.text && message.text.trim());
        const hasMedia = !!(message.media && ['image', 'video', 'gif'].includes(message.media.type));
        bubble.className = bubbleClassName(message);
        bubble.dataset.id = message.id;
        bubble.tabIndex = 0;
        bubble.setAttribute('aria-label', `${message.sender} message`);

        // Sender label
        const senderLabel = document.createElement('div');
        senderLabel.className = 'chat-sender-label';
        senderLabel.textContent = message.sender;
        bubble.appendChild(senderLabel);

        // Reply quote box (improved) — tappable: jumps to the original message
        if (message.replyTo) {
            const quoteBox = document.createElement('div');
            quoteBox.className = 'chat-quote-box';
            quoteBox.setAttribute('role', 'button');
            quoteBox.tabIndex = 0;
            quoteBox.setAttribute('aria-label', 'Jump to the original message');
            const accent = document.createElement('div');
            accent.className = 'quote-accent-bar';
            const quoteSender = document.createElement('span');
            quoteSender.className = 'quote-sender';
            quoteSender.textContent = message.replyTo.sender || '';
            const quoteText = document.createElement('span');
            quoteText.className = 'quote-text';
            const snippet = message.replyTo.text || '';
            quoteText.textContent = snippet.substring(0, 60) + (snippet.length > 60 ? '…' : '');
            quoteBox.appendChild(accent);
            quoteBox.appendChild(quoteSender);
            quoteBox.appendChild(quoteText);
            quoteBox.addEventListener('click', e => {
                e.stopPropagation(); // not a bubble tap / double-tap candidate
                jumpToQuotedMessage(message.replyTo.id);
            });
            quoteBox.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    jumpToQuotedMessage(message.replyTo.id);
                }
            });
            bubble.appendChild(quoteBox);
        }

        // Media block (image or video) — inserted between reply quote and caption
        if (hasMedia) {
            const mediaNode = message.media.type === 'image'
                ? buildImageMedia(message)
                : message.media.type === 'video'
                    ? buildVideoMedia(message)
                    : buildGifMedia(message);
            bubble.appendChild(mediaNode);
        }

        // Message text (skipped entirely for media-only messages)
        if (hasText) {
            const textEl = document.createElement('div');
            textEl.className = 'chat-message-text';
            setTextWithLinks(textEl, message.text);
            textEl.dataset.raw = message.text;
            bubble.appendChild(textEl);
        }

        // (edited) badge + Timestamp row
        const metaRow = document.createElement('div');
        metaRow.className = 'chat-meta-row';
        if (message.isEdited) {
            const editedTag = document.createElement('span');
            editedTag.className = 'chat-edited-tag';
            editedTag.textContent = '(edited)';
            metaRow.appendChild(editedTag);
        }
        const timestamp = document.createElement('span');
        timestamp.className = 'chat-timestamp';
        timestamp.textContent = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        metaRow.appendChild(timestamp);
        bubble.appendChild(metaRow);
        // Delivery/read tick: 🕓 pending → ✓ sent → ✓✓ read (see syncTick)
        syncTick(bubble, message);
        syncReactionBadge(bubble, message);

        // Action buttons row (Reply + Edit for own messages)
        const actionsRow = document.createElement('div');
        actionsRow.className = 'chat-bubble-actions';

        const replyBtn = document.createElement('button');
        replyBtn.className = 'chat-action-btn';
        replyBtn.type = 'button';
        replyBtn.textContent = '↩ Reply';
        // Media-only messages quote as "📷 Photo" / "🎬 Video" so the reply bar is never empty
        replyBtn.addEventListener('click', e => { e.stopPropagation(); handleReply(message.id, quoteTextForMessage(message), message.sender); });
        actionsRow.appendChild(replyBtn);

        // Edit only own messages with caption text - always create button but control visibility via CSS class
        const editBtn = document.createElement('button');
        editBtn.className = 'chat-action-btn chat-edit-btn';
        editBtn.type = 'button';
        editBtn.textContent = '✏ Edit';
        editBtn.dataset.ownerId = message.sender;
        editBtn.style.display = (message.sender === chatState.currentIdentity && hasText) ? 'inline-flex' : 'none';
        editBtn.addEventListener('click', e => { 
            e.stopPropagation(); 
            startEdit(bubble, message); 
        });
        actionsRow.appendChild(editBtn);

        bubble.appendChild(actionsRow);
        bubble.dataset.renderSig = messageRenderSig(message);
        return bubble;
    }

    // ─── Inline Message Editing ──────────────────────────
    function startEdit(bubble, message) {
        // Prevent double edit box on same message
        if (bubble.querySelector('.chat-edit-box')) return;
        
        // Close any other open edit boxes (only one edit at a time)
        if (chatState.editingMessageId && chatState.editingMessageId !== message.id) {
            const otherEdit = chatState.editBoxes.get(chatState.editingMessageId);
            if (otherEdit) {
                cancelEdit(otherEdit.bubble, otherEdit.textEl, otherEdit.editBox, false);
            }
        }

        const textEl = bubble.querySelector('.chat-message-text');
        if (!textEl) return;
        const originalText = textEl.textContent;
        textEl.style.display = 'none';

        const editBox = document.createElement('div');
        editBox.className = 'chat-edit-box';

        const input = document.createElement('textarea');
        input.className = 'chat-edit-input';
        input.rows = 1;
        input.value = originalText;
        input.setAttribute('aria-label', `Edit message: ${originalText.substring(0, 30)}`);
        input.maxLength = 2000; // Max length validation
        input.autocapitalize = 'sentences';
        input.style.resize = 'none';
        input.style.overflow = 'hidden';
        editBox.appendChild(input);

        // Create character counter element
        const charCounter = document.createElement('div');
        charCounter.className = 'chat-edit-char-counter';
        charCounter.textContent = `${input.value.length}/2000`;
        editBox.appendChild(charCounter);

        // Auto-resize function for edit input
        const autoResize = () => {
            input.style.height = 'auto';
            const newHeight = Math.min(input.scrollHeight, 120); // Max 6 lines (~120px)
            input.style.height = newHeight + 'px';
        };

        input.addEventListener('input', () => {
            charCounter.textContent = `${input.value.length}/2000`;
            autoResize();
        });

        // Initial resize after DOM insertion
        setTimeout(autoResize, 0);

        const btns = document.createElement('div');
        btns.className = 'chat-edit-btns';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'chat-edit-save-btn';
        saveBtn.type = 'button';
        saveBtn.textContent = '✓ Save';
        saveBtn.addEventListener('click', async () => {
            const newText = input.value.trim();
            // Validation: empty, whitespace-only, or unchanged
            if (!newText || newText.length === 0) {
                showToast('Message cannot be empty 😢', true);
                input.focus();
                input.select();
                return;
            }
            if (newText === originalText) {
                cancelEdit(bubble, textEl, editBox);
                return;
            }
            
            // Disable button and show loading state
            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ Saving...';
            input.disabled = true;
            
            try {
                await db.collection(CHATS_COL).doc(message.id).update({
                    text: newText,
                    isEdited: true,
                    editedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Clear editing state immediately to prevent stuck UI
                chatState.editBoxes.delete(message.id);
                if (chatState.editingMessageId === message.id) {
                    chatState.editingMessageId = null;
                }
                if (editBox && editBox.parentNode) editBox.remove();
                if (textEl) textEl.style.display = '';
                
                showToast('Message updated ✓', false);
            } catch (err) {
                console.error('Edit error:', err);
                showToast('Could not save edit 😢 Try again', true);
                // Re-enable inputs on error so user can retry
                saveBtn.disabled = false;
                saveBtn.textContent = '✓ Save';
                input.disabled = false;
                input.focus();
                // Copy edited text to clipboard for safety
                navigator.clipboard.writeText(input.value).catch(() => {});
            }
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'chat-edit-cancel-btn';
        cancelBtn.type = 'button';
        cancelBtn.textContent = '✕ Cancel';
        cancelBtn.addEventListener('click', () => cancelEdit(bubble, textEl, editBox));

        // Also cancel on Escape, save on Enter
        input.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit(bubble, textEl, editBox);
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                saveBtn.click();
            }
        });

        btns.appendChild(saveBtn);
        btns.appendChild(cancelBtn);
        editBox.appendChild(btns);
        
        // Insert edit box after text element, before meta row
        const metaRow = bubble.querySelector('.chat-meta-row');
        if (metaRow) {
            bubble.insertBefore(editBox, metaRow);
        } else {
            bubble.appendChild(editBox);
        }
        
        // Track editing state
        chatState.editingMessageId = message.id;
        chatState.editBoxes.set(message.id, { bubble, textEl, editBox, originalText });
        
        input.focus();
        input.select();
    }

    function cancelEdit(bubble, textEl, editBox, restoreText = true) {
        if (editBox && editBox.parentNode) editBox.remove();
        if (textEl && restoreText) textEl.style.display = '';
        
        // Clear editing state
        if (bubble && bubble.dataset && bubble.dataset.id) {
            chatState.editBoxes.delete(bubble.dataset.id);
            if (chatState.editingMessageId === bubble.dataset.id) {
                chatState.editingMessageId = null;
            }
        }
    }

    // ─── Send Message ────────────────────────────────────
    // ─── Haptics (guarded, silent when unsupported) ──────
    function haptic(pattern) {
        if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* noop */ } }
    }

    function closeChatAddMenu(restoreFocus = true) {
        const wrap = document.getElementById('chat-add-wrap');
        const menu = document.getElementById('chat-add-menu');
        const plus = document.getElementById('chat-plus-btn');
        chatState.chatAddMenuOpen = false;
        if (wrap) wrap.classList.remove('menu-open');
        if (menu) {
            menu.classList.remove('open');
            menu.setAttribute('aria-hidden', 'true');
        }
        if (plus) plus.setAttribute('aria-expanded', 'false');
        if (restoreFocus && plus && plus.isConnected && !plus.disabled) plus.focus({ preventScroll: true });
    }

    function getChatAddOptions() {
        const menu = document.getElementById('chat-add-menu');
        return menu ? Array.from(menu.querySelectorAll('[role="menuitem"]')).filter(option => !option.disabled) : [];
    }

    function openChatAddMenu() {
        const wrap = document.getElementById('chat-add-wrap');
        const menu = document.getElementById('chat-add-menu');
        const plus = document.getElementById('chat-plus-btn');
        if (!wrap || !menu || !plus || plus.disabled || chatState.giphyPickerOpen) return;
        chatState.chatAddMenuOpen = true;
        wrap.classList.add('menu-open');
        menu.classList.add('open');
        menu.setAttribute('aria-hidden', 'false');
        plus.setAttribute('aria-expanded', 'true');
        requestAnimationFrame(() => {
            const firstOption = getChatAddOptions()[0];
            if (chatState.chatAddMenuOpen && firstOption) firstOption.focus({ preventScroll: true });
        });
    }

    function toggleChatAddMenu() {
        if (chatState.chatAddMenuOpen) closeChatAddMenu(false);
        else openChatAddMenu();
    }

    function initChatAddMenu() {
        const wrap = document.getElementById('chat-add-wrap');
        const menu = document.getElementById('chat-add-menu');
        const plus = document.getElementById('chat-plus-btn');
        if (!wrap || !menu || !plus || initChatAddMenu._inited) return;
        initChatAddMenu._inited = true;
        plus.addEventListener('click', toggleChatAddMenu);
        menu.addEventListener('keydown', event => {
            const options = getChatAddOptions();
            if (event.key === 'Escape') {
                event.preventDefault();
                closeChatAddMenu();
                return;
            }
            if (event.key === 'Tab') {
                closeChatAddMenu(false);
                return;
            }
            if (!options.length || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const current = options.indexOf(document.activeElement);
            let next = event.key === 'Home' ? 0
                : event.key === 'End' ? options.length - 1
                : current < 0 ? 0
                : (current + (event.key === 'ArrowUp' ? -1 : 1) + options.length) % options.length;
            options[next].focus({ preventScroll: true });
        });
        document.addEventListener('click', event => {
            if (chatState.chatAddMenuOpen && !wrap.contains(event.target)) closeChatAddMenu(false);
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && chatState.chatAddMenuOpen) {
                event.preventDefault();
                closeChatAddMenu();
            }
        });
    }

    // Keep the send control honest: it is enabled only when text or a finished
    // attachment/GIF is available, and the chat identity has been selected.
    function syncSendButtonState() {
        const sendBtn = document.getElementById('chat-send-btn');
        const plusBtn = document.getElementById('chat-plus-btn');
        const attachBtn = document.getElementById('chat-attach-btn');
        const gifBtn = document.getElementById('chat-gif-btn');
        const chatInput = document.getElementById('chat-input');
        const att = chatState.pendingAttachment;
        const gif = chatState.pendingGif;
        const hasText = !!(chatInput && chatInput.value.trim());
        const uploadFinished = !!(att && att.status === 'ready' && att.media);
        const uploadInProgress = !!(att && att.status === 'uploading');
        const hasGif = !!(gif && gif.media && gif.runtime);
        const composerReady = !!chatState.currentIdentity && !chatState.sendInFlight;
        const canSend = composerReady && !uploadInProgress && (hasText || uploadFinished || hasGif);

        if (sendBtn) {
            sendBtn.disabled = !canSend;
            sendBtn.classList.toggle('armed', canSend);
        }
        if (plusBtn) plusBtn.disabled = !composerReady || chatState.giphyPickerOpen;
        if (attachBtn) attachBtn.disabled = !composerReady || !!gif || chatState.giphyPickerOpen;
        if (gifBtn) gifBtn.disabled = !composerReady || !!att || chatState.giphyPickerOpen;
    }

    function handleSend() {
        if (!chatState.currentIdentity || chatState.sendInFlight) return; // identity required and one send at a time
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;
        const text = chatInput.value.trim();

        const att = chatState.pendingAttachment;
        const gif = chatState.pendingGif;
        if (att && att.status === 'uploading') {
            showToast('Almost there — finishing upload ⏳', false);
            return;
        }
        const media = att && att.status === 'ready'
            ? att.media
            : (gif && gif.media ? gif.media : null);
        if (!text && !media) return;
        if (!db) {
            showToast('Chat is still connecting…', true);
            return;
        }

        // Send choreography: tick haptic + squash/launch micro-anim on the button
        closeChatAddMenu(false);
        haptic(8);
        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) {
            sendBtn.classList.remove('send-launch');
            void sendBtn.offsetWidth; // restart animation
            sendBtn.classList.add('send-launch');
            sendBtn.classList.remove('armed');
        }

        chatState.sendInFlight = true;
        chatInput.value = '';
        syncSendButtonState();
        resizeChatInput(chatInput);
        sendMessage(text, media, gif && media === gif.media ? gif : null);
        clearOutgoingTyping();
    }

    async function sendMessage(text, media = null, sentGif = null) {
        if (!db) {
            showToast('Chat is still connecting…', true);
            chatState.sendInFlight = false;
            syncSendButtonState();
            return;
        }
        const senderAtSend = chatState.currentIdentity;
        const sendRunId = chatState.identitySelectionRunId;
        const replyTo = chatState.replyToMessage
            ? { id: chatState.replyToMessage.id, sender: chatState.replyToMessage.sender, text: chatState.replyToMessage.text }
            : null;
        cancelReply();
        const sentAttachment = chatState.pendingAttachment; // keep ref in case we must restore on failure
        if (media) {
            if (sentAttachment && media === sentAttachment.media) clearAttachmentUI();
            // Hide the GIF preview while sending, but keep the pending draft in
            // memory so a failed Firestore write can restore it for retry.
            if (sentGif && media === sentGif.media) hideGifPreview();
        }
        try {
            await db.collection(CHATS_COL).add({
                sender:    senderAtSend,
                text:      text || '',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                replyTo,
                isEdited: false,
                media:     media || null,
                readBy:    {}   // read receipts start unread; each reader writes their own timestamped key
            });
            if (sendRunId === chatState.identitySelectionRunId && chatState.currentIdentity === senderAtSend) {
                if (media && chatState.pendingAttachment === sentAttachment && sentAttachment) discardPendingAttachment();
                if (media && chatState.pendingGif === sentGif && sentGif) clearGifPreview();
            }
        } catch (err) {
            if (sendRunId !== chatState.identitySelectionRunId || chatState.currentIdentity !== senderAtSend) return;
            console.error('Send error:', err);
            // Restore the draft so a failed send never loses the typed text or media.
            const currentInput = document.getElementById('chat-input');
            if (currentInput && text) { currentInput.value = text; resizeChatInput(currentInput); }
            if (media && chatState.pendingAttachment === sentAttachment && sentAttachment) {
                renderAttachmentStrip(); // strip comes back in "ready" state for retry
            }
            if (media && chatState.pendingGif === sentGif && sentGif) renderGifPreview();
            showToast('Message failed to send 😢', true);
        } finally {
            if (sendRunId === chatState.identitySelectionRunId) {
                chatState.sendInFlight = false;
                syncSendButtonState();
            }
        }
    }

    // ─── Reply ───────────────────────────────────────────
    function handleReply(msgId, text, sender) {
        chatState.replyToMessage = { id: msgId, text, sender };
        const container = document.getElementById('chat-reply-container');
        const quote     = document.getElementById('chat-reply-quote');
        const chatMessages = document.getElementById('chat-messages');
        const wasAtBottom = chatMessages ? (chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 80) : false;
        if (container && quote) {
            quote.innerHTML = ''; // Clear previous preview
            const senderSpan = document.createElement('span');
            senderSpan.className = 'reply-preview-sender';
            senderSpan.textContent = sender;
            const textSpan = document.createElement('span');
            textSpan.className = 'reply-preview-text';
            textSpan.textContent = text.substring(0, 70) + (text.length > 70 ? '…' : '');
            quote.appendChild(senderSpan);
            quote.appendChild(textSpan);
            container.style.display = 'flex';
            // Trigger slide-in animation
            container.classList.remove('reply-anim');
            void container.offsetWidth;
            container.classList.add('reply-anim');
        }
        const chatInput = document.getElementById('chat-input');
        if (chatInput) chatInput.focus();
        // P2: reply bar height changes — keep last bubble visible
        syncInputBarHeight();
        if (wasAtBottom && chatMessages) {
            requestAnimationFrame(() => { chatMessages.scrollTop = chatMessages.scrollHeight; });
        }
    }

    function cancelReply() {
        chatState.replyToMessage = null;
        const container = document.getElementById('chat-reply-container');
        if (container) container.style.display = 'none';
        // P2: reply bar hidden — update dynamic height
        syncInputBarHeight();
    }

    // ─── Media: Cloudinary URL Helpers ───────────────────
    function isCloudinaryUrl(url) {
        return typeof url === 'string' && url.startsWith(CLOUDINARY_URL_PREFIX);
    }

    // Insert an on-the-fly transformation right after "/upload/"
    function cldUrl(url, transform) {
        if (!isCloudinaryUrl(url) || url.indexOf('/upload/') === -1) return null;
        return url.replace('/upload/', '/upload/' + transform + '/');
    }

    // Video thumbnail: transform + swap file extension to .jpg (frame at second 0)
    function cldVideoPoster(url) {
        const t = cldUrl(url, 'so_0,w_600,c_limit,f_jpg,q_auto');
        return t ? t.replace(/\.[a-z0-9]+(\?.*)?$/i, '.jpg') : null;
    }

    function formatDuration(sec) {
        if (!sec || !isFinite(sec) || sec < 0) return '0:00';
        sec = Math.floor(sec);
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    // Reply quotes for media-only messages so the preview bar is never blank
    function quoteTextForMessage(message) {
        if (message.text && message.text.trim()) return message.text;
        if (message.media) {
            if (message.media.type === 'video') return '🎬 Video';
            if (message.media.type === 'gif') return 'GIF';
            return '📷 Photo';
        }
        return '';
    }

    // ─── Safe linkify ────────────────────────────────────
    // Renders plain-text URLs as real links WITHOUT innerHTML — only
    // createElement + textContent, so the XSS posture is unchanged.
    // Only http(s)/www. schemes are matched, so "javascript:" can never pass.
    const URL_RE = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;

    function setTextWithLinks(el, text) {
        el.textContent = '';
        let last = 0;
        URL_RE.lastIndex = 0;
        let m;
        while ((m = URL_RE.exec(text)) !== null) {
            let url = m[0];
            // Trim trailing punctuation back into plain text ("see foo.com." keeps the dot out)
            const trail = url.match(/[.,!?;:)]+$/);
            if (trail && url.length - trail[0].length >= 5) url = url.slice(0, url.length - trail[0].length);
            if (m.index > last) el.appendChild(document.createTextNode(text.slice(last, m.index)));
            if (url.length >= 5 && /^(https?:\/\/|www\.)/i.test(url)) {
                const a = document.createElement('a');
                a.className = 'chat-link';
                a.href = /^https?:\/\//i.test(url) ? url : 'https://' + url;
                a.textContent = url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer nofollow';
                el.appendChild(a);
            } else {
                // Too short/trimmed to be a real link — keep it as literal text
                el.appendChild(document.createTextNode(text.slice(m.index, m.index + url.length)));
            }
            last = m.index + url.length;
            URL_RE.lastIndex = last; // resume right after what we consumed
        }
        if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
    }

    // ─── Header Polish: sliding toggle glider + compress-on-scroll ──
    // Called once (guarded by chatSceneInited in initChatScene)
    function initHeaderPolish() {
        const toggle   = document.getElementById('chat-identity-toggle');
        const glider   = document.getElementById('toggle-glider');
        const header   = document.querySelector('.chat-header');
        const chatMessages = document.getElementById('chat-messages');

        const positionGlider = () => {
            if (!toggle || !glider) return;
            const active = toggle.querySelector('.toggle-btn.active');
            if (!active) return;
            // Transform-only positioning so the slide never triggers layout mid-anim
            glider.style.width  = active.offsetWidth + 'px';
            glider.style.height = active.offsetHeight + 'px';
            glider.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
        };
        positionToggleGlider = positionGlider; // exposed for identity selection/switch

        if (toggle && glider) {
            // Reposition after fonts/layout settle and on toggle clicks
            requestAnimationFrame(positionGlider);
            setTimeout(positionGlider, 350); // after Google Fonts swap
            toggle.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    requestAnimationFrame(positionGlider); // after class flip
                    haptic(12);
                });
            });
            window.addEventListener('resize', positionGlider, { passive: true });
            if ('ResizeObserver' in window) {
                const toggleResizeObserver = new ResizeObserver(() => {
                    requestAnimationFrame(positionGlider);
                });
                toggleResizeObserver.observe(toggle);
            }
        }

        // Header compresses once the user starts scrolling (rAF-throttled, passive)
        // Same listener also drives the scroll-to-bottom FAB visibility.
        const fab = document.getElementById('chat-scroll-fab');
        if (header && chatMessages) {
            let scrollTick = false;
            chatMessages.addEventListener('scroll', () => {
                if (scrollTick) return;
                scrollTick = true;
                requestAnimationFrame(() => {
                    scrollTick = false;
                    header.classList.toggle('compact', chatMessages.scrollTop > 24);
                    if (fab) {
                        const distFromBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
                        fab.classList.toggle('visible', distFromBottom > 300);
                        // Reaching the bottom = everything is seen; the divider
                        // persists while scrolled up so missed messages stay marked
                        if (distFromBottom < 80 && chatState.unreadCount > 0) {
                            setUnreadCount(0);
                            clearNewMessagesDivider();
                        }
                    }
                });
            }, { passive: true });
        }

        // FAB tap: glide to bottom + soft haptic; arriving counts as "all seen"
        if (fab) {
            fab.addEventListener('click', () => {
                if (chatMessages) smoothScrollToBottom(chatMessages);
                setUnreadCount(0);
                clearNewMessagesDivider();
                haptic([6]);
            });
        }
    }

    // Deliberate smooth scrolls only — permanent CSS smoothness makes message bursts swimmy
    function smoothScrollToBottom(el) {
        el.classList.add('smooth-scroll');
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        // Remove after the glide so incremental scrollTop writes stay instant
        setTimeout(() => el.classList.remove('smooth-scroll'), 600);
    }

    // ─── GIFs: GIPHY picker, runtime metadata, and message media ─────
    function isGiphyMediaUrl(url) {
        if (typeof url !== 'string' || !url) return false;
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'https:' && GIPHY_MEDIA_HOST_RE.test(parsed.hostname);
        } catch (e) {
            return false;
        }
    }

    function giphyNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) && number > 0 && number < 10000 ? number : 0;
    }

    function giphyText(value, fallback, maxLength = 160) {
        if (typeof value !== 'string') return fallback;
        const text = value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, maxLength);
        return text || fallback;
    }

    function giphyImageUrl(images, rendition) {
        const image = images && images[rendition];
        return image && isGiphyMediaUrl(image.url) ? image.url : '';
    }

    function readGiphyRuntimeItem(item) {
        if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !GIPHY_ID_RE.test(item.id)) return null;
        if (item.rating !== GIPHY_RATING) return null;
        const images = item.images && typeof item.images === 'object' ? item.images : {};
        const thumbUrl = giphyImageUrl(images, 'fixed_width_small') ||
            giphyImageUrl(images, 'fixed_width') || giphyImageUrl(images, 'fixed_height');
        const displayRendition = giphyImageUrl(images, 'fixed_width') ? 'fixed_width'
            : (giphyImageUrl(images, 'fixed_height') ? 'fixed_height' : 'downsized_medium');
        const displayUrl = giphyImageUrl(images, displayRendition) || thumbUrl;
        const fullUrl = giphyImageUrl(images, 'original') || displayUrl;
        if (!thumbUrl || !displayUrl) return null;

        const displayImage = images[displayRendition] || images.fixed_width || images.fixed_height || {};
        const title = giphyText(item.title, 'GIF', 160);
        return {
            id: item.id,
            title,
            alt: giphyText(item.alt_text, title === 'GIF' ? 'GIF shared in chat' : title, 160),
            rating: item.rating === 'g' ? 'g' : '',
            thumbUrl,
            displayUrl,
            stillUrl: giphyImageUrl(images, 'original_still') || giphyImageUrl(images, 'fixed_width_still') || '',
            fullUrl,
            rendition: displayRendition,
            width: giphyNumber(displayImage.width) || giphyNumber(item.images && item.images.original && item.images.original.width),
            height: giphyNumber(displayImage.height) || giphyNumber(item.images && item.images.original && item.images.original.height)
        };
    }

    function rememberGiphyItem(item) {
        const runtime = readGiphyRuntimeItem(item);
        if (!runtime) return null;
        chatState.giphyRuntimeById.set(runtime.id, runtime);
        // Keep the runtime-only map bounded; Firestore stores only the provider ID.
        while (chatState.giphyRuntimeById.size > 120) {
            const oldestId = chatState.giphyRuntimeById.keys().next().value;
            chatState.giphyRuntimeById.delete(oldestId);
        }
        return runtime;
    }

    function gifMediaFromRuntime(runtime) {
        if (!runtime) return null;
        return {
            type: 'gif',
            provider: 'giphy',
            providerId: runtime.id,
            rendition: runtime.rendition || 'fixed_width',
            width: runtime.width || 0,
            height: runtime.height || 0,
            title: runtime.title,
            alt: runtime.alt,
            rating: 'g'
        };
    }

    function buildGifApiUrl(path, params = {}) {
        const url = new URL(`${GIPHY_API_BASE}/${path}`);
        url.searchParams.set('api_key', GIPHY_API_KEY);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
        });
        return url;
    }

    async function fetchGiphyJson(url, controller) {
        const timeout = setTimeout(() => {
            if (controller) controller.abort();
        }, GIPHY_REQUEST_TIMEOUT_MS);
        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: { Accept: 'application/json' },
                signal: controller ? controller.signal : undefined
            });
            let payload = null;
            try { payload = await response.json(); } catch (e) { /* invalid JSON */ }
            if (!response.ok || !payload || !payload.data) {
                const error = new Error('GIPHY request failed');
                error.status = response.status || 0;
                throw error;
            }
            return payload;
        } finally {
            clearTimeout(timeout);
        }
    }

    function abortGiphySearch() {
        if (chatState.giphySearchAbortController) {
            try { chatState.giphySearchAbortController.abort(); } catch (e) { /* noop */ }
            chatState.giphySearchAbortController = null;
        }
    }

    function abortGiphyLookups() {
        chatState.giphyLookupById.forEach(record => {
            try { record.controller.abort(); } catch (e) { /* noop */ }
        });
        chatState.giphyLookupById.clear();
    }

    function abortGiphyRequests() {
        abortGiphySearch();
        abortGiphyLookups();
    }

    function resetGifPickerForLifecycle(clearRuntime = false) {
        closeChatAddMenu(false);
        chatState.giphyLifecycleRunId++;
        chatState.giphySearchRunId++;
        clearTimeout(chatState.giphySearchTimer);
        chatState.giphySearchTimer = null;
        abortGiphyRequests();
        chatState.giphyPickerOpen = false;
        chatState.giphySearchItems = [];
        chatState.giphySearchOffset = 0;
        chatState.giphySearchQuery = '';
        chatState.giphySearchHasMore = false;
        chatState.giphySearchLoading = false;
        chatState.pendingGif = null;
        if (clearRuntime) chatState.giphyRuntimeById.clear();

        const picker = document.getElementById('chat-gif-picker');
        if (picker) {
            picker.classList.remove('open');
            picker.style.display = 'none';
            picker.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.remove('chat-gif-open');
        const preview = document.getElementById('chat-gif-preview');
        if (preview) preview.style.display = 'none';
        const previewThumb = document.getElementById('chat-gif-preview-thumb');
        if (previewThumb) previewThumb.replaceChildren();
        const results = document.getElementById('chat-gif-results');
        if (results) {
            results.replaceChildren();
            results.setAttribute('aria-busy', 'false');
        }
        const loadMore = document.getElementById('chat-gif-load-more');
        if (loadMore) loadMore.style.display = 'none';
        const retry = document.getElementById('chat-gif-retry');
        if (retry) retry.style.display = 'none';
        const search = document.getElementById('chat-gif-search');
        if (search) search.value = '';
        syncSendButtonState();
        syncInputBarHeight();
    }

    function refreshGiphyBubbles(providerId) {
        if (!providerId) return;
        chatState.renderedIds.forEach((bubble, messageId) => {
            const message = chatState.messages.find(item => item.id === messageId);
            if (!message || !message.media || message.media.type !== 'gif' || message.media.providerId !== providerId) return;
            const oldMedia = bubble.querySelector('.chat-media-gif');
            if (oldMedia) oldMedia.replaceWith(buildGifMedia(message));
        });
    }

    function showGifErrorIn(container, message, retry) {
        container.replaceChildren();
        const box = document.createElement('div');
        box.className = 'chat-media-error chat-gif-error';
        const icon = document.createElement('span');
        icon.className = 'chat-media-error-icon';
        icon.textContent = 'GIF';
        const label = document.createElement('span');
        label.className = 'chat-media-error-text';
        label.textContent = message || 'GIF unavailable';
        box.appendChild(icon);
        box.appendChild(label);
        if (retry) {
            const retryButton = document.createElement('button');
            retryButton.className = 'chat-media-retry';
            retryButton.type = 'button';
            retryButton.textContent = '↻ Retry';
            retryButton.addEventListener('click', event => {
                event.stopPropagation();
                retry();
            });
            box.appendChild(retryButton);
        }
        container.appendChild(box);
    }

    function ensureGiphyMetadata(providerId) {
        if (!GIPHY_API_KEY || !GIPHY_ID_RE.test(providerId || '')) {
            return Promise.reject(new Error('GIPHY is not configured'));
        }
        const current = chatState.giphyRuntimeById.get(providerId);
        if (current) return Promise.resolve(current);
        const active = chatState.giphyLookupById.get(providerId);
        if (active) return active.promise;

        const lifecycleRunId = chatState.giphyLifecycleRunId;
        const controller = window.AbortController ? new AbortController() : null;
        const url = buildGifApiUrl(`gifs/${encodeURIComponent(providerId)}`);
        const promise = fetchGiphyJson(url, controller)
            .then(payload => {
                if (lifecycleRunId !== chatState.giphyLifecycleRunId) throw new Error('Stale GIPHY response');
                const runtime = rememberGiphyItem(payload.data);
                if (!runtime || runtime.id !== providerId) throw new Error('Invalid GIPHY response');
                refreshGiphyBubbles(providerId);
                return runtime;
            })
            .finally(() => {
                const record = chatState.giphyLookupById.get(providerId);
                if (record && record.promise === promise) chatState.giphyLookupById.delete(providerId);
            });
        chatState.giphyLookupById.set(providerId, { promise, controller });
        return promise;
    }

    function buildGifMedia(message) {
        const media = message.media;
        const lifecycleRunId = chatState.giphyLifecycleRunId;
        const wrap = document.createElement('div');
        wrap.className = 'chat-media-gif';
        wrap.dataset.giphyId = media.providerId;
        wrap.style.aspectRatio = (media.width > 0 && media.height > 0)
            ? `${media.width} / ${media.height}`
            : '16 / 10';

        const runtime = chatState.giphyRuntimeById.get(media.providerId);
        if (!runtime) {
            const loading = document.createElement('div');
            loading.className = 'chat-gif-loading';
            loading.textContent = GIPHY_API_KEY ? 'Loading GIF…' : 'GIF unavailable';
            wrap.appendChild(loading);
            if (GIPHY_API_KEY) {
                ensureGiphyMetadata(media.providerId).catch(() => {
                    if (lifecycleRunId !== chatState.giphyLifecycleRunId) return;
                    if (wrap.isConnected) {
                        showGifErrorIn(wrap, 'GIF unavailable', () => {
                            wrap.replaceWith(buildGifMedia(message));
                        });
                    }
                });
            }
            return wrap;
        }

        const img = document.createElement('img');
        img.className = 'chat-gif-img';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.alt = media.alt || runtime.alt || 'GIF shared in chat';
        img.referrerPolicy = 'no-referrer';
        if (runtime.width > 0) img.width = runtime.width;
        if (runtime.height > 0) img.height = runtime.height;
        const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        img.src = reduceMotion && runtime.stillUrl ? runtime.stillUrl : runtime.displayUrl;
        img.addEventListener('error', () => {
            if (lifecycleRunId !== chatState.giphyLifecycleRunId) return;
            showGifErrorIn(wrap, 'GIF unavailable', () => {
                chatState.giphyRuntimeById.delete(media.providerId);
                wrap.replaceWith(buildGifMedia(message));
            });
        });
        img.addEventListener('click', event => {
            event.stopPropagation();
            openLightbox(runtime.fullUrl || runtime.displayUrl, img.alt);
        });
        wrap.appendChild(img);
        return wrap;
    }

    function setGifPickerStatus(message) {
        const status = document.getElementById('chat-gif-status');
        if (status) status.textContent = message;
    }

    function setGifRetryVisible(visible) {
        const retry = document.getElementById('chat-gif-retry');
        if (retry) {
            retry.style.display = visible ? 'inline-flex' : 'none';
            retry.disabled = !visible;
        }
    }

    function renderGifResults() {
        const results = document.getElementById('chat-gif-results');
        const loadMore = document.getElementById('chat-gif-load-more');
        if (!results) return;
        results.replaceChildren();

        if (chatState.giphySearchLoading && !chatState.giphySearchItems.length) {
            for (let index = 0; index < 6; index += 1) {
                const skeleton = document.createElement('div');
                skeleton.className = 'chat-gif-skeleton';
                skeleton.setAttribute('aria-hidden', 'true');
                results.appendChild(skeleton);
            }
        } else if (!chatState.giphySearchItems.length) {
            const empty = document.createElement('p');
            empty.className = 'chat-gif-empty';
            empty.textContent = 'No GIFs found.';
            results.appendChild(empty);
        } else {
            chatState.giphySearchItems.forEach(runtime => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'chat-gif-result';
                button.dataset.giphyId = runtime.id;
                button.setAttribute('aria-label', `Select GIF: ${runtime.title}`);
                const img = document.createElement('img');
                img.src = runtime.thumbUrl;
                img.alt = runtime.alt;
                img.loading = 'lazy';
                img.decoding = 'async';
                img.referrerPolicy = 'no-referrer';
                let triedDisplayRendition = false;
                img.addEventListener('error', () => {
                    if (!triedDisplayRendition && runtime.displayUrl && runtime.displayUrl !== runtime.thumbUrl) {
                        triedDisplayRendition = true;
                        img.src = runtime.displayUrl;
                        return;
                    }
                    button.remove();
                });
                button.appendChild(img);
                button.addEventListener('click', () => selectGif(runtime.id));
                results.appendChild(button);
            });
        }
        if (loadMore) {
            loadMore.style.display = chatState.giphySearchHasMore ? 'inline-flex' : 'none';
            loadMore.disabled = chatState.giphySearchLoading;
        }
    }

    async function fetchGifResults(query, offset = 0, append = false) {
        if (!GIPHY_API_KEY) {
            chatState.giphySearchLoading = false;
            setGifRetryVisible(false);
            renderGifResults();
            setGifPickerStatus('GIF search is not configured yet.');
            return;
        }
        if (navigator.onLine === false) {
            chatState.giphySearchLoading = false;
            setGifRetryVisible(true);
            renderGifResults();
            setGifPickerStatus('You appear to be offline. Reconnect and try again.');
            return;
        }
        const trimmedQuery = (query || '').trim().slice(0, GIPHY_QUERY_MAX_LENGTH);
        if (trimmedQuery && trimmedQuery.length < 2) {
            chatState.giphySearchLoading = false;
            setGifRetryVisible(false);
            chatState.giphySearchItems = [];
            chatState.giphySearchHasMore = false;
            renderGifResults();
            setGifPickerStatus('Type at least 2 characters to search.');
            return;
        }

        const runId = ++chatState.giphySearchRunId;
        clearTimeout(chatState.giphySearchTimer);
        abortGiphySearch();
        const controller = window.AbortController ? new AbortController() : null;
        chatState.giphySearchAbortController = controller;
        chatState.giphySearchQuery = trimmedQuery;
        chatState.giphySearchOffset = offset;
        chatState.giphySearchLoading = true;
        const results = document.getElementById('chat-gif-results');
        if (results) results.setAttribute('aria-busy', 'true');
        setGifRetryVisible(false);
        renderGifResults();
        setGifPickerStatus(trimmedQuery ? 'Searching GIFs…' : 'Loading trending GIFs…');

        const endpoint = trimmedQuery ? 'gifs/search' : 'gifs/trending';
        const url = buildGifApiUrl(endpoint, {
            q: trimmedQuery || undefined,
            limit: GIPHY_RESULT_LIMIT,
            offset,
            rating: GIPHY_RATING,
            lang: 'en',
            bundle: 'messaging_non_clips'
        });

        try {
            const payload = await fetchGiphyJson(url, controller);
            if (runId !== chatState.giphySearchRunId || !chatState.giphyPickerOpen) return;
            const incoming = Array.isArray(payload.data) ? payload.data.map(rememberGiphyItem).filter(Boolean) : [];
            chatState.giphySearchItems = append
                ? chatState.giphySearchItems.concat(incoming)
                : incoming;
            const pagination = payload.pagination && typeof payload.pagination === 'object' ? payload.pagination : {};
            const received = Number(pagination.count) || incoming.length;
            chatState.giphySearchOffset = offset + received;
            const total = Number(pagination.total_count) || 0;
            chatState.giphySearchHasMore = received > 0 && (total === 0 || offset + received < total);
            chatState.giphySearchLoading = false;
            setGifRetryVisible(false);
            renderGifResults();
            if (append && results) {
                requestAnimationFrame(() => {
                    if (!chatState.giphyPickerOpen || runId !== chatState.giphySearchRunId) return;
                    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                    results.scrollTo({
                        top: Math.max(0, results.scrollHeight - results.clientHeight),
                        behavior: reducedMotion ? 'auto' : 'smooth'
                    });
                });
            }
            setGifPickerStatus(chatState.giphySearchItems.length
                ? (trimmedQuery ? `${chatState.giphySearchItems.length} GIFs found.` : 'Trending GIFs.')
                : 'No GIFs found.');
        } catch (error) {
            if (runId !== chatState.giphySearchRunId || (error && error.name === 'AbortError')) return;
            chatState.giphySearchItems = append ? chatState.giphySearchItems : [];
            chatState.giphySearchHasMore = false;
            chatState.giphySearchLoading = false;
            setGifRetryVisible(true);
            renderGifResults();
            const statusMessage = navigator.onLine === false
                ? 'You appear to be offline. Reconnect and try again.'
                : error && error.status === 429
                    ? 'GIF search is rate limited. Please wait and try again.'
                    : error && error.status >= 400
                        ? 'GIPHY could not complete that request. Try again.'
                        : 'GIFs could not load. Check your connection and try again.';
            setGifPickerStatus(statusMessage);
        } finally {
            if (runId === chatState.giphySearchRunId) {
                chatState.giphySearchAbortController = null;
                if (results) results.setAttribute('aria-busy', 'false');
            }
        }
    }

    function scheduleGifSearch(query) {
        clearTimeout(chatState.giphySearchTimer);
        chatState.giphySearchTimer = null;
        chatState.giphySearchRunId++;
        abortGiphySearch();
        chatState.giphySearchTimer = setTimeout(() => {
            chatState.giphySearchTimer = null;
            fetchGifResults(query, 0, false);
        }, 300);
    }

    function renderGifPreview() {
        const preview = document.getElementById('chat-gif-preview');
        const thumb = document.getElementById('chat-gif-preview-thumb');
        const name = document.getElementById('chat-gif-preview-name');
        const status = document.getElementById('chat-gif-preview-status');
        const pending = chatState.pendingGif;
        if (!preview || !thumb) return;
        if (!pending || !pending.runtime) {
            preview.style.display = 'none';
            syncSendButtonState();
            syncInputBarHeight();
            return;
        }
        thumb.replaceChildren();
        const img = document.createElement('img');
        img.src = pending.runtime.thumbUrl || pending.runtime.displayUrl;
        img.alt = 'Selected GIF preview';
        img.loading = 'eager';
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.addEventListener('error', () => {
            if (pending.runtime.displayUrl && img.src !== pending.runtime.displayUrl) img.src = pending.runtime.displayUrl;
        });
        thumb.appendChild(img);
        if (name) name.textContent = pending.runtime.title || 'GIF ready to send';
        if (status) status.textContent = 'GIF selected · ready to send';
        preview.style.display = 'flex';
        syncSendButtonState();
        syncInputBarHeight();
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            const nearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 120;
            if (nearBottom) requestAnimationFrame(() => { chatMessages.scrollTop = chatMessages.scrollHeight; });
        }
    }

    function hideGifPreview() {
        const preview = document.getElementById('chat-gif-preview');
        if (preview) preview.style.display = 'none';
        const thumb = document.getElementById('chat-gif-preview-thumb');
        if (thumb) thumb.replaceChildren();
        syncInputBarHeight();
    }

    function clearGifPreview(announce = false) {
        chatState.pendingGif = null;
        const preview = document.getElementById('chat-gif-preview');
        if (preview) preview.style.display = 'none';
        const thumb = document.getElementById('chat-gif-preview-thumb');
        if (thumb) thumb.replaceChildren();
        syncSendButtonState();
        syncInputBarHeight();
        if (announce) showToast('GIF removed', false);
    }

    function selectGif(providerId) {
        if (!chatState.currentIdentity || !chatState.chatUnlocked) return;
        if (chatState.pendingAttachment) {
            showToast('Remove the current attachment before choosing a GIF', true);
            return;
        }
        const runtime = chatState.giphyRuntimeById.get(providerId);
        const media = gifMediaFromRuntime(runtime);
        if (!runtime || !media) {
            showToast('That GIF is unavailable', true);
            return;
        }
        chatState.pendingGif = { media, runtime };
        renderGifPreview();
        closeGifPicker();
    }

    function openGifPicker() {
        if (!chatState.currentIdentity || !chatState.chatUnlocked) return;
        if (chatState.pendingAttachment) {
            showToast('Remove the current attachment before choosing a GIF', true);
            return;
        }
        const picker = document.getElementById('chat-gif-picker');
        const search = document.getElementById('chat-gif-search');
        if (!picker || chatState.giphyPickerOpen) return;
        chatState.giphyPickerOpen = true;
        syncSendButtonState();
        picker.style.display = 'flex';
        picker.setAttribute('aria-hidden', 'false');
        document.body.classList.add('chat-gif-open');
        requestAnimationFrame(() => picker.classList.add('open'));
        const chatInput = document.getElementById('chat-input');
        if (chatInput) chatInput.blur();
        if (search) {
            search.value = '';
            search.focus({ preventScroll: true });
        }
        fetchGifResults('', 0, false);
    }

    function closeGifPicker() {
        const picker = document.getElementById('chat-gif-picker');
        const button = document.getElementById('chat-plus-btn');
        if (!picker) return;
        chatState.giphyPickerOpen = false;
        syncSendButtonState();
        chatState.giphySearchRunId++;
        clearTimeout(chatState.giphySearchTimer);
        chatState.giphySearchTimer = null;
        abortGiphySearch();
        chatState.giphySearchItems = [];
        chatState.giphySearchOffset = 0;
        chatState.giphySearchQuery = '';
        chatState.giphySearchHasMore = false;
        chatState.giphySearchLoading = false;
        const results = document.getElementById('chat-gif-results');
        if (results) {
            results.replaceChildren();
            results.setAttribute('aria-busy', 'false');
        }
        const loadMore = document.getElementById('chat-gif-load-more');
        if (loadMore) loadMore.style.display = 'none';
        const retry = document.getElementById('chat-gif-retry');
        if (retry) retry.style.display = 'none';
        picker.classList.remove('open');
        picker.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('chat-gif-open');
        setTimeout(() => {
            if (!chatState.giphyPickerOpen) picker.style.display = 'none';
        }, 220);
        if (button && button.isConnected) button.focus({ preventScroll: true });
    }

    function initGifPicker() {
        if (initGifPicker._inited) return;
        const gifButton = document.getElementById('chat-gif-btn');
        const picker = document.getElementById('chat-gif-picker');
        const closeButton = document.getElementById('chat-gif-close');
        const search = document.getElementById('chat-gif-search');
        const loadMore = document.getElementById('chat-gif-load-more');
        const retry = document.getElementById('chat-gif-retry');
        const results = document.getElementById('chat-gif-results');
        const previewCancel = document.getElementById('chat-gif-preview-cancel');
        if (!gifButton || !picker || !search || !results) return;
        initGifPicker._inited = true;

        gifButton.addEventListener('click', () => {
            closeChatAddMenu(false);
            openGifPicker();
        });
        if (closeButton) closeButton.addEventListener('click', closeGifPicker);
        picker.addEventListener('click', event => {
            if (event.target === picker) closeGifPicker();
        });
        search.addEventListener('input', () => {
            const value = search.value.trim();
            if (value.length === 1) {
                clearTimeout(chatState.giphySearchTimer);
                chatState.giphySearchTimer = null;
                chatState.giphySearchRunId++;
                abortGiphySearch();
                chatState.giphySearchItems = [];
                chatState.giphySearchHasMore = false;
                chatState.giphySearchLoading = false;
                renderGifResults();
                setGifPickerStatus('Type at least 2 characters to search.');
                return;
            }
            scheduleGifSearch(value);
        });
        search.addEventListener('keydown', event => {
            if (event.key === 'Enter') event.preventDefault();
        });
        if (loadMore) loadMore.addEventListener('click', () => {
            if (!chatState.giphySearchHasMore || chatState.giphySearchLoading) return;
            fetchGifResults(chatState.giphySearchQuery, chatState.giphySearchOffset, true);
        });
        if (retry) retry.addEventListener('click', () => {
            if (chatState.giphySearchLoading) return;
            const append = chatState.giphySearchItems.length > 0;
            fetchGifResults(chatState.giphySearchQuery, append ? chatState.giphySearchOffset : 0, append);
        });
        if (previewCancel) previewCancel.addEventListener('click', () => clearGifPreview(true));

        picker.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeGifPicker();
                return;
            }
            if (event.key !== 'Tab') return;
            const focusable = [search, closeButton, ...results.querySelectorAll('button'), retry, loadMore]
                .filter(element => element && element.style.display !== 'none' && !element.disabled);
            if (!focusable.length) {
                event.preventDefault();
                picker.focus();
                return;
            }
            event.preventDefault();
            const index = focusable.indexOf(document.activeElement);
            const next = index === -1
                ? (event.shiftKey ? focusable.length - 1 : 0)
                : (index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
            focusable[next].focus();
        });
    }

    // ─── Media: Attachment Picker & Upload ───────────────
    function initMediaAttachments() {
        const attachBtn     = document.getElementById('chat-attach-btn');
        const fileInput     = document.getElementById('chat-file-input');
        const cancelBtn     = document.getElementById('chat-attachment-cancel');
        const retryBtn      = document.getElementById('chat-attachment-retry');
        const lightbox      = document.getElementById('chat-lightbox');
        const lightboxClose = document.getElementById('chat-lightbox-close');

        if (attachBtn && fileInput) {
            attachBtn.addEventListener('click', () => {
                closeChatAddMenu(false);
                fileInput.click();
            });
            fileInput.addEventListener('change', () => {
                const file = fileInput.files && fileInput.files[0];
                fileInput.value = ''; // allow re-selecting the same file
                if (file) handleAttachmentSelected(file);
            });
        }
        if (cancelBtn) cancelBtn.addEventListener('click', () => cancelPendingAttachment(true));
        if (retryBtn)  retryBtn.addEventListener('click', retryAttachmentUpload);
        if (lightbox) {
            lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
        }
        if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });
    }

    function handleAttachmentSelected(file) {
        if (chatState.pendingGif) {
            showToast('Remove the selected GIF before attaching a photo or video', true);
            return;
        }
        if (!navigator.onLine) { showToast('You are offline 📡 media needs a connection', true); return; }

        const kind = file.type.startsWith('image/') ? 'image'
                   : file.type.startsWith('video/') ? 'video' : null;
        if (!kind) { showToast('Only photos or videos 💜', true); return; }

        const maxBytes = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
        if (file.size > maxBytes) {
            showToast((kind === 'image' ? 'Photo' : 'Video') + ' too large — max '
                + (kind === 'image' ? '25' : '100') + ' MB 😢', true);
            return;
        }

        cancelPendingAttachment(false); // silently replace any previous staged upload

        chatState.pendingAttachment = {
            file,
            previewUrl: URL.createObjectURL(file),
            kind,
            fileName: file.name || (kind === 'image' ? 'photo' : 'video'),
            fileSize: file.size,
            status: 'uploading',
            progress: 0,
            media: null,
            xhr: null
        };
        renderAttachmentStrip();
        startAttachmentUpload();
    }

    function startAttachmentUpload() {
        const att = chatState.pendingAttachment;
        if (!att || !att.file) return;
        try {
            const fd = new FormData();
            fd.append('file', att.file);
            fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            const xhr = new XMLHttpRequest();
            att.xhr = xhr;
            xhr.open('POST', CLOUDINARY_UPLOAD_URL);

            xhr.upload.onprogress = e => {
                if (e.lengthComputable && chatState.pendingAttachment === att) {
                    att.progress = Math.round((e.loaded / e.total) * 100);
                    updateAttachmentStripProgress();
                }
            };
            xhr.onload = () => {
                if (chatState.pendingAttachment !== att) return; // was cancelled meanwhile
                att.xhr = null;
                let res = null;
                try { res = JSON.parse(xhr.responseText); } catch (e) { /* leave null */ }
                if (xhr.status >= 200 && xhr.status < 300 && res && res.secure_url) {
                    att.media = {
                        type:     res.resource_type === 'video' ? 'video' : 'image',
                        publicId: res.public_id || '',
                        url:      res.secure_url,
                        width:    typeof res.width  === 'number' ? res.width  : 0,
                        height:   typeof res.height === 'number' ? res.height : 0,
                        duration: typeof res.duration === 'number' ? res.duration : null,
                        format:   res.format || '',
                        bytes:    typeof res.bytes === 'number' ? res.bytes : att.fileSize
                    };
                    att.kind = att.media.type; // trust Cloudinary's resource_type over our guess
                    att.status = 'ready';
                    renderAttachmentStrip();
                } else {
                    console.error('Cloudinary upload failed:', xhr.status, xhr.responseText);
                    att.status = 'error';
                    renderAttachmentStrip();
                    showToast(
                        (xhr.responseText && /preset/i.test(xhr.responseText))
                            ? 'Upload preset not found — check Cloudinary settings ⚙️'
                            : 'Upload failed 😢 tap ↻ to retry',
                        true
                    );
                }
            };
            xhr.onerror = () => {
                if (chatState.pendingAttachment !== att) return;
                att.xhr = null;
                att.status = 'error';
                renderAttachmentStrip();
                showToast('Upload failed 😢 check your connection', true);
            };
            xhr.onabort = () => {
                // Safety net: cancelPendingAttachment normally handles cleanup first
                if (chatState.pendingAttachment === att) { discardPendingAttachment(); clearAttachmentUI(); }
            };
            xhr.send(fd);
        } catch (err) {
            console.error('Upload start error:', err);
            att.status = 'error';
            renderAttachmentStrip();
        }
    }

    function retryAttachmentUpload() {
        const att = chatState.pendingAttachment;
        if (!att || !att.file) return;
        if (!navigator.onLine) { showToast('Still offline 📡', true); return; }
        att.status = 'uploading';
        att.progress = 0;
        renderAttachmentStrip();
        startAttachmentUpload();
    }

    function cancelPendingAttachment(announce) {
        const att = chatState.pendingAttachment;
        if (!att) return;
        if (att.xhr) { try { att.xhr.abort(); } catch (e) { /* noop */ } }
        discardPendingAttachment();
        clearAttachmentUI();
        if (announce) showToast('Attachment removed', false);
    }

    function discardPendingAttachment() {
        const att = chatState.pendingAttachment;
        if (att && att.previewUrl) { try { URL.revokeObjectURL(att.previewUrl); } catch (e) { /* noop */ } }
        chatState.pendingAttachment = null;
        syncSendButtonState();
    }

    function clearAttachmentUI() {
        const container = document.getElementById('chat-attachment-container');
        if (container) container.style.display = 'none';
        syncSendButtonState();
        // P2: attachment bar hidden — update dynamic height
        syncInputBarHeight();
    }

    function renderAttachmentStrip() {
        const container   = document.getElementById('chat-attachment-container');
        const thumb       = document.getElementById('chat-attachment-thumb');
        const nameEl      = document.getElementById('chat-attachment-name');
        const statusEl    = document.getElementById('chat-attachment-status');
        const retryBtn    = document.getElementById('chat-attachment-retry');
        const progressWrap = container ? container.querySelector('.chat-attachment-progress') : null;
        const att = chatState.pendingAttachment;
        if (!container) return;
        if (!att) { container.style.display = 'none'; return; }

        container.style.display = 'flex';

        // Thumbnail: local object-URL preview for images, icon for videos
        if (thumb) {
            thumb.replaceChildren();
            if (att.kind === 'image') {
                const im = document.createElement('img');
                im.className = 'chat-attachment-thumb-img';
                im.src = att.previewUrl;
                im.alt = 'Attachment preview';
                thumb.appendChild(im);
            } else {
                const icon = document.createElement('span');
                icon.className = 'chat-attachment-thumb-icon';
                icon.textContent = '🎬';
                thumb.appendChild(icon);
            }
        }
        if (nameEl) { nameEl.textContent = att.fileName; nameEl.title = att.fileName; }

        if (att.status === 'uploading') {
            if (progressWrap) progressWrap.style.display = 'block';
            if (retryBtn) retryBtn.style.display = 'none';
        } else if (att.status === 'ready') {
            if (progressWrap) progressWrap.style.display = 'none';
            if (statusEl) statusEl.textContent = '✓ Ready to send';
            if (retryBtn) retryBtn.style.display = 'none';
        } else { // 'error'
            if (progressWrap) progressWrap.style.display = 'none';
            if (statusEl) statusEl.textContent = 'Upload failed';
            if (retryBtn) retryBtn.style.display = 'inline-flex';
        }
        syncSendButtonState();
        updateAttachmentStripProgress();
        // P2: attachment strip height changed — keep last bubble visible
        syncInputBarHeight();
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            const wasAtBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 120;
            if (wasAtBottom) requestAnimationFrame(() => { chatMessages.scrollTop = chatMessages.scrollHeight; });
        }
    }

    function updateAttachmentStripProgress() {
        const fill     = document.getElementById('chat-attachment-progress-fill');
        const statusEl = document.getElementById('chat-attachment-status');
        const att = chatState.pendingAttachment;
        if (!att || !fill) return;
        fill.style.transform = 'scaleX(' + Math.min((att.progress || 0) / 100, 1) + ')';
        if (statusEl && att.status === 'uploading') {
            statusEl.textContent = 'Uploading… ' + (att.progress || 0) + '%';
        }
    }

    // ─── Media: Secure URL Gate & Error Placeholders ─────
    function showMediaErrorIn(container, kind, rebuildFn) {
        container.replaceChildren();
        const box = document.createElement('div');
        box.className = 'chat-media-error';
        const icon = document.createElement('span');
        icon.className = 'chat-media-error-icon';
        icon.textContent = kind === 'video' ? '🎬' : '📷';
        const label = document.createElement('span');
        label.className = 'chat-media-error-text';
        label.textContent = (kind === 'video' ? 'Video' : 'Photo') + ' unavailable';
        box.appendChild(icon);
        box.appendChild(label);
        if (rebuildFn) {
            const retry = document.createElement('button');
            retry.className = 'chat-media-retry';
            retry.type = 'button';
            retry.textContent = '↻ Retry';
            retry.addEventListener('click', e => { e.stopPropagation(); rebuildFn(); });
            box.appendChild(retry);
        }
        container.appendChild(box);
    }

    // ─── Media: Image Bubbles (+ Lightbox) ───────────────
    function buildImageMedia(message) {
        const media = message.media;
        const wrap = document.createElement('div');
        wrap.className = 'chat-media-image';
        if (media.width > 0 && media.height > 0) {
            wrap.style.aspectRatio = media.width + ' / ' + media.height; // reserve space → no layout jump
        }
        const thumb = cldUrl(media.url, 'f_auto,q_auto,w_800,c_limit');
        const full  = cldUrl(media.url, 'f_auto,q_auto,w_1600,c_limit');
        if (!thumb) { showMediaErrorIn(wrap, 'image', null); return wrap; } // non-Cloudinary URL → defensive placeholder

        const img = document.createElement('img');
        img.className = 'chat-media-img';
        img.setAttribute('loading', 'lazy');
        img.setAttribute('decoding', 'async');
        img.alt = message.text ? message.text.substring(0, 100) : 'Photo shared in chat';
        if (media.width > 0)  img.width  = media.width;
        if (media.height > 0) img.height = media.height;
        img.addEventListener('error', () => {
            showMediaErrorIn(wrap, 'image', () => { wrap.replaceWith(buildImageMedia(message)); });
        });
        // Fade in on load — the reserved aspect-ratio box prevents layout jump
        img.addEventListener('load', () => { img.classList.add('loaded'); });
        img.addEventListener('click', e => { e.stopPropagation(); openLightbox(full || thumb, img.alt); });
        img.src = thumb;
        if (img.complete && img.naturalWidth > 0) img.classList.add('loaded'); // cache-hit path
        wrap.appendChild(img);
        return wrap;
    }

    let lightboxReturnFocus = null;

    function openLightbox(src, altText) {
        const lb  = document.getElementById('chat-lightbox');
        const img = document.getElementById('chat-lightbox-img');
        if (!lb || !img || !src) return;
        img.src = src;
        img.alt = altText || 'Photo';
        lb.style.display = 'flex';
        document.body.classList.add('chat-lightbox-open');
        lightboxReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const closeBtn = document.getElementById('chat-lightbox-close');
        if (closeBtn) closeBtn.focus({ preventScroll: true });
    }

    function closeLightbox() {
        const lb  = document.getElementById('chat-lightbox');
        const img = document.getElementById('chat-lightbox-img');
        if (!lb || lb.style.display === 'none') return;
        lb.style.display = 'none';
        if (img) img.removeAttribute('src');
        document.body.classList.remove('chat-lightbox-open');
        if (lightboxReturnFocus && lightboxReturnFocus.isConnected) {
            lightboxReturnFocus.focus({ preventScroll: true });
        }
        lightboxReturnFocus = null;
    }

    // ─── Message Info Bottom Sheet (long-press a sent message) ──
    // Shows the sent time plus who read the message and when (readBy map).
    let msgInfoSheetInited = false;
    const longPressState   = { timer: null, x: 0, y: 0, valid: false };
    let suppressNextClick  = false; // swallow the click that follows a successful long-press
    let msgInfoReturnFocus = null;  // element to restore focus to on sheet close

    function initMessageInfoSheet() {
        if (msgInfoSheetInited) return;
        msgInfoSheetInited = true;
        const container = document.getElementById('chat-messages');
        const overlay   = document.getElementById('msg-info-overlay');
        if (!container || !overlay) return;

        // Long-press detection — Pointer Events cover touch, mouse and pen alike.
        // Delegated on #chat-messages so reconciliation (bubbles created/updated
        // in place) never needs per-bubble listeners.
        container.addEventListener('pointerdown', e => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;      // left press only
            const bubble = e.target.closest('.chat-bubble');
            if (!bubble || !bubble.dataset.id) return;
            const msg = chatState.messages.find(m => m.id === bubble.dataset.id);
            // Meaningful on SENT messages only ("who read MY message")
            if (!msg || msg.sender !== chatState.currentIdentity || msg.pending) return;
            longPressState.x = e.clientX;
            longPressState.y = e.clientY;
            longPressState.valid = true;
            clearTimeout(longPressState.timer);
            longPressState.timer = setTimeout(() => {
                longPressState.timer = null;
                if (!longPressState.valid) return;
                longPressState.valid = false;
                haptic(14);
                openMessageInfoSheet(msg.id);
                suppressNextClick = true;                                 // release would otherwise click through
            }, LONG_PRESS_MS);
        }, { passive: true });

        const cancelLongPress = e => {
            if (longPressState.timer && e.type === 'pointermove') {
                const dx = e.clientX - longPressState.x, dy = e.clientY - longPressState.y;
                if ((dx * dx) + (dy * dy) > 144) {                        // moved >12px → it's a scroll
                    clearTimeout(longPressState.timer);
                    longPressState.timer = null;
                }
                return;
            }
            clearTimeout(longPressState.timer);
            longPressState.timer = null;
        };
        container.addEventListener('pointermove', cancelLongPress, { passive: true });
        container.addEventListener('pointerup', cancelLongPress, { passive: true });
        container.addEventListener('pointercancel', cancelLongPress, { passive: true });
        container.addEventListener('pointerleave', cancelLongPress, { passive: true });

        // Mobile long-press must not summon the browser menu or text selection
        container.addEventListener('contextmenu', e => {
            if (e.target.closest('.chat-bubble')) e.preventDefault();
        });

        // One-shot capture-phase click swallow (fires before Reply/Edit handlers)
        document.addEventListener('click', e => {
            if (!suppressNextClick) return;
            suppressNextClick = false;
            e.stopPropagation();
            e.preventDefault();
        }, true);

        overlay.addEventListener('click', e => { if (e.target === overlay) closeMessageInfoSheet(); });
        const closeBtn = document.getElementById('msg-info-close');
        if (closeBtn) closeBtn.addEventListener('click', closeMessageInfoSheet);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMessageInfoSheet(); });

        // Swipe-down-to-close: sheet follows the finger, springs back or dismisses.
        // Only engages when the sheet's inner scroll is at the top, so long content
        // still scrolls normally (CSS touch-action: pan-y cooperates).
        const sheet = document.getElementById('msg-info-sheet');
        if (sheet) {
            let drag = null;
            sheet.addEventListener('pointerdown', e => {
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                if (sheet.scrollTop > 0) return;                          // scrolled content: let it scroll
                if (e.target.closest('.msg-info-close')) return;          // don't hijack the close button
                drag = { startY: e.clientY, dy: 0, pointerId: e.pointerId };
                try { sheet.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
            });
            sheet.addEventListener('pointermove', e => {
                if (!drag || e.pointerId !== drag.pointerId) return;
                drag.dy = Math.max(0, e.clientY - drag.startY);           // downward only
                if (drag.dy > 8) {
                    suppressNextClick = true;                             // release must not hit a button
                    sheet.style.transition = 'none';
                    sheet.style.transform = `translateY(${drag.dy}px)`;
                    overlay.style.opacity = String(Math.max(0.25, 1 - drag.dy / 400));
                }
            });
            const endDrag = e => {
                if (!drag || e.pointerId !== drag.pointerId) return;
                const shouldClose = drag.dy > 90;
                sheet.style.transition = '';                              // CSS spring transition resumes
                sheet.style.transform = '';
                overlay.style.opacity = '';
                drag = null;
                if (shouldClose) closeMessageInfoSheet();                 // slides out via .open removal
            };
            sheet.addEventListener('pointerup', endDrag);
            sheet.addEventListener('pointercancel', endDrag);
        }
    }

    function formatInfoTimestamp(ms) {
        if (!ms) return null;
        const day  = formatDateLabel(ms); // Today / Yesterday / weekday, month day
        const time = new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${day} at ${time}`;
    }

    function buildInfoRow(iconText, label, timeText) {
        const row = document.createElement('div');
        row.className = 'msg-info-row';
        const icon = document.createElement('span');
        icon.className = 'msg-info-icon';
        icon.textContent = iconText;
        const wrap = document.createElement('span');
        wrap.className = 'msg-info-labels';
        const labelEl = document.createElement('span');
        labelEl.className = 'msg-info-label';
        labelEl.textContent = label;
        const timeEl = document.createElement('span');
        timeEl.className = 'msg-info-time';
        timeEl.textContent = timeText;
        wrap.appendChild(labelEl);
        wrap.appendChild(timeEl);
        row.appendChild(icon);
        row.appendChild(wrap);
        return row;
    }

    function renderMessageInfoBody(body, msg) {
        body.innerHTML = '';

        body.appendChild(buildInfoRow('📨', 'Sent', formatInfoTimestamp(msg.timestamp) || 'Sending…'));

        const readHead = document.createElement('div');
        readHead.className = 'msg-info-section';
        readHead.textContent = 'Read by';
        body.appendChild(readHead);

        // The recipient is the reader on a sent message (never the sender themselves)
        const readers = ['Bhatari', 'Bhandhari'].filter(id => id !== msg.sender && hasReadEntry(msg, id));
        if (readers.length === 0) {
            const none = document.createElement('div');
            none.className = 'msg-info-empty';
            none.textContent = 'No reads yet';
            body.appendChild(none);
        } else {
            readers.forEach(id => {
                const at = msg.readBy[id];
                const when = at ? formatInfoTimestamp(at) : 'Earlier · time not recorded'; // legacy array entry
                body.appendChild(buildInfoRow('👁', id, when));
            });
        }
    }

    function openMessageInfoSheet(msgId) {
        const overlay = document.getElementById('msg-info-overlay');
        const quote   = document.getElementById('msg-info-quote');
        const body    = document.getElementById('msg-info-body');
        if (!overlay || !quote || !body) return;
        const msg = chatState.messages.find(m => m.id === msgId);
        if (!msg) return;

        chatState.infoSheetMessageId = msgId;

        const preview = quoteTextForMessage(msg);
        quote.textContent = preview;
        quote.style.display = preview ? '' : 'none';

        renderMessageInfoBody(body, msg);

        msgInfoReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        overlay.style.display = 'flex';
        requestAnimationFrame(() => {
            overlay.classList.add('open');
            const closeBtn = document.getElementById('msg-info-close');
            if (closeBtn) closeBtn.focus({ preventScroll: true });
        });
        document.body.classList.add('msg-info-open');
    }

    function refreshMessageInfoSheet() {
        if (!chatState.infoSheetMessageId) return;
        const body = document.getElementById('msg-info-body');
        const msg  = chatState.messages.find(m => m.id === chatState.infoSheetMessageId);
        if (!body || !msg) { closeMessageInfoSheet(); return; }
        renderMessageInfoBody(body, msg);
    }

    function closeMessageInfoSheet() {
        const overlay = document.getElementById('msg-info-overlay');
        if (!overlay || overlay.style.display === 'none') return;
        chatState.infoSheetMessageId = null;
        overlay.classList.remove('open');
        document.body.classList.remove('msg-info-open');
        setTimeout(() => { if (!chatState.infoSheetMessageId) overlay.style.display = 'none'; }, 240); // after slide-out
        if (msgInfoReturnFocus && msgInfoReturnFocus.isConnected) {
            msgInfoReturnFocus.focus({ preventScroll: true });
        }
        msgInfoReturnFocus = null;
    }

    // ─── Media: Video Bubbles (lag-free player) ──────────
    function getMediaObserver() {
        if (chatState.mediaObserver) return chatState.mediaObserver;
        if (!('IntersectionObserver' in window)) return null;
        chatState.mediaObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.intersectionRatio < 0.5) {
                    const v = entry.target.querySelector('video');
                    if (v && !v.paused) v.pause(); // scrolled mostly out of view → pause
                }
            });
        }, { threshold: [0, 0.5, 1] });
        return chatState.mediaObserver;
    }

    // Pause + fully unload any videos inside a node about to leave the DOM
    function releaseMediaIn(root) {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll('.chat-media-video').forEach(wrap => {
            const video = wrap.querySelector('video');
            if (video) {
                try { video.pause(); } catch (e) { /* noop */ }
                video.removeAttribute('src');
                try { video.load(); } catch (e) { /* noop */ }
                if (chatState.activeVideo === video) chatState.activeVideo = null;
            }
            if (chatState.mediaObserver) chatState.mediaObserver.unobserve(wrap);
        });
    }

    function buildVideoMedia(message) {
        const media = message.media;
        const wrap = document.createElement('div');
        wrap.className = 'chat-media-video';
        wrap.style.aspectRatio = (media.width > 0 && media.height > 0)
            ? media.width + ' / ' + media.height
            : '16 / 9';

        // 720p-capped adaptive MP4 for inline playback — never the raw upload
        const srcUrl   = cldUrl(media.url, 'f_auto,q_auto,w_720,c_limit');
        const posterUrl = cldVideoPoster(media.url);
        if (!srcUrl) { showMediaErrorIn(wrap, 'video', null); return wrap; }

        const video = document.createElement('video');
        video.className = 'chat-video-el';
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.preload = 'none'; // no network until the user presses play
        if (posterUrl) video.poster = posterUrl;

        const playOverlay = document.createElement('button');
        playOverlay.className = 'chat-video-play';
        playOverlay.type = 'button';
        playOverlay.setAttribute('aria-label', 'Play video');
        playOverlay.textContent = '▶';

        const spinner = document.createElement('div');
        spinner.className = 'chat-video-spinner';
        spinner.style.display = 'none';

        const badge = document.createElement('span');
        badge.className = 'chat-video-badge';
        badge.textContent = formatDuration(media.duration || 0);
        if (!(media.duration > 0)) badge.style.display = 'none';

        const controls = document.createElement('div');
        controls.className = 'chat-video-controls';
        controls.style.display = 'none';
        controls.addEventListener('click', e => e.stopPropagation());

        const ctrlPlay = document.createElement('button');
        ctrlPlay.className = 'chat-video-ctrl-btn';
        ctrlPlay.type = 'button';
        ctrlPlay.textContent = '⏸';
        ctrlPlay.setAttribute('aria-label', 'Pause');

        const progressTrack = document.createElement('div');
        progressTrack.className = 'chat-video-progress';
        const progressFill = document.createElement('div');
        progressFill.className = 'chat-video-progress-fill';
        progressTrack.appendChild(progressFill);

        const timeLabel = document.createElement('span');
        timeLabel.className = 'chat-video-time';
        timeLabel.textContent = media.duration > 0 ? '0:00 / ' + formatDuration(media.duration) : '0:00';

        const muteBtn = document.createElement('button');
        muteBtn.className = 'chat-video-ctrl-btn';
        muteBtn.type = 'button';
        muteBtn.textContent = '🔊';
        muteBtn.setAttribute('aria-label', 'Mute');

        const fullBtn = document.createElement('button');
        fullBtn.className = 'chat-video-ctrl-btn';
        fullBtn.type = 'button';
        fullBtn.textContent = '⛶';
        fullBtn.setAttribute('aria-label', 'Fullscreen');

        controls.appendChild(ctrlPlay);
        controls.appendChild(progressTrack);
        controls.appendChild(timeLabel);
        controls.appendChild(muteBtn);
        controls.appendChild(fullBtn);

        wrap.appendChild(video);
        wrap.appendChild(playOverlay);
        wrap.appendChild(spinner);
        wrap.appendChild(badge);
        wrap.appendChild(controls);

        let loadStarted = false;
        let progressRaf = null;

        const setPlayingUI = playing => {
            controls.style.display   = playing ? 'flex' : 'none';
            playOverlay.style.display = playing ? 'none' : 'flex';
            badge.style.display      = playing ? 'none' : (media.duration > 0 ? '' : 'none');
            ctrlPlay.textContent = playing ? '⏸' : '▶';
            ctrlPlay.setAttribute('aria-label', playing ? 'Pause' : 'Play');
            if (playing) spinner.style.display = 'none';
        };

        // Lazy src: first tap loads the stream, then plays
        const startPlayback = () => {
            if (chatState.activeVideo && chatState.activeVideo !== video) {
                try { chatState.activeVideo.pause(); } catch (e) { /* noop */ } // one video at a time
            }
            if (!loadStarted) {
                loadStarted = true;
                playOverlay.style.display = 'none';
                badge.style.display = 'none';
                spinner.style.display = 'block';
                video.src = srcUrl;
                video.load();
            }
            const p = video.play();
            if (p && p.catch) p.catch(err => {
                console.warn('Video play blocked:', err);
                spinner.style.display = 'none';
                setPlayingUI(false);
            });
        };

        playOverlay.addEventListener('click', e => { e.stopPropagation(); startPlayback(); });
        video.addEventListener('click', e => {
            e.stopPropagation();
            if (video.paused) { startPlayback(); } else { video.pause(); }
        });
        ctrlPlay.addEventListener('click', e => {
            e.stopPropagation();
            if (video.paused) { startPlayback(); } else { video.pause(); }
        });

        video.addEventListener('play', () => {
            if (chatState.activeVideo && chatState.activeVideo !== video) {
                try { chatState.activeVideo.pause(); } catch (e) { /* noop */ }
            }
            chatState.activeVideo = video;
            setPlayingUI(true);
        });
        video.addEventListener('pause', () => {
            if (chatState.activeVideo === video) chatState.activeVideo = null;
            if (!video.ended) setPlayingUI(false);
        });
        video.addEventListener('ended', () => {
            if (chatState.activeVideo === video) chatState.activeVideo = null;
            setPlayingUI(false);
            playOverlay.textContent = '↻';
            playOverlay.setAttribute('aria-label', 'Replay video');
        });
        video.addEventListener('waiting', () => { if (loadStarted) spinner.style.display = 'block'; });
        video.addEventListener('playing', () => { spinner.style.display = 'none'; });
        video.addEventListener('canplay', () => { spinner.style.display = 'none'; });
        video.addEventListener('loadedmetadata', () => {
            if (video.duration && isFinite(video.duration)) {
                timeLabel.textContent = '0:00 / ' + formatDuration(video.duration);
            }
        });
        // Progress bar: rAF-throttled, GPU-composited (transform only — no layout thrash)
        video.addEventListener('timeupdate', () => {
            if (progressRaf) return;
            progressRaf = requestAnimationFrame(() => {
                progressRaf = null;
                const dur = video.duration || media.duration || 0;
                if (dur > 0) {
                    progressFill.style.transform = 'scaleX(' + Math.min(video.currentTime / dur, 1) + ')';
                }
                timeLabel.textContent = formatDuration(video.currentTime)
                    + (dur > 0 ? ' / ' + formatDuration(dur) : '');
            });
        });
        video.addEventListener('error', () => {
            if (!loadStarted) return; // ignore errors before a real src was set
            if (chatState.activeVideo === video) chatState.activeVideo = null;
            const obs = chatState.mediaObserver;
            showMediaErrorIn(wrap, 'video', () => {
                const fresh = buildVideoMedia(message); // fresh element = clean retry
                wrap.replaceWith(fresh);
                if (obs) obs.unobserve(wrap);
            });
        });

        // Tap-to-seek on the progress track
        progressTrack.addEventListener('click', e => {
            e.stopPropagation();
            const dur = video.duration || 0;
            if (!dur) return;
            const rect = progressTrack.getBoundingClientRect();
            const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
            video.currentTime = ratio * dur;
        });

        muteBtn.addEventListener('click', e => {
            e.stopPropagation();
            video.muted = !video.muted;
            muteBtn.textContent = video.muted ? '🔇' : '🔊';
            muteBtn.setAttribute('aria-label', video.muted ? 'Unmute' : 'Mute');
        });

        fullBtn.addEventListener('click', e => {
            e.stopPropagation();
            // iOS Safari (iPhone) only supports the video element's own fullscreen
            if (video.webkitEnterFullscreen) {
                try { video.webkitEnterFullscreen(); } catch (err) { /* noop */ }
                return;
            }
            if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
            if (wrap.requestFullscreen) wrap.requestFullscreen().catch(() => {});
            else if (wrap.webkitRequestFullscreen) wrap.webkitRequestFullscreen();
        });

        // Auto-pause when scrolled out of view
        const obs = getMediaObserver();
        if (obs) obs.observe(wrap);

        return wrap;
    }

    // ─── Outgoing Typing ─────────────────────────────────
    function handleOutgoingTyping() {
        if (!chatState.currentIdentity) return; // never publish typing state before identity selection
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            resizeChatInput(chatInput);
            syncSendButtonState();
        }
        const now = Date.now();
        if (now - chatState.lastTypingSentTime > 3000) {
            chatState.lastTypingSentTime = now;
            setTypingStatus(true);
        }
        if (chatState.typingResetTimer) clearTimeout(chatState.typingResetTimer);
        chatState.typingResetTimer = setTimeout(clearOutgoingTyping, 4000);
    }

    function clearOutgoingTyping() {
        if (chatState.typingResetTimer) { clearTimeout(chatState.typingResetTimer); chatState.typingResetTimer = null; }
        chatState.lastTypingSentTime = 0;
        setTypingStatus(false);
    }

    async function setTypingStatus(isTyping) {
        if (!TYPING_DOC || !chatState.currentIdentity) return;
        try {
            await TYPING_DOC.set({
                [chatState.currentIdentity]: {
                    isTyping,
                    at: firebase.firestore.FieldValue.serverTimestamp()
                }
            }, { merge: true });
        } catch { /* Silently ignore typing failures */ }
    }

    // ─── Remote Typing Indicator ─────────────────────────
    // P3: typing bar outside scroll — prevents layout shift + ghost gap
    function renderTypingBar(sender) {
        const bar = document.getElementById('chat-typing-bar');
        if (!bar) return false;
        bar.innerHTML = '';
        const dots = document.createElement('div');
        dots.className = 'typing-dots';
        dots.innerHTML = '<span></span><span></span><span></span>';
        const label = document.createElement('span');
        label.className = 'chat-typing-label';
        label.textContent = sender + ' is typing…';
        bar.appendChild(dots);
        bar.appendChild(label);
        bar.style.display = 'flex';
        // trigger transition
        requestAnimationFrame(() => bar.classList.add('has-typing'));
        syncInputBarHeight();
        return true;
    }

    function clearTypingBar() {
        const bar = document.getElementById('chat-typing-bar');
        if (!bar) return;
        bar.classList.remove('has-typing');
        setTimeout(() => {
            if (!bar.classList.contains('has-typing')) {
                bar.style.display = 'none';
                bar.innerHTML = '';
                syncInputBarHeight();
            }
        }, 280);
    }

    function showRemoteTypingIndicator(sender) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        // Cancel a pending fade-out from a previous stop/start cycle, otherwise the
        // reused bubble would stay invisible (inline opacity:0) until it got removed
        if (chatState.remoteTyping.removeTimer) {
            clearTimeout(chatState.remoteTyping.removeTimer);
            chatState.remoteTyping.removeTimer = null;
        }
        if (chatState.remoteTyping.timer) clearTimeout(chatState.remoteTyping.timer);

        // P3: prefer dedicated typing bar outside scroll if present — no ghost gap
        const bar = document.getElementById('chat-typing-bar');
        const useBar = !!bar;
        if (useBar) {
            renderTypingBar(sender);
            // Clean up any legacy bubble that might still be in DOM from previous version
            if (chatState.remoteTyping.el && chatState.remoteTyping.el.isConnected) {
                chatState.remoteTyping.el.remove();
            }
            chatState.remoteTyping.el = null;
        } else {
            let bubble = chatState.remoteTyping.el;
            const side = sender === 'Bhatari' ? 'left' : 'right';
            if (bubble && bubble.isConnected) {
                // Reuse: refresh side + label and clear any fading inline styles from a prior hide
                bubble.className = `chat-bubble ${side} typing-indicator-bubble`;
                bubble.classList.remove('hiding');
                bubble.style.opacity = '';
                bubble.style.transition = '';
                bubble.style.position = '';
                bubble.style.transform = '';
                bubble.style.bottom = '';
                bubble.style.left = '';
                const lbl = bubble.querySelector('.chat-sender-label');
                if (lbl) lbl.textContent = sender;
            } else {
                bubble = document.createElement('div');
                bubble.className = `chat-bubble ${side} typing-indicator-bubble bubble-enter`;
                bubble.addEventListener('animationend', () => bubble.classList.remove('bubble-enter'), { once: true });
                const label = document.createElement('div');
                label.className = 'chat-sender-label';
                label.textContent = sender;
                const dots = document.createElement('div');
                dots.className = 'typing-dots';
                dots.innerHTML = '<span></span><span></span><span></span>';
                bubble.appendChild(label);
                bubble.appendChild(dots);
                chatMessages.appendChild(bubble);
                chatState.remoteTyping.el = bubble;
            }
            const nearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 80;
            if (nearBottom) smoothScrollToBottom(chatMessages);
        }
        syncEmptyState(); // greeting card must not co-exist with the typing bubble/bar
        chatState.remoteTyping.sender = sender;
        // Auto-hide after 6s if no update
        chatState.remoteTyping.timer = setTimeout(hideRemoteTypingIndicator, 6000);
    }

    function hideRemoteTypingIndicator() {
        if (chatState.remoteTyping.timer) { clearTimeout(chatState.remoteTyping.timer); chatState.remoteTyping.timer = null; }
        const bubble = chatState.remoteTyping.el;
        chatState.remoteTyping.el = null;
        // P3: clear dedicated bar first
        clearTypingBar();
        if (bubble && bubble.isConnected) {
            // P1 Fix: remove from flex flow immediately to prevent ghost gap below last bubble,
            // while still fading visually via .hiding class (position:absolute + opacity transition)
            bubble.classList.add('hiding');
            bubble.style.transition = 'opacity 0.25s ease, transform 0.25s var(--ease-out-quint)';
            // Force reflow to ensure transition starts from current state
            void bubble.offsetWidth;
            bubble.style.opacity = '0';
            bubble.style.transform = 'translateY(10px) scale(0.96)';
            chatState.remoteTyping.removeTimer = setTimeout(() => {
                bubble.remove();
                syncEmptyState();
            }, 280);
        }
        chatState.remoteTyping.sender = null;
        // Immediate sync so empty state doesn't wait 300ms while invisible bubble still counted
        syncEmptyState();
    }

    // ─── Input auto-resize helper ────────────────────────
    // Cap matches .chat-input max-height (140px) in style.css
    function resizeChatInput(el) {
        const chatMessages = document.getElementById('chat-messages');
        const wasAtBottom = chatMessages ? (chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 80) : false;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 140) + 'px';
        // P2: keep last bubble visible when input grows, and update dynamic height var
        syncInputBarHeight();
        if (wasAtBottom && chatMessages) {
            requestAnimationFrame(() => { chatMessages.scrollTop = chatMessages.scrollHeight; });
        }
    }

    // ─── P2: Dynamic Input Bar Height (ResizeObserver → --input-bar-height) ──
    // Measures .chat-input-bar + reply + attachment strips so .chat-messages
    // padding-bottom always matches the actual visible chrome height.
    let inputBarHeightObserver = null;
    function syncInputBarHeight() {
        const inputBar = document.querySelector('.chat-input-bar');
        const replyBar = document.getElementById('chat-reply-container');
        const attachBar = document.getElementById('chat-attachment-container');
        let h = 0;
        if (inputBar) h += inputBar.offsetHeight;
        if (replyBar && replyBar.style.display !== 'none' && replyBar.offsetHeight > 0) h += replyBar.offsetHeight;
        if (attachBar && attachBar.style.display !== 'none' && attachBar.offsetHeight > 0) h += attachBar.offsetHeight;
        // Fallback to 72px if measurement is 0 (e.g. during init, hidden scene)
        if (h < 20) h = 72;
        const root = document.documentElement;
        root.style.setProperty('--input-bar-height', h + 'px');
        const chatScene = document.querySelector('.chat-scene');
        if (chatScene) chatScene.style.setProperty('--input-bar-height', h + 'px');
    }

    function initDynamicInputHeight() {
        if (inputBarHeightObserver) return;
        const inputBar = document.querySelector('.chat-input-bar');
        const replyBar = document.getElementById('chat-reply-container');
        const attachBar = document.getElementById('chat-attachment-container');
        const chatInput = document.getElementById('chat-input');
        if (!inputBar) return;
        syncInputBarHeight();
        if ('ResizeObserver' in window) {
            inputBarHeightObserver = new ResizeObserver(() => {
                syncInputBarHeight();
            });
            inputBarHeightObserver.observe(inputBar);
            if (replyBar) inputBarHeightObserver.observe(replyBar);
            if (attachBar) inputBarHeightObserver.observe(attachBar);
            if (chatInput) inputBarHeightObserver.observe(chatInput);
        } else {
            // Fallback: window resize
            window.addEventListener('resize', syncInputBarHeight, { passive: true });
        }
    }

    // ─── Visible-viewport lock (Android Chrome URL bar + keyboard) ──
    // 100vh/100dvh is taller than the visible area, so the header slides
    // under the browser chrome and a black gap appears below the input.
    function syncVisibleViewport() {
        const vv = window.visualViewport;
        const h = vv ? vv.height : window.innerHeight;
        const top = vv ? vv.offsetTop : 0;
        const root = document.documentElement;
        root.style.setProperty('--vv-height', Math.round(h) + 'px');
        root.style.setProperty('--vv-top', Math.round(top) + 'px');
        const chatScene = document.getElementById('scene-chat');
        if (chatScene) {
            const keyboardOpen = vv && (window.innerHeight - vv.height > 100);
            chatScene.classList.toggle('keyboard-visible', !!keyboardOpen);
        }
    }

    function initKeyboardHandling() {
        if (keyboardHandlingInited) return;
        keyboardHandlingInited = true;

        syncVisibleViewport();
        syncInputBarHeight();
        initDynamicInputHeight();
        let vvTick = false;
        const onVv = () => {
            if (vvTick) return;
            vvTick = true;
            requestAnimationFrame(() => {
                vvTick = false;
                syncVisibleViewport();
                syncInputBarHeight();
                const chatMessages = document.getElementById('chat-messages');
                if (!chatMessages) return;
                const nearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 80;
                if (nearBottom) chatMessages.scrollTop = chatMessages.scrollHeight;
            });
        };
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', onVv);
            window.visualViewport.addEventListener('scroll', onVv);
        }
        window.addEventListener('resize', onVv, { passive: true });
    }

    // ─── Connection Status ────────────────────────────────
    // Pill above the input bar: amber while reconnecting, green blip on
    // (re)connect that fades out — never a permanent fixture.
    let lastConnState = null;
    function updateConnectionStatus(isConnected) {
        const chatStatus = document.getElementById('chat-status');
        if (!chatStatus) return;
        if (isConnected === lastConnState) return; // snapshots fire often — animate on CHANGE only
        lastConnState = isConnected;
        clearTimeout(chatStatus._fadeTimer);
        if (isConnected) {
            chatStatus.textContent = '✅ Connected';
            chatStatus.className = 'chat-status connected visible';
            chatStatus._fadeTimer = setTimeout(() => chatStatus.classList.remove('visible'), 1800);
        } else {
            chatStatus.textContent = '⏳ Reconnecting…';
            chatStatus.className = 'chat-status reconnecting visible'; // persists until restored
        }
    }

    // ─── Presence (who currently has the chat open) ───────
    // Firestore has no onDisconnect() like Realtime DB, so online-ness is a
    // heartbeat: write every 25s, treat the other side as offline when every
    // active session is older than 75s. Each tab gets its own session so one
    // tab closing cannot incorrectly mark another tab for the same identity off.
    // The legacy top-level identity fields are still written/read for compatibility
    // with an older version of the Chat Scene.
    function createPresenceSessionId() {
        return 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    }

    function writePresenceState(identity, sessionId, online) {
        if (!identity || !sessionId || !PRESENCE_DOC || typeof firebase === 'undefined' || !firebase.firestore) {
            return Promise.resolve(false);
        }
        return PRESENCE_DOC.set({
            // Keep the old shape working for already-open/older clients.
            [identity]: {
                online,
                at: firebase.firestore.FieldValue.serverTimestamp()
            },
            // New clients aggregate this map, which is safe across multiple tabs.
            sessions: {
                [sessionId]: {
                    identity,
                    online,
                    at: firebase.firestore.FieldValue.serverTimestamp()
                }
            }
        }, { merge: true }).then(() => true);
    }

    function presenceTimestampMs(value) {
        if (!value) return null;
        if (typeof value.toMillis === 'function') {
            const ms = value.toMillis();
            return Number.isFinite(ms) ? ms : null;
        }
        if (value instanceof Date) {
            const ms = value.getTime();
            return Number.isFinite(ms) ? ms : null;
        }
        if (typeof value === 'number') {
            if (!Number.isFinite(value) || value <= 0) return null;
            return value < 1e12 ? value * 1000 : value;
        }
        if (typeof value === 'string') {
            const ms = Date.parse(value);
            return Number.isFinite(ms) ? ms : null;
        }
        if (typeof value.seconds === 'number' && Number.isFinite(value.seconds)) {
            return value.seconds * 1000 + ((value.nanoseconds || 0) / 1e6);
        }
        if (typeof value._seconds === 'number' && Number.isFinite(value._seconds)) {
            return value._seconds * 1000 + ((value._nanoseconds || 0) / 1e6);
        }
        return null;
    }

    function isFreshPresenceEntry(entry) {
        if (!entry || entry.online !== true) return false;
        const atMs = presenceTimestampMs(entry.at);
        if (!atMs) return false;
        // A clock that is slightly ahead should not make a valid heartbeat fail.
        const ageMs = Math.max(0, Date.now() - atMs);
        return ageMs < PRESENCE_STALE_MS;
    }

    function setPresenceDotState(state, other = null) {
        const dot = document.getElementById('presence-dot');
        if (!dot) return;
        const name = other || 'Presence';
        dot.classList.toggle('online', state === 'online');
        dot.dataset.presenceState = state;
        if (state === 'online') {
            dot.title = `${name} is online`;
            dot.setAttribute('aria-label', `${name} is online`);
        } else if (state === 'offline') {
            dot.title = `${name} offline`;
            dot.setAttribute('aria-label', `${name} is offline`);
        } else if (state === 'checking') {
            dot.title = `Checking ${name} presence…`;
            dot.setAttribute('aria-label', `Checking ${name} presence`);
        } else if (state === 'unavailable') {
            dot.title = 'Presence unavailable — check Firestore Rules';
            dot.setAttribute('aria-label', 'Presence unavailable');
        } else {
            dot.title = 'Presence unknown';
            dot.setAttribute('aria-label', 'Presence unknown');
        }
    }

    function startPresence() {
        // A restart gets a new session ID. This prevents a delayed offline write
        // from an old identity/session from overwriting the new online state.
        stopPresence(true);
        const me = chatState.currentIdentity;
        if (!me || !PRESENCE_DOC) {
            setPresenceDotState('unknown');
            return;
        }

        const sessionId = createPresenceSessionId();
        const runId = ++chatState.presenceRunId;
        chatState.presenceIdentity = me;
        chatState.presenceSessionId = sessionId;
        chatState.presenceData = null;
        chatState.presenceListenerError = false;
        setPresenceDotState('checking', getOtherIdentity(me));

        const isActive = () => (
            runId === chatState.presenceRunId &&
            chatState.currentIdentity === me &&
            chatState.presenceIdentity === me &&
            chatState.presenceSessionId === sessionId
        );

        const beat = (online) => {
            if (!isActive() || !chatState.chatUnlocked) return;
            if (online && (document.visibilityState !== 'visible' || navigator.onLine === false)) {
                // Hidden/offline tabs stop extending their lease. The last valid
                // heartbeat will naturally expire instead of falsely staying online.
                return;
            }
            writePresenceState(me, sessionId, online).catch(err => {
                if (isActive()) {
                    console.warn('[Presence] write failed — check Firestore Rules for presence/* :', err && err.code ? err.code : err);
                }
            });
        };
        chatState.presenceBeat = beat;

        chatState.unsubPresence = PRESENCE_DOC.onSnapshot(doc => {
            if (!isActive()) return;
            chatState.presenceListenerError = false;
            chatState.presenceData = doc.exists ? doc.data() : {};
            refreshPresenceDot();
        }, err => {
            if (!isActive()) return;
            chatState.presenceListenerError = true;
            console.warn('[Presence] listener failed — check Firestore Rules for presence/* :', err && err.code ? err.code : err);
            setPresenceDotState('unavailable', getOtherIdentity(me));
        });

        beat(true);
        chatState.presenceHeartbeat = setInterval(() => {
            if (document.visibilityState === 'visible' && navigator.onLine !== false) beat(true);
        }, PRESENCE_HEARTBEAT_MS);

        // Re-evaluate staleness between snapshots so the dot decays to offline in real time.
        chatState.presenceEvalTimer = setInterval(refreshPresenceDot, 15000);

        // Bind lifecycle recovery once. Mobile browsers may skip beforeunload,
        // so pagehide is included as a best-effort cleanup path.
        if (!chatState.presenceLifecycleBound) {
            const markPresenceOffline = () => {
                try { stopPresence(true); } catch (e) { /* noop */ }
            };
            window.addEventListener('pagehide', markPresenceOffline);
            window.addEventListener('beforeunload', markPresenceOffline);
            window.addEventListener('offline', () => {
                if (chatState.presenceIdentity) {
                    setPresenceDotState('unavailable', getOtherIdentity(chatState.presenceIdentity));
                }
            }, { passive: true });
            window.addEventListener('online', () => {
                if (chatState.presenceBeat) {
                    setPresenceDotState('checking', getOtherIdentity(chatState.presenceIdentity));
                    chatState.presenceBeat(true);
                }
            }, { passive: true });
            chatState.presenceLifecycleBound = true;
        }
    }

    function stopPresence(markOffline = true) {
        const activeIdentity = chatState.presenceIdentity;
        const activeSessionId = chatState.presenceSessionId;
        chatState.presenceRunId += 1;
        if (chatState.presenceHeartbeat) { clearInterval(chatState.presenceHeartbeat); chatState.presenceHeartbeat = null; }
        if (chatState.presenceEvalTimer) { clearInterval(chatState.presenceEvalTimer); chatState.presenceEvalTimer = null; }
        if (chatState.unsubPresence) { chatState.unsubPresence(); chatState.unsubPresence = null; }
        chatState.presenceBeat = null;
        chatState.presenceIdentity = null;
        chatState.presenceSessionId = null;
        chatState.presenceData = null;
        chatState.presenceListenerError = false;
        setPresenceDotState('unknown');

        if (markOffline && activeIdentity && activeSessionId && PRESENCE_DOC) {
            writePresenceState(activeIdentity, activeSessionId, false).catch(() => { /* best effort */ });
        }
    }

    function refreshPresenceDot() {
        const dot = document.getElementById('presence-dot');
        if (!dot || !chatState.currentIdentity) {
            if (dot) setPresenceDotState('unknown');
            return;
        }

        const other = getOtherIdentity(chatState.currentIdentity);
        if (navigator.onLine === false || chatState.presenceListenerError) {
            setPresenceDotState('unavailable', other);
            return;
        }
        const data = chatState.presenceData;
        const entries = [];
        const legacyEntry = data && data[other];
        if (legacyEntry && typeof legacyEntry === 'object') entries.push(legacyEntry);

        const sessions = data && data.sessions;
        if (sessions && typeof sessions === 'object' && !Array.isArray(sessions)) {
            Object.keys(sessions).forEach(sessionId => {
                const entry = sessions[sessionId];
                if (entry && entry.identity === other) entries.push(entry);
            });
        }

        const online = entries.some(isFreshPresenceEntry);
        setPresenceDotState(online ? 'online' : 'offline', other);
    }


    // ===================================================
    //  FLOATING HEARTS (tap effect — preserved)
    // ===================================================

    function createHeart(x, y) {
        const heart = document.createElement('div');
        heart.innerHTML = '💜';
        heart.style.position = 'absolute';
        heart.style.left = x + 'px';
        heart.style.top = y + 'px';
        heart.style.fontSize = '20px';
        heart.style.pointerEvents = 'none';
        heart.style.animation = 'floatUp 1.5s ease-out forwards';
        heart.style.zIndex = '9999';
        document.body.appendChild(heart);
        setTimeout(() => heart.remove(), 1500);
    }

}); // END DOMContentLoaded
