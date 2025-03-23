// Vercel serverless funkcija za upravljanje artiklima
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { Readable } = require('stream');
const cloudinary = require('cloudinary').v2;

// Konfiguracija MongoDB konekcije
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'vintage_thrift_store';

// Konfiguracija Cloudinary-a za upload slika
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper funkcija za konekciju na MongoDB
async function connectToDatabase() {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  return client.db(dbName);
}

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

// Helper funkcija za upload slika na Cloudinary
async function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'vintage_thrift_store' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const db = await connectToDatabase();
    const articlesCollection = db.collection('articles');
    
    // GET /api/articles - Dohvaćanje svih artikala
    if (req.method === 'GET' && req.url === '/api/articles') {
      const articles = await articlesCollection.find({ status: 'active' }).toArray();
      res.status(200).json(articles);
      return;
    }
    
    // GET /api/articles/:id - Dohvaćanje jednog artikla
    if (req.method === 'GET' && req.url.match(/\/api\/articles\/[a-zA-Z0-9]+$/)) {
      const id = req.url.split('/').pop();
      
      if (!ObjectId.isValid(id)) {
        res.status(400).json({ message: 'Neispravan ID artikla' });
        return;
      }
      
      const article = await articlesCollection.findOne({ _id: new ObjectId(id) });
      
      if (!article) {
        res.status(404).json({ message: 'Artikal nije pronađen' });
        return;
      }
      
      res.status(200).json(article);
      return;
    }
    
    // GET /api/articles/user/:id - Dohvaćanje artikala određenog korisnika
    if (req.method === 'GET' && req.url.match(/\/api\/articles\/user\/[a-zA-Z0-9]+$/)) {
      const userId = req.url.split('/').pop();
      const articles = await articlesCollection.find({ userId }).toArray();
      res.status(200).json(articles);
      return;
    }
    
    // POST /api/articles - Kreiranje novog artikla
    if (req.method === 'POST' && req.url === '/api/articles') {
      // Provjera autentikacije
      const userId = verifyToken(req);
      if (!userId) {
        res.status(401).json({ message: 'Nije autorizovano' });
        return;
      }
      
      // Parsiranje form-data sa slikama
      const files = await parseMultipartForm(req);
      
      // Učitavanje slika na Cloudinary
      const imageUrls = [];
      for (const file of files) {
        const imageUrl = await uploadToCloudinary(file);
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
        userId: req.body.userId,
        status: req.body.status || 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await articlesCollection.insertOne(articleData);
      
      res.status(201).json({
        ...articleData,
        _id: result.insertedId
      });
      return;
    }
    
    // POST /api/articles/draft - Kreiranje nacrta artikla
    if (req.method === 'POST' && req.url === '/api/articles/draft') {
      // Provjera autentikacije
      const userId = verifyToken(req);
      if (!userId) {
        res.status(401).json({ message: 'Nije autorizovano' });
        return;
      }
      
      // Parsiranje form-data sa slikama
      const files = await parseMultipartForm(req);
      
      // Učitavanje slika na Cloudinary
      const imageUrls = [];
      for (const file of files) {
        const imageUrl = await uploadToCloudinary(file);
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
        userId: req.body.userId,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await articlesCollection.insertOne(draftData);
      
      res.status(201).json({
        ...draftData,
        _id: result.insertedId
      });
      return;
    }
    
    // PUT /api/articles/:id - Ažuriranje artikla
    if (req.method === 'PUT' && req.url.match(/\/api\/articles\/[a-zA-Z0-9]+$/)) {
      // Provjera autentikacije
      const userId = verifyToken(req);
      if (!userId) {
        res.status(401).json({ message: 'Nije autorizovano' });
        return;
      }
      
      const id = req.url.split('/').pop();
      
      if (!ObjectId.isValid(id)) {
        res.status(400).json({ message: 'Neispravan ID artikla' });
        return;
      }
      
      // Dohvatanje postojećeg artikla
      const article = await articlesCollection.findOne({ _id: new ObjectId(id) });
      
      if (!article) {
        res.status(404).json({ message: 'Artikal nije pronađen' });
        return;
      }
      
      // Provjera je li korisnik vlasnik artikla
      if (article.userId !== userId) {
        res.status(403).json({ message: 'Nemate dozvolu za ažuriranje ovog artikla' });
        return;
      }
      
      // Parsiranje form-data sa slikama
      const files = await parseMultipartForm(req);
      
      // Učitavanje novih slika na Cloudinary
      let imageUrls = article.images || [];
      
      if (files && files.length > 0) {
        // Ako su poslane nove slike, učitaj ih
        const newImageUrls = [];
        for (const file of files) {
          const imageUrl = await uploadToCloudinary(file);
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
        updatedAt: new Date()
      };
      
      await articlesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
      
      res.status(200).json({
        ...updateData,
        _id: id,
        userId: article.userId,
        createdAt: article.createdAt
      });
      return;
    }
    
    // DELETE /api/articles/:id - Brisanje artikla
    if (req.method === 'DELETE' && req.url.match(/\/api\/articles\/[a-zA-Z0-9]+$/)) {
      // Provjera autentikacije
      const userId = verifyToken(req);
      if (!userId) {
        res.status(401).json({ message: 'Nije autorizovano' });
        return;
      }
      
      const id = req.url.split('/').pop();
      
      if (!ObjectId.isValid(id)) {
        res.status(400).json({ message: 'Neispravan ID artikla' });
        return;
      }
      
      // Dohvatanje postojećeg artikla
      const article = await articlesCollection.findOne({ _id: new ObjectId(id) });
      
      if (!article) {
        res.status(404).json({ message: 'Artikal nije pronađen' });
        return;
      }
      
      // Provjera je li korisnik vlasnik artikla
      if (article.userId !== userId) {
        res.status(403).json({ message: 'Nemate dozvolu za brisanje ovog artikla' });
        return;
      }
      
      await articlesCollection.deleteOne({ _id: new ObjectId(id) });
      
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
