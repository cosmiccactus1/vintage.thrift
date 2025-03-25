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

// Helper funkcija za parsiranje URL-a
function parseURL(req) {
  console.log('Request URL:', req.url);
  
  // Ako URL sadrži /check/ to znači da je ruta za provjeru favorite
  if (req.url.includes('/check/')) {
    const id = req.url.split('/check/')[1];
    return {
      type: 'check_favorite',
      articleId: id
    };
  }
  
  // Ako je prazan URL ili samo /, to je dohvaćanje svih favorita
  if (req.url === '/' || req.url === '') {
    return {
      type: 'all_favorites'
    };
  }
  
  // Ako imamo ID u putanji, to je za dodavanje/brisanje
  const match = req.url.match(/\/([^\/]+)$/);
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
    
    if (parsedURL.type !== 'check_favorite' && !userId) {
      res.status(401).json({ message: 'Nije autorizovano' });
      return;
    }
    
    // GET - Dohvaćanje svih favorita korisnika
    if (req.method === 'GET' && parsedURL.type === 'all_favorites') {
      // Dohvatanje favorita s podacima o artiklima
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          article_id,
          articles (*)
        `)
        .eq('user_id', userId);
      
      if (error) throw error;
      
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
      
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('article_id', articleId)
        .maybeSingle();
      
      if (error) throw error;
      
      res.status(200).json({ isFavorite: !!data });
      return;
    }
    
    // POST - Dodavanje artikla u favorite
    if (req.method === 'POST' && parsedURL.type === 'single_article') {
      const articleId = parsedURL.articleId;
      
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
      
      if (checkError) throw checkError;
      
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
      
      if (insertError) throw insertError;
      
      res.status(201).json({ message: 'Artikal je dodan u favorite' });
      return;
    }
    
    // DELETE - Uklanjanje artikla iz favorita
    if (req.method === 'DELETE' && parsedURL.type === 'single_article') {
      const articleId = parsedURL.articleId;
      
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('article_id', articleId);
      
      if (error) throw error;
      
      res.status(200).json({ message: 'Artikal je uklonjen iz favorita' });
      return;
    }
    
    // Ako nijedna ruta ne odgovara
    res.status(404).json({ message: 'Ruta nije pronađena' });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Interna serverska greška', error: error.message });
  }
};
