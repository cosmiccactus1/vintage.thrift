/**
 * Vintage Thrift Store - Favorites JavaScript
 * Za rad s API-jem umjesto lokalnih podataka
 */

// Globalne varijable
let favoriteItems = [];

// Dohvatanje omiljenih artikala s API-ja
async function fetchFavoriteItems() {
    try {
        const response = await fetch('/api/favorites');
        if (!response.ok) {
            throw new Error('Greška prilikom dohvatanja omiljenih artikala');
        }
        
        const data = await response.json();
        return data;
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
    
    let html = '';
    
    items.forEach(item => {
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
        // API poziv za uklanjanje artikla iz omiljenih
        const response = await fetch(`/api/favorites/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
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
        // API poziv za dodavanje/uklanjanje artikla iz korpe
        const response = await fetch(`/api/cart/${id}`, {
            method: isInCart ? 'DELETE' : 'POST',
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
