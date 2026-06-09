import { FileText, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function Terms() {
    const lastUpdated = 'November 1, 2024';

    const sections = [
        {
            title: '1. Introduction',
            content: `Welcome to E-Learning. By accessing and using this website, you agree to comply with and be bound by the following terms and conditions. If you do not agree to any part of these terms, please do not use our services.`,
        },
        {
            title: '2. Definitions',
            content: `
• "E-Learning", "we", "our" refer to the E-Learning online platform and its operating company.
• "User", "you" refer to the individual or organization using our services.
• "Content" includes videos, documents, lectures, quizzes, and all other learning materials.
• "Instructor" refers to individuals or organizations providing course content on the platform.`,
        },
        {
            title: '3. User Accounts',
            content: `
• You must be at least 16 years old to create an account. Individuals under 16 need parental/guardian consent.
• You are responsible for maintaining the confidentiality of your account information and password.
• You must not share your account with others or allow others to access your account.
• We reserve the right to suspend or delete accounts if violations of terms are detected.`,
        },
        {
            title: '4. Service Usage',
            content: `
You agree to:
• Use the service for lawful learning purposes.
• Not copy, distribute, or share course content without permission.
• Not use automated software to download or access content.
• Not interfere with the operation of the system or security of the website.
• Not post unlawful, offensive, or spam content.`,
        },
        {
            title: '5. Intellectual Property Rights',
            content: `
• All content on E-Learning is protected by intellectual property laws.
• When purchasing a course, you are granted a personal, non-exclusive, non-transferable license.
• You must not:
  - Copy or record videos, documents
  - Distribute or resell content
  - Use content for commercial purposes
  - Remove or alter copyright notices`,
        },
        {
            title: '6. Payment and Refunds',
            content: `
• Course prices are displayed in USD and are subject to change.
• After successful payment, you will have lifetime access to the course (unless specified otherwise).
• Refund policy:
  - Request refund within 30 days of purchase
  - No refund if more than 30% of course content has been completed
  - Refunds will be processed within 7-14 working days`,
        },
        {
            title: '7. Limitation of Liability',
            content: `
• E-Learning provides services on an "as is" and "as available" basis.
• We do not guarantee that the service will be uninterrupted or error-free.
• We are not responsible for:
  - Indirect, incidental, or consequential damages
  - Loss of data or profits
  - Content provided by third-party instructors`,
        },
        {
            title: '8. Changes to Terms',
            content: `
• We reserve the right to modify these terms at any time.
• Changes will take effect immediately upon posting on the website.
• Continued use of the service after changes constitutes acceptance of the new terms.
• We will notify you of important changes via email.`,
        },
        {
            title: '9. Governing Law',
            content: `
These terms are governed by the laws of Vietnam. Any disputes arising will be resolved in the competent courts of Ho Chi Minh City, Vietnam.`,
        },
        {
            title: '10. Contact',
            content: `
If you have any questions about these terms, please contact:
• Email: legal@elearning.vn
• Hotline: 1900 1234
• Address: 123 ABC Street, District 1, Ho Chi Minh City, Vietnam`,
        },
    ];

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Hero */}
            <section className="py-16 bg-red-600">
                <div className="container mx-auto px-4 text-center text-white">
                    <FileText className="h-16 w-16 mx-auto mb-6 opacity-80" />
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
                    <p className="text-xl text-red-100 max-w-2xl mx-auto">
                        Please read the terms carefully before using the service
                    </p>
                </div>
            </section>

            {/* Content */}
            <section className="py-16">
                <div className="container mx-auto px-4 max-w-4xl">
                    {/* Last Updated Notice */}
                    <Card className="p-4 mb-8 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                Last updated: <strong>{lastUpdated}</strong>
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
                                <div className="text-zinc-600 dark:text-zinc-400 whitespace-pre-line leading-relaxed">
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


