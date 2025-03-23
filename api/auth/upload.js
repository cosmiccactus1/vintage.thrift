// Vercel serverless funkcija za upload slika putem Supabase Storage
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

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

// Helper funkcija za upload slike na Supabase Storage
async function uploadToStorage(file, bucket = 'article-images') {
  const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype
    });
  
  if (error) {
    throw error;
  }
  
  // Dohvaćanje javnog URL-a slike
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);
  
  return {
    url: publicUrl,
    path: fileName,
    bucket: bucket,
    contentType: file.mimetype,
    size: file.size
  };
}

module.exports = async (req, res) => {
  // Podešavanje CORS headera
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Samo POST metoda je podržana
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Metoda nije dozvoljena' });
    return;
  }

  try {
    // Provjera autentikacije
    const userId = await verifyToken(req);
    if (!userId) {
      res.status(401).json({ message: 'Nije autorizovano' });
      return;
    }
    
    // Upload pojedinačne slike
    if (req.url === '/api/upload/single') {
      // Parsiranje form-data sa slikom
      const files = await parseMultipartForm(req);
      
      if (!files || files.length === 0) {
        res.status(400).json({ message: 'Nijedna slika nije uploadovana' });
        return;
      }
      
      // Uzimamo samo prvu sliku
      const file = files[0];
      
      // Provjera tipa datoteke
      if (!file.mimetype.startsWith('image/')) {
        res.status(400).json({ message: 'Datoteka mora biti slika' });
        return;
      }
      
      // Učitavanje slike na Supabase Storage
      const result = await uploadToStorage(file, 'article-images');
      
      res.status(200).json({
        message: 'Slika uspješno uploadovana',
        url: result.url,
        path: result.path,
        bucket: result.bucket,
        contentType: result.contentType,
        size: result.size
      });
      return;
    }
    
    // Upload više slika
    if (req.url === '/api/upload/multiple') {
      // Parsiranje form-data sa slikama
      const files = await parseMultipartForm(req);
      
      if (!files || files.length === 0) {
        res.status(400).json({ message: 'Nijedna slika nije uploadovana' });
        return;
      }
      
      // Provjera tipova datoteka
      for (const file of files) {
        if (!file.mimetype.startsWith('image/')) {
          res.status(400).json({ message: 'Sve datoteke moraju biti slike' });
          return;
        }
      }
      
      // Učitavanje slika na Supabase Storage
      const uploadPromises = files.map(file => uploadToStorage(file, 'article-images'));
      const results = await Promise.all(uploadPromises);
      
      // Formatiranje rezultata
      const uploadedImages = results.map(result => ({
        url: result.url,
        path: result.path,
        bucket: result.bucket,
        contentType: result.contentType,
        size: result.size
      }));
      
      res.status(200).json({
        message: 'Slike uspješno uploadovane',
        images: uploadedImages
      });
      return;
    }
    
    // Upload profilne slike
    if (req.url === '/api/upload/profile') {
      // Parsiranje form-data sa slikom
      const files = await parseMultipartForm(req);
      
      if (!files || files.length === 0) {
        res.status(400).json({ message: 'Nijedna slika nije uploadovana' });
        return;
      }
      
      // Uzimamo samo prvu sliku
      const file = files[0];
      
      // Provjera tipa datoteke
      if (!file.mimetype.startsWith('image/')) {
        res.status(400).json({ message: 'Datoteka mora biti slika' });
        return;
      }
      
      // Učitavanje slike na Supabase Storage u poseban bucket za profilne slike
      const result = await uploadToStorage(file, 'profile-images');
      
      // Ažuriranje avatar_url u tabeli users
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: result.url })
        .eq('id', userId);
      
      if (updateError) throw updateError;
      
      res.status(200).json({
        message: 'Profilna slika uspješno uploadovana',
        url: result.url
      });
      return;
    }
    
    // Ako nijedna ruta ne odgovara
    res.status(404).json({ message: 'Ruta nije pronađena' });
    
  } catch (error) {
    console.error('Error:', error);
    
    if (error.name === 'MulterError') {
      // Multer greške (npr. prevelika datoteka)
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Interna serverska greška', error: error.message });
    }
  }
};
