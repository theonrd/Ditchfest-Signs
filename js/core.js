// Shared plumbing for every page: config, session, Worker calls, DOM helpers.
// Load this first — everything else assumes window.tm exists.
//
//   tm.WORKER_URL            backend base URL (the tm-votes Cloudflare Worker)
//   tm.api(path, opts)       fetch + Bearer token + JSON, throws on non-2xx
//   tm.getUser() / isLoggedIn() / getToken()
//   tm.login() / logout() / sessionExpired()
//   tm.el(tag, className, text) / escapeHtml(str) / param(name)
//
// The session is a JWT the Worker signs and we keep in localStorage (the site
// and the Worker are different origins, so cookies are not an option). We only
// read the payload for display — the Worker verifies the signature on every
// call, so nothing here is trusted.

(function () {
    // After redeploying the Worker under a different name, this is the one
    // place to change.
    const WORKER_URL = 'https://tm-votes.onrd.workers.dev';

    const TOKEN_KEY = 'tm_token';
    // Where to return after login: the Worker always bounces back to the site
    // root, which would strand someone who started somewhere else.
    const RETURN_KEY = 'tm_return';

    // ── DOM helpers ─────────────────────────────────────────────────────────
    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : str;
        return div.innerHTML;
    }

    function param(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    /** Replace a container's contents with a single centred line of text. */
    function message(container, text) {
        if (!container) return;
        container.innerHTML = '';
        container.appendChild(el('p', 'subtitle', text));
    }

    // ── Session ─────────────────────────────────────────────────────────────
    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    function decodePayload(token) {
        try {
            const part = token.split('.')[1];
            return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
        } catch (e) {
            return null;
        }
    }

    function getUser() {
        const token = getToken();
        if (!token) return null;
        const payload = decodePayload(token);
        if (!payload) return null;
        // Drop expired tokens so the UI can't show a dead session.
        if (payload.exp && Date.now() / 1000 >= payload.exp) {
            localStorage.removeItem(TOKEN_KEY);
            return null;
        }
        return { accountId: payload.sub, displayName: payload.name };
    }

    function isLoggedIn() {
        return getUser() !== null;
    }

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

    function logout() {
        localStorage.removeItem(TOKEN_KEY);
    }

    /** The Worker rejected our token mid-session: drop it and start over. */
    function sessionExpired() {
        logout();
        login();
    }

    // On return from the Worker the JWT (or an error) arrives in the URL
    // fragment: #tm_token=… / #tm_error=… . Runs at load time, before any page
    // script, so everyone downstream sees a settled session.
    function consumeRedirect() {
        if (!window.location.hash) return;
        const params = new URLSearchParams(window.location.hash.slice(1));
        const token = params.get('tm_token');
        const error = params.get('tm_error');

        if (token) localStorage.setItem(TOKEN_KEY, token);
        else if (error) console.error('Login failed:', error);

        if (token || error) {
            // Strip the fragment without a history entry or a reload.
            history.replaceState(
                null,
                '',
                window.location.pathname + window.location.search
            );
        }
        if (token) returnToStartPage();
    }

    // Only ever a same-origin relative path we wrote ourselves, and never a
    // re-navigation to the page we are already on.
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

    // ── Worker API ──────────────────────────────────────────────────────────
    /**
     * Call the Worker. Returns the parsed JSON body; throws an Error carrying
     * `.status` and `.data` on anything that isn't 2xx, so callers can branch
     * on `e.status === 401` and otherwise show one generic failure message.
     *
     *   tm.api('/api/editions')
     *   tm.api('/api/vote', { body: { mapUid: uid, value: true } })
     */
    async function api(path, options) {
        const opts = options || {};
        const headers = {};
        const token = getToken();
        if (token) headers.Authorization = 'Bearer ' + token;

        const init = { method: opts.method || (opts.body ? 'POST' : 'GET') };
        if (opts.body !== undefined) {
            headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(opts.body);
        }
        init.headers = headers;

        const res = await fetch(WORKER_URL + path, init);
        let data = null;
        try {
            data = await res.json();
        } catch (e) {
            // Some errors come back as plain text; data stays null.
        }
        if (!res.ok) {
            const err = new Error((data && data.error) || 'HTTP ' + res.status);
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    }

    consumeRedirect();

    window.tm = {
        WORKER_URL: WORKER_URL,
        el: el,
        escapeHtml: escapeHtml,
        param: param,
        message: message,
        api: api,
        getToken: getToken,
        getUser: getUser,
        isLoggedIn: isLoggedIn,
        login: login,
        logout: logout,
        sessionExpired: sessionExpired,
    };
})();
