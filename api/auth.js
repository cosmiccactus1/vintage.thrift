// Vercel serverless funkcija za autentikaciju
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Konfiguracija MongoDB konekcije
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'vintage_thrift_store';

// Helper funkcija za konekciju na MongoDB
async function connectToDatabase() {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  return client.db(dbName);
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');

    // POST /api/auth/register - Registracija korisnika
    if (req.method === 'POST' && req.url === '/api/auth/register') {
      const body = await parseBody(req);
      
      // Validacija inputa
      if (!body.username || !body.email || !body.password) {
        res.status(400).json({ message: 'Sva polja su obavezna' });
        return;
      }
      
      // Provjera postojanja korisnika
      const existingUser = await usersCollection.findOne({
        $or: [
          { username: body.username },
          { email: body.email }
        ]
      });
      
      if (existingUser) {
        if (existingUser.username === body.username) {
          res.status(400).json({ message: 'Korisničko ime je već zauzeto' });
        } else {
          res.status(400).json({ message: 'Email adresa je već u upotrebi' });
        }
        return;
      }
      
      // Hashiranje šifre
      const hashedPassword = await bcrypt.hash(body.password, 10);
      
      // Kreiranje korisnika
      const newUser = {
        username: body.username,
        email: body.email,
        password: hashedPassword,
        avatar: body.avatar || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await usersCollection.insertOne(newUser);
      
      // Kreiranje JWT tokena
      const token = jwt.sign(
        { userId: result.insertedId.toString() },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      // Vraćanje korisnika bez šifre
      const { password, ...userWithoutPassword } = newUser;
      
      res.status(201).json({
        message: 'Registracija uspješna',
        user: {
          ...userWithoutPassword,
          id: result.insertedId.toString()
        },
        token
      });
      return;
    }
    
    // POST /api/auth/login - Prijava korisnika
    if (req.method === 'POST' && req.url === '/api/auth/login') {
      const body = await parseBody(req);
      
      // Validacija inputa
      if (!body.email || !body.password) {
        res.status(400).json({ message: 'Sva polja su obavezna' });
        return;
      }
      
      // Provjera postojanja korisnika
      const user = await usersCollection.findOne({ email: body.email });
      
      if (!user) {
        res.status(401).json({ message: 'Neispravni podaci za prijavu' });
        return;
      }
      
      // Provjera šifre
      const isPasswordValid = await bcrypt.compare(body.password, user.password);
      
      if (!isPasswordValid) {
        res.status(401).json({ message: 'Neispravni podaci za prijavu' });
        return;
      }
      
      // Kreiranje JWT tokena
      const token = jwt.sign(
        { userId: user._id.toString() },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      // Vraćanje korisnika bez šifre
      const { password, ...userWithoutPassword } = user;
      
      res.status(200).json({
        message: 'Prijava uspješna',
        user: {
          ...userWithoutPassword,
          id: user._id.toString()
        },
        token
      });
      return;
    }
    
    // GET /api/auth/validate-token - Validacija tokena
    if (req.method === 'GET' && req.url === '/api/auth/validate-token') {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Nije autorizovano' });
        return;
      }
      
      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Provjera postojanja korisnika
        const user = await usersCollection.findOne({
          _id: new ObjectId(decoded.userId)
        });
        
        if (!user) {
          res.status(401).json({ message: 'Korisnik ne postoji' });
          return;
        }
        
        // Token je validan
        res.status(200).json({ valid: true });
      } catch (error) {
        res.status(401).json({ message: 'Neispravan token', valid: false });
      }
      
      return;
    }
    
    // POST /api/auth/change-password - Promjena šifre
    if (req.method === 'POST' && req.url === '/api/auth/change-password') {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Nije autorizovano' });
        return;
      }
      
      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const body = await parseBody(req);
        
        // Validacija inputa
        if (!body.currentPassword || !body.newPassword) {
          res.status(400).json({ message: 'Sva polja su obavezna' });
          return;
        }
        
        // Provjera postojanja korisnika
        const user = await usersCollection.findOne({
          _id: new ObjectId(decoded.userId)
        });
        
        if (!user) {
          res.status(401).json({ message: 'Korisnik ne postoji' });
          return;
        }
        
        // Provjera trenutne šifre
        const isPasswordValid = await bcrypt.compare(body.currentPassword, user.password);
        
        if (!isPasswordValid) {
          res.status(401).json({ message: 'Trenutna šifra nije ispravna' });
          return;
        }
        
        // Hashiranje nove šifre
        const hashedPassword = await bcrypt.hash(body.newPassword, 10);
        
        // Ažuriranje šifre
        await usersCollection.updateOne(
          { _id: new ObjectId(decoded.userId) },
          {
            $set: {
              password: hashedPassword,
              updatedAt: new Date()
            }
          }
        );
        
        res.status(200).json({ message: 'Šifra je uspješno promijenjena' });
      } catch (error) {
        res.status(401).json({ message: 'Neispravan token' });
      }
      
      return;
    }
    
    // POST /api/auth/forgot-password - Zahtjev za resetiranje šifre
    if (req.method === 'POST' && req.url === '/api/auth/forgot-password') {
      const body = await parseBody(req);
      
      // Validacija inputa
      if (!body.email) {
        res.status(400).json({ message: 'Email je obavezan' });
        return;
      }
      
      // Provjera postojanja korisnika
      const user = await usersCollection.findOne({ email: body.email });
      
      if (!user) {
        // Iz sigurnosnih razloga, ne otkrivamo da li korisnik postoji
        res.status(200).json({ message: 'Ako korisnik postoji, link za resetiranje šifre će biti poslan na email' });
        return;
      }
      
      // Kreiranje reset tokena
      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const resetTokenExpiry = new Date();
      resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token važeći 1 sat
      
      // Spremanje tokena u bazu
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            resetToken,
            resetTokenExpiry,
            updatedAt: new Date()
          }
        }
      );
      
      // U pravoj implementaciji, ovdje bi poslali email s linkom za resetiranje
      console.log(`Reset token za ${user.email}: ${resetToken}`);
      
      res.status(200).json({ message: 'Ako korisnik postoji, link za resetiranje šifre će biti poslan na email' });
      return;
    }
    
    // POST /api/auth/reset-password - Resetiranje šifre
    if (req.method === 'POST' && req.url === '/api/auth/reset-password') {
      const body = await parseBody(req);
      
      // Validacija inputa
      if (!body.token || !body.password) {
        res.status(400).json({ message: 'Sva polja su obavezna' });
        return;
      }
      
      // Provjera tokena
      const user = await usersCollection.findOne({
        resetToken: body.token,
        resetTokenExpiry: { $gt: new Date() }
      });
      
      if (!user) {
        res.status(400).json({ message: 'Neispravan ili istekao token za resetiranje šifre' });
        return;
      }
      
      // Hashiranje nove šifre
      const hashedPassword = await bcrypt.hash(body.password, 10);
      
      // Ažuriranje šifre i uklanjanje reset tokena
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            password: hashedPassword,
            updatedAt: new Date()
          },
          $unset: {
            resetToken: '',
            resetTokenExpiry: ''
          }
        }
      );
      
      res.status(200).json({ message: 'Šifra je uspješno resetirana' });
      return;
    }
    
    // POST /api/auth/logout - Odjava korisnika
    if (req.method === 'POST' && req.url === '/api/auth/logout') {
      // U serverless implementaciji, logout je većinom klijentska akcija
      // Ovdje možemo implementirati blacklisting tokena ako je potrebno
      
      res.status(200).json({ message: 'Uspješna odjava' });
      return;
    }
    
    // Ako nijedna ruta ne odgovara
    res.status(404).json({ message: 'Ruta nije pronađena' });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Interna serverska greška', error: error.message });
  }
};
