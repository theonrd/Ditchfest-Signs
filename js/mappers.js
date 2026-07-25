// Mappers page (top-mappers.html): leaderboard of mappers ranked by the total
// number of "+" votes across all of their maps. Relies on window.tmAuth for the
// Worker URL (auth.js, loaded first). Public — no login required to view.

(function () {
    const WORKER_URL = window.tmAuth.WORKER_URL;

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    async function load() {
        const root = document.getElementById('mappers-root');
        if (!root) return;
        root.innerHTML = '';
        root.appendChild(el('p', 'subtitle', 'Loading…'));

        try {
            const res = await fetch(WORKER_URL + '/api/results/mappers');
            const data = await res.json();
            render(data.mappers || []);
        } catch (e) {
            root.innerHTML = '';
            root.appendChild(el('p', 'subtitle', 'Failed to load results. Try again later.'));
        }
    }

    function render(mappers) {
        const root = document.getElementById('mappers-root');
        root.innerHTML = '';

        if (!mappers.length) {
            root.appendChild(
                el('p', 'subtitle', 'No votes yet. Head to the Voting tab to get started.')
            );
            return;
        }

        const table = el('table', 'leaderboard');

        const thead = el('thead');
        const hrow = el('tr');
        hrow.appendChild(el('th', 'lb-rank', '#'));
        hrow.appendChild(el('th', null, 'Mapper'));
        hrow.appendChild(el('th', 'lb-votes', 'Votes'));
        thead.appendChild(hrow);
        table.appendChild(thead);

        const tbody = el('tbody');
        mappers.forEach(function (m, i) {
            const row = el('tr');
            row.appendChild(el('td', 'lb-rank', String(i + 1)));
            row.appendChild(el('td', null, m.name || m.accountId));
            row.appendChild(el('td', 'lb-votes', String(m.votes)));
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        root.appendChild(table);
    }

    document.addEventListener('DOMContentLoaded', load);
})();
