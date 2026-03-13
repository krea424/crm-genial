// Edge Function: provision-drive-folder
// Crea la cartella Google Drive per una pratica appena creata.
// Viene chiamata in background alla creazione pratica (non blocca il flusso principale).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Sottocartelle standard per ogni pratica
const SUBFOLDERS = [
  '01 - Incarico e documentazione cliente',
  '02 - Rilievi e planimetrie',
  '03 - Progetto e elaborati tecnici',
  '04 - Pratiche comunali e enti',
  '05 - Contabilità e preventivi',
  '06 - Collaudo e chiusura',
]

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    const body = await req.json()
    const { pratica_id } = body as { pratica_id: string }

    if (!pratica_id) {
      return new Response(JSON.stringify({ error: 'pratica_id obbligatorio' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Carica la pratica con dati cliente
    const { data: pratica } = await supabaseAdmin
      .from('pratiche')
      .select('*, clients(*)')
      .eq('id', pratica_id)
      .single()

    if (!pratica) {
      return new Response(JSON.stringify({ error: 'Pratica non trovata' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Se la cartella esiste già, skip
    if (pratica.drive_folder_id) {
      return new Response(
        JSON.stringify({ message: 'Cartella già esistente', folder_id: pratica.drive_folder_id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Costruisci nome cartella
    const clientName = pratica.clients
      ? pratica.clients.client_type === 'privato'
        ? `${pratica.clients.last_name ?? ''} ${pratica.clients.first_name ?? ''}`.trim()
        : pratica.clients.company_name ?? 'Cliente'
      : 'Cliente'

    const folderName = [
      pratica.practice_code,
      clientName,
      pratica.site_address,
    ]
      .filter(Boolean)
      .join(' — ')

    // Chiama Google Drive API
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    const parentFolderId = Deno.env.get('GOOGLE_DRIVE_ROOT_FOLDER_ID')

    if (!serviceAccountJson) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON non configurato' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ottieni access token via Service Account
    const serviceAccount = JSON.parse(serviceAccountJson)
    const tokenRes = await getServiceAccountToken(serviceAccount)

    if (!tokenRes.access_token) {
      throw new Error('Impossibile ottenere token Google')
    }

    // Crea cartella root
    const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenRes.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : undefined,
      }),
    })

    const folderData = await createFolderRes.json()

    if (!folderData.id) {
      throw new Error(`Drive API error: ${JSON.stringify(folderData)}`)
    }

    const folderId = folderData.id

    // Ottieni webViewLink
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}?fields=webViewLink`,
      { headers: { 'Authorization': `Bearer ${tokenRes.access_token}` } }
    )
    const metaData = await metaRes.json()
    const folderUrl = metaData.webViewLink ?? `https://drive.google.com/drive/folders/${folderId}`

    // Crea sottocartelle in parallelo
    await Promise.all(
      SUBFOLDERS.map(name =>
        fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenRes.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [folderId],
          }),
        })
      )
    )

    // Aggiorna pratica con ID e URL cartella
    await supabaseAdmin
      .from('pratiche')
      .update({ drive_folder_id: folderId, drive_folder_url: folderUrl })
      .eq('id', pratica_id)

    // Audit log
    await supabaseAdmin.from('audit_log').insert({
      entity_type: 'pratica',
      entity_id: pratica_id,
      action: 'drive_folder_created',
      actor_id: null,
      new_data: { folder_id: folderId, folder_url: folderUrl },
    })

    return new Response(
      JSON.stringify({ folder_id: folderId, folder_url: folderUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('provision-drive-folder error:', err)
    return new Response(
      JSON.stringify({ error: 'Errore nella creazione cartella Drive' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ─── Helper: Service Account JWT → Access Token ────────────────────────────

async function getServiceAccountToken(
  serviceAccount: { client_email: string; private_key: string }
): Promise<{ access_token: string }> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const encoder = new TextEncoder()
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const signingInput = `${headerB64}.${payloadB64}`

  // Importa chiave privata RSA
  const pemKey = serviceAccount.private_key.replace(/\\n/g, '\n')
  const keyDer = pemToDer(pemKey)
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signingInput)
  )

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const jwt = `${signingInput}.${sigB64}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  return tokenRes.json()
}

function pemToDer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}
