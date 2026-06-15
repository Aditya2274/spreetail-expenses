import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Balance {
  id: string;
  name: string;
  balance: number;
}

export default function Dashboard() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/balances`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBalances(data);
        } else {
          setBalances([]);
          console.error('API returned non-array:', data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch balances:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading balances...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Group Balances</h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {balances.map(user => (
            <li key={user.id}>
              <Link to={`/user/${user.id}`} className="block hover:bg-gray-50">
                <div className="px-4 py-4 flex items-center justify-between sm:px-6">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name}
                    </p>
                  </div>
                  <div className="ml-5 flex-shrink-0">
                    <p className={`text-sm font-bold ${user.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {user.balance >= 0 ? `Gets back ₹${user.balance.toFixed(2)}` : `Owes ₹${Math.abs(user.balance).toFixed(2)}`}
                    </p>
                  </div>
                  <div className="ml-5 flex-shrink-0 text-gray-400">
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </Link>
            </li>
          ))}
          {balances.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-500 text-sm">No group members found. Import some data!</li>
          )}
        </ul>
      </div>
    </div>
  );
}
