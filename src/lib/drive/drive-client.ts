import { google } from 'googleapis'

let driveClient: ReturnType<typeof google.drive> | null = null

/**
 * Singleton per il client Google Drive con Service Account.
 * Le credenziali vengono lette dalle variabili d'ambiente.
 */
export function getDriveClient() {
  if (driveClient) return driveClient

  const credentials = JSON.parse(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '{}'
  )

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })

  driveClient = google.drive({ version: 'v3', auth })
  return driveClient
}
