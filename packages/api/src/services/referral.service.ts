import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getReferralInfoForUser(userId: number) {
    // 1. Fetch user to get referralCode
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { referralCode: true, username: true }
    });

    if (!user) {
        throw new Error('USER_NOT_FOUND');
    }

    // 2. Fetch referrals given by this user
    const referrals = await prisma.referral.findMany({
        where: { referrerId: userId },
        include: {
            referred: {
                select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    createdAt: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // 3. Fetch earned promotions for this user (referral coupons)
    const earnedCoupons = await prisma.promotion.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' }
    });

    const formattedReferrals = referrals.map(ref => ({
        id: ref.id,
        status: ref.status,
        createdAt: ref.createdAt,
        friend: {
            id: ref.referred.id,
            username: ref.referred.username,
            fullName: [ref.referred.firstName, ref.referred.lastName].filter(Boolean).join(' ') || ref.referred.username,
            joinedAt: ref.referred.createdAt
        }
    }));

    return {
        referralCode: user.referralCode,
        referralsCount: formattedReferrals.length,
        referralsCompletedCount: formattedReferrals.filter(r => r.status === 'COMPLETED').length,
        referrals: formattedReferrals,
        earnedCoupons
    };
}
