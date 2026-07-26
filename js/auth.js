// Ubisoft / Trackmania login for the static Ditchfest Signs site.
//
// The OAuth flow itself lives in the Cloudflare Worker (tm-votes). This script
// only: kicks off login by sending the user to the Worker, receives the signed
// session JWT the Worker puts in the URL fragment on return, stores it in
// localStorage, and renders the login widget. The token is later sent as
// `Authorization: Bearer <jwt>` to Worker API calls (e.g. future map voting).
//
// window.tmAuth is exposed for other scripts: getToken(), getUser(), isLoggedIn().

(function () {
    // ── Config ──────────────────────────────────────────────────────────────
    // After deploying the Worker, replace this with its URL (from `npm run deploy`),
    // e.g. "https://tm-votes.yourname.workers.dev". No trailing slash.
    const WORKER_URL = 'https://tm-votes.onrd.workers.dev';

    const TOKEN_KEY = 'tm_token';
    // Where to send the user after login. The Worker always bounces back to the
    // site root, which would drop someone who started on e.g. the onboarding
    // page into the gallery instead.
    const RETURN_KEY = 'tm_return';

    // ── Token storage ───────────────────────────────────────────────────────
    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    function setToken(token) {
        localStorage.setItem(TOKEN_KEY, token);
    }

    function clearToken() {
        localStorage.removeItem(TOKEN_KEY);
    }

    // Decode the JWT payload for display only. Trust is not established here —
    // the Worker verifies the signature on every API call. We just read the
    // name and expiry so we can show the right UI and drop stale tokens.
    function decodePayload(token) {
        try {
            const part = token.split('.')[1];
            const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
            return JSON.parse(json);
        } catch (e) {
            return null;
        }
    }

    function getUser() {
        const token = getToken();
        if (!token) return null;
        const payload = decodePayload(token);
        if (!payload) return null;
        // Drop expired tokens so the UI reflects reality.
        if (payload.exp && Date.now() / 1000 >= payload.exp) {
            clearToken();
            return null;
        }
        return { accountId: payload.sub, displayName: payload.name };
    }

    function isLoggedIn() {
        return getUser() !== null;
    }

    // ── Actions ─────────────────────────────────────────────────────────────
    function login() {
        try {
            sessionStorage.setItem(
                RETURN_KEY,
                window.location.pathname + window.location.search
            );
        } catch (e) {
            // Private mode / storage disabled — we just lose the return path.
        }
        window.location.href = WORKER_URL + '/auth/login';
    }

    // Send the user back to the page they pressed Login on. Only ever a
    // same-origin relative path we wrote ourselves, and never a re-navigation
    // to the page we are already on.
    function returnToStartPage() {
        let back = null;
        try {
            back = sessionStorage.getItem(RETURN_KEY);
            sessionStorage.removeItem(RETURN_KEY);
        } catch (e) {
            return;
        }
        if (!back || back.charAt(0) !== '/' || back.charAt(1) === '/') return;
        if (back === window.location.pathname + window.location.search) return;
        window.location.replace(back);
    }

    function logout() {
        clearToken();
        render();
    }

    // On return from the Worker, the JWT (or an error) arrives in the URL
    // fragment: #tm_token=... or #tm_error=... . Consume and clean it up.
    function consumeRedirect() {
        if (!window.location.hash) return;
        const params = new URLSearchParams(window.location.hash.slice(1));
        const token = params.get('tm_token');
        const error = params.get('tm_error');

        if (token) {
            setToken(token);
        } else if (error) {
            console.error('Login failed:', error);
        }

        if (token || error) {
            // Strip the fragment without adding a history entry or reloading.
            history.replaceState(
                null,
                '',
                window.location.pathname + window.location.search
            );
        }
        if (token) returnToStartPage();
    }

    // ── UI ──────────────────────────────────────────────────────────────────
    function render() {
        const bar = document.getElementById('auth-bar');
        if (!bar) return;

        const user = getUser();
        if (user) {
            // Your own account page — the same public page everyone else can
            // open, with owner controls added (js/mapper.js).
            bar.innerHTML =
                '<a href="mapper.html?id=' +
                encodeURIComponent(user.accountId) +
                '" class="auth-user">' +
                escapeHtml(user.displayName) +
                '</a>' +
                '<button class="auth-btn" id="auth-logout">Logout</button>';
            document
                .getElementById('auth-logout')
                .addEventListener('click', logout);
        } else {
            bar.innerHTML =
                '<button class="auth-btn" id="auth-login">Login with Ubisoft</button>';
            document
                .getElementById('auth-login')
                .addEventListener('click', login);
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ── Boot ────────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        consumeRedirect();
        render();
    });

    window.tmAuth = { getToken, getUser, isLoggedIn, login, logout, WORKER_URL };
})();
