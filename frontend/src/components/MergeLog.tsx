import { useEffect, useState } from 'react';
import axios from 'axios';

interface MergeLogEntry {
    id: string;
    master_activity_id: number;
    source_activity_id: number;
    status: string;
    details?: string;
    created_at: string;
}

const MergeLog = () => {
    const [logs, setLogs] = useState<MergeLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        axios
            .get('/api/logs')
            .then((res) => {
                setLogs(res.data);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Error fetching merge logs:', err);
                setError('Failed to load merge history');
                setLoading(false);
            });
    }, []);

    const formatTimeAgo = (dateInput: any) => {
        // Handle various date formats that might come from the backend
        let date: Date;

        if (dateInput instanceof Date) {
            date = dateInput;
        } else if (typeof dateInput === 'string') {
            date = new Date(dateInput);
        } else if (dateInput && typeof dateInput === 'object' && dateInput.toDate) {
            // Firestore Timestamp
            date = dateInput.toDate();
        } else {
            // Fallback to current date if unable to parse
            console.warn('Unable to parse date:', dateInput);
            return 'Recently';
        }

        // Validate the date
        if (isNaN(date.getTime())) {
            console.warn('Invalid date:', dateInput);
            return 'Recently';
        }

        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

        return date.toLocaleDateString();
    };

    return (
        <div>
            <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Merge History</h2>
            </div>

            {loading ? (
                <div className="p-6 flex justify-center">
                    <div className="loading"></div>
                </div>
            ) : error ? (
                <div className="p-6">
                    <p className="text-gray-500 text-center">{error}</p>
                </div>
            ) : logs.length === 0 ? (
                <div className="p-6">
                    <p className="text-gray-500 text-center">No merge history yet</p>
                </div>
            ) : (
                <ul className="divide-y">
                    {logs.map((log) => (
                        <li key={log.id} className="p-6 flex justify-between items-center">
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900">
                                    Merged activity #{log.source_activity_id} into #{log.master_activity_id}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {formatTimeAgo(log.created_at)}
                                </p>
                                {log.details && log.status !== 'SUCCESS' && (
                                    <p className="text-sm text-error mt-1">{log.details}</p>
                                )}
                            </div>
                            <span
                                className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : 'badge-error'
                                    }`}
                            >
                                {log.status === 'SUCCESS' ? 'Success' : 'Failed'}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MergeLog;
