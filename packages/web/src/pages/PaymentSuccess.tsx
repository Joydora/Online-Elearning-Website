import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { apiClient } from '../lib/api';

export default function PaymentSuccess() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [confirming, setConfirming] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const courseId = searchParams.get('courseId');

        const confirmEnrollment = async () => {
            if (courseId) {
                try {
                    await apiClient.post(`/enroll/confirm/${courseId}`);
                    console.log('Enrollment confirmed for course:', courseId);
                } catch (err: any) {
                    // Ignore if already enrolled
                    if (err.response?.status !== 409) {
                        console.error('Failed to confirm enrollment:', err);
                        setError('Could not confirm enrollment. Please contact support.');
                    }
                }
            }
            setConfirming(false);
        };

        confirmEnrollment();

        // Auto redirect after 10 seconds
        const timer = setTimeout(() => {
            navigate('/my-courses');
        }, 10000);

        return () => clearTimeout(timer);
    }, [navigate, searchParams]);

    if (confirming) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center shadow-2xl">
                    <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                        Confirming enrollment...
                    </h1>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-8 text-center shadow-2xl">
                <div className="mb-6">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                        Payment Successful!
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        {error || 'Congratulations! You have successfully enrolled in the course. You can start learning now.'}
                    </p>
                </div>

                <div className="space-y-3">
                    <Link to="/my-courses" className="block">
                        <Button className="w-full gap-2 bg-red-600 hover:bg-red-700">
                            <BookOpen className="w-4 h-4" />
                            Go to My Courses
                        </Button>
                    </Link>
                    <Link to="/courses" className="block">
                        <Button variant="outline" className="w-full gap-2">
                            Explore More Courses
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-6">
                    Redirecting automatically in 10 seconds...
                </p>
            </Card>
        </div>
    );
}


