// Account page (mapper.html?id=<accountId>): nickname, place in the Mappers
// leaderboard, achievements and every map in the catalog by this account.
//
// This is also your own page — there is no separate profile page. Opening your
// own adds logout and, for admins, the way into the admin panel; to everyone
// else it looks like any other account page.

(function () {
    const el = window.tm.el;

    let myVotes = new Set();

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
            myVotes = new Set(data.myVotes || []);
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
        document.title = 'Ditchfest ' + (m.name || 'Account');

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

        card.appendChild(el('div', 'mapper-id', m.accountId));

        if (isOwner(m.accountId)) {
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

    // ── Hover preview ───────────────────────────────────────────────────────
    // Same behaviour as on the voting page: the row thumbnail is 64x36, too
    // small to recognise a map by. Hovering it shows the same image full size
    // in a box that follows the cursor. Pointer-only: touch devices skip it.
    const canHover =
        !window.matchMedia || window.matchMedia('(hover: hover)').matches;

    let preview = null;
    let previewImg = null;
    let lastPoint = null;

    function getPreview() {
        if (!preview) {
            preview = el('div', 'map-preview');
            previewImg = el('img');
            previewImg.alt = '';
            // The box has no height until the image arrives, so the first
            // placement is a guess — redo it once the real size is known.
            previewImg.addEventListener('load', function () {
                if (lastPoint) movePreview(lastPoint);
            });
            previewImg.addEventListener('error', hidePreview);
            preview.appendChild(previewImg);
            document.body.appendChild(preview);
        }
        return preview;
    }

    function hidePreview() {
        if (preview) preview.classList.remove('visible');
    }

    function movePreview(e) {
        const box = getPreview();
        lastPoint = { clientX: e.clientX, clientY: e.clientY };
        const pad = 12;
        const gap = 20;
        const w = box.offsetWidth || 400;
        const h = Math.max(box.offsetHeight, (box.offsetWidth || 400) * 0.5625);

        let x = e.clientX + gap;
        let y = e.clientY + gap;
        // Flip to the other side of the cursor rather than run off-screen.
        if (x + w + pad > window.innerWidth) x = e.clientX - w - gap;
        if (y + h + pad > window.innerHeight) y = e.clientY - h - gap;

        box.style.transform =
            'translate(' + Math.max(pad, x) + 'px, ' + Math.max(pad, y) + 'px)';
    }

    function attachPreview(thumb, url) {
        if (!canHover) return;

        thumb.addEventListener('mouseenter', function (e) {
            const box = getPreview();
            if (previewImg.src !== url) previewImg.src = url;
            movePreview(e);
            box.classList.add('visible');
        });
        thumb.addEventListener('mousemove', movePreview);
        thumb.addEventListener('mouseleave', function () {
            lastPoint = null;
            hidePreview();
        });
    }

    // ── Voter popovers ──────────────────────────────────────────────────────
    // Hovering a vote button that already has at least one vote shows who
    // voted for that map. Resolved lazily from /api/map-voters and cached per
    // map so re-hovering the same button doesn't refetch. Pointer-only, same
    // reasoning as the thumbnail preview above.
    const voterCache = new Map(); // mapUid -> { status: 'loading'|'done'|'error', voters }
    let votersBox = null;
    let votersToken = 0;

    function getVotersBox() {
        if (!votersBox) {
            votersBox = el('div', 'voters-popover');
            document.body.appendChild(votersBox);
        }
        return votersBox;
    }

    function hideVoters() {
        if (votersBox) votersBox.classList.remove('visible');
    }

    function positionVoters(btn) {
        const box = getVotersBox();
        const rect = btn.getBoundingClientRect();
        const pad = 12;
        const gap = 8;
        const w = box.offsetWidth || 220;
        const h = box.offsetHeight || 40;

        let x = rect.left;
        let y = rect.bottom + gap;
        if (x + w + pad > window.innerWidth) x = window.innerWidth - w - pad;
        if (x < pad) x = pad;
        // Flip above the button if there's no room below.
        if (y + h + pad > window.innerHeight) y = rect.top - h - gap;

        box.style.transform =
            'translate(' + Math.max(pad, x) + 'px, ' + Math.max(pad, y) + 'px)';
    }

    function renderVoters(box, state) {
        box.innerHTML = '';
        if (state.status === 'loading') {
            box.appendChild(el('div', 'voters-status', 'Loading…'));
            return;
        }
        if (state.status === 'error') {
            box.appendChild(el('div', 'voters-status', 'Failed to load.'));
            return;
        }
        if (!state.voters.length) {
            box.appendChild(el('div', 'voters-status', 'No votes yet.'));
            return;
        }
        const list = el('ul', 'voters-list');
        state.voters.forEach(function (voter) {
            list.appendChild(el('li', 'voters-item', voter.name || 'Unknown player'));
        });
        box.appendChild(list);
    }

    async function loadVoters(mapUid) {
        const cached = voterCache.get(mapUid);
        if (cached && cached.status !== 'error') return cached;

        voterCache.set(mapUid, { status: 'loading', voters: [] });
        let entry;
        try {
            const data = await window.tm.api(
                '/api/map-voters?mapUid=' + encodeURIComponent(mapUid)
            );
            entry = { status: 'done', voters: data.voters || [] };
        } catch (e) {
            entry = { status: 'error', voters: [] };
        }
        voterCache.set(mapUid, entry);
        return entry;
    }

    function attachVotersPopover(btn, mapUid) {
        if (!canHover) return;

        btn.addEventListener('mouseenter', async function () {
            const count = parseInt(btn.dataset.count || '0', 10);
            if (!count) return; // nobody to show

            const myToken = ++votersToken;
            const box = getVotersBox();
            const cached = voterCache.get(mapUid);
            renderVoters(
                box,
                cached && cached.status !== 'error'
                    ? cached
                    : { status: 'loading', voters: [] }
            );
            positionVoters(btn);
            box.classList.add('visible');

            const state = await loadVoters(mapUid);
            if (myToken !== votersToken) return;
            if (!box.classList.contains('visible')) return;
            renderVoters(box, state);
            positionVoters(btn);
        });

        btn.addEventListener('mouseleave', function () {
            hideVoters();
        });
    }

    // Both popovers are position: fixed, so anything that moves the page under
    // the cursor would strand them next to an element that is no longer there.
    if (canHover) {
        window.addEventListener('scroll', hidePreview, true);
        window.addEventListener('blur', hidePreview);
        window.addEventListener('scroll', hideVoters, true);
        window.addEventListener('blur', hideVoters);
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
                hidePreview();
            });
            attachPreview(img, map.thumbnailUrl);
            row.appendChild(img);
        }

        const info = el('div', 'map-info');
        const nameLink = el('a', 'map-name', map.name);
        nameLink.href = 'https://trackmania.io/#/leaderboard/' + encodeURIComponent(map.mapUid);
        nameLink.target = '_blank';
        nameLink.rel = 'noopener';
        info.appendChild(nameLink);
        info.appendChild(el('div', 'map-author', map.editionName || ''));
        row.appendChild(info);

        const btn = el('button', 'vote-btn vote-btn-sm');
        setBtn(btn, myVotes.has(map.mapUid), map.votes);
        btn.addEventListener('click', function () {
            toggleVote(map.mapUid, btn);
        });
        attachVotersPopover(btn, map.mapUid);
        row.appendChild(btn);

        return row;
    }

    function setBtn(btn, voted, count) {
        btn.classList.toggle('voted', voted);
        btn.dataset.voted = voted ? '1' : '0';
        btn.dataset.count = String(count);
        btn.textContent = (voted ? '✓ ' : '+ ') + count;
    }

    async function toggleVote(mapUid, btn) {
        if (!window.tm.isLoggedIn()) {
            window.tm.login();
            return;
        }
        const value = btn.dataset.voted !== '1';
        btn.disabled = true;
        try {
            const data = await window.tm.api('/api/vote', {
                body: { mapUid: mapUid, value: value },
            });
            if (data.voted) myVotes.add(mapUid);
            else myVotes.delete(mapUid);
            setBtn(btn, data.voted, data.votes);
            voterCache.delete(mapUid);
        } catch (e) {
            if (e.status === 401) {
                window.tm.sessionExpired();
                return;
            }
            // Network error — leave the button as it was.
        } finally {
            btn.disabled = false;
        }
    }

    // ── Owner-only bits ─────────────────────────────────────────────────────
    // Additive: the page renders identically for visitors, it just grows a few
    // controls when you are looking at yourself.

    function isOwner(accountId) {
        const user = window.tm.getUser();
        return !!user && user.accountId === accountId;
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