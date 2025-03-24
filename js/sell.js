/**
 * Vintage Thrift Store - Sell JavaScript
 * Za rad s API-jem umjesto lokalnih podataka
 */

// Globalne varijable
let uploadedImages = [];

// Provjera je li korisnik prijavljen
function checkUserLoggedIn() {
    const userDataString = localStorage.getItem('prijavljeniKorisnik');
    const userId = localStorage.getItem('userId');
    
    if (!userDataString || !userId) {
        // Ako korisnik nije prijavljen, preusmjeri na register.html
        window.location.href = 'register.html';
        return null;
    }
    
    try {
        const userData = JSON.parse(userDataString);
        return { ...userData, id: userId };
    } catch (error) {
        console.error('Greška prilikom parsiranja podataka korisnika:', error);
        return null;
    }
}

// Inicijalizacija opcija za upload fotografija
function initPhotoUpload() {
    const photoUploadBtn = document.getElementById('photo-upload-btn');
    const photoUploadInput = document.getElementById('photo-upload');
    const photoUploadContainer = document.querySelector('.photo-upload-container');
    
    if (!photoUploadBtn || !photoUploadInput || !photoUploadContainer) return;
    
    // Klik na dugme za upload
    photoUploadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        photoUploadInput.click();
    });
    
    // Promjena input elementa (odabir datoteka)
    photoUploadInput.addEventListener('change', handleFileSelection);
    
    // Drag & drop funkcionalnost
    photoUploadContainer.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    
    photoUploadContainer.addEventListener('dragleave', function() {
        this.classList.remove('dragover');
    });
    
    photoUploadContainer.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            photoUploadInput.files = files;
            handleFileSelection({ target: photoUploadInput });
        }
    });
}

// Obrađivanje odabira datoteka
function handleFileSelection(e) {
    const files = e.target.files;
    const uploadedPhotosContainer = document.getElementById('uploaded-photos');
    
    if (!files || !uploadedPhotosContainer) return;
    
    // Ograničenje na 5 slika
    if (files.length > 5) {
        showMessage('Možete uploadovati maksimalno 5 slika.', 'error');
        return;
    }
    
    // Čišćenje prethodno prikazanih slika
    uploadedPhotosContainer.innerHTML = '';
    uploadedImages = [];
    
    // Čitanje datoteka i prikaz previewa
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Provjera je li datoteka slika
        if (!file.type.startsWith('image/')) {
            showMessage('Možete uploadovati samo slike.', 'error');
            continue;
        }
        
        // Provjera veličine slike (ograničenje na 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showMessage('Slika ne smije biti veća od 5MB.', 'error');
            continue;
        }
        
        // Dodavanje slike u niz uploadovanih slika
        uploadedImages.push(file);
        
        // Kreiranje previewa slike
        const reader = new FileReader();
        reader.onload = function(e) {
            const photoContainer = document.createElement('div');
            photoContainer.classList.add('uploaded-photo');
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = 'Uploaded photo';
            
            const removeButton = document.createElement('div');
            removeButton.classList.add('remove-photo');
            removeButton.innerHTML = '<i class="fas fa-times"></i>';
            removeButton.setAttribute('data-index', i);
            removeButton.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                uploadedImages.splice(index, 1);
                photoContainer.remove();
                
                // Ažuriranje indeksa za preostala dugmad
                document.querySelectorAll('.remove-photo').forEach((btn, idx) => {
                    if (idx >= index) {
                        btn.setAttribute('data-index', idx);
                    }
                });
            });
            
            photoContainer.appendChild(img);
            photoContainer.appendChild(removeButton);
            uploadedPhotosContainer.appendChild(photoContainer);
        };
        
        reader.readAsDataURL(file);
    }
}

// Validacija forme
function validateForm() {
    const form = document.getElementById('prodaj-form');
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    // Resetiranje prethodnih poruka o greškama
    document.querySelectorAll('.error-message').forEach(message => {
        message.remove();
    });
    
    // Provjera svih obaveznih polja
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
            
            // Dodavanje poruke o grešci
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = 'Ovo polje je obavezno';
            field.parentNode.appendChild(errorMessage);
        } else {
            field.classList.remove('error');
        }
    });
    
    // Provjera slika
    if (uploadedImages.length === 0) {
        isValid = false;
        const photoUploadContainer = document.querySelector('.photo-upload-container');
        photoUploadContainer.classList.add('error');
        
        // Dodavanje poruke o grešci
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = 'Potrebno je dodati bar jednu sliku';
        document.querySelector('.form-group:has(.photo-upload-container)').appendChild(errorMessage);
    }
    
    return isValid;
}

// Spremanje nacrta artikla
async function saveAsDraft() {
    const userData = checkUserLoggedIn();
    if (!userData) return;
    
    // Dohvaćanje vrijednosti forme
    const formData = new FormData(document.getElementById('prodaj-form'));
    
    // Dodavanje slika u formData
    uploadedImages.forEach((image, index) => {
        formData.append(`image${index}`, image);
    });
    
    // Dodavanje statusa i korisničkog ID-a
    formData.append('status', 'draft');
    formData.append('userId', userData.id);
    
    try {
        // Dohvatanje tokena iz localStorage-a
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('Niste prijavljeni. Molimo prijavite se prije spremanja nacrta.');
        }
        
        // API poziv za spremanje nacrta
        const response = await fetch('/api/articles/draft', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Greška prilikom spremanja nacrta');
        }
        
        // Ažuriranje UI-a
        showMessage('Nacrt je uspješno sačuvan!', 'success');
        
        // Preusmjeravanje na profil nakon 2 sekunde
        setTimeout(() => {
            window.location.href = 'profile.html#drafts';
        }, 2000);
        
    } catch (error) {
        console.error('Greška:', error);
        showMessage(error.message || 'Došlo je do greške prilikom spremanja nacrta.', 'error');
    }
}

// Objavljivanje artikla
async function publishArticle(e) {
    e.preventDefault();
    
    const userData = checkUserLoggedIn();
    if (!userData) return;
    
    // Validacija forme
    if (!validateForm()) {
        showMessage('Molimo popunite sva obavezna polja.', 'error');
        return;
    }
    
    // Dohvaćanje vrijednosti forme
    const formData = new FormData(document.getElementById('prodaj-form'));
    
    // Dodavanje slika u formData
    uploadedImages.forEach((image, index) => {
        formData.append(`image${index}`, image);
    });
    
    // Dodavanje statusa i korisničkog ID-a
    formData.append('status', 'active');
    formData.append('userId', userData.id);
    
    try {
        // Dohvatanje tokena iz localStorage-a
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('Niste prijavljeni. Molimo prijavite se prije objavljivanja artikla.');
        }
        
        // API poziv za objavljivanje artikla
        const response = await fetch('/api/articles', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Greška prilikom objavljivanja artikla');
        }
        
        // Ažuriranje UI-a
        showMessage('Artikal je uspješno objavljen!', 'success');
        
        // Preusmjeravanje na početnu stranicu nakon 2 sekunde
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        
    } catch (error) {
        console.error('Greška:', error);
        showMessage(error.message || 'Došlo je do greške prilikom objavljivanja artikla.', 'error');
    }
}

// Prikaz poruke
function showMessage(message, type = 'info') {
    // Provjeri postoji li već element za poruke
    let messageContainer = document.getElementById('message-container');
    
    if (!messageContainer) {
        // Ako ne postoji, kreiraj ga
        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        document.body.appendChild(messageContainer);
    }
    
    // Kreiraj element za poruku
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.innerHTML = message;
    
    // Dodaj poruku u kontejner
    messageContainer.appendChild(messageElement);
    
    // Postavi timeout za uklanjanje poruke
    setTimeout(() => {
        messageElement.classList.add('hide');
        setTimeout(() => {
            messageElement.remove();
        }, 500);
    }, 3000);
}

// Inicijalizacija hamburger menija
function initHamburgerMenu() {
    const hamburgerIcon = document.getElementById('hamburgerIcon');
    const menuDropdown = document.getElementById('menuDropdown');
    
    if (hamburgerIcon && menuDropdown) {
        hamburgerIcon.addEventListener('click', function() {
            this.classList.toggle('active');
            menuDropdown.classList.toggle('show');
        });
        
        // Zatvaranje menija klikom izvan
        document.addEventListener('click', function(e) {
            if (!hamburgerIcon.contains(e.target) && !menuDropdown.contains(e.target)) {
                hamburgerIcon.classList.remove('active');
                menuDropdown.classList.remove('show');
            }
        });
    }
}

// Inicijalizacija stranice
document.addEventListener('DOMContentLoaded', function() {
    // Provjera je li korisnik prijavljen
    const userData = checkUserLoggedIn();
    if (!userData) return;
    
    // Inicijalizacija hamburger menija
    initHamburgerMenu();
    
    // Inicijalizacija opcija za upload fotografija
    initPhotoUpload();
    
    // Event listener za dugme za spremanje nacrta
    const saveDraftBtn = document.getElementById('save-draft-btn');
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', saveAsDraft);
    }
    
    // Event listener za form submit
    const form = document.getElementById('prodaj-form');
    if (form) {
        form.addEventListener('submit', publishArticle);
    }
    
    // Event listeneri za uklanjanje klase error prilikom unosa
    const formFields = document.querySelectorAll('input, select, textarea');
    formFields.forEach(field => {
        field.addEventListener('input', function() {
            this.classList.remove('error');
            
            // Uklanjanje eventualne poruke o grešci
            const errorMessage = this.parentNode.querySelector('.error-message');
            if (errorMessage) {
                errorMessage.remove();
            }
        });
    });
});
