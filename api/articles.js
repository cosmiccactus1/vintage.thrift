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
    // Parsiranje URL-a za određivanje rute
    const parsedURL = parseURL(req);
    
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
    const userId = await verifyToken(req);
    if (!userId) {
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
      console.log('Primljen POST zahtjev:', req.body);
      
      // Validacija podataka
      const { title, description, price, category, status, images } = req.body || {};
      
      if (!title || !description || !price) {
        res.status(400).json({ message: 'Nedostaju obavezna polja' });
        return;
      }
      
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
        console.error('Supabase greška:', error);
        res.status(500).json({ message: 'Greška prilikom kreiranja artikla', error: error.message });
        return;
      }
      
      console.log('Kreiran artikal:', article);
      
      // Transformacija ID-a za kompatibilnost ako je potrebno
      const formattedArticle = article.length > 0 ? {
        ...article[0],
        _id: article[0].id
      } : null;
      
      res.status(201).json(formattedArticle || article);
      return;
    }
    
    // Ako nijedna ruta ne odgovara
    res.status(404).json({ message: 'Ruta nije pronađena' });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Interna serverska greška', error: error.message });
  }
};
