import { Link } from 'react-router-dom';
import {
    Headphones,
    MessageCircle,
    Mail,
    Phone,
    BookOpen,
    FileText,
    HelpCircle,
    Clock,
    CheckCircle,
    ArrowRight,
    Search
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function Support() {
    const [searchQuery, setSearchQuery] = useState('');

    const supportChannels = [
        {
            icon: MessageCircle,
            title: 'Live Chat',
            description: 'Chat directly with our support team',
            availability: 'Online 8:00 - 22:00',
            action: 'Start Chat',
            color: 'from-green-500 to-emerald-600',
        },
        {
            icon: Mail,
            title: 'Email',
            description: 'Send email and get a response within 24h',
            availability: 'support@elearning.vn',
            action: 'Send Email',
            href: 'mailto:support@elearning.vn',
            color: 'from-blue-500 to-indigo-600',
        },
        {
            icon: Phone,
            title: 'Hotline',
            description: 'Call us for the fastest support',
            availability: '1900 1234',
            action: 'Call Now',
            href: 'tel:19001234',
            color: 'from-red-500 to-red-600',
        },
    ];

    const quickLinks = [
        {
            icon: HelpCircle,
            title: 'Frequently Asked Questions',
            description: 'Find answers to common questions',
            link: '/faq',
        },
        {
            icon: BookOpen,
            title: 'User Manual',
            description: 'Learn how to use features',
            link: '/faq',
        },
        {
            icon: FileText,
            title: 'Policies & Terms',
            description: 'Read our regulations and policies',
            link: '/terms',
        },
    ];

    const commonIssues = [
        { title: 'Cannot login to account', category: 'Account' },
        { title: 'How to reset password', category: 'Account' },
        { title: 'Cannot watch course videos', category: 'Course' },
        { title: 'How to download completion certificate', category: 'Course' },
        { title: 'Request course refund', category: 'Payment' },
        { title: 'Failed payment error', category: 'Payment' },
    ];

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Hero */}
            <section className="py-16 bg-red-600">
                <div className="container mx-auto px-4 text-center text-white">
                    <Headphones className="h-16 w-16 mx-auto mb-6 opacity-80" />
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Support Center</h1>
                    <p className="text-xl text-red-100 max-w-2xl mx-auto mb-8">
                        We are always here to help. Choose the contact method that suits you best.
                    </p>

                    {/* Search */}
                    <div className="max-w-xl mx-auto relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                        <Input
                            type="text"
                            placeholder="Search for questions or issues..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 h-14 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                        />
                    </div>
                </div>
            </section>

            {/* Support Channels */}
            <section className="py-12 -mt-8 relative z-10">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {supportChannels.map((channel) => (
                            <Card key={channel.title} className="p-6 bg-white dark:bg-zinc-900 shadow-xl hover:shadow-2xl transition-all group">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${channel.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <channel.icon className="h-7 w-7 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                                    {channel.title}
                                </h3>
                                <p className="text-zinc-600 dark:text-zinc-400 mb-3">
                                    {channel.description}
                                </p>
                                <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-4">
                                    {channel.availability}
                                </p>
                                {channel.href ? (
                                    <a href={channel.href}>
                                        <Button className={`w-full bg-gradient-to-r ${channel.color}`}>
                                            {channel.action}
                                        </Button>
                                    </a>
                                ) : (
                                    <Button className={`w-full bg-gradient-to-r ${channel.color}`}>
                                        {channel.action}
                                    </Button>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Quick Links & Common Issues */}
            <section className="py-16">
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                        {/* Quick Links */}
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
                                Quick Links
                            </h2>
                            <div className="space-y-4">
                                {quickLinks.map((item) => (
                                    <Link key={item.title} to={item.link}>
                                        <Card className="p-5 hover:shadow-lg transition-all group cursor-pointer border-l-4 border-l-red-500">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                                                    <item.icon className="h-6 w-6 text-red-600 dark:text-red-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-zinc-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                                        {item.title}
                                                    </h3>
                                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                                        {item.description}
                                                    </p>
                                                </div>
                                                <ArrowRight className="h-5 w-5 text-zinc-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Common Issues */}
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
                                Common Issues
                            </h2>
                            <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {commonIssues.map((issue, index) => (
                                    <Link
                                        key={index}
                                        to="/faq"
                                        className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                            <span className="text-zinc-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                                {issue.title}
                                            </span>
                                        </div>
                                        <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                            {issue.category}
                                        </span>
                                    </Link>
                                ))}
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* Response Time */}
            <section className="py-16 bg-white dark:bg-zinc-900">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <Clock className="h-12 w-12 mx-auto mb-4 text-red-600" />
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                            Response Time
                        </h2>
                        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
                            We commit to responding quickly and resolving your issues as effectively as possible
                        </p>
                        <div className="grid grid-cols-3 gap-6">
                            <Card className="p-6 border-2 border-green-200 dark:border-green-800">
                                <div className="text-3xl font-bold text-green-600 mb-2">&lt; 5 mins</div>
                                <div className="text-sm text-zinc-600 dark:text-zinc-400">Live Chat</div>
                            </Card>
                            <Card className="p-6 border-2 border-blue-200 dark:border-blue-800">
                                <div className="text-3xl font-bold text-blue-600 mb-2">&lt; 24 hours</div>
                                <div className="text-sm text-zinc-600 dark:text-zinc-400">Email</div>
                            </Card>
                            <Card className="p-6 border-2 border-red-200 dark:border-red-800">
                                <div className="text-3xl font-bold text-red-600 mb-2">Immediate</div>
                                <div className="text-sm text-zinc-600 dark:text-zinc-400">Hotline</div>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16">
                <div className="container mx-auto px-4">
                    <Card className="max-w-4xl mx-auto p-8 bg-red-600 text-white text-center">
                        <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
                        <p className="text-red-100 mb-6">
                            If you cannot find the answer, please contact us directly
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link to="/contact">
                                <Button size="lg" className="bg-white text-red-600 hover:bg-red-50">
                                    <Mail className="h-5 w-5 mr-2" />
                                    Send support request
                                </Button>
                            </Link>
                            <Link to="/faq">
                                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                                    <HelpCircle className="h-5 w-5 mr-2" />
                                    View FAQ
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </section>
        </div>
    );
}


