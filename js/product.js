/**
 * Vintage Thrift Store - Product Detail JavaScript
 * Za rad s API-jem umjesto lokalnih podataka
 */

// Dodana zaštita za slučaj da dođe do prekida u učitavanju
(function() {
    // Dodajemo pop-up kontejner za bundle
    const bundlePopupContainer = document.createElement('div');
    bundlePopupContainer.id = 'bundle-popup-container';
    bundlePopupContainer.className = 'bundle-popup-hidden';
    bundlePopupContainer.innerHTML = `
        <div id="bundle-popup" class="bundle-popup">
            <div class="bundle-popup-header">
                <h2>Kreiraj Bundle</h2>
                <span id="bundle-popup-close" class="bundle-popup-close">&times;</span>
            </div>
            <div class="bundle-popup-content">
                <p>Odaberi artikle koje želiš dodati u bundle da uštediš na dostavi.</p>
                <div id="bundle-items-container" class="bundle-items-container">
                    <div class="loading">Učitavanje artikala...</div>
                </div>
            </div>
            <div class="bundle-popup-footer">
                <span id="selected-items-count">0 artikala odabrano</span>
                <button id="add-to-cart-bundle" class="add-to-cart-bundle-btn" disabled>Dodaj u korpu</button>
            </div>
        </div>
    `;
    document.body.appendChild(bundlePopupContainer);

    // Provjera jesmo li na pravoj stranici
    if (!document.getElementById('product-detail')) {
        console.log("Nismo na stranici proizvoda, preskačemo izvršavanje koda.");
        return;
    }

    // Globalne varijable
    let productId = null;
    let currentProduct = null;
    let selectedBundleItems = [];
    
    // Dohvatanje ID-a proizvoda iz URL-a
    function getProductIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    // Dohvatanje proizvoda s API-ja
    async function fetchProduct(id) {
        try {
            const url = `/api/articles/${id}`;
            console.log("Fetching product from URL:", url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                console.error(`Error response: ${response.status} ${response.statusText}`);
                throw new Error('Greška prilikom dohvatanja proizvoda');
            }
            
            const data = await response.json();
            console.log("API response:", data);
            
            // Ako API vraća niz, uzmemo prvi element (ili element koji odgovara ID-u)
            if (Array.isArray(data) && data.length > 0) {
                // Pokušaj pronaći artikal s odgovarajućim ID-em
                const product = data.find(item => (item._id === id || item.id === id));
                // Ako ne nađemo odgovarajući artikal, uzmi prvi
                return product || data[0];
            }
            
            return data;
        } catch (error) {
            console.error('Greška:', error);
            
            // Detaljnije logovanje tipa greške
            if (error instanceof TypeError) {
                console.error("Mrežna greška:", error.message);
            }
            
            return null;
        }
    }

    // Dohvaćanje informacija o korisniku
    async function fetchUserInfo(userId) {
        if (!userId) return null;
        
        try {
            const token = localStorage.getItem('authToken');
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
            
            // Dodaj token samo ako postoji
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`/api/users/${userId}`, { headers });
            
            // Obradi 401 specifično
            if (response.status === 401) {
                console.log('Korisnik nije prijavljen, preskačemo dohvat detalja');
                return null;
            }
            
            if (!response.ok) {
                console.error(`Greška ${response.status} pri dohvatu korisnika`);
                return null;
            }
            
            return await response.json();
        } catch (error) {
            console.error('Greška:', error);
            return null;
        }
    }

    // Provjera je li korisnik prijavljen
    function isUserLoggedIn() {
        const authToken = localStorage.getItem('authToken');
        const prijavljeniKorisnik = localStorage.getItem('prijavljeniKorisnik');
        return !!(authToken || prijavljeniKorisnik);
    }

    // Dobivanje auth tokena
    function getAuthToken() {
        try {
            const user = JSON.parse(localStorage.getItem('prijavljeniKorisnik') || '{}');
            return user.token || localStorage.getItem('authToken') || '';
        } catch (e) {
            return localStorage.getItem('authToken') || '';
        }
    }

    // Helper funkcija za pripremu headers-a sa autorizacijom
    function getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        };
    }

    // Provjera statusa favorita za proizvod
    async function fetchFavoriteStatus(id) {
        try {
            const response = await fetch(`/api/favorites/check/${id}`);
            if (!response.ok) {
                // Samo vrati false ako API nije implementiran
                return false;
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
                // Samo vrati false ako API nije implementiran
                return false;
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
        
        // Provjera postoji li placeholder slika, koristimo online placeholder
        const onlinePlaceholder = 'https://via.placeholder.com/400x300?text=No+Image';
        
        // Priprema HTML-a za galeriju slika
        let imagesHTML = '';
        if (product.images && product.images.length > 0) {
            imagesHTML = `
                <div class="product-main-image">
                    <img src="${product.images[0]}" alt="${product.title}" id="mainImage"
                         onerror="this.onerror=null; this.src='${onlinePlaceholder}';">
                </div>
                ${product.images.length > 1 ? `
                <div class="product-thumbnails">
                    ${product.images.map((img, index) => `
                        <div class="thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
                            <img src="${img}" alt="${product.title} - slika ${index + 1}"
                                 onerror="this.onerror=null; this.src='${onlinePlaceholder}';">
                        </div>
                    `).join('')}
                </div>` : ''}
            `;
        } else {
            imagesHTML = `
                <div class="product-main-image">
                    <img src="${onlinePlaceholder}" alt="${product.title}" id="mainImage">
                </div>
            `;
        }
        
        // Dobivanje naziva kategorije
        const categoryName = getCategoryName(product.category);
        
        // Formatiranje datuma
        let formattedDate = "Nije dostupno";
        if (product.created_at || product.createdAt || product.updated_at || product.updatedAt) {
            const dateCreated = new Date(product.created_at || product.createdAt || product.updated_at || product.updatedAt);
            formattedDate = `${dateCreated.getDate()}.${dateCreated.getMonth() + 1}.${dateCreated.getFullYear()}.`;
        }
        
        // Provjera je li trenutni korisnik vlasnik artikla
        const currentUserId = localStorage.getItem('userId');
        const isCurrentUserSeller = currentUserId === product.user_id;
        const sellerName = isCurrentUserSeller ? 'Vi (Vaš artikal)' : (product.sellerName || 'Korisnik');
        
        // HTML za bundle sekciju
        const bundleHtml = `
        <div class="bundle-section">
            <div class="bundle-header">
                <h2>Uštedi na dostavi!</h2>
                <button id="create-bundle-btn" class="create-bundle-btn">Kreiraj bundle</button>
            </div>
            <p>Pogledaj još artikala od ovog korisnika. Možda ti se još nešto svidi.</p>
            <div id="user-items-preview" class="user-items-preview">
                <div class="loading-items">Učitavanje artikala...</div>
            </div>
        </div>
        `;
        
        // HTML za prodavača
        const sellerHtml = `
        <div class="seller-info">
            <h2>Prodavač</h2>
            <div class="seller-profile">
                <div class="seller-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="seller-details">
                    <div class="seller-name">
                        <span id="seller-name-link">${sellerName}</span>
                    </div>
                    <div class="seller-location">${product.location || 'Nije navedeno'}</div>
                    <div class="seller-products">
                        <a href="index.html?seller=${product.user_id}" class="seller-products-link">
                            Pogledajte sve artikle ovog prodavača
                        </a>
                    </div>
                </div>
            </div>
        </div>
        `;
        
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
                    <button class="cart-btn" id="cartBtn">
                        <i class="fas fa-shopping-bag"></i>
                        <span>Kupi odmah</span>
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
                        <span class="metadata-value">
                            <a href="index.html?brand=${encodeURIComponent(product.brand)}">${product.brand}</a>
                        </span>
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
                
                ${sellerHtml}
                ${bundleHtml}
            </div>
        `;
        
        // Dodavanje event listenera za thumbnailove (ako postoje)
        if (product.images && product.images.length > 1) {
            document.querySelectorAll('.thumbnail').forEach(thumb => {
                thumb.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    const mainImage = document.getElementById('mainImage');
                    mainImage.src = product.images[index];
                    mainImage.onerror = function() {
                        this.onerror = null;
                        this.src = onlinePlaceholder;
                    };
                    
                    // Ažuriranje aktivnog thumbnaila
                    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                });
            });
        }
        
        // Event listener za dugme za favorite
        const favoriteBtn = document.getElementById('favoriteBtn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', async function() {
                try {
                    await toggleFavorite();
                } catch (e) {
                    console.error("Error toggling favorite:", e);
                    alert("Ova funkcionalnost trenutno nije dostupna.");
                }
            });
        }
        
        // Event listener za dugme za korpu
        const cartBtn = document.getElementById('cartBtn');
        if (cartBtn) {
            cartBtn.addEventListener('click', async function() {
                try {
                    await toggleCart();
                } catch (e) {
                    console.error("Error toggling cart:", e);
                    alert("Ova funkcionalnost trenutno nije dostupna.");
                }
            });
        }
        
        // Event listener za dugme za kreiranje bundla
        const createBundleBtn = document.getElementById('create-bundle-btn');
        if (createBundleBtn) {
            createBundleBtn.addEventListener('click', function() {
                openBundlePopup(product.user_id);
            });
        }
        
        // Asinkrono dohvati podatke o korisniku za ažuriranje imena prodavača
        if (product.user_id && !isCurrentUserSeller) {
            console.log("Dohvaćam informacije za korisnika s ID:", product.user_id);
            fetchUserInfo(product.user_id).then(userData => {
                console.log("Dohvaćeni podaci korisnika:", userData);
                if (userData) {
                    const sellerNameLink = document.getElementById('seller-name-link');
                    if (sellerNameLink) {
                        sellerNameLink.textContent = userData.username || userData.name || userData.displayName || 'Korisnik';
                    }
                } else {
                    console.log("Nije moguće dohvatiti podatke o korisniku");
                }
            });
        }
    }
    
    // Funkcija za otvaranje bundle pop-upa
    function openBundlePopup(userId) {
        if (!isUserLoggedIn()) {
            alert('Morate biti prijavljeni da biste kreirali bundle.');
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
            return;
        }
        
        // Resetiranje odabranih artikala
        selectedBundleItems = [];
        
        // Otvaranje pop-upa
        const bundlePopupContainer = document.getElementById('bundle-popup-container');
        bundlePopupContainer.classList.remove('bundle-popup-hidden');
        bundlePopupContainer.classList.add('bundle-popup-visible');
        
        // Postavljanje event listenera za zatvaranje
        const closeBtn = document.getElementById('bundle-popup-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeBundlePopup);
        }
        
        // Event listener za klik izvan pop-upa
        bundlePopupContainer.addEventListener('click', function(e) {
            if (e.target === bundlePopupContainer) {
                closeBundlePopup();
            }
        });
        
        // Učitavanje svih artikala korisnika
        loadBundleItems(userId);
        
        // Dodavanje event listenera za dugme "Dodaj u korpu"
        const addToCartBundleBtn = document.getElementById('add-to-cart-bundle');
        if (addToCartBundleBtn) {
            addToCartBundleBtn.addEventListener('click', addBundleToCart);
        }
        
        // Prikazivanje trenutnog proizvoda kao već odabranog
        if (currentProduct) {
            selectedBundleItems.push(currentProduct);
            updateSelectedItemsCount();
        }
    }
    
    // Funkcija za zatvaranje bundle pop-upa
    function closeBundlePopup() {
        const bundlePopupContainer = document.getElementById('bundle-popup-container');
        bundlePopupContainer.classList.remove('bundle-popup-visible');
        bundlePopupContainer.classList.add('bundle-popup-hidden');
        
        // Resetiranje liste odabranih artikala
        selectedBundleItems = [];
    }
    
    // Funkcija za učitavanje artikala za bundle
    async function loadBundleItems(userId) {
        try {
            // Dohvaćanje artikala korisnika
            const sellerItems = await fetchSellerItems(userId);
            
            // Container za artikle
            const bundleItemsContainer = document.getElementById('bundle-items-container');
            if (!bundleItemsContainer) return;
            
            if (sellerItems.length === 0) {
                bundleItemsContainer.innerHTML = '<p>Ovaj korisnik nema drugih artikala.</p>';
                return;
            }
            
            // Prikazivanje svih artikala
            let html = '<div class="bundle-items-grid">';
            
            sellerItems.forEach(item => {
                // Provjera je li artikal trenutni proizvod
                const isCurrentItem = item._id === productId || item.id === productId;
                
                html += `
                    <div class="bundle-item ${isCurrentItem ? 'selected' : ''}" data-id="${item._id || item.id}">
                        <div class="bundle-item-image">
                            <img src="${item.images && item.images.length > 0 ? item.images[0] : 'images/placeholder.jpg'}" 
                                 alt="${item.title}">
                        </div>
                        <div class="bundle-item-info">
                            <h3>${item.title}</h3>
                            <p class="bundle-item-price">${parseFloat(item.price).toFixed(2)} KM</p>
                        </div>
                        <div class="bundle-item-checkbox">
                            <input type="checkbox" ${isCurrentItem ? 'checked disabled' : ''} 
                                   class="bundle-checkbox" id="bundle-item-${item._id || item.id}">
                            <label for="bundle-item-${item._id || item.id}">
                                <span class="checkbox-custom"></span>
                            </label>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            
            bundleItemsContainer.innerHTML = html;
            
            // Dodavanje event listenera za checkboxove
            document.querySelectorAll('.bundle-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    const itemId = this.closest('.bundle-item').getAttribute('data-id');
                    const item = sellerItems.find(item => (item._id === itemId || item.id === itemId));
                    
                    if (this.checked) {
                        // Dodaj artikal u odabrane
                        selectedBundleItems.push(item);
                        this.closest('.bundle-item').classList.add('selected');
                    } else {
                        // Ukloni artikal iz odabranih
                        selectedBundleItems = selectedBundleItems.filter(i => (i._id !== itemId && i.id !== itemId));
                        this.closest('.bundle-item').classList.remove('selected');
                    }
                    
                    updateSelectedItemsCount();
                });
            });
            
        } catch (error) {
            console.error('Greška pri učitavanju artikala za bundle:', error);
        }
    }
    
    // Funkcija za ažuriranje broja odabranih artikala
    function updateSelectedItemsCount() {
        const countElement = document.getElementById('selected-items-count');
        const addToCartBtn = document.getElementById('add-to-cart-bundle');
        
        if (countElement) {
            const count = selectedBundleItems.length;
            countElement.textContent = `${count} artikala odabrano`;
            
            // Omogući ili onemogući dugme za dodavanje u korpu
            if (addToCartBtn) {
                addToCartBtn.disabled = count < 1;
            }
        }
    }
    
    // Funkcija za dodavanje bundle-a u korpu
    async function addBundleToCart() {
        if (selectedBundleItems.length === 0) {
            alert('Molimo odaberite barem jedan artikal za bundle.');
            return;
        }
        
        try {
            // Provjera je li korisnik prijavljen
            if (!isUserLoggedIn()) {
                alert('Morate biti prijavljeni da biste dodali artikle u korpu.');
                localStorage.setItem('redirectAfterLogin', window.location.href);
                window.location.href = 'login.html';
                return;
            }
            
            // Dodavanje svih odabranih artikala u korpu
            const promises = selectedBundleItems.map(async (item) => {
                try {
                    const response = await fetch('/api/cart', {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({
                            articleId: item._id || item.id,
                            quantity: 1
                        })
                    });
                    
                    if (!response.ok) {
                        if (response.status === 401) {
                            throw new Error('Niste prijavljeni. Molimo prijavite se.');
                        } else {
                            throw new Error('Greška prilikom dodavanja artikla u korpu.');
                        }
                    }
                    
                    return await response.json();
                } catch (error) {
                    console.error(`Greška pri dodavanju artikla ${item._id || item.id} u korpu:`, error);
                    throw error;
                }
            });
            
            // Čekaj završetak svih API poziva
            await Promise.all(promises);
            
            // Zatvori pop-up
            closeBundlePopup();
            
            // Prikaži poruku o uspjehu
            alert('Bundle je uspješno dodan u korpu!');
            
            // Preusmjeri korisnika na korpu
            window.location.href = 'cart.html';
            
        } catch (error) {
            console.error('Greška prilikom dodavanja bundle-a u korpu:', error);
            alert('Došlo je do greške prilikom dodavanja artikala u korpu. Molimo pokušajte ponovo.');
        }
    }
    
    // Dobijanje naziva kategorije na osnovu koda
    function getCategoryName(categoryCode) {
        const categories = {
            'musko': 'Muško',
            'zensko': 'Žensko',
            'unisex': 'Unisex',
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
        
        return seasons[seasonCode] || seasonCode || 'Nije navedeno';
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
        
        return conditions[conditionCode] || conditionCode || 'Nije navedeno';
    }

    // Funkcija za dodavanje/uklanjanje proizvoda iz favorita
    async function toggleFavorite() {
        if (!currentProduct) return;
        
        // Provjera je li korisnik prijavljen
        if (!isUserLoggedIn()) {
            alert('Morate biti prijavljeni da biste dodali artikal u favorite.');
            localStorage.setItem('redirectAfterLogin', window.location.href);
            window.location.href = 'login.html';
            return;
        }
        
        const favoriteBtn = document.getElementById('favoriteBtn');
        if (!favoriteBtn) return;
        
        const isFavorite = favoriteBtn.classList.contains('active');
        
        try {
            // Poziv API-ja za dodavanje/uklanjanje iz favorita
            const response = await fetch(`/api/favorites/${currentProduct._id || currentProduct.id}`, {
                method: isFavorite ? 'DELETE' : 'POST',
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    alert('Niste prijavljeni. Molimo prijavite se.');
                    localStorage.setItem('redirectAfterLogin', window.location.href);
                    window.location.href = 'login.html';
                    return;
                }
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
            
            alert(isFavorite ? 'Artikal je uklonjen iz favorita.' : 'Artikal je dodan u favorite.');
            
        } catch (error) {
            console.error('Greška:', error);
            alert('Došlo je do greške prilikom ažuriranja favorita.');
        }
    }

// Funkcija za kupovinu proizvoda
async function toggleCart() {
    if (!currentProduct) return;
    
    // Provjera je li korisnik prijavljen
    if (!isUserLoggedIn()) {
        alert('Morate biti prijavljeni da biste kupili artikal.');
        localStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = 'login.html';
        return;
    }
    
    try {
        // Opcija 1: Direktna kupovina - dodaj u korpu i preusmjeri na checkout
        const response = await fetch('/api/cart', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                articleId: currentProduct._id || currentProduct.id,
                quantity: 1
            })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                alert('Niste prijavljeni. Molimo prijavite se.');
                localStorage.setItem('redirectAfterLogin', window.location.href);
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Greška prilikom dodavanja artikla u korpu');
        }
        
        // Spremi trenutni proizvod u localStorage za korištenje na checkout stranici (za svaki slučaj)
        localStorage.setItem('checkoutItem', JSON.stringify(currentProduct));
        
        // Prikaži poruku o uspjehu
        alert('Artikal je dodan u korpu! Preusmjeravamo vas na checkout.');
        
        // Preusmjeri korisnika na checkout
        window.location.href = 'cart.html?checkout=direct';
        
    } catch (error) {
        console.error('Greška:', error);
        alert('Došlo je do greške. Molimo pokušajte ponovo.');
    }
}

// Funkcija za dohvaćanje artikala korisnika
async function fetchSellerItems(userId) {
    try {
        if (!userId) return [];
        
        console.log("Dohvaćam artikle prodavača:", userId);
        
        const response = await fetch(`/api/articles/user/${userId}`);
        if (!response.ok) {
            console.error(`Error ${response.status} pri dohvatu artikala korisnika`);
            return [];
        }
        
        const data = await response.json();
        console.log("Artikli prodavača:", data);
        
        // Filtriraj da ne uključi trenutni artikal
        return Array.isArray(data) 
            ? data.filter(item => (item._id !== productId && item.id !== productId))
            : [];
    } catch (error) {
        console.error('Greška pri dohvaćanju artikala korisnika:', error);
        return [];
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
    
    // Učitavanje artikala istog prodavača za bundle sekciju
    if (product.user_id) {
        fetchSellerItems(product.user_id).then(sellerItems => {
            const container = document.getElementById('user-items-preview');
            if (!container) return;
            
            if (sellerItems.length === 0) {
                container.innerHTML = '<p>Ovaj korisnik nema drugih artikala.</p>';
                return;
            }
            
            // Prikaži maksimalno 4 artikla
            const itemsToShow = sellerItems.slice(0, 4);
            let html = '<div class="related-items-grid">';
            
            itemsToShow.forEach(item => {
                html += `
                    <div class="related-item">
                        <a href="product.html?id=${item._id || item.id}">
                            <div class="related-item-image">
                                <img src="${item.images && item.images.length > 0 ? item.images[0] : 'images/placeholder.jpg'}" 
                                     alt="${item.title}">
                            </div>
                            <div class="related-item-info">
                                <h3>${item.title}</h3>
                                <p class="related-item-price">${parseFloat(item.price).toFixed(2)} KM</p>
                            </div>
                        </a>
                    </div>
                `;
            });
            
            html += '</div>';
            
            if (sellerItems.length > 4) {
                html += `
                    <div class="view-all-items">
                        <a href="index.html?seller=${product.user_id}" class="view-all-button">
                            Pogledaj sve artikle
                        </a>
                    </div>
                `;
            }
            
            container.innerHTML = html;
        });
    }
    
    // Postavljanje naslova stranice
    document.title = `${product.title} - Vintage Thrift Store`;
    
    // Dodavanje event listenera za zatvaranje bundle popup-a
    const closeBtn = document.getElementById('bundle-popup-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeBundlePopup);
    }
    
    // Event listener za klik izvan bundle popup-a
    const bundlePopupContainer = document.getElementById('bundle-popup-container');
    if (bundlePopupContainer) {
        bundlePopupContainer.addEventListener('click', function(e) {
            if (e.target === this) {
                closeBundlePopup();
            }
        });
    }
});

// Dodaj CSS za bundle popup na kraju fajla
const styleElement = document.createElement('style');
styleElement.textContent = `
    /* Bundle sekcija */
    .bundle-section {
        margin-top: 30px;
        padding: 20px;
        background-color: #f9f9f9;
        border-radius: 5px;
    }
    
    .bundle-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }
    
    .bundle-header h2 {
        margin: 0;
        color: #333;
    }
    
    .create-bundle-btn {
        display: inline-block;
        padding: 8px 16px;
        background-color: #4CAF50;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        border: none;
        font-weight: bold;
        cursor: pointer;
        transition: background-color 0.3s;
    }
    
    .create-bundle-btn:hover {
        background-color: #45a049;
    }
    
    .related-items-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 20px;
        margin-top: 20px;
    }
    
    .related-item {
        border: 1px solid #eee;
        border-radius: 5px;
        overflow: hidden;
        transition: transform 0.3s ease;
        background-color: white;
    }
    
    .related-item:hover {
        transform: translateY(-5px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    
    .related-item a {
        text-decoration: none;
        color: inherit;
    }
    
    .related-item-image {
        height: 200px;
        overflow: hidden;
    }
    
    .related-item-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .related-item-info {
        padding: 10px;
    }
    
    .related-item-info h3 {
        margin: 0 0 5px 0;
        font-size: 14px;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .related-item-price {
        margin: 0;
        font-weight: bold;
        color: #4CAF50;
    }
    
    .view-all-items {
        margin-top: 20px;
        text-align: center;
    }
    
    .view-all-button {
        display: inline-block;
        padding: 8px 16px;
        background-color: #4CAF50;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        transition: background-color 0.3s;
    }
    
    .view-all-button:hover {
        background-color: #45a049;
    }
    
    /* Bundle popup stilovi */
    .bundle-popup-hidden {
        display: none;
    }
    
    .bundle-popup-visible {
        display: flex;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    
    .bundle-popup {
        background-color: white;
        width: 90%;
        max-width: 800px;
        max-height: 80vh;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
    
    .bundle-popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        background-color: #f9f9f9;
        border-bottom: 1px solid #eee;
    }
    
    .bundle-popup-header h2 {
        margin: 0;
        font-size: 1.5rem;
    }
    
    .bundle-popup-close {
        font-size: 1.5rem;
        cursor: pointer;
        user-select: none;
    }
    
    .bundle-popup-content {
        padding: 20px;
        overflow-y: auto;
        flex-grow: 1;
    }
    
    .bundle-popup-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        background-color: #f9f9f9;
        border-top: 1px solid #eee;
    }
    
    .add-to-cart-bundle-btn {
        padding: 8px 16px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        transition: background-color 0.3s;
    }
    
    .add-to-cart-bundle-btn:hover:not(:disabled) {
        background-color: #45a049;
    }
    
    .add-to-cart-bundle-btn:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
    
    .bundle-items-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 15px;
    }
    
    .bundle-item {
        border: 1px solid #eee;
        border-radius: 5px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        position: relative;
        transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .bundle-item.selected {
        border-color: #4CAF50;
        box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
    }
    
    .bundle-item-image {
        height: 150px;
        overflow: hidden;
        margin-bottom: 10px;
    }
    
    .bundle-item-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .bundle-item-info {
        flex-grow: 1;
    }
    
    .bundle-item-info h3 {
        margin: 0 0 5px 0;
        font-size: 14px;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .bundle-item-price {
        font-weight: bold;
        color: #4CAF50;
        margin: 0;
    }
    
    .bundle-item-checkbox {
        position: absolute;
        top: 10px;
        right: 10px;
    }
    
    .bundle-checkbox {
        position: absolute;
        opacity: 0;
        cursor: pointer;
    }
    
    .checkbox-custom {
        display: inline-block;
        width: 20px;
        height: 20px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        position: relative;
    }
    
    .bundle-checkbox:checked + label .checkbox-custom::after {
        content: '✓';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #4CAF50;
        font-weight: bold;
    }
    
    .bundle-checkbox:disabled + label .checkbox-custom {
        background-color: #f9f9f9;
    }
    
    @media (max-width: 768px) {
        .bundle-popup {
            width: 95%;
            max-height: 90vh;
        }
        
        .bundle-items-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        }
        
        .bundle-item-image {
            height: 120px;
        }
    }
`;
document.head.appendChild(styleElement);

})(); // Kraj IIFE (Immediately Invoked Function Expression)
