// Admin panel (admin.html): add and remove admins by Ubisoft account ID.
// Reachable only from your own account page, and every action is gated
// server-side (the API answers 403 to non-admins) — this page checks first
// purely so it can show a clean message instead of a broken list.

(function () {
    const el = window.tm.el;

    async function load() {
        const root = document.getElementById('admin-root');
        if (!root) return;

        if (!window.tm.isLoggedIn()) {
            window.tm.message(root, 'Log in to access the admin panel.');
            return;
        }
        window.tm.message(root, 'Loading…');

        try {
            const data = await window.tm.api('/api/admins');
            render(root, data.admins || []);
        } catch (e) {
            if (e.status === 403) {
                window.tm.message(root, 'Access denied — admins only.');
            } else if (e.status === 401) {
                window.tm.sessionExpired();
            } else {
                window.tm.message(root, 'Failed to load. Try again later.');
            }
        }
    }

    function render(root, admins) {
        root.innerHTML = '';

        const card = el('div', 'admin-card');
        card.appendChild(
            el('label', 'admin-label', 'Add admin by Ubisoft account ID')
        );

        const addRow = el('div', 'admin-add');
        const input = el('input', 'admin-input');
        input.type = 'text';
        input.placeholder = 'e.g. 9963810c-63ef-42d7-acd5-56c132c22b06';
        const btn = el('button', 'auth-btn', 'Add');
        const msg = el('div', 'admin-msg');

        const submit = function () {
            addAdmin(input, btn, msg);
        };
        btn.addEventListener('click', submit);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') submit();
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

        // The root admin comes from a Worker var and cannot be removed here.
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
            await window.tm.api('/api/admins', { body: { accountId: accountId } });
            input.value = '';
            load(); // re-read the list rather than patch it locally
        } catch (e) {
            msg.className = 'admin-msg admin-err';
            msg.textContent = errorText(e);
        } finally {
            btn.disabled = false;
        }
    }

    async function removeAdmin(accountId, btn) {
        btn.disabled = true;
        try {
            await window.tm.api('/api/admins/remove', {
                body: { accountId: accountId },
            });
            load();
        } catch (e) {
            btn.disabled = false;
        }
    }

    function errorText(e) {
        switch (e.message) {
            case 'unknown_account':
                return 'No Trackmania account with that ID was found.';
            case 'missing_accountId':
                return 'Enter an account ID.';
            case 'lookup_failed':
                return 'Could not verify the account. Try again.';
            case 'forbidden':
                return 'Access denied.';
            default:
                return 'Error: ' + e.message;
        }
    }

    document.addEventListener('DOMContentLoaded', load);
})();
