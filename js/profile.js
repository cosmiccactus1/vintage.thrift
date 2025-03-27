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
        // Direktno koristi podatke iz localStorage-a ako API nije dostupan
        if (!userData) return null;
        
        // Osiguranje da imamo ID
        const userId = userData.id || userData._id || userData.userId;
        if (!userId) {
            console.error('Nedostaje ID korisnika');
            return userData;
        }
        
        // Dohvaćanje tokena iz localStorage-a
        const token = localStorage.getItem('authToken');
        
        // Pokušaj dohvatiti podatke korisnika iz API-ja
        try {
            const response = await fetch(`/api/users/${userId}`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            
            if (!response.ok) {
                console.error(`API error: ${response.status}`);
                return userData; // Vrati postojeće podatke ako API ne radi
            }
            
            const data = await response.json();
            console.log("Dohvaćeni podaci korisnika:", data);
            return data;
        } catch (apiError) {
            console.error('API error:', apiError);
            return userData; // Vrati postojeće podatke ako API ne radi
        }
    } catch (error) {
        console.error('Greška:', error);
        return userData; // Vrati postojeće podatke ako dohvaćanje ne uspije
    }
}

// Učitavanje artikala korisnika
async function loadUserListings() {
    try {
        if (!userData) return [];
        
        // Osiguranje da imamo ID
        const userId = userData.id || userData._id || userData.userId;
        if (!userId) {
            console.error('Nedostaje ID korisnika za dohvaćanje artikala');
            return [];
        }
        
        console.log("Dohvaćam artikle za korisnika s ID:", userId); // Debugging
        
        // Dohvaćanje tokena iz localStorage-a
        const token = localStorage.getItem('authToken');
        
        // Isprobaj različite endpoint formate zbog kompatibilnosti
        const endpoints = [
            `/api/articles/user/${userId}`,
            `/api/articles?user_id=${userId}`,
            `/api/articles?userId=${userId}`
        ];
        
        for (const endpoint of endpoints) {
            try {
                console.log("Pokušavam endpoint:", endpoint); // Debugging
                
                const response = await fetch(endpoint, {
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : ''
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log("Dohvaćeni artikli:", data);
                    
                    // Dodatna provjera na klijentu da filtriramo samo artikle ovog korisnika
                    const filteredData = Array.isArray(data) 
                        ? data.filter(item => (
                            item.user_id === userId || 
                            item.userId === userId || 
                            item.seller_id === userId
                          ))
                        : [];
                    
                    console.log("Filtrirani artikli za korisnika:", filteredData);
                    return filteredData;
                }
            } catch (endpointError) {
                console.error(`Greška za endpoint ${endpoint}:`, endpointError);
            }
        }
        
        // Ako ništa ne uspije, vrati prazno
        return [];
    } catch (error) {
        console.error('Glavna greška kod dohvaćanja artikala:', error);
        return [];
    }
}

// Učitavanje omiljenih artikala korisnika - POBOLJŠANA VERZIJA
async function loadUserFavorites() {
    try {
        // Dohvaćanje tokena iz localStorage-a
        const token = localStorage.getItem('authToken');
        
        // Prvo dohvati ID-ove favorita
        const response = await fetch('/api/favorites', {
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });
        
        if (!response.ok) {
            return [];
        }
        
        const favoritesData = await response.json();
        console.log('Dohvaćeni favoriti iz API:', favoritesData);
        
        // Ako je prazan rezultat, vrati prazno
        if (!Array.isArray(favoritesData) || favoritesData.length === 0) {
            return [];
        }
        
        // OPCIJA 1: Korisiti direktno artikle iz localStorage ako postoje
        try {
            // Provjeri postoje li artikli u localStorage-u
            const storedArticles = localStorage.getItem('articles');
            if (storedArticles) {
                const allArticles = JSON.parse(storedArticles);
                
                // Filtriraj samo artikle koji su u favoritima
                const favoriteArticles = allArticles.filter(article => {
                    // Provjeri da li je artikal u favoritima
                    return favoritesData.some(fav => {
                        const favId = fav._id || fav.id || (fav.article ? fav.article._id || fav.article.id : null);
                        return favId === article._id || favId === article.id;
                    });
                });
                
                console.log('Favoriti iz localStorage artikala:', favoriteArticles);
                
                if (favoriteArticles.length > 0) {
                    return favoriteArticles.map(article => ({
                        ...article,
                        favorite: true
                    }));
                }
            }
        } catch (localStorageError) {
            console.warn('Greška pri dohvaćanju artikala iz localStorage:', localStorageError);
        }
        
        // OPCIJA 2: Ako ne možemo koristiti localStorage, dohvati sve artikle iz API-ja
        try {
            const allArticlesResponse = await fetch('/api/articles', {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            
            if (allArticlesResponse.ok) {
                const allArticles = await allArticlesResponse.json();
                
                // Filtriraj samo artikle koji su u favoritima
                const favoriteArticles = allArticles.filter(article => {
                    return favoritesData.some(fav => {
                        const favId = fav._id || fav.id || (fav.article ? fav.article._id || fav.article.id : null);
                        return favId === article._id || favId === article.id;
                    });
                });
                
                console.log('Favoriti iz API svih artikala:', favoriteArticles);
                
                if (favoriteArticles.length > 0) {
                    return favoriteArticles.map(article => ({
                        ...article,
                        favorite: true
                    }));
                }
            }
        } catch (apiAllArticlesError) {
            console.warn('Greška pri dohvaćanju svih artikala iz API:', apiAllArticlesError);
        }
        
        // OPCIJA 3: Ako prve dvije opcije ne uspiju, dohvaćamo pojedinačno artikle
        const completeItems = [];
        
        for (const favItem of favoritesData) {
            // Uzmi ID artikla - može biti direktno ID ili unutar objekta
            const itemId = favItem._id || favItem.id || (favItem.article ? favItem.article._id || favItem.article.id : null);
            
            if (!itemId) {
                console.warn('Artikal nema validan ID:', favItem);
                continue;
            }
            
            try {
                // Dohvati detalje artikla
                const itemResponse = await fetch(`/api/articles/${itemId}`, {
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : ''
                    }
                });
                
                if (itemResponse.ok) {
                    const itemData = await itemResponse.json();
                    // Dodaj standardna polja ako nedostaju (za slučaj različitih API formata)
                    const completeItemData = {
                        ...itemData,
                        favorite: true,
                        _id: itemData._id || itemData.id || itemId,
                        images: itemData.images || (itemData.image ? [itemData.image] : [])
                    };
                    completeItems.push(completeItemData);
                } else {
                    console.warn(`Neuspjelo dohvaćanje detalja za artikal ${itemId}`);
                    // Dodajemo originalni favorit item ako ne možemo dohvatiti detalje
                    completeItems.push({
                        ...favItem,
                        _id: itemId,
                        favorite: true
                    });
                }
            } catch (itemError) {
                console.error(`Greška pri dohvaćanju artikla ${itemId}:`, itemError);
                completeItems.push({
                    ...favItem,
                    _id: itemId,
                    favorite: true
                });
            }
        }
        
        console.log('Dohvaćeni artikli opcija 3:', completeItems);
        return completeItems;
    } catch (error) {
        console.error('Greška:', error);
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
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });
        
        if (!response.ok) {
            return [];
        }
        
        const data = await response.json();
        console.log("Dohvaćene narudžbe:", data);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Greška:', error);
        return [];
    }
}

// Inicijalizacija podataka profila
async function initializeProfile() {
    // Učitavanje podataka
    const apiUserData = await loadUserData();
    if (apiUserData) {
        userData = { ...userData, ...apiUserData }; // Sjedini podatke iz localStorage-a i API-ja
    }
    
    console.log("Korišteni podaci korisnika:", userData);
    
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
    console.log("Ažuriranje profila s podacima:", userData);
    
    // Ažuriranje imena korisnika
    const profileUsername = document.getElementById('profileUsername');
    if (profileUsername) {
        profileUsername.textContent = userData.username || userData.name || userData.email || 'Korisničko ime';
    }
    
    // Ažuriranje avatara korisnika
    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) {
        profileAvatar.src = userData.avatar_url || userData.avatar || 'https://via.placeholder.com/100';
    }
    
    // Ažuriranje broja artikala
    const profileItemCount = document.getElementById('profileItemCount');
    if (profileItemCount) {
        profileItemCount.textContent = `${userListings.length} artikala`;
    }
    
    // Ažuriranje datuma registracije
    const profileMemberSince = document.getElementById('profileMemberSince');
    if (profileMemberSince) {
        const dateField = userData.created_at || userData.createdAt || userData.registeredAt;
        if (dateField) {
            try {
                const date = new Date(dateField);
                const month = getMonthName(date.getMonth());
                const year = date.getFullYear();
                profileMemberSince.textContent = `${month} ${year}`;
            } catch (e) {
                console.error("Greška pri formatiranju datuma:", e);
                profileMemberSince.textContent = "Januar 2025"; // Fallback
            }
        }
    }
}

// Dobijanje naziva mjeseca
function getMonthName(monthIndex) {
    const months = [
        'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Juni',
        'Juli', 'August', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
    ];
    return months[monthIndex] || 'Januar';
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
            <div class="product-card" data-id="${item._id || item.id}">
                <div class="product-image">
                    <a href="product.html?id=${item._id || item.id}">
                        <img src="${item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/300x400?text=No+Image'}" alt="${item.title}"
                             onerror="this.onerror=null; this.src='https://via.placeholder.com/300x400?text=No+Image'">
                    </a>
                    <div class="product-actions">
                        <button class="edit-btn" data-id="${item._id || item.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" data-id="${item._id || item.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-title"><a href="product.html?id=${item._id || item.id}">${item.title}</a></h3>
                    <p class="product-price">${parseFloat(item.price).toFixed(2)} KM</p>
                    <div class="product-meta">
                        <span class="product-size">${item.size || 'N/A'}</span>
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

// Prikaz omiljenih artikala korisnika - POBOLJŠANA VERZIJA
function renderUserFavorites(favorites) {
    const container = document.getElementById('user-favorites');
    
    if (!container) return;
    
    if (favorites.length === 0) {
        container.innerHTML = `
            <div class="empty-favorites">
                <p>Vaš ormar je prazan</p>
                <a href="index.html" class="button">Pronađi novu odjeću</a>
            </div>
        `;
        return;
    }
    
    console.log('Prikazujem favorite u profilu:', favorites);
    
    let html = '';
    
    favorites.forEach(item => {
        // Provjeri da li postoje slike
        const hasImages = item.images && Array.isArray(item.images) && item.images.length > 0;
        const imageUrl = hasImages ? item.images[0] : '';
        
        // Provjeri za moguće druge formate slika u API odgovoru
        const alternativeImageUrl = item.image || 
                                  (item.article && item.article.image) || 
                                  (item.article && item.article.images && item.article.images.length > 0 ? 
                                   item.article.images[0] : '');
        
        // Odaberi najbolju dostupnu sliku
        const bestImageUrl = imageUrl || alternativeImageUrl || '';
        
        console.log(`Artikal ${item._id || item.id}:`, {
            title: item.title || item.name,
            hasImages: hasImages,
            imageUrl: imageUrl,
            alternativeImageUrl: alternativeImageUrl,
            bestImageUrl: bestImageUrl
        });
        
        html += `
            <div class="product-card" data-id="${item._id || item.id}">
                <div class="product-image">
                    <a href="product.html?id=${item._id || item.id}">
                        <img 
                            src="${bestImageUrl}" 
                            alt="${item.title || item.name || 'Artikal'}"
                            onerror="this.onerror=null; this.src='https://via.placeholder.com/300x400?text=No+Image'">
                    </a>
                    <div class="product-actions">
                        <button class="favorite-btn active" data-id="${item._id || item.id}">
                            <i class="fas fa-heart"></i>
                        </button>
                        <button class="cart-btn ${item.inCart ? 'active' : ''}" data-id="${item._id || item.id}">
                            <i class="fa${item.inCart ? 's' : 'r'} fa-shopping-bag"></i>
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-title">
                        <a href="product.html?id=${item._id || item.id}">
                            ${item.title || item.name || 'Bez naziva'}
                        </a>
                    </h3>
                    <p class="product-price">
                        ${parseFloat(item.price || 0).toFixed(2)} KM
                    </p>
                    <div class="product-meta">
                        <span class="product-size">${item.size || 'N/A'}</span>
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
        const orderDate = new Date(order.created_at || order.createdAt);
        const formattedDate = `${orderDate.getDate()}.${orderDate.getMonth() + 1}.${orderDate.getFullYear()}.`;
        
        html += `
            <div class="order-item" data-id="${order._id || order.id}">
                <div class="order-header">
                    <div class="order-number">Narudžba #${order.order_number || order.orderNumber || (order._id || order.id)}</div>
                    <div class="order-date">${formattedDate}</div>
                    <div class="order-status ${(order.status || 'pending').toLowerCase()}">${getOrderStatusName(order.status)}</div>
                </div>
                <div class="order-products">
                    ${order.items && Array.isArray(order.items) ? order.items.map(item => `
                        <div class="order-product">
                            <div class="product-image">
                                <img src="${item.image || (item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/100x100?text=No+Image')}" alt="${item.title}"
                                     onerror="this.onerror=null; this.src='https://via.placeholder.com/100x100?text=No+Image'">
                            </div>
                            <div class="product-details">
                                <div class="product-title">${item.title}</div>
                                <div class="product-meta">
                                    <span class="product-size">Veličina: ${item.size || 'N/A'}</span>
                                    <span class="product-price">Cijena: ${parseFloat(item.price).toFixed(2)} KM</span>
                                </div>
                            </div>
                        </div>
                    `).join('') : '<div class="empty-message">Nema detalja o artiklima u narudžbi.</div>'}
                </div>
                <div class="order-total">
                    <span>Ukupno:</span>
                    <span class="total-price">${parseFloat(order.total_price || order.totalPrice || 0).toFixed(2)} KM</span>
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
        
        const response = await fetch(`/api/articles/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });
        
        if (!response.ok) {
            throw new Error('Greška prilikom brisanja artikla');
        }
        
        // Ažuriranje lokalnih podataka
        userListings = userListings.filter(item => (item._id !== id && item.id !== id));
        
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
        
        const response = await fetch(`/api/favorites/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });
        
        if (!response.ok) {
            throw new Error('Greška prilikom uklanjanja artikla iz favorita');
        }
        
        // Ažuriranje lokalnih podataka
        userFavorites = userFavorites.filter(item => (item._id !== id && item.id !== id));
        
        // Ažuriranje prikaza
        renderUserFavorites(userFavorites);
        
        // Prikaži poruku o uspjehu
        showMessage('Artikal je uklonjen iz vašeg ormara.', 'success');
        
    } catch (error) {
        console.error('Greška:', error);
        showMessage('Došlo je do greške prilikom uklanjanja artikla iz vašeg ormara.', 'error');
    }
}

// Funkcija za dodavanje/uklanjanje iz korpe
async function toggleCart(id) {
    const button = document.querySelector(`.cart-btn[data-id="${id}"]`);
    if (!button) return;
    
    const isInCart = button.classList.contains('active');
    
    try {
        // Dohvaćanje tokena iz localStorage-a
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`/api/cart/${id}`, {
            method: isInCart ? 'DELETE' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
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
        const item = userFavorites.find(item => (item._id === id || item.id === id));
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
    
    return categories[categoryCode] || categoryCode || 'Ostalo';
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
    
    return statuses[statusCode] || statusCode || 'Na čekanju';
}

// Inicijalizacija tabova
function initializeTabs() {
    const profileTabs = document.querySelectorAll('.profile-tab');
    const profileSections = document.querySelectorAll('.profile-section');
    
    // Promijeni naziv taba za favorite u "Moj ormar"
    const favoritesTab = document.querySelector('.profile-tab[data-tab="favorites"]');
    if (favoritesTab) {
        favoritesTab.textContent = "Moj ormar";
    }
    
    // Promijeni naslov sekcije za favorite
    const favoritesTitle = document.querySelector('#favorites-section h2');
    if (favoritesTitle) {
        favoritesTitle.textContent = "Moj ormar";
    }
    
    // Provjera ima li hash u URL-u (npr. #favorites)
    const hash = window.location.hash.substring(1);
    if (hash && ['listings', 'favorites', 'orders'].includes(hash)) {
        activeTab = hash;
