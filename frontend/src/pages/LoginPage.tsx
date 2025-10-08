import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const LoginPage = () => {
    const navigate = useNavigate();
    const [connectedUserId, setConnectedUserId] = useState<number | null>(null);
    const [checking, setChecking] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        let mounted = true;
        axios
            .get('/api/user/me')
            .then((res) => {
                if (!mounted) return;
                const id = res.data?.user?.id;
                if (id) setConnectedUserId(id);
            })
            .catch(() => {
                // not authenticated; leave as null
            })
            .finally(() => {
                if (mounted) setChecking(false);
            });
        return () => {
            mounted = false;
        };
    }, []);

    const handleLogin = () => {
        window.location.href = '/auth/strava';
    };

    const handleLogout = async () => {
        try {
            setLoggingOut(true);
            await axios.post('/auth/logout');
            setConnectedUserId(null);
        } catch (e) {
            console.error(e);
        } finally {
            setLoggingOut(false);
        }
    };

    const handleGoToDashboard = () => {
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="w-full max-w-md card p-8 animate-fade-in">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-2 text-primary">
                        LiftLink
                    </h1>
                    <p className="text-secondary text-lg">
                        Automatically merge your duplicate Strava activities
                    </p>
                </div>

                {checking ? (
                    <div className="flex justify-center py-8">
                        <div className="loading"></div>
                    </div>
                ) : connectedUserId ? (
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-green-50 border border-gray-200">
                            <p className="text-gray-600 text-sm mb-1">Connected as</p>
                            <p className="text-gray-900 font-semibold">Athlete ID: {connectedUserId}</p>
                            <button
                                onClick={handleLogout}
                                disabled={loggingOut}
                                className="mt-3 text-sm text-primary hover:text-primary-hover transition-colors"
                            >
                                {loggingOut ? 'Logging out…' : 'Log out'}
                            </button>
                        </div>
                        <button onClick={handleGoToDashboard} className="w-full btn-primary btn-lg">
                            Go to Dashboard
                        </button>
                        <button onClick={handleLogin} className="w-full btn-secondary btn-lg">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                            </svg>
                            Reconnect with Strava
                        </button>
                    </div>
                ) : (
                    <>
                        <button onClick={handleLogin} className="w-full btn-primary btn-lg">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                            </svg>
                            Connect with Strava
                        </button>
                        <p className="mt-6 text-center text-muted text-sm">
                            Sign in with your Strava account to get started
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default LoginPage;
