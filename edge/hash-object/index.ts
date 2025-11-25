import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'application/pdf': [0x25, 0x50, 0x44, 0x46]
};

function verifyMimeType(buffer: ArrayBuffer, declaredMime: string): boolean {
  const bytes = new Uint8Array(buffer);
  const magicBytes = MAGIC_BYTES[declaredMime];
  
  if (!magicBytes) return false;
  return magicBytes.every((byte, i) => bytes[i] === byte);
}

serve(async (req) => {
  // Only allow POST requests with proper authorization
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!authHeader || !authHeader.includes(serviceKey!)) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { path } = await req.json();
    
    if (!path) {
      return new Response(
        JSON.stringify({ error: 'Path is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, serviceKey!);
    
    // Download the file
    const { data, error } = await supabase.storage
      .from('private')
      .download(path);
    
    if (error || !data) {
      return new Response(
        JSON.stringify({ error: 'File not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Read file and compute hash
    const arrayBuffer = await data.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return new Response(
      JSON.stringify({ 
        sha256,
        size: arrayBuffer.byteLength 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});