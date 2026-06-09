import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, Loader2, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '../lib/api';
import { showSuccessAlert, showErrorAlert } from '../lib/sweetalert';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            showErrorAlert('Error', 'Please enter your email address');
            return;
        }

        setIsLoading(true);

        try {
            await apiClient.post('/password/forgot', { email });
            setIsSent(true);
            showSuccessAlert(
                'Email sent!',
                'If an account with this email exists, we have sent a password reset link to your mailbox.'
            );
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || 'Could not send email. Please try again.';
            showErrorAlert('Error', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSent) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                        Email sent! ✅
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                        We have sent a password reset link to:
                    </p>
                    <p className="text-red-600 dark:text-red-400 font-semibold mb-6">
                        {email}
                    </p>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>Note:</strong> Please check your mailbox (including spam/junk folder) and click the link in the email. The link will expire after <strong>1 hour</strong>.
                        </p>
                    </div>
                    <div className="space-y-3">
                        <Link to="/login">
                            <Button className="w-full gap-2 bg-green-600 hover:bg-green-700">
                                <ArrowLeft className="w-4 h-4" />
                                Back to login
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsSent(false);
                                setEmail('');
                            }}
                            className="w-full"
                        >
                            Resend email
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                        Forgot password?
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        Enter your email address and we will send you a password reset link
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            <Mail className="w-4 h-4 inline mr-1" />
                            Email address
                        </label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@example.com"
                            className="h-12"
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 bg-red-600 hover:bg-red-700"
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Sending...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Send className="w-5 h-5" />
                                Send password reset link
                            </div>
                        )}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <Link
                        to="/login"
                        className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to login
                    </Link>
                </div>
            </Card>
        </div>
    );
}


