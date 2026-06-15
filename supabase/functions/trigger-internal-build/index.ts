import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const authHeader = req.headers.get('Authorization')

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration')
      return new Response(JSON.stringify({ error: 'Internal server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!authHeader) {
      console.error('Missing Authorization header')
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Validate user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Unauthorized', details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Build requested by user: ${user.email} (${user.id})`)

    // Check permissions
    const { data: role, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError) {
      console.error('Role check error:', roleError)
      return new Response(JSON.stringify({ error: 'Error checking permissions', details: roleError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!role) {
      console.warn(`User ${user.email} attempted to trigger build without admin role`)
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const githubToken = Deno.env.get('GITHUB_TOKEN_ACTION')
    const githubRepo = Deno.env.get('GITHUB_REPO') || "souzanavarro/rotacerta"
    const githubBranch = Deno.env.get('GITHUB_BRANCH') || "main"

    if (!githubToken) {
      console.error('GITHUB_TOKEN_ACTION is missing')
      return new Response(JSON.stringify({ 
        error: 'GITHUB_TOKEN_ACTION is missing. Please add it to project secrets.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Register initial record
    const { data: build, error: insertError } = await supabaseClient
      .from('app_builds')
      .insert([{
        status: 'pending',
        version: 'Iniciando...',
        logs: [{ 
          event: 'build_triggered', 
          timestamp: new Date().toISOString(), 
          details: `Build requested by ${user.email}` 
        }]
      }])
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting build record:', insertError)
      return new Response(JSON.stringify({ error: 'Falhou ao iniciar registro de build no banco', details: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Triggering GitHub workflow for ${githubRepo} on branch ${githubBranch} (Build ID: ${build.id})`)

    // Trigger workflow with build_id
    const triggerResponse = await fetch(
      `https://api.github.com/repos/${githubRepo}/actions/workflows/android-build.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          'User-Agent': 'Supabase-Edge-Function'
        },
        body: JSON.stringify({ 
          ref: githubBranch,
          inputs: {
            build_id: build.id
          }
        }),
      }
    )

    if (!triggerResponse.ok) {
      const errorText = await triggerResponse.text()
      console.error(`GitHub API error (${triggerResponse.status}):`, errorText)
      
      // Update build record with error
      await supabaseClient
        .from('app_builds')
        .update({ 
          status: 'error', 
          error_message: `GitHub trigger error: ${triggerResponse.status} ${errorText}` 
        })
        .eq('id', build.id)

      return new Response(JSON.stringify({ 
        error: `GitHub trigger error: ${triggerResponse.status}`,
        details: errorText 
      }), {
        status: triggerResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('GitHub workflow triggered successfully')

    return new Response(JSON.stringify({ message: 'Build iniciado com sucesso', build }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})