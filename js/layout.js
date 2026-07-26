// Page chrome: nav bar, auth widget, logo and footer.
//
// Every page carries only its own content plus two empty mount points:
//
//   <div id="site-header"></div>   ... page content ...   <footer id="site-footer"></footer>
//
// so adding a nav entry or changing the footer is a one-file edit instead of
// the same paste in seven HTML files. The active nav link is picked from the
// current filename.

(function () {
    const el = window.tm.el;

    const NAV = [
        { href: 'index.html', label: 'Signs' },
        { href: 'voting.html', label: 'Voting' },
        { href: 'top-players.html', label: 'Players' },
        { href: 'top-mappers.html', label: 'Mappers' },
    ];

    // Pages that are not nav entries themselves but belong under one. Anything
    // unlisted (e.g. onboarding, admin) simply highlights nothing.
    const BELONGS_TO = { 'mapper.html': 'top-mappers.html' };

    const DISCORDS = [
        { href: 'https://discord.gg/VWaTmrXmh5', label: 'Ditchfest (EN)' },
        {
            href: 'https://discord.gg/TaPZBp7mTS',
            label: 'Trackmania Russian Community (RU)',
        },
    ];

    function currentPage() {
        const file = window.location.pathname.split('/').pop();
        const page = file || 'index.html';
        return BELONGS_TO[page] || page;
    }

    function header() {
        const frag = document.createDocumentFragment();
        const active = currentPage();

        const nav = el('nav', 'nav-bar');
        NAV.forEach(function (item) {
            const link = el(
                'a',
                'nav-link' + (item.href === active ? ' active' : ''),
                item.label
            );
            link.href = item.href;
            nav.appendChild(link);
        });
        frag.appendChild(nav);

        // Filled by renderAuthBar() below, and again after logging out.
        const authBar = el('div', 'auth-bar');
        authBar.id = 'auth-bar';
        frag.appendChild(authBar);

        const logo = el('div', 'logo-container');
        const home = el('a');
        home.href = 'index.html';
        const img = el('img', 'main-logo');
        img.src = 'res/DitchFest_logo.svg';
        img.alt = 'Ditchfest Signs';
        home.appendChild(img);
        logo.appendChild(home);
        frag.appendChild(logo);

        return frag;
    }

    function footer() {
        const frag = document.createDocumentFragment();

        const links = el('div', 'discord-links');
        DISCORDS.forEach(function (d) {
            const item = el('a', 'discord-link-item');
            item.href = d.href;
            item.target = '_blank';
            const icon = el('img', 'discord-icon');
            icon.src = 'res/discord-sign-logo.svg';
            icon.alt = '';
            item.appendChild(icon);
            item.appendChild(el('span', null, d.label));
            links.appendChild(item);
        });
        frag.appendChild(links);

        frag.appendChild(
            el('p', 'developer-info', 'Credits: onrd.., Soba, Rezzn, DamnedLight')
        );
        frag.appendChild(
            el('div', 'copyright', 'Fuck you ditchfest mappers © 2025-2026')
        );
        return frag;
    }

    // Logged in: your own account page + logout. Logged out: the login button.
    function renderAuthBar() {
        const bar = document.getElementById('auth-bar');
        if (!bar) return;
        bar.innerHTML = '';

        const user = window.tm.getUser();
        if (!user) {
            const login = el('button', 'auth-btn', 'Login with Ubisoft');
            login.addEventListener('click', window.tm.login);
            bar.appendChild(login);

            // Logging out here only drops our own token — Ubisoft still has you
            // signed in, so the next login silently returns the same account.
            // The only way to pick a different one is to end that session,
            // which lives on Trackmania's side.
            const other = el('a', 'auth-switch', 'other account?');
            other.href = 'https://api.trackmania.com/logout';
            other.target = '_blank';
            other.rel = 'noopener';
            other.title =
                'Trackmania keeps you signed in. Log out there, then log in here again.';
            bar.appendChild(other);
            return;
        }

        const me = el('a', 'auth-user', user.displayName);
        me.href = 'mapper.html?id=' + encodeURIComponent(user.accountId);
        bar.appendChild(me);

        const out = el('button', 'auth-btn', 'Logout');
        out.addEventListener('click', function () {
            window.tm.logout();
            renderAuthBar();
        });
        bar.appendChild(out);
    }

    function mount() {
        const head = document.getElementById('site-header');
        if (head) head.appendChild(header());

        const foot = document.getElementById('site-footer');
        if (foot) foot.appendChild(footer());

        renderAuthBar();
    }

    document.addEventListener('DOMContentLoaded', mount);

    window.tmLayout = { renderAuthBar: renderAuthBar };
})();
