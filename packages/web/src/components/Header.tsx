import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/button';
import { showConfirmAlert } from '../lib/sweetalert';
import { apiClient } from '../lib/api';
import logo from '../logo.png';

export function Header() {
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);
    const clearUser = useAuthStore((state) => state.clearUser);

    const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username;

    const handleLogout = async () => {
        const result = await showConfirmAlert(
            'Đăng xuất',
            'Bạn có chắc chắn muốn đăng xuất?'
        );

        if (result.isConfirmed) {
            try {
                await apiClient.post('/auth/logout');
            } catch (error) {
                console.error('Logout error:', error);
            } finally {
                clearUser();
                navigate('/');
            }
        }
    };

    const isActive = (path: string) => location.pathname === path;

    const navLinks = [
        { path: '/', label: 'Trang chủ' },
        { path: '/courses', label: 'Khóa học' },
        { path: '/about', label: 'Về chúng tôi' },
        { path: '/contact', label: 'Liên hệ' },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-red-900/10 dark:border-red-500/20 bg-white/95 dark:bg-black/95 backdrop-blur-xl shadow-lg shadow-red-500/5">
            <nav className="container mx-auto px-4">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-800 rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                            <img 
                                src={logo} 
                                alt="Logo" 
                                className="relative h-12 w-12 object-contain rounded-xl"
                            />
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-red-600 to-black dark:from-red-500 dark:to-red-300 bg-clip-text text-transparent">
                            E-Learning
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`text-sm font-medium transition-colors relative group ${
                                    isActive(link.path)
                                        ? 'text-red-600 dark:text-red-500'
                                        : 'text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-500'
                                }`}
                            >
                                {link.label}
                                <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-red-600 to-black dark:from-red-500 dark:to-red-300 transition-transform ${
                                    isActive(link.path) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                                }`}></span>
                            </Link>
                        ))}
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center gap-3">
                        <ThemeToggle />

                        {isAuthenticated ? (
                            <div className="hidden md:flex items-center gap-3">
                                {/* User Info */}
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-50 to-gray-50 dark:from-red-950/30 dark:to-black/30 border border-red-200 dark:border-red-900">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-800 text-white font-semibold text-sm shadow-lg">
                                        {displayName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {displayName}
                                        </span>
                                        <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                                            {user?.role === 'ADMIN' ? 'Quản trị viên' : user?.role === 'TEACHER' ? 'Giảng viên' : 'Học viên'}
                                        </span>
                                    </div>
                                </div>

                                {user?.role === 'ADMIN' && (
                                    <Link to="/admin">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="gap-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white dark:border-red-500 dark:text-red-400"
                                        >
                                            <LayoutDashboard className="h-4 w-4" />
                                            Admin Panel
                                        </Button>
                                    </Link>
                                )}
                                {user?.role === 'TEACHER' && (
                                    <Link to="/dashboard">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="gap-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white dark:border-red-500 dark:text-red-400"
                                        >
                                            <LayoutDashboard className="h-4 w-4" />
                                            Dashboard
                                        </Button>
                                    </Link>
                                )}

                                {/* Logout Button */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleLogout}
                                    className="gap-2 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600"
                                >
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="hidden md:flex items-center gap-2">
                                <Link to="/login">
                                    <Button variant="ghost" size="sm" className="hover:text-red-600">
                                        Đăng nhập
                                    </Button>
                                </Link>
                                <Link to="/register">
                                    <Button size="sm" className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white shadow-lg shadow-red-500/30">
                                        Đăng ký
                                    </Button>
                                </Link>
                            </div>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                        >
                            {mobileMenuOpen ? (
                                <X className="h-6 w-6 text-red-600" />
                            ) : (
                                <Menu className="h-6 w-6 text-red-600" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-red-900/10 dark:border-red-500/20">
                        <div className="flex flex-col space-y-2">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                        isActive(link.path)
                                            ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-950/30'
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            ))}

                            {isAuthenticated ? (
                                <>
                                    <div className="px-4 py-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-800 text-white font-semibold">
                                                {displayName?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    {displayName}
                                                </div>
                                                <div className="text-xs text-red-600 dark:text-red-400">
                                                    {user?.role === 'ADMIN' ? 'Quản trị viên' : user?.role === 'TEACHER' ? 'Giảng viên' : 'Học viên'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {user?.role === 'ADMIN' && (
                                        <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                                            <button className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2 justify-center">
                                                <LayoutDashboard className="h-4 w-4" />
                                                Admin Panel
                                            </button>
                                        </Link>
                                    )}
                                    {user?.role === 'TEACHER' && (
                                        <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                                            <button className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2 justify-center">
                                                <LayoutDashboard className="h-4 w-4" />
                                                Dashboard
                                            </button>
                                        </Link>
                                    )}

                                    <button
                                        onClick={() => {
                                            setMobileMenuOpen(false);
                                            handleLogout();
                                        }}
                                        className="w-full px-4 py-3 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-2 justify-center"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Đăng xuất
                                    </button>
                                </>
                            ) : (
                                <div className="space-y-2 pt-2">
                                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                                        <button className="w-full px-4 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                                            Đăng nhập
                                        </button>
                                    </Link>
                                    <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                                        <button className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-gradient-to-r from-red-600 to-red-800 text-white hover:from-red-700 hover:to-red-900 transition-colors">
                                            Đăng ký
                                        </button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
}
