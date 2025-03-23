/**
 * Vintage Thrift Store - Main JavaScript
 * Za rad s API-jem umjesto lokalnih podataka
 */

// Globalne varijable
let artikli = [];
let filteredArtikli = [];
let currentFilters = {
    type: 'sve',
    season: 'sve'
};

// Dohvatanje artikala s API-ja
async function fetchArtikli() {
    try {
        const response = await fetch('/api/articles');
        if (!response.ok) {
            throw new Error('Greška prilikom dohvatanja artikala');
        }
        
        const data = await response.json();
        artikli = data;
        filteredArtikli = [...artikli];
        
        renderArtikli();
    } catch (error) {
        console.error('Greška:', error);
        document.getElementById('products-container').innerHTML = `
            <div class="error-message">
                <p>Došlo je do greške prilikom učitavanja artikala. Molimo pokušajte ponovo.</p>
            </div>
        `;
    }
}

// Prikaz artikala na stranici
function renderArtikli() {
    const container = document.getElementById('products-container');
    
    if (!container) return;
    
    if (filteredArtikli.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <p>Nema artikala koji odgovaraju vašoj pretrazi.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    filteredArtikli.forEach(artikal => {
        html += `
            <div class="product-card" data-id="${artikal._id}">
                <div class="product-image">
                    <img src="${artikal.images && artikal.images.length > 0 ? artikal.images[0] : 'images/placeholder.jpg'}" alt="${artikal.title}">
                    <div class="product-actions">
                        <button class="favorite-btn ${artikal.favorite ? 'active' : ''}" data-id="${artikal._id}">
                            <i class="fa${artikal.favorite ? 's' : 'r'} fa-heart"></i>
                        </button>
                        <button class="cart-btn ${artikal.inCart ? 'active' : ''}" data-id="${artikal._id}">
                            <i class="fa${artikal.inCart ? 's' : 'r'} fa-shopping-bag"></i>
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-title"><a href="product.html?id=${artikal._id}">${artikal.title}</a></h3>
                    <p class="product-price">${artikal.price.toFixed(2)} KM</p>
                    <div class="product-meta">
                        <span class="product-size">${artikal.size}</span>
                        <span class="product-category">${getCategoryName(artikal.category)}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Dodavanje event listenera za dugmad nakon renderovanja
    addProductButtonListeners();
}

// Dobijanje naziva kategorije na osnovu koda
function getCategoryName(categoryCode) {
    const categories = {
        'musko': 'Muško',
        'zensko': 'Žensko',
        'djecije': 'Dječije',
        'jakne': 'Jakne',
        'duksevi': 'Duksevi',
        'majice': 'Majice',
        'jeans': 'Jeans',
        'sorcevi': 'Šorcevi',
        'kosulje': 'Košulje i bluze',
        'handmade': 'Handmade',
        'starine': 'Starine',
        'ostalo': 'Ostalo'
    };
    
    return categories[categoryCode] || categoryCode;
}

// Dodavanje event listenera za dugmad na karticama proizvoda
function addProductButtonListeners() {
    // Event listeneri za dugmad za omiljene
    document.querySelectorAll('.favorite-btn').forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            const id = this.getAttribute('data-id');
            const isActive = this.classList.contains('active');
            
            try {
                // Poziv API-ja za dodavanje/uklanjanje iz omiljenih
                const response = await fetch(`/api/favorites/${id}`, {
                    method: isActive ? 'DELETE' : 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Greška prilikom ažuriranja omiljenih');
                }
                
                // Ažuriranje UI-a
                this.classList.toggle('active');
                const icon = this.querySelector('i');
                if (isActive) {
                    icon.classList.replace('fas', 'far');
                } else {
                    icon.classList.replace('far', 'fas');
                }
                
                // Ažuriranje lokalnih podataka
                const artikal = artikli.find(a => a._id === id);
                if (artikal) {
                    artikal.favorite = !isActive;
                }
                
            } catch (error) {
                console.error('Greška:', error);
                alert('Došlo je do greške prilikom ažuriranja omiljenih artikala.');
            }
        });
    });
    
    // Event listeneri za dugmad za korpu
    document.querySelectorAll('.cart-btn').forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            const id = this.getAttribute('data-id');
            const isActive = this.classList.contains('active');
            
            try {
                // Poziv API-ja za dodavanje/uklanjanje iz korpe
                const response = await fetch(`/api/cart/${id}`, {
                    method: isActive ? 'DELETE' : 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Greška prilikom ažuriranja korpe');
                }
                
                // Ažuriranje UI-a
                this.classList.toggle('active');
                const icon = this.querySelector('i');
                if (isActive) {
                    icon.classList.replace('fas', 'far');
                } else {
                    icon.classList.replace('far', 'fas');
                }
                
                // Ažuriranje lokalnih podataka
                const artikal = artikli.find(a => a._id === id);
                if (artikal) {
                    artikal.inCart = !isActive;
                }
                
            } catch (error) {
                console.error('Greška:', error);
                alert('Došlo je do greške prilikom ažuriranja korpe.');
            }
        });
    });
}

// Filtriranje artikala
function filterArtikli() {
    filteredArtikli = artikli.filter(artikal => {
        const typeMatch = currentFilters.type === 'sve' || artikal.category === currentFilters.type;
        const seasonMatch = currentFilters.season === 'sve' || artikal.season === currentFilters.season;
        return typeMatch && seasonMatch;
    });
    
    renderArtikli();
}

// Inicijalizacija stranice
document.addEventListener('DOMContentLoaded', function() {
    // Dohvatanje artikala prilikom učitavanja stranice
    fetchArtikli();
    
    // Event listeneri za opcije filtriranja
    document.querySelectorAll('.filter-option').forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            
            const filterType = this.hasAttribute('data-type') ? 'type' : 'season';
            const filterValue = this.hasAttribute('data-type') ? this.getAttribute('data-type') : this.getAttribute('data-season');
            
            // Postavljanje aktivne klase na odabranu opciju
            document.querySelectorAll(`.filter-option[data-${filterType}]`).forEach(opt => {
                opt.classList.remove('active');
            });
            this.classList.add('active');
            
            // Ažuriranje filtera
            currentFilters[filterType] = filterValue;
            
            // Filtriranje artikala
            filterArtikli();
            
            // Zatvaranje dropdown menija nakon odabira
            const menuDropdown = document.getElementById('menuDropdown');
            const hamburgerIcon = document.getElementById('hamburgerIcon');
            
            if (menuDropdown && hamburgerIcon) {
                menuDropdown.classList.remove('show');
                hamburgerIcon.classList.remove('active');
            }
        });
    });
    
    // Hamburger menu funkcionalnost
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
    
    // Provjera je li korisnik prijavljen
    const prijavljeniKorisnik = localStorage.getItem('prijavljeniKorisnik');
    const sellButton = document.getElementById('sellButton');
    const profileLink = document.getElementById('profileLink');
    
    if (prijavljeniKorisnik) {
        // Ako je korisnik prijavljen, promijeni link "Prodaj svoju odjeću" da vodi na sell.html
        if (sellButton) sellButton.href = 'sell.html';
        
        // Prikaži link za profil
        if (profileLink) profileLink.style.display = 'block';
    } else {
        // Ako korisnik nije prijavljen, link "Prodaj svoju odjeću" vodi na register.html
        if (sellButton) sellButton.href = 'register.html';
        
        // Sakrij link za profil
        if (profileLink) profileLink.style.display = 'none';
    }
});
