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

        // One collapsible group per Ditchfest edition (number). Newest is open
        // by default; the rest start collapsed so the page reads as a list of
        // numbers you can expand.
        editions.forEach(function (edition, index) {
            const group = el('section', 'vote-group');
            if (index === 0) group.classList.add('open');

            const header = el('button', 'vote-group-header');
            header.appendChild(el('span', 'vg-title', edition.name));
            header.appendChild(
                el('span', 'vg-count', edition.maps.length + ' maps')
            );
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
        info.appendChild(
            el('div', 'map-author', map.authorName ? 'by ' + map.authorName : '')
        );
        row.appendChild(info);

        const btn = el('button', 'vote-btn vote-btn-sm');
        const voted = myVotes.has(map.mapUid);
        setBtn(btn, voted, map.votes);
        btn.addEventListener('click', function () {
            toggleVote(map.mapUid, btn);
        });
        row.appendChild(btn);

        return row;
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
