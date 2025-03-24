/**
 * Vintage Thrift Store - Product Detail JavaScript
 * Za rad s API-jem umjesto lokalnih podataka
 */

// Globalne varijable
let productId = null;
let currentProduct = null;

// Dohvatanje ID-a proizvoda iz URL-a
function getProductIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Dohvatanje proizvoda s API-ja
async function fetchProduct(id) {
    try {
        const response = await fetch(`/api/articles/${id}`);
        if (!response.ok) {
            throw new Error('Greška prilikom dohvatanja proizvoda');
        }
        
        const data = await response.json();
        console.log("API response:", data); // Debugging
        return data;
    } catch (error) {
        console.error('Greška:', error);
        return null;
    }
}

// Provjera statusa favorita za proizvod
async function fetchFavoriteStatus(id) {
    try {
        const response = await fetch(`/api/favorites/check/${id}`);
        if (!response.ok) {
            // Ako API nije implementiran, pretpostavljamo da proizvod nije favorit
            if (response.status === 404) {
                return false;
            }
            throw new Error('Greška prilikom provjere statusa favorita');
        }
        
        const data = await response.json();
        return data.isFavorite;
    } catch (error) {
        console.error('Greška pri dohvaćanju statusa favorita:', error);
        return false;
    }
}

// Provjera statusa korpe za proizvod
async function fetchCartStatus(id) {
    try {
        const response = await fetch(`/api/cart/check/${id}`);
        if (!response.ok) {
            // Ako API nije implementiran, pretpostavljamo da proizvod nije u korpi
            if (response.status === 404) {
                return false;
            }
            throw new Error('Greška prilikom provjere statusa korpe');
        }
        
        const data = await response.json();
        return data.isInCart;
    } catch (error) {
        console.error('Greška pri dohvaćanju statusa korpe:', error);
        return false;
    }
}

// Prikaz proizvoda na stranici
function renderProduct(product, isFavorite, isInCart) {
    const container = document.getElementById('product-detail');
    
    if (!container) return;
    
    if (!product) {
        container.innerHTML = `
            <div class="error-message">
                <p>Proizvod nije pronađen ili je došlo do greške prilikom učitavanja. <a href="index.html">Vratite se na početnu stranicu</a>.</p>
            </div>
        `;
        return;
    }
    
    console.log("Rendering product:", product); // Debugging
    
    // Parsiranje slika ako su u JSON formatu
    if (product.images && typeof product.images === 'string') {
        try {
            product.images = JSON.parse(product.images);
            console.log("Parsed images:", product.images);
        } catch (e) {
            console.error("Error parsing images:", e);
            product.images = [];
        }
    }
    
    // Osigurajmo da je images niz
    if (!Array.isArray(product.images)) {
        product.images = product.images ? [product.images] : [];
    }
    
    // Formatiranje cijene
    const formattedPrice = parseFloat(product.price).toFixed(2);
    
    // Priprema HTML-a za galeriju slika
    let imagesHTML = '';
    if (product.images && product.images.length > 0) {
        imagesHTML = `
            <div class="product-main-image">
                <img src="${product.images[0]}" alt="${product.title}" id="mainImage">
            </div>
            ${product.images.length > 1 ? `
            <div class="product-thumbnails">
                ${product.images.map((img, index) => `
                    <div class="thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
                        <img src="${img}" alt="${product.title} - slika ${index + 1}">
                    </div>
                `).join('')}
            </div>` : ''}
        `;
    } else {
        imagesHTML = `
            <div class="product-main-image">
                <img src="images/placeholder.jpg" alt="${product.title}" id="mainImage">
            </div>
        `;
    }
    
    // Dobivanje naziva kategorije
    const categoryName = getCategoryName(product.category);
    
    // Formatiranje datuma
    let formattedDate = "Nije dostupno";
    if (product.created_at || product.createdAt) {
        const dateCreated = new Date(product.created_at || product.createdAt);
        formattedDate = `${dateCreated.getDate()}.${dateCreated.getMonth() + 1}.${dateCreated.getFullYear()}.`;
    }
    
    // Generiranje HTML-a za prikaz proizvoda
    container.innerHTML = `
        <div class="product-gallery">
            ${imagesHTML}
        </div>
        <div class="product-info">
            <h1 class="product-title">${product.title}</h1>
            <div class="product-price">${formattedPrice} KM</div>
            
            <div class="product-actions">
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" id="favoriteBtn">
                    <i class="fa${isFavorite ? 's' : 'r'} fa-heart"></i>
                    <span>${isFavorite ? 'Ukloni iz favorita' : 'Dodaj u favorite'}</span>
                </button>
                <button class="cart-btn ${isInCart ? 'active' : ''}" id="cartBtn">
                    <i class="fa${isInCart ? 's' : 'r'} fa-shopping-bag"></i>
                    <span>${isInCart ? 'Ukloni iz korpe' : 'Dodaj u korpu'}</span>
                </button>
            </div>
            
            <div class="product-metadata">
                <div class="metadata-item">
                    <span class="metadata-label">Kategorija:</span>
                    <span class="metadata-value">${categoryName}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Veličina:</span>
                    <span class="metadata-value">${product.size || 'Nije navedeno'}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Sezona:</span>
                    <span class="metadata-value">${getSeasonName(product.season) || 'Nije navedeno'}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Stanje:</span>
                    <span class="metadata-value">${getConditionName(product.condition) || 'Nije navedeno'}</span>
                </div>
                ${product.brand ? `
                <div class="metadata-item">
                    <span class="metadata-label">Brend:</span>
                    <span class="metadata-value">${product.brand}</span>
                </div>` : ''}
                ${product.color ? `
                <div class="metadata-item">
                    <span class="metadata-label">Boja:</span>
                    <span class="metadata-value">${product.color}</span>
                </div>` : ''}
                ${product.location ? `
                <div class="metadata-item">
                    <span class="metadata-label">Lokacija:</span>
                    <span class="metadata-value">${product.location}</span>
                </div>` : ''}
                <div class="metadata-item">
                    <span class="metadata-label">Objavljeno:</span>
                    <span class="metadata-value">${formattedDate}</span>
                </div>
            </div>
            
            <div class="product-description">
                <h2>Opis</h2>
                <div class="description-content">
                    ${product.description || 'Nema opisa za ovaj proizvod.'}
                </div>
            </div>
            
            <div class="seller-info">
                <h2>Prodavač</h2>
                <div class="seller-profile">
                    <div class="seller-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="seller-details">
                        <div class="seller-name">${product.sellerName || 'Korisnik'}</div>
                        <div class="seller-location">${product.location || 'Nije navedeno'}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Dodavanje event listenera za thumbnailove (ako postoje)
    if (product.images && product.images.length > 1) {
        document.querySelectorAll('.thumbnail').forEach(thumb => {
            thumb.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                document.getElementById('mainImage').src = product.images[index];
                
                // Ažuriranje aktivnog thumbnaila
                document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }
    
    // Event listener za dugme za favorite
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', toggleFavorite);
    }
    
    // Event listener za dugme za korpu
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
        cartBtn.addEventListener('click', toggleCart);
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
    
    return categories[categoryCode] || categoryCode || 'Nije navedeno';
}

// Dobijanje naziva sezone na osnovu koda
function getSeasonName(seasonCode) {
    const seasons = {
        'proljece': 'Proljeće',
        'ljeto': 'Ljeto',
        'jesen': 'Jesen',
        'zima': 'Zima',
        'sve': 'Sva godišnja doba'
    };
    
    return seasons[seasonCode] || seasonCode;
}

// Dobijanje naziva stanja na osnovu koda
function getConditionName(conditionCode) {
    const conditions = {
        'novo': 'Novo sa etiketom',
        'kao-novo': 'Kao novo',
        'veoma-dobro': 'Veoma dobro',
        'dobro': 'Dobro',
        'prihvatljivo': 'Prihvatljivo'
    };
    
    return conditions[conditionCode] || conditionCode;
}

// Funkcija za dodavanje/uklanjanje proizvoda iz favorita
async function toggleFavorite() {
    if (!currentProduct) return;
    
    const favoriteBtn = document.getElementById('favoriteBtn');
    const isFavorite = favoriteBtn.classList.contains('active');
    
    try {
        // Poziv API-ja za dodavanje/uklanjanje iz favorita
        const response = await fetch(`/api/favorites/${currentProduct._id || currentProduct.id}`, {
            method: isFavorite ? 'DELETE' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Greška prilikom ažuriranja favorita');
        }
        
        // Ažuriranje UI-a
        favoriteBtn.classList.toggle('active');
        const icon = favoriteBtn.querySelector('i');
        const text = favoriteBtn.querySelector('span');
        
        if (isFavorite) {
            icon.classList.replace('fas', 'far');
            text.textContent = 'Dodaj u favorite';
        } else {
            icon.classList.replace('far', 'fas');
            text.textContent = 'Ukloni iz favorita';
        }
        
    } catch (error) {
        console.error('Greška:', error);
        alert('Došlo je do greške prilikom ažuriranja favorita.');
    }
}

// Funkcija za dodavanje/uklanjanje proizvoda iz korpe
async function toggleCart() {
    if (!currentProduct) return;
    
    const cartBtn = document.getElementById('cartBtn');
    const isInCart = cartBtn.classList.contains('active');
    
    try {
        // Poziv API-ja za dodavanje/uklanjanje iz korpe
        const response = await fetch(`/api/cart/${currentProduct._id || currentProduct.id}`, {
            method: isInCart ? 'DELETE' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Greška prilikom ažuriranja korpe');
        }
        
        // Ažuriranje UI-a
        cartBtn.classList.toggle('active');
        const icon = cartBtn.querySelector('i');
        const text = cartBtn.querySelector('span');
        
        if (isInCart) {
            icon.classList.replace('fas', 'far');
            text.textContent = 'Dodaj u korpu';
        } else {
            icon.classList.replace('far', 'fas');
            text.textContent = 'Ukloni iz korpe';
        }
        
    } catch (error) {
        console.error('Greška:', error);
        alert('Došlo je do greške prilikom ažuriranja korpe.');
    }
}

// Inicijalizacija stranice
document.addEventListener('DOMContentLoaded', async function() {
    // Dohvatanje ID-a proizvoda iz URL-a
    productId = getProductIdFromUrl();
    
    console.log("Product ID from URL:", productId); // Debugging
    
    if (!productId) {
        // Ako nema ID-a, prikaži poruku o grešci
        document.getElementById('product-detail').innerHTML = `
            <div class="error-message">
                <p>Proizvod nije pronađen. <a href="index.html">Vratite se na početnu stranicu</a>.</p>
            </div>
        `;
        return;
    }
    
    // Dohvatanje proizvoda
    const product = await fetchProduct(productId);
    
    if (!product) {
        document.getElementById('product-detail').innerHTML = `
            <div class="error-message">
                <p>Proizvod nije pronađen ili server nije dostupan. <a href="index.html">Vratite se na početnu stranicu</a>.</p>
            </div>
        `;
        return;
    }
    
    // Spremanje proizvoda u globalnu varijablu
    currentProduct = product;
    
    // Dohvatanje statusa favorita i korpe
    let isFavorite = false;
    let isInCart = false;
    
    try {
        isFavorite = await fetchFavoriteStatus(productId);
        isInCart = await fetchCartStatus(productId);
    } catch (e) {
        console.error("Error fetching status:", e);
        // Nastavi bez statusa ako dohvat nije uspio
    }
    
    // Prikaz proizvoda
    renderProduct(product, isFavorite, isInCart);
    
    // Postavljanje naslova stranice
    document.title = `${product.title} - Vintage Thrift Store`;
});
