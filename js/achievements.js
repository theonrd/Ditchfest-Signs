// Shared achievement rendering. Badges show up on the profile card, on public
// mapper pages and on the onboarding finish screen, so the markup lives in one
// place. The catalog itself (names, descriptions, icons) comes from the Worker —
// this file only draws whatever it is handed.
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
        item.appendChild(el('div', 'ach-icon', a.icon || '🏆'));

        const body = el('div', 'ach-body');
        body.appendChild(el('div', 'ach-name', a.name || a.code));
        if (a.description) body.appendChild(el('div', 'ach-desc', a.description));
        item.appendChild(body);

        return item;
    }

    // Only earned achievements are ever passed in — locked ones are deliberately
    // not listed, so the section reads as a trophy shelf rather than a to-do list.
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
