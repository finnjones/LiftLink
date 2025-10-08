import MergeLog from '../components/MergeLog';

const DashboardPage = () => {
    return (
        <div className="min-h-screen">
            <main className="py-8">
                <div className="container space-y-8">
                    <div className="card bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900">Account Status</h2>
                        <p className="mt-2 text-gray-600">
                            <span className="mr-1 text-success">●</span>
                            Actively monitoring your Strava account.
                        </p>
                    </div>
                    <div className="card bg-white p-0">
                        <MergeLog />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DashboardPage;
