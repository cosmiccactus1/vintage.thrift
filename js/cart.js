/**
 * Vintage Thrift Store - Cart JavaScript
 * Za rad s API-jem umjesto lokalnih podataka
 */

// Globalne varijable
let cartItems = [];

// Dohvatanje artikala iz korpe s API-ja
async function fetchCartItems() {
    try {
        const response = await fetch('/api/cart');
        if (!response.ok) {
            throw new Error('Greška prilikom dohvatanja artikala iz korpe');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Greška:', error);
        return [];
    }
}

// Prikaz artikala u korpi
function renderCartItems(items) {
    const container = document.getElementById('cart-container');
    
    if (!container) return;
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-bag"></i>
                <p>Vaša korpa je prazna</p>
                <a href="index.html" class="button">Pregledaj artikle</a>
            </div>
        `;
        
        // Sakrij sažetak korpe
        const cartSummary = document.getElementById('cart-summary');
        if (cartSummary) {
            cartSummary.style.display = 'none';
        }
        
        return;
    }
    
    let html = '';
    
    items.forEach(item => {
        html += `
            <div class="cart-item" data-id="${item._id}">
                <div class="cart-item-image">
                    <a href="product.html?id=${item._id}">
                        <img src="${item.images && item.images.length > 0 ? item.images[0] : 'images/placeholder.jpg'}" alt="${item.title}">
                    </a>
                </div>
                <div class="cart-item-details">
                    <h3 class="cart-item-title">
                        <a href="product.html?id=${item._id}">${item.title}</a>
                    </h3>
                    <div class="cart-item-meta">
                        <span class="cart-item-size">Veličina: ${item.size}</span>
                        <span class="cart-item-category">Kategorija: ${getCategoryName(item.category)}</span>
                    </div>
                </div>
                <div class="cart-item-price">${parseFloat(item.price).toFixed(2)} KM</div>
                <div class="cart-item-actions">
                    <button class="remove-from-cart" data-id="${item._id}">
                        <i class="fas fa-trash-alt"></i> Ukloni
                    </button>
                    <button class="move-to-favorites" data-id="${item._id}">
                        <i class="far fa-heart"></i> Prebaci u favorite
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Dodavanje event listenera za dugmad nakon renderovanja
    addCartItemListeners();
    
    // Prikaz sažetka korpe
    renderCartSummary(items);
}

// Prikaz sažetka korpe (ukupna cijena i gumb za nastavak)
function renderCartSummary(items) {
    const container = document.getElementById('cart-summary');
    
    if (!container) return;
    
    // Izračunavanje ukupne cijene
    const totalPrice = items.reduce((sum, item) => sum + parseFloat(item.price), 0);
    
    container.innerHTML = `
        <div class="summary-section">
            <div class="summary-row">
                <span class="summary-label">Ukupno proizvoda:</span>
                <span class="summary-value">${items.length}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Dostava:</span>
                <span class="summary-value">Besplatna</span>
            </div>
            <div class="summary-row total">
                <span class="summary-label">Ukupno:</span>
                <span class="summary-value">${totalPrice.toFixed(2)} KM</span>
            </div>
        </div>
        <div class="summary-actions">
            <button id="checkout-btn" class="checkout-button">
                Nastavi na checkout
            </button>
            <a href="index.html" class="continue-shopping">
                Nastavi s kupovinom
            </a>
        </div>
    `;
    
    // Event listener za gumb za checkout
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', proceedToCheckout);
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

// Dodavanje event listenera za dugmad na artiklima u korpi
function addCartItemListeners() {
    // Event listeneri za dugmad za uklanjanje iz korpe
    document.querySelectorAll('.remove-from-cart').forEach(button => {
        button.addEventListener('click', removeFromCart);
    });
    
    // Event listeneri za dugmad za prebacivanje u favorite
    document.querySelectorAll('.move-to-favorites').forEach(button => {
        button.addEventListener('click', moveToFavorites);
    });
}

// Funkcija za uklanjanje artikla iz korpe
async function removeFromCart() {
    const id = this.getAttribute('data-id');
    
    try {
        // API poziv za uklanjanje artikla iz korpe
        const response = await fetch(`/api/cart/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Greška prilikom uklanjanja artikla iz korpe');
        }
        
        // Ažuriranje lokalnih podataka
        cartItems = cartItems.filter(item => item._id !== id);
        
        // Ažuriranje prikaza
        renderCartItems(cartItems);
        
        // Prikaži poruku o uspjehu
        showMessage('Artikal je uklonjen iz korpe', 'success');
        
    } catch (error) {
        console.error('Greška:', error);
        showMessage('Došlo je do greške prilikom uklanjanja artikla iz korpe', 'error');
    }
}

// Funkcija za prebacivanje artikla u favorite
async function moveToFavorites() {
    const id = this.getAttribute('data-id');
    
    try {
        // API poziv za dodavanje artikla u favorite
        const addFavoriteResponse = await fetch(`/api/favorites/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!addFavoriteResponse.ok) {
            throw new Error('Greška prilikom dodavanja artikla u favorite');
        }
        
        // API poziv za uklanjanje artikla iz korpe
        const removeCartResponse = await fetch(`/api/cart/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!removeCartResponse.ok) {
            throw new Error('Greška prilikom uklanjanja artikla iz korpe');
        }
        
        // Ažuriranje lokalnih podataka
        cartItems = cartItems.filter(item => item._id !== id);
        
        // Ažuriranje prikaza
        renderCartItems(cartItems);
        
        // Prikaži poruku o uspjehu
        showMessage('Artikal je prebačen u favorite', 'success');
        
    } catch (error) {
        console.error('Greška:', error);
        showMessage('Došlo je do greške prilikom prebacivanja artikla u favorite', 'error');
    }
}

// Funkcija za nastavak na checkout
function proceedToCheckout() {
    // Provjera je li korisnik prijavljen
    const prijavljeniKorisnik = localStorage.getItem('prijavljeniKorisnik');
    
    if (!prijavljeniKorisnik) {
        // Ako korisnik nije prijavljen, preusmjeri na register.html
        showMessage('Morate se prijaviti prije nastavka kupovine', 'info');
        
        // Spremi trenutnu putanju za preusmjeravanje nakon prijave
        localStorage.setItem('redirectAfterLogin', 'cart.html');
        
        // Preusmjeri na prijavu
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    // Ako je korisnik prijavljen, nastavi na checkout
    window.location.href = 'checkout.html';
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
    // Dohvatanje artikala u korpi
    cartItems = await fetchCartItems();
    
    // Prikaz artikala u korpi
    renderCartItems(cartItems);
});
