// Mappers leaderboard (top-mappers.html): mappers ranked by the total number
// of "+" votes across all of their maps. Public — no login required. Each row
// leads to that mapper's account page.

(function () {
    const el = window.tm.el;

    async function load() {
        const root = document.getElementById('mappers-root');
        if (!root) return;
        window.tm.message(root, 'Loading…');

        try {
            const data = await window.tm.api('/api/results/mappers');
            render(root, data.mappers || []);
        } catch (e) {
            window.tm.message(root, 'Failed to load results. Try again later.');
        }
    }

    function render(root, mappers) {
        root.innerHTML = '';

        if (!mappers.length) {
            window.tm.message(
                root,
                'No votes yet. Head to the Voting tab to get started.'
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
            tbody.appendChild(row(m, i + 1));
        });
        table.appendChild(tbody);

        root.appendChild(table);
    }

    function row(m, place) {
        const href = 'mapper.html?id=' + encodeURIComponent(m.accountId);

        const tr = el('tr', 'lb-link');
        tr.appendChild(el('td', 'lb-rank', String(place)));

        // The name is a real link (middle-click, "open in new tab" and the
        // status-bar preview all work); the rest of the row forwards to it.
        const nameCell = el('td');
        const link = el('a', 'lb-name', m.name || 'Unknown mapper');
        link.href = href;
        nameCell.appendChild(link);
        tr.appendChild(nameCell);

        tr.appendChild(el('td', 'lb-votes', String(m.votes)));
        tr.addEventListener('click', function (e) {
            if (e.target !== link) window.location.href = href;
        });
        return tr;
    }

    document.addEventListener('DOMContentLoaded', load);
})();
