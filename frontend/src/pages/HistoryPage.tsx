import { useEffect, useState } from 'react';
import axios from 'axios';

interface Activity {
  id: number;
  name: string;
  start_date: string;
  type: string;
  distance?: number;
  moving_time?: number;
}

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    setLoading(true);
    axios
      .get('/api/user/history')
      .then((res) => {
        setActivities(res.data || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.response?.data?.message || e.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading history…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="py-8">
        <div className="container">
          <div className="card bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Strava Activities</h2>
            {activities.length === 0 ? (
              <p className="text-gray-600">No activities found.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {activities.map((a) => (
                  <li key={a.id} className="py-4 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div className="font-medium text-gray-900 truncate">{a.name}</div>
                    <div className="text-gray-600">{a.type}</div>
                    <div className="text-gray-600">{new Date(a.start_date).toLocaleString()}</div>
                    <div className="text-gray-600">
                      {a.distance ? `${(a.distance / 1000).toFixed(2)} km` : '-'} ·
                      {a.moving_time ? ` ${(a.moving_time / 60).toFixed(0)} min` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
