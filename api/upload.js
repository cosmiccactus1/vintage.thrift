// Vercel serverless funkcija za upload slika
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { Readable } = require('stream');
const cloudinary = require('cloudinary').v2;

// Konfiguracija Cloudinary-a za upload slika
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper funkcija za verifikaciju JWT tokena
function verifyToken(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
  } catch (error) {
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

// Helper funkcija za upload slike na Cloudinary
async function uploadToCloudinary(file, folder = 'vintage_thrift_store') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);
    bufferStream.pipe(stream);
  });
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
    const userId = verifyToken(req);
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
      
      // Učitavanje slike na Cloudinary
      const result = await uploadToCloudinary(file);
      
      res.status(200).json({
        message: 'Slika uspješno uploadovana',
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format
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
      
      // Učitavanje slika na Cloudinary
      const uploadPromises = files.map(file => uploadToCloudinary(file));
      const results = await Promise.all(uploadPromises);
      
      const uploadedImages = results.map(result => ({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format
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
      
      // Učitavanje slike na Cloudinary u poseban folder za profilne slike
      const result = await uploadToCloudinary(file, 'vintage_thrift_store/profiles');
      
      res.status(200).json({
        message: 'Profilna slika uspješno uploadovana',
        url: result.secure_url,
        publicId: result.public_id
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
