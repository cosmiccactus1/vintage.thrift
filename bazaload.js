document.addEventListener('DOMContentLoaded', () => {
    console.log("Stranica učitana!");
    
    // Učitavanje spremljenog stanja artikala
    ucitajStanjeArtikala();
    
    // Hamburger meni funkcionalnost
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
    
    // Provjera na kojoj smo stranici
    const naIndexStranici = window.location.pathname.includes('index.html') || 
                           window.location.pathname.endsWith('/') || 
                           window.location.pathname.endsWith('/vintage.thrift/');
    const naProizvodStranici = window.location.pathname.includes('proizvod.html');
    const naFavoritiStranici = window.location.pathname.includes('favorites.html');
    const naKorpaStranici = window.location.pathname.includes('cart.html');
    
    if (naIndexStranici) {
        // Prikaz svih artikala na početnoj stranici
        prikaziArtikleNaPocetnoj(artikli);
        
        // Postavljanje događaja za filtere
        postaviFiltere();
    } 
    else if (naProizvodStranici) {
        // Prikaz detalja proizvoda
        prikaziDetaljeProizvoda();
    }
    else if (naFavoritiStranici) {
        // Prikaz omiljenih artikala
        prikaziFavorite();
    }
    else if (naKorpaStranici) {
        // Prikaz artikala u korpi
        prikaziKorpu();
    }
});

// Funkcija za učitavanje stanja artikala iz lokalnog skladišta
function ucitajStanjeArtikala() {
    try {
        // Učitavanje statusa omiljenih
        const spremljeniOmiljeni = localStorage.getItem('omiljeniArtikli');
        if (spremljeniOmiljeni) {
            const omiljeniIds = JSON.parse(spremljeniOmiljeni);
            
            // Ažuriranje artikala
            artikli.forEach(artikal => {
                artikal.omiljeni = omiljeniIds.includes(artikal.id);
            });
        }
        
        // Učitavanje statusa korpe
        const spremljenaKorpa = localStorage.getItem('artikliUKorpi');
        if (spremljenaKorpa) {
            const korpaIds = JSON.parse(spremljenaKorpa);
            
            // Ažuriranje artikala
            artikli.forEach(artikal => {
                artikal.korpa = korpaIds.includes(artikal.id);
            });
        }
    } catch (e) {
        console.error("Greška prilikom učitavanja stanja artikala:", e);
    }
}

// Funkcija za spremanje stanja omiljenih artikala
function spremiOmiljene() {
    try {
        const omiljeniIds = artikli.filter(a => a.omiljeni).map(a => a.id);
        localStorage.setItem('omiljeniArtikli', JSON.stringify(omiljeniIds));
    } catch (e) {
        console.error("Greška prilikom spremanja omiljenih artikala:", e);
    }
}

// Funkcija za spremanje stanja korpe
function spremiKorpu() {
    try {
        const korpaIds = artikli.filter(a => a.korpa).map(a => a.id);
        localStorage.setItem('artikliUKorpi', JSON.stringify(korpaIds));
    } catch (e) {
        console.error("Greška prilikom spremanja artikala u korpi:", e);
    }
}

// Funkcija za prikaz artikala na početnoj stranici
function prikaziArtikleNaPocetnoj(artikliZaPrikaz) {
    const kontejner = document.getElementById('products-container');
    if (!kontejner) {
        console.error("Container za proizvode nije pronađen!");
        return;
    }
    
    // Očisti kontejner
    kontejner.innerHTML = '';
    
    // Ako nema artikala za prikaz
    if (artikliZaPrikaz.length === 0) {
        kontejner.innerHTML = '<div class="empty-message">Nema artikala koji odgovaraju odabranim filterima.</div>';
        return;
    }
    
    // Dodaj artikle
    artikliZaPrikaz.forEach(artikal => {
        const artikliElement = document.createElement('div');
        artikliElement.classList.add('product-card');
        artikliElement.innerHTML = `
            <div class="product-image-container">
                <img src="${artikal.slika}" alt="${artikal.naziv}" class="product-image">
                <div class="product-overlay">
                    <div class="product-actions">
                        <button class="view-button" data-id="${artikal.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="favorite-button ${artikal.omiljeni ? 'active' : ''}" data-id="${artikal.id}">
                            <i class="${artikal.omiljeni ? 'fas' : 'far'} fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="product-info">
                <h3 class="product-title">${artikal.naziv}</h3>
                <p class="product-category">${formatirajKategoriju(artikal.kategorija)} • ${formatirajSezonu(artikal.sezona)}</p>
            </div>
        `;
        
        kontejner.appendChild(artikliElement);
    });
    
    // Dodaj događaje za gumbe
    dodajDogadjajeZaGumbe();
}

// Funkcija za postavljanje događaja za gumbe
function dodajDogadjajeZaGumbe() {
    // Događaj za gumb za pregled proizvoda
    document.querySelectorAll('.view-button').forEach(button => {
        button.addEventListener('click', function() {
            const artikalId = this.getAttribute('data-id');
            window.location.href = `proizvod.html?id=${artikalId}`;
        });
    });
    
    // Događaj za gumb za dodavanje u favorite
    document.querySelectorAll('.favorite-button').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            
            const artikalId = parseInt(this.getAttribute('data-id'));
            toggleFavorit(artikalId, this);
        });
    });
}

// Funkcija za dodavanje/uklanjanje iz favorita
function toggleFavorit(artikalId, button) {
    // Pronađi artikal u bazi
    const artikal = artikli.find(a => a.id === artikalId);
    if (!artikal) return;
    
    // Promijeni status omiljenog
    artikal.omiljeni = !artikal.omiljeni;
    
    // Ažuriraj gumb
    if (artikal.omiljeni) {
        button.classList.add('active');
        button.querySelector('i').classList.replace('far', 'fas');
    } else {
        button.classList.remove('active');
        button.querySelector('i').classList.replace('fas', 'far');
    }
    
    // Spremi stanje omiljenih artikala
    spremiOmiljene();
}

// Funkcija za formatiranje naziva kategorije
function formatirajKategoriju(kategorija) {
    const kategorije = {
        'haljina': 'Haljina',
        'sorc': 'Šorc',
        'duks': 'Duks',
        'jakna': 'Jakna'
    };
    
    return kategorije[kategorija] || kategorija;
}

// Funkcija za formatiranje naziva sezone
function formatirajSezonu(sezona) {
    const sezone = {
        'proljece': 'Proljeće',
        'ljeto': 'Ljeto',
        'jesen': 'Jesen',
        'zima': 'Zima'
    };
    
    return sezone[sezona] || sezona;
}

// Funkcija za postavljanje događaja na filtere
function postaviFiltere() {
    // Filter za sezone
    document.querySelectorAll('[data-season]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const sezona = this.getAttribute('data-season');
            
            let filtriraniArtikli = artikli;
            if (sezona !== 'sve') {
                filtriraniArtikli = artikli.filter(artikal => artikal.sezona === sezona);
            }
            
            prikaziArtikleNaPocetnoj(filtriraniArtikli);
            
            // Označi aktivan filter
            document.querySelectorAll('[data-season]').forEach(el => el.classList.remove('active'));
            this.classList.add('active');
            
            // Zatvori dropdown nakon odabira
            const hamburgerIcon = document.getElementById('hamburgerIcon');
            const menuDropdown = document.getElementById('menuDropdown');
            if (hamburgerIcon && menuDropdown) {
                hamburgerIcon.classList.remove('active');
                menuDropdown.classList.remove('show');
            }
        });
    });
    
    // Filter za tipove odjeće
    document.querySelectorAll('[data-type]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const tip = this.getAttribute('data-type');
            
            let filtriraniArtikli = artikli;
            if (tip !== 'sve') {
                filtriraniArtikli = artikli.filter(artikal => artikal.kategorija === tip);
            }
            
            prikaziArtikleNaPocetnoj(filtriraniArtikli);
            
            // Označi aktivan filter
            document.querySelectorAll('[data-type]').forEach(el => el.classList.remove('active'));
            this.classList.add('active');
            
            // Zatvori dropdown nakon odabira
            const hamburgerIcon = document.getElementById('hamburgerIcon');
            const menuDropdown = document.getElementById('menuDropdown');
            if (hamburgerIcon && menuDropdown) {
                hamburgerIcon.classList.remove('active');
                menuDropdown.classList.remove('show');
            }
        });
    });
}

// Funkcija za prikaz detalja proizvoda
function prikaziDetaljeProizvoda() {
    const params = new URLSearchParams(window.location.search);
    const artikalId = parseInt(params.get('id'));
    
    if (!artikalId) {
        window.location.href = 'index.html';
        return;
    }
    
    const artikal = artikli.find(a => a.id === artikalId);
    
    if (!artikal) {
        window.location.href = 'index.html';
        return;
    }
    
    const kontejner = document.getElementById('product-detail');
    if (!kontejner) {
        console.error("Container za detalje proizvoda nije pronađen!");
        return;
    }
    
    kontejner.innerHTML = `
        <img src="${artikal.slika}" alt="${artikal.naziv}" class="product-detail-image">
        <div class="product-detail-info">
            <h1 class="product-detail-title">${artikal.naziv}</h1>
            <p class="product-detail-category">${formatirajKategoriju(artikal.kategorija)}</p>
            <p class="product-detail-season">${formatirajSezonu(artikal.sezona)}</p>
            <div class="product-detail-divider"></div>
            <p class="product-detail-price">${artikal.cijena.toFixed(2)} KM</p>
            <p class="product-detail-size">Veličina: ${artikal.velicina}</p>
            <div class="product-detail-description">${artikal.opis}</div>
            <div class="product-actions">
                <button class="add-to-cart" data-id="${artikal.id}">Dodaj u korpu</button>
                <button class="add-to-favorites ${artikal.omiljeni ? 'active' : ''}" data-id="${artikal.id}">
                    ${artikal.omiljeni ? 'Ukloni iz favorita' : 'Dodaj u favorite'}
                </button>
            </div>
        </div>
    `;
    
    // Događaj za gumb za dodavanje u korpu
    document.querySelector('.add-to-cart').addEventListener('click', function() {
        const artikalId = parseInt(this.getAttribute('data-id'));
        dodajUKorpu(artikalId);
        alert('Artikal je dodan u korpu!');
    });
    
    // Događaj za gumb za dodavanje/uklanjanje iz favorita
    document.querySelector('.add-to-favorites').addEventListener('click', function() {
        const artikalId = parseInt(this.getAttribute('data-id'));
        const artikal = artikli.find(a => a.id === artikalId);
        
        if (artikal) {
            artikal.omiljeni = !artikal.omiljeni;
            
            if (artikal.omiljeni) {
                this.classList.add('active');
                this.textContent = 'Ukloni iz favorita';
            } else {
                this.classList.remove('active');
                this.textContent = 'Dodaj u favorite';
            }
            
            // Spremi stanje omiljenih artikala
            spremiOmiljene();
        }
    });
}

// Funkcija za dodavanje artikla u korpu
function dodajUKorpu(artikalId) {
    const artikal = artikli.find(a => a.id === artikalId);
    if (artikal) {
        artikal.korpa = true;
        // Spremi stanje korpe
        spremiKorpu();
    }
}

// Funkcija za prikaz favorita
function prikaziFavorite() {
    const kontejner = document.getElementById('favorites-container');
    if (!kontejner) {
        console.error("Container za favorite nije pronađen!");
        return;
    }
    
    // Filtriraj omiljene artikle
    const omiljeniArtikli = artikli.filter(artikal => artikal.omiljeni);
    
    // Očisti kontejner
    kontejner.innerHTML = '';
    
    // Ako nema omiljenih artikala
    if (omiljeniArtikli.length === 0) {
        kontejner.innerHTML = '<div class="empty-message">Nemate omiljenih artikala.</div>';
        return;
    }
    
    // Prikaži omiljene artikle
    omiljeniArtikli.forEach(artikal => {
        const artikliElement = document.createElement('div');
        artikliElement.classList.add('product-card');
        artikliElement.innerHTML = `
            <div class="product-image-container">
                <img src="${artikal.slika}" alt="${artikal.naziv}" class="product-image">
                <div class="product-overlay">
                    <div class="product-actions">
                        <button class="view-button" data-id="${artikal.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="favorite-button active" data-id="${artikal.id}">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="product-info">
                <h3 class="product-title">${artikal.naziv}</h3>
                <p class="product-category">${formatirajKategoriju(artikal.kategorija)} • ${formatirajSezonu(artikal.sezona)}</p>
            </div>
        `;
        
        kontejner.appendChild(artikliElement);
    });
    
    // Dodaj događaje za gumbe
    dodajDogadjajeZaGumbe();
}

// Funkcija za prikaz korpe
function prikaziKorpu() {
    const kontejner = document.getElementById('cart-container');
    const summaryKontejner = document.getElementById('cart-summary');
    
    if (!kontejner || !summaryKontejner) {
        console.error("Container za korpu nije pronađen!");
        return;
    }
    
    // Filtriraj artikle u korpi
    const artikliUKorpi = artikli.filter(artikal => artikal.korpa);
    
    // Očisti kontejnere
    kontejner.innerHTML = '';
    summaryKontejner.innerHTML = '';
    
    // Ako nema artikala u korpi
    if (artikliUKorpi.length === 0) {
        kontejner.innerHTML = '<div class="empty-message">Vaša korpa je prazna.</div>';
        return;
    }
    
    // Izračunaj ukupnu cijenu
    let ukupnaCijena = 0;
    
    // Prikaži artikle u korpi
    artikliUKorpi.forEach(artikal => {
        ukupnaCijena += artikal.cijena;
        
        const artikliElement = document.createElement('div');
        artikliElement.classList.add('cart-item');
        artikliElement.innerHTML = `
            <img src="${artikal.slika}" alt="${artikal.naziv}" class="cart-item-image">
            <div class="cart-item-info">
                <h3>${artikal.naziv}</h3>
                <p>${formatirajKategoriju(artikal.kategorija)} • ${formatirajSezonu(artikal.sezona)} • Veličina: ${artikal.velicina}</p>
            </div>
            <div class="cart-item-price">${artikal.cijena.toFixed(2)} KM</div>
            <button class="cart-item-remove" data-id="${artikal.id}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        kontejner.appendChild(artikliElement);
    });
    
    // Prikaz ukupne cijene i gumba za nastavak
    summaryKontejner.innerHTML = `
        <div class="cart-total">Ukupno: <strong>${ukupnaCijena.toFixed(2)} KM</strong></div>
        <button class="checkout-button">Nastavi kupovinu</button>
    `;
    
    // Dodaj događaj za gumb za uklanjanje
    document.querySelectorAll('.cart-item-remove').forEach(button => {
        button.addEventListener('click', function() {
            const artikalId = parseInt(this.getAttribute('data-id'));
            ukloniIzKorpe(artikalId);
            prikaziKorpu(); // Ponovno učitaj korpu
        });
    });
    
    // Dodaj događaj za gumb za nastavak
    document.querySelector('.checkout-button').addEventListener('click', function() {
        alert('Hvala na kupovini!');
        // Očisti korpu
        artikli.forEach(artikal => {
            artikal.korpa = false;
        });
        // Spremi stanje korpe
        spremiKorpu();
        // Ponovno učitaj korpu
        prikaziKorpu();
    });
}

// Funkcija za uklanjanje artikla iz korpe
function ukloniIzKorpe(artikalId) {
    const artikal = artikli.find(a => a.id === artikalId);
    if (artikal) {
        artikal.korpa = false;
        // Spremi stanje korpe
        spremiKorpu();
    }
}
