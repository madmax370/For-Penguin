const SONG_LYRICS = {
    "songs/song1.mp3": [
        { time: 0, text: "Yeh duniya waqif hai" },
        { time: 3, text: "Hum to NaQabil hai" },
        { time: 6, text: "Kyu tu honga mera?" },
        { time: 11, text: "Tujhpe jo marte hai" },
        { time: 13.4, text: "Hum unme shaamil hai" },
        { time: 16, text: "Hai badi baat kya!!!" }
    ],
    "songs/song2.mp3": [
        { time: 0, text: "Agar Kabhi" },
        { time: 1.6, text: "Main utar jaaun dil se bhi tere" },
        { time: 4, text: "To kisi gair se behter hai" },
        { time: 6, text: "Ke tum keh dena mujhe" },
        { time: 7.5, text: "Main bhul jaaonga" },
        { time: 9, text: "Yaad bhi na aaunga.." },
        { time: 11, text: "Rounga tere liye.." },
        { time: 12.9, text: "Par tujhe hasaunga" },
        { time: 14.8, text: "Dhup tere pe lage" },
        { time: 16.7, text: "To chaav me hojaunga " },
        { time: 19, text: "Jo uthani kaanch ho to" },
        { time: 20.6, text: "Haath main hojaunga.." },
        { time: 22.4, text: "Saath bhi na chorunga.." },
        { time: 24, text: "Paas bhi na aaunga" },
        { time: 26, text: "Har safar me main tera" },
        { time: 28, text: "Humsafar hojaaunga" },
        { time: 30, text: "Tum to phir tum ho na..." },
        { time: 32.4, text: "Tum aaon ya na aaon..." },
        { time: 34, text: "Main bhi main hu phir..." },
        { time: 35.7, text: "Main tumhe bulaunga!!!" }
    ]
};

// --- Smart Update Notification System ---
const UPDATE_CONFIG = {
    // IMPORTANT: Update this timestamp whenever you change content (Music, Shayari, etc.)
    // Format: YYYY-MM-DDTHH:MM:SSZ
    lastUpdated: "2026-05-10T01:14:03Z",
    message: "Both song cards have been updated, play them if you'd like to. 🎵✨"
};

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

        // 2. Button Navigations
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                const target = document.getElementById('s2-chart');
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            });
        }

        const goToChatBtn = document.getElementById('go-to-chat-btn');
        if (goToChatBtn) {
            goToChatBtn.addEventListener('click', () => {
                const target = document.getElementById('chat-container');
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Highlight the container slightly to show it's reached
                    target.style.transition = 'box-shadow 0.5s ease';
                    target.style.boxShadow = '0 0 30px rgba(199, 125, 255, 0.4)';
                    setTimeout(() => {
                        target.style.boxShadow = '';
                    }, 2000);
                }
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

        // 7. Check for New Updates (24-hour window)
        checkForUpdates();
    }

    function checkForUpdates() {
        const lastUpdatedDate = new Date(UPDATE_CONFIG.lastUpdated);
        const now = new Date();
        const diffInHours = (now - lastUpdatedDate) / (1000 * 60 * 60);

        // Logic: Show only if updated within last 24 hours AND not already dismissed
        const storageKey = `update_seen_${UPDATE_CONFIG.lastUpdated}`;
        if (diffInHours <= 24 && !localStorage.getItem(storageKey)) {
            showUpdateToast(UPDATE_CONFIG.message, storageKey);
        }
    }

    function showUpdateToast(msg, storageKey) {
        const toast = document.createElement('div');
        toast.className = 'update-toast';
        toast.innerHTML = `
            <span class="update-badge">New</span>
            <span class="update-message">${msg}</span>
            <button class="update-close">×</button>
        `;
        document.body.appendChild(toast);

        // Slide in
        setTimeout(() => toast.classList.add('show'), 1000);

        toast.querySelector('.update-close').onclick = () => {
            toast.classList.remove('show');
            localStorage.setItem(storageKey, 'true');
            setTimeout(() => toast.remove(), 600);
        };

        // Auto-hide after 15 seconds to keep UI clean
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 600);
            }
        }, 15000);
    }

    function setupAudio() {
        let currentAudio = null;
        let currentCard = null;
        let timeUpdateHandler = null;

        const musicCards = document.querySelectorAll('.music-card');

        musicCards.forEach(card => {
            const btn = card.querySelector('.play-btn');
            const lyricsWrapper = card.querySelector('.lyrics-wrapper');
            const lyricsContainer = card.querySelector('.lyrics-container');
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
                    if (timeUpdateHandler) {
                        currentAudio.removeEventListener('timeupdate', timeUpdateHandler);
                    }
                    const prevBtn = currentCard.querySelector('.play-btn');
                    if (prevBtn) prevBtn.textContent = '▶ Play';
                    currentCard.classList.remove('playing');
                }

                btn.textContent = '⏳ Loading...';
                btn.disabled = true;

                currentAudio = new Audio(audioSrc);
                currentCard = card;

                // --- Lyrics Setup ---
                const songLyricsData = SONG_LYRICS[audioSrc];
                if (lyricsWrapper && lyricsContainer && songLyricsData) {
                    card.classList.add('has-lyrics'); // For CSS expansion
                    lyricsContainer.innerHTML = '';

                    songLyricsData.forEach((lineData, index) => {
                        const div = document.createElement('div');
                        div.className = 'lyrics-line';
                        div.dataset.time = lineData.time;
                        div.dataset.index = index;
                        div.textContent = lineData.text;
                        
                        // NEW: Click to Seek
                        div.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (currentAudio) {
                                currentAudio.currentTime = parseFloat(lineData.time);
                            }
                        });

                        lyricsContainer.appendChild(div);
                    });

                    timeUpdateHandler = () => {
                        if (!currentAudio) return;
                        const currentTime = currentAudio.currentTime;
                        const lines = lyricsContainer.querySelectorAll('.lyrics-line');

                        let activeIndex = -1;
                        for (let i = 0; i < songLyricsData.length; i++) {
                            if (currentTime >= songLyricsData[i].time) {
                                activeIndex = i;
                            } else {
                                break;
                            }
                        }

                        if (activeIndex !== -1) {
                            const activeLine = lines[activeIndex];
                            if (!activeLine.classList.contains('active')) {
                                lines.forEach(l => l.classList.remove('active'));
                                activeLine.classList.add('active');
                                activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }
                    };
                    currentAudio.addEventListener('timeupdate', timeUpdateHandler);
                } else {
                    card.classList.remove('has-lyrics');
                }

                currentAudio.addEventListener('canplaythrough', () => {
                    if (currentCard === card) {
                        const playPromise = currentAudio.play();
                        if (playPromise !== undefined) {
                            playPromise.then(_ => {
                                btn.textContent = '⏸ Pause';
                                btn.disabled = false;
                                card.classList.add('playing');
                                // NEW: Immediate sync on play
                                if (timeUpdateHandler) timeUpdateHandler();
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
                    if (timeUpdateHandler) {
                        currentAudio.removeEventListener('timeupdate', timeUpdateHandler);
                    }
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

    // --- Bhandhari Online Notification (Telegram Integration) ---
    const notifyBtn = document.getElementById('notify-online-btn');
    if (notifyBtn) {
        notifyBtn.addEventListener('click', async () => {
            if (sessionStorage.getItem('notified_madmax')) {
                notifyBtn.style.animation = 'none';
                alert("You've already notified Bhatari! 🐧");
                return;
            }

            notifyBtn.disabled = true;
            notifyBtn.style.animation = 'none';
            notifyBtn.textContent = "🚀 Notifying...";

            const timeStr = new Date().toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit', hour12: true
            });

            const moods = ['💜', '✨', '🐧', '🌸', '💬', '🍭', '🎀'];
            const randomMood = moods[Math.floor(Math.random() * moods.length)];

            // Obfuscated Telegram Token
            const t1 = "8695269828:AAEa1pf";
            const t2 = "fPXcEfXZJIWiSMvE3BIxJtqINV94";
            const TG_TOKEN = t1 + t2;
            const CHAT_ID = "6219378525";

            const message = `🚀 *Bhandhari is Online!* ${randomMood}\n\n` +
                `✨ Status: *Waiting in Chat*\n` +
                `⏰ Time: _${timeStr}_\n\n` +
                `🐧 _Sent from Bhatari Comfort Space_`;

            try {
                const response = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: CHAT_ID,
                        text: message,
                        parse_mode: 'Markdown'
                    })
                });

                if (response.ok) {
                    notifyBtn.textContent = "✅ Bhatari Notified!";
                    sessionStorage.setItem('notified_madmax', 'true');
                } else {
                    throw new Error();
                }
            } catch (error) {
                console.error("Telegram notify failed");
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