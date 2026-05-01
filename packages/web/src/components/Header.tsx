import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Menu, X, BookOpen, Trophy, Settings } from 'lucide-react';
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
        { path: '/learning-path', label: 'Lộ trình AI' },
        { path: '/about', label: 'Về chúng tôi' },
        { path: '/contact', label: 'Liên hệ' },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
            <nav className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-800 rounded-xl blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                            <img
                                src={logo}
                                alt="Logo"
                                className="relative h-10 w-10 object-contain rounded-xl"
                            />
                        </div>
                        <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-red-600 to-zinc-900 dark:from-red-400 dark:to-zinc-100 bg-clip-text text-transparent">
                            E-Learning
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`text-sm font-medium transition-colors relative group ${isActive(link.path)
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400'
                                    }`}
                            >
                                {link.label}
                                <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-red-600 dark:bg-red-400 transition-transform ${isActive(link.path) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
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
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-700 text-white font-semibold text-sm">
                                        {displayName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
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
                                {user?.role === 'STUDENT' && (
                                    <>
                                        <Link to="/my-courses">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white dark:border-red-500 dark:text-red-400"
                                            >
                                                <BookOpen className="h-4 w-4" />
                                                Khóa học của tôi
                                            </Button>
                                        </Link>
                                        <Link to="/quiz-history">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white dark:border-amber-500 dark:text-amber-400"
                                            >
                                                <Trophy className="h-4 w-4" />
                                                Lịch sử Quiz
                                            </Button>
                                        </Link>
                                    </>
                                )}

                                {/* Profile Button */}
                                <Link to="/profile">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <Settings className="h-4 w-4" />
                                        Hồ sơ
                                    </Button>
                                </Link>

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
                                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                                        Đăng ký
                                    </Button>
                                </Link>
                            </div>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            {mobileMenuOpen ? (
                                <X className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
                            ) : (
                                <Menu className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-zinc-200 dark:border-zinc-800">
                        <div className="flex flex-col space-y-2">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive(link.path)
                                            ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            ))}

                            {isAuthenticated ? (
                                <>
                                    <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-700 text-white font-semibold">
                                                {displayName?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-zinc-900 dark:text-white">
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
                                    {user?.role === 'STUDENT' && (
                                        <>
                                            <Link to="/my-courses" onClick={() => setMobileMenuOpen(false)}>
                                                <button className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2 justify-center">
                                                    <BookOpen className="h-4 w-4" />
                                                    Khóa học của tôi
                                                </button>
                                            </Link>
                                            <Link to="/quiz-history" onClick={() => setMobileMenuOpen(false)}>
                                                <button className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors flex items-center gap-2 justify-center">
                                                    <Trophy className="h-4 w-4" />
                                                    Lịch sử Quiz
                                                </button>
                                            </Link>
                                        </>
                                    )}

                                    <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                                        <button className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-zinc-600 text-white hover:bg-zinc-700 transition-colors flex items-center gap-2 justify-center">
                                            <Settings className="h-4 w-4" />
                                            Hồ sơ
                                        </button>
                                    </Link>

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
                                        <button className="w-full px-4 py-3 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                            Đăng nhập
                                        </button>
                                    </Link>
                                    <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                                        <button className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">
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

