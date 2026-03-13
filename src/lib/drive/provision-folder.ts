import { getDriveClient } from './drive-client'

/**
 * Sottocartelle standard create per ogni pratica.
 * Rispecchiano le fasi documentali di uno studio di ingegneria/architettura.
 */
const SUBFOLDERS = [
  '01 - Incarico e documentazione cliente',
  '02 - Rilievi e planimetrie',
  '03 - Progetto e elaborati tecnici',
  '04 - Pratiche comunali e enti',
  '05 - Contabilità e preventivi',
  '06 - Collaudo e chiusura',
]

export interface ProvisionResult {
  folderId: string
  folderUrl: string
}

/**
 * Crea la cartella Drive per una pratica con le 6 sottocartelle standard.
 * Restituisce l'ID e l'URL della cartella root.
 *
 * @param practiceCode - Es. "2026-001"
 * @param clientName   - Es. "Rossi Mario"
 * @param siteAddress  - Es. "Via Roma 15"
 * @param parentFolderId - ID cartella padre (da env GOOGLE_DRIVE_ROOT_FOLDER_ID)
 */
export async function provisionPracticeFolder(
  practiceCode: string,
  clientName: string,
  siteAddress: string | null,
  parentFolderId?: string
): Promise<ProvisionResult> {
  const drive = getDriveClient()

  const folderName = [practiceCode, clientName, siteAddress]
    .filter(Boolean)
    .join(' — ')

  // Crea cartella root
  const root = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined,
    },
    fields: 'id, webViewLink',
  })

  const folderId = root.data.id!
  const folderUrl = root.data.webViewLink!

  // Crea sottocartelle in parallelo
  await Promise.all(
    SUBFOLDERS.map(name =>
      drive.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [folderId],
        },
        fields: 'id',
      })
    )
  )

  return { folderId, folderUrl }
}

/**
 * Verifica che i file richiesti siano presenti nella cartella Drive della pratica.
 * Usato dal trigger-handoff per bloccare avanzamento se docs obbligatori mancano.
 *
 * @param folderId - ID cartella Drive pratica
 * @param requiredDocs - Array di nomi file o prefissi da verificare
 */
export async function verifyRequiredDocs(
  folderId: string,
  requiredDocs: string[]
): Promise<{ ok: boolean; missing: string[] }> {
  if (requiredDocs.length === 0) return { ok: true, missing: [] }

  const drive = getDriveClient()

  const { data } = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(name)',
    pageSize: 100,
  })

  const fileNames = (data.files ?? []).map(f => f.name?.toLowerCase() ?? '')

  const missing = requiredDocs.filter(doc => {
    const docLower = doc.toLowerCase()
    return !fileNames.some(name => name.includes(docLower))
  })

  return { ok: missing.length === 0, missing }
}
