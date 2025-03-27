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
    
    // Provjera favorita i košarice za prijavljenog korisnika
    await checkFavoritesAndCart();
    
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

// Funkcija za provjeru artikala koji su u favoritima i korpi
async function checkFavoritesAndCart() {
  try {
    // Dohvati token i provjeri prijavu korisnika
    let token = null;
    try {
      const prijavljeniKorisnik = localStorage.getItem('prijavljeniKorisnik');
      if (prijavljeniKorisnik) {
        try {
          // Pokušaj parsirati kao JSON
          const parsed = JSON.parse(prijavljeniKorisnik);
          token = parsed.token;
        } catch (e) {
          // Ako nije JSON, koristi direktno
          if (typeof prijavljeniKorisnik === 'string' && prijavljeniKorisnik.trim() !== '') {
            token = prijavljeniKorisnik;
          }
        }
      }
    } catch (error) {
      console.error('Greška pri dohvaćanju iz localStorage-a:', error);
    }
    
    if (!token) return; // Ako korisnik nije prijavljen, preskoči provjeru
    
    // Za svaki artikal provjerimo je li u favoritima
    for (const artikal of artikli) {
      try {
        // Provjera favorita
        const favResponse = await fetch(`/api/favorites/check/${artikal._id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (favResponse.ok) {
          const favData = await favResponse.json();
          artikal.favorite = favData.isFavorite;
        }
        
        // Provjera korpe
        const cartResponse = await fetch(`/api/cart/check/${artikal._id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (cartResponse.ok) {
          const cartData = await cartResponse.json();
          artikal.inCart = cartData.inCart;
        }
      } catch (itemError) {
        console.warn('Greška pri provjeri artikla:', artikal._id, itemError);
      }
    }
    
    // Ažuriramo filtrirane artikle
    filteredArtikli = [...artikli];
  } catch (error) {
    console.error('Greška pri provjeri favorita i korpe:', error);
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

// Dodavanje event listenera za dugmad na karticama proizvoda
function addProductButtonListeners() {
  // Event listeneri za dugmad za omiljene
  document.querySelectorAll('.favorite-btn').forEach(button => {
    button.addEventListener('click', async function(e) {
      e.preventDefault();
      const id = this.getAttribute('data-id');
      const isActive = this.classList.contains('active');
      
      try {
        // Dohvati token i provjeri prijavu korisnika
        let token = null;
        
        try {
          const prijavljeniKorisnik = localStorage.getItem('prijavljeniKorisnik');
          if (prijavljeniKorisnik) {
            try {
              // Pokušaj parsirati kao JSON
              const parsed = JSON.parse(prijavljeniKorisnik);
              token = parsed.token;
            } catch (e) {
              // Ako nije JSON, koristi direktno
              if (typeof prijavljeniKorisnik === 'string' && prijavljeniKorisnik.trim() !== '') {
                token = prijavljeniKorisnik;
              }
            }
          }
        } catch (error) {
          console.error('Greška pri dohvaćanju iz localStorage-a:', error);
        }
        
        // Ako korisnik nije prijavljen
        if (!token) {
          alert('Morate biti prijavljeni da biste dodali artikal u favorite.');
          return;
        }
        
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
      
      try {
        // Dohvati token i provjeri prijavu korisnika
        let token = null;
        
        try {
          const prijavljeniKorisnik = localStorage.getItem('prijavljeniKorisnik');
          if (prijavljeniKorisnik) {
            try {
              // Pokušaj parsirati kao JSON
              const parsed = JSON.parse(prijavljeniKorisnik);
              token = parsed.token;
            } catch (e) {
              // Ako nije JSON, koristi direktno
              if (typeof prijavljeniKorisnik === 'string' && prijavljeniKorisnik.trim() !== '') {
                token = prijavljeniKorisnik;
              }
            }
          }
        } catch (error) {
          console.error('Greška pri dohvaćanju iz localStorage-a:', error);
        }
        
        // Ako korisnik nije prijavljen
        if (!token) {
          alert('Morate biti prijavljeni da biste dodali artikal u korpu.');
          return;
        }
        
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
  // Poboljšana provjera za prijavljenog korisnika
  let prijavljenKorisnik = false;
  try {
    const storedUser = localStorage.getItem('prijavljeniKorisnik');
    if (storedUser) {
      prijavljenKorisnik = true;
    }
  } catch (error) {
    console.error('Greška pri čitanju iz localStorage:', error);
  }
  
  const sellButton = document.getElementById('sellButton');
  const profileLink = document.getElementById('profileLink');
  
  if (prijavljenKorisnik) {
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
