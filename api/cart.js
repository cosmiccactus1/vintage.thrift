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
    // Provjera autentikacije (za sve metode osim provjere)
    const userId = await verifyToken(req);
    
    if (req.url !== '/api/cart/check' && !userId) {
      res.status(401).json({ message: 'Nije autorizovano' });
      return;
    }
    
    // GET /api/cart - Dohvaćanje svih artikala iz korpe korisnika
    if (req.method === 'GET' && req.url === '/api/cart') {
      // Dohvatanje artikala iz korpe s podacima o artiklima
      const { data, error } = await supabase
        .from('cart_items')
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
        inCart: true
      }));
      
      res.status(200).json(formattedData);
      return;
    }
    
    // GET /api/cart/check/:id - Provjera je li artikal u korpi
    if (req.method === 'GET' && req.url.match(/\/api\/cart\/check\/([^\/]+)$/)) {
      if (!userId) {
        res.status(200).json({ isInCart: false });
        return;
      }
      
      const articleId = req.url.match(/\/api\/cart\/check\/([^\/]+)$/)[1];
      
      const { data, error } = await supabase
        .from('cart_items')
        .select('id')
        .eq('user_id', userId)
        .eq('article_id', articleId)
        .maybeSingle();
      
      if (error) throw error;
      
      res.status(200).json({ isInCart: !!data });
      return;
    }
    
    // POST /api/cart/:id - Dodavanje artikla u korpu
    if (req.method === 'POST' && req.url.match(/\/api\/cart\/([^\/]+)$/)) {
      const articleId = req.url.match(/\/api\/cart\/([^\/]+)$/)[1];
      
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
      
      // Provjera da li je artikal već u korpi
      const { data: existingItem, error: checkError } = await supabase
        .from('cart_items')
        .select('id')
        .eq('user_id', userId)
        .eq('article_id', articleId)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existingItem) {
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
      
      if (insertError) throw insertError;
      
      res.status(201).json({ message: 'Artikal je dodan u korpu' });
      return;
    }
    
    // DELETE /api/cart/:id - Uklanjanje artikla iz korpe
    if (req.method === 'DELETE' && req.url.match(/\/api\/cart\/([^\/]+)$/)) {
      const articleId = req.url.match(/\/api\/cart\/([^\/]+)$/)[1];
      
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId)
        .eq('article_id', articleId);
      
      if (error) throw error;
      
      res.status(200).json({ message: 'Artikal je uklonjen iz korpe' });
      return;
    }
    
    // DELETE /api/cart - Uklanjanje svih artikala iz korpe (pražnjenje korpe)
    if (req.method === 'DELETE' && req.url === '/api/cart') {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);
      
      if (error) throw error;
      
      res.status(200).json({ message: 'Korpa je ispražnjena' });
      return;
    }
    
    // Ako nijedna ruta ne odgovara
    res.status(404).json({ message: 'Ruta nije pronađena' });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Interna serverska greška', error: error.message });
  }
};
