/**
 * Vintage Thrift Store - Favorites JavaScript
 * Za rad s API-jem umjesto lokalnih podataka
 */

// Globalne varijable
let favoriteItems = [];

// Dohvatanje omiljenih artikala s API-ja
async function fetchFavoriteItems() {
    try {
        // Dohvaćanje tokena iz localStorage-a
        const token = localStorage.getItem('authToken');
        
        // Prvo dohvati ID-ove favorita
        const response = await fetch('/api/favorites', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Greška prilikom dohvatanja omiljenih artikala');
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
                    'Authorization': `Bearer ${token}`
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
                        'Authorization': `Bearer ${token}`
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

// Prikaz omiljenih artikala
function renderFavoriteItems(items) {
    const container = document.getElementById('favorites-container');
    
    if (!container) return;
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-favorites">
                <i class="far fa-heart"></i>
                <p>Nemate nijedan artikal među favoritima</p>
                <a href="index.html" class="button">Pregledaj artikle</a>
            </div>
        `;
        return;
    }
    
    console.log('Prikazujem favorite:', items);
    
    let html = '';
    
    items.forEach(item => {
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
            title: item.title,
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
                            alt="${item.title || 'Artikal'}"
                            onerror="this.onerror=null; if(this.src !== 'images/placeholder.jpg') this.src='images/placeholder.jpg';"
                        >
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
    
    // Dodavanje event listenera za dugmad nakon renderovanja
    addFavoriteItemListeners();
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

// Dodavanje event listenera za dugmad na artiklima
function addFavoriteItemListeners() {
    // Event listeneri za dugmad za omiljene
    document.querySelectorAll('.favorite-btn').forEach(button => {
        button.addEventListener('click', removeFromFavorites);
    });
    
    // Event listeneri za dugmad za korpu
    document.querySelectorAll('.cart-btn').forEach(button => {
        button.addEventListener('click', toggleCart);
    });
}

// Funkcija za uklanjanje artikla iz omiljenih
async function removeFromFavorites() {
    const id = this.getAttribute('data-id');
    
    try {
        // Dohvaćanje tokena iz localStorage-a
        const token = localStorage.getItem('authToken');
        
        // API poziv za uklanjanje artikla iz omiljenih
        const response = await fetch(`/api/favorites/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Greška prilikom uklanjanja artikla iz omiljenih');
        }
        
        // Ažuriranje lokalnih podataka
        favoriteItems = favoriteItems.filter(item => item._id !== id);
        
        // Ažuriranje prikaza
        renderFavoriteItems(favoriteItems);
        
        // Prikaži poruku o uspjehu
        showMessage('Artikal je uklonjen iz omiljenih', 'success');
        
    } catch (error) {
        console.error('Greška:', error);
        showMessage('Došlo je do greške prilikom uklanjanja artikla iz omiljenih', 'error');
    }
}

// Funkcija za dodavanje/uklanjanje artikla iz korpe
async function toggleCart() {
    const id = this.getAttribute('data-id');
    const isInCart = this.classList.contains('active');
    
    try {
        // Dohvaćanje tokena iz localStorage-a
        const token = localStorage.getItem('authToken');
        
        // API poziv za dodavanje/uklanjanje artikla iz korpe
        const response = await fetch(`/api/cart/${id}`, {
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
        this.classList.toggle('active');
        const icon = this.querySelector('i');
        if (isInCart) {
            icon.classList.replace('fas', 'far');
            showMessage('Artikal je uklonjen iz korpe', 'success');
        } else {
            icon.classList.replace('far', 'fas');
            showMessage('Artikal je dodan u korpu', 'success');
        }
        
        // Ažuriranje lokalnih podataka
        const item = favoriteItems.find(item => item._id === id);
        if (item) {
            item.inCart = !isInCart;
        }
        
    } catch (error) {
        console.error('Greška:', error);
        showMessage('Došlo je do greške prilikom ažuriranja korpe', 'error');
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
    // Dohvatanje omiljenih artikala
    favoriteItems = await fetchFavoriteItems();
    
    // Prikaz omiljenih artikala
    renderFavoriteItems(favoriteItems);
});
