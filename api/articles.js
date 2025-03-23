// Vercel serverless funkcija za upravljanje artiklima putem Supabase
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const { Readable } = require('stream');

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

// Helper funkcija za parsiranje multipart/form-data (za upload slika)
async function parseMultipartForm(req) {
  return new Promise((resolve, reject) => {
    const storage = multer.memoryStorage();
    const upload = multer({
      storage,
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
      }
    }).array('images', 5);

    upload(req, {}, (err) => {
      if (err) {
        return reject(err);
      }
      resolve(req.files);
    });
  });
}

// Helper funkcija za upload slika na Supabase Storage
async function uploadToStorage(file) {
  const fileName = `${Date.now()}_${file.originalname}`;
  
  const { data, error } = await supabase.storage
    .from('article-images')
    .upload(fileName, file.buffer, {
      contentType: file.mimetype
    });
  
  if (error) {
    throw error;
  }
  
  // Dohvaćanje javnog URL-a slike
  const { data: { publicUrl } } = supabase.storage
    .from('article-images')
    .getPublicUrl(fileName);
  
  return publicUrl;
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
    if (req.method === 'GET' && req.url.match(/\/api\/articles\/([^\/]+)$/)) {
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
      const userId = req.url.match(/\/api\/articles\/user\/([^\/]+)$/)[1];
      
      const { data: articles, error } = await supabase
        .from('articles')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Transformacija ID-a za kompatibilnost (id -> _id)
      const formattedArticles = articles.map(article => ({
        ...article,
        _id: article.id
      }));
      
      res.status(200).json(formattedArticles);
      return;
    }
    
    // POST /api/articles - Kreiranje novog artikla
    if (req.method === 'POST' && req.url === '/api/articles') {
      // Provjera autentikacije
      const userId = await verifyToken(req);
      if (!userId) {
        res.status(401).json({ message: 'Nije autorizovano' });
        return;
      }
      
      // Parsiranje form-data sa slikama
      const files = await parseMultipartForm(req);
      
      // Učitavanje slika na Supabase Storage
      const imageUrls = [];
      for (const file of files) {
        const imageUrl = await uploadToStorage(file);
        imageUrls.push(imageUrl);
      }
      
      // Kreiranje artikla
      const articleData = {
        title: req.body.title,
        description: req.body.description,
        price: parseFloat(req.body.price),
        size: req.body.size,
        category: req.body.category,
        season: req.body.season,
        condition: req.body.condition,
        color: req.body.color,
        brand: req.body.brand || null,
        location: req.body.location,
        images: imageUrls,
        user_id: userId, // Koristimo user_id umjesto userId
        status: req.body.status || 'active'
        // created_at i updated_at će biti automatski postavljeni od strane Supabase
      };
      
      const { data, error } = await supabase
        .from('articles')
        .insert([articleData])
        .select();
      
      if (error) throw error;
      
      // Transformacija ID-a za kompatibilnost (id -> _id)
      const newArticle = data[0];
      newArticle._id = newArticle.id;
      
      res.status(201).json(newArticle);
      return;
    }
    
    // POST /api/articles/draft - Kreiranje nacrta artikla
    if (req.method === 'POST' && req.url === '/api/articles/draft') {
      // Provjera autentikacije
      const userId = await verifyToken(req);
      if (!userId) {
        res.status(401).json({ message: 'Nije autorizovano' });
        return;
      }
      
      // Parsiranje form-data sa slikama
      const files = await parseMultipartForm(req);
      
      // Učitavanje slika na Supabase Storage
      const imageUrls = [];
      for (const file of files) {
        const imageUrl = await uploadToStorage(file);
        imageUrls.push(imageUrl);
      }
      
      // Kreiranje nacrta artikla
      const draftData = {
        title: req.body.title || '',
        description: req.body.description || '',
        price: req.body.price ? parseFloat(req.body.price) : 0,
        size: req.body.size || '',
        category: req.body.category || '',
        season: req.body.season || '',
        condition: req.body.condition || '',
        color: req.body.color || '',
        brand: req.body.brand || null,
        location: req.body.location || '',
        images: imageUrls,
        user_id: userId, // Koristimo user_id umjesto userId
        status: 'draft'
        // created_at i updated_at će biti automatski postavljeni od strane Supabase
      };
      
      const { data, error } = await supabase
        .from('articles')
        .insert([draftData])
        .select();
      
      if (error) throw error;
      
      // Transformacija ID-a za kompatibilnost (id -> _id)
      const newDraft = data[0];
      newDraft._id = newDraft.id;
      
      res.status(201).json(newDraft);
      return;
    }
    
    // PUT /api/articles/:id - Ažuriranje artikla
    if (req.method === 'PUT' && req.url.match(/\/api\/articles\/([^\/]+)$/)) {
      // Provjera autentikacije
      const userId = await verifyToken(req);
      if (!userId) {
        res.status(401).json({ message: 'Nije autorizovano' });
        return;
      }
      
      const id = req.url.match(/\/api\/articles\/([^\/]+)$/)[1];
      
      // Dohvatanje postojećeg artikla
      const { data: article, error: fetchError } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          res.status(404).json({ message: 'Artikal nije pronađen' });
        } else {
          throw fetchError;
        }
        return;
      }
      
      // Provjera je li korisnik vlasnik artikla
      if (article.user_id !== userId) {
        res.status(403).json({ message: 'Nemate dozvolu za ažuriranje ovog artikla' });
        return;
      }
      
      // Parsiranje form-data sa slikama
      const files = await parseMultipartForm(req);
      
      // Učitavanje novih slika
      let imageUrls = article.images || [];
      
      if (files && files.length > 0) {
        // Ako su poslane nove slike, učitaj ih
        const newImageUrls = [];
        for (const file of files) {
          const imageUrl = await uploadToStorage(file);
          newImageUrls.push(imageUrl);
        }
        
        // Ako je postavljen flag za zamjenu slika, zamijeni sve slike
        if (req.body.replaceImages === 'true') {
          imageUrls = newImageUrls;
        } else {
          // Inače, dodaj nove slike postojećim
          imageUrls = [...imageUrls, ...newImageUrls];
        }
      }
      
      // Priprema podataka za ažuriranje
      const updateData = {
        title: req.body.title || article.title,
        description: req.body.description || article.description,
        price: req.body.price ? parseFloat(req.body.price) : article.price,
        size: req.body.size || article.size,
        category: req.body.category || article.category,
        season: req.body.season || article.season,
        condition: req.body.condition || article.condition,
        color: req.body.color || article.color,
        brand: req.body.brand || article.brand,
        location: req.body.location || article.location,
        images: imageUrls,
        status: req.body.status || article.status,
        updated_at: new Date()
      };
      
      const { data, error: updateError } = await supabase
        .from('articles')
        .update(updateData)
        .eq('id', id)
        .select();
      
      if (updateError) throw updateError;
      
      // Transformacija ID-a za kompatibilnost (id -> _id)
      const updatedArticle = data[0];
      updatedArticle._id = updatedArticle.id;
      
      res.status(200).json(updatedArticle);
      return;
    }
    
    // DELETE /api/articles/:id - Brisanje artikla
    if (req.method === 'DELETE' && req.url.match(/\/api\/articles\/([^\/]+)$/)) {
      // Provjera autentikacije
      const userId = await verifyToken(req);
      if (!userId) {
        res.status(401).json({ message: 'Nije autorizovano' });
        return;
      }
      
      const id = req.url.match(/\/api\/articles\/([^\/]+)$/)[1];
      
      // Dohvatanje postojećeg artikla
      const { data: article, error: fetchError } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          res.status(404).json({ message: 'Artikal nije pronađen' });
        } else {
          throw fetchError;
        }
        return;
      }
      
      // Provjera je li korisnik vlasnik artikla
      if (article.user_id !== userId) {
        res.status(403).json({ message: 'Nemate dozvolu za brisanje ovog artikla' });
        return;
      }
      
      const { error: deleteError } = await supabase
        .from('articles')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      res.status(200).json({ message: 'Artikal je uspješno obrisan' });
      return;
    }
    
    // Ako nijedna ruta ne odgovara
    res.status(404).json({ message: 'Ruta nije pronađena' });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Interna serverska greška', error: error.message });
  }
};
