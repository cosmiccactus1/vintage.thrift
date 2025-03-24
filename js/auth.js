// js/auth.js
async function loginUser(email, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Greška prilikom prijave');
        }
        
        // Spremi token i ID korisnika u localStorage
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userId', data.user.id || data.user._id);
        
        // Spremi i korisničke podatke za profile.js
        localStorage.setItem('prijavljeniKorisnik', JSON.stringify({
            id: data.user.id || data.user._id,
            username: data.user.username,
            email: data.user.email,
            avatar: data.user.avatar_url
        }));
        
        return data;
    } catch (error) {
        console.error('Greška prilikom prijave:', error);
        throw error;
    }
}

async function registerUser(userData) {
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Greška prilikom registracije');
        }
        
        // Spremi token i ID korisnika u localStorage
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userId', data.user.id || data.user._id);
        
        // Spremi i korisničke podatke za profile.js
        localStorage.setItem('prijavljeniKorisnik', JSON.stringify({
            id: data.user.id || data.user._id,
            username: data.user.username,
            email: data.user.email,
            avatar: data.user.avatar_url
        }));
        
        return data;
    } catch (error) {
        console.error('Greška prilikom registracije:', error);
        throw error;
    }
}
