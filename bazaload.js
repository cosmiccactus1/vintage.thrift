document.addEventListener('DOMContentLoaded', () => {
    // Inicijalizacija varijabli
    let sviArtikli = ucitajArtikle();
    let korpa = ucitajKorpu();
    let omiljeniArtikli = ucitajOmiljene();
    
    // Učitavanje podataka na odgovarajuću stranicu
    const jeIndexStranica = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/');
    const jeProizvodStranica = window.location.pathname.includes('proizvod.html');
    
    if (jeIndexStranica) {
        prikaziSveArtikle(sviArtikli);
        postaviDogadjajeZaKategorije();
    } else if (jeProizvodStranica) {
        prikaziDetaljeProizvoda();
    }
    
    // Ažuriranje brojača
    azurirajBrojacKorpe();
    azurirajBrojacOmiljenih();
    
    // Događaji za ikone u headeru
    document.getElementById('cart-icon').addEventListener('click', prikaziKorpu);
    document.getElementById('favorites-icon').addEventListener('click', prikaziOmiljene);
});

// Funkcija za prikaz svih artikala na početnoj stranici
function prikaziSveArtikle(artikli, kategorija = 'sve') {
    const kontejner = document.getElementById('products-container');
    kontejner.innerHTML = '';
    
    let filtriraniArtikli = artikli;
    if (kategorija !== 'sve') {
        filtriraniArtikli = artikli.filter(artikal => artikal.kategorija === kategorija);
    }
    
    filtriraniArtikli.forEach(artikal => {
        const artikliElement = kreirajElementArtikla(artikal);
        kontejner.appendChild(artikliElement);
    });
    
    // Dodaj događaje za omiljene i kliktanje na artikal
    dodajDogadjaje();
}

// Funkcija za kreiranje elementa artikla
function kreirajElementArtikla(artikal) {
    const artikliElement = document.createElement('div');
    artikliElement.classList.add('product-card');
    artikliElement.dataset.id = artikal.id;
    
    const jeLiOmiljen = artikal.omiljeni ? 'active' : '';
    const srceIkona = artikal.omiljeni ? 'fas' : 'far';
    
    artikliElement.innerHTML = `
        <img src="${artikal.slika}" alt="${artikal.naziv}" class="product-image">
        <button class="favorite-btn ${jeLiOmiljen}" data-id="${artikal.id}">
            <i class="${srceIkona} fa-heart"></i>
        </button>
        <div class="product-info">
            <h3 class="product-title">${artikal.naziv}</h3>
            <p class="product-category">${formatirajKategoriju(artikal.kategorija)}</p>
            <p class="product-size">Veličina: ${artikal.velicina}</p>
            <p class="product-price">${artikal.cijena.toFixed(2)} KM</p>
        </div>
    `;
    
    return artikliElement;
}

// Funkcija za formatiranje naziva kategorije
function formatirajKategoriju(kategorija) {
    const kategorije = {
        'haljine': 'Haljina',
        'sakoi': 'Sako',
        'jeans': 'Traperice',
        'kosulje': 'Košulja/Bluza'
    };
    
    return kategorije[kategorija] || kategorija;
}

// Funkcija za dodavanje događaja na elemente
function dodajDogadjaje() {
    // Događaj za klik na artikal - vodi na stranicu proizvoda
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', function(e) {
            if (!e.target.closest('.favorite-btn')) {
                const artikalId = this.dataset.id;
                window.location.href = `proizvod.html?id=${artikalId}`;
            }
        });
    });
    
    // Događaj za dodavanje/uklanjanje iz omiljenih
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); // Spriječava da se otvori stranica proizvoda
            
            const artikalId = parseInt(this.dataset.id);
            toggleOmiljeni(artikalId);
            
            // Vizualno ažuriranje gumba
            this.classList.toggle('active');
            const srceIkona = this.querySelector('i');
            if (this.classList.contains('active')) {
                srceIkona.classList.replace('far', 'fas');
            } else {
                srceIkona.classList.replace('fas', 'far');
            }
        });
    });
}

// Funkcija za dodavanje/uklanjanje iz omiljenih
function toggleOmiljeni(artikalId) {
    let sviArtikli = ucitajArtikle();
    let omiljeniArtikli = ucitajOmiljene();
    
    // Pronađi artikal u bazi
    const artikal = sviArtikli.find(a => a.id === artikalId);
    if (artikal) {
        artikal.omiljeni = !artikal.omiljeni;
        
        // Ažuriraj omiljene artikle
        if (artikal.omiljeni) {
            omiljeniArtikli.push(artikalId);
        } else {
            omiljeniArtikli = omiljeniArtikli.filter(id => id !== artikalId);
        }
        
        // Spremi promjene
        sacuvajArtikle(sviArtikli);
        sacuvajOmiljene(omiljeniArtikli);
        
        // Ažuriraj brojač omiljenih
        azurirajBrojacOmiljenih();
    }
}

// Funkcija za postavljanje događaja za kategorije
function postaviDogadjajeZaKategorije() {
    document.querySelectorAll('.category-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const kategorija = this.dataset.category;
            const sviArtikli = ucitajArtikle();
            
            prikaziSveArtikle(sviArtikli, kategorija);
            
            // Označavanje aktivne kategorije
            document.querySelectorAll('.category-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
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
    
    const sviArtikli = ucitajArtikle();
    const artikal = sviArtikli.find(a => a.id === artikalId);
    
    if (!artikal) {
        window.location.href = 'index.html';
        return;
    }
    
    const kontejner = document.getElementById('product-detail');
    
    kontejner.innerHTML = `
        <div class="product-detail-image">
            <img src="${artikal.slika}" alt="${artikal.naziv}">
        </div>
        <div class="product-detail-info">
            <h1 class="product-detail-title">${artikal.naziv}</h1>
            <p class="product-detail-category">${formatirajKategoriju(artikal.kategorija)}</p>
            <p class="product-detail-size">Veličina: ${artikal.velicina}</p>
            <div class="product-detail-description">
                ${artikal.opis}
            </div>
            <p class="product-detail-price">${artikal.cijena.toFixed(2)} KM</p>
            <button class="add-to-cart-btn" data-id="${artikal.id}">Dodaj u korpu</button>
        </div>
    `;
    
    // Dodaj događaj za dodavanje u korpu
    document.querySelector('.add-to-cart-btn').addEventListener('click', function() {
        dodajUKorpu(artikalId);
        alert('Artikal je dodan u korpu!');
    });
}

// Funkcija za dodavanje artikla u korpu
function dodajUKorpu(artikalId) {
    let korpa = ucitajKorpu();
    
    // Provjera je li artikal već u korpi
    const postojeciArtikal = korpa.find(item => item.id === artikalId);
    
    if (postojeciArtikal) {
        postojeciArtikal.kolicina += 1;
    } else {
        korpa.push({ id: artikalId, kolicina: 1 });
    }
    
    sacuvajKorpu(korpa);
    azurirajBrojacKorpe();
}

// Funkcija za ažuriranje brojača košarice
function azurirajBrojacKorpe() {
    const korpa = ucitajKorpu();
    const ukupnaKolicina = korpa.reduce((total, item) => total + item.kolicina, 0);
    
    document.getElementById('cart-count').textContent = ukupnaKolicina;
}

// Funkcija za ažuriranje brojača omiljenih
function azurirajBrojacOmiljenih() {
    const omiljeni = ucitajOmiljene();
    document.getElementById('favorites-count').textContent = omiljeni.length;
}

// Funkcija za prikazivanje korpe (placeholder funkcija)
function prikaziKorpu() {
    const korpa = ucitajKorpu();
    
    if (korpa.length === 0) {
        alert('Vaša korpa je prazna.');
        return;
    }
    
    const sviArtikli = ucitajArtikle();
    let poruka = 'Artikli u vašoj korpi:\n\n';
    
    let ukupnaCijena = 0;
    
    korpa.forEach(item => {
        const artikal = sviArtikli.find(a => a.id === item.id);
        if (artikal) {
            const cijena = artikal.cijena * item.kolicina;
            poruka += `${artikal.naziv} (${item.kolicina}x) - ${cijena.toFixed(2)} KM\n`;
            ukupnaCijena += cijena;
        }
    });
    
    poruka += `\nUkupna cijena: ${ukupnaCijena.toFixed(2)} KM`;
    
    alert(poruka);
}

// Funkcija za prikazivanje omiljenih artikala (placeholder funkcija)
function prikaziOmiljene() {
    const omiljeni = ucitajOmiljene();
    
    if (omiljeni.length === 0) {
        alert('Nemate omiljenih artikala.');
        return;
    }
    
    const sviArtikli = ucitajArtikle();
    let poruka = 'Vaši omiljeni artikli:\n\n';
    
    omiljeni.forEach(id => {
        const artikal = sviArtikli.find(a => a.id === id);
        if (artikal) {
            poruka += `${artikal.naziv} - ${artikal.cijena.toFixed(2)} KM\n`;
        }
    });
    
    alert(poruka);
}
