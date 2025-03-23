// Vercel serverless funkcija za upravljanje korisničkim profilima
const { createClient } = require('@supabase/supabase-js');

// Konfiguracija Supabase klijenta
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper funkcija za verifikaciju JWT tokena
async function verifyToken(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verifikacija tokena putem Supabase Auth API
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }
    
    return user.id;
  } catch (error) {
    console.error('Greška prilikom verifikacije tokena:', error);
    return null;
  }
}

// Helper za izvlačenje userId iz zahtjeva
function extractUserId(req) {
  // Log za debugiranje - možete ukloniti nakon što sve radi
  console.log('Request URL:', req.url);
  console.log('Request query:', req.query);
  
  // Načini na koje možemo dobiti userId:
  // 1. Iz query parametra: /api/users?id=123
  if (req.query && req.query.id) {
    return req.query.id;
  }
  
  // 2. Iz putanje: /api/users/123 ili samo /123
  const urlParts = req.url.split('/').filter(Boolean);
  if (urlParts.length > 0) {
    return urlParts[0];
  }
  
  return null;
}

module.exports = async (req, res) => {
  // Podešavanje CORS headera
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Provjera autentikacije
    const authUserId = await verifyToken(req);
    
    if (!authUserId) {
      res.status(401).json({ message: 'Nije autorizovano' });
      return;
    }
    
    // GET zahtjevi za dohvaćanje korisnika
    if (req.method === 'GET') {
      const userId = extractUserId(req);
      
      if (!userId) {
        res.status(400).json({ message: 'Nedostaje ID korisnika' });
        return;
      }
      
      // Provjera je li korisnik traži svoje podatke ili tuđe
      if (userId !== authUserId && userId !== 'me') {
        // Ovdje možeš dodati provjeru je li korisnik admin
        // Za sad, dozvoljavamo samo dohvaćanje vlastitih podataka
        res.status(403).json({ message: 'Nemate dozvolu za pristup ovim podacima' });
        return;
      }
      
      // Ako je 'me', koristi ID prijavljenog korisnika
      const idToFetch = userId === 'me' ? authUserId : userId;
      
      // Dohvati podatke o korisniku
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', idToFetch)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // Record not found error
          res.status(404).json({ message: 'Korisnik nije pronađen' });
        } else {
          throw error;
        }
        return;
      }
      
      // Transformiraj podatke za frontend
      const responseData = {
        ...userData,
        _id: userData.id // Za kompatibilnost
      };
      
      // Ukloni osjetljive podatke
      delete responseData.password;
      
      res.status(200).json(responseData);
      return;
    }
    
    // PUT /api/users/:id - Ažuriranje podataka o korisniku
    if (req.method === 'PUT') {
      const userId = extractUserId(req);
      
      if (!userId) {
        res.status(400).json({ message: 'Nedostaje ID korisnika' });
        return;
      }
      
      // Provjera je li korisnik ažurira svoje podatke
      if (userId !== authUserId && userId !== 'me') {
        res.status(403).json({ message: 'Nemate dozvolu za izmjenu ovih podataka' });
        return;
      }
      
      // Ako je 'me', koristi ID prijavljenog korisnika
      const idToUpdate = userId === 'me' ? authUserId : userId;
      
      // Parsiranje JSON body-a
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const data = Buffer.concat(buffers).toString();
      const userData = data ? JSON.parse(data) : {};
      
      // Ne dozvoljavamo ažuriranje ID-a i emaila
      delete userData.id;
      delete userData.email;
      // Ne dozvoljavamo direktno ažuriranje lozinke ovim putem
      delete userData.password;
      
      // Ažuriranje korisnika
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', idToUpdate)
        .select();
      
      if (error) throw error;
      
      if (!updatedUser || updatedUser.length === 0) {
        res.status(404).json({ message: 'Korisnik nije pronađen' });
        return;
      }
      
      // Transformiraj podatke za frontend
      const responseData = {
        ...updatedUser[0],
        _id: updatedUser[0].id // Za kompatibilnost
      };
      
      // Ukloni osjetljive podatke
      delete responseData.password;
      
      res.status(200).json(responseData);
      return;
    }
    
    // Ako nijedna ruta ne odgovara
    res.status(404).json({ message: 'Ruta nije pronađena' });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Interna serverska greška', error: error.message });
  }
};
