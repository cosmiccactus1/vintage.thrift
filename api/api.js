// js/api.js
import supabase from './supabase.js'

// Autentikacija
export async function registerUser(userData) {
  const { data, error } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
    options: {
      data: {
        username: userData.username,
        avatar_url: userData.avatar_url,
      }
    }
  })
  
  if (error) throw error
  
  // Kad se korisnik registrira, dodajemo ga i u users tablicu
  if (data.user) {
    await supabase.from('users').insert({
      id: data.user.id,
      username: userData.username,
      email: userData.email,
      password: 'hashed', // Supabase Auth već čuva hashiranu lozinku
      avatar_url: userData.avatar_url
    })
  }
  
  return data
}

export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  
  // Dohvati dodatne podatke o korisniku
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single()
  
  // Spremi podatke u localStorage
  localStorage.setItem('prijavljeniKorisnik', JSON.stringify({
    id: data.user.id,
    email: data.user.email,
    username: userData.username,
    avatar_url: userData.avatar_url
  }))
  
  return data
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut()
  
  if (error) throw error
  
  localStorage.removeItem('prijavljeniKorisnik')
}

// Artikli
export async function fetchArticles() {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'active')
  
  if (error) throw error
  
  return data
}

export async function fetchArticle(id) {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  
  return data
}

export async function createArticle(articleData) {
  const { data, error } = await supabase
    .from('articles')
    .insert([articleData])
    .select()
  
  if (error) throw error
  
  return data[0]
}

export async function updateArticle(id, articleData) {
  const { data, error } = await supabase
    .from('articles')
    .update(articleData)
    .eq('id', id)
    .select()
  
  if (error) throw error
  
  return data[0]
}

export async function deleteArticle(id) {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id)
  
  if (error) throw error
  
  return true
}

// Favoriti
export async function fetchFavorites() {
  const { data: favorites, error } = await supabase
    .from('favorites')
    .select(`
      article_id,
      articles (*)
    `)
  
  if (error) throw error
  
  // Preformatiramo podatke da odgovaraju očekivanom formatu
  return favorites.map(fav => ({
    ...fav.articles,
    _id: fav.articles.id,
    favorite: true
  }))
}

export async function checkFavoriteStatus(articleId) {
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('article_id', articleId)
    .maybeSingle()
  
  if (error) throw error
  
  return { isFavorite: !!data }
}

export async function addToFavorites(articleId) {
  const user = JSON.parse(localStorage.getItem('prijavljeniKorisnik'))
  
  const { error } = await supabase
    .from('favorites')
    .insert({
      user_id: user.id,
      article_id: articleId
    })
  
  if (error) throw error
  
  return true
}

export async function removeFromFavorites(articleId) {
  const user = JSON.parse(localStorage.getItem('prijavljeniKorisnik'))
  
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('article_id', articleId)
  
  if (error) throw error
  
  return true
}

// Korpa
export async function fetchCartItems() {
  const { data: cartItems, error } = await supabase
    .from('cart_items')
    .select(`
      article_id,
      articles (*)
    `)
  
  if (error) throw error
  
  // Preformatiramo podatke
  return cartItems.map(item => ({
    ...item.articles,
    _id: item.articles.id,
    inCart: true
  }))
}

export async function checkCartStatus(articleId) {
  const { data, error } = await supabase
    .from('cart_items')
    .select('*')
    .eq('article_id', articleId)
    .maybeSingle()
  
  if (error) throw error
  
  return { isInCart: !!data }
}

export async function addToCart(articleId) {
  const user = JSON.parse(localStorage.getItem('prijavljeniKorisnik'))
  
  const { error } = await supabase
    .from('cart_items')
    .insert({
      user_id: user.id,
      article_id: articleId
    })
  
  if (error) throw error
  
  return true
}

export async function removeFromCart(articleId) {
  const user = JSON.parse(localStorage.getItem('prijavljeniKorisnik'))
  
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', user.id)
    .eq('article_id', articleId)
  
  if (error) throw error
  
  return true
}

// Narudžbe
export async function createOrder(orderData, cartItems) {
  const user = JSON.parse(localStorage.getItem('prijavljeniKorisnik'))
  
  // Korak 1: Kreiraj narudžbu
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      order_number: 'ORD-' + Date.now(),
      status: 'pending',
      total_price: orderData.totalPrice,
      shipping_address: orderData.shippingAddress
    })
    .select()
  
  if (error) throw error
  
  // Korak 2: Dodaj artikle u narudžbu
  const orderItems = cartItems.map(item => ({
    order_id: order[0].id,
    article_id: item.id,
    title: item.title,
    price: item.price,
    size: item.size,
    image: item.images[0]
  }))
  
  const { error: orderItemsError } = await supabase
    .from('order_items')
    .insert(orderItems)
  
  if (orderItemsError) throw orderItemsError
  
  // Korak 3: Obriši artikle iz korpe
  const { error: clearCartError } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', user.id)
  
  if (clearCartError) throw clearCartError
  
  return order[0]
}

export async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (*)
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  
  // Transformiramo podatke za frontend
  return data.map(order => ({
    ...order,
    _id: order.id,
    items: order.order_items.map(item => ({
      ...item,
      _id: item.id
    }))
  }))
}

// Upload slika
export async function uploadImage(file) {
  const fileName = `${Date.now()}_${file.name}`
  
  // Upload na Supabase Storage
  const { data, error } = await supabase.storage
    .from('article-images')
    .upload(fileName, file)
  
  if (error) throw error
  
  // Dohvati javni URL slike
  const { data: { publicUrl } } = supabase.storage
    .from('article-images')
    .getPublicUrl(fileName)
  
  return publicUrl
}
