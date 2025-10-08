import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Header = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await axios.post('/auth/logout');
        } catch (e) {
            // ignore errors, proceed to redirect
        } finally {
            navigate('/login');
        }
    };

    return (
        <header className="sticky top-0 z-40">
            <div className="container">
                <div className="flex h-16 items-center justify-between">
                    <Link to="/dashboard" className="text-xl font-bold text-primary">
                        LiftLink
                    </Link>
                    <nav className="flex items-center gap-6">
                        <Link to="/manual-merge" className="text-gray-700 hover:text-primary transition-colors font-medium">
                            Manual Merge
                        </Link>
                        <Link to="/history" className="text-gray-700 hover:text-primary transition-colors font-medium">
                            History
                        </Link>
                        <Link to="/settings" className="text-gray-700 hover:text-primary transition-colors font-medium">
                            Settings
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="btn-secondary btn-sm"
                        >
                            Logout
                        </button>
                    </nav>
                </div>
            </div>
        </header>
    );
};

export default Header;
