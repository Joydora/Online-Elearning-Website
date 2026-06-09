import { Shield, AlertCircle, Lock, Eye, Database, Bell } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function Privacy() {
    const lastUpdated = 'November 1, 2024';

    const highlights = [
        { icon: Lock, title: 'Data Security', description: 'Bank-grade SSL/TLS encryption' },
        { icon: Eye, title: 'No Tracking', description: 'No selling data to third parties' },
        { icon: Database, title: 'Control', description: 'You have full control over your data' },
        { icon: Bell, title: 'Transparent Notifications', description: 'Always updated on policy changes' },
    ];

    const sections = [
        {
            title: '1. Information We Collect',
            content: `
**Information you provide:**
• Registration information: name, email, password
• Profile information: avatar, bio, social media links
• Payment information: processed securely via third-party payment gateways
• Content you create: comments, reviews, questions

**Information automatically collected:**
• Device information: device type, operating system, browser
• Usage information: pages viewed, learning time, course progress
• IP address and geographic location (at country/city level)
• Cookies and similar technologies`,
        },
        {
            title: '2. How We Use Information',
            content: `
We use your information to:
• Provide and improve our services
• Personalize the learning experience and recommend suitable courses
• Process payments and transactions
• Send important notifications about accounts and courses
• Send newsletters and promotions (if subscribed)
• Analyze and improve service quality
• Detect and prevent fraud, abuse
• Comply with legal requirements`,
        },
        {
            title: '3. Information Sharing',
            content: `
**We DO NOT:**
• Sell your personal information
• Share information with third parties for advertising purposes

**We may share information with:**
• Service providers: payment processing, hosting, analytics (they may only use information to provide services to us)
• Instructors: your name and progress in their courses
• Legal authorities: when required by law
• Business partners: in case of mergers, acquisitions (with prior notice)`,
        },
        {
            title: '4. Data Security',
            content: `
We apply strict security measures:
• SSL/TLS encryption for all connections
• Encryption of sensitive data at rest
• Regular security audits
• Strict access controls for employees
• Regular data backups
• 24/7 intrusion detection monitoring

However, no method of transmission over the Internet or electronic storage is 100% secure. We encourage you to use a strong password and enable two-factor authentication.`,
        },
        {
            title: '5. Cookies and Tracking Technologies',
            content: `
**Necessary cookies:**
• Maintain session login
• Remember your preferences
• Ensure security

**Analytics cookies (can be declined):**
• Understand how you use the website
• Improve user experience

**Advertising cookies (can be declined):**
• Display relevant advertisements
• Measure advertising effectiveness

You can manage cookies in your browser settings or via our cookie banner.`,
        },
        {
            title: '6. Your Rights',
            content: `
You have the right to:
• **Access**: Request a copy of your personal information
• **Rectification**: Update or correct inaccurate information
• **Erasure**: Request deletion of your account and data
• **Restriction**: Request restriction of processing your data
• **Portability**: Receive your data in a readable format
• **Object**: Object to certain types of data processing
• **Withdraw Consent**: Withdraw consent at any time

To exercise your rights, contact: privacy@elearning.vn`,
        },
        {
            title: '7. Data Retention',
            content: `
• Account information: Retained as long as the account is active
• After account deletion: Data will be deleted within 30 days, except for:
  - Transaction records (as required by accounting law)
  - Data necessary to resolve disputes
• Anonymous analysis data may be retained longer`,
        },
        {
            title: '8. Children Protection',
            content: `
• E-Learning is not intended for children under 13
• Users aged 13-16 need parental consent
• If we discover that we have unintentionally collected information from a child under 13, we will delete it immediately
• Parents can contact us to request deletion of their child's information`,
        },
        {
            title: '9. International Transfers',
            content: `
Your data may be processed on servers located outside Vietnam. When transferring data internationally, we ensure appropriate safeguards in accordance with legal regulations.`,
        },
        {
            title: '10. Policy Changes',
            content: `
• We may update this policy periodically
• Significant changes will be notified via email
• The last updated date is always displayed at the top of the page
• Continued use of the service after changes constitutes acceptance of the new policy`,
        },
        {
            title: '11. Contact',
            content: `
If you have any questions about the privacy policy, please contact:

**Data Protection Department**
• Email: privacy@elearning.vn
• Hotline: 1900 1234
• Address: 123 ABC Street, District 1, Ho Chi Minh City, Vietnam

We will respond within 30 working days.`,
        },
    ];

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Hero */}
            <section className="py-16 bg-red-600">
                <div className="container mx-auto px-4 text-center text-white">
                    <Shield className="h-16 w-16 mx-auto mb-6 opacity-80" />
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
                    <p className="text-xl text-red-100 max-w-2xl mx-auto">
                        We are committed to protecting your privacy
                    </p>
                </div>
            </section>

            {/* Highlights */}
            <section className="py-12 -mt-8 relative z-10">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
                        {highlights.map((item) => (
                            <Card key={item.title} className="p-6 text-center bg-white dark:bg-zinc-900 shadow-xl">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <item.icon className="h-6 w-6 text-red-600 dark:text-red-400" />
                                </div>
                                <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">{item.title}</h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.description}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Content */}
            <section className="py-16">
                <div className="container mx-auto px-4 max-w-4xl">
                    {/* Last Updated Notice */}
                    <Card className="p-4 mb-8 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                Last updated: <strong>{lastUpdated}</strong>. Please read carefully to understand how we collect, use, and protect your information.
                            </p>
                        </div>
                    </Card>

                    {/* Sections */}
                    <div className="space-y-8">
                        {sections.map((section) => (
                            <Card key={section.title} className="p-6">
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
                                    {section.title}
                                </h2>
                                <div className="text-zinc-600 dark:text-zinc-400 whitespace-pre-line leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                                    {section.content}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}


