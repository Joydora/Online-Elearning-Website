import { useState } from 'react';
import { ChevronDown, PlayCircle, FileText, CheckCircle, Lock } from 'lucide-react';
import { Card } from './ui/card';

type Content = {
    contentId?: number;
    id?: number;
    title: string;
    order: number;
    contentType: 'VIDEO' | 'DOCUMENT' | 'QUIZ';
    videoUrl?: string | null;
    documentUrl?: string | null;
    durationInSeconds?: number | null;
    isFreePreview?: boolean;
};

type Module = {
    moduleId?: number;
    id?: number;
    title: string;
    order: number;
    contents: Content[];
};

type ModuleAccordionProps = {
    modules: Module[];
    isEnrolled?: boolean;
    onContentClick?: (contentId: number, moduleId: number) => void;
    completedContents?: number[];
};

export function ModuleAccordion({ 
    modules, 
    isEnrolled = false,
    onContentClick,
    completedContents = []
}: ModuleAccordionProps) {
    const [openModules, setOpenModules] = useState<number[]>([]);

    const toggleModule = (moduleId: number) => {
        setOpenModules(prev =>
            prev.includes(moduleId)
                ? prev.filter(id => id !== moduleId)
                : [...prev, moduleId]
        );
    };

    const getContentIcon = (contentType: Content['contentType']) => {
        switch (contentType) {
            case 'VIDEO':
                return <PlayCircle className="h-4 w-4" />;
            case 'DOCUMENT':
                return <FileText className="h-4 w-4" />;
            case 'QUIZ':
                return <CheckCircle className="h-4 w-4" />;
            default:
                return <FileText className="h-4 w-4" />;
        }
    };

    const formatDuration = (seconds: number | null | undefined) => {
        if (!seconds) return '';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const getTotalDuration = (contents: Content[]) => {
        const total = contents.reduce((acc, content) => acc + (content.durationInSeconds || 0), 0);
        return total;
    };

    return (
        <div className="space-y-3">
            {modules.map((module) => {
                const mid = (module.moduleId ?? module.id) as number;
                const isOpen = openModules.includes(mid);
                const totalDuration = getTotalDuration(module.contents);

                return (
                    <Card key={mid} className="overflow-hidden border-slate-200 dark:border-slate-800">
                        {/* Module Header */}
                        <button
                            onClick={() => toggleModule(mid)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                            <div className="flex items-center gap-3 text-left">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold">
                                    {module.order}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900 dark:text-white">
                                        {module.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {module.contents.length} bài học
                                        {totalDuration > 0 && ` • ${Math.floor(totalDuration / 60)} phút`}
                                    </p>
                                </div>
                            </div>
                            <ChevronDown
                                className={`h-5 w-5 text-slate-400 transition-transform ${
                                    isOpen ? 'rotate-180' : ''
                                }`}
                            />
                        </button>

                        {/* Module Contents */}
                        {isOpen && (
                            <div className="border-t border-slate-200 dark:border-slate-700">
                                {module.contents.map((content) => {
                                    const cid = (content.contentId ?? content.id) as number;
                                    const isCompleted = completedContents.includes(cid);
                                    const isPreview = !!content.isFreePreview;
                                    const clickable = isEnrolled || isPreview;

                                    return (
                                        <button
                                            key={cid}
                                            onClick={() => clickable && onContentClick?.(cid, mid)}
                                            disabled={!clickable}
                                            className={`w-full px-6 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-b-0 ${
                                                !clickable ? 'cursor-not-allowed opacity-60' : ''
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 text-left w-full">
                                                <div className={`text-slate-500 dark:text-slate-400 ${
                                                    isCompleted ? 'text-green-500 dark:text-green-400' : ''
                                                }`}>
                                                    {getContentIcon(content.contentType)}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-sm font-medium text-slate-700 dark:text-slate-300 ${
                                                        isCompleted ? 'line-through text-slate-500 dark:text-slate-500' : ''
                                                    }`}>
                                                        {content.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                        <span className="uppercase">{content.contentType}</span>
                                                        {content.durationInSeconds && (
                                                            <>
                                                                <span>•</span>
                                                                <span>{formatDuration(content.durationInSeconds)}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                {isPreview && (
                                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                                        Miễn phí
                                                    </span>
                                                )}
                                                {!isEnrolled && !isPreview && (
                                                    <Lock className="h-4 w-4 text-slate-400" />
                                                )}
                                                {isCompleted && (
                                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}

