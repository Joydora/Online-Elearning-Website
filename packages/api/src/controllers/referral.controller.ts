import { Request, Response } from 'express';
import { getReferralInfoForUser } from '../services/referral.service';
import { AuthenticatedUser } from '../types/auth';

export async function getMyReferralsController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };
        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const data = await getReferralInfoForUser(authReq.user.userId);
        return res.status(200).json(data);
    } catch (error) {
        const message = (error as Error).message;
        if (message === 'USER_NOT_FOUND') {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(500).json({
            error: 'Unable to fetch referral details',
            details: message,
        });
    }
}
