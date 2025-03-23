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
  console.log('API poziv primljen:', req.method, req.url);
  
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
    if (req.method === 'POST' && req.url === '/api/auth/register') {
      console.log('Primljen zahtjev za registraciju');
      const body = await parseBody(req);
      console.log('Podaci za registraciju:', { username: body.username, email: body.email });
      
      // Validacija inputa
      if (!body.username || !body.email || !body.password) {
        res.status(400).json({ message: 'Sva polja su obavezna' });
        return;
      }
      
      // Provjera postojanja korisnika u users tablici - odvojeni upiti
      const { data: existingUsersByUsername, error: queryErrorUsername } = await supabase
        .from('users')
        .select('*')
        .eq('username', body.username)
        .limit(1);

      const { data: existingUsersByEmail, error: queryErrorEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', body.email)
        .limit(1);

      if (queryErrorUsername) throw queryErrorUsername;
      if (queryErrorEmail) throw queryErrorEmail;

      if (existingUsersByUsername && existingUsersByUsername.length > 0) {
        res.status(400).json({ message: 'Korisničko ime je već zauzeto' });
        return;
      }

      if (existingUsersByEmail && existingUsersByEmail.length > 0) {
        res.status(400).json({ message: 'Email adresa je već u upotrebi' });
        return;
      }
      
      // Kreiranje korisnika putem Auth API-ja
      console.log('Kreiranje korisnika u Auth sustavu...');
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true // Automatski potvrdi email
      });
      
      if (authError) {
        console.error('Greška prilikom kreiranja korisnika u Auth:', authError);
        throw authError;
      }
      
      console.log('Korisnik uspješno kreiran u Auth sustavu, ID:', authData.user.id);
      
      // Kreiranje korisnika u users tablici - dodano password polje
      const newUser = {
        id: authData.user.id,
        username: body.username,
        email: body.email,
        password: 'hashed', // Dodano za not-null constraint
        avatar_url: body.avatar_url || null
      };
      
      console.log('Dodavanje korisnika u users tablicu:', newUser);
      const { error: insertError } = await supabase
        .from('users')
        .insert([newUser]);
      
      if (insertError) {
        console.error('Greška prilikom dodavanja u users tablicu:', insertError);
        throw insertError;
      }
      
      console.log('Korisnik uspješno dodan u users tablicu');
      
      // Jednostavniji pristup bez kreiranja sesije
      res.status(201).json({
        message: 'Registracija uspješna',
        user: {
          ...newUser,
          _id: newUser.id // Za kompatibilnost
        },
        token: authData.session ? authData.session.access_token : null
      });
      return;
    }
    
    // POST /api/auth/login - Prijava korisnika
    if (req.method === 'POST' && req.url === '/api/auth/login') {
      console.log('Primljen zahtjev za prijavu');
      const body = await parseBody(req);
      console.log('Podaci za prijavu:', { email: body.email });
      
      // Validacija inputa
      if (!body.email || !body.password) {
        res.status(400).json({ message: 'Sva polja su obavezna' });
        return;
      }
      
      // Prijava putem Auth API-ja
      console.log('Pokušaj Supabase autentikacije...');
      const authResult = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password
      });
      
      console.log('Rezultat autentikacije:', 
        JSON.stringify({
          success: !!authResult.data?.user,
          errorCode: authResult.error?.code,
          errorMessage: authResult.error?.message
        })
      );
      
      if (authResult.error) {
        res.status(401).json({ 
          message: 'Neispravni podaci za prijavu', 
          details: authResult.error.message 
        });
        return;
      }
      
      try {
        // Dohvatanje podataka o korisniku iz users tablice
        console.log('Dohvatanje podataka iz users tablice za ID:', authResult.data.user.id);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authResult.data.user.id)
          .maybeSingle(); // Koristimo maybeSingle umjesto single
        
        if (userError) {
          console.error('Greška prilikom dohvatanja podataka iz users tablice:', userError);
          throw userError;
        }
        
        if (!userData) {
          console.warn('Korisnik postoji u Auth ali ne i u users tablici, ID:', authResult.data.user.id);
          // Ako korisnik postoji u Auth ali ne i u users tablici
          res.status(404).json({ message: 'Korisnički profil nije pronađen' });
          return;
        }
        
        console.log('Korisnik uspješno prijavljen, vraćanje podataka:', userData.username);
        
        // Transformacija za frontend
        res.status(200).json({
          message: 'Prijava uspješna',
          user: {
            ...userData,
            _id: userData.id // Za kompatibilnost
          },
          token: authResult.data.session.access_token
        });
      } catch (error) {
        console.error('Greška prilikom dohvatanja korisničkih podataka:', error);
        // Fallback - vrati samo podatke iz Auth
        console.log('Korištenje fallback podataka iz Auth');
        res.status(200).json({
          message: 'Prijava uspješna (fallback)',
          user: {
            id: authResult.data.user.id,
            _id: authResult.data.user.id,
            email: authResult.data.user.email,
            username: authResult.data.user.email.split('@')[0] // Privremeno rješenje
          },
          token: authResult.data.session.access_token
        });
      }
      return;
    }
    
    // GET /api/auth/validate-token - Validacija tokena
    if (req.method === 'GET' && req.url === '/api/auth/validate-token') {
      console.log('Primljen zahtjev za validaciju tokena');
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Nije autorizovano', valid: false });
        return;
      }
      
      const token = authHeader.split(' ')[1];
      
      console.log('Provjera tokena pomoću Supabase Auth...');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error('Token nije validan:', userError);
        res.status(401).json({ message: 'Neispravan token', valid: false });
        return;
      }
      
      console.log('Token je validan za korisnika:', user.id);
      res.status(200).json({ valid: true });
      return;
    }
    
    // POST /api/auth/change-password - Promjena šifre
    if (req.method === 'POST' && req.url === '/api/auth/change-password') {
      console.log('Primljen zahtjev za promjenu šifre');
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
      console.log('Provjera tokena...');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error('Neispravan token:', userError);
        res.status(401).json({ message: 'Neispravan token' });
        return;
      }
      
      // Prvo provjeriti trenutnu šifru
      console.log('Provjera trenutne šifre za korisnika:', user.id);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: body.currentPassword
      });
      
      if (signInError) {
        console.error('Trenutna šifra nije ispravna:', signInError);
        res.status(401).json({ message: 'Trenutna šifra nije ispravna' });
        return;
      }
      
      // Promjena šifre
      console.log('Ažuriranje šifre za korisnika:', user.id);
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: body.newPassword }
      );
      
      if (updateError) {
        console.error('Greška prilikom ažuriranja šifre:', updateError);
        throw updateError;
      }
      
      console.log('Šifra uspješno promijenjena za korisnika:', user.id);
      res.status(200).json({ message: 'Šifra je uspješno promijenjena' });
      return;
    }
    
    // POST /api/auth/forgot-password - Zahtjev za resetiranje šifre
    if (req.method === 'POST' && req.url === '/api/auth/forgot-password') {
      console.log('Primljen zahtjev za resetiranje šifre');
      const body = await pars
