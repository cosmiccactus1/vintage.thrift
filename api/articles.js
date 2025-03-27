// Vercel serverless funkcija za upravljanje artiklima putem Supabase
const { createClient } = require('@supabase/supabase-js');
const busboy = require('busboy');

// Konfiguracija Supabase klijenta
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper funkcija za parsiranje multipart forme
function parseMultipartFormData(req) {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers });
    const formData = {};

    bb.on('field', (name, val) => {
      formData[name] = val;
    });

    bb.on('file', (name, file, info) => {
      const chunks = [];
      file.on('data', (chunk) => {
        chunks.push(chunk);
      });
      file.on('end', () => {
        formData[name] = {
          filename: info.filename,
          data: Buffer.concat(chunks)
        };
      });
    });

    bb.on('close', () => {
      resolve(formData);
    });

    bb.on('error', (err) => {
      reject(err);
    });

    req.pipe(bb);
  });
}

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

  // NOVA LINIJA: Provjeri za URL pattern /user/{userId}
  const userMatch = req.url.match(/\/user\/([^\/]+)/);
  if (userMatch && userMatch[1]) {
    console.log('Pronađen user ID regex-om:', userMatch[1]);
    return {
      type: 'user_articles',
      userId: userMatch[1]
    };
  }

  const urlParts = req.url.split('/').filter(Boolean);
  console.log('URL dijelovi:', urlParts);
  
  // Ako URL sadrži /user/ to znači da je ruta /api/articles/user/:userId
  if (urlParts.length >= 2 && urlParts[0] === 'user') {
    console.log('Pronađen user ID iz urlParts:', urlParts[1]);
    return {
      type: 'user_articles',
      userId: urlParts[1]
    };
  }
  
  // Ako URL sadrži /draft, to je za draft artikle
  if (urlParts.length >= 1 && urlParts[0] === 'draft') {
    return {
      type: 'draft'
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
        // Početni query - dohvaćamo samo aktivne artikle
        let query = supabase
          .from('articles')
          .select('*')
          .eq('status', 'active');
        
        // Dodavanje filtera ako postoje u query parametrima
        if (req.query) {
          // Filter po kategoriji
          if (req.query.category && req.query.category !== 'sve') {
            query = query.eq('category', req.query.category);
          }
          
          // Filter po sezoni
          if (req.query.season && req.query.season !== 'sve') {
            query = query.eq('season', req.query.season);
          }
          
          // Filter po brandu
          if (req.query.brand) {
            query = query.eq('brand', req.query.brand);
          }
        }
        
        const { data: articles, error } = await query;
        
        if (error) throw error;
        
        // Transformacija ID-a za kompatibilnost (id -> _id) i parsiranje images
        const formattedArticles = articles.map(article => ({
          ...article,
          _id: article.id,
          images: article.images ? JSON.parse(article.images) : []
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
        
        // Transformacija ID-a za kompatibilnost (id -> _id) i parsiranje images
        article._id = article.id;
        article.images = article.images ? JSON.parse(article.images) : [];
        
        res.status(200).json(article);
        return;
      }
      
      // Dohvaćanje artikala korisnika
      if (parsedURL.type === 'user_articles') {
        console.log('DOHVAĆAM ARTIKLE ZA KORISNIKA:', parsedURL.userId);
        
        // Priprema osnovne query s filterom po user_id
        let query = supabase
          .from('articles')
          .select('*')
          .eq('user_id', parsedURL.userId);
        
        console.log('Query postavljen s filterom: user_id =', parsedURL.userId);
        
        // Provjera autentikacije
        const authUserId = await verifyToken(req);
        
        // Ako korisnik nije vlasnik artikala, prikaži samo aktivne artikle
        if (!authUserId || authUserId !== parsedURL.userId) {
          query = query.eq('status', 'active');
        }
        
        const { data: articles, error } = await query;
        
        console.log('Broj pronađenih artikala:', articles ? articles.length : 0);
        console.log('Greška:', error);
        
        if (error) throw error;
        
        // Transformacija ID-a za kompatibilnost (id -> _id) i parsiranje images
        const formattedArticles = articles.map(article => ({
          ...article,
          _id: article.id,
          images: article.images ? JSON.parse(article.images) : []
        }));
        
        res.status(200).json(formattedArticles);
        return;
      }
    }
    
    // POST metoda - kreiranje novog artikla
    if (req.method === 'POST') {
      // Za draft i aktivne artikle
      if (parsedURL.type === 'all_articles' || parsedURL.type === 'draft') {
        const userId = await verifyToken(req);
        if (!userId) {
          res.status(401).json({ message: 'Nije autorizovano' });
          return;
        }

        // Parsiranje tijela zahtjeva (ako je multipart/form-data)
        const formData = await parseMultipartFormData(req);
        
        const { 
          title, 
          description, 
          price, 
          category,
          size,
          season,
          condition,
          color,
          brand,
          location,
          status = 'active', 
          userId: payloadUserId 
        } = formData;

        // Provjera podudaranja korisničkog ID-a
        if (userId !== payloadUserId) {
          res.status(403).json({ message: 'Nemate dozvolu za kreiranje artikla' });
          return;
        }

        // Priprema slika (ako postoje)
        const images = Object.keys(formData)
          .filter(key => key.startsWith('image'))
          .map(key => formData[key]);

        // Array koji će sadržavati URL-ove slika
        let imageUrls = [];

        // Upload slika u Supabase Storage
        if (images && images.length > 0) {
          try {
            for (const image of images) {
              if (!image || !image.data) {
                console.log('Invalid image data', image);
                continue;
              }

              // Generiraj jedinstveno ime datoteke
              const fileName = `${userId}/${Date.now()}-${image.filename}`;
              
              console.log(`Uploading image: ${fileName}`);
              
              // Upload datoteke u bucket
              const { data: storageData, error: storageError } = await supabase
                .storage
                .from('article-images')
                .upload(fileName, image.data, {
                  contentType: 'image/*',
                  upsert: true
                });
                
              if (storageError) {
                console.error('Error uploading image:', storageError);
                continue;
              }
              
              console.log('Upload successful:', fileName);
              
              // Dohvati javni URL slike
              const { data: publicUrlData } = supabase
                .storage
                .from('article-images')
                .getPublicUrl(fileName);
                
              imageUrls.push(publicUrlData.publicUrl);
              console.log('Added public URL:', publicUrlData.publicUrl);
            }
          } catch (error) {
            console.error('Error in image upload process:', error);
          }
        }

        console.log('Final image URLs:', imageUrls);

        // Kreiranje artikla u Supabase
        const { data, error } = await supabase
          .from('articles')
          .insert({
            title,
            description,
            price: parseFloat(price),
            category,
            size,
            season,
            condition,
            color,
            brand,
            location,
            status,
            user_id: userId,
            images: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null
          })
          .select();

        if (error) {
          console.error('Greška pri kreiranju artikla:', error);
          res.status(400).json({ 
            message: 'Greška prilikom kreiranja artikla', 
            error: error.message 
          });
          return;
        }

        // Parsiranje images prije slanja odgovora
        if (data && data.length > 0 && data[0].images) {
          data[0].images = JSON.parse(data[0].images);
        }

        res.status(201).json(data[0]);
        return;
      }
    }
    
    // Za ostale operacije (PUT, DELETE) zahtijeva se autentikacija
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
        .select('user_id, images')
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
      
      // Brisanje slika iz storage-a
      if (article.images) {
        try {
          const imageUrls = JSON.parse(article.images);
          
          for (const url of imageUrls) {
            // Izdvajanje imena datoteke iz URL-a
            const urlParts = url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const path = `${userId}/${fileName}`;
            
            // Brisanje datoteke
            const { error: deleteStorageError } = await supabase
              .storage
              .from('article-images')
              .remove([path]);
              
            if (deleteStorageError) {
              console.error('Error deleting image from storage:', deleteStorageError);
            }
          }
        } catch (error) {
          console.error('Error processing images for deletion:', error);
        }
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
    
    // Ako nijedna ruta ne odgovara
    res.status(404).json({ message: 'Ruta nije pronađena' });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Interna serverska greška', error: error.message });
  }
};
