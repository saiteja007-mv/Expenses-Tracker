'use client';
import * as XLSX from 'xlsx';

export default function TransactionsTable({ transactions, onUpdate, onDelete }: any) {
  const exportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(transactions);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    const blob = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const b = new Blob([blob], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="card overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Transactions</h3>
        <button className="btn" onClick={exportXLSX}>Export XLSX</button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Date</th>
            <th>Type</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Merchant</th>
            <th>Notes</th>
            <th>Receipt</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t: any) => (
            <tr key={t.id} className="border-b last:border-b-0">
              <td className="py-2">{t.date}</td>
              <td>{t.type}</td>
              <td>{t.category_name || ''}</td>
              <td>${Number(t.amount).toFixed(2)}</td>
              <td>{t.merchant || ''}</td>
              <td>{t.notes || ''}</td>
              <td>{t.attachment_url ? <a className="text-blue-600 underline" href={t.attachment_url} target="_blank">View</a> : ''}</td>
              <td>
                <button className="text-red-600" onClick={() => onDelete(t.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 