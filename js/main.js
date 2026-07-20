function showPage(id){
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const target = document.getElementById(id);
    if (target) {
        target.classList.add('active');
    }
}

window.showPage = showPage;
