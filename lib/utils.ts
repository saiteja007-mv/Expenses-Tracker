export function txToSheetRow(tx: any, userEmail: string) {
  return [
    tx.id,
    userEmail,
    tx.date,
    tx.type,
    tx.category_name || '',
    Number(tx.amount),
    tx.currency || 'USD',
    tx.merchant || '',
    tx.notes || '',
    tx.attachment_url || '',
    tx.created_at,
    tx.updated_at
  ];
} 