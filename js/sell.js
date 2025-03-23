// Na početku funkcije DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM učitan");
    
    // Provjera je li korisnik prijavljen
    const userData = checkUserLoggedIn();
    if (!userData) return;
    
    console.log("Korisnik prijavljen:", userData.username);
    
    // Inicijalizacija hamburger menija
    initHamburgerMenu();
    
    // Inicijalizacija opcija za upload fotografija
    initPhotoUpload();
    
    // Event listener za dugme za spremanje nacrta
    const saveDraftBtn = document.getElementById('save-draft-btn');
    if (saveDraftBtn) {
        console.log("Pronađen save-draft-btn");
        saveDraftBtn.addEventListener('click', saveAsDraft);
    }
    
    // Event listener za form submit
    const form = document.getElementById('prodaj-form');
    if (form) {
        console.log("Pronađena forma, dodajem event listener");
        form.addEventListener('submit', function(e) {
            console.log("Form submit događaj pokrenut");
            publishArticle(e);
        });
    } else {
        console.error("Forma nije pronađena!");
    }
});

// Na početku publishArticle funkcije
async function publishArticle(e) {
    console.log("Funkcija publishArticle pozvana");
    e.preventDefault();
    console.log("Događaj preventDefault pozvan");
    
    const userData = checkUserLoggedIn();
    if (!userData) {
        console.error("Korisnik nije prijavljen");
        return;
    }
    
    // Validacija forme
    if (!validateForm()) {
        console.log("Validacija forme nije uspjela");
        showMessage('Molimo popunite sva obavezna polja.', 'error');
        return;
    }
    
    console.log("Validacija forme uspješna");
    
    // Dohvaćanje vrijednosti forme
    const formData = new FormData(document.getElementById('prodaj-form'));
    console.log("FormData kreiran");
    
    // Dodavanje slika u formData
    console.log("Broj uploadanih slika:", uploadedImages.length);
    uploadedImages.forEach((image, index) => {
        console.log("Dodajem sliku", index, image.name);
        formData.append(`image${index}`, image);
    });
    
    // Dodavanje statusa i korisničkog ID-a
    formData.append('status', 'active');
    formData.append('
