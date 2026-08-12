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
            if (chatState.activeVideo) { try { chatState.activeVideo.pause(); } catch (e) { /* noop */ } }
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
            if (window._sceneController) {
                window._sceneController.reset();
            }
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
            }

            // Enter new scene
            const nextEl = document.getElementById(this.scenes[index]);
            if (nextEl) {
                // Small delay for exit to begin
                setTimeout(() => {
                    nextEl.classList.add('scene-active');
                    this.currentIndex = index;
                    this.isTransitioning = false;

                    // Trigger scene-specific entrance
                    this.onSceneEnter(index);
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
        // Setup bokeh particles
        setupBokeh();

        // Create scene controller
        const controller = new SceneController();
        window._sceneController = controller;

        // Create floating hearts on background taps.
        let lastHeartTime = 0;
        document.addEventListener('click', (e) => {
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

    function enterLadderScene() {
        // Adjust the hanging string dynamically to fit the cards perfectly
        adjustLadderString();

        const cards = document.querySelectorAll('.ladder-card');
        const continueBtn = document.getElementById('ladder-continue-btn');

        // Stagger card reveals with image load synchronization
        let loadedCount = 0;
        const totalImages = cards.length;
        
        cards.forEach((card, index) => {
            const img = card.querySelector('img');
            
            // Function to reveal card after image loads or timeout
            const revealCard = () => {
                setTimeout(() => {
                    card.classList.add('visible');
                    loadedCount++;
                    requestAnimationFrame(adjustLadderString);

                    // If all images loaded (or timed out), show continue button.
                    if (loadedCount >= totalImages) {
                        setTimeout(() => {
                            adjustLadderString();
                            if (continueBtn) continueBtn.classList.add('show');
                        }, 400);
                    }
                }, 400 + (index * 600));
            };
            
            if (img && img.complete) {
                // Image already loaded
                revealCard();
            } else if (img) {
                // Wait for image to load with timeout fallback
                const timeout = setTimeout(revealCard, 2000); // 2s fallback
                img.addEventListener('load', () => {
                    clearTimeout(timeout);
                    revealCard();
                });
                img.addEventListener('error', () => {
                    clearTimeout(timeout);
                    revealCard(); // Still reveal even if image fails
                });
            } else {
                // No image, just reveal
                revealCard();
            }
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

    function enterDuaScene() {
        // Reset UI fully on each entry
        const replyMsg = document.getElementById('reply-message');
        if (replyMsg) replyMsg.value = '';

        const charCount = document.getElementById('char-count');
        if (charCount) charCount.textContent = '0';

        setReplyError('');
        setReplyLoading(false);

        // Spawn ambient floating particles
        const particleContainer = document.getElementById('reply-particles');
        if (particleContainer) {
            particleContainer.innerHTML = '';
            for (let i = 0; i < 18; i++) {
                const p = document.createElement('div');
                p.className = 'dua-particle';
                p.style.left = Math.random() * 100 + '%';
                p.style.animationDuration = (Math.random() * 10 + 12) + 's';
                p.style.animationDelay = (Math.random() * -10) + 's';
                const size = (Math.random() * 4 + 2) + 'px';
                p.style.width = size;
                p.style.height = size;
                particleContainer.appendChild(p);
            }
        }
    }

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

    // ── Core: send message to Telegram ───────────────────
    async function sendReplyToTelegram(messageText) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

        // Structured, beautiful message format
        const structured = [
            '💌 *New Birthday Reply — Bhandhari*',
            '━━━━━━━━━━━━━━━━━━━━━',
            '',
            messageText,
            '',
            '━━━━━━━━━━━━━━━━━━━━━',
            `📅 ${dateStr}  •  🕐 ${timeStr}`,
            `📍 Sent from the Birthday Surprise Page`,
        ].join('\n');

        const apiUrl = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TG_CHAT_ID,
                text: structured,
                parse_mode: 'Markdown',
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.description || `HTTP ${response.status}`);
        }

        return await response.json();
    }

    // ===================================================
    //  QUESTION / REPLY HANDLING
    // ===================================================

    // Handle Previous/Next navigation buttons
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (window._sceneController) {
                if (btn.id === 'prev-btn-final') {
                    // Recap button: restart the experience from the beginning
                    window._sceneController.reset();
                    window._sceneController.showScene(0);
                } else if (btn.id.startsWith('prev-btn-')) {
                    window._sceneController.previousScene();
                } else if (btn.id.startsWith('next-btn-')) {
                    window._sceneController.nextScene();
                }
            }
        });
    });

    // Helper for per-screen send handling
    const setupSendHandler = (config) => {
        const sendBtn = document.getElementById(config.btnId);
        const textarea = document.getElementById(config.textId);
        const feedbackEl = document.getElementById(config.feedbackId);
        const btnLabel = document.getElementById(config.labelId);
        const btnSpinner = document.getElementById(config.spinnerId);
        const charCountEl = document.getElementById(config.charId);

        if (!sendBtn || !textarea) return;

        // Character counter logic
        if (charCountEl) {
            textarea.addEventListener('input', () => {
                const len = textarea.value.length;
                charCountEl.textContent = len;
                charCountEl.style.color = len >= 1950 ? '#ff85a1' : '';
                if (len > 0 && feedbackEl) {
                    feedbackEl.textContent = '';
                    feedbackEl.className = 'reply-feedback';
                }
            });
            // Allow Ctrl+Enter to submit
            textarea.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    if (!sendBtn.disabled) sendBtn.click();
                }
            });
        }

        // Send logic
        sendBtn.addEventListener('click', async () => {
            const rawText = textarea.value.trim();

            if (!rawText) {
                if (feedbackEl) {
                    feedbackEl.textContent = 'Please write something before sending! 💜';
                    feedbackEl.className = 'reply-feedback error';
                }
                textarea.focus();
                return;
            }

            if (!navigator.onLine) {
                if (feedbackEl) {
                    feedbackEl.textContent = 'You seem to be offline. Please check your connection! 📡';
                    feedbackEl.className = 'reply-feedback error';
                }
                return;
            }

            // Set loading state
            if (feedbackEl) {
                feedbackEl.textContent = '';
                feedbackEl.className = 'reply-feedback';
            }
            sendBtn.disabled = true;
            if (btnLabel) btnLabel.style.display = 'none';
            if (btnSpinner) btnSpinner.style.display = 'inline-block';

            try {
                // Formatting telegram message to be readable and elegant
                const messageText = `🔹 *Question:*\n_${config.questionText}_\n\n💬 *Her Answer:*\n${rawText}`;
                await sendReplyToTelegram(messageText);
                
                // Show success
                if (feedbackEl) {
                    feedbackEl.textContent = 'Sent beautifully! ✨';
                    feedbackEl.className = 'reply-feedback success';
                }
                if (typeof fireConfetti === 'function') fireConfetti();
                
                // Optional: We can choose to not clear the text in case she wants to see what she sent, 
                // but clearing it indicates success more robustly.
                textarea.value = '';
                if (charCountEl) charCountEl.textContent = '0';
            } catch (err) {
                console.error('Telegram send error:', err);
                if (feedbackEl) {
                    feedbackEl.textContent = 'Something went wrong. Please try again! 🙏';
                    feedbackEl.className = 'reply-feedback error';
                }
            } finally {
                // Restore button
                sendBtn.disabled = false;
                if (btnLabel) btnLabel.style.display = 'inline';
                if (btnSpinner) btnSpinner.style.display = 'none';
                
                // Clear success message after delay
                setTimeout(() => {
                    if (feedbackEl && feedbackEl.classList.contains('success')) {
                        feedbackEl.textContent = '';
                        feedbackEl.className = 'reply-feedback';
                    }
                }, 3000);
            }
        });
    };

    // Setup for Q1 to Q5
    for(let i=1; i<=5; i++) {
        const pTag = document.querySelector(`#scene-q${i} .question-box p`);
        const qText = pTag ? pTag.innerText : `Question ${i}`;
        
        setupSendHandler({
            btnId: `send-reply-btn-q${i}`,
            textId: `reply-q${i}`,
            feedbackId: `reply-feedback-q${i}`,
            labelId: `send-btn-label-q${i}`,
            spinnerId: `btn-spinner-q${i}`,
            charId: `char-count-q${i}`,
            questionText: qText
        });
    }

    // Setup for Final Screen
    setupSendHandler({
        btnId: 'send-reply-btn',
        textId: 'reply-message',
        feedbackId: 'reply-feedback',
        labelId: 'send-btn-label',
        spinnerId: 'btn-spinner',
        charId: 'char-count',
        questionText: 'Any Questions for me?'
    });


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

    // Initialize Firebase safely (guard against double-init on hot reload)
    let _fbApp;
    try { _fbApp = firebase.app(); } catch { _fbApp = firebase.initializeApp(FIREBASE_CONFIG); }
    const db = firebase.firestore(_fbApp);
    
    // Enable offline persistence for caching (reduces reads on reload)
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

    const CHATS_COL = 'web_chat_v2';
    const TYPING_DOC = db.doc('typing/status');

    // ─── Cloudinary Media Config ─────────────────────────
    // Unsigned uploads only: the API secret must NEVER be in client code.
    // The upload preset below must be created (unsigned) in the Cloudinary console.
    const CLOUDINARY_CLOUD_NAME     = 'dyua5q73q';
    const CLOUDINARY_UPLOAD_PRESET  = 'chat_videos'; // unsigned upload preset name
    const CLOUDINARY_UPLOAD_URL     = 'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/auto/upload';
    const CLOUDINARY_URL_PREFIX     = 'https://res.cloudinary.com/';
    const MAX_IMAGE_BYTES           = 25 * 1024 * 1024;   // 25 MB
    const MAX_VIDEO_BYTES           = 100 * 1024 * 1024;  // 100 MB

    // ─── Telegram Notify (uses TG_BOT_TOKEN / TG_CHAT_ID from REPLY DELIVERY above) ──
    const NOTIFY_COOLDOWN_MS = 10_000; // 10 seconds
    let notifyLastSentAt = 0;
    let notifyCooldownTimer = null;

    async function notifyBhatari() {
        const btn = document.getElementById('notify-bhatari-btn');
        const now = Date.now();
        const remaining = NOTIFY_COOLDOWN_MS - (now - notifyLastSentAt);
        if (remaining > 0) return; // still in cooldown

        // Disable button
        if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

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
            if (btn) { btn.disabled = false; btn.innerHTML = '<span class="notify-icon">🔔</span> Notify Bhatari'; }
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
                    btn.innerHTML = '<span class="notify-icon">🔔</span> Notify Bhatari';
                }
            } else {
                updateNotifyBtn(btn, secLeft);
            }
        }, 1000);
    }

    function updateNotifyBtn(btn, secLeft) {
        if (btn) btn.innerHTML = `⏳ Wait ${secLeft}s`;
    }

    // ─── Toast notification ──────────────────────────────
    // XSS Protection: Escape HTML special characters
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        currentIdentity: 'Bhandhari',  // Default to Bhandhari
        messages: [],
        unsubMessages: null,
        unsubTyping: null,
        replyToMessage: null,
        lastTypingSentTime: 0,
        typingResetTimer: null,
        remoteTyping: { sender: null, timer: null },
        renderedIds: new Map(),   // id → DOM element for reconciliation
        editingMessageId: null,   // Track which message is being edited
        editBoxes: new Map(),     // messageId → { bubble, textEl, editBox, originalText }
        chatUnlocked: false,      // Chat lock state
        pinInput: '',             // Current PIN input
        failedAttempts: 0,        // Failed PIN attempts
        lockoutEndTime: 0,        // Lockout end time
        pendingAttachment: null,  // { file, previewUrl, kind, fileName, fileSize, status: 'uploading'|'ready'|'error', progress, media, xhr }
        activeVideo: null,        // Currently playing <video> element (one at a time)
        mediaObserver: null       // IntersectionObserver singleton for auto-pausing off-screen videos
    };

    // ─── Helpers ─────────────────────────────────────────
    function normalizeSender(s) {
        if (!s) return 'Bhatari';
        if (s === 'me') return 'Bhatari';
        if (s === 'sanobar') return 'Bhandhari';
        return s;
    }

    // Trust boundary: Firestore media payloads are user-controlled — keep only
    // whitelisted fields, coerce types, and force the URL through the Cloudinary gate
    function sanitizeMedia(m) {
        if (!m || typeof m !== 'object') return null;
        if (m.type !== 'image' && m.type !== 'video') return null;
        if (!isCloudinaryUrl(m.url)) return null;
        const num = v => (typeof v === 'number' && isFinite(v) && v > 0) ? v : 0;
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
    function initChatLockOverlay() {
        const lockOverlay = document.getElementById('chat-lock-overlay');
        const pinDisplay = document.getElementById('chat-pin-display');
        const pinPad = document.getElementById('chat-pin-pad');
        const pinError = document.getElementById('chat-pin-error');
        const pinInputField = document.getElementById('chat-pin-input-field');
        
        if (!lockOverlay || !pinDisplay || !pinPad) return;

        // Prevent browser autofill/save password by randomizing attributes
        if (pinInputField) {
            pinInputField.setAttribute('autocomplete', 'off');
            pinInputField.setAttribute('autocorrect', 'off');
            pinInputField.setAttribute('autocapitalize', 'off');
            pinInputField.setAttribute('spellcheck', 'false');
            // Randomize name and id to prevent browser recognition
            const randomSuffix = Date.now().toString(36) + Math.random().toString(36).substr(2);
            pinInputField.setAttribute('name', 'chat_pin_' + randomSuffix);
            pinInputField.setAttribute('id', 'chat-pin-input-' + randomSuffix);
            // Make readonly to prevent native keyboard, use custom keypad instead
            pinInputField.setAttribute('readonly', 'true');
        }

        // Check for lockout on scene enter
        const now = Date.now();
        if (chatState.lockoutEndTime > now) {
            const remaining = Math.ceil((chatState.lockoutEndTime - now) / 1000);
            pinError.textContent = `Too many attempts. Try again in ${remaining}s.`;
            pinError.style.display = 'block';
            setTimeout(() => {
                chatState.failedAttempts = 0;
                chatState.lockoutEndTime = 0;
                pinError.style.display = 'none';
            }, remaining * 1000);
        }

        // Handle PIN key clicks — attach the listener only once; re-entering the
        // chat scene must not stack duplicate handlers (a single tap would otherwise
        // add multiple digits and the 4-digit check would never fire)
        if (!chatLockOverlayInited) {
            chatLockOverlayInited = true;
            pinPad.addEventListener('click', (e) => {
                const key = e.target.closest('.pin-key');
                if (!key) return;

                // Haptic feedback
                if (navigator.vibrate) navigator.vibrate(10);

                const digit = key.dataset.digit;
                const action = key.dataset.action;

                if (action === 'clear') {
                    chatState.pinInput = '';
                    updatePinDots();
                    pinError.style.display = 'none';
                    return;
                }

                if (action === 'back') {
                    chatState.pinInput = chatState.pinInput.slice(0, -1);
                    updatePinDots();
                    pinError.style.display = 'none';
                    return;
                }

                if (digit && chatState.pinInput.length < 4) {
                    chatState.pinInput += digit;
                    updatePinDots();

                    // Check if PIN is complete
                    if (chatState.pinInput.length === 4) {
                        verifyPin();
                    }
                }
            });
        }

        function updatePinDots() {
            const dots = pinDisplay.querySelectorAll('.pin-dot');
            dots.forEach((dot, index) => {
                if (index < chatState.pinInput.length) {
                    dot.classList.add('filled');
                } else {
                    dot.classList.remove('filled');
                }
            });
        }

        function verifyPin() {
            // SHA-256 hash of the correct PIN (matches main lock screen)
            const CORRECT_PIN_HASH = '277375b99e186c72ac38ac47b03199038342fe0389be8765476fa2be0c5b5649';
            
            crypto.subtle.digest('SHA-256', new TextEncoder().encode(chatState.pinInput))
                .then(hashBuffer => {
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    const inputHash = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
                    
                    if (inputHash === CORRECT_PIN_HASH) {
                        // Success - unlock chat
                        chatState.chatUnlocked = true;
                        chatState.pinInput = '';
                        chatState.failedAttempts = 0;
                        
                        lockOverlay.classList.add('hidden');
                        pinError.style.display = 'none';
                        
                        // Show success animation
                        const dots = pinDisplay.querySelectorAll('.pin-dot');
                        dots.forEach(dot => {
                            dot.style.background = '#4ade80';
                            dot.style.borderColor = '#4ade80';
                        });
                        
                        setTimeout(() => {
                            dots.forEach(dot => {
                                dot.style.background = '';
                                dot.style.borderColor = '';
                            });
                        }, 500);
                        
                        // Show identity notification toast AFTER unlocking
                        setTimeout(() => {
                            showToast(`You are chatting as ${chatState.currentIdentity}`, false, 'info');
                        }, 600);
                    } else {
                        // Failed attempt
                        chatState.failedAttempts++;
                        chatState.pinInput = '';
                        updatePinDots();
                        
                        const dots = pinDisplay.querySelectorAll('.pin-dot');
                        dots.forEach(dot => {
                            dot.classList.add('error');
                            setTimeout(() => dot.classList.remove('error'), 400);
                        });
                        
                        if (chatState.failedAttempts >= 3) {
                            chatState.lockoutEndTime = Date.now() + 15000; // 15 second lockout
                            pinError.textContent = 'Too many attempts. Locked for 15s.';
                            pinError.style.display = 'block';
                            
                            setTimeout(() => {
                                chatState.failedAttempts = 0;
                                chatState.lockoutEndTime = 0;
                                pinError.style.display = 'none';
                            }, 15000);
                        } else {
                            pinError.textContent = `Incorrect PIN. ${3 - chatState.failedAttempts} attempts left. 🐧`;
                            pinError.style.display = 'block';
                            setTimeout(() => { pinError.style.display = 'none'; }, 2000);
                        }
                    }
                })
                .catch(err => {
                    console.error('PIN verification error:', err);
                    pinError.textContent = 'Error verifying PIN.';
                    pinError.style.display = 'block';
                });
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

        // Initialize keyboard handling for mobile
        initKeyboardHandling();

        // Initialize chat lock overlay
        initChatLockOverlay();

        // Only wire up listeners once
        if (!chatSceneInited) {
            chatSceneInited = true;

            // Identity toggle - Default to Bhandhari
            const defaultIdentity = 'Bhandhari';
            chatState.currentIdentity = defaultIdentity;
            
            // Set initial toggle button state
            toggleBtns.forEach(btn => {
                const identity = btn.getAttribute('data-identity');
                if (identity === defaultIdentity) {
                    btn.classList.add('active');
                    btn.setAttribute('aria-checked', 'true');
                } else {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-checked', 'false');
                }
                
                btn.addEventListener('click', () => {
                    toggleBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); });
                    btn.classList.add('active');
                    btn.setAttribute('aria-checked', 'true');
                    chatState.currentIdentity = btn.getAttribute('data-identity') || 'Bhatari';

                    // Notify button only visible for Bhandhari
                    if (notifyBtn) {
                        notifyBtn.style.display = chatState.currentIdentity === 'Bhandhari' ? 'inline-flex' : 'none';
                    }
                    
                    // Update visibility of all edit buttons based on new identity
                    document.querySelectorAll('.chat-edit-btn').forEach(editBtn => {
                        const ownerId = editBtn.dataset.ownerId;
                        editBtn.style.display = (ownerId === chatState.currentIdentity) ? 'inline-flex' : 'none';
                    });
                    
                    // Show identity switch toast
                    showToast(`Switched to ${chatState.currentIdentity}`, false, 'info');
                });
            });
            
            // Show initial identity notification toast after a short delay (only if already unlocked)
            // Note: Toast is now shown after PIN unlock in verifyPin() function
            // This code is kept for compatibility if chat is already unlocked

            chatSendBtn.addEventListener('click', handleSend);
            chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } });
            chatInput.addEventListener('input', handleOutgoingTyping);
            if (chatReplyCancel) chatReplyCancel.addEventListener('click', cancelReply);

            // Media attachments + lightbox (wired exactly once via chatSceneInited guard)
            initMediaAttachments();

            // Header polish: sliding toggle glider + compress-on-scroll (also one-time)
            initHeaderPolish();

            // Notify button (Bhandhari only) - visible by default since Bhandhari is default identity
            if (notifyBtn) {
                notifyBtn.style.display = 'inline-flex'; // Show by default for Bhandhari
                notifyBtn.addEventListener('click', notifyBhatari);
            }

            // Boot Firestore listeners
            startMessageListener();
            startTypingListener();
        }
    }

    // ─── Firestore Listeners ─────────────────────────────
    function startMessageListener() {
        if (chatState.unsubMessages) chatState.unsubMessages();

        // Optimized query: fetch only last 20 messages to minimize reads
        chatState.unsubMessages = db.collection(CHATS_COL)
            .orderBy('timestamp', 'asc')
            .limitToLast(20)
            .onSnapshot(snapshot => {
                updateConnectionStatus(true);

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
    function reconcileMessages() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const wasAtBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 80;

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

        // Track which message IDs we expect to see
        const expectedMsgIds = new Set(chatState.messages.map(m => m.id));
        
        // Build ordered list of expected message IDs (preserving order)
        const expectedOrder = chatState.messages.map(m => m.id);

        // Step 1: Remove orphaned nodes (messages that no longer exist)
        for (const [id, el] of chatState.renderedIds) {
            if (!expectedMsgIds.has(id)) {
                releaseMediaIn(el); // pause + unload any videos and unobserve before removal
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
                    divider.className = 'chat-date-divider';
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
                // while the user is watching the bottom of the chat (never on cold render)
                if (chatInitialStaggerDone && wasAtBottom && msg.sender !== chatState.currentIdentity && !msg.pending) {
                    haptic([6]);
                    bubble.classList.add('bubble-receive-glow');
                    bubble.addEventListener('animationend', () => bubble.classList.remove('bubble-receive-glow'), { once: true });
                    setTimeout(() => bubble.classList.remove('bubble-receive-glow'), 900); // fallback cleanup
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

        // Get typing bubble to keep it at bottom
        const typingBubble = chatMessages.querySelector('.typing-indicator-bubble');
        if (typingBubble && lastInsertedNode && typingBubble.previousElementSibling !== lastInsertedNode) {
            chatMessages.appendChild(typingBubble);
        }

        // Smooth scroll to bottom only if user was already near bottom
        if (wasAtBottom) {
            chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
        }
    }

    // Update an existing bubble's mutable parts without re-creating it
    function updateBubble(bubble, msg) {
        // Preserve 'has-media' so pending→confirmed acks don't strip media styling or reload media.
        // bubbleClassName() re-derives grouping classes so run changes don't require a rebuild.
        bubble.className = bubbleClassName(msg);

        // Skip text update if currently being edited by user
        const isBeingEdited = chatState.editingMessageId === msg.id;
        const textEl = bubble.querySelector('.chat-message-text');
        if (textEl && !isBeingEdited && textEl.textContent !== msg.text) {
            textEl.textContent = msg.text;
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

        // Delivery tick: flip 🕓 → ✓ with a pop when Firestore acks the message
        const tick = bubble.querySelector('.chat-tick');
        if (tick && !msg.pending && tick.classList.contains('tick-pending')) {
            tick.classList.remove('tick-pending');
            tick.classList.add('tick-sent', 'tick-pop');
            tick.textContent = '✓';
            tick.setAttribute('aria-label', 'Sent');
            tick.addEventListener('animationend', () => tick.classList.remove('tick-pop'), { once: true });
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
    }

    // Shared class list for a message bubble (grouping classes activate CSS at style.css)
    function bubbleClassName(message, extra = '') {
        const isBhatari = message.sender === 'Bhatari';
        const hasMedia = !!(message.media && (message.media.type === 'image' || message.media.type === 'video'));
        let cls = `chat-bubble ${isBhatari ? 'left' : 'right'}`;
        if (message.pending) cls += ' pending';
        if (hasMedia) cls += ' has-media';
        if (message.groupStart !== undefined) cls += message.groupStart ? ' grouped-start' : ' grouped-mid';
        if (message.groupEnd) cls += ' grouped-end';
        return cls + extra;
    }

    // ─── Create Bubble ────────────────────────────────────
    function createBubble(message) {
        const bubble = document.createElement('div');
        const hasText  = !!(message.text && message.text.trim());
        const hasMedia = !!(message.media && (message.media.type === 'image' || message.media.type === 'video'));
        bubble.className = bubbleClassName(message);
        bubble.dataset.id = message.id;

        // Sender label
        const senderLabel = document.createElement('div');
        senderLabel.className = 'chat-sender-label';
        senderLabel.textContent = message.sender;
        bubble.appendChild(senderLabel);

        // Reply quote box (improved)
        if (message.replyTo) {
            const quoteBox = document.createElement('div');
            quoteBox.className = 'chat-quote-box';
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
            bubble.appendChild(quoteBox);
        }

        // Media block (image or video) — inserted between reply quote and caption
        if (hasMedia) {
            bubble.appendChild(message.media.type === 'image'
                ? buildImageMedia(message)
                : buildVideoMedia(message));
        }

        // Message text (skipped entirely for media-only messages)
        if (hasText) {
            const textEl = document.createElement('div');
            textEl.className = 'chat-message-text';
            textEl.textContent = message.text;
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
        // Delivery tick on own messages: 🕓 while pending → ✓ once Firestore acks
        if (message.sender === chatState.currentIdentity) {
            const tick = document.createElement('span');
            tick.className = 'chat-tick' + (message.pending ? ' tick-pending' : ' tick-sent');
            tick.textContent = message.pending ? '🕓' : '✓';
            tick.setAttribute('aria-label', message.pending ? 'Sending' : 'Sent');
            metaRow.appendChild(tick);
        }
        bubble.appendChild(metaRow);

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

    function handleSend() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;
        const text = chatInput.value.trim();

        const att = chatState.pendingAttachment;
        if (att && att.status === 'uploading') {
            showToast('Almost there — finishing upload ⏳', false);
            return;
        }
        const media = att && att.status === 'ready' ? att.media : null;
        if (!text && !media) return;

        // Send choreography: tick haptic + squash/launch micro-anim on the button
        haptic(8);
        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) {
            sendBtn.classList.remove('send-launch');
            void sendBtn.offsetWidth; // restart animation
            sendBtn.classList.add('send-launch');
            sendBtn.classList.remove('armed');
        }

        chatInput.value = '';
        resizeChatInput(chatInput);
        sendMessage(text, media);
        clearOutgoingTyping();
    }

    async function sendMessage(text, media = null) {
        const replyTo = chatState.replyToMessage
            ? { id: chatState.replyToMessage.id, sender: chatState.replyToMessage.sender, text: chatState.replyToMessage.text }
            : null;
        cancelReply();
        const sentAttachment = chatState.pendingAttachment; // keep ref in case we must restore on failure
        if (media) clearAttachmentUI();
        try {
            await db.collection(CHATS_COL).add({
                sender:    chatState.currentIdentity,
                text:      text || '',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                replyTo,
                isEdited: false,
                media:     media || null
            });
            if (media && chatState.pendingAttachment === sentAttachment) discardPendingAttachment();
        } catch (err) {
            console.error('Send error:', err);
            // Restore the draft so a failed send never loses the typed text or the uploaded media
            const chatInput = document.getElementById('chat-input');
            if (chatInput && text) { chatInput.value = text; resizeChatInput(chatInput); }
            if (media && chatState.pendingAttachment === sentAttachment && sentAttachment) {
                renderAttachmentStrip(); // strip comes back in "ready" state for retry
            }
            showToast('Message failed to send 😢', true);
        }
    }

    // ─── Reply ───────────────────────────────────────────
    function handleReply(msgId, text, sender) {
        chatState.replyToMessage = { id: msgId, text, sender };
        const container = document.getElementById('chat-reply-container');
        const quote     = document.getElementById('chat-reply-quote');
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
    }

    function cancelReply() {
        chatState.replyToMessage = null;
        const container = document.getElementById('chat-reply-container');
        if (container) container.style.display = 'none';
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
        if (message.media) return message.media.type === 'video' ? '🎬 Video' : '📷 Photo';
        return '';
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
        }

        // Header compresses once the user starts scrolling (rAF-throttled, passive)
        if (header && chatMessages) {
            let scrollTick = false;
            chatMessages.addEventListener('scroll', () => {
                if (scrollTick) return;
                scrollTick = true;
                requestAnimationFrame(() => {
                    scrollTick = false;
                    header.classList.toggle('compact', chatMessages.scrollTop > 24);
                });
            }, { passive: true });
        }
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
            attachBtn.addEventListener('click', () => fileInput.click());
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
    }

    function clearAttachmentUI() {
        const container = document.getElementById('chat-attachment-container');
        if (container) container.style.display = 'none';
        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) sendBtn.disabled = false;
    }

    function renderAttachmentStrip() {
        const container   = document.getElementById('chat-attachment-container');
        const thumb       = document.getElementById('chat-attachment-thumb');
        const nameEl      = document.getElementById('chat-attachment-name');
        const statusEl    = document.getElementById('chat-attachment-status');
        const retryBtn    = document.getElementById('chat-attachment-retry');
        const progressWrap = container ? container.querySelector('.chat-attachment-progress') : null;
        const sendBtn     = document.getElementById('chat-send-btn');
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
            if (sendBtn) sendBtn.disabled = true; // one attachment at a time; send waits for upload
        } else if (att.status === 'ready') {
            if (progressWrap) progressWrap.style.display = 'none';
            if (statusEl) statusEl.textContent = '✓ Ready to send';
            if (retryBtn) retryBtn.style.display = 'none';
            if (sendBtn) sendBtn.disabled = false;
        } else { // 'error'
            if (progressWrap) progressWrap.style.display = 'none';
            if (statusEl) statusEl.textContent = 'Upload failed';
            if (retryBtn) retryBtn.style.display = 'inline-flex';
            if (sendBtn) sendBtn.disabled = false;
        }
        updateAttachmentStripProgress();
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

    function openLightbox(src, altText) {
        const lb  = document.getElementById('chat-lightbox');
        const img = document.getElementById('chat-lightbox-img');
        if (!lb || !img || !src) return;
        img.src = src;
        img.alt = altText || 'Photo';
        lb.style.display = 'flex';
        document.body.classList.add('chat-lightbox-open');
    }

    function closeLightbox() {
        const lb  = document.getElementById('chat-lightbox');
        const img = document.getElementById('chat-lightbox-img');
        if (!lb || lb.style.display === 'none') return;
        lb.style.display = 'none';
        if (img) img.removeAttribute('src');
        document.body.classList.remove('chat-lightbox-open');
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
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            resizeChatInput(chatInput);
            // Armed send button: glows when there's something to send
            const sendBtn = document.getElementById('chat-send-btn');
            if (sendBtn) sendBtn.classList.toggle('armed', chatInput.value.trim().length > 0);
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
    function showRemoteTypingIndicator(sender) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        if (chatState.remoteTyping.timer) clearTimeout(chatState.remoteTyping.timer);

        let bubble = chatMessages.querySelector('.typing-indicator-bubble');
        if (!bubble) {
            bubble = document.createElement('div');
            bubble.className = `chat-bubble ${sender === 'Bhatari' ? 'left' : 'right'} typing-indicator-bubble`;
            const label = document.createElement('div');
            label.className = 'chat-sender-label';
            label.textContent = sender;
            const dots = document.createElement('div');
            dots.className = 'typing-dots';
            dots.innerHTML = '<span></span><span></span><span></span>';
            bubble.appendChild(label);
            bubble.appendChild(dots);
            chatMessages.appendChild(bubble);
        } else {
            // Update side if identity switched
            bubble.className = `chat-bubble ${sender === 'Bhatari' ? 'left' : 'right'} typing-indicator-bubble`;
            const lbl = bubble.querySelector('.chat-sender-label');
            if (lbl) lbl.textContent = sender;
        }

        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
        chatState.remoteTyping.sender = sender;
        // Auto-hide after 6s if no update
        chatState.remoteTyping.timer = setTimeout(hideRemoteTypingIndicator, 6000);
    }

    function hideRemoteTypingIndicator() {
        if (chatState.remoteTyping.timer) { clearTimeout(chatState.remoteTyping.timer); chatState.remoteTyping.timer = null; }
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            const bubble = chatMessages.querySelector('.typing-indicator-bubble');
            if (bubble) {
                bubble.style.transition = 'opacity 0.3s ease';
                bubble.style.opacity = '0';
                setTimeout(() => bubble.remove(), 300);
            }
        }
        chatState.remoteTyping.sender = null;
    }

    // ─── Input auto-resize helper ────────────────────────
    function resizeChatInput(el) {
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }

    // ─── Keyboard Handling for Mobile ─────────────────────
    // Adjust chat layout when keyboard appears on mobile
    function initKeyboardHandling() {
        // Attach visualViewport listeners only once — re-entering the chat scene must
        // not stack duplicate resize/scroll handlers that force repeated scroll-to-bottom
        if (keyboardHandlingInited) return;
        keyboardHandlingInited = true;

        if (typeof window.visualViewport !== 'undefined') {
            const chatScene = document.getElementById('scene-chat');
            const chatSceneContainer = chatScene ? chatScene.querySelector('.chat-scene') : null;
            const chatMessages = document.getElementById('chat-messages');
            
            if (!chatScene || !chatMessages || !chatSceneContainer) return;
            
            const handleViewportChange = () => {
                const currentHeight = window.visualViewport.height;
                chatSceneContainer.style.height = `${currentHeight}px`;
                
                // If keyboard is open (height is significantly less than window.innerHeight)
                const isKeyboardOpen = window.innerHeight - currentHeight > 100;
                if (isKeyboardOpen) {
                    chatScene.classList.add('keyboard-visible');
                    // Scroll to bottom
                    setTimeout(() => {
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }, 50);
                } else {
                    chatScene.classList.remove('keyboard-visible');
                }
            };
            
            window.visualViewport.addEventListener('resize', handleViewportChange);
            window.visualViewport.addEventListener('scroll', handleViewportChange);
            
            // Run initially
            handleViewportChange();
        }
    }

    // ─── Connection Status ────────────────────────────────
    function updateConnectionStatus(isConnected) {
        const chatStatus = document.getElementById('chat-status');
        if (!chatStatus) return;
        if (isConnected) {
            chatStatus.textContent = '✅ Connected';
            chatStatus.className = 'chat-status connected';
        } else {
            chatStatus.textContent = '⏳ Reconnecting...';
            chatStatus.className = 'chat-status reconnecting';
        }
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
        heart.style.willChange = 'transform, opacity';
        document.body.appendChild(heart);
        setTimeout(() => heart.remove(), 1500);
    }

}); // END DOMContentLoaded
