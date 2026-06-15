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
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify user JWT manually since we are using service_role for the client
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Unauthorized', details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!roles) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { repository_id, version_name, version_code } = await req.json()
    
    let githubRepo = Deno.env.get('GITHUB_REPO') || "souzanavarro/buildsapp"
    let githubBranch = Deno.env.get('GITHUB_BRANCH') || "main"
    let workflowFile = "android-build.yml"

    if (repository_id) {
      const { data: repo, error: repoError } = await supabaseClient
        .from('github_repositories')
        .select('*')
        .eq('id', repository_id)
        .single()

      if (repoError || !repo) {
        throw new Error('Repository not found')
      }

      githubRepo = repo.repo_path
      githubBranch = repo.branch
      workflowFile = "remote-build.yml"
    }

    const githubToken = Deno.env.get('GITHUB_TOKEN_ACTION')
    if (!githubToken) {
      return new Response(JSON.stringify({ 
        error: 'GITHUB_TOKEN_ACTION is missing.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Register initial record to get ID
    const { data: build, error: insertError } = await supabaseClient
      .from('app_builds')
      .insert([{
        status: 'pending',
        version: version_name || 'Iniciando...',
        repository_id: repository_id || null,
        apk_url: '', // Provide empty strings to satisfy NOT NULL constraint
        aab_url: '',
        logs: [{ event: 'build_triggered', timestamp: new Date().toISOString(), details: `Build requested for ${githubRepo}` }]
      }])
      .select()
      .single()

    if (insertError) throw insertError

    // Trigger workflow
    const ownerRepo = Deno.env.get('GITHUB_REPO') || 'souzanavarro/buildsapp'
    const apiUrl = `https://api.github.com/repos/${ownerRepo}/actions/workflows/${workflowFile}/dispatches`
    
    console.log(`Triggering GitHub workflow at: ${apiUrl}`)

    const triggerResponse = await fetch(apiUrl, {

        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          'User-Agent': 'Supabase-Edge-Function'
        },
        body: JSON.stringify({ 
          ref: 'main', 
          inputs: workflowFile === "remote-build.yml" ? {
            repository_url: githubRepo,
            branch: githubBranch,
            build_id: String(build.id),
            version_name: version_name || '1.0.0',
            version_code: version_code || '1'
          } : {
            build_id: String(build.id)
          }
        }),
      }
    )

    if (!triggerResponse.ok) {
      const errorText = await triggerResponse.text()
      console.error(`GitHub API Error (${triggerResponse.status}):`, errorText)
      throw new Error(`GitHub trigger error: ${triggerResponse.status} ${errorText}`)
    }

    return new Response(JSON.stringify({ message: 'Build iniciado', build }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error details:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
