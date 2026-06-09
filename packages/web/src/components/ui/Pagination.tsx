import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    siblingCount?: number;
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    siblingCount = 1,
}: PaginationProps) {
    // If there is only 1 page, don't render pagination
    if (totalPages <= 1) return null;

    const generatePageNumbers = () => {
        const totalNumbers = siblingCount * 2 + 5; // siblingCount + first + last + current + 2*ellipses

        if (totalPages <= totalNumbers) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
        const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

        const shouldShowLeftDots = leftSiblingIndex > 2;
        const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

        const firstPageIndex = 1;
        const lastPageIndex = totalPages;

        if (!shouldShowLeftDots && shouldShowRightDots) {
            const leftItemCount = 3 + 2 * siblingCount;
            const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
            return [...leftRange, '...', totalPages];
        }

        if (shouldShowLeftDots && !shouldShowRightDots) {
            const rightItemCount = 3 + 2 * siblingCount;
            const rightRange = Array.from(
                { length: rightItemCount },
                (_, i) => totalPages - rightItemCount + 1 + i
            );
            return [firstPageIndex, '...', ...rightRange];
        }

        if (shouldShowLeftDots && shouldShowRightDots) {
            const middleRange = Array.from(
                { length: rightSiblingIndex - leftSiblingIndex + 1 },
                (_, i) => leftSiblingIndex + i
            );
            return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
        }

        return [];
    };

    const pages = generatePageNumbers();

    return (
        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 px-4 py-4 sm:px-6 mt-6">
            {/* Mobile View */}
            <div className="flex flex-1 justify-between sm:hidden">
                <button
                    onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                    Previous
                </button>
                <span className="text-sm text-zinc-700 dark:text-zinc-300 flex items-center">
                    Page {currentPage} of {totalPages}
                </span>
                <button
                    onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                    Next
                </button>
            </div>

            {/* Desktop View */}
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-400">
                        Showing page <span className="font-semibold text-zinc-900 dark:text-white">{currentPage}</span> of{' '}
                        <span className="font-semibold text-zinc-900 dark:text-white">{totalPages}</span> pages
                    </p>
                </div>
                <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        {/* Go to First Page */}
                        <button
                            onClick={() => onPageChange(1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-zinc-400 dark:text-zinc-500 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            title="First Page"
                        >
                            <span className="sr-only">First Page</span>
                            <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
                        </button>

                        {/* Previous Page */}
                        <button
                            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 text-zinc-400 dark:text-zinc-500 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            title="Previous Page"
                        >
                            <span className="sr-only">Previous Page</span>
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        </button>

                        {/* Page Numbers */}
                        {pages.map((page, index) => {
                            if (page === '...') {
                                return (
                                    <span
                                        key={`dots-${index}`}
                                        className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-400 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700"
                                    >
                                        ...
                                    </span>
                                );
                            }

                            const isCurrent = page === currentPage;

                            return (
                                <button
                                    key={`page-${page}`}
                                    onClick={() => onPageChange(page as number)}
                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 transition-all ${
                                        isCurrent
                                            ? 'z-10 bg-red-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600'
                                            : 'text-zinc-900 dark:text-zinc-300 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:outline-offset-0'
                                    }`}
                                >
                                    {page}
                                </button>
                            );
                        })}

                        {/* Next Page */}
                        <button
                            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 text-zinc-400 dark:text-zinc-500 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            title="Next Page"
                        >
                            <span className="sr-only">Next Page</span>
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>

                        {/* Go to Last Page */}
                        <button
                            onClick={() => onPageChange(totalPages)}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-zinc-400 dark:text-zinc-500 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            title="Last Page"
                        >
                            <span className="sr-only">Last Page</span>
                            <ChevronsRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
}
