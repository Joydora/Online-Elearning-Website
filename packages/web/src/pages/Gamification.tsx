import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    Flame, Trophy, Medal, ChevronLeft, Crown, Zap,
    TrendingUp, Calendar, Award, Shield, Target, Sparkles,
    Loader2,
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../stores/useAuthStore';

/* ───────────────── Types ───────────────── */
type StreakInfo = {
    currentStreak: number;
    longestStreak: number;
    totalXp: number;
    lastActivityDate: string | null;
    multiplier: number;
};

type BadgeItem = {
    type: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    isGlobal: boolean;
    earned: boolean;
    earnedAt: string | null;
    courseId: number | null;
    instances?: { courseId: number | null; earnedAt: string; metadata: unknown }[];
};

type LeaderboardEntry = {
    rank: number;
    userId: number;
    username: string;
    displayName: string;
    totalXp: number;
    currentStreak: number;
    longestStreak: number;
};

type LeaderboardData = {
    entries: LeaderboardEntry[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

type HeatmapData = Record<string, { count: number; xp: number }>;

type RankInfo = { rank: number | null; totalXp: number; totalPlayers: number };

/* ───────────────── Constants ───────────────── */
const RARITY_COLORS = {
    common: { bg: 'from-zinc-400 to-zinc-500', glow: 'rgba(161,161,170,0.3)', text: 'text-zinc-400', border: 'border-zinc-500/30' },
    rare: { bg: 'from-blue-400 to-blue-600', glow: 'rgba(59,130,246,0.4)', text: 'text-blue-400', border: 'border-blue-500/30' },
    epic: { bg: 'from-purple-400 to-purple-600', glow: 'rgba(147,51,234,0.4)', text: 'text-purple-400', border: 'border-purple-500/30' },
    legendary: { bg: 'from-amber-400 to-orange-500', glow: 'rgba(245,158,11,0.5)', text: 'text-amber-400', border: 'border-amber-500/30' },
};

const TABS = ['streaks', 'badges', 'leaderboard'] as const;
type Tab = typeof TABS[number];

/* ───────────────── Animated Number ───────────────── */
function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        if (value === 0) { setDisplay(0); return; }
        const start = performance.now();
        const from = 0;
        const step = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            setDisplay(Math.round(from + (value - from) * eased));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [value, duration]);
    return <>{display.toLocaleString()}</>;
}

/* ───────────────── Heatmap Component ───────────────── */
function ActivityHeatmap({ data }: { data: HeatmapData }) {
    const cells = useMemo(() => {
        const result: { date: string; count: number; xp: number; level: number }[] = [];
        const today = new Date();
        for (let i = 89; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const entry = data[dateStr] || { count: 0, xp: 0 };
            const level = entry.count === 0 ? 0 : entry.count <= 2 ? 1 : entry.count <= 5 ? 2 : entry.count <= 10 ? 3 : 4;
            result.push({ date: dateStr, count: entry.count, xp: entry.xp, level });
        }
        return result;
    }, [data]);

    const levelColors = [
        'bg-zinc-200 dark:bg-zinc-800/50',
        'bg-emerald-100 dark:bg-emerald-900/60',
        'bg-emerald-300 dark:bg-emerald-700/70',
        'bg-emerald-500 dark:bg-emerald-500/80',
        'bg-emerald-600 dark:bg-emerald-400',
    ];

    // Group into weeks (columns of 7)
    const weeks: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) {
        weeks.push(cells.slice(i, i + 7));
    }

    return (
        <div className="overflow-x-auto">
            <div className="flex gap-[3px] min-w-fit">
                {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[3px]">
                        {week.map((cell) => (
                            <div
                                key={cell.date}
                                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm ${levelColors[cell.level]} transition-all duration-200 hover:scale-150 hover:z-10 relative group cursor-pointer`}
                                title={`${cell.date}: ${cell.count} activities, ${cell.xp} XP`}
                            >
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 text-xs text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-zinc-700">
                                    <div className="font-medium">{new Date(cell.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                    <div className="text-zinc-400">{cell.count} activities · {cell.xp} XP</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-zinc-500">
                <span>Less</span>
                {levelColors.map((c, i) => (
                    <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
                ))}
                <span>More</span>
            </div>
        </div>
    );
}

/* ───────────────── Fire Animation CSS ───────────────── */
const fireCSS = `
@keyframes fireFlicker {
    0%, 100% { transform: scaleY(1) scaleX(1); opacity: 1; }
    25% { transform: scaleY(1.1) scaleX(0.95); opacity: 0.9; }
    50% { transform: scaleY(0.95) scaleX(1.05); opacity: 1; }
    75% { transform: scaleY(1.05) scaleX(0.98); opacity: 0.95; }
}
@keyframes fireGlow {
    0%, 100% { box-shadow: 0 0 20px rgba(251,146,60,0.4), 0 0 40px rgba(251,146,60,0.2); }
    50% { box-shadow: 0 0 30px rgba(251,146,60,0.6), 0 0 60px rgba(251,146,60,0.3); }
}
@keyframes badgeShine {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
}
@keyframes pulseGlow {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.05); }
}
@keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes countUp {
    from { opacity: 0; transform: scale(0.5); }
    to { opacity: 1; transform: scale(1); }
}
@keyframes podiumRise {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}
@keyframes floatBadge {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-4px); }
}
@keyframes sparkle {
    0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
    50% { opacity: 1; transform: scale(1) rotate(180deg); }
}
.fire-flicker { animation: fireFlicker 0.5s ease-in-out infinite; }
.fire-glow { animation: fireGlow 2s ease-in-out infinite; }
.badge-shine {
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: badgeShine 3s ease-in-out infinite;
}
.pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }
.slide-up { animation: slideUp 0.5s ease-out forwards; }
.count-up { animation: countUp 0.6s ease-out forwards; }
.podium-rise { animation: podiumRise 0.8s ease-out forwards; }
.float-badge { animation: floatBadge 3s ease-in-out infinite; }
`;

/* ───────────────── Main Page ───────────────── */
export default function Gamification() {
    const [activeTab, setActiveTab] = useState<Tab>('streaks');
    const [leaderboardPeriod, setLeaderboardPeriod] = useState<'weekly' | 'monthly' | 'all-time'>('all-time');
    const [lbPage, setLbPage] = useState(1);
    const user = useAuthStore((s) => s.user);

    // API queries
    const { data: streak, isLoading: streakLoading } = useQuery<StreakInfo>({
        queryKey: ['gamification-streak'],
        queryFn: async () => (await apiClient.get('/gamification/streak')).data,
    });

    const { data: badges, isLoading: badgesLoading } = useQuery<BadgeItem[]>({
        queryKey: ['gamification-badges'],
        queryFn: async () => (await apiClient.get('/gamification/badges')).data,
    });

    const { data: heatmap } = useQuery<HeatmapData>({
        queryKey: ['gamification-heatmap'],
        queryFn: async () => (await apiClient.get('/gamification/activity-heatmap?days=90')).data,
    });

    const { data: leaderboard, isLoading: lbLoading } = useQuery<LeaderboardData>({
        queryKey: ['gamification-leaderboard', leaderboardPeriod, lbPage],
        queryFn: async () => (await apiClient.get(`/gamification/leaderboard?period=${leaderboardPeriod}&page=${lbPage}&limit=20`)).data,
    });

    const { data: rank } = useQuery<RankInfo>({
        queryKey: ['gamification-rank'],
        queryFn: async () => (await apiClient.get('/gamification/rank')).data,
    });

    const earnedBadges = badges?.filter((b) => b.earned) ?? [];
    const lockedBadges = badges?.filter((b) => !b.earned) ?? [];

    return (
        <>
            <style>{fireCSS}</style>
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
                {/* ───── Hero Header ───── */}
                <div className="relative overflow-hidden">
                    {/* Animated background gradients */}
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5 dark:from-amber-600/10 dark:via-orange-600/5 dark:to-red-600/10" />
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
                    <div className="absolute top-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />

                    <div className="relative container mx-auto px-4 pt-6 pb-8 sm:pt-8 sm:pb-10">
                        <Link to="/my-courses" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors mb-4">
                            <ChevronLeft className="w-4 h-4" />
                            Back to My Courses
                        </Link>

                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 dark:from-amber-400 dark:via-orange-400 dark:to-red-400">
                                    Achievements
                                </h1>
                                <p className="text-zinc-600 dark:text-zinc-400 mt-1.5 text-sm sm:text-base">
                                    Track your learning journey, earn badges, and compete with peers
                                </p>
                            </div>

                            {/* Quick Stats */}
                            {streak && rank && (
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-zinc-800/60 backdrop-blur border border-zinc-200 dark:border-zinc-700/50 shadow-sm">
                                        <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                                        <span className="text-sm font-bold text-zinc-900 dark:text-white"><AnimatedNumber value={streak.totalXp} /></span>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400">XP</span>
                                    </div>
                                    {rank.rank && (
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-zinc-800/60 backdrop-blur border border-zinc-200 dark:border-zinc-700/50 shadow-sm">
                                            <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                                            <span className="text-sm font-bold text-zinc-900 dark:text-white">#{rank.rank}</span>
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400">Rank</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Tab Bar */}
                        <div className="flex gap-1 mt-6 p-1 bg-zinc-200/50 dark:bg-zinc-800/40 backdrop-blur rounded-xl border border-zinc-300/30 dark:border-zinc-700/30 max-w-fit">
                            {TABS.map((tab) => {
                                const icons = { streaks: Flame, badges: Award, leaderboard: Trophy };
                                const labels = { streaks: 'Streaks', badges: 'Badges', leaderboard: 'Leaderboard' };
                                const Icon = icons[tab];
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                                            activeTab === tab
                                                ? 'bg-white dark:bg-zinc-800/80 text-amber-600 dark:text-amber-400 shadow-sm dark:shadow-lg dark:shadow-amber-500/10 border border-zinc-200 dark:border-amber-500/20'
                                                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/40 dark:hover:bg-zinc-700/30'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {labels[tab]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ───── Content ───── */}
                <div className="container mx-auto px-4 pb-16">
                    {activeTab === 'streaks' && (
                        <StreaksTab streak={streak} heatmap={heatmap} loading={streakLoading} />
                    )}
                    {activeTab === 'badges' && (
                        <BadgesTab earned={earnedBadges} locked={lockedBadges} loading={badgesLoading} />
                    )}
                    {activeTab === 'leaderboard' && (
                        <LeaderboardTab
                            data={leaderboard}
                            loading={lbLoading}
                            period={leaderboardPeriod}
                            setPeriod={(p) => { setLeaderboardPeriod(p); setLbPage(1); }}
                            page={lbPage}
                            setPage={setLbPage}
                            currentUserId={user?.id ?? 0}
                        />
                    )}
                </div>
            </div>
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════
   STREAKS TAB
   ═══════════════════════════════════════════════════════════════ */
function StreaksTab({ streak, heatmap, loading }: { streak?: StreakInfo; heatmap?: HeatmapData; loading: boolean }) {
    if (loading || !streak) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            </div>
        );
    }

    const streakSize = streak.currentStreak >= 30 ? 'large' : streak.currentStreak >= 7 ? 'medium' : 'small';
    const fireColors = {
        small: 'from-orange-400 to-red-500',
        medium: 'from-orange-400 via-red-500 to-red-600',
        large: 'from-yellow-300 via-orange-400 to-red-600',
    };

    return (
        <div className="space-y-6 slide-up">
            {/* Main Streak Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-800/80 dark:to-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-700/40 p-6 sm:p-8 shadow-sm">
                {/* Background glow */}
                {streak.currentStreak > 0 && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
                )}

                <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                    {/* Fire Icon */}
                    <div className={`relative flex items-center justify-center ${streak.currentStreak > 0 ? 'fire-glow' : ''} rounded-full`}>
                        <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br ${streak.currentStreak > 0 ? fireColors[streakSize] : 'from-zinc-200 to-zinc-300 dark:from-zinc-600 dark:to-zinc-700'} flex items-center justify-center ${streak.currentStreak > 0 ? 'fire-flicker' : ''}`}>
                            <Flame className={`w-14 h-14 sm:w-16 sm:h-16 ${streak.currentStreak > 0 ? 'text-white drop-shadow-lg' : 'text-zinc-400'}`} />
                        </div>
                        {streak.currentStreak > 0 && (
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-500/30">
                                {streak.multiplier}x XP
                            </div>
                        )}
                    </div>

                    {/* Streak Info */}
                    <div className="text-center sm:text-left flex-1">
                        <div className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400 count-up">
                            <AnimatedNumber value={streak.currentStreak} />
                        </div>
                        <p className="text-lg text-zinc-700 dark:text-zinc-300 font-medium mt-1">
                            {streak.currentStreak === 0 ? 'Start your streak today!' : streak.currentStreak === 1 ? 'Day Streak — Keep going!' : 'Day Streak — You\'re on fire!'}
                        </p>
                        {streak.currentStreak === 0 && (
                            <p className="text-sm text-zinc-500 mt-2">Complete any lesson to start building your streak</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { icon: Flame, label: 'Current Streak', value: streak.currentStreak, suffix: 'days', color: 'text-orange-400', bg: 'from-orange-500/10 to-orange-600/5' },
                    { icon: Trophy, label: 'Longest Streak', value: streak.longestStreak, suffix: 'days', color: 'text-amber-400', bg: 'from-amber-500/10 to-amber-600/5' },
                    { icon: Zap, label: 'Total XP', value: streak.totalXp, suffix: 'pts', color: 'text-yellow-400', bg: 'from-yellow-500/10 to-yellow-600/5' },
                    { icon: TrendingUp, label: 'XP Multiplier', value: streak.multiplier, suffix: 'x', color: 'text-emerald-400', bg: 'from-emerald-500/10 to-emerald-600/5' },
                ].map((stat, i) => (
                    <div
                        key={stat.label}
                        className="relative overflow-hidden rounded-xl bg-white dark:bg-zinc-800/60 backdrop-blur border border-zinc-200 dark:border-zinc-700/30 p-4 sm:p-5 slide-up shadow-sm animate-in fade-in"
                        style={{ animationDelay: `${i * 100}ms` }}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg}`} />
                        <div className="relative">
                            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                            <div className={`text-2xl sm:text-3xl font-bold ${stat.color}`}>
                                <AnimatedNumber value={typeof stat.value === 'number' ? stat.value : 0} />
                                <span className="text-xs sm:text-sm ml-1 text-zinc-500 dark:text-zinc-400">{stat.suffix}</span>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Activity Heatmap */}
            <div className="rounded-2xl bg-white dark:bg-zinc-800/60 backdrop-blur border border-zinc-200 dark:border-zinc-700/30 p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    <h3 className="font-semibold text-zinc-900 dark:text-white">Activity Heatmap</h3>
                    <span className="text-xs text-zinc-500 ml-auto">Last 90 days</span>
                </div>
                {heatmap ? (
                    <ActivityHeatmap data={heatmap} />
                ) : (
                    <div className="h-24 flex items-center justify-center text-zinc-500 text-sm">Loading activity data...</div>
                )}
            </div>

            {/* Streak Milestones */}
            <div className="rounded-2xl bg-white dark:bg-zinc-800/60 backdrop-blur border border-zinc-200 dark:border-zinc-700/30 p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-amber-400" />
                    <h3 className="font-semibold text-zinc-900 dark:text-white">Streak Milestones</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { days: 3, label: 'Getting Warm', icon: '🔥', mult: '1.25x' },
                        { days: 7, label: 'On Fire', icon: '🔥🔥', mult: '1.5x' },
                        { days: 14, label: 'Blazing', icon: '☄️', mult: '1.75x' },
                        { days: 30, label: 'Unstoppable', icon: '💎', mult: '2x' },
                    ].map((m) => {
                        const reached = streak.longestStreak >= m.days;
                        const progress = Math.min(100, (streak.currentStreak / m.days) * 100);
                        return (
                            <div
                                key={m.days}
                                className={`rounded-xl p-3 sm:p-4 border transition-all duration-300 ${
                                    reached
                                        ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30'
                                        : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-700/30'
                                }`}
                            >
                                <div className="text-2xl mb-2">{m.icon}</div>
                                <p className={`text-sm font-semibold ${reached ? 'text-amber-400' : 'text-zinc-400'}`}>{m.label}</p>
                                <p className="text-xs text-zinc-500">{m.days} days · {m.mult} XP</p>
                                <div className="mt-2 h-1.5 bg-zinc-700/50 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${reached ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-zinc-600'}`}
                                        style={{ width: `${reached ? 100 : progress}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   BADGES TAB
   ═══════════════════════════════════════════════════════════════ */
function BadgesTab({ earned, locked, loading }: { earned: BadgeItem[]; locked: BadgeItem[]; loading: boolean }) {
    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
        );
    }

    return (
        <div className="space-y-8 slide-up">
            {/* Summary */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 dark:from-purple-500/10 dark:to-pink-500/10 border border-purple-500/20 backdrop-blur">
                    <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-lg font-bold text-zinc-900 dark:text-white">{earned.length}</span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">/ {earned.length + locked.length} Badges Earned</span>
                </div>
                <div className="flex gap-2 animate-in fade-in">
                    {Object.entries(RARITY_COLORS).map(([rarity, colors]) => {
                        const count = earned.filter((b) => b.rarity === rarity).length;
                        return (
                            <div key={rarity} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${colors.border} bg-white dark:bg-zinc-800/40 shadow-sm`}>
                                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${colors.bg}`} />
                                <span className={`text-xs font-medium ${colors.text}`}>{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Earned Badges */}
            {earned.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                        Earned Badges
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {earned.map((badge, i) => (
                            <BadgeCard key={`${badge.type}-${badge.courseId}`} badge={badge} index={i} />
                        ))}
                    </div>
                </div>
            )}

            {/* Locked Badges */}
            {locked.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-zinc-500 dark:text-zinc-400 mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                        Locked Badges
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {locked.map((badge, i) => (
                            <BadgeCard key={badge.type} badge={badge} index={i} locked />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function BadgeCard({ badge, index, locked }: { badge: BadgeItem; index: number; locked?: boolean }) {
    const colors = RARITY_COLORS[badge.rarity];
    return (
        <div
            className={`relative group rounded-xl border p-4 sm:p-5 transition-all duration-300 slide-up overflow-hidden ${
                locked
                    ? 'bg-zinc-100/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-700/20 opacity-60 hover:opacity-80'
                    : `bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-800/80 dark:to-zinc-900/80 ${colors.border} hover:border-opacity-60 hover:scale-[1.02] shadow-sm`
            }`}
            style={{ animationDelay: `${index * 60}ms` }}
        >
            {/* Shine overlay for earned badges */}
            {!locked && <div className="absolute inset-0 badge-shine rounded-xl" />}

            {/* Glow effect */}
            {!locked && (
                <div
                    className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                    style={{ background: colors.glow }}
                />
            )}

            <div className="relative">
                {/* Badge Icon */}
                <div className={`text-3xl sm:text-4xl mb-3 ${locked ? 'grayscale blur-[1px]' : 'float-badge'}`}>
                    {badge.icon}
                </div>

                {/* Rarity tag */}
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${
                    locked ? 'bg-zinc-800 text-zinc-500' : `bg-gradient-to-r ${colors.bg} text-white`
                }`}>
                    {badge.rarity}
                </div>

                {/* Name & Description */}
                <h4 className={`font-bold text-sm ${locked ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-white'}`}>
                    {badge.name}
                </h4>
                <p className={`text-xs mt-1 leading-relaxed ${locked ? 'text-zinc-500 dark:text-zinc-600' : 'text-zinc-600 dark:text-zinc-400'}`}>
                    {badge.description}
                </p>

                {/* Earned date or lock icon */}
                {locked ? (
                    <div className="mt-3 flex items-center gap-1 text-zinc-600">
                        <Shield className="w-3 h-3" />
                        <span className="text-[10px] uppercase tracking-wider">Locked</span>
                    </div>
                ) : badge.earnedAt ? (
                    <p className="mt-3 text-[10px] text-zinc-500">
                        Earned {new Date(badge.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                ) : null}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   LEADERBOARD TAB
   ═══════════════════════════════════════════════════════════════ */
function LeaderboardTab({
    data, loading, period, setPeriod, page, setPage, currentUserId,
}: {
    data?: LeaderboardData;
    loading: boolean;
    period: 'weekly' | 'monthly' | 'all-time';
    setPeriod: (p: 'weekly' | 'monthly' | 'all-time') => void;
    page: number;
    setPage: (p: number) => void;
    currentUserId: number;
}) {
    const top3 = data?.entries.slice(0, page === 1 ? 3 : 0) ?? [];
    const rest = data?.entries.slice(page === 1 ? 3 : 0) ?? [];

    return (
        <div className="space-y-6 slide-up">
            {/* Period Selector */}
            <div className="flex items-center gap-2 p-1 bg-zinc-200/50 dark:bg-zinc-800/40 rounded-xl border border-zinc-300/30 dark:border-zinc-700/30 max-w-fit shadow-inner">
                {[
                    { value: 'weekly' as const, label: 'This Week' },
                    { value: 'monthly' as const, label: 'This Month' },
                    { value: 'all-time' as const, label: 'All Time' },
                ].map((p) => (
                    <button
                        key={p.value}
                        onClick={() => setPeriod(p.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                            period === p.value
                                ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 border border-zinc-200 dark:border-amber-500/20 shadow-sm'
                                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                </div>
            ) : (
                <>
                    {/* Top 3 Podium */}
                    {page === 1 && top3.length >= 3 && (
                        <div className="flex items-end justify-center gap-3 sm:gap-4 py-6">
                            {/* 2nd Place */}
                            <PodiumCard entry={top3[1]} position={2} currentUserId={currentUserId} />
                            {/* 1st Place */}
                            <PodiumCard entry={top3[0]} position={1} currentUserId={currentUserId} />
                            {/* 3rd Place */}
                            <PodiumCard entry={top3[2]} position={3} currentUserId={currentUserId} />
                        </div>
                    )}

                    {/* If less than 3, show simple list */}
                    {page === 1 && top3.length > 0 && top3.length < 3 && (
                        <div className="space-y-2">
                            {top3.map((entry) => (
                                <LeaderboardRow key={entry.userId} entry={entry} currentUserId={currentUserId} />
                            ))}
                        </div>
                    )}

                    {/* Rest of leaderboard */}
                    {rest.length > 0 && (
                        <div className="rounded-2xl bg-white dark:bg-zinc-800/40 backdrop-blur border border-zinc-200 dark:border-zinc-700/30 overflow-hidden shadow-sm">
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-700/30">
                                {rest.map((entry) => (
                                    <LeaderboardRow key={entry.userId} entry={entry} currentUserId={currentUserId} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {data && data.entries.length === 0 && (
                        <div className="text-center py-16">
                            <Trophy className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                            <p className="text-zinc-400">No activity yet for this period</p>
                            <p className="text-sm text-zinc-500 mt-1">Complete lessons to appear on the leaderboard!</p>
                        </div>
                    )}

                    {/* Pagination */}
                    {data && data.totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="px-3 py-2 rounded-lg text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-zinc-400 px-3">
                                Page {page} of {data.totalPages}
                            </span>
                            <button
                                onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                                disabled={page === data.totalPages}
                                className="px-3 py-2 rounded-lg text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function PodiumCard({ entry, position, currentUserId }: { entry: LeaderboardEntry; position: number; currentUserId: number }) {
    const isMe = entry.userId === currentUserId;
    const config = {
        1: { height: 'h-36 sm:h-44', color: 'from-yellow-400 to-amber-500', icon: Crown, iconColor: 'text-yellow-400', delay: '200ms', size: 'w-28 sm:w-36' },
        2: { height: 'h-28 sm:h-36', color: 'from-zinc-300 to-zinc-400', icon: Medal, iconColor: 'text-zinc-300', delay: '400ms', size: 'w-24 sm:w-32' },
        3: { height: 'h-24 sm:h-28', color: 'from-orange-600 to-orange-700', icon: Medal, iconColor: 'text-orange-400', delay: '600ms', size: 'w-24 sm:w-32' },
    }[position]!;

    const Icon = config.icon;

    return (
        <div className={`${config.size} flex flex-col items-center podium-rise`} style={{ animationDelay: config.delay }}>
            {/* Avatar */}
            <div className={`relative mb-3 ${position === 1 ? 'scale-110' : ''}`}>
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg ${isMe ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-900' : ''}`}>
                    {entry.displayName.charAt(0).toUpperCase()}
                </div>
                <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-900 border-2 ${position === 1 ? 'border-yellow-400' : position === 2 ? 'border-zinc-400' : 'border-orange-500'} flex items-center justify-center`}>
                    <span className="text-[10px] font-bold text-zinc-900 dark:text-white">{position}</span>
                </div>
            </div>

            {/* Name */}
            <p className={`text-xs sm:text-sm font-semibold text-center truncate w-full ${isMe ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-900 dark:text-white'}`}>
                {isMe ? 'You' : entry.displayName}
            </p>

            {/* XP */}
            <p className={`text-xs ${config.iconColor} font-bold mt-0.5`}>
                {entry.totalXp.toLocaleString()} XP
            </p>

            {/* Pedestal */}
            <div className={`${config.height} w-full mt-3 rounded-t-xl bg-gradient-to-t ${config.color} flex flex-col items-center justify-start pt-3 relative overflow-hidden`}>
                <Icon className="w-6 h-6 text-white/80" />
                {entry.currentStreak > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-white/20 text-white">
                        <Flame className="w-3 h-3" />
                        <span className="text-[10px] font-bold">{entry.currentStreak}d</span>
                    </div>
                )}
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent badge-shine" />
            </div>
        </div>
    );
}

function LeaderboardRow({ entry, currentUserId }: { entry: LeaderboardEntry; currentUserId: number }) {
    const isMe = entry.userId === currentUserId;
    return (
        <div className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 transition-all duration-200 ${
            isMe
                ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/5 border-l-2 border-amber-500 dark:border-amber-400'
                : 'hover:bg-zinc-50 dark:hover:bg-zinc-700/20'
        }`}>
            {/* Rank */}
            <div className={`w-8 text-center font-bold text-sm ${
                entry.rank <= 3
                    ? entry.rank === 1 ? 'text-yellow-500 dark:text-yellow-400' : entry.rank === 2 ? 'text-zinc-400 dark:text-zinc-300' : 'text-orange-500 dark:text-orange-400'
                    : 'text-zinc-500'
            }`}>
                #{entry.rank}
            </div>

            {/* Avatar */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white ${
                isMe
                    ? 'bg-gradient-to-br from-amber-500 to-orange-500'
                    : 'bg-gradient-to-br from-zinc-300 to-zinc-400 dark:from-zinc-600 dark:to-zinc-700'
            }`}>
                {entry.displayName.charAt(0).toUpperCase()}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isMe ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-900 dark:text-white'}`}>
                    {entry.displayName}
                    {isMe && <span className="ml-2 text-[10px] uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">You</span>}
                </p>
                <p className="text-xs text-zinc-500">@{entry.username}</p>
            </div>

            {/* Streak */}
            {entry.currentStreak > 0 && (
                <div className="flex items-center gap-1 text-orange-400">
                    <Flame className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">{entry.currentStreak}d</span>
                </div>
            )}

            {/* XP */}
            <div className="text-right">
                <p className={`text-sm font-bold ${isMe ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-900 dark:text-white'}`}>
                    {entry.totalXp.toLocaleString()}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase">XP</p>
            </div>
        </div>
    );
}
