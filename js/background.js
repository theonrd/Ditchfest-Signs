// Parallax for the fixed page background (body::before).
//
// Loaded on every page so the effect is identical site-wide — it used to live
// in script.js, which only index.html includes.

(function () {
    document.addEventListener('mousemove', function (e) {
        const x = (e.clientX / window.innerWidth - 0.5) * 4; // Смещение до 4px
        const y = (e.clientY / window.innerHeight - 0.5) * 4;

        document.body.style.setProperty('--bg-x', `${x}px`);
        document.body.style.setProperty('--bg-y', `${y}px`);
    });
})();
