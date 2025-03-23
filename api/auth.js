// Vercel serverless funkcija za autentikaciju putem Supabase
const { createClient } = require('@supabase/supabase-js');

// Konfiguracija Supabase klijenta
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper funkcija za parsiranje JSON body-a
async function parseBody(req) {
  const buffers = [];
  for await (const chunk of req) {
    buffers.push(chunk);
  }
  const data = Buffer.concat(buffers).toString();
  return data ? JSON.parse(data) : {};
}

module.exports = async (req, res) => {
  // Podešavanje CORS headera
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // POST /api/auth/register - Registracija korisnika
 if (req.method === 'POST' && req.url === '/register') {
      const body = await parseBody(req);
      
      // Validacija inputa
      if (!body.username || !body.email || !body.password) {
        res.status(400).json({ message: 'Sva polja su obavezna' });
        return;
      }
      
      // Provjera postojanja korisnika u users tablici
      const { data: existingUsers, error: queryError } = await supabase
        .from('users')
        .select('*')
        .or(`username.eq.${body.username},email.eq.${body.email}`)
        .limit(1);
      
      if (queryError) throw queryError;
      
      if (existingUsers && existingUsers.length > 0) {
        if (existingUsers[0].username === body.username) {
          res.status(400).json({ message: 'Korisničko ime je već zauzeto' });
        } else {
          res.status(400).json({ message: 'Email adresa je već u upotrebi' });
        }
        return;
      }
      
      // Kreiranje korisnika putem Auth API-ja
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true // Automatski potvrdi email
      });
      
      if (authError) throw authError;
      
      // Kreiranje korisnika u users tablici
      const newUser = {
        id: authData.user.id,
        username: body.username,
        email: body.email,
        avatar_url: body.avatar_url || null
      };
      
      const { error: insertError } = await supabase
        .from('users')
        .insert([newUser]);
      
      if (insertError) throw insertError;
      
      // Kreiranje JWT tokena za prijavu
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSession({
        user_id: authData.user.id
      });
      
      if (sessionError) throw sessionError;
      
      // Transformacija za frontend
      res.status(201).json({
        message: 'Registracija uspješna',
        user: {
          ...newUser,
          _id: newUser.id // Za kompatibilnost
        },
        token: sessionData.session.access_token
      });
      return;
    }
    
    // POST /api/auth/login - Prijava korisnika
    if (req.method === 'POST' && req.url === '/api/auth/login') {
      const body = await parseBody(req);
      
      // Validacija inputa
      if (!body.email || !body.password) {
        res.status(400).json({ message: 'Sva polja su obavezna' });
        return;
      }
      
      // Prijava putem Auth API-ja
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password
      });
      
      if (authError) {
        res.status(401).json({ message: 'Neispravni podaci za prijavu' });
        return;
      }
      
      // Dohvatanje podataka o korisniku iz users tablice
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (userError) throw userError;
      
      // Transformacija za frontend
      res.status(200).json({
        message: 'Prijava uspješna',
        user: {
          ...userData,
          _id: userData.id // Za kompatibilnost
        },
        token: authData.session.access_token
      });
      return;
    }
    
    // GET /api/auth/validate-token - Validacija tokena
    if (req.method === 'GET' && req.url === '/api/auth/validate-token') {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Nije autorizovano', valid: false });
        return;
      }
      
      const token = authHeader.split(' ')[1];
      
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        res.status(401).json({ message: 'Neispravan token', valid: false });
        return;
      }
      
      res.status(200).json({ valid: true });
      return;
    }
    
    // POST /api/auth/change-password - Promjena šifre
    if (req.method === 'POST' && req.url === '/api/auth/change-password') {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Nije autorizovano' });
        return;
      }
      
      const token = authHeader.split(' ')[1];
      const body = await parseBody(req);
      
      // Validacija inputa
      if (!body.currentPassword || !body.newPassword) {
        res.status(400).json({ message: 'Sva polja su obavezna' });
        return;
      }
      
      // Dohvatanje korisnika
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        res.status(401).json({ message: 'Neispravan token' });
        return;
      }
      
      // Prvo provjeriti trenutnu šifru
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: body.currentPassword
      });
      
      if (signInError) {
        res.status(401).json({ message: 'Trenutna šifra nije ispravna' });
        return;
      }
      
      // Promjena šifre
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: body.newPassword }
      );
      
      if (updateError) throw updateError;
      
      res.status(200).json({ message: 'Šifra je uspješno promijenjena' });
      return;
    }
    
    // POST /api/auth/forgot-password - Zahtjev za resetiranje šifre
    if (req.method === 'POST' && req.url === '/api/auth/forgot-password') {
      const body = await parseBody(req);
      
      // Validacija inputa
      if (!body.email) {
        res.status(400).json({ message: 'Email je obavezan' });
        return;
      }
      
      // Slanje emaila za resetiranje šifre
      await supabase.auth.resetPasswordForEmail(body.email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`
      });
      
      // Iz sigurnosnih razloga, ne otkrivamo da li email postoji ili ne
      res.status(200).json({ message: 'Ako korisnik postoji, link za resetiranje šifre će biti poslan na email' });
      return;
    }
    
    // POST /api/auth/reset-password - Resetiranje šifre
    if (req.method === 'POST' && req.url === '/api/auth/reset-password') {
      const body = await parseBody(req);
      
      // Validacija inputa
      if (!body.token || !body.password) {
        res.status(400).json({ message: 'Sva polja su obavezna' });
        return;
      }
      
      // Resetiranje šifre
      const { error } = await supabase.auth.updateUser({
        password: body.password
      }, { accessToken: body.token });
      
      if (error) {
        res.status(400).json({ message: 'Neispravan ili istekao token za resetiranje šifre' });
        return;
      }
      
      res.status(200).json({ message: 'Šifra je uspješno resetirana' });
      return;
    }
    
    // POST /api/auth/logout - Odjava korisnika
    if (req.method === 'POST' && req.url === '/api/auth/logout') {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        
        // Poništavanje tokena
        await supabase.auth.admin.signOut(token);
      }
      
      res.status(200).json({ message: 'Uspješna odjava' });
      return;
    }
    
    // Ako nijedna ruta ne odgovara
    res.status(404).json({ message: 'Ruta nije pronađena' });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Interna serverska greška', error: error.message });
  }
};
