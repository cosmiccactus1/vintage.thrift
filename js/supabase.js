// js/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm'

// Supabase konfiguracija
const supabaseUrl = 'VAŠA_SUPABASE_URL' // npr. 'https://abcdefghijklm.supabase.co'
const supabaseKey = 'VAŠ_SUPABASE_ANON_KEY' // javni anonimni ključ

// Kreiraj Supabase klijent
const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase
