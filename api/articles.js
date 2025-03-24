// Vercel serverless funkcija za upravljanje artiklima putem Supabase
const { createClient } = require('@supabase/supabase-js');

// Konfiguracija Supabase klijenta
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper funkcija za verifikaciju JWT tokena
async function verifyToken(req) {
  try {
    console.log('Headers received:', JSON.stringify(req.headers));
    const authHeader = req.headers.authorization;
    console.log('Authorization header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid Authorization header');
      return null;
    }
    
    const token = authHeader.split(' ')[1];
    console.log('Extracted token:', token);
    
    // Verifikacija tokena putem Supabase Auth API
    console.log('Attempting to verify token with Supabase...');
    const { data, error } = await supabase.auth.getUser(token);
    console.log('Supabase auth response:', JSON.stringify(data), JSON.stringify(error));
    
    if (error || !data.user) {
      console.log('Token verification failed:', error);
      return null;
    }
    
    console.log('Token verification successful, user ID:', data.user.id);
    return data.user.id;
  } catch (error) {
    console.error('Greška prilikom verifikacije tokena:', error);
    return null;
  }
}

// Helper funkcija za parsiranje URL-a i izvlačenje parametara
function parseURL(req) {
  // Log za debugiranje - možete ukloniti nakon što sve radi
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('Request query:', req.query);

  const urlParts = req.url.split('/').filter(Boolean);
  
  // Ako URL sadrži /user/ to znači da je ruta /api/articles/user/:userId
  if (urlParts.length >= 2 && urlParts[0] === 'user') {
    return {
      type: 'user_articles',
      userId: urlParts[1]
    };
  }
  
  // Ako imamo samo jedan dio u URL-u, to je vjerojatno ID artikla
  if (urlParts.length === 1) {
    return {
      type: 'single_article',
      articleId: urlParts[0]
    };
  }
  
  // Ako imamo query parametar user_id, to je za artikle korisnika
  if (req.query && req.query.user_id) {
    return {
      type: 'user_articles',
      userId: req.query.user_id
    };
  }
  
  // Ako imamo query parametar id, to je za jedan artikal
  if (req.query && req.query.id) {
    return {
      type: 'single_article',
      articleId: req.query.id
    };
  }
  
  // Default: svi artikli
  return {
    type: 'all_articles'
  };
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
    console.log('Received request to /api/articles');
    console.log('Request method:', req.method);
    console.log('Request body:', JSON.stringify(req.body));
    
    // Parsiranje URL-a za određivanje rute
    const parsedURL = parseURL(req);
    console.log('Parsed URL:', parsedURL);
    
    // GET metoda - dohvaćanje artikala
    if (req.method === 'GET') {
      // Dohvaćanje svih artikala
      if (parsedURL.type === 'all_articles') {
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
      
      // Dohvaćanje jednog artikla po ID-u
      if (parsedURL.type === 'single_article') {
        const { data: article, error } = await supabase
          .from('articles')
          .select('*')
          .eq('id', parsedURL.articleId)
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
      
      // Dohvaćanje artikala korisnika
      if (parsedURL.type === 'user_articles') {
        let query = supabase
          .from('articles')
          .select('*')
          .eq('user_id', parsedURL.userId);
        
        // Provjera autentikacije samo za vlastite artikle
        const authUserId = await verifyToken(req);
        
        // Ako korisnik nije vlasnik artikala, prikaži samo aktivne artikle
        if (!authUserId || authUserId !== parsedURL.userId) {
          query = query.eq('status', 'active');
        }
        
        const { data: articles, error } = await query;
        
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
    console.log('Attempting to verify token...');
    const userId = await verifyToken(req);
    console.log('Verification result (userId):', userId);
    
    if (!userId) {
      console.log('Unauthorized - No valid user ID found');
      res.status(401).json({ message: 'Nije autorizovano' });
      return;
    }
    
    // DELETE metoda - brisanje artikla
    if (req.method === 'DELETE' && parsedURL.type === 'single_article') {
      // Provjera da li korisnik može izbrisati artikal
      const { data: article, error: fetchError } = await supabase
        .from('articles')
        .select('user_id')
        .eq('id', parsedURL.articleId)
        .single();
        
      if (fetchError) {
        if (fetchError.code === 'PGRST116') { // Record not found error
          res.status(404).json({ message: 'Artikal nije pronađen' });
        } else {
          throw fetchError;
        }
        return;
      }
      
      // Samo vlasnik može izbrisati artikal
      if (article.user_id !== userId) {
        res.status(403).json({ message: 'Nemate dozvolu za brisanje ovog artikla' });
        return;
      }
      
      // Brisanje artikla
      const { error: deleteError } = await supabase
        .from('articles')
        .delete()
        .eq('id', parsedURL.articleId);
      
      if (deleteError) throw deleteError;
      
      res.status(200).json({ message: 'Artikal je uspješno obrisan' });
      return;
    }
    
    // POST metoda - kreiranje novog artikla
    if (req.method === 'POST') {
      console.log('Processing POST request to create article');
      console.log('User ID after verification:', userId);
      console.log('Request body for article creation:', JSON.stringify(req.body));
      
      // Validacija podataka
      const { title, description, price, category, status, images } = req.body || {};
      
      if (!title || !description || !price) {
        console.log('Missing required fields');
        res.status(400).json({ message: 'Nedostaju obavezna polja' });
        return;
      }
      
      console.log('Creating article in Supabase');
      // Kreiranje novog artikla
      const { data: article, error } = await supabase
        .from('articles')
        .insert([{
          title,
          description,
          price,
          category,
          images: images || [],
          user_id: userId,
          status: status || 'active',
          created_at: new Date().toISOString()
        }])
        .select();
      
      if (error) {
        console.error('Supabase error during article creation:', error);
        res.status(500).json({ message: 'Greška prilikom kreiranja artikla', error: error.message });
        return;
      }
      
      console.log('Article created successfully:', JSON.stringify(article));
      
      // Transformacija ID-a za kompatibilnost ako je potrebno
      const formattedArticle = article.length > 0 ? {
        ...article[0],
        _id: article[0].id
      } : null;
      
      res.status(201).json(formattedArticle || article);
      return;
    }
    
    // Ako nijedna ruta ne odgovara
    console.log('No matching route found');
    res.status(404).json({ message: 'Ruta nije pronađena' });
    
  } catch (error) {
    console.error('Error in API handler:', error);
    res.status(500).json({ message: 'Interna serverska greška', error: error.message });
  }
};
