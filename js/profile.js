// Personal account page (profile.html). Shows the logged-in player's nickname
// and account id, and lets them log out. Relies on window.tmAuth from auth.js
// (which must be included before this script).

(function () {
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function renderLoggedOut(card) {
        card.innerHTML =
            '<h1 class="profile-title">Личный кабинет</h1>' +
            '<p class="profile-hint">Вы не вошли в аккаунт.</p>' +
            '<button class="auth-btn" id="profile-login">Login with Ubisoft</button>';
        document
            .getElementById('profile-login')
            .addEventListener('click', function () {
                window.tmAuth.login();
            });
    }

    function renderLoggedIn(card, user) {
        card.innerHTML =
            '<h1 class="profile-title">Личный кабинет</h1>' +
            '<div class="profile-row">' +
            '<span class="profile-label">Никнейм</span>' +
            '<span class="profile-value">' + escapeHtml(user.displayName) + '</span>' +
            '</div>' +
            '<div class="profile-row">' +
            '<span class="profile-label">Account ID</span>' +
            '<span class="profile-value profile-mono">' + escapeHtml(user.accountId) + '</span>' +
            '</div>' +
            '<button class="auth-btn" id="profile-logout">Logout</button>';
        document
            .getElementById('profile-logout')
            .addEventListener('click', function () {
                window.tmAuth.logout();
                render();
            });
    }

    function render() {
        const card = document.getElementById('profile-card');
        if (!card) return;

        const user = window.tmAuth && window.tmAuth.getUser();
        if (user) {
            renderLoggedIn(card, user);
            confirmSession();
        } else {
            renderLoggedOut(card);
        }
    }

    // Verify the token server-side. If the Worker rejects it (expired/invalid),
    // drop it and re-render as logged out so the UI can't show a dead session.
    function confirmSession() {
        const token = window.tmAuth.getToken();
        if (!token) return;
        fetch(window.tmAuth.WORKER_URL + '/api/me', {
            headers: { Authorization: 'Bearer ' + token },
        })
            .then(function (res) {
                if (res.status === 401) {
                    window.tmAuth.logout();
                    render();
                }
            })
            .catch(function () {
                // Network error — leave the locally-decoded view as-is.
            });
    }

    // auth.js registers its DOMContentLoaded handler first (it's included first),
    // so by the time this runs the redirect fragment is already consumed.
    document.addEventListener('DOMContentLoaded', render);
})();
