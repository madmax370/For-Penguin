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

    // Initialize from session storage safely
    let failedAttempts = parseInt(sessionStorage.getItem('pwd_attempts') || '0');
    let lockoutEndTime = parseInt(sessionStorage.getItem('pwd_lockout_end') || '0');
    let isLockedOut = false;

    // Check if still locked out on page load
    const now = Date.now();
    if (lockoutEndTime > now) {
        isLockedOut = true;
        const remainingSeconds = Math.ceil((lockoutEndTime - now) / 1000);
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

    const checkPassword = () => {
        if (isLockedOut) return;

        if (passwordInput.value === '1102') {
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
            this.scenes = [
                'scene-ladder',
                'scene-envelope',
                'scene-dua'
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

            // Reset interactive elements

            // Reset ladder
            document.querySelectorAll('.ladder-card').forEach(card => card.classList.remove('visible'));
            const ladderBtn = document.getElementById('ladder-continue-btn');
            if (ladderBtn) ladderBtn.classList.remove('show');
            const ladderSceneEl = document.getElementById('scene-ladder');
            if (ladderSceneEl) ladderSceneEl.scrollTop = 0;
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

        onSceneEnter(index) {
            switch (index) {
                case 0: enterLadderScene(); break;
                case 1: enterEnvelopeScene(); break;
                case 2: enterDuaScene(); break;
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

        // Floating hearts on tap (preserved from original)
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

        const containerRect = container.getBoundingClientRect();
        const clip0Rect = clip0.getBoundingClientRect();
        const clip2Rect = clip2.getBoundingClientRect();

        // Calculate positions relative to the container top using viewport-relative bounding rects
        const clip0Top = clip0Rect.top - containerRect.top;
        const clip2Bottom = clip2Rect.bottom - containerRect.top;

        // Start the string at the first card's clip center
        const startY = clip0Top + (clip0Rect.height / 2);
        // End the string at the third card's clip center
        const endY = clip2Bottom - (clip2Rect.height / 2);

        const stringHeight = endY - startY;

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
                    
                    // If all images loaded (or timed out), show continue button
                    if (loadedCount >= totalImages) {
                        setTimeout(() => {
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

    // Scroll listener to fade out scroll hint in Scene 3
    const ladderSceneEl = document.getElementById('scene-ladder');
    const scrollHintEl = document.getElementById('ladder-scroll-hint');
    if (ladderSceneEl && scrollHintEl) {
        ladderSceneEl.addEventListener('scroll', () => {
            if (ladderSceneEl.scrollTop > 40) {
                scrollHintEl.style.opacity = '0';
                scrollHintEl.style.transform = 'translateY(10px)';
            } else {
                scrollHintEl.style.opacity = '0.8';
                scrollHintEl.style.transform = 'translateY(0)';
            }
        });
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
        const envContinueBtn = document.getElementById('envelope-continue-btn');

        // Open envelope
        if (envelope) envelope.classList.add('opened');

        // Haptic
        if (navigator.vibrate) navigator.vibrate([20, 30, 20]);

        // After envelope opens, show fullscreen letter
        setTimeout(() => {
            if (letterFs) letterFs.classList.add('active');
        }, 1000);

        // Hide the open button
        if (openEnvelopeBtn) openEnvelopeBtn.style.display = 'none';

        // Show continue button
        if (envContinueBtn) {
            envContinueBtn.style.opacity = '1';
            envContinueBtn.classList.add('show');
        }
    }

    if (openEnvelopeBtn) {
        openEnvelopeBtn.addEventListener('click', openEnvelope);
    }
    if (envelopeEl) {
        envelopeEl.addEventListener('click', openEnvelope);
    }

    // Close letter
    const letterCloseBtn = document.getElementById('letter-close-btn');
    if (letterCloseBtn) {
        letterCloseBtn.addEventListener('click', () => {
            const letterFs = document.getElementById('letter-fullscreen');
            if (letterFs) letterFs.classList.remove('active');

            // Close the envelope too!
            setTimeout(() => {
                const envelope = document.getElementById('envelope-element');
                if (envelope) envelope.classList.remove('opened');

                // Show the open button again
                if (openEnvelopeBtn) {
                    openEnvelopeBtn.style.display = '';
                    openEnvelopeBtn.disabled = false;
                }
                envelopeOpened = false;
            }, 300);
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
    //  SCENE 5 — TELEGRAM REPLY BOX
    // ===================================================

    // Telegram Bot credentials
    const TG_BOT_TOKEN = '8695269828:AAEa1pffPXcEfXZJIWiSMvE3BIxJtqINV94';
    const TG_CHAT_ID = '6219378525';

    function enterDuaScene() {
        // Reset UI fully on each entry
        const grandEnding = document.getElementById('grand-ending');
        if (grandEnding) grandEnding.classList.remove('active');

        const replyBox = document.getElementById('reply-box-container');
        if (replyBox) replyBox.classList.remove('fade-out');

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

    // ── Show inline success toast, then reset form ────────
    function showReplySuccess() {
        setReplyLoading(false);
        setReplyFeedback('✓  Delivered! 💜', 'success');

        // Light confetti celebration
        fireConfetti();
        setTimeout(fireConfetti, 800);

        // A few floating hearts
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const x = window.innerWidth * (0.3 + Math.random() * 0.4);
                const y = window.innerHeight * (0.5 + Math.random() * 0.25);
                createHeart(x, y);
            }, i * 120);
        }

        // Clear textarea, keep feedback visible for 2.8 s then reset
        const textarea = document.getElementById('reply-message');
        if (textarea) textarea.value = '';
        const charEl = document.getElementById('char-count');
        if (charEl) { charEl.textContent = '0'; charEl.style.color = ''; }

        setTimeout(() => {
            setReplyFeedback('', '');
        }, 2800);
    }

    // ===================================================
    //  MESSAGE GALAXY - Paper Plane Animation & Star Creation
    // ===================================================
    
    const messageGalaxy = document.getElementById('message-galaxy');
    const storedStars = JSON.parse(localStorage.getItem('messageGalaxyStars') || '[]');
    
    // Load existing stars from localStorage
    storedStars.forEach(starData => {
        createGalaxyStar(starData.message, starData.timestamp, true);
    });

    function createPaperPlaneAnimation(message) {
        // Create paper plane element
        const plane = document.createElement('div');
        plane.className = 'paper-plane';
        plane.innerHTML = '✈️';
        plane.style.position = 'absolute';
        plane.style.fontSize = '32px';
        plane.style.zIndex = '10000';
        plane.style.pointerEvents = 'none';
        plane.style.willChange = 'transform, opacity';
        
        // Start position (near reply box)
        const replyBox = document.getElementById('reply-box-container');
        const replyRect = replyBox.getBoundingClientRect();
        const startX = replyRect.left + replyRect.width / 2;
        const startY = replyRect.top;
        
        plane.style.left = startX + 'px';
        plane.style.top = startY + 'px';
        document.body.appendChild(plane);
        
        // Animate to top-right corner
        const endX = window.innerWidth - 100;
        const endY = 80;
        
        // Calculate angle for rotation
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        
        // Animate with smooth easing
        const duration = 2000;
        const startTime = performance.now();
        
        function animatePlane(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            
            const currentX = startX + deltaX * eased;
            const currentY = startY + deltaY * eased;
            
            plane.style.transform = `translate(${currentX - startX}px, ${currentY - startY}px) rotate(${angle}deg) scale(${1 - eased * 0.3})`;
            plane.style.opacity = 1 - eased * 0.3;
            
            if (progress < 1) {
                requestAnimationFrame(animatePlane);
            } else {
                // Plane reached destination - transform into star
                plane.remove();
                createGalaxyStar(message, Date.now());
            }
        }
        
        requestAnimationFrame(animatePlane);
    }

    function createGalaxyStar(message, timestamp, isInitial = false) {
        if (!messageGalaxy) return;
        
        const star = document.createElement('div');
        star.className = 'galaxy-star';
        star.innerHTML = '⭐';
        star.style.position = 'absolute';
        star.style.fontSize = '20px';
        star.style.cursor = 'pointer';
        star.style.zIndex = '9998';
        star.style.willChange = 'transform, opacity';
        star.dataset.message = message;
        star.dataset.timestamp = timestamp;
        
        // Random position in top-right galaxy area
        const maxX = messageGalaxy.offsetWidth || window.innerWidth * 0.4;
        const maxY = messageGalaxy.offsetHeight || 300;
        
        const randomX = Math.random() * maxX;
        const randomY = Math.random() * maxY;
        
        star.style.left = randomX + 'px';
        star.style.top = randomY + 'px';
        
        // Twinkle animation
        const twinkleDuration = 2 + Math.random() * 2;
        star.style.animation = `twinkle ${twinkleDuration}s infinite ease-in-out`;
        
        // Click/hover to show message preview
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            showStarMessagePreview(star, message, timestamp);
        });
        
        star.addEventListener('mouseenter', () => {
            star.style.transform = 'scale(1.3)';
        });
        
        star.addEventListener('mouseleave', () => {
            star.style.transform = 'scale(1)';
        });
        
        messageGalaxy.appendChild(star);
        
        // Save to localStorage if not initial load
        if (!isInitial) {
            const newStarData = { message, timestamp };
            storedStars.push(newStarData);
            // Keep only last 50 messages
            if (storedStars.length > 50) storedStars.shift();
            localStorage.setItem('messageGalaxyStars', JSON.stringify(storedStars));
        }
        
        // Fade in animation
        star.style.opacity = '0';
        star.style.transform = 'scale(0)';
        setTimeout(() => {
            star.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            star.style.opacity = '1';
            star.style.transform = 'scale(1)';
        }, 50);
    }

    function showStarMessagePreview(starElement, message, timestamp) {
        // Remove any existing previews
        const existingPreview = document.querySelector('.star-message-preview');
        if (existingPreview) existingPreview.remove();
        
        const preview = document.createElement('div');
        preview.className = 'star-message-preview glass-card';
        preview.style.position = 'absolute';
        preview.style.background = 'rgba(255, 255, 255, 0.95)';
        preview.style.backdropFilter = 'blur(10px)';
        preview.style.borderRadius = '12px';
        preview.style.padding = '16px';
        preview.style.maxWidth = '280px';
        preview.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
        preview.style.zIndex = '10001';
        preview.style.fontSize = '0.9rem';
        preview.style.lineHeight = '1.5';
        preview.style.color = '#2b1d11';
        
        const date = new Date(timestamp);
        const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        
        preview.innerHTML = `
            <div style="font-size: 0.75rem; color: #888; margin-bottom: 8px;">${dateStr}</div>
            <div style="white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(message)}</div>
        `;
        
        // Position near the star
        const starRect = starElement.getBoundingClientRect();
        const galaxyRect = messageGalaxy.getBoundingClientRect();
        
        let previewX = starRect.left - galaxyRect.left;
        let previewY = starRect.bottom - galaxyRect.top + 10;
        
        // Prevent overflow
        if (previewX + 280 > galaxyRect.width) {
            previewX = galaxyRect.width - 280 - 10;
        }
        if (previewY + 150 > galaxyRect.height) {
            previewY = starRect.top - galaxyRect.top - 150 - 10;
        }
        
        preview.style.left = Math.max(10, previewX) + 'px';
        preview.style.top = Math.max(10, previewY) + 'px';
        
        messageGalaxy.appendChild(preview);
        
        // Close on click outside
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!preview.contains(e.target) && !starElement.contains(e.target)) {
                    preview.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 10);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ── Send-button click handler ─────────────────────────
    const sendReplyBtn = document.getElementById('send-reply-btn');
    if (sendReplyBtn) {
        sendReplyBtn.addEventListener('click', async () => {
            const textarea = document.getElementById('reply-message');
            if (!textarea) return;

            const rawText = textarea.value.trim();

            // ── Validation ──
            if (!rawText) {
                setReplyError('Please write something before sending! 💜');
                textarea.focus();
                return;
            }
            if (rawText.length < 3) {
                setReplyError('Your message is too short. Write a little more! 🌸');
                textarea.focus();
                return;
            }

            // ── Network check ──
            if (!navigator.onLine) {
                setReplyError('You seem to be offline. Please check your connection! 📡');
                return;
            }

            setReplyError('');
            setReplyLoading(true);

            try {
                await sendReplyToTelegram(rawText);
                showReplySuccess();
                // Trigger paper plane animation AFTER successful send
                setTimeout(() => {
                    createPaperPlaneAnimation(rawText);
                }, 500);
            } catch (err) {
                console.error('Telegram send error:', err);
                setReplyLoading(false);
                setReplyError('Something went wrong. Please try again! 🙏');
            }
        });
    }

    // ── Character counter ─────────────────────────────────
    const replyTextarea = document.getElementById('reply-message');
    const charCountEl = document.getElementById('char-count');
    if (replyTextarea && charCountEl) {
        replyTextarea.addEventListener('input', () => {
            const len = replyTextarea.value.length;
            charCountEl.textContent = len;
            // Warn when nearing limit
            charCountEl.style.color = len >= 1950 ? '#ff85a1' : '';
            // Clear error as the user types
            if (len > 0) setReplyError('');
        });

        // Allow Ctrl+Enter to submit
        replyTextarea.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                const btn = document.getElementById('send-reply-btn');
                if (btn && !btn.disabled) btn.click();
            }
        });
    }

    // ── Replay button ─────────────────────────────────────
    const replayBtn = document.getElementById('replay-btn');
    if (replayBtn) {
        replayBtn.addEventListener('click', () => {
            if (window._sceneController) {
                window._sceneController.reset();
                window._sceneController.showScene(0);
            }
        });
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
        heart.style.zIndex = '9999'; // Ensure hearts always appear above all content
        heart.style.willChange = 'transform, opacity';
        document.body.appendChild(heart);
        setTimeout(() => heart.remove(), 1500);
    }

}); // END DOMContentLoaded