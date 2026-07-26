// Shared achievement rendering. Badges show up on account pages and on the
// onboarding finish screen, so the markup lives in one place. The catalog
// itself (names, descriptions, icons) comes from the Worker — this file only
// draws whatever it is handed.
//
// window.tmAchievements.grid(list, emptyText) -> element
// window.tmAchievements.card(achievement)     -> element

(function () {
    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function card(a) {
        const item = el('div', 'ach-item');
        // The Worker sends the whole catalog with an `earned` flag; anything
        // without one (e.g. a freshly unlocked badge) counts as earned.
        const earned = a.earned !== false;
        item.classList.add(earned ? 'earned' : 'locked');

        // The unlock condition is a hover tooltip (CSS, .ach-item::after) so the
        // card stays short whether or not you have the badge.
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
