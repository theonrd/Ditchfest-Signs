// Voting page (voting.html): every Ditchfest edition as a collapsible group of
// maps, each with a "+" button. A logged-in player can vote for as many maps as
// they like and toggle any vote at any time.
//
// This is the "I know what I'm doing" view. Newcomers get onboarding.html,
// which walks the same catalog one edition at a time.

(function () {
    const el = window.tm.el;

    let myVotes = new Set();

    async function load() {
        const root = document.getElementById('voting-root');
        if (!root) return;
        window.tm.message(root, 'Loading…');

        try {
            const data = await window.tm.api('/api/editions');
            myVotes = new Set(data.myVotes || []);
            render(root, data.editions || []);
        } catch (e) {
            window.tm.message(root, 'Failed to load maps. Try again later.');
        }
    }

    function render(root, editions) {
        root.innerHTML = '';

        if (!editions.length) {
            window.tm.message(
                root,
                'The map catalog is syncing. Please check back soon.'
            );
            return;
        }

        if (!window.tm.isLoggedIn()) {
            root.appendChild(
                el(
                    'p',
                    'subtitle',
                    'Log in to vote — you can vote for as many maps as you like.'
                )
            );
        }

        // Newest edition open, the rest collapsed, so the page reads as a list
        // of numbers you can expand.
        editions.forEach(function (edition, index) {
            const group = el('section', 'vote-group');
            if (index === 0) group.classList.add('open');

            const header = el('button', 'vote-group-header');
            header.appendChild(el('span', 'vg-title', edition.name));
            header.appendChild(el('span', 'vg-count', edition.maps.length + ' maps'));
            header.addEventListener('click', function () {
                group.classList.toggle('open');
            });
            group.appendChild(header);

            const body = el('div', 'vote-group-body');
            edition.maps.forEach(function (map) {
                body.appendChild(mapRow(map));
            });
            group.appendChild(body);

            root.appendChild(group);
        });
    }

    // ── Hover preview ───────────────────────────────────────────────────────
    // The row thumbnail is 64x36, too small to recognise a map by. Hovering it
    // shows the same image full size in a box that follows the cursor.
    // Pointer-only: touch devices have no hover, so they skip it.
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
            // The user may have moved to a different button while this was
            // in flight, or moved away entirely — don't clobber what's shown.
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

    // ── Rows and voting ─────────────────────────────────────────────────────

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
        info.appendChild(el('div', 'map-name', map.name));
        info.appendChild(
            el('div', 'map-author', map.authorName ? 'by ' + map.authorName : '')
        );
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
            // The vote count just changed — next hover should show the fresh list.
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

    document.addEventListener('DOMContentLoaded', load);
})();