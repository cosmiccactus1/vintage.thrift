// Vercel serverless funkcija za upravljanje korpom putem Supabase
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

// Helper funkcija za parsiranje JSON body-a
async function parseBody(req) {
  const buffers = [];
  for await (const chunk of req) {
    buffers.push(chunk);
  }
  const data = Buffer.concat(buffers).toString();
  return data ? JSON.parse(data) : {};
}

// Helper funkcija za parsiranje URL-a
function parseURL(req) {
  console.log('Original Request URL:', req.url);
  
  // Prvo uklonite bilo koji prefiks "/api/cart" ako postoji
  let path = req.url;
  if (path.startsWith('/api/cart')) {
    path = path.replace('/api/cart', '');
  }
  
  console.log('Cleaned path for parsing:', path);
  
  // Ako URL sadrži /check/ to znači da je ruta za provjeru korpe
  if (path.includes('/check/')) {
    const id = path.split('/check/')[1];
    console.log('Check cart request for article ID:', id);
    return {
      type: 'check_cart',
      articleId: id
    };
  }
  
  // Ako je prazan URL ili samo /, to je dohvaćanje svih artikala iz korpe ili pražnjenje korpe
  if (path === '/' || path === '') {
    console.log('All cart items request');
    return {
      type: 'all_cart'
    };
  }
  
  // Ako imamo ID u putanji, to je za dodavanje/brisanje jednog artikla
  const match = path.match(/\/([^\/]+)$/);
  if (match) {
    console.log('Single article cart operation, ID:', match[1]);
    return {
      type: 'single_article',
      articleId: match[1]
    };
  }
  
  // Default: nepoznata putanja
  console.log('Unknown path type');
  return {
    type: 'unknown'
  };
}

module.exports = async (req, res) => {
  console.log('Cart API request received:', req.method, req.url);
  
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
    
    // Provjera autentikacije (osim za check_cart)
    const userId = await verifyToken(req);
    console.log('Authenticated user ID:', userId);
    
    if (parsedURL.type !== 'check_cart' && !userId) {
      res.status(401).json({ message: 'Nije autorizovano' });
      return;
    }
    
    // GET - Dohvaćanje svih artikala iz korpe korisnika
    if (req.method === 'GET' && parsedURL.type === 'all_cart') {
      console.log('Fetching all cart items for user:', userId);
      
      // Dohvatanje artikala iz korpe s podacima o artiklima
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          article_id,
          articles (*)
        `)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error fetching cart items:', error);
        throw error;
      }
      
      console.log('Found cart items:', data ? data.length : 0);
      
      // Transformacija podataka za frontend
      const formattedData = data.map(item => ({
        ...item.articles,
        _id: item.articles.id,
        inCart: true
      }));
      
      res.status(200).json(formattedData);
      return;
    }
    
    // GET - Provjera je li artikal u korpi
    if (req.method === 'GET' && parsedURL.type === 'check_cart') {
      if (!userId) {
        console.log('User not authenticated, returning not in cart');
        res.status(200).json({ inCart: false });
        return;
      }
      
      const articleId = parsedURL.articleId;
      console.log('Checking if article is in cart:', articleId, 'for user:', userId);
      
      const { data, error } = await supabase
        .from('cart_items')
        .select('id')
        .eq('user_id', userId)
        .eq('article_id', articleId)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking cart item:', error);
        throw error;
      }
      
      console.log('Article in cart:', !!data);
      res.status(200).json({ inCart: !!data });
      return;
    }
    
    // POST - Dodavanje artikla u korpu
    if (req.method === 'POST' && parsedURL.type === 'single_article') {
      const articleId = parsedURL.articleId;
      console.log('Adding article to cart:', articleId, 'for user:', userId);
      
      // Provjera da li artikal postoji
      const { data: articleExists, error: articleError } = await supabase
        .from('articles')
        .select('id')
        .eq('id', articleId)
        .single();
      
      if (articleError) {
        if (articleError.code === 'PGRST116') { // Record not found error
          console.log('Article not found:', articleId);
          res.status(404).json({ message: 'Artikal nije pronađen' });
        } else {
          console.error('Error checking article existence:', articleError);
          throw articleError;
        }
        return;
      }
      
      // Provjera da li je artikal već u korpi
      const { data: existingItem, error: checkError } = await supabase
        .from('cart_items')
        .select('id')
        .eq('user_id', userId)
        .eq('article_id', articleId)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking existing cart item:', checkError);
        throw checkError;
      }
      
      if (existingItem) {
        console.log('Article already in cart');
        res.status(200).json({ message: 'Artikal je već u korpi' });
        return;
      }
      
      // Dodavanje u korpu
      const { error: insertError } = await supabase
        .from('cart_items')
        .insert({
          user_id: userId,
          article_id: articleId
        });
      
      if (insertError) {
        console.error('Error adding to cart:', insertError);
        throw insertError;
      }
      
      console.log('Article added to cart successfully');
      res.status(201).json({ message: 'Artikal je dodan u korpu' });
      return;
    }
    
    // DELETE - Uklanjanje artikla iz korpe
    if (req.method === 'DELETE' && parsedURL.type === 'single_article') {
      const articleId = parsedURL.articleId;
      console.log('Removing article from cart:', articleId, 'for user:', userId);
      
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId)
        .eq('article_id', articleId);
      
      if (error) {
        console.error('Error removing from cart:', error);
        throw error;
      }
      
      console.log('Article removed from cart successfully');
      res.status(200).json({ message: 'Artikal je uklonjen iz korpe' });
      return;
    }
    
    // DELETE - Uklanjanje svih artikala iz korpe (pražnjenje korpe)
    if (req.method === 'DELETE' && parsedURL.type === 'all_cart') {
      console.log('Emptying cart for user:', userId);
      
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error emptying cart:', error);
        throw error;
      }
      
      console.log('Cart emptied successfully');
      res.status(200).json({ message: 'Korpa je ispražnjena' });
      return;
    }
    
    // Ako nijedna ruta ne odgovara
    console.log('Route not found:', req.method, req.url);
    res.status(404).json({ message: 'Ruta nije pronađena' });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Interna serverska greška', error: error.message });
  }
};
