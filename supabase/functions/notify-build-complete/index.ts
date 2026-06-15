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

    const payload = await req.json()
    const { 
      version, 
      status, 
      storage_path, 
      aab_storage_path, 
      github_run_id, 
      build_id,
      error_message,
      logs: incomingLogs 
    } = payload

    console.log(`Registering build status ${status} for version ${version}, Run ID: ${github_run_id}, Build ID: ${build_id}`)

    // Try to find existing build by build_id or github_run_id
    let existingId = build_id
    if (!existingId && github_run_id) {
      const { data: existing } = await supabase
        .from('app_builds')
        .select('id')
        .eq('github_run_id', github_run_id)
        .maybeSingle()
      
      if (existing) existingId = existing.id
    }

    const logEntry = { 
      event: `build_${status}`, 
      timestamp: new Date().toISOString(), 
      details: status === 'success' ? 'Build registered from GitHub Action' : error_message || 'Build update received'
    }

    const dataToSave = {
      version,
      status,
      storage_path,
      aab_storage_path,
      github_run_id,
      error_message,
      updated_at: new Date().toISOString()
    }

    let result;
    if (existingId) {
      // Update existing
      const { data, error } = await supabase
        .from('app_builds')
        .update({
          ...dataToSave,
          logs: supabase.rpc('append_jsonb_array', { table_name: 'app_builds', col_name: 'logs', row_id: existingId, new_value: logEntry })
        })
        .eq('id', existingId)
        .select()
      
      if (error) {
        // Fallback if RPC fails or isn't there
        const { data: currentData } = await supabase.from('app_builds').select('logs').eq('id', existingId).single()
        const newLogs = [...(currentData?.logs || []), logEntry]
        const { data: updated, error: updateError } = await supabase
          .from('app_builds')
          .update({ ...dataToSave, logs: newLogs })
          .eq('id', existingId)
          .select()
        if (updateError) throw updateError
        result = updated
      } else {
        result = data
      }
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('app_builds')
        .insert([
          { 
            ...dataToSave,
            logs: incomingLogs || [logEntry]
          }
        ])
        .select()
      
      if (error) throw error
      result = data
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in notify-build-complete:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
