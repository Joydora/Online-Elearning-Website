import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin, Heart } from 'lucide-react';
import logo from '../logo.png';

export function Footer() {
    return (
        <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                    {/* Brand Section */}
                    <div className="space-y-4">
                        <Link to="/" className="flex items-center gap-3 group">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-800 rounded-xl blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                                <img
                                    src={logo}
                                    alt="Logo"
                                    className="relative h-10 w-10 object-contain rounded-xl"
                                />
                            </div>
                            <span className="text-lg font-bold bg-gradient-to-r from-red-600 to-zinc-900 dark:from-red-400 dark:to-zinc-100 bg-clip-text text-transparent">
                                E-Learning
                            </span>
                        </Link>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            Nền tảng học trực tuyến hàng đầu Việt Nam. Nơi tri thức không giới hạn, học tập không ngừng nghỉ.
                        </p>
                        <div className="flex gap-2">
                            <a
                                href="https://facebook.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-red-600 text-zinc-600 hover:text-white dark:text-zinc-400 dark:hover:text-white transition-all"
                            >
                                <Facebook className="h-4 w-4" />
                            </a>
                            <a
                                href="https://twitter.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-red-600 text-zinc-600 hover:text-white dark:text-zinc-400 dark:hover:text-white transition-all"
                            >
                                <Twitter className="h-4 w-4" />
                            </a>
                            <a
                                href="https://instagram.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-red-600 text-zinc-600 hover:text-white dark:text-zinc-400 dark:hover:text-white transition-all"
                            >
                                <Instagram className="h-4 w-4" />
                            </a>
                            <a
                                href="https://youtube.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-red-600 text-zinc-600 hover:text-white dark:text-zinc-400 dark:hover:text-white transition-all"
                            >
                                <Youtube className="h-4 w-4" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <div className="h-1 w-6 bg-red-600 dark:bg-red-500 rounded-full"></div>
                            Liên kết nhanh
                        </h3>
                        <ul className="space-y-2">
                            <li>
                                <Link
                                    to="/"
                                    className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-2 group"
                                >
                                    <span className="h-1 w-1 rounded-full bg-red-600 dark:bg-red-500 group-hover:w-3 transition-all"></span>
                                    Trang chủ
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/courses"
                                    className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-2 group"
                                >
                                    <span className="h-1 w-1 rounded-full bg-red-600 dark:bg-red-500 group-hover:w-3 transition-all"></span>
                                    Khóa học
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/about"
                                    className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-2 group"
                                >
                                    <span className="h-1 w-1 rounded-full bg-red-600 dark:bg-red-500 group-hover:w-3 transition-all"></span>
                                    Về chúng tôi
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/contact"
                                    className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-2 group"
                                >
                                    <span className="h-1 w-1 rounded-full bg-red-600 dark:bg-red-500 group-hover:w-3 transition-all"></span>
                                    Liên hệ
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <div className="h-1 w-6 bg-red-600 dark:bg-red-500 rounded-full"></div>
                            Hỗ trợ
                        </h3>
                        <ul className="space-y-2">
                            <li>
                                <Link
                                    to="/support"
                                    className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-2 group"
                                >
                                    <span className="h-1 w-1 rounded-full bg-red-600 dark:bg-red-500 group-hover:w-3 transition-all"></span>
                                    Trung tâm hỗ trợ
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/faq"
                                    className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-2 group"
                                >
                                    <span className="h-1 w-1 rounded-full bg-red-600 dark:bg-red-500 group-hover:w-3 transition-all"></span>
                                    Câu hỏi thường gặp
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/terms"
                                    className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-2 group"
                                >
                                    <span className="h-1 w-1 rounded-full bg-red-600 dark:bg-red-500 group-hover:w-3 transition-all"></span>
                                    Điều khoản dịch vụ
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/privacy"
                                    className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-2 group"
                                >
                                    <span className="h-1 w-1 rounded-full bg-red-600 dark:bg-red-500 group-hover:w-3 transition-all"></span>
                                    Chính sách bảo mật
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <div className="h-1 w-6 bg-red-600 dark:bg-red-500 rounded-full"></div>
                            Liên hệ
                        </h3>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3 group">
                                <Mail className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 group-hover:scale-110 transition-transform" />
                                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                    support@elearning.vn
                                </div>
                            </li>
                            <li className="flex items-start gap-3 group">
                                <Phone className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 group-hover:scale-110 transition-transform" />
                                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                    1900 1234
                                </div>
                            </li>
                            <li className="flex items-start gap-3 group">
                                <MapPin className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 group-hover:scale-110 transition-transform" />
                                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                    123 Đường ABC, Quận 1<br />
                                    TP. Hồ Chí Minh, Việt Nam
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-6 sm:pt-8 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 text-center md:text-left flex items-center justify-center gap-2 flex-wrap">
                            © 2024 E-Learning Platform. Made with
                            <Heart className="h-4 w-4 text-red-600 dark:text-red-500 fill-current" />
                            in Vietnam
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-6">
                            <Link
                                to="/terms"
                                className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            >
                                Điều khoản
                            </Link>
                            <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">|</span>
                            <Link
                                to="/privacy"
                                className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            >
                                Bảo mật
                            </Link>
                            <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">|</span>
                            <Link
                                to="/privacy"
                                className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            >
                                Cookies
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

