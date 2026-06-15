import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { apk_url, version, storage_path } = await req.json()

    // Get Telegram settings
    const { data: settings, error: settingsError } = await supabase
      .from('telegram_settings')
      .select('bot_token, chat_id')
      .eq('is_active', true)
      .single()

    if (settingsError || !settings) {
      throw new Error('Configurações do Telegram não encontradas ou inativas')
    }

    const { bot_token, chat_id } = settings

    let apkBlob: Blob | null = null

    // 1. Try to download from Supabase Storage first if storage_path is provided
    if (storage_path) {
      console.log(`Attempting to download APK from Supabase Storage: ${storage_path}`)
      const { data: storageData, error: storageError } = await supabase
        .storage
        .from('app-builds')
        .download(storage_path.replace('app-builds/', ''))

      if (storageData && !storageError) {
        apkBlob = storageData
        console.log('Successfully downloaded APK from Supabase Storage')
      } else {
        console.warn(`Failed to download from Supabase Storage: ${storageError?.message}. Falling back to GitHub.`)
      }
    }

    // 2. Fallback to GitHub if Storage failed or was not provided
    if (!apkBlob) {
      console.log(`Downloading APK from GitHub: ${apk_url}`)
      const githubToken = Deno.env.get('GITHUB_TOKEN_ACTION')
      
      let currentUrl = apk_url
      let apkResponse: Response | null = null
      const maxRedirects = 3
      
      for (let i = 0; i < maxRedirects; i++) {
        const fetchHeaders: Record<string, string> = {
          'User-Agent': 'Supabase-Edge-Function',
          'Accept': 'application/octet-stream'
        }
        
        if (githubToken && currentUrl.includes('api.github.com')) {
          fetchHeaders['Authorization'] = `token ${githubToken}`
        } else if (githubToken && currentUrl.includes('github.com')) {
          fetchHeaders['Authorization'] = `token ${githubToken}`
        }

        apkResponse = await fetch(currentUrl, {
          headers: fetchHeaders,
          redirect: 'manual'
        })
        
        if (apkResponse.status >= 300 && apkResponse.status < 400) {
          const location = apkResponse.headers.get('location')
          if (location) {
            currentUrl = location
            console.log(`Redirecting to: ${currentUrl}`)
            continue
          }
        }
        break
      }
      
      if (!apkResponse || !apkResponse.ok) {
        const errorText = apkResponse ? await apkResponse.text() : 'No response'
        const status = apkResponse ? apkResponse.status : 'N/A'
        console.error(`GitHub Download Error: ${status} ${errorText}`)
        throw new Error(`Falha ao baixar APK do GitHub (${status}). Verifique o acesso ao repositório ou se a versão ainda existe no GitHub Releases.`)
      }
      apkBlob = await apkResponse.blob()
    }

    if (!apkBlob) {
      throw new Error('Não foi possível obter o arquivo APK.')
    }

    // 3. Send to Telegram as document
    const formData = new FormData()
    formData.append('chat_id', chat_id)
    formData.append('document', apkBlob, `RotaCerta-v${version}.apk`)
    formData.append('caption', `📦 *APK Reenviado*\nVersão: ${version}\nEnviado via Painel Administrativo.`)
    formData.append('parse_mode', 'Markdown')

    const telegramResponse = await fetch(`https://api.telegram.org/bot${bot_token}/sendDocument`, {
      method: 'POST',
      body: formData,
    })

    const result = await telegramResponse.json()

    if (!result.ok) {
      throw new Error(`Erro do Telegram: ${result.description}`)
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
