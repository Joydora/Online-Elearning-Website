import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Trash2, Edit2, Send, X } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../stores/useAuthStore';
import { showSuccessAlert, showErrorAlert } from '../lib/sweetalert';

type Review = {
    id: number;
    rating: number;
    comment: string | null;
    datePosted: string;
    student: {
        id: number;
        username: string;
        fullName: string;
    };
    enrollmentDate: string;
};

type ReviewStats = {
    reviews: Review[];
    averageRating: number;
    totalReviews: number;
    ratingCounts: {
        5: number;
        4: number;
        3: number;
        2: number;
        1: number;
    };
};

type ReviewSectionProps = {
    courseId: number;
    isEnrolled: boolean;
};

export function ReviewSection({ courseId, isEnrolled }: ReviewSectionProps) {
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [hoveredStar, setHoveredStar] = useState(0);

    // Fetch reviews
    const { data: reviewData, isLoading } = useQuery<ReviewStats>({
        queryKey: ['course-reviews', courseId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/courses/${courseId}/reviews`);
            return data;
        },
    });

    // Fetch user's review
    const { data: userReview } = useQuery<Review | null>({
        queryKey: ['user-review', courseId],
        queryFn: async () => {
            try {
                const { data } = await apiClient.get(`/courses/${courseId}/reviews/my`);
                return data;
            } catch (error: any) {
                if (error.response?.status === 404) {
                    return null;
                }
                throw error;
            }
        },
        enabled: !!user && isEnrolled,
    });

    // Submit review mutation
    const submitReviewMutation = useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.post(`/courses/${courseId}/reviews`, {
                rating,
                comment: comment.trim() || undefined,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course-reviews', courseId] });
            queryClient.invalidateQueries({ queryKey: ['user-review', courseId] });
            showSuccessAlert('Success!', 'Your review has been submitted.');
            setShowForm(false);
            setComment('');
            setRating(5);
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.error || 'Could not submit review. Please try again.';
            showErrorAlert('Error', errorMessage);
        },
    });

    // Delete review mutation
    const deleteReviewMutation = useMutation({
        mutationFn: async (reviewId: number) => {
            await apiClient.delete(`/reviews/${reviewId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course-reviews', courseId] });
            queryClient.invalidateQueries({ queryKey: ['user-review', courseId] });
            showSuccessAlert('Success!', 'Review has been deleted.');
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.error || 'Could not delete review.';
            showErrorAlert('Error', errorMessage);
        },
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const handleEdit = () => {
        if (userReview) {
            setRating(userReview.rating);
            setComment(userReview.comment || '');
            setShowForm(true);
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-zinc-600 dark:text-zinc-400">Loading reviews...</p>
            </div>
        );
    }

    if (!reviewData) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Stats Section */}
            <Card className="p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
                    Ratings and Reviews
                </h2>

                <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                    {/* Average Rating */}
                    <div className="text-center md:text-left">
                        <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                            {reviewData.averageRating.toFixed(1)}
                        </div>
                        <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`w-6 h-6 ${star <= Math.round(reviewData.averageRating)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-300 dark:text-gray-600'
                                        }`}
                                />
                            ))}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">
                            Based on {reviewData.totalReviews} reviews
                        </p>
                    </div>

                    {/* Rating Breakdown */}
                    <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = reviewData.ratingCounts[star as keyof typeof reviewData.ratingCounts];
                            const percentage = reviewData.totalReviews > 0 ? (count / reviewData.totalReviews) * 100 : 0;
                            return (
                                <div key={star} className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 w-20">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {star}
                                        </span>
                                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    </div>
                                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-yellow-400 transition-all"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                                        {count}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Card>

            {/* User Review Form */}
            {isEnrolled && user && (
                <Card className="p-4 sm:p-6">
                    {userReview && !showForm ? (
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                            Your Review
                                        </h3>
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`w-4 h-4 ${star <= userReview.rating
                                                            ? 'fill-yellow-400 text-yellow-400'
                                                            : 'text-gray-300 dark:text-gray-600'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    {userReview.comment && (
                                        <p className="text-gray-600 dark:text-gray-400 mb-2 whitespace-pre-wrap break-words">
                                            {userReview.comment}
                                        </p>
                                    )}
                                    <p className="text-sm text-gray-500 dark:text-gray-505">
                                        {formatDate(userReview.datePosted)}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleEdit}
                                        className="text-blue-600 hover:text-blue-700"
                                    >
                                        <Edit2 className="w-4 h-4 mr-1" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            if (confirm('Are you sure you want to delete this review?')) {
                                                deleteReviewMutation.mutate(userReview.id);
                                            }
                                        }}
                                        className="text-red-600 hover:text-red-700"
                                        disabled={deleteReviewMutation.isPending}
                                    >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (showForm || !userReview) ? (
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                                {userReview ? 'Edit Review' : 'Write a Review'}
                            </h3>
                            <div className="space-y-4">
                                {/* Star Rating */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Rating
                                    </label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                onMouseEnter={() => setHoveredStar(star)}
                                                onMouseLeave={() => setHoveredStar(0)}
                                                className="focus:outline-none"
                                            >
                                                <Star
                                                    className={`w-8 h-8 transition-colors ${star <= (hoveredStar || rating)
                                                            ? 'fill-yellow-400 text-yellow-400'
                                                            : 'text-gray-300 dark:text-gray-600'
                                                        }`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Comment */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Comment (optional)
                                    </label>
                                    <Textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Share your experience with this course..."
                                        rows={4}
                                        className="resize-none"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => {
                                            submitReviewMutation.mutate();
                                        }}
                                        disabled={submitReviewMutation.isPending}
                                        className="gap-2"
                                    >
                                        <Send className="w-4 h-4" />
                                        {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                                    </Button>
                                    {userReview && (
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowForm(false);
                                                setComment('');
                                                setRating(5);
                                            }}
                                        >
                                            <X className="w-4 h-4 mr-1" />
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <Button
                                variant="outline"
                                onClick={() => setShowForm(true)}
                                className="w-full"
                            >
                                <Star className="w-4 h-4 mr-2" />
                                Write a Review
                            </Button>
                        </div>
                    )}
                </Card>
            )}

            {/* Reviews List */}
            {reviewData.reviews.length === 0 ? (
                <Card className="p-6 sm:p-8 text-center">
                    <Star className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        No reviews yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        Be the first to review this course!
                    </p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {reviewData.reviews.map((review) => (
                        <Card key={review.id} className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-semibold shrink-0">
                                        {review.student.fullName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                                            {review.student.fullName}
                                        </p>
                                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">
                                            {formatDate(review.datePosted)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={`w-4 h-4 ${star <= review.rating
                                                    ? 'fill-yellow-400 text-yellow-400'
                                                    : 'text-gray-300 dark:text-gray-600'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                            {review.comment && (
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                                    {review.comment}
                                </p>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}


