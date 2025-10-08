import { useState, useEffect } from 'react';
import axios from 'axios';

type Activity = {
    id: number;
    name: string;
    start_date: string;
};

type Pair = { master: Activity; source: Activity };

const ManualMergePage = () => {
    const [pendingMerges, setPendingMerges] = useState<Pair[]>([]);
    const [loading, setLoading] = useState(true);
    const [mergingId, setMergingId] = useState<string | null>(null);
    const [mergedIds, setMergedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        axios.get('/api/merges/pending')
            .then(res => {
                setPendingMerges(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching pending merges:', err);
                setLoading(false);
            });
    }, []);

    const handleMerge = async (masterActivityId: number, sourceActivityId: number) => {
        const pairId = `${masterActivityId}-${sourceActivityId}`;
        setMergingId(pairId);

        try {
            await axios.post('/api/merges/manual', { masterActivityId, sourceActivityId });

            // Mark as merged
            setMergedIds(prev => new Set(prev).add(pairId));

            // Wait 2 seconds to show "Merged ✓" before removing from list
            setTimeout(() => {
                setPendingMerges(prev => prev.filter(p => p.master.id !== masterActivityId));
                setMergedIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(pairId);
                    return newSet;
                });
            }, 2000);
        } catch (err) {
            console.error('Error merging:', err);
            alert('Merge failed. Please try again.');
        } finally {
            setMergingId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="loading"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <main className="py-8">
                <div className="container">
                    <div className="card bg-white overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Pending Merges</h2>
                        </div>
                        {pendingMerges.length === 0 ? (
                            <p className="p-6 text-gray-600">No pending merges found.</p>
                        ) : (
                            <ul className="divide-y">
                                {pendingMerges.map(pair => (
                                    <li key={`${pair.master.id}-${pair.source.id}`} className="p-6">
                                        <div className="mb-4">
                                            <p className="font-medium text-gray-900 mb-2">
                                                Found potential duplicate activities:
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Started at: {new Date(pair.master.start_date).toLocaleString()}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 mb-6">
                                            <div className="border rounded-lg p-4 bg-green-50 border-gray-200">
                                                <p className="text-sm text-success mb-1 font-semibold">Will Keep ✓</p>
                                                <p className="font-medium text-gray-900">{pair.master.name}</p>
                                                <p className="text-xs text-gray-500 mt-1">ID: {pair.master.id}</p>
                                            </div>
                                            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                                                <p className="text-sm text-gray-500 mb-1">Will Merge Into Master</p>
                                                <p className="font-medium text-gray-700">{pair.source.name}</p>
                                                <p className="text-xs text-gray-400 mt-1">ID: {pair.source.id}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleMerge(pair.master.id, pair.source.id)}
                                            disabled={mergingId === `${pair.master.id}-${pair.source.id}` || mergedIds.has(`${pair.master.id}-${pair.source.id}`)}
                                            className={`btn-merge w-full ${mergedIds.has(`${pair.master.id}-${pair.source.id}`) ? 'merged' : ''}`}
                                        >
                                            {mergingId === `${pair.master.id}-${pair.source.id}` ? (
                                                <>
                                                    <div className="loading-small"></div>
                                                    <span>Merging...</span>
                                                </>
                                            ) : mergedIds.has(`${pair.master.id}-${pair.source.id}`) ? (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    <span>Merged ✓</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                                    </svg>
                                                    <span>Merge Activities</span>
                                                </>
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ManualMergePage;
