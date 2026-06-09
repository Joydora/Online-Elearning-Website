import { useState } from 'react';
import { ChevronDown, Search, HelpCircle, BookOpen, CreditCard, User, Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type FAQItem = {
    question: string;
    answer: string;
};

type FAQCategory = {
    id: string;
    icon: typeof HelpCircle;
    title: string;
    items: FAQItem[];
};

export default function FAQ() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('general');
    const [openItems, setOpenItems] = useState<string[]>([]);

    const categories: FAQCategory[] = [
        {
            id: 'general',
            icon: HelpCircle,
            title: 'General Questions',
            items: [
                {
                    question: 'What is E-Learning?',
                    answer: 'E-Learning is Vietnam\'s leading online learning platform, providing thousands of high-quality courses from reputable instructors in various fields.',
                },
                {
                    question: 'Which devices can I learn on?',
                    answer: 'You can learn on any device with an internet connection: computers, laptops, tablets, and smartphones. We also have dedicated apps for iOS and Android.',
                },
                {
                    question: 'Do courses expire?',
                    answer: 'Once purchased, you get lifetime access to the course. You can learn anytime, anywhere, with no limit on views.',
                },
                {
                    question: 'Will I receive a certificate after completing a course?',
                    answer: 'Yes! After completing a course, you will receive a digital certificate verifying your completion. This certificate can be shared on LinkedIn or printed.',
                },
            ],
        },
        {
            id: 'courses',
            icon: BookOpen,
            title: 'About Courses',
            items: [
                {
                    question: 'How do I find a suitable course?',
                    answer: 'You can use the search bar, filter by category, or view recommended courses based on your interests. Each course has a detailed description and reviews from students.',
                },
                {
                    question: 'Are courses updated?',
                    answer: 'Yes! Instructors regularly update course content to ensure it remains current. You will get access to all updates for free.',
                },
                {
                    question: 'Can I preview a course before buying?',
                    answer: 'Yes, most courses have free preview videos. You can watch these to assess the quality and teaching style before deciding to purchase.',
                },
                {
                    question: 'How do I ask the instructor questions?',
                    answer: 'Each course has a Q&A section where you can post questions. The instructor and student community will assist in answering them.',
                },
            ],
        },
        {
            id: 'payment',
            icon: CreditCard,
            title: 'Payment',
            items: [
                {
                    question: 'What payment methods are accepted?',
                    answer: 'We accept credit/debit cards (Visa, Mastercard, JCB), bank transfers, and local digital wallets (Stripe checkout).',
                },
                {
                    question: 'Is the payment secure?',
                    answer: 'Absolutely secure! We use the Stripe payment gateway with the highest PCI-DSS security standards. Your card details are encrypted and protected.',
                },
                {
                    question: 'Can I request a refund?',
                    answer: 'Yes, we have a 30-day refund policy if you are not satisfied with the course. Please contact support for assistance.',
                },
                {
                    question: 'Are there any discount codes?',
                    answer: 'Yes! We regularly offer promotions. Subscribe to our newsletter to stay updated on special offers.',
                },
            ],
        },
        {
            id: 'account',
            icon: User,
            title: 'Account',
            items: [
                {
                    question: 'How do I register an account?',
                    answer: 'Click the "Sign Up" button on the top right, enter your email and password. You can also sign up quickly using your Google account.',
                },
                {
                    question: 'I forgot my password, what should I do?',
                    answer: 'Click "Forgot Password" on the login page, enter your registered email. We will send you a link to reset your password.',
                },
                {
                    question: 'How do I change my personal details?',
                    answer: 'Log into your account, go to "Settings" or "Profile" to update your personal details, avatar, and other preferences.',
                },
                {
                    question: 'Can I delete my account?',
                    answer: 'Yes, you can request account deletion at any time. Please contact support for detailed guidance.',
                },
            ],
        },
        {
            id: 'privacy',
            icon: Shield,
            title: 'Security & Privacy',
            items: [
                {
                    question: 'Is my personal information secure?',
                    answer: 'Yes! We are committed to protecting your personal data in accordance with the highest standards. See details in our Privacy Policy page.',
                },
                {
                    question: 'Does E-Learning share my information with third parties?',
                    answer: 'No! We never sell or share your personal data with third parties for commercial purposes.',
                },
                {
                    question: 'How can I protect my account?',
                    answer: 'Use a strong password, enable two-factor authentication, do not share your login credentials, and log out when using public devices.',
                },
            ],
        },
    ];

    const toggleItem = (id: string) => {
        setOpenItems(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const filteredCategories = categories.map(cat => ({
        ...cat,
        items: cat.items.filter(
            item =>
                item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.answer.toLowerCase().includes(searchQuery.toLowerCase())
        ),
    })).filter(cat => cat.items.length > 0 || searchQuery === '');

    const currentCategory = filteredCategories.find(c => c.id === activeCategory) || filteredCategories[0];

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Hero */}
            <section className="py-12 sm:py-16 bg-red-600">
                <div className="container mx-auto px-4 sm:px-6 text-center text-white">
                    <HelpCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 sm:mb-6 opacity-80" />
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">Frequently Asked Questions</h1>
                    <p className="text-base sm:text-xl text-red-100 max-w-2xl mx-auto mb-6 sm:mb-8">
                        Find answers to common questions about E-Learning
                    </p>

                    {/* Search */}
                    <div className="max-w-xl mx-auto relative">
                        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                        <Input
                            type="text"
                            placeholder="Search questions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 sm:pl-12 h-12 sm:h-14 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                        />
                    </div>
                </div>
            </section>

            {/* FAQ Content */}
            <section className="py-10 sm:py-16">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 max-w-6xl mx-auto">
                        {/* Categories Sidebar */}
                        <div className="lg:w-64 shrink-0">
                            <Card className="p-4 lg:sticky lg:top-24">
                                <h3 className="font-semibold text-zinc-900 dark:text-white mb-3 sm:mb-4">Categories</h3>
                                <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-left transition-colors ${activeCategory === cat.id
                                                    ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                                }`}
                                        >
                                            <cat.icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                                            <span className="text-xs sm:text-sm font-medium truncate">{cat.title}</span>
                                        </button>
                                    ))}
                                </nav>
                            </Card>
                        </div>

                        {/* FAQ Items */}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-4 sm:mb-6">
                                {currentCategory?.title}
                            </h2>
                            <div className="space-y-3 sm:space-y-4">
                                {currentCategory?.items.map((item, index) => {
                                    const itemId = `${currentCategory.id}-${index}`;
                                    const isOpen = openItems.includes(itemId);
                                    return (
                                        <Card key={itemId} className="overflow-hidden">
                                            <button
                                                onClick={() => toggleItem(itemId)}
                                                className="w-full flex items-center justify-between p-4 sm:p-6 text-left gap-3"
                                            >
                                                <span className="font-medium text-sm sm:text-base text-zinc-900 dark:text-white">
                                                    {item.question}
                                                </span>
                                                <ChevronDown
                                                    className={`h-5 w-5 text-zinc-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''
                                                        }`}
                                                />
                                            </button>
                                            {isOpen && (
                                                <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-3 sm:pt-4">
                                                    {item.answer}
                                                </div>
                                            )}
                                        </Card>
                                    );
                                })}
                            </div>

                            {currentCategory?.items.length === 0 && (
                                <Card className="p-8 sm:p-12 text-center">
                                    <Search className="h-12 w-12 mx-auto mb-4 text-zinc-400" />
                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                                        No Results Found
                                    </h3>
                                    <p className="text-zinc-600 dark:text-zinc-400">
                                        Try searching with different keywords or contact support
                                    </p>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}


