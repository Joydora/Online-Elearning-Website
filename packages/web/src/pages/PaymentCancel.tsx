import { Link } from 'react-router-dom';
import { XCircle, ArrowLeft, HelpCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export default function PaymentCancel() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-8 text-center shadow-2xl">
                <div className="mb-6">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                        Payment Cancelled
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        The payment transaction was cancelled or unsuccessful. You can try again or choose another course.
                    </p>
                </div>

                <div className="space-y-3">
                    <Link to="/courses" className="block">
                        <Button className="w-full gap-2 bg-red-600 hover:bg-red-700">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Courses
                        </Button>
                    </Link>
                    <Link to="/contact" className="block">
                        <Button variant="outline" className="w-full gap-2">
                            <HelpCircle className="w-4 h-4" />
                            Contact Support
                        </Button>
                    </Link>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-6">
                    If you experience issues, please contact support for assistance.
                </p>
            </Card>
        </div>
    );
}


