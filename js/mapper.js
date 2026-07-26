// Account page (mapper.html?id=<accountId>): nickname, place in the Mappers
// leaderboard, achievements and every map they have in the catalog. Linked from
// the leaderboard rows in js/mappers.js and from the auth bar. No login needed
// to view — this doubles as the player's own page (there is no separate profile
// page), so opening your own adds logout and, for admins, the admin entry.
// Relies on window.tmAuth for the Worker URL and window.tmAchievements for the
// badge markup (both loaded first).

(function () {
    const WORKER_URL = window.tmAuth.WORKER_URL;

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function message(text) {
        const root = document.getElementById('mapper-root');
        root.innerHTML = '';
        root.appendChild(el('p', 'subtitle', text));
        const back = el('p', 'subtitle');
        const link = el('a', 'mapper-back', '← Back to the Mappers top');
        link.href = 'top-mappers.html';
        back.appendChild(link);
        root.appendChild(back);
    }

    async function load() {
        const root = document.getElementById('mapper-root');
        if (!root) return;

        const id = new URLSearchParams(window.location.search).get('id');
        if (!id) {
            message('No mapper selected.');
            return;
        }

        root.innerHTML = '';
        root.appendChild(el('p', 'subtitle', 'Loading…'));

        try {
            const res = await fetch(
                WORKER_URL + '/api/mapper?id=' + encodeURIComponent(id)
            );
            if (res.status === 404) {
                message('No such Trackmania account.');
                return;
            }
            const data = await res.json();
            render(data);
        } catch (e) {
            message('Failed to load this mapper. Try again later.');
        }
    }

    function render(m) {
        const root = document.getElementById('mapper-root');
        root.innerHTML = '';

        document.title = (m.name || 'Mapper') + ' — Ditchfest Signs';

        // ── Header card: who they are and where they stand ──────────────────
        const card = el('div', 'mapper-card');
        card.appendChild(el('h1', 'mapper-name', m.name || 'Unknown player'));

        const stats = el('div', 'mapper-stats');
        // Someone who only votes has no maps and so no place in the top.
        stats.appendChild(
            m.rank
                ? stat('#' + m.rank, 'of ' + m.total + ' mappers')
                : stat('—', 'not in the mappers top')
        );
        stats.appendChild(stat(String(m.votes), m.votes === 1 ? 'vote' : 'votes'));
        stats.appendChild(
            stat(String(m.maps.length), m.maps.length === 1 ? 'map' : 'maps')
        );
        card.appendChild(stats);

        card.appendChild(el('div', 'mapper-id', m.accountId));

        if (isOwner(m.accountId)) {
            card.appendChild(ownerPanel());
            confirmSession();
        }
        root.appendChild(card);

        // ── Achievements ────────────────────────────────────────────────────
        root.appendChild(el('h2', 'mapper-section', 'Achievements'));
        root.appendChild(
            window.tmAchievements.grid(m.achievements, 'Nothing unlocked yet.')
        );

        // ── Their maps ──────────────────────────────────────────────────────
        root.appendChild(el('h2', 'mapper-section', 'Maps'));
        if (!m.maps.length) {
            root.appendChild(el('p', 'ach-empty', 'No maps in the catalog.'));
        } else {
            const list = el('div', 'mapper-maps');
            m.maps.forEach(function (map) {
                list.appendChild(mapRow(map));
            });
            root.appendChild(list);
        }

        const back = el('p', 'subtitle');
        const link = el('a', 'mapper-back', '← Back to the Mappers top');
        link.href = 'top-mappers.html';
        back.appendChild(link);
        root.appendChild(back);
    }

    // ── Owner-only bits ─────────────────────────────────────────────────────
    // Everything below is additive: the page renders identically for visitors,
    // it just grows a few controls when you are looking at yourself.

    function isOwner(accountId) {
        const user = window.tmAuth.getUser();
        return !!user && user.accountId === accountId;
    }

    function ownerPanel() {
        const panel = el('div', 'mapper-owner');
        panel.appendChild(el('div', 'mapper-you', 'This is your page.'));

        const actions = el('div', 'mapper-owner-actions');

        const onboarding = el('a', 'auth-btn', 'Onboarding');
        onboarding.href = 'onboarding.html';
        actions.appendChild(onboarding);

        const logout = el('button', 'auth-btn', 'Logout');
        logout.addEventListener('click', function () {
            window.tmAuth.logout();
            window.location.reload(); // falls back to the public view
        });
        actions.appendChild(logout);

        panel.appendChild(actions);
        return panel;
    }

    // Verify the token server-side: a dead session must not keep showing owner
    // controls, and the answer also tells us whether to reveal the admin entry.
    function confirmSession() {
        const token = window.tmAuth.getToken();
        if (!token) return;
        fetch(WORKER_URL + '/api/me', {
            headers: { Authorization: 'Bearer ' + token },
        })
            .then(function (res) {
                if (res.status === 401) {
                    window.tmAuth.logout();
                    window.location.reload();
                    return null;
                }
                return res.json();
            })
            .then(function (data) {
                if (data && data.isAdmin) showAdminLink();
            })
            .catch(function () {
                // Network error — leave the page as rendered.
            });
    }

    // The admin panel is reachable only from your own page; nobody else ever
    // sees this badge.
    function showAdminLink() {
        const actions = document.querySelector('.mapper-owner-actions');
        if (!actions || document.getElementById('mapper-admin-link')) return;
        const link = el('a', 'admin-badge', 'Admin');
        link.id = 'mapper-admin-link';
        link.href = 'admin.html';
        actions.appendChild(link);
    }

    function stat(value, label) {
        const box = el('div', 'mapper-stat');
        box.appendChild(el('div', 'mapper-stat-value', value));
        box.appendChild(el('div', 'mapper-stat-label', label));
        return box;
    }

    function mapRow(map) {
        const row = el('div', 'map-row');

        if (map.thumbnailUrl) {
            const img = el('img', 'map-thumb');
            img.src = map.thumbnailUrl;
            img.alt = '';
            img.loading = 'lazy';
            img.addEventListener('error', function () {
                img.style.display = 'none';
            });
            row.appendChild(img);
        }

        const info = el('div', 'map-info');
        info.appendChild(el('div', 'map-name', map.name));
        info.appendChild(el('div', 'map-author', map.editionName || ''));
        row.appendChild(info);

        row.appendChild(el('div', 'map-votes', map.votes + ' ✓'));
        return row;
    }

    document.addEventListener('DOMContentLoaded', load);
})();
