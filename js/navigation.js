// Navigation for main index page

function loadExperiment(experimentName) {
    // Navigate to experiment page
    window.location.href = `experiments/${experimentName}.html`;
}

// Add smooth scroll and animations
document.addEventListener('DOMContentLoaded', () => {
    // Animate cards on load
    const cards = document.querySelectorAll('.experiment-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
});
