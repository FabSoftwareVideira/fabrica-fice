// Register a minimal service worker and handle beforeinstallprompt gracefully.
(function () {
    let deferredPrompt = null;
    const installBtnId = 'pwaInstallBtn';

    async function registerSW() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/sw.js');
                console.log('[pwa] service worker registered');
            } catch (err) {
                console.warn('[pwa] sw registration failed', err);
            }
        }
    }

    function showInstallButton() {
        const btn = document.getElementById(installBtnId);
        if (!btn) return;
        btn.style.display = '';
        btn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const choice = await deferredPrompt.userChoice;
            console.log('[pwa] userChoice', choice);
            deferredPrompt = null;
            // hide button after choice
            btn.style.display = 'none';
        });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log('[pwa] beforeinstallprompt fired');
        // wait for DOM ready to show button
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', showInstallButton);
        } else {
            showInstallButton();
        }
    });

    // Fallback: try to register SW on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registerSW);
    } else {
        registerSW();
    }

    // expose for testing
    window.triggerPWAInstall = async function () {
        if (!deferredPrompt) return false;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        return outcome;
    };
})();
