document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('.image-container');
    const notification = document.getElementById('notification');

    images.forEach(image => {
        image.addEventListener('click', async function() {
            const url = this.getAttribute('data-src');

            try {
                await navigator.clipboard.writeText(url);
                notification.style.opacity = '1';
                setTimeout(() => {
                    notification.style.opacity = '0';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy: ', err);

                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = url;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);

                notification.style.opacity = '1';
                setTimeout(() => {
                    notification.style.opacity = '0';
                }, 2000);
            }
        });
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            document.querySelectorAll('.image-container').forEach(img => {
                if (filter === 'all' || img.getAttribute('data-type') === filter) {
                    img.style.display = '';
                } else {
                    img.style.display = 'none';
                }
            });
        });
    });
});