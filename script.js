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

    function showToast(message, isError = false, type = 'default') {
        let toast = document.getElementById('chat-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'chat-toast';
            toast.style.cssText = `
                position:fixed;bottom:100px;left:50%;transform:translateX(-50%) translateY(20px);
                background:rgba(30,15,50,0.92);color:#f3e8ff;
                padding:0.6rem 1.25rem;border-radius:24px;font-size:0.82rem;font-weight:600;
                backdrop-filter:blur(12px);border:1px solid rgba(199,125,255,0.3);
                z-index:9999;opacity:0;transition:all 0.35s cubic-bezier(0.34,1.56,0.64,1);
                pointer-events:none;white-space:nowrap;
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        
        // Set color based on type
        if (type === 'info') {
            toast.style.borderColor = 'rgba(100,180,255,0.5)';
            toast.style.background = 'rgba(30,40,60,0.92)';
        } else {
            toast.style.borderColor = isError ? 'rgba(255,100,100,0.4)' : 'rgba(199,125,255,0.3)';
            toast.style.background = 'rgba(30,15,50,0.92)';
        }
        
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
        clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
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
        lockoutEndTime: 0         // Lockout end time
    };

    // ─── Helpers ─────────────────────────────────────────
    function normalizeSender(s) {
        if (!s) return 'Bhatari';
        if (s === 'me') return 'Bhatari';
        if (s === 'sanobar') return 'Bhandhari';
        return s;
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

        // Track which message IDs we expect to see
        const expectedMsgIds = new Set(chatState.messages.map(m => m.id));
        
        // Build ordered list of expected message IDs (preserving order)
        const expectedOrder = chatState.messages.map(m => m.id);

        // Step 1: Remove orphaned nodes (messages that no longer exist)
        for (const [id, el] of chatState.renderedIds) {
            if (!expectedMsgIds.has(id)) {
                el.remove();
                chatState.renderedIds.delete(id);
            }
        }

        // Step 2: Append ONLY new messages at the end (no full rebuild)
        let lastDateTs = null;
        let lastInsertedNode = null;
        
        for (const msg of chatState.messages) {
            // Handle date divider insertion
            if (lastDateTs === null || !sameDay(lastDateTs, msg.timestamp)) {
                const dividerKey = `divider-${msg.timestamp}`;
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
                chatState.renderedIds.set(msg.id, bubble);
                if (lastInsertedNode) {
                    lastInsertedNode.insertAdjacentElement('afterend', bubble);
                } else {
                    chatMessages.insertBefore(bubble, chatMessages.firstChild);
                }
                lastInsertedNode = bubble;
            }
        }

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
        const isBhatari = msg.sender === 'Bhatari';
        bubble.className = `chat-bubble ${isBhatari ? 'left' : 'right'}${msg.pending ? ' pending' : ''}`;

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
        
        // Update actions row visibility based on current identity toggle
        const actionsRow = bubble.querySelector('.chat-bubble-actions');
        if (actionsRow) {
            const editBtn = actionsRow.querySelector('.chat-action-btn');
            if (editBtn && editBtn.textContent.includes('Edit')) {
                // Show/hide edit button based on whether message belongs to current identity
                const shouldShow = msg.sender === chatState.currentIdentity;
                editBtn.style.display = shouldShow ? 'inline-flex' : 'none';
            }
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

    // ─── Create Bubble ────────────────────────────────────
    function createBubble(message) {
        const bubble = document.createElement('div');
        const isBhatari = message.sender === 'Bhatari';
        bubble.className = `chat-bubble ${isBhatari ? 'left' : 'right'}${message.pending ? ' pending' : ''}`;
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

        // Message text
        const textEl = document.createElement('div');
        textEl.className = 'chat-message-text';
        textEl.textContent = message.text;
        bubble.appendChild(textEl);

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

        // Action buttons row (Reply + Edit for own messages)
        const actionsRow = document.createElement('div');
        actionsRow.className = 'chat-bubble-actions';

        const replyBtn = document.createElement('button');
        replyBtn.className = 'chat-action-btn';
        replyBtn.type = 'button';
        replyBtn.textContent = '↩ Reply';
        replyBtn.addEventListener('click', e => { e.stopPropagation(); handleReply(message.id, message.text, message.sender); });
        actionsRow.appendChild(replyBtn);

        // Edit only own messages - always create button but control visibility via CSS class
        const editBtn = document.createElement('button');
        editBtn.className = 'chat-action-btn chat-edit-btn';
        editBtn.type = 'button';
        editBtn.textContent = '✏ Edit';
        editBtn.dataset.ownerId = message.sender;
        editBtn.style.display = (message.sender === chatState.currentIdentity) ? 'inline-flex' : 'none';
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

        // Auto-resize function for edit input
        const autoResize = () => {
            input.style.height = 'auto';
            const newHeight = Math.min(input.scrollHeight, 120); // Max 6 lines (~120px)
            input.style.height = newHeight + 'px';
        };

        input.addEventListener('input', () => {
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
    function handleSend() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (!text) return;
        chatInput.value = '';
        resizeChatInput(chatInput);
        sendMessage(text);
        clearOutgoingTyping();
    }

    async function sendMessage(text) {
        const replyTo = chatState.replyToMessage
            ? { id: chatState.replyToMessage.id, sender: chatState.replyToMessage.sender, text: chatState.replyToMessage.text }
            : null;
        cancelReply();
        try {
            await db.collection(CHATS_COL).add({
                sender:    chatState.currentIdentity,
                text,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                replyTo,
                isEdited: false
            });
        } catch (err) {
            console.error('Send error:', err);
            showToast('Message failed to send 😢', true);
        }
    }

    // ─── Reply ───────────────────────────────────────────
    function handleReply(msgId, text, sender) {
        chatState.replyToMessage = { id: msgId, text, sender };
        const container = document.getElementById('chat-reply-container');
        const quote     = document.getElementById('chat-reply-quote');
        if (container && quote) {
            quote.innerHTML = `<span class="reply-preview-sender">${escapeHtml(sender)}</span><span class="reply-preview-text">${escapeHtml(text.substring(0, 70))}${text.length > 70 ? '…' : ''}</span>`;
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

    // ─── Outgoing Typing ─────────────────────────────────
    function handleOutgoingTyping() {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            resizeChatInput(chatInput);
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
            const chatMessages = document.getElementById('chat-messages');
            
            if (!chatScene || !chatMessages) return;
            
            let initialViewportHeight = window.visualViewport.height;
            
            window.visualViewport.addEventListener('resize', () => {
                const currentHeight = window.visualViewport.height;
                const keyboardHeight = initialViewportHeight - currentHeight;
                
                // If keyboard is visible (viewport shrunk significantly)
                if (keyboardHeight > 100) {
                    // Add keyboard-visible class for CSS adjustments
                    chatScene.classList.add('keyboard-visible');
                    
                    // Scroll to bottom of messages when keyboard appears
                    setTimeout(() => {
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }, 100);
                } else {
                    // Keyboard hidden
                    chatScene.classList.remove('keyboard-visible');
                }
            });
            
            // Update initial height on orientation change
            window.visualViewport.addEventListener('scroll', () => {
                initialViewportHeight = window.visualViewport.height;
            });
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
