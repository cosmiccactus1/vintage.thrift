import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm';

const supabaseUrl = 'https://kgphvhaizrmifmlxuukj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncGh2aGFpenJtaWZtbHh1dWtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MjgyNjgsImV4cCI6MjA1ODMwNDI2OH0.aKdMJsgDaIO-UoM9cgE1ahnEBFZqrmPxEOtyw1FZoIg';

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
