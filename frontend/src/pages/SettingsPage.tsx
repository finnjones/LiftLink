import { useState, useEffect } from 'react';
import axios from 'axios';

const SettingsPage = () => {
    const [settings, setSettings] = useState({
        matching_window_minutes: 10,
        title_template: '[workout_title]',
        default_gear_id: '',
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/user/settings')
            .then(res => {
                setSettings(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching settings:', err);
                setLoading(false);
            });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        axios.post('/api/user/settings', settings)
            .then(() => alert('Settings saved!'))
            .catch(err => console.error('Error saving settings:', err));
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
                    <form onSubmit={handleSubmit} className="card bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">Settings</h2>

                        <div className="mb-4">
                            <label htmlFor="matching_window_minutes" className="block text-sm font-medium text-gray-700 mb-2">
                                Matching Window (minutes)
                            </label>
                            <input
                                type="number"
                                id="matching_window_minutes"
                                name="matching_window_minutes"
                                value={settings.matching_window_minutes}
                                onChange={handleChange}
                                className="input-field"
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="title_template" className="block text-sm font-medium text-gray-700 mb-2">
                                Workout Title Template
                            </label>
                            <input
                                type="text"
                                id="title_template"
                                name="title_template"
                                value={settings.title_template}
                                onChange={handleChange}
                                className="input-field"
                            />
                        </div>

                        <div className="mb-6">
                            <label htmlFor="default_gear_id" className="block text-sm font-medium text-gray-700 mb-2">
                                Default Gear ID
                            </label>
                            <input
                                type="text"
                                id="default_gear_id"
                                name="default_gear_id"
                                value={settings.default_gear_id}
                                onChange={handleChange}
                                className="input-field"
                            />
                        </div>

                        <button type="submit" className="btn-primary w-full">Save Settings</button>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default SettingsPage;
