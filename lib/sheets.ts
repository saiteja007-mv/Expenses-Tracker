import { google } from 'googleapis';

function getAuth() {
  const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
  const jwt = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    undefined,
    (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes
  );
  return jwt;
}

export async function appendTransactionToSheet(row: any[]) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID!;
  const range = `${process.env.SHEETS_TRANSACTIONS_TAB || 'Transactions'}!A:Z`;
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] }
  });
  const updates = res.data.updates;
  const updatedRange = updates?.updatedRange || '';
  const match = updatedRange.match(/!(?:[A-Z]+)(\d+):/);
  const rowNumber = match ? match[1] : undefined;
  return rowNumber; // store in sheet_row_id
}

export async function updateTransactionInSheet(rowNumber: string, row: any[]) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID!;
  const range = `${process.env.SHEETS_TRANSACTIONS_TAB || 'Transactions'}!A${rowNumber}:Z${rowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] }
  });
}

export async function deleteTransactionInSheet(rowNumber: string) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID!;
  const sheetTitle = process.env.SHEETS_TRANSACTIONS_TAB || 'Transactions';

  // BatchUpdate to delete a row
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets?.find(s => s.properties?.title === sheetTitle);
  const sheetId = sheet?.properties?.sheetId;
  if (!sheetId) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        { deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: Number(rowNumber) - 1, endIndex: Number(rowNumber) } } }
      ]
    }
  });
} 