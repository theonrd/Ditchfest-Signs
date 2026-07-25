// Voting page (voting.html): shows Ditchfest maps grouped by edition (theme),
// each with a "+" button. A logged-in user can vote for any number of maps and
// toggle their votes at any time. Relies on window.tmAuth (auth.js, loaded first).

(function () {
    const WORKER_URL = window.tmAuth.WORKER_URL;

    let myVotes = new Set();

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

    async function load() {
        const root = document.getElementById('voting-root');
        if (!root) return;
        root.innerHTML = '';
        root.appendChild(el('p', 'subtitle', 'Loading…'));

        try {
            const res = await fetch(WORKER_URL + '/api/editions', {
                headers: authHeaders(),
            });
            const data = await res.json();
            myVotes = new Set(data.myVotes || []);
            render(data.editions || []);
        } catch (e) {
            root.innerHTML = '';
            root.appendChild(el('p', 'subtitle', 'Failed to load maps. Try again later.'));
        }
    }

    function render(editions) {
        const root = document.getElementById('voting-root');
        root.innerHTML = '';

        if (!editions.length) {
            root.appendChild(
                el('p', 'subtitle', 'The map catalog is syncing. Please check back soon.')
            );
            return;
        }

        if (!window.tmAuth.isLoggedIn()) {
            root.appendChild(
                el('p', 'subtitle', 'Log in to vote — you can vote for as many maps as you like.')
            );
        }

        editions.forEach(function (edition) {
            const section = el('section', 'edition');
            section.appendChild(el('h2', 'edition-title', edition.name));

            const grid = el('div', 'map-grid');
            edition.maps.forEach(function (map) {
                grid.appendChild(mapCard(map));
            });
            section.appendChild(grid);
            root.appendChild(section);
        });
    }

    function mapCard(map) {
        const card = el('div', 'map-card');

        if (map.thumbnailUrl) {
            const img = el('img', 'map-thumb');
            img.src = map.thumbnailUrl;
            img.alt = map.name;
            img.loading = 'lazy';
            img.addEventListener('error', function () {
                img.style.display = 'none';
            });
            card.appendChild(img);
        }

        card.appendChild(el('div', 'map-name', map.name));
        card.appendChild(
            el('div', 'map-author', map.authorName ? 'by ' + map.authorName : '')
        );

        const btn = el('button', 'vote-btn');
        const voted = myVotes.has(map.mapUid);
        setBtn(btn, voted, map.votes);
        btn.addEventListener('click', function () {
            toggleVote(map.mapUid, btn);
        });
        card.appendChild(btn);

        return card;
    }

    function setBtn(btn, voted, count) {
        btn.classList.toggle('voted', voted);
        btn.dataset.voted = voted ? '1' : '0';
        btn.textContent = (voted ? '✓ ' : '+ ') + count;
    }

    async function toggleVote(mapUid, btn) {
        if (!window.tmAuth.isLoggedIn()) {
            window.tmAuth.login();
            return;
        }
        const value = btn.dataset.voted !== '1';
        btn.disabled = true;
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
                // Session expired — send them through login again.
                window.tmAuth.logout();
                window.tmAuth.login();
                return;
            }
            const data = await res.json();
            if (data.voted) {
                myVotes.add(mapUid);
            } else {
                myVotes.delete(mapUid);
            }
            setBtn(btn, data.voted, data.votes);
        } catch (e) {
            // Leave the button as-is on network error.
        } finally {
            btn.disabled = false;
        }
    }

    document.addEventListener('DOMContentLoaded', load);
})();
