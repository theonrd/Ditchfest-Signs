// Admin panel (admin.html). Lets an admin add/remove other admins by their
// Ubisoft/Trackmania account ID. All actions are gated server-side (the API
// returns 403 for non-admins); this page just checks first for a clean UI.
// Relies on window.tmAuth (auth.js, loaded first).

(function () {
    const WORKER_URL = window.tmAuth.WORKER_URL;

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
        const root = document.getElementById('admin-root');
        if (!root) return;
        root.innerHTML = '';

        if (!window.tmAuth.isLoggedIn()) {
            root.appendChild(el('p', 'subtitle', 'Log in to access the admin panel.'));
            return;
        }
        root.appendChild(el('p', 'subtitle', 'Loading…'));

        try {
            const res = await fetch(WORKER_URL + '/api/admins', {
                headers: authHeaders(),
            });
            if (res.status === 403) {
                root.innerHTML = '';
                root.appendChild(el('p', 'subtitle', 'Access denied — admins only.'));
                return;
            }
            const data = await res.json();
            render(data.admins || []);
        } catch (e) {
            root.innerHTML = '';
            root.appendChild(el('p', 'subtitle', 'Failed to load. Try again later.'));
        }
    }

    function render(admins) {
        const root = document.getElementById('admin-root');
        root.innerHTML = '';

        const card = el('div', 'admin-card');

        const label = el('label', 'admin-label', 'Add admin by Ubisoft account ID');
        card.appendChild(label);

        const addRow = el('div', 'admin-add');
        const input = el('input', 'admin-input');
        input.type = 'text';
        input.placeholder = 'e.g. 9963810c-63ef-42d7-acd5-56c132c22b06';
        const btn = el('button', 'auth-btn', 'Add');
        const msg = el('div', 'admin-msg');

        const doAdd = function () {
            addAdmin(input, btn, msg);
        };
        btn.addEventListener('click', doAdd);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') doAdd();
        });

        addRow.appendChild(input);
        addRow.appendChild(btn);
        card.appendChild(addRow);
        card.appendChild(msg);
        root.appendChild(card);

        const list = el('div', 'admin-list');
        admins.forEach(function (a) {
            list.appendChild(adminRow(a));
        });
        root.appendChild(list);
    }

    function adminRow(a) {
        const row = el('div', 'admin-row');

        const info = el('div', 'admin-info');
        info.appendChild(
            el(
                'div',
                'admin-name',
                (a.displayName || 'Unknown') + (a.isRoot ? ' (owner)' : '')
            )
        );
        info.appendChild(el('div', 'admin-id', a.accountId));
        row.appendChild(info);

        if (!a.isRoot) {
            const rm = el('button', 'auth-btn admin-remove', 'Remove');
            rm.addEventListener('click', function () {
                removeAdmin(a.accountId, rm);
            });
            row.appendChild(rm);
        }
        return row;
    }

    async function addAdmin(input, btn, msg) {
        const accountId = input.value.trim();
        if (!accountId) return;
        btn.disabled = true;
        msg.className = 'admin-msg';
        msg.textContent = 'Adding…';
        try {
            const res = await fetch(WORKER_URL + '/api/admins', {
                method: 'POST',
                headers: Object.assign(
                    { 'Content-Type': 'application/json' },
                    authHeaders()
                ),
                body: JSON.stringify({ accountId: accountId }),
            });
            const d = await res.json();
            if (res.ok) {
                input.value = '';
                load();
            } else {
                msg.className = 'admin-msg admin-err';
                msg.textContent = errorText(d.error, res.status);
            }
        } catch (e) {
            msg.className = 'admin-msg admin-err';
            msg.textContent = 'Network error.';
        } finally {
            btn.disabled = false;
        }
    }

    async function removeAdmin(accountId, btn) {
        btn.disabled = true;
        try {
            const res = await fetch(WORKER_URL + '/api/admins/remove', {
                method: 'POST',
                headers: Object.assign(
                    { 'Content-Type': 'application/json' },
                    authHeaders()
                ),
                body: JSON.stringify({ accountId: accountId }),
            });
            if (res.ok) {
                load();
            } else {
                btn.disabled = false;
            }
        } catch (e) {
            btn.disabled = false;
        }
    }

    function errorText(code, status) {
        switch (code) {
            case 'unknown_account':
                return 'No Trackmania account with that ID was found.';
            case 'missing_accountId':
                return 'Enter an account ID.';
            case 'lookup_failed':
                return 'Could not verify the account. Try again.';
            case 'forbidden':
                return 'Access denied.';
            default:
                return 'Error: ' + (code || status);
        }
    }

    document.addEventListener('DOMContentLoaded', load);
})();
