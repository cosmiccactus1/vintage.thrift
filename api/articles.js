// Vercel serverless funkcija za upravljanje artiklima putem Supabase
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

module.exports = async (req, res) => {
  // Podešavanje CORS headera
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // GET /api/articles - Dohvaćanje svih artikala
    if (req.method === 'GET' && req.url === '/api/articles') {
      const { data: articles, error } = await supabase
        .from('articles')
        .select('*')
        .eq('status', 'active');
      
      if (error) throw error;
      
      // Transformacija ID-a za kompatibilnost (id -> _id)
      const formattedArticles = articles.map(article => ({
        ...article,
        _id: article.id
      }));
      
      res.status(200).json(formattedArticles);
      return;
    }
    
    // GET /api/articles/:id - Dohvaćanje jednog artikla
    if (req.method === 'GET' && req.url.match(/\/api\/articles\/([^\/]+)$/) && !req.url.includes('/user/')) {
      const id = req.url.match(/\/api\/articles\/([^\/]+)$/)[1];
      
      const { data: article, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // Record not found error
          res.status(404).json({ message: 'Artikal nije pronađen' });
        } else {
          throw error;
        }
        return;
      }
      
      // Transformacija ID-a za kompatibilnost (id -> _id)
      article._id = article.id;
      
      res.status(200).json(article);
      return;
    }
    
    // GET /api/articles/user/:id - Dohvaćanje artikala određenog korisnika
    if (req.method === 'GET' && req.url.match(/\/api\/articles\/user\/([^\/]+)$/)) {
      // Dohvatanje ID-a korisnika iz URL-a
      const userId = req.url.match(/\/api\/articles\/user\/([^\/]+)$/)[1];
      
      // Provjera autentikacije samo ako se traže lični artikli "me"
      if (userId === 'me') {
        const authUserId = await verifyToken(req);
        if (!authUserId) {
          res.status(401).json({ message: 'Nije autorizovano' });
          return;
        }
        
        // Koristi ID autentificiranog korisnika
        const { data: articles, error } = await supabase
          .from('articles')
          .select('*')
          .eq('user_id', authUserId);
        
        if (error) throw error;
        
        // Transformacija ID-a za kompatibilnost (id -> _id)
        const formattedArticles = articles.map(article => ({
          ...article,
          _id: article.id
        }));
        
        res.status(200).json(formattedArticles);
        return;
      } else {
        // Dohvatanje artikala javnog korisnika
        const { data: articles, error } = await supabase
          .from('articles')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active'); // Samo aktivni artikli za javne korisnike
        
        if (error) throw error;
        
        // Transformacija ID-a za kompatibilnost (id -> _id)
        const formattedArticles = articles.map(article => ({
          ...article,
          _id: article.id
        }));
        
        res.status(200).json(formattedArticles);
        return;
      }
    }
    
    // Za ostale operacije (POST, PUT, DELETE) zahtijeva se autentikacija
    const userId = await verifyToken(req);
    if (!userId) {
      res.status(401).json({ message: 'Nije autorizovano' });
      return;
    }
    
    // Ovdje dolazi ostatak koda za POST, PUT i DELETE operacije...
    // Ostatak tvog postojećeg articles.js koda...
    
    // Ako nijedna ruta ne odgovara
    res.status(404).json({ message: 'Ruta nije pronađena' });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Interna serverska greška', error: error.message });
  }
};
