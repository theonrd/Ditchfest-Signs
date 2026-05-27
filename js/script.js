document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('.image-container');
    const notification = document.getElementById('notification');
    const defaultTopFilter = '1x4';
    const defaultFilter = 'backgrounds';

    // Top-level filter logic
    const topButtons = document.querySelectorAll('.top-btn');
    const filterGroups = {
        '1x4': document.getElementById('filters-1x4'),
        '1x6': document.getElementById('filters-1x6')
    };

    topButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const topFilter = this.getAttribute('data-top-filter');
            
            // Toggle active class for top buttons
            topButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Show relevant bottom filters, hide others
            Object.keys(filterGroups).forEach(key => {
                if (filterGroups[key]) {
                    if (key === topFilter) {
                        filterGroups[key].style.display = 'flex';
                    } else {
                        filterGroups[key].style.display = 'none';
                    }
                }
            });

            if (topFilter === 'all') {
                // Show all images from all categories
                document.querySelectorAll('.image-container').forEach(img => {
                    img.style.display = '';
                });
                // Deactivate all bottom buttons
                document.querySelectorAll('.bottom-level .filter-btn').forEach(b => {
                    b.classList.remove('active');
                });
            } else {
                // Auto-activate the first filter in the group
                const firstGroupBtn = filterGroups[topFilter].querySelector('.filter-btn');
                if (firstGroupBtn) {
                    firstGroupBtn.click();
                }
            }
        });
    });

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

    const toggle = document.querySelector('.accordion-toggle');
    const content = document.querySelector('.accordion-content');

    toggle.addEventListener('click', function () {
        content.classList.toggle('open');
    });

    // Set default filter
    document.querySelectorAll('.image-container').forEach(img => {
        if (img.getAttribute('data-type') !== defaultFilter) {
            img.style.display = 'none';
        }
    });

    document.querySelectorAll('.bottom-level .filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {

            // Activate the clicked button in its group and deactivate others in ALL bottom groups
            document.querySelectorAll('.bottom-level .filter-btn').forEach(b => {
                b.classList.remove('active');
            });
            this.classList.add('active');
            
            // Filter images
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