/**
 * Vintage Thrift Store - Main JavaScript
 */

// Globalne varijable
let artikli = [];
let filteredArtikli = [];

// Funkcija za čitanje URL parametara
function getUrlParams() {
  const params = {};
  const searchParams = new URLSearchParams(window.location.search);
  for (const [key, value] of searchParams) {
    params[key] = value;
  }
  return params;
}

// Funkcija za dodavanje/ažuriranje URL parametra
function updateUrlParam(key, value) {
  const url = new URL(window.location);
  if (value === 'sve') {
    url.searchParams.delete(key);
  } else {
    url.searchParams.set(key, value);
  }
  
  // Ažuriranje URL-a bez osvježavanja stranice
  window.history.pushState({}, '', url);
}

// Dohvatanje artikala s API-ja
async function fetchArtikli() {
  try {
    // Dohvati URL parametre za filtriranje
    const params = getUrlParams();
    console.log('URL parametri za filtriranje:', params);
    
    // Kreiraj URL s query parametrima
    let url = '/api/articles';
    let isHomepage = false;
    
    // Provjera jesmo li na početnoj stranici
    const path = window.location.pathname;
    if (path === '/' || path === '/index.html' || path === '') {
      isHomepage = true;
    }
    
    // Ako postoji seller parametar, koristimo API endpoint za artikle korisnika
    if (params.seller) {
      url = `/api/articles/user/${params.seller}`;
      console.log('Fetching seller articles from URL:', url);
    } else if (isHomepage && Object.keys(params).length === 0) {
      // Na početnoj stranici bez filtera dohvaćamo najnovije artikle (max 30)
      url = '/api/articles?limit=30';
      console.log('Fetching newest 30 articles for homepage');
    } else {
      // Inače, koristimo standardni endpoint s query parametrima
      if (Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params);
        url += '?' + searchParams.toString();
      }
    }
    
    console.log('Fetching articles from URL:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Greška prilikom dohvatanja artikala');
    }
    
    const data = await response.json();
    console.log('Dohvaćeni artikli:', data);
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

// Funkcija za sortiranje artikala
function sortArtikli(artikli, sortBy) {
  return [...artikli].sort((a, b) => {
    if (sortBy === 'price-asc') {
      return a.price - b.price;
    } else if (sortBy === 'price-desc') {
      return b.price - a.price;
    } else if (sortBy === 'newest') {
      return new Date(b.created_at) - new Date(a.created_at);
    }
    return 0;
  });
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
            <span class="product-size">${artikal.size || ''}</span>
            <span class="product-category">${getCategoryName(artikal.category)}</span>
            ${artikal.subtype ? `<span class="product-subtype">${getCategoryName(artikal.subtype)}</span>` : ''}
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
  
  return categories[categoryCode] || categoryCode;
}

// Funkcija za prikaz pop-up prozora za prijavu/registraciju
function showLoginPopup(action) {
  // Provjeri postoji li već pop-up
  let popup = document.getElementById('login-popup');
  
  if (!popup) {
    // Kreiraj pop-up element
    popup = document.createElement('div');
    popup.id = 'login-popup';
    popup.className = 'login-popup';
    
    // Postavi sadržaj pop-up-a
    popup.innerHTML = `
      <div class="popup-content">
        <span class="close-popup">&times;</span>
        <h2>${action === 'favorite' ? 'Dodavanje u favorite' : 'Dodavanje u korpu'}</h2>
        <p>Za ovu akciju potrebno je da budete prijavljeni.</p>
        <div class="popup-buttons">
          <button id="popup-login-btn" class="popup-btn primary-btn">Prijava</button>
          <button id="popup-register-btn" class="popup-btn secondary-btn">Registracija</button>
        </div>
      </div>
    `;
    
    // Dodaj pop-up u body
    document.body.appendChild(popup);
    
    // Dodaj CSS za pop-up ako već ne postoji
    if (!document.getElementById('popup-styles')) {
      const style = document.createElement('style');
      style.id = 'popup-styles';
      style.textContent = `
        .login-popup {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .popup-content {
          background-color: white;
          padding: 30px;
          border-radius: 8px;
          max-width: 400px;
          width: 90%;
          position: relative;
          box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }
        .close-popup {
          position: absolute;
          top: 10px;
          right: 15px;
          font-size: 24px;
          cursor: pointer;
          color: #777;
        }
        .close-popup:hover {
          color: #333;
        }
        .popup-buttons {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
        }
        .popup-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        .primary-btn {
          background-color: #4CAF50;
          color: white;
        }
        .secondary-btn {
          background-color: #f1f1f1;
          color: #333;
        }
        .popup-btn:hover {
          opacity: 0.9;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Dodaj event listenere za dugmad
    document.querySelector('.close-popup').addEventListener('click', () => {
      popup.remove();
    });
    
    document.getElementById('popup-login-btn').addEventListener('click', () => {
      // Redirekcija na stranicu za prijavu
      window.location.href = 'register.html#login';
    });
    
    document.getElementById('popup-register-btn').addEventListener('click', () => {
      // Redirekcija na stranicu za registraciju
      window.location.href = 'register.html';
    });
    
    // Zatvaranje klikom izvan pop-up-a
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        popup.remove();
      }
    });
  }
}

// Funkcija za provjeru prijavljenog korisnika
function isUserLoggedIn() {
  try {
    const storedUser = localStorage.getItem('prijavljeniKorisnik');
    if (!storedUser) return false;
    
    // Pokušaj parsirati kao JSON
    try {
      const jsonUser = JSON.parse(storedUser);
      // Provjeri postoji li token
      if (jsonUser && jsonUser.token) {
        console.log('Korisnik prijavljen s JSON tokenom');
        return jsonUser.token;
      }
    } catch (parseError) {
      // Ako nije JSON, možda je samo string token
      if (typeof storedUser === 'string' && storedUser.trim() !== '') {
        console.log('Korisnik prijavljen sa string tokenom');
        return storedUser;
      }
    }
  } catch (error) {
    console.error('Greška pri provjeri prijavljenog korisnika:', error);
  }
  
  return false;
}

// Dodavanje event listenera za dugmad na karticama proizvoda
function addProductButtonListeners() {
  // Event listeneri za dugmad za omiljene
  document.querySelectorAll('.favorite-btn').forEach(button => {
    button.addEventListener('click', async function(e) {
      e.preventDefault();
      const id = this.getAttribute('data-id');
      const isActive = this.classList.contains('active');
      
      // Provjeri je li korisnik prijavljen
      const token = isUserLoggedIn();
      
      // Ako korisnik nije prijavljen, prikaži popup
      if (!token) {
        showLoginPopup('favorite');
        return;
      }
      
      try {
        // Poziv API-ja za dodavanje/uklanjanje iz omiljenih
        const response = await fetch(`/api/favorites/${id}`, {
          method: isActive ? 'DELETE' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
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
      
      // Provjeri je li korisnik prijavljen
      const token = isUserLoggedIn();
      
      // Ako korisnik nije prijavljen, prikaži popup
      if (!token) {
        showLoginPopup('cart');
        return;
      }
      
      try {
        // Poziv API-ja za dodavanje/uklanjanje iz korpe
        const response = await fetch(`/api/cart/${id}`, {
          method: isActive ? 'DELETE' : 'POST',
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

// Inicijalizacija filtera
function initFilters() {
  // Postavi aktivne filtere na osnovu URL parametara
  const params = getUrlParams();
  
  if (params.category) {
    document.querySelectorAll('.filter-option[data-type]').forEach(option => {
      option.classList.toggle('active', option.getAttribute('data-type') === params.category);
    });
  }
  
  if (params.season) {
    document.querySelectorAll('.filter-option[data-season]').forEach(option => {
      option.classList.toggle('active', option.getAttribute('data-season') === params.season);
    });
  }
  
  if (params.subtype) {
    document.querySelectorAll('.filter-option[data-subtype]').forEach(option => {
      option.classList.toggle('active', option.getAttribute('data-subtype') === params.subtype);
    });
  }
  
  // Event listeneri za opcije filtriranja
  document.querySelectorAll('.filter-option').forEach(option => {
    option.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Određivanje vrste filtera (type, season ili subtype)
      let dataType, filterType, filterValue;
      
      if (this.hasAttribute('data-type')) {
        dataType = 'type';
        filterType = 'category';
        filterValue = this.getAttribute('data-type');
      } else if (this.hasAttribute('data-season')) {
        dataType = 'season';
        filterType = 'season';
        filterValue = this.getAttribute('data-season');
      } else if (this.hasAttribute('data-subtype')) {
        dataType = 'subtype';
        filterType = 'subtype';
        filterValue = this.getAttribute('data-subtype');
      }
      
      console.log(`Filter kliknut: ${filterType} = ${filterValue}`);
      
      // Ažuriranje URL parametra
      updateUrlParam(filterType, filterValue);
      
      // Postavljanje aktivne klase na odabranu opciju
      document.querySelectorAll(`.filter-option[data-${dataType}]`).forEach(opt => {
        opt.classList.remove('active');
      });
      this.classList.add('active');
      
      // Ponovno dohvaćanje artikala s novim filterima
      fetchArtikli();
      
      // Zatvaranje dropdown menija nakon odabira
      const menuDropdown = document.getElementById('menuDropdown');
      const hamburgerIcon = document.getElementById('hamburgerIcon');
      
      if (menuDropdown && hamburgerIcon) {
        menuDropdown.classList.remove('show');
        hamburgerIcon.classList.remove('active');
      }
    });
  });
}

// Provjera prijavljenog korisnika
function checkLoggedInUser() {
  const isPrijavljen = !!isUserLoggedIn();
  console.log('Provjera prijavljenog korisnika:', isPrijavljen ? 'Prijavljen' : 'Nije prijavljen');
  
  const sellButton = document.getElementById('sellButton');
  const profileLink = document.getElementById('profileLink');
  
  if (isPrijavljen) {
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
}

// Hamburger menu funkcionalnost
function initHamburgerMenu() {
  const hamburgerIcon = document.getElementById('hamburgerIcon');
  const menuDropdown = document.getElementById('menuDropdown');
  
  if (hamburgerIcon && menuDropdown) {
    hamburgerIcon.addEventListener('click', function(e) {
      e.preventDefault();
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

// Inicijalizacija stranice
document.addEventListener('DOMContentLoaded', function() {
  // Inicijalizacija hamburger menija
  initHamburgerMenu();
  
  // Inicijalizacija filtera
  initFilters();
  
  // Provjera prijavljenog korisnika
  checkLoggedInUser();
  
  // Dohvatanje artikala prilikom učitavanja stranice
  fetchArtikli();
});
