document.addEventListener('DOMContentLoaded', function() {
    const colors = [
        { name: 'red', title: 'Red Zone', baseColor: 'ff3a3a' },
        { name: 'blue', title: 'Blue Zone', baseColor: '3a7bff' },
        { name: 'green', title: 'Green Zone', baseColor: '3aff3a' },
        { name: 'yellow', title: 'Yellow Zone', baseColor: 'ffeb3a' },
        { name: 'purple', title: 'Purple Zone', baseColor: '9c3aff' },
        { name: 'orange', title: 'Orange Zone', baseColor: 'ff7b3a' },
        { name: 'cyan', title: 'Cyan Zone', baseColor: '3affff' },
        { name: 'pink', title: 'Pink Zone', baseColor: 'ff3a9c' }
    ];

    const galleryContainer = document.getElementById('galleryContainer');
    const copyNotification = document.getElementById('copyNotification');

    // Generate all columns and images
    colors.forEach(color => {
        const column = document.createElement('div');
        column.className = `column ${color.name}-column`;
        
        
        
        // Generate 25 images for this column
        for (let i = 1; i <= 25; i++) {
            const imgNum = i < 10 ? '0' + i : i;
            const card = document.createElement('div');
            card.className = 'image-card';
            card.setAttribute('data-src', `https://example.com/tm/${color.name}${i}.jpg`);
            
            const img = document.createElement('img');
            img.src = `https://via.placeholder.com/400x100/${getColorHex(color.baseColor, i)}/${getTextColor(color.name)}?text=${color.title.split(' ')[0]}+${imgNum}`;
            img.alt = `${color.title} ${imgNum}`;
            
            card.appendChild(img);
            column.appendChild(card);
        }
        
        galleryContainer.appendChild(column);
    });

    // Attach click event to all images
    function attachEventListeners() {
        const cards = document.querySelectorAll('.image-card');
        cards.forEach(card => {
            card.addEventListener('click', function() {
                const imageUrl = this.getAttribute('data-src');
                copyToClipboard(imageUrl);
            });
        });
    }

    function getColorHex(baseColor, index) {
        // Generate slight variations of the base color
        const variations = [
            baseColor,
            baseColor.replace(/../g, hex => Math.min(255, parseInt(hex, 16) + 20).toString(16).padStart(2, '0')),
            baseColor.replace(/../g, hex => Math.max(0, parseInt(hex, 16) - 20).toString(16).padStart(2, '0')),
            baseColor.replace(/../g, hex => Math.min(255, parseInt(hex, 16) + 40).toString(16).padStart(2, '0')),
            baseColor.replace(/../g, hex => Math.max(0, parseInt(hex, 16) - 40).toString(16).padStart(2, '0'))
        ];
        return variations[index % 5];
    }

    function getTextColor(colorName) {
        return ['green', 'yellow', 'cyan'].includes(colorName) ? '000000' : 'ffffff';
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .then(() => {
                showNotification();
            })
            .catch(err => {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                showNotification();
            });
    }

    function showNotification() {
        copyNotification.classList.add('show');
        setTimeout(() => {
            copyNotification.classList.remove('show');
        }, 2000);
    }

    // Initialize event listeners
    attachEventListeners();
});