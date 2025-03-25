// Vercel serverless funkcija za upravljanje favoritima putem Supabase
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

// Poboljšana helper funkcija za parsiranje URL-a
function parseURL(req) {
  console.log('Original Request URL:', req.url);
  
  // Prvo uklonite bilo koji prefiks "/api/favorites" ako postoji
  let path = req.url;
  if (path.startsWith('/api/favorites')) {
    path = path.replace('/api/favorites', '');
  }
  
  console.log('Cleaned path for parsing:', path);
  
  // Ako URL sadrži /check/ to znači da je ruta za provjeru favorite
  if (path.includes('/check/')) {
    const id = path.split('/check/')[1];
    return {
      type: 'check_favorite',
      articleId: id
    };
  }
  
  // Ako je prazan URL ili samo /, to je dohvaćanje svih favorita
  if (path === '/' || path === '') {
    return {
      type: 'all_favorites'
    };
  }
  
  // Ako imamo ID u putanji, to je za dodavanje/brisanje
  const match = path.match(/\/([^\/]+)$/);
  if (match) {
    return {
      type: 'single_article',
      articleId: match[1]
    };
  }
  
  // Default: nepoznata putanja
  return {
    type: 'unknown'
  };
}

module.exports = async (req, res) => {
  console.log('Favorites API poziv primljen:', req.method, req.url);
  
  // Podešavanje CORS headera
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Parsiranje URL-a
    const parsedURL = parseURL(req);
    console.log('Parsed URL:', parsedURL);
    
    // Provjera autentikacije (osim za check_favorite)
    const userId = await verifyToken(req);
    console.log('Autenticirani korisnik:', userId);
    
    if (parsedURL.type !== 'check_favorite' && !userId) {
      res.status(401).json({ message: 'Nije autorizovano' });
      return;
    }
    
    // GET - Test ruta
    if (req.method === 'GET' && req.url === '/test') {
      res.status(200).json({ message: 'Favorites API radi' });
      return;
    }
    
    // GET - Dohvaćanje svih favorita korisnika
    if (req.method === 'GET' && parsedURL.type === 'all_favorites') {
      console.log('Dohvaćanje svih favorita za korisnika:', userId);
      
      // Dohvatanje favorita s podacima o artiklima
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          article_id,
          articles (*)
        `)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Greška pri dohvatanju favorita:', error);
        throw error;
      }
      
      console.log('Broj dohvaćenih favorita:', data ? data.length : 0);
      
      // Transformacija podataka za frontend
      const formattedData = data.map(item => ({
        ...item.articles,
        _id: item.articles.id,
        favorite: true
      }));
      
      res.status(200).json(formattedData);
      return;
    }
    
    // GET - Provjera je li artikal u favoritima
    if (req.method === 'GET' && parsedURL.type === 'check_favorite') {
      if (!userId) {
        res.status(200).json({ isFavorite: false });
        return;
      }
      
      const articleId = parsedURL.articleId;
      console.log('Provjera je li artikal u favoritima:', articleId);
      
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('article_id', articleId)
        .maybeSingle();
      
      if (error) {
        console.error('Greška pri provjeri favorita:', error);
        throw error;
      }
      
      res.status(200).json({ isFavorite: !!data });
      return;
    }
    
    // POST - Dodavanje artikla u favorite
    if (req.method === 'POST' && parsedURL.type === 'single_article') {
      const articleId = parsedURL.articleId;
      console.log('Dodavanje artikla u favorite:', articleId);
      
      // Provjera da li artikal postoji
      const { data: articleExists, error: articleError } = await supabase
        .from('articles')
        .select('id')
        .eq('id', articleId)
        .single();
      
      if (articleError) {
        if (articleError.code === 'PGRST116') { // Record not found error
          res.status(404).json({ message: 'Artikal nije pronađen' });
        } else {
          console.error('Greška pri provjeri postojanja artikla:', articleError);
          throw articleError;
        }
        return;
      }
      
      // Provjera da li je artikal već u favoritima
      const { data: existingFavorite, error: checkError } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('article_id', articleId)
        .maybeSingle();
      
      if (checkError) {
        console.error('Greška pri provjeri postojećeg favorita:', checkError);
        throw checkError;
      }
      
      if (existingFavorite) {
        res.status(200).json({ message: 'Artikal je već u favoritima' });
        return;
      }
      
      // Dodavanje u favorite
      const { error: insertError } = await supabase
        .from('favorites')
        .insert({
          user_id: userId,
          article_id: articleId
        });
      
      if (insertError) {
        console.error('Greška pri dodavanju u favorite:', insertError);
        throw insertError;
      }
      
      res.status(201).json({ message: 'Artikal je dodan u favorite' });
      return;
    }
    
    // DELETE - Uklanjanje artikla iz favorita
    if (req.method === 'DELETE' && parsedURL.type === 'single_article') {
      const articleId = parsedURL.articleId;
      console.log('Uklanjanje artikla iz favorita:', articleId);
      
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('article_id', articleId);
      
      if (error) {
        console.error('Greška pri uklanjanju iz favorita:', error);
        throw error;
      }
      
      res.status(200).json({ message: 'Artikal je uklonjen iz favorita' });
      return;
    }
    
    // Ako nijedna ruta ne odgovara
    console.log('Ruta nije pronađena:', req.method, req.url);
    res.status(404).json({ message: 'Ruta nije pronađena' });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Interna serverska greška', error: error.message });
  }
};
