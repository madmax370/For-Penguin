document.addEventListener('DOMContentLoaded', () => {

    // 0. Password Logic
    const passwordOverlay = document.getElementById('password-overlay');
    const passwordInput = document.getElementById('password-input');
    const unlockBtn = document.getElementById('unlock-btn');
    const passwordError = document.getElementById('password-error');
    const mainContent = document.getElementById('main-content');

    // Auto-initialize if the lock screen is turned off
    if (passwordOverlay && passwordOverlay.style.display === 'none') {
        initMainApp();
        const firstSection = document.getElementById('s1-opening');
        if (firstSection) firstSection.classList.add('fade-in-visible');
    }

    let failedAttempts = 0;
    let isLockedOut = false;

    // Create lockout message element dynamically
    const lockoutMsg = document.createElement('p');
    lockoutMsg.className = 'lockout-msg';
    lockoutMsg.style.display = 'none';
    passwordError.parentNode.insertBefore(lockoutMsg, passwordError.nextSibling);

    const checkPassword = () => {
        if (isLockedOut) return;

        if (passwordInput.value === '1102') {
            failedAttempts = 0; // Reset on success
            passwordOverlay.style.opacity = '0';
            setTimeout(() => {
                passwordOverlay.style.display = 'none';
                mainContent.style.display = 'block';

                // Trigger professional intro transition
                requestAnimationFrame(() => {
                    mainContent.style.opacity = '1';
                    mainContent.style.transform = 'scale(1)';
                });

                // Re-trigger global initialization
                initMainApp();

                const firstSection = document.getElementById('s1-opening');
                if (firstSection) firstSection.classList.add('fade-in-visible');
            }, 500); // Smooth fade out for overlay
        } else {
            failedAttempts++;
            passwordInput.value = '';

            if (failedAttempts >= 3) {
                isLockedOut = true;
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
                        passwordInput.focus();
                    }
                }, 1000);
            } else {
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

    // --- NEW: Professional Inline PIN Unlocking ---
    window.focusPinInput = (lockElement) => {
        const input = lockElement.querySelector('.pin-input-hidden');
        
        // Reset input state on every focus to avoid "already filled" bugs
        input.value = '';
        const dots = lockElement.querySelectorAll('.pin-dot');
        dots.forEach(dot => dot.classList.remove('filled'));
        
        input.focus();
        lockElement.classList.add('focused');

        input.onblur = () => lockElement.classList.remove('focused');
        input.onfocus = () => {
            lockElement.classList.add('focused');
            // Re-clear to be absolutely sure
            input.value = ''; 
            dots.forEach(dot => dot.classList.remove('filled'));
        };
    };

    window.handlePinInput = (inputElement) => {
        const lockElement = inputElement.closest('.component-lock');
        const dots = lockElement.querySelectorAll('.pin-dot');
        
        // Robust value extraction for mobile browsers
        let value = inputElement.value;
        value = value.replace(/[^0-9]/g, '').slice(0, 4);
        
        // Sync the internal value immediately
        inputElement.value = value;

        // Visual update with forced synchronization
        dots.forEach((dot, index) => {
            if (index < value.length) {
                dot.classList.add('filled');
            } else {
                dot.classList.remove('filled');
            }
        });

        // Validation logic
        if (value.length === 4) {
            if (value === '1102') {
                lockElement.classList.add('unlocked');
                lockElement.closest('.locked-container').classList.add('is-unlocked');
                
                // Success feedback: vibration
                if (navigator.vibrate) navigator.vibrate([20, 30, 20]);

                if (lockElement.closest('.chat-section')) {
                    setTimeout(() => {
                        const display = document.getElementById('replies-display');
                        if (display) display.scrollTop = display.scrollHeight;
                    }, 600);
                }
            } else {
                // Wrong PIN feedback
                lockElement.classList.add('shake');
                if (navigator.vibrate) navigator.vibrate(200);
                
                setTimeout(() => {
                    lockElement.classList.remove('shake');
                    inputElement.value = '';
                    dots.forEach(dot => dot.classList.remove('filled'));
                }, 400);
            }
        }
    };

    // --- HEAVY SECURITY: Anti-Tamper Measures ---
    // If a dev tries to hide the lock overlay or show content via inspector, this resets it.
    const setupTamperProtection = () => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                const target = mutation.target;
                const container = target.closest('.locked-container');

                // If the container is NOT unlocked but the lock is hidden/modified
                if (container && !container.classList.contains('is-unlocked')) {
                    if (mutation.type === 'attributes' || mutation.type === 'childList') {
                        // Check if lock overlay was removed or hidden
                        const lock = container.querySelector('.component-lock');
                        if (!lock || lock.style.display === 'none' || lock.style.opacity === '0') {
                            console.warn("Security Breach Detected: Content re-locking...");
                            location.reload(); // Refresh to restore all security
                        }
                    }
                }
            });
        });

        document.querySelectorAll('.locked-container').forEach(container => {
            observer.observe(container, { attributes: true, childList: true, subtree: false });
        });
    };
    setupTamperProtection();

    // --- NEW: Security & Network Handling ---
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

    // Privacy Protection: RELOCK when user leaves tab
    // OPTIMIZED: No page reload. Firestore listeners stay alive to avoid re-downloading messages.
    // Only the UI is locked — PIN overlay is shown again without any network cost.
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // 1. Immediate Blackout when tab is hidden
            let blackout = document.getElementById('privacy-blackout');
            if (!blackout) {
                blackout = document.createElement('div');
                blackout.id = 'privacy-blackout';
                blackout.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#05020a;z-index:999999;';
                document.body.appendChild(blackout);
            }
            blackout.style.display = 'block';

            // 2. Close any open GIF pickers or attach popups
            if (window.closeAllPanels) window.closeAllPanels();

            // 3. Clear sensitive input values immediately
            passwordInput.value = '';
            document.querySelectorAll('.pin-input-hidden').forEach(i => i.value = '');

        } else {
            // 3. UI-only re-lock on return — NO page reload, NO Firestore re-fetch
            const blackout = document.getElementById('privacy-blackout');
            if (blackout) blackout.style.display = 'none';

            // Re-show the main password overlay (forces PIN re-entry)
            mainContent.style.display = 'none';
            passwordOverlay.style.display = 'flex';
            passwordOverlay.style.opacity = '1';
            passwordInput.value = '';
            passwordInput.focus();

            // Re-lock all component PIN overlays (chat, photos, etc.)
            document.querySelectorAll('.locked-container').forEach(container => {
                container.classList.remove('is-unlocked');
                const lock = container.querySelector('.component-lock');
                if (lock) {
                    lock.classList.remove('unlocked');
                    const pinInput = lock.querySelector('.pin-input-hidden');
                    if (pinInput) pinInput.value = '';
                    const dots = lock.querySelectorAll('.pin-dot');
                    dots.forEach(dot => dot.classList.remove('filled'));
                }
            });
        }
    });

    function initMainApp() {
        // 1. Core Systems (Optimized Restore: Very low count for perfect performance)
        createParticles();

        // 2. Start Button Navigation
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                const target = document.getElementById('s2-chart');
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            });
        }

        // 3. Floating Hearts (Bonus interaction - Throttled for performance)
        let lastHeartTime = 0;
        document.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'A') {
                const now = Date.now();
                if (now - lastHeartTime > 200) {
                    createHeart(e.pageX, e.pageY);
                    lastHeartTime = now;
                }
            }
        });

        // 4. Intersection Observer for Fade-in & Staggered effects
        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -20px 0px',
            threshold: 0 // Trigger as soon as 1 pixel is visible
        };

        const sectionObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in-visible');

                    const children = entry.target.querySelectorAll('.photo-card, .music-card, .shayari-card, .personality-list li');
                    children.forEach((child, index) => {
                        setTimeout(() => {
                            child.classList.add('visible');
                            child.style.opacity = "1";
                            child.style.transform = "translate3d(0,0,0)";
                        }, 100 * index);
                    });

                    if (entry.target.id === 's2-chart') {
                        const chart = entry.target.querySelector('.pie-chart');
                        if (chart) setTimeout(() => chart.classList.add('start-chart-anim'), 300);
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        const sections = document.querySelectorAll('.fade-in-hidden');
        sections.forEach(section => {
            sectionObserver.observe(section);
        });

        // 5. Robust Audio Controller
        setupAudio();

        // 6. Cursor Glow Trailer (Desktop Only)
        if (window.innerWidth > 1024) {
            const glow = document.createElement('div');
            glow.className = 'cursor-glow';
            document.body.appendChild(glow);
            window.addEventListener('mousemove', (e) => {
                glow.style.transform = `translate3d(${e.clientX - 150}px, ${e.clientY - 150}px, 0)`;
            });
        }
    }

    function setupAudio() {
        let currentAudio = null;
        let currentCard = null;

        const musicCards = document.querySelectorAll('.music-card');

        musicCards.forEach(card => {
            const btn = card.querySelector('.play-btn');
            if (!btn) return;

            const audioSrc = card.getAttribute('data-audio');

            btn.addEventListener('click', () => {
                if (currentAudio && currentCard === card) {
                    if (!currentAudio.paused) {
                        currentAudio.pause();
                        btn.textContent = '▶ Play';
                        card.classList.remove('playing');
                    } else {
                        currentAudio.play().catch(e => console.log("Audio play blocked."));
                        btn.textContent = '⏸ Pause';
                        card.classList.add('playing');
                    }
                    return;
                }

                if (currentAudio) {
                    currentAudio.pause();
                    const prevBtn = currentCard.querySelector('.play-btn');
                    if (prevBtn) prevBtn.textContent = '▶ Play';
                    currentCard.classList.remove('playing');
                }

                btn.textContent = '⏳ Loading...';
                btn.disabled = true;

                currentAudio = new Audio(audioSrc);
                currentCard = card;

                currentAudio.addEventListener('canplaythrough', () => {
                    if (currentCard === card) {
                        const playPromise = currentAudio.play();
                        if (playPromise !== undefined) {
                            playPromise.then(_ => {
                                btn.textContent = '⏸ Pause';
                                btn.disabled = false;
                                card.classList.add('playing');
                            }).catch(error => {
                                btn.textContent = '▶ Play';
                                btn.disabled = false;
                                console.log("Playback failed:", error);
                            });
                        }
                    }
                }, { once: true });

                currentAudio.addEventListener('ended', () => {
                    btn.textContent = '▶ Play';
                    card.classList.remove('playing');
                    currentAudio = null;
                    currentCard = null;
                });

                currentAudio.addEventListener('error', () => {
                    btn.textContent = '❌ Error Loading';
                    btn.disabled = false;
                    console.log("Audio load error.");
                });
            });
        });
    }

    function createHeart(x, y) {
        const heart = document.createElement('div');
        heart.innerHTML = '💜';
        heart.style.position = 'absolute';
        heart.style.left = x + 'px';
        heart.style.top = y + 'px';
        heart.style.fontSize = '20px';
        heart.style.pointerEvents = 'none';
        heart.style.animation = 'floatUp 1.5s ease-out forwards';
        heart.style.zIndex = '1000';
        heart.style.willChange = 'transform, opacity';
        document.body.appendChild(heart);
        setTimeout(() => heart.remove(), 1500);
    }
    // Playlist button logic
    const playlistBtn = document.getElementById('playlist-btn');
    if (playlistBtn) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            playlistBtn.href = 'vnd.youtube://playlist?list=PLuLZEPAfgr7GTFfv1fCR80laIrGdKn8z9';
            playlistBtn.removeAttribute('target');
        }
    }

    // --- Bhandhari Online Notification (Brevo Integration) ---
    const notifyBtn = document.getElementById('notify-online-btn');
    if (notifyBtn) {
        notifyBtn.addEventListener('click', async () => {
            if (sessionStorage.getItem('notified_madmax')) {
                notifyBtn.style.animation = 'none'; // Stop pulse
                alert("You've already notified Bhatari! 🐧");
                return;
            }

            notifyBtn.disabled = true;
            notifyBtn.style.animation = 'none'; // Stop pulse immediately
            notifyBtn.textContent = "⏳ Notifying...";

            // Get human-readable time (e.g., 11:59 PM)
            const timeStr = new Date().toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
            });

            // Random emoji to ensure unique subject lines
            const moods = ['💜', '✨', '🐧', '🌸', '💬', '🍭', '🎀'];
            const randomMood = moods[Math.floor(Math.random() * moods.length)];

            // Obfuscated key to deter simple bots
            const k1 = "xkeysib-c79ba323f247914b1534019a4f8a93c51add92c444f";
            const k2 = "010578a07a1aea00a53c3-Lnmk98xb1MHy5fyL";
            const BREVO_KEY = k1 + k2;

            const payload = {
                sender: { name: "Bhandhari", email: "madmax801065@gmail.com" },
                to: [{ email: "madmax801065@gmail.com", name: "MadMax" }],
                subject: `Bhandhari is Online! (${timeStr}) ${randomMood}`,
                htmlContent: `
                    <div style="background:#0f0c29; color:white; padding:20px; border-radius:10px; font-family:sans-serif; border: 1px solid #c77dff;">
                        <h2 style="color:#c77dff;">Hello MadMax!</h2>
                        <p style="font-size:1.1rem;">Bhandhari is currently online and waiting in the chat! 🐧</p>
                        <hr style="border:0; border-top:1px solid #333; margin: 20px 0;">
                        <p style="font-size:0.8rem; opacity:0.6;">Sent from your Bhandhari Chat App</p>
                    </div>
                `
            };

            try {
                const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'api-key': BREVO_KEY,
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    notifyBtn.textContent = "✅ Bhatari Notified!";
                    sessionStorage.setItem('notified_madmax', 'true');
                } else {
                    throw new Error();
                }
            } catch (error) {
                console.error("Notify failed");
                notifyBtn.textContent = "❌ Failed. Retry?";
                notifyBtn.disabled = false;
            }
        });
    }
}); // <--- Closing DOMContentLoaded properly

// Optimized Particle System for Mobile
function createParticles() {
    const container = document.getElementById('particles-container');
    if (!container) return;

    const isMobile = window.innerWidth <= 768;
    const numParticles = isMobile ? 6 : 15;

    for (let i = 0; i < numParticles; i++) {
        const particle = document.createElement('div');
        const size = 2; // Fixed small size for fastest rendering
        particle.style.position = 'absolute';
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.background = '#c77dff';
        particle.style.borderRadius = '50%';
        particle.style.left = `${Math.random() * 90}vw`; // Stay within screen
        particle.style.top = `${Math.random() * 90}vh`; // Stay within screen

        particle.style.willChange = 'transform';
        const duration = Math.random() * 10 + 20; // Even slower for elegance
        const delay = Math.random() * -20;
        // Safer path: 0 to 10% movement only to stay within screen
        particle.style.animation = `flowSafe ${duration}s linear ${delay}s infinite alternate`;
        container.appendChild(particle);
    }

    if (!document.getElementById('particle-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'particle-styles';
        styleSheet.innerText = `
            @keyframes flowSafe {
                0% { transform: translate3d(0, 0, 0); opacity: 0; }
                50% { opacity: 0.4; }
                100% { transform: translate3d(20px, 40px, 0); opacity: 0; }
            }
        `;
        document.head.appendChild(styleSheet);
    }
}