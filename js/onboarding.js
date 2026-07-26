// Onboarding (onboarding.html): guided first-time voting, one Ditchfest edition
// per screen instead of the wall of ~27 collapsible groups on voting.html.
//
// Nothing is kept in the browser: likes go to /api/vote immediately and each
// finished edition is marked with /api/onboarding/step, so closing the tab
// mid-run loses nothing — the page resumes on the first unfinished edition.
// Walking through all of them unlocks an achievement.
//
// Relies on window.tmAuth (auth.js) and window.tmAchievements (achievements.js).

(function () {
    const WORKER_URL = window.tmAuth.WORKER_URL;

    let editions = [];        // oldest edition first, only ones that have maps
    let done = new Set();     // campaignIds already walked through
    let myVotes = new Set();  // mapUids this player has liked
    let index = 0;            // edition currently on screen

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function authHeaders() {
        const token = window.tmAuth.getToken();
        return token ? { Authorization: 'Bearer ' + token } : {};
    }

    function root() {
        return document.getElementById('onboarding-root');
    }

    // Session died mid-flow: drop the dead token and ask for a fresh login
    // rather than silently failing every click.
    function sessionExpired() {
        window.tmAuth.logout();
        renderSignIn('Your session expired. Sign in again to continue.');
    }

    // ── Screens ─────────────────────────────────────────────────────────────

    function renderSignIn(note) {
        const box = root();
        box.innerHTML = '';

        const card = el('div', 'ob-card-panel');
        card.appendChild(el('h1', 'ob-title', 'Vote like a local'));
        card.appendChild(
            el(
                'p',
                'ob-lead',
                'Ditchfest voting used to live in Discord. Now it lives here: ' +
                    'we walk you through the editions one at a time, you tap the ' +
                    'maps you like, and you can stop whenever you want.'
            )
        );
        if (note) card.appendChild(el('p', 'ob-note', note));

        const btn = el('button', 'auth-btn', 'Login with Ubisoft');
        btn.addEventListener('click', function () {
            window.tmAuth.login();
        });
        card.appendChild(btn);

        box.appendChild(card);
    }

    function renderMessage(text) {
        const box = root();
        box.innerHTML = '';
        box.appendChild(el('p', 'subtitle', text));
    }

    function renderStep() {
        const box = root();
        const edition = editions[index];
        box.innerHTML = '';

        // Progress reflects editions actually finished, not the screen you are
        // on — going Back doesn't rewind the bar.
        const head = el('div', 'ob-head');
        head.appendChild(
            el('div', 'ob-step', 'Edition ' + (index + 1) + ' of ' + editions.length)
        );
        const bar = el('div', 'ob-bar');
        const fill = el('div', 'ob-bar-fill');
        fill.style.width =
            Math.round((done.size / editions.length) * 100) + '%';
        bar.appendChild(fill);
        head.appendChild(bar);
        head.appendChild(
            el('div', 'ob-step', done.size + ' / ' + editions.length + ' done')
        );
        box.appendChild(head);

        box.appendChild(el('h1', 'ob-title', edition.name));
        box.appendChild(
            el(
                'p',
                'ob-lead',
                'Click every map you like. Liking nothing here is a valid answer — ' +
                    'just hit Next.'
            )
        );

        const grid = el('div', 'ob-grid');
        edition.maps.forEach(function (map) {
            grid.appendChild(mapCard(map));
        });
        box.appendChild(grid);

        box.appendChild(controls());
    }

    function controls() {
        const bar = el('div', 'ob-controls');

        const back = el('button', 'auth-btn', '← Back');
        back.disabled = index === 0;
        back.addEventListener('click', function () {
            if (index > 0) {
                index--;
                renderStep();
                scrollUp();
            }
        });
        bar.appendChild(back);

        const later = el('a', 'ob-later', 'Finish later');
        later.href = 'index.html';
        later.title = 'Your progress is already saved';
        bar.appendChild(later);

        const isLast = index === editions.length - 1;
        const next = el('button', 'auth-btn ob-next', isLast ? 'Finish' : 'Next →');
        next.addEventListener('click', function () {
            step(next);
        });
        bar.appendChild(next);

        return bar;
    }

    function renderFinish(unlocked) {
        const box = root();
        box.innerHTML = '';

        const card = el('div', 'ob-card-panel');
        card.appendChild(el('h1', 'ob-title', 'That is every edition. Respect.'));
        card.appendChild(
            el(
                'p',
                'ob-lead',
                'Your votes are counted in the Mappers top. Come back when a new ' +
                    'Ditchfest drops — it will show up here as one more step.'
            )
        );

        if (unlocked && unlocked.length) {
            card.appendChild(el('div', 'ob-unlocked', 'Achievement unlocked'));
            unlocked.forEach(function (a) {
                card.appendChild(window.tmAchievements.card(a));
            });
        }

        const links = el('div', 'ob-controls');
        const toMappers = el('a', 'auth-btn', 'See the Mappers top');
        toMappers.href = 'top-mappers.html';
        links.appendChild(toMappers);
        const user = window.tmAuth.getUser();
        if (user) {
            const toMe = el('a', 'auth-btn', 'My achievements');
            toMe.href = 'mapper.html?id=' + encodeURIComponent(user.accountId);
            links.appendChild(toMe);
        }
        card.appendChild(links);

        box.appendChild(card);
        scrollUp();
    }

    // ── Map cards ───────────────────────────────────────────────────────────

    function mapCard(map) {
        const card = el('button', 'ob-map');
        card.type = 'button';

        if (map.thumbnailUrl) {
            const img = el('img', 'ob-thumb');
            img.src = map.thumbnailUrl;
            img.alt = '';
            img.loading = 'lazy';
            img.addEventListener('error', function () {
                img.style.display = 'none';
            });
            card.appendChild(img);
        }

        const info = el('div', 'ob-map-info');
        info.appendChild(el('div', 'ob-map-name', map.name));
        info.appendChild(
            el('div', 'ob-map-author', map.authorName ? 'by ' + map.authorName : '')
        );
        card.appendChild(info);

        const mark = el('div', 'ob-mark', '+');
        card.appendChild(mark);

        setCard(card, myVotes.has(map.mapUid));
        card.addEventListener('click', function () {
            toggle(map.mapUid, card);
        });

        return card;
    }

    function setCard(card, liked) {
        card.classList.toggle('liked', liked);
        card.dataset.liked = liked ? '1' : '0';
        card.querySelector('.ob-mark').textContent = liked ? '✓' : '+';
    }

    async function toggle(mapUid, card) {
        const value = card.dataset.liked !== '1';
        card.disabled = true;
        // Flip straight away — the click should feel instant; the server
        // response only confirms it.
        setCard(card, value);

        try {
            const res = await fetch(WORKER_URL + '/api/vote', {
                method: 'POST',
                headers: Object.assign(
                    { 'Content-Type': 'application/json' },
                    authHeaders()
                ),
                body: JSON.stringify({ mapUid: mapUid, value: value }),
            });
            if (res.status === 401) {
                sessionExpired();
                return;
            }
            const data = await res.json();
            if (data.voted) {
                myVotes.add(mapUid);
            } else {
                myVotes.delete(mapUid);
            }
            setCard(card, !!data.voted);
        } catch (e) {
            setCard(card, !value); // network died — undo the optimistic flip
        } finally {
            card.disabled = false;
        }
    }

    // ── Flow ────────────────────────────────────────────────────────────────

    /** Mark the current edition done server-side, then move on. */
    async function step(button) {
        const edition = editions[index];
        button.disabled = true;
        try {
            const res = await fetch(WORKER_URL + '/api/onboarding/step', {
                method: 'POST',
                headers: Object.assign(
                    { 'Content-Type': 'application/json' },
                    authHeaders()
                ),
                body: JSON.stringify({ campaignId: edition.campaignId }),
            });
            if (res.status === 401) {
                sessionExpired();
                return;
            }
            const data = await res.json();
            done = new Set(data.done || []);

            if (data.completed) {
                renderFinish(data.newAchievements);
                return;
            }
            advance();
        } catch (e) {
            button.disabled = false;
            // Mark it locally anyway so a flaky network doesn't trap them on
            // one screen; the next successful step re-syncs the real list.
            done.add(edition.campaignId);
            advance();
        }
    }

    /** Next screen: the following edition, or the first one still unfinished
     *  (they may have jumped Back and forth). */
    function advance() {
        if (index + 1 < editions.length) {
            index++;
        } else {
            const pending = firstUnfinished();
            if (pending === -1) {
                renderFinish(null);
                return;
            }
            index = pending;
        }
        renderStep();
        scrollUp();
    }

    function firstUnfinished() {
        for (let i = 0; i < editions.length; i++) {
            if (!done.has(editions[i].campaignId)) return i;
        }
        return -1;
    }

    function scrollUp() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ── Boot ────────────────────────────────────────────────────────────────

    async function load() {
        if (!root()) return;

        if (!window.tmAuth.isLoggedIn()) {
            renderSignIn(null);
            return;
        }

        renderMessage('Loading…');

        let data;
        try {
            const res = await fetch(WORKER_URL + '/api/onboarding', {
                headers: authHeaders(),
            });
            if (res.status === 401) {
                sessionExpired();
                return;
            }
            data = await res.json();
        } catch (e) {
            renderMessage('Failed to load the maps. Try again later.');
            return;
        }

        editions = data.editions || [];
        done = new Set(data.done || []);
        myVotes = new Set(data.myVotes || []);

        if (!editions.length) {
            renderMessage('The map catalog is syncing. Please check back soon.');
            return;
        }
        if (data.completed) {
            renderFinish(null);
            return;
        }

        const pending = firstUnfinished();
        index = pending === -1 ? 0 : pending;
        renderStep();
    }

    document.addEventListener('DOMContentLoaded', load);
})();
