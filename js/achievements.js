// Achievement badges, drawn the same way on account pages and on the
// onboarding finish screen.
//
// The catalog lives in the Worker (src/achievements.ts) and arrives complete:
// every badge, with `earned` telling us which ones this account has. Locked
// ones are shown too — greyed out, with the unlock condition on hover — so
// there is something to chase. This file never decides what a badge means.

(function () {
    const el = window.tm.el;

    function card(a) {
        const item = el('div', 'ach-item');
        // Anything without an `earned` flag (a freshly unlocked badge handed
        // to us by /api/onboarding/step) counts as earned.
        const earned = a.earned !== false;
        item.classList.add(earned ? 'earned' : 'locked');

        // The condition is a hover tooltip (CSS, .ach-item::after) so the card
        // stays short whether or not you have the badge.
        if (a.hint) {
            item.dataset.hint = a.hint;
            item.setAttribute('aria-label', (a.name || a.code) + ' — ' + a.hint);
        }

        item.appendChild(el('div', 'ach-icon', a.icon || '🏆'));

        const body = el('div', 'ach-body');
        body.appendChild(el('div', 'ach-name', a.name || a.code));
        if (a.description) body.appendChild(el('div', 'ach-desc', a.description));
        // Spelled out rather than left to colour alone — on a dark theme a
        // greyed-out card reads a lot like a normal one.
        body.appendChild(
            el('div', 'ach-status', earned ? '✓ Unlocked' : '🔒 Locked')
        );
        item.appendChild(body);

        return item;
    }

    function grid(list, emptyText) {
        if (!list || !list.length) {
            return el('p', 'ach-empty', emptyText || 'No achievements yet.');
        }
        const wrap = el('div', 'ach-grid');
        list.forEach(function (a) {
            wrap.appendChild(card(a));
        });
        return wrap;
    }

    window.tmAchievements = { grid: grid, card: card };
})();
