'use client';
import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard({ transactions }: any) {
  const summary = useMemo(() => {
    const income = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const expense = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const balance = income - expense;

    // Monthly trend (YYYY-MM)
    const byMonth = new Map<string, number>();
    for (const t of transactions) {
      const ym = (t.date || '').slice(0, 7);
      const val = (t.type === 'income' ? 1 : -1) * Number(t.amount);
      byMonth.set(ym, (byMonth.get(ym) || 0) + val);
    }
    const trend = Array.from(byMonth.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([k, v]) => ({ month: k, net: v }));

    // Category breakdown (expenses only)
    const byCat = new Map<string, number>();
    for (const t of transactions.filter((x: any) => x.type === 'expense')) {
      const key = t.category_name || 'Uncategorized';
      byCat.set(key, (byCat.get(key) || 0) + Number(t.amount));
    }
    const pie = Array.from(byCat.entries()).map(([name, value]) => ({ name, value }));

    return { income, expense, balance, trend, pie };
  }, [transactions]);

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="card">
        <div className="text-sm text-neutral-500">Income</div>
        <div className="text-2xl font-semibold">${summary.income.toFixed(2)}</div>
      </div>
      <div className="card">
        <div className="text-sm text-neutral-500">Expense</div>
        <div className="text-2xl font-semibold">${summary.expense.toFixed(2)}</div>
      </div>
      <div className="card">
        <div className="text-sm text-neutral-500">Balance</div>
        <div className="text-2xl font-semibold">${summary.balance.toFixed(2)}</div>
      </div>

      <div className="card md:col-span-2 h-72">
        <h3 className="font-semibold mb-2">Monthly Net</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={summary.trend}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="net" stroke="#000" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card h-72">
        <h3 className="font-semibold mb-2">Expenses by Category</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={summary.pie} dataKey="value" nameKey="name" outerRadius={90}>
              {summary.pie.map((_e: any, i: number) => (<Cell key={i} fill={`hsl(${i * 137.5 % 360}, 70%, 50%)`} />))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 