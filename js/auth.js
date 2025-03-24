/**
 * Vintage Thrift Store - Authentication JavaScript
 * Za rad s API-jem umjesto lokalnih podataka
 */

/**
 * Funkcija za prijavu korisnika
 * @param {string} email - Email korisnika
 * @param {string} password - Šifra korisnika
 * @returns {Promise<Object>} - Podaci o korisniku
 */
async function loginUser(email, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Greška prilikom prijave');
        }
        
        const userData = await response.json();
        
        // Spremi podatke o korisniku u localStorage
        localStorage.setItem('prijavljeniKorisnik', JSON.stringify(userData.user));
        
        // Spremi token (ako API vraća token)
        if (userData.token) {
            localStorage.setItem('authToken', userData.token);
        }
        
        return userData.user;
    } catch (error) {
        throw error;
    }
}

/**
 * Funkcija za registraciju korisnika
 * @param {Object} userData - Podaci za registraciju
 * @returns {Promise<Object>} - Podaci o registriranom korisniku
 */
async function registerUser(userData) {
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Greška prilikom registracije');
        }
        
        const responseData = await response.json();
        
        // Spremi podatke o korisniku u localStorage
        localStorage.setItem('prijavljeniKorisnik', JSON.stringify(responseData.user));
        
        // Spremi token (ako API vraća token)
        if (responseData.token) {
            localStorage.setItem('authToken', responseData.token);
        }
        
        return responseData.user;
    } catch (error) {
        throw error;
    }
}

/**
 * Funkcija za odjavu korisnika
 */
function logoutUser() {
    // Ukloni podatke o korisniku iz localStorage
    localStorage.removeItem('prijavljeniKorisnik');
    localStorage.removeItem('authToken');
    
    // Opciono: API poziv za serversku odjavu
    fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
    }).catch(error => {
        console.error('Greška prilikom odjave na serveru:', error);
    });
}

/**
 * Funkcija za provjeru je li korisnik prijavljen
 * @returns {Object|null} - Podaci o korisniku ili null ako korisnik nije prijavljen
 */
function getCurrentUser() {
    const userData = localStorage.getItem('prijavljeniKorisnik');
    
    if (!userData) {
        return null;
    }
    
    try {
        return JSON.parse(userData);
    } catch (error) {
        console.error('Greška prilikom parsiranja podataka korisnika:', error);
        return null;
    }
}

/**
 * Funkcija za provjeru valjanosti tokena
 * @returns {Promise<boolean>} - True ako je token valjan, false ako nije
 */
async function validateToken() {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        return false;
    }
    
    try {
        const response = await fetch('/api/auth/validate-token', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        return response.ok;
    } catch (error) {
        console.error('Greška prilikom validacije tokena:', error);
        return false;
    }
}

/**
 * Funkcija za promjenu šifre korisnika
 * @param {string} currentPassword - Trenutna šifra
 * @param {string} newPassword - Nova šifra
 * @returns {Promise<boolean>} - True ako je promjena uspješna, false ako nije
 */
async function changePassword(currentPassword, newPassword) {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        throw new Error('Korisnik nije prijavljen');
    }
    
    try {
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Greška prilikom promjene šifre');
        }
        
        return true;
    } catch (error) {
        throw error;
    }
}

/**
 * Funkcija za ažuriranje podataka korisnika
 * @param {Object} userData - Novi podaci korisnika
 * @returns {Promise<Object>} - Ažurirani podaci korisnika
 */
async function updateUserProfile(userData) {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        throw new Error('Korisnik nije prijavljen');
    }
    
    try {
        const response = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Greška prilikom ažuriranja profila');
        }
        
        const updatedUser = await response.json();
        
        // Ažuriraj podatke u localStorage
        localStorage.setItem('prijavljeniKorisnik', JSON.stringify(updatedUser));
        
        return updatedUser;
    } catch (error) {
        throw error;
    }
}

/**
 * Funkcija za slanje zahtjeva za resetiranje šifre
 * @param {string} email - Email korisnika
 * @returns {Promise<boolean>} - True ako je zahtjev uspješno poslan
 */
async function requestPasswordReset(email) {
    try {
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Greška prilikom slanja zahtjeva za resetiranje šifre');
        }
        
        return true;
    } catch (error) {
        throw error;
    }
}

/**
 * Funkcija za resetiranje šifre
 * @param {string} token - Token za resetiranje šifre
 * @param {string} password - Nova šifra
 * @returns {Promise<boolean>} - True ako je resetiranje uspješno
 */
async function resetPassword(token, password) {
    try {
        const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token, password })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Greška prilikom resetiranja šifre');
        }
        
        return true;
    } catch (error) {
        throw error;
    }
}

// Inicijalna provjera autentikacije prilikom učitavanja stranice
document.addEventListener('DOMContentLoaded', async function() {
    // Provjera je li korisnik prijavljen i ima li valjan token
    const user = getCurrentUser();
    const isTokenValid = user ? await validateToken() : false;
    
    if (user && !isTokenValid) {
        // Ako token nije valjan, odjavi korisnika
        logoutUser();
        
        // Ako smo na stranici koja zahtijeva prijavu, preusmjeri na login
        const protectedPages = ['profile.html', 'sell.html', 'checkout.html'];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (protectedPages.includes(currentPage)) {
            window.location.href = 'login.html';
        }
    }
    
    // Ažuriranje UI-a na osnovu statusa prijave
    updateAuthUI(!!user);
});

/**
 * Funkcija za ažuriranje UI-a na osnovu statusa prijave
 * @param {boolean} isLoggedIn - True ako je korisnik prijavljen, false ako nije
 */
function updateAuthUI(isLoggedIn) {
    // Ova funkcija se može prilagoditi prema potrebama specifične stranice
    const sellButton = document.getElementById('sellButton');
    const profileLink = document.getElementById('profileLink');
    
    if (sellButton) {
        sellButton.href = isLoggedIn ? 'sell.html' : 'register.html';
    }
    
    if (profileLink) {
        profileLink.style.display = isLoggedIn ? 'block' : 'none';
    }
    
    // Dodatne UI prilagodbe na specifičnim stranicama
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'login.html' || currentPage === 'register.html') {
        if (isLoggedIn) {
            // Ako je korisnik već prijavljen, preusmjeri na početnu
            window.location.href = 'index.html';
        }
    }
}
