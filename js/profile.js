/**
 * Vintage Thrift Store - Profile JavaScript
 * Za rad s korisničkim profilom
 */

// Globalne varijable
let userId = null;
let userInfo = null;

// Inicijalizacija stranice
document.addEventListener('DOMContentLoaded', function() {
    // Provjera je li korisnik prijavljen
    const prijavljeniKorisnikJSON = localStorage.getItem('prijavljeniKorisnik');
    
    if (!prijavljeniKorisnikJSON) {
        // Ako korisnik nije prijavljen, preusmjeri na register.html
        window.location.href = 'register.html';
        return;
    }
    
    try {
        // Parsiranje podataka o korisniku
        userInfo = JSON.parse(prijavljeniKorisnikJSON);
        userId = userInfo.id || userInfo._id || userInfo.userId;
        
        // Učitavanje profila korisnika
        loadUserProfile();
        
        // Učitavanje artikala, favorita i narudžbi
        loadUserListings();
        loadUserFavorites();
        loadUserOrders();
        
        // Inicijalizacija tabova
        initTabs();
        
        // Inicijalizacija hamburger menija
        initHamburgerMenu();
        
        // Inicijalizacija dugmeta za odjavu
        initLogoutButton();
        
    } catch (error) {
        console.error('Greška pri inicijalizaciji profila:', error);
        alert('Došlo je do greške prilikom učitavanja profila.');
    }
});

// Učitavanje profila korisnika
async function loadUserProfile() {
    if (!userId) {
        console.error('Nedostaje ID korisnika');
        return;
    }
    
    try {
        // Prikaz postojećih informacija iz localStorage-a
        const profileUsername = document.getElementById('profileUsername');
        const profileItemCount = document.getElementById('profileItemCount');
        const profileMemberSince = document.getElementById('profileMemberSince');
        
        if (profileUsername) {
            profileUsername.textContent = userInfo.username || userInfo.name || userInfo.displayName || 'Korisnik';
        }
        
        // Pokušaj dobiti dodatne informacije s API-ja
        try {
            const response = await fetch(`/api/users/${userId}`);
            if (response.ok) {
                const userData = await response.json();
                
                // Ažuriranje podataka na profilu
                if (profileUsername) {
                    profileUsername.textContent = userData.username || userData.name || userData.displayName || 'Korisnik';
                }
                
                if (profileItemCount) {
                    profileItemCount.textContent = `${userData.itemCount || 0} artikala`;
                }
                
                if (profileMemberSince && userData.createdAt) {
                    const date = new Date(userData.createdAt);
                    const months = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Juni', 'Juli', 'August', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];
                    profileMemberSince.textContent = `${months[date.getMonth()]} ${date.getFullYear()}`;
                }
                
                // Ažuriranje avatara ako postoji
                const profileAvatar = document.getElementById('profileAvatar');
                if (profileAvatar && userData.avatar) {
                    profileAvatar.src = userData.avatar;
                }
            }
        } catch (apiError) {
            console.error('Greška pri dohvatanju podataka s API-ja:', apiError);
            // Nastavi s lokalnim podacima ako API nije dostupan
        }
        
    } catch (error) {
        console.error('Greška pri učitavanju profila:', error);
    }
}

// Učitavanje artikala korisnika
async function loadUserListings() {
    if (!userId) return;
    
    const userListingsContainer = document.getElementById('user-listings');
    if (!userListingsContainer) return;
    
    try {
        // Dodavanje indikatora učitavanja
        userListingsContainer.innerHTML = '<div class="loading">Učitavanje artikala...</div>';
        
        // Dohvatanje artikala korisnika s API-ja
        const response = await fetch(`/api/articles?user_id=${userId}`);
        
        if (!response.ok) {
            userListingsContainer.innerHTML = '<div class="error-message">Neuspješno učitavanje artikala.</div>';
            return;
        }
        
        const articles = await response.json();
        
        if (!articles || articles.length === 0) {
            userListingsContainer.innerHTML = '<div class="empty-message">Nemate objavljenih artikala. <a href="sell.html">Dodajte novi artikal.</a></div>';
            return;
        }
        
        // Prikazivanje artikala
        userListingsContainer.innerHTML = articles.map(article => `
            <div class="product-card">
                <a href="product.html?id=${article._id || article.id}" class="product-link">
                    <div class="product-image">
                        <img src="${getArticleImage(article)}" alt="${article.title}" 
                             onerror="this.onerror=null; this.src='https://via.placeholder.com/300x400?text=No+Image'">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${article.title}</h3>
                        <div class="product-price">${parseFloat(article.price).toFixed(2)} KM</div>
                        <div class="product-meta">
                            <span class="product-size">${article.size || 'N/A'}</span>
                            <span class="product-brand">${article.brand || 'N/A'}</span>
                        </div>
                    </div>
                </a>
                <div class="product-actions">
                    <a href="edit.html?id=${article._id || article.id}" class="edit-btn">Uredi</a>
                    <button class="delete-btn" data-id="${article._id || article.id}">Izbriši</button>
                </div>
            </div>
        `).join('');
        
        // Dodavanje event listenera za dugmad za brisanje
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const articleId = this.getAttribute('data-id');
                if (confirm('Jeste li sigurni da želite izbrisati ovaj artikal?')) {
                    await deleteArticle(articleId);
                }
            });
        });
        
    } catch (error) {
        console.error('Greška pri učitavanju artikala:', error);
        userListingsContainer.innerHTML = '<div class="error-message">Došlo je do greške prilikom učitavanja artikala.</div>';
    }
}

// Učitavanje favorita korisnika
async function loadUserFavorites() {
    const userFavoritesContainer = document.getElementById('user-favorites');
    if (!userFavoritesContainer) return;
    
    try {
        // Dodavanje indikatora učitavanja
        userFavoritesContainer.innerHTML = '<div class="loading">Učitavanje favorita...</div>';
        
        // Dohvatanje favorita korisnika s API-ja
        const response = await fetch('/api/favorites');
        
        if (!response.ok) {
            userFavoritesContainer.innerHTML = '<div class="error-message">Neuspješno učitavanje favorita.</div>';
            return;
        }
        
        const favorites = await response.json();
        
        if (!favorites || favorites.length === 0) {
            userFavoritesContainer.innerHTML = '<div class="empty-message">Nemate favorita. <a href="index.html">Pregledajte artikle.</a></div>';
            return;
        }
        
        // Prikazivanje favorita
        userFavoritesContainer.innerHTML = favorites.map(article => `
            <div class="product-card">
                <a href="product.html?id=${article._id || article.id}" class="product-link">
                    <div class="product-image">
                        <img src="${getArticleImage
                                    <div class="product-image">
                        <img src="${getArticleImage(article)}" alt="${article.title}" 
                             onerror="this.onerror=null; this.src='https://via.placeholder.com/300x400?text=No+Image'">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${article.title}</h3>
                        <div class="product-price">${parseFloat(article.price).toFixed(2)} KM</div>
                        <div class="product-meta">
                            <span class="product-size">${article.size || 'N/A'}</span>
                            <span class="product-brand">${article.brand || 'N/A'}</span>
                        </div>
                    </div>
                </a>
                <div class="product-actions">
                    <button class="remove-favorite-btn" data-id="${article._id || article.id}">Ukloni iz favorita</button>
                </div>
            </div>
        `).join('');
        
        // Dodavanje event listenera za dugmad za uklanjanje iz favorita
        document.querySelectorAll('.remove-favorite-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const articleId = this.getAttribute('data-id');
                await removeFromFavorites(articleId);
            });
        });
        
    } catch (error) {
        console.error('Greška pri učitavanju favorita:', error);
        userFavoritesContainer.innerHTML = '<div class="error-message">Došlo je do greške prilikom učitavanja favorita.</div>';
    }
}

// Učitavanje narudžbi korisnika
async function loadUserOrders() {
    const userOrdersContainer = document.getElementById('user-orders');
    if (!userOrdersContainer) return;
    
    try {
        // Dodavanje indikatora učitavanja
        userOrdersContainer.innerHTML = '<div class="loading">Učitavanje narudžbi...</div>';
        
        // Dohvatanje narudžbi korisnika s API-ja
        const response = await fetch('/api/orders');
        
        if (!response.ok) {
            userOrdersContainer.innerHTML = '<div class="error-message">Neuspješno učitavanje narudžbi.</div>';
            return;
        }
        
        const orders = await response.json();
        
        if (!orders || orders.length === 0) {
            userOrdersContainer.innerHTML = '<div class="empty-message">Nemate narudžbi. <a href="index.html">Pregledajte artikle.</a></div>';
            return;
        }
        
        // Prikazivanje narudžbi
        userOrdersContainer.innerHTML = orders.map(order => {
            // Formatiranje datuma
            const orderDate = new Date(order.created_at || order.createdAt);
            const formattedDate = `${orderDate.getDate()}.${orderDate.getMonth() + 1}.${orderDate.getFullYear()}`;
            
            return `
                <div class="order-item">
                    <div class="order-header">
                        <div class="order-id">Narudžba #${order._id || order.id || 'N/A'}</div>
                        <div class="order-date">${formattedDate}</div>
                        <div class="order-status">${getOrderStatusName(order.status)}</div>
                    </div>
                    <div class="order-content">
                        <div class="order-products">
                            ${order.items ? order.items.map(item => `
                                <div class="order-product">
                                    <div class="product-image">
                                        <img src="${getArticleImage(item)}" alt="${item.title}" 
                                             onerror="this.onerror=null; this.src='https://via.placeholder.com/100x100?text=No+Image'">
                                    </div>
                                    <div class="product-details">
                                        <div class="product-title">${item.title}</div>
                                        <div class="product-meta">
                                            <span>Veličina: ${item.size || 'N/A'}</span>
                                            <span>Količina: ${item.quantity || 1}</span>
                                        </div>
                                        <div class="product-price">${parseFloat(item.price).toFixed(2)} KM</div>
                                    </div>
                                </div>
                            `).join('') : '<div class="empty-message">Nema detalja o artiklima u narudžbi.</div>'}
                        </div>
                        <div class="order-summary">
                            <div class="order-total">Ukupno: ${parseFloat(order.total).toFixed(2)} KM</div>
                            <div class="order-actions">
                                <button class="view-order-details-btn" data-id="${order._id || order.id}">Detalji</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Dodavanje event listenera za dugmad za detalje narudžbe
        document.querySelectorAll('.view-order-details-btn').forEach(button => {
            button.addEventListener('click', function() {
                const orderId = this.getAttribute('data-id');
                // Ovdje možete implementirati prikaz modalnog prozora s detaljima ili preusmjeriti na stranicu s detaljima
                alert(`Detalji narudžbe ${orderId} - Ova funkcionalnost još nije implementirana.`);
            });
        });
        
    } catch (error) {
        console.error('Greška pri učitavanju narudžbi:', error);
        userOrdersContainer.innerHTML = '<div class="error-message">Došlo je do greške prilikom učitavanja narudžbi.</div>';
    }
}

// Inicijalizacija tabova
function initTabs() {
    const profileTabs = document.querySelectorAll('.profile-tab');
    const profileSections = document.querySelectorAll('.profile-section');
    
    profileTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // Ukloni active klasu sa svih tabova i sekcija
            profileTabs.forEach(t => t.classList.remove('active'));
            profileSections.forEach(s => s.classList.remove('active'));
            
            // Dodaj active klasu na odabrani tab i sekciju
            this.classList.add('active');
            document.getElementById(`${tabName}-section`).classList.add('active');
        });
    });
}

// Inicijalizacija hamburger menija
function initHamburgerMenu() {
    const hamburgerIcon = document.getElementById('hamburgerIcon');
    const menuDropdown = document.getElementById('menuDropdown');
    
    if (hamburgerIcon && menuDropdown) {
        hamburgerIcon.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Spriječava propagaciju događaja
            console.log('Hamburger kliknut');
            this.classList.toggle('active');
            menuDropdown.classList.toggle('show');
        });
        
        // Zatvaranje menija klikom izvan
        document.addEventListener('click', function(e) {
            if (hamburgerIcon && menuDropdown && 
                !hamburgerIcon.contains(e.target) && 
                !menuDropdown.contains(e.target)) {
                hamburgerIcon.classList.remove('active');
                menuDropdown.classList.remove('show');
            }
        });
    }
}

// Inicijalizacija dugmeta za odjavu
function initLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Jeste li sigurni da se želite odjaviti?')) {
                localStorage.removeItem('prijavljeniKorisnik');
                localStorage.removeItem('userId');
                window.location.href = 'index.html';
            }
        });
    }
}

// Funkcija za brisanje artikla
async function deleteArticle(articleId) {
    try {
        const response = await fetch(`/api/articles/${articleId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Greška prilikom brisanja artikla');
        }
        
        // Ponovno učitavanje artikala nakon uspješnog brisanja
        loadUserListings();
        
    } catch (error) {
        console.error('Greška prilikom brisanja artikla:', error);
        alert('Došlo je do greške prilikom brisanja artikla.');
    }
}

// Funkcija za uklanjanje artikla iz favorita
async function removeFromFavorites(articleId) {
    try {
        const response = await fetch(`/api/favorites/${articleId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Greška prilikom uklanjanja iz favorita');
        }
        
        // Ponovno učitavanje favorita nakon uspješnog uklanjanja
        loadUserFavorites();
        
    } catch (error) {
        console.error('Greška prilikom uklanjanja iz favorita:', error);
        alert('Došlo je do greške prilikom uklanjanja iz favorita.');
    }
}

// Pomoćna funkcija za dobivanje slike artikla
function getArticleImage(article) {
    if (!article) return 'https://via.placeholder.com/300x400?text=No+Image';
    
    // Provjera ima li slika
    if (article.images) {
        // Ako je images string (JSON), pokušaj parsirati
        if (typeof article.images === 'string') {
            try {
                const parsedImages = JSON.parse(article.images);
                if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                    return parsedImages[0];
                } else if (parsedImages) {
                    return parsedImages;
                }
            } catch (e) {
                // Ako nije validan JSON, možda je direktni URL
                return article.images;
            }
        }
        // Ako je images niz, uzmi prvu sliku
        else if (Array.isArray(article.images) && article.images.length > 0) {
            return article.images[0];
        }
        // Ako je images direktni URL
        else if (article.images) {
            return article.images;
        }
    }
    
    // Ako nema slika ili dođe do greške, vrati placeholder
    return 'https://via.placeholder.com/300x400?text=No+Image';
}

// Pomoćna funkcija za dobivanje naziva statusa narudžbe
function getOrderStatusName(statusCode) {
    const statuses = {
        'pending': 'Na čekanju',
        'processing': 'U obradi',
        'shipped': 'Poslano',
        'delivered': 'Dostavljeno',
        'cancelled': 'Otkazano'
    };
    
    return statuses[statusCode] || statusCode || 'Nepoznat status';
}
