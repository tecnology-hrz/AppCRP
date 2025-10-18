// Script para resaltar la pestaña activa en el navbar según la URL actual
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    const currentFile = currentPath.split('/').pop(); // Obtener solo el nombre del archivo
    const navLinks = document.querySelectorAll('.navbar a');

    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        const linkFile = linkHref.split('/').pop(); // Obtener solo el nombre del archivo del enlace

        if (linkFile === currentFile) {
            link.parentElement.classList.add('active');
        } else {
            link.parentElement.classList.remove('active');
        }
    });
});