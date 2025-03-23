// Vercel serverless funkcija za upravljanje narudžbama putem Supabase
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
  console.log('Orders API poziv primljen:', req.method, req.url);
  
  // Podešavanje CORS headera
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Provjera autentikacije (za sve metode)
    const userId = await verifyToken(req);
    
    if (!userId) {
      res.status(401).json({ message: 'Nije autorizovano' });
      return;
    }
    
    // GET /api/orders - Dohvaćanje svih narudžbi korisnika
    if (req.method === 'GET' && req.url === '/api/orders') {
      console.log('Dohvaćanje narudžbi za korisnika:', userId);
      
      // Dohvatanje narudžbi s podacima o artiklima
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Greška prilikom dohvatanja narudžbi:', error);
        throw error;
      }
      
      // Transformacija podataka za frontend
      const formattedOrders = orders.map(order => ({
        ...order,
        _id: order.id,
        items: order.order_items.map(item => ({
          ...item,
          _id: item.id
        }))
      }));
      
      res.status(200).json(formattedOrders);
      return;
    }
    
    // GET /api/orders/:id - Dohvaćanje jedne narudžbe
    if (req.method === 'GET' && req.url.match(/\/api\/orders\/([^\/]+)$/)) {
      const orderId = req.url.match(/\/api\/orders\/([^\/]+)$/)[1];
      
      // Dohvatanje narudžbe
      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', orderId)
        .eq('user_id', userId) // Osigurava da korisnik može vidjeti samo svoje narudžbe
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // Record not found error
          res.status(404).json({ message: 'Narudžba nije pronađena' });
        } else {
          throw error;
        }
        return;
      }
      
      // Transformacija za frontend
      const formattedOrder = {
        ...order,
        _id: order.id,
        items: order.order_items.map(item => ({
          ...item,
          _id: item.id
        }))
      };
      
      res.status(200).json(formattedOrder);
      return;
    }
    
    // POST /api/orders - Kreiranje nove narudžbe
    if (req.method === 'POST' && req.url === '/api/orders') {
      const body = await parseBody(req);
      
      // Validacija inputa
      if (!body.cartItems || !body.shippingAddress || !body.totalPrice) {
        res.status(400).json({ message: 'Nedostaju podaci za kreiranje narudžbe' });
        return;
      }
      
      // Korak 1: Kreiranje narudžbe
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          order_number: 'ORD-' + Date.now(),
          status: 'pending',
          total_price: body.totalPrice,
          shipping_address: body.shippingAddress
        })
        .select();
      
      if (error) throw error;
      
      if (!order || order.length === 0) {
        res.status(500).json({ message: 'Greška prilikom kreiranja narudžbe' });
        return;
      }
      
      // Korak 2: Kreiranje stavki narudžbe
      const orderItems = body.cartItems.map(item => ({
        order_id: order[0].id,
        article_id: item.id || item._id,
        title: item.title,
        price: item.price,
        size: item.size,
        image: item.images && item.images.length > 0 ? item.images[0] : null
      }));
      
      const { error: orderItemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (orderItemsError) throw orderItemsError;
      
      // Korak 3: Pražnjenje korpe korisnika
      const { error: clearCartError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);
      
      if (clearCartError) throw clearCartError;
      
      // Dohvaćanje kompletne narudžbe s artiklima za odgovor
      const { data: completeOrder, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', order[0].id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Transformacija za frontend
      const formattedOrder = {
        ...completeOrder,
        _id: completeOrder.id,
        items: completeOrder.order_items.map(item => ({
          ...item,
          _id: item.id
        }))
      };
      
      res.status(201).json(formattedOrder);
      return;
    }
    
    // PUT /api/orders/:id - Ažuriranje statusa narudžbe
    if (req.method === 'PUT' && req.url.match(/\/api\/orders\/([^\/]+)$/)) {
      const orderId = req.url.match(/\/api\/orders\/([^\/]+)$/)[1];
      const body = await parseBody(req);
      
      // Validacija inputa
      if (!body.status) {
        res.status(400).json({ message: 'Status je obavezan' });
        return;
      }
      
      // Provjera postoji li narudžba i pripada li korisniku
      const { data: existingOrder, error: checkError } = await supabase
        .from('orders')
        .select('id')
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();
      
      if (checkError) {
        if (checkError.code === 'PGRST116') { // Record not found error
          res.status(404).json({ message: 'Narudžba nije pronađena' });
        } else {
          throw checkError;
        }
        return;
      }
      
      // Ažuriranje statusa narudžbe
      const { data: updatedOrder, error } = await supabase
        .from('orders')
        .update({ status: body.status })
        .eq('id', orderId)
        .select();
      
      if (error) throw error;
      
      res.status(200).json({
        ...updatedOrder[0],
        _id: updatedOrder[0].id
      });
      return;
    }
    
    // Ako nijedna ruta ne odgovara
    res.status(404).json({ message: 'Ruta nije pronađena' });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Interna serverska greška', error: error.message });
  }
};
