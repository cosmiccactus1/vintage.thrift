/**
 * Vintage Thrift Store - Profile JavaScript
 * Za rad s API-jem umjesto lokalnih podataka
 */

// Globalne varijable
let userData = null;
let userListings = [];
let userFavorites = [];
let userOrders = [];
let activeTab = 'listings';

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

// Učitavanje podataka korisnika
async function loadUserData() {
    try {
        // Dohvaćanje tokena iz localStorage-a
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`/api/users?id=${userData.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Greška prilikom dohvatanja podataka korisnika');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Greška:', error);
        showMessage('Došlo je do greške prilikom učitavanja podataka korisnika.', 'error');
        return userData; // Vrati postojeće podatke ako dohvaćanje ne uspije
    }
}

// Učitavanje artikala korisnika
async function loadUserListings() {
    try {
        // Dohvaćanje tokena iz localStorage-a
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`/api/articles/user/${userData.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Greška prilikom dohvatanja artikala korisnika');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Greška:', error);
        showMessage('Došlo je do greške prilikom učitavanja vaših artikala.', 'error');
        return [];
    }
}

// Učitavanje omiljenih artikala korisnika
async function loadUserFavorites() {
    try {
        // Dohvaćanje tokena iz localStorage-a
        const token = localStorage.getItem('authToken');
        
        const response = await fetch('/api/favorites', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Greška prilikom dohvatanja omiljenih artikala');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Greška:', error);
        showMessage('Došlo je do greške prilikom učitavanja vaših omiljenih artikala.', 'error');
        return [];
    }
}

// Učitavanje narudžbi korisnika
async function loadUserOrders() {
    try {
        // Dohvaćanje tokena iz localStorage-a
        const token = localStorage.getItem('authToken');
        
        const response = await fetch('/api/orders', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Greška prilikom dohvatanja narudžbi korisnika');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Greška:', error);
        showMessage('Došlo je do greške prilikom učitavanja vaših narudžbi.', 'error');
        return [];
    }
}

// Inicijalizacija podataka profila
async function initializeProfile() {
    // Učitavanje podataka
    userData = await loadUserData();
    userListings = await loadUserListings();
    userFavorites = await loadUserFavorites();
    userOrders = await loadUserOrders();
    
    // Ažuriranje UI-a
    updateProfileInfo();
    renderUserListings(userListings);
    renderUserFavorites(userFavorites);
    renderUserOrders(userOrders);
}

// Ažuriranje informacija o profilu
function updateProfileInfo() {
    // Ažuriranje imena korisnika
    const profileUsername = document.getElementById('profileUsername');
    if (profileUsername) {
        profileUsername.textContent = userData.username || 'Korisničko ime';
    }
    
    // Ažuriranje avatara korisnika
    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) {
        profileAvatar.src = userData.avatar_url || 'https://via.placeholder.com/100';
    }
    
    // Ažuriranje broja artikala
    const profileItemCount = document.getElementById('profileItemCount');
    if (profileItemCount) {
        profileItemCount.textContent = `${userListings.length} artikala`;
    }
    
    // Ažuriranje datuma registracije
    const profileMemberSince = document.getElementById('profileMemberSince');
    if (profileMemberSince && userData.created_at) {
        const date = new Date(userData.created_at);
        const month = getMonthName(date.getMonth());
        const year = date.getFullYear();
        profileMemberSince.textContent = `${month} ${year}`;
    }
}

// Dobijanje naziva mjeseca
function getMonthName(monthIndex) {
    const months = [
        'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Juni',
        'Juli', 'August', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
    ];
    return months[monthIndex];
}

// Prikaz artikala korisnika
function renderUserListings(listings) {
    const container = document.getElementById('user-listings');
    
    if (!container) return;
    
    if (listings.length === 0) {
        container.innerHTML = `
            <div class="empty-listings">
                <p>Još nemate objavljenih artikala</p>
                <a href="sell.html" class="button">Dodaj novi artikal</a>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    listings.forEach(item => {
        html += `
            <div class="product-card" data-id="${item._id}">
                <div class="product-image">
                    <a href="product.html?id=${item._id}">
                        <img src="${item.images && item.images.length > 0 ? item.images[0] : 'images/placeholder.jpg'}" alt="${item.title}">
                    </a>
                    <div class="product-actions">
                        <button class="edit-btn" data-id="${item._id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" data-id="${item._id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-title"><a href="product.html?id=${item._id}">${item.title}</a></h3>
                    <p class="product-price">${parseFloat(item.price).toFixed(2)} KM</p>
                    <div class="product-meta">
                        <span class="product-size">${item.size}</span>
                        <span class="product-category">${getCategoryName(item.category)}</span>
                    </div>
                    <div class="product-status">
                        <span class="status-badge ${item.status === 'active' ? 'active' : 'draft'}">
                            ${item.status === 'active' ? 'Objavljeno' : 'Nacrt'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Dodavanje event listenera za dugmad
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            window.location.href = `edit-listing.html?id=${id}`;
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            deleteArticle(id);
        });
    });
}

// Prikaz omiljenih artikala korisnika
function renderUserFavorites(favorites) {
    const container = document.getElementById('user-favorites');
    
    if (!container) return;
    
    if (favorites.length === 0) {
        container.innerHTML = `
            <div class="empty-favorites">
                <p>Nemate nijedan artikal među favoritima</p>
                <a href="index.html" class="button">Pregledaj artikle</a>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    favorites.forEach(item => {
        html += `
            <div class="product-card" data-id="${item._id}">
                <div class="product-image">
                    <a href="product.html?id=${item._id}">
                        <img src="${item.images && item.images.length > 0 ? item.images[0] : 'images/placeholder.jpg'}" alt="${item.title}">
                    </a>
                    <div class="product-actions">
                        <button class="favorite-btn active" data-id="${item._id}">
                            <i class="fas fa-heart"></i>
                        </button>
                        <button class="cart-btn ${item.inCart ? 'active' : ''}" data-id="${item._id}">
                            <i class="fa${item.inCart ? 's' : 'r'} fa-shopping-bag"></i>
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-title"><a href="product.html?id=${item._id}">${item.title}</a></h3>
                    <p class="product-price">${parseFloat(item.price).toFixed(2)} KM</p>
                    <div class="product-meta">
                        <span class="product-size">${item.size}</span>
                        <span class="product-category">${getCategoryName(item.category)}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Dodavanje event listenera za dugmad
    document.querySelectorAll('.favorite-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            removeFromFavorites(id);
        });
    });
    
    document.querySelectorAll('.cart-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            toggleCart(id);
        });
    });
}

// Prikaz narudžbi korisnika
function renderUserOrders(orders) {
    const container = document.getElementById('user-orders');
    
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-orders">
                <p>Nemate nijednu narudžbu</p>
                <a href="index.html" class="button">Pregledaj artikle</a>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    orders.forEach(order => {
        // Formatiranje datuma
        const orderDate = new Date(order.created_at);
        const formattedDate = `${orderDate.getDate()}.${orderDate.getMonth() + 1}.${orderDate.getFullYear()}.`;
        
        html += `
            <div class="order-item" data-id="${order._id}">
                <div class="order-header">
                    <div class="order-number">Narudžba #${order.order_number}</div>
                    <div class="order-date">${formattedDate}</div>
                    <div class="order-status ${order.status.toLowerCase()}">${getOrderStatusName(order.status)}</div>
                </div>
                <div class="order-products">
                    ${order.items.map(item => `
                        <div class="order-product">
                            <div class="product-image">
                                <img src="${item.image || 'images/placeholder.jpg'}" alt="${item.title}">
                            </div>
                            <div class="product-details">
                                <div class="product-title">${item.title}</div>
                                <div class="product-meta">
                                    <span class="product-size">Veličina: ${item.size}</span>
                                    <span class="product-price">Cijena: ${parseFloat(item.price).toFixed(2)} KM</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="order-total">
                    <span>Ukupno:</span>
                    <span class="total-price">${parseFloat(order.total_price).toFixed(2)} KM</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Funkcija za brisanje artikla
async function deleteArticle(id) {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj artikal?')) {
        return;
    }
    
    try {
        // Dohvaćanje tokena iz localStorage-a
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`/api/articles?id=${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Greška prilikom brisanja artikla');
        }
        
        // Ažuriranje lokalnih podataka
        userListings = userListings.filter(item => item._id !== id);
        
        // Ažuriranje prikaza
        renderUserListings(userListings);
        
        // Ažuriranje broja artikala
        const profileItemCount = document.getElementById('profileItemCount');
        if (profileItemCount) {
            profileItemCount.textContent = `${userListings.length} artikala`;
        }
        
        // Prikaži poruku o uspjehu
        showMessage('Artikal je uspješno obrisan.', 'success');
        
    } catch (error) {
        console.error('Greška:', error);
        showMessage('Došlo je do greške prilikom brisanja artikla.', 'error');
    }
}

// Funkcija za uklanjanje artikla iz favorita
async function removeFromFavorites(id) {
    try {
        // Dohvaćanje tokena iz localStorage-a
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`/api/favorites?id=${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Greška prilikom uklanjanja artikla iz favorita');
        }
        
        // Ažuriranje lokalnih podataka
        userFavorites = userFavorites.filter(item => item._id !== id);
        
        // Ažuriranje prikaza
        renderUserFavorites(userFavorites);
        
        // Prikaži poruku o uspjehu
        showMessage('Artikal je uklonjen iz favorita.', 'success');
        
    } catch (error) {
        console.error('Greška:', error);
        showMessage('Došlo je do greške prilikom uklanjanja artikla iz favorita.', 'error');
    }
}

// Funkcija za dodavanje/uklanjanje iz korpe
async function toggleCart(id) {
    const button = document.querySelector(`.cart-btn[data-id="${id}"]`);
    const isInCart = button.classList.contains('active');
    
    try {
        // Dohvaćanje tokena iz localStorage-a
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`/api/cart?id=${id}`, {
            method: isInCart ? 'DELETE' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Greška prilikom ažuriranja korpe');
        }
        
        // Ažuriranje UI-a
        button.classList.toggle('active');
        const icon = button.querySelector('i');
        if (isInCart) {
            icon.classList.replace('fas', 'far');
            showMessage('Artikal je uklonjen iz korpe.', 'success');
        } else {
            icon.classList.replace('far', 'fas');
            showMessage('Artikal je dodan u korpu.', 'success');
        }
        
        // Ažuriranje lokalnih podataka
        const item = userFavorites.find(item => item._id === id);
        if (item) {
            item.inCart = !isInCart;
        }
        
    } catch (error) {
        console.error('Greška:', error);
        showMessage('Došlo je do greške prilikom ažuriranja korpe.', 'error');
    }
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

// Dobijanje naziva statusa narudžbe
function getOrderStatusName(statusCode) {
    const statuses = {
        'pending': 'Na čekanju',
        'processing': 'U obradi',
        'shipped': 'Poslano',
        'delivered': 'Dostavljeno',
        'cancelled': 'Otkazano'
    };
    
    return statuses[statusCode] || statusCode;
}

// Inicijalizacija tabova
function initializeTabs() {
    const profileTabs = document.querySelectorAll('.profile-tab');
    const profileSections = document.querySelectorAll('.profile-section');
    
    // Provjera ima li hash u URL-u (npr. #favorites)
    const hash = window.location.hash.substring(1);
    if (hash && ['listings', 'favorites', 'orders'].includes(hash)) {
        activeTab = hash;
        
        // Ažuriranje aktivnog taba
        profileTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-tab') === activeTab) {
                tab.classList.add('active');
            }
        });
        
        // Ažuriranje aktivne sekcije
        profileSections.forEach(section => {
            section.classList.remove('active');
            if (section.id === `${activeTab}-section`) {
                section.classList.add('active');
            }
        });
    }
    
    // Dodavanje event listenera za tabove
    profileTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // Ažuriranje aktivnog taba
            activeTab = tabName;
            
            // Ažuriranje hash-a u URL-u
            window.location.hash = activeTab;
            
            // Ukloni active klasu sa svih tabova i sekcija
            profileTabs.forEach(t => t.classList.remove('active'));
            profileSections.forEach(s => s.classList.remove('active'));
            
            // Dodaj active klasu na odabrani tab i sekciju
            this.classList.add('active');
            document.getElementById(`${tabName}-section`).classList.add('active');
        });
    });
}

// Inicijalizacija odjave
function initializeLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Jeste li sigurni da se želite odjaviti?')) {
                localStorage.removeItem('prijavljeniKorisnik');
                localStorage.removeItem('authToken');
                window.location.href = 'index.html';
            }
        });
    }
}

// Inicijalizacija hamburger menija
function initializeHamburgerMenu() {
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

// Inicijalizacija stranice
document.addEventListener('DOMContentLoaded', async function() {
    // Provjera je li korisnik prijavljen
    userData = checkUserLoggedIn();
    if (!userData) return;
    
    // Inicijalizacija UI komponenti
    initializeTabs();
    initializeLogout();
    initializeHamburgerMenu();
    
    // Učitavanje i prikaz podataka
    await initializeProfile();
});
