/**
 * Vintage Thrift Store - Sell JavaScript
 * Za rad s API-jem umjesto lokalnih podataka
 */

// Globalne varijable
let uploadedImages = [];

// Provjera je li korisnik prijavljen
function checkUserLoggedIn() {
    console.log("Provjera je li korisnik prijavljen");
    const userDataString = localStorage.getItem('prijavljeniKorisnik');
    
    if (!userDataString) {
        console.log("Korisnik nije prijavljen, preusmjeravam na register.html");
        // Ako korisnik nije prijavljen, preusmjeri na register.html
        window.location.href = 'register.html';
        return null;
    }
    
    try {
        const userData = JSON.parse(userDataString);
        console.log("Korisnik je prijavljen:", userData.username || userData.email);
        return userData;
    } catch (error) {
        console.error('Greška prilikom parsiranja podataka korisnika:', error);
        return null;
    }
}

// Inicijalizacija opcija za upload fotografija
function initPhotoUpload() {
    console.log("Inicijalizacija opcija za upload fotografija");
    const photoUploadBtn = document.getElementById('photo-upload-btn');
    const photoUploadInput = document.getElementById('photo-upload');
    const photoUploadContainer = document.querySelector('.photo-upload-container');
    
    if (!photoUploadBtn || !photoUploadInput || !photoUploadContainer) {
        console.error("Nedostaju elementi za upload fotografija");
        return;
    }
    
    console.log("Elementi za upload fotografija pronađeni, dodajem event listenere");
    
    // Klik na dugme za upload
    photoUploadBtn.addEventListener('click', function(e) {
        console.log("Klik na dugme za upload");
        e.preventDefault();
        photoUploadInput.click();
    });
    
    // Promjena input elementa (odabir datoteka)
    photoUploadInput.addEventListener('change', function(e) {
        console.log("Promjena input elementa za odabir datoteka");
        handleFileSelection(e);
    });
    
    // Drag & drop funkcionalnost
    photoUploadContainer.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    
    photoUploadContainer.addEventListener('dragleave', function() {
        this.classList.remove('dragover');
    });
    
    photoUploadContainer.addEventListener('drop', function(e) {
        console.log("Drop događaj na photo-upload-container");
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
    console.log("Obrada odabira datoteka");
    const files = e.target.files;
    const uploadedPhotosContainer = document.getElementById('uploaded-photos');
    
    if (!files || !uploadedPhotosContainer) {
        console.error("Nedostaju files ili uploadedPhotosContainer");
        return;
    }
    
    console.log("Broj odabranih datoteka:", files.length);
    
    // Ograničenje na 5 slika
    if (files.length > 5) {
        console.log("Previše slika, ograničeno na 5");
        showMessage('Možete uploadovati maksimalno 5 slika.', 'error');
        return;
    }
    
    // Čišćenje prethodno prikazanih slika
    uploadedPhotosContainer.innerHTML = '';
    uploadedImages = [];
    
    // Čitanje datoteka i prikaz previewa
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log("Obrada datoteke:", file.name, "Tip:", file.type, "Veličina:", file.size);
        
        // Provjera je li datoteka slika
        if (!file.type.startsWith('image/')) {
            console.log("Datoteka nije slika:", file.name);
            showMessage('Možete uploadovati samo slike.', 'error');
            continue;
        }
        
        // Provjera veličine slike (ograničenje na 5MB)
        if (file.size > 5 * 1024 * 1024) {
            console.log("Slika je prevelika:", file.name);
            showMessage('Slika ne smije biti veća od 5MB.', 'error');
            continue;
        }
        
        // Dodavanje slike u niz uploadovanih slika
        uploadedImages.push(file);
        console.log("Slika dodana u uploadedImages:", file.name);
        
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
                console.log("Uklanjanje slike na indeksu:", index);
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
            console.log("Preview slike kreiran i dodan u kontejner");
        };
        
        reader.readAsDataURL(file);
    }
}

// Validacija forme
function validateForm() {
    console.log("Validacija forme započela");
    const form = document.getElementById('prodaj-form');
    if (!form) {
        console.error("Forma nije pronađena u validateForm funkciji");
        return false;
    }
    
    const requiredFields = form.querySelectorAll('[required]');
    console.log("Broj obaveznih polja:", requiredFields.length);
    let isValid = true;
    
    // Resetiranje prethodnih poruka o greškama
    document.querySelectorAll('.error-message').forEach(message => {
        message.remove();
    });
    
    // Provjera svih obaveznih polja
    requiredFields.forEach((field, index) => {
        console.log(`Provjera polja ${index}:`, field.name, "Vrijednost:", field.value.trim());
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
            
            // Dodavanje poruke o grešci
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = 'Ovo polje je obavezno';
            field.parentNode.appendChild(errorMessage);
            console.log(`Polje ${field.name} nije popunjeno - greška`);
        } else {
            field.classList.remove('error');
        }
    });
    
    // Provjera slika
    console.log("Broj uploadanih slika za validaciju:", uploadedImages.length);
    if (uploadedImages.length === 0) {
        isValid = false;
        const photoUploadContainer = document.querySelector('.photo-upload-container');
        photoUploadContainer.classList.add('error');
        
        // Dodavanje poruke o grešci
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = 'Potrebno je dodati bar jednu sliku';
        
        // Provjera postoji li container za poruku o grešci
        const formGroup = document.querySelector('.form-group:has(.photo-upload-container)');
        if (formGroup) {
            formGroup.appendChild(errorMessage);
        } else {
            console.error("Nije pronađen container za poruku o grešci");
            photoUploadContainer.parentNode.appendChild(errorMessage);
        }
        console.log("Nedostaju slike - greška");
    }
    
    console.log("Rezultat validacije:", isValid);
    return isValid;
}

// Spremanje nacrta artikla
async function saveAsDraft() {
    console.log("Funkcija saveAsDraft pozvana");
    const userData = checkUserLoggedIn();
    if (!userData) return;
    
    // Dohvaćanje vrijednosti forme
    const formData = new FormData(document.getElementById('prodaj-form'));
    console.log("FormData za nacrt kreiran");
    
    // Dodavanje slika u formData
    uploadedImages.forEach((image, index) => {
        console.log("Dodajem sliku u nacrt:", image.name);
        formData.append(`image${index}`, image);
    });
    
    // Dodavanje statusa i korisničkog ID-a
    formData.append('status', 'draft');
    formData.append('userId', userData.id);
    console.log("Status i userId dodani u formData");
    
    try {
        console.log("Šaljem API zahtjev za spremanje nacrta");
        // API poziv za spremanje nacrta
        const response = await fetch('/api/articles/draft', {
            method: 'POST',
            body: formData
        });
        
        console.log("Odgovor API-ja primljen, status:", response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("API greška:", errorText);
            throw new Error('Greška prilikom spremanja nacrta: ' + errorText);
        }
        
        // Ažuriranje UI-a
        showMessage('Nacrt je uspješno sačuvan!', 'success');
        
        console.log("Nacrt uspješno sačuvan, preusmjeravam za 2 sekunde");
        // Preusmjeravanje na profil nakon 2 sekunde
        setTimeout(() => {
            window.location.href = 'profile.html#drafts';
        }, 2000);
        
    } catch (error) {
        console.error('Detaljnija greška:', error);
        showMessage('Došlo je do greške prilikom spremanja nacrta.', 'error');
    }
}

// Objavljivanje artikla
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
    formData.append('userId', userData.id);
    console.log("Dodan status i userId:", userData.id);
    
    try {
        console.log("Pokušavam slanje API zahtjeva...");
        // API poziv za objavljivanje artikla
        const response = await fetch('/api/articles', {
            method: 'POST',
            body: formData
        });
        
        console.log("API odgovor primljen, status:", response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("API greška:", errorText);
            throw new Error('Greška prilikom objavljivanja artikla: ' + errorText);
        }
        
        // Ažuriranje UI-a
        showMessage('Artikal je uspješno objavljen!', 'success');
        
        console.log("Uspješno objavljeno, preusmjeravam za 2 sekunde...");
        // Preusmjeravanje na početnu stranicu nakon 2 sekunde
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        
    } catch (error) {
        console.error('Detaljnija greška:', error);
        showMessage('Došlo je do greške prilikom objavljivanja artikla.', 'error');
    }
}

// Prikaz poruke
function showMessage(message, type = 'info') {
    console.log("Prikaz poruke:", message, "Tip:", type);
    // Provjeri postoji li već element za poruke
    let messageContainer = document.getElementById('message-container');
    
    if (!messageContainer) {
        // Ako ne postoji, kreiraj ga
        console.log("Kreiram message-container");
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
    console.log("Inicijalizacija hamburger menija");
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
    } else {
        console.error("Nedostaju elementi za hamburger meni");
    }
}

// Inicijalizacija stranice
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM učitan");
    
    // Provjera je li korisnik prijavljen
    const userData = checkUserLoggedIn();
    if (!userData) return;
    
    console.log("Korisnik prijavljen:", userData.username || userData.email);
