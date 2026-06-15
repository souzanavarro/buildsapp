import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let body;
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const { type = 'apk', path: explicitPath } = body;

    console.log(`Solicitação recebida: tipo=${type}, caminho=${explicitPath}`);

    let path = explicitPath
    let version = 'unknown'

    if (!path) {
      const { data: latestBuild, error: dbError } = await supabaseClient
        .from('app_builds')
        .select('storage_path, aab_storage_path, version')
        .eq('status', 'success')
        .not('storage_path', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (dbError) {
        console.error('Erro no banco de dados:', dbError);
        throw dbError;
      }

      if (!latestBuild) {
        console.log('Nenhum build interno com storage_path encontrado');
        return new Response(JSON.stringify({ error: 'Nenhum build interno encontrado. Certifique-se de que o arquivo foi enviado para o Storage.' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      path = type === 'aab' ? latestBuild.aab_storage_path : latestBuild.storage_path
      version = latestBuild.version
    }

    if (!path) {
      return new Response(JSON.stringify({ error: `Caminho do arquivo não encontrado para o tipo ${type}` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Gerando URL assinada para: ${path}`);

    // Generate a signed URL valid for 1 hour
    const { data: signedUrl, error: storageError } = await supabaseClient
      .storage
      .from('internal-apks')
      .createSignedUrl(path, 3600)

    if (storageError) {
      console.error('Erro no Storage:', storageError);
      return new Response(JSON.stringify({ error: `Erro ao acessar o arquivo no Storage: ${storageError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ 
      url: signedUrl.signedUrl,
      version: version,
      path: path,
      execution_id: crypto.randomUUID()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro inesperado:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      execution_id: crypto.randomUUID(),
      details: error.stack || 'No stack trace available'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
