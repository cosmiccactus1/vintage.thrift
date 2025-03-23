/**
 * Vintage Thrift Store - Sell JavaScript
 * Za rad s API-jem umjesto lokalnih podataka
 */

// Import Supabase klijenta
import supabase from './supabase.js';

// Globalne varijable
let uploadedImages = [];

// Provjera je li korisnik prijavljen
function checkUserLoggedIn() {
    const userDataString = localStorage.getItem('prijavljeniKorisnik');
    
    if (!userDataString) {
        // Ako korisnik nije prijavljen, preusmjeri na register.html
        window.location.href = 'register.html';
        return null;
    }
    
    try {
        return JSON.parse(userDataString);
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
    
    // Validacija forme - za nacrt validacija nije nužna
    // ali barem treba imati naslov
    const title = document.getElementById('listing-title').value.trim();
    if (!title) {
        showMessage('Potrebno je unijeti naziv artikla.', 'error');
        return;
    }
    
    try {
        // Upload slika (ako ih ima)
        const imageUrls = [];
        for (const image of uploadedImages) {
            const fileName = `draft_${Date.now()}_${image.name.replace(/\s+/g, '_')}`;
            const { data, error } = await supabase.storage
                .from('article-images')
                .upload(fileName, image);
            
            if (error) throw error;
            
            const { data: publicUrlData } = supabase.storage
                .from('article-images')
                .getPublicUrl(fileName);
            
            imageUrls.push(publicUrlData.publicUrl);
        }
        
        // Kreiranje nacrta artikla
        const { data, error } = await supabase
            .from('articles')
            .insert({
                title: document.getElementById('listing-title').value,
                description: document.getElementById('listing-description').value || '',
                price: parseFloat(document.getElementById('listing-price').value) || 0,
                category: document.getElementById('listing-category').value || '',
                season: document.getElementById('listing-season').value || '',
                size: document.getElementById('listing-size').value || '',
                color: document.getElementById('listing-color').value || '',
                brand: document.getElementById('listing-brand').value || null,
                condition: document.getElementById('listing-condition').value || '',
                location: document.getElementById('listing-location').value || '',
                images: imageUrls,
                user_id: userData.id,
                status: 'draft',
                created_at: new Date().toISOString()
            });
        
        if (error) throw error;
        
        // Uspješno spremanje nacrta
        showMessage('Nacrt je uspješno sačuvan!', 'success');
        
        // Preusmjeravanje na profil nakon 2 sekunde
        setTimeout(() => {
            window.location.href = 'profile.html#drafts';
        }, 2000);
    } catch (error) {
        console.error('Greška:', error);
        showMessage('Došlo je do greške prilikom spremanja nacrta.', 'error');
    }
}

// Objavljivanje artikla
async function publishArticle(e) {
    e.preventDefault();
    console.log("Funkcija publishArticle pozvana");
    
    const userData = checkUserLoggedIn();
    if (!userData) return;
    
    // Validacija forme
    if (!validateForm()) {
        showMessage('Molimo popunite sva obavezna polja.', 'error');
        return;
    }
    
    try {
        console.log("Početak uploada slika");
        // 1. Upload slika
        const imageUrls = [];
        for (const image of uploadedImages) {
            const fileName = `${Date.now()}_${image.name.replace(/\s+/g, '_')}`;
            console.log("Uploading image:", fileName);
            
            const { data, error } = await supabase.storage
                .from('article-images')
                .upload(fileName, image);
            
            if (error) {
                console.error("Greška pri uploadu slike:", error);
                throw error;
            }
            
            const { data: publicUrlData } = supabase.storage
                .from('article-images')
                .getPublicUrl(fileName);
            
            imageUrls.push(publicUrlData.publicUrl);
            console.log("Slika uploadana:", publicUrlData.publicUrl);
        }
        
        console.log("Sve slike su uploadane, počinjem kreiranje artikla");
        // 2. Kreiranje artikla
        const articleData = {
            title: document.getElementById('listing-title').value,
            description: document.getElementById('listing-description').value,
            price: parseFloat(document.getElementById('listing-price').value),
            category: document.getElementById('listing-category').value,
            season: document.getElementById('listing-season').value,
            size: document.getElementById('listing-size').value,
            color: document.getElementById('listing-color').value,
            brand: document.getElementById('listing-brand').value || null,
            condition: document.getElementById('listing-condition').value,
            location: document.getElementById('listing-location').value,
            images: imageUrls,
            user_id: userData.id,
            status: 'active',
            created_at: new Date().toISOString()
        };
        
        console.log("Podaci artikla:", articleData);
        
        const { data, error } = await supabase
            .from('articles')
            .insert(articleData);
        
        if (error) {
            console.error("Greška pri kreiranju artikla:", error);
            throw error;
        }
        
        console.log("Artikal uspješno kreiran");
        // Uspješna objava
        showMessage('Artikal je uspješno objavljen!', 'success');
        
        // Preusmjeravanje na početnu stranicu nakon 2 sekunde
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    } catch (error) {
        console.error('Greška:', error);
        showMessage('Došlo je do greške prilikom objavljivanja artikla: ' + error.message, 'error');
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
    console.log("DOM učitan");
    // Provjera je li korisnik prijavljen
    const userData = checkUserLoggedIn();
    if (!userData) return;
    
    console.log("Korisnik prijavljen:", userData.username || userData.email);
    
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
        form.addEventListener('submit', publishArticle);
    } else {
        console.error("Forma nije pronađena!");
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
