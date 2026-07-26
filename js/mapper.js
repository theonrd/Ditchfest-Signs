// Account page (mapper.html?id=<accountId>): nickname, place in the Mappers
// leaderboard, achievements and every map in the catalog by this account.
//
// This is also your own page — there is no separate profile page. Opening your
// own adds logout and, for admins, the way into the admin panel; to everyone
// else it looks like any other account page.

(function () {
    const el = window.tm.el;

    function root() {
        return document.getElementById('mapper-root');
    }

    /** A dead end (no id, unknown account, network trouble) plus a way back. */
    function message(text) {
        const box = root();
        window.tm.message(box, text);
        box.appendChild(backLink());
    }

    function backLink() {
        const wrap = el('p', 'subtitle');
        const link = el('a', 'mapper-back', '← Back to the Mappers top');
        link.href = 'top-mappers.html';
        wrap.appendChild(link);
        return wrap;
    }

    async function load() {
        if (!root()) return;

        const id = window.tm.param('id');
        if (!id) {
            message('No account selected.');
            return;
        }

        window.tm.message(root(), 'Loading…');
        try {
            const data = await window.tm.api(
                '/api/mapper?id=' + encodeURIComponent(id)
            );
            render(data);
        } catch (e) {
            message(
                e.status === 404
                    ? 'No such Trackmania account.'
                    : 'Failed to load this account. Try again later.'
            );
        }
    }

    function render(m) {
        const box = root();
        box.innerHTML = '';
        document.title = (m.name || 'Account') + ' — Ditchfest Signs';

        box.appendChild(headerCard(m));

        box.appendChild(el('h2', 'mapper-section', 'Achievements'));
        box.appendChild(
            window.tmAchievements.grid(m.achievements, 'Nothing unlocked yet.')
        );

        box.appendChild(el('h2', 'mapper-section', 'Maps'));
        if (!m.maps.length) {
            box.appendChild(el('p', 'ach-empty', 'No maps in the catalog.'));
        } else {
            const list = el('div', 'mapper-maps');
            m.maps.forEach(function (map) {
                list.appendChild(mapRow(map));
            });
            box.appendChild(list);
        }

        box.appendChild(backLink());
    }

    function headerCard(m) {
        const card = el('div', 'mapper-card');
        card.appendChild(el('h1', 'mapper-name', m.name || 'Unknown player'));

        const stats = el('div', 'mapper-stats');
        // Someone who only votes has no maps, and so no place in the top.
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

        // Linked accounts: everything on this page already counts them as one.
        if (m.alts && m.alts.length) {
            const names = m.alts.map(function (a) {
                return a.displayName || a.accountId;
            });
            card.appendChild(
                el('div', 'mapper-alts', 'also playing as ' + names.join(', '))
            );
        }

        card.appendChild(el('div', 'mapper-id', m.accountId));

        if (isOwner(m)) {
            card.appendChild(ownerPanel());
            confirmSession();
        }
        return card;
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

    // ── Owner-only bits ─────────────────────────────────────────────────────
    // Additive: the page renders identically for visitors, it just grows a few
    // controls when you are looking at yourself.

    // Membership, not equality: accounts an admin linked together are one
    // person, so signing in on an alternate still opens "your" page.
    function isOwner(m) {
        const user = window.tm.getUser();
        if (!user) return false;
        return (m.members || [m.accountId]).indexOf(user.accountId) !== -1;
    }

    function ownerPanel() {
        const panel = el('div', 'mapper-owner');
        panel.appendChild(el('div', 'mapper-you', 'This is your page.'));

        const actions = el('div', 'mapper-owner-actions');

        // The only entry point to onboarding — it is deliberately not in the nav.
        const onboarding = el('a', 'auth-btn', 'Start here');
        onboarding.href = 'onboarding.html';
        actions.appendChild(onboarding);

        const logout = el('button', 'auth-btn', 'Logout');
        logout.addEventListener('click', function () {
            window.tm.logout();
            window.location.reload(); // falls back to the public view
        });
        actions.appendChild(logout);

        panel.appendChild(actions);
        return panel;
    }

    // Verify the token server-side: a dead session must not keep showing owner
    // controls, and the answer also says whether to reveal the admin entry.
    async function confirmSession() {
        if (!window.tm.getToken()) return;
        try {
            const me = await window.tm.api('/api/me');
            if (me && me.isAdmin) showAdminLink();
        } catch (e) {
            if (e.status === 401) {
                window.tm.logout();
                window.location.reload();
            }
            // Anything else: leave the page as rendered.
        }
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

    document.addEventListener('DOMContentLoaded', load);
})();
