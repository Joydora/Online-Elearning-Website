import { Request, Response } from 'express';
import {
    getAllPromotions,
    getPromotionById,
    getActivePromotionByCode,
    createPromotion,
    updatePromotion,
    deletePromotion,
    calculateDiscount,
    type CreatePromotionInput,
    type UpdatePromotionInput,
} from '../services/promotion.service';
import { AuthenticatedUser } from '../types/auth';
import { writeAdminAuditLog } from '../services/adminAudit.service';

function getAdminId(req: Request): number | null {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    return user?.userId ?? null;
}

export async function getAllPromotionsController(req: Request, res: Response): Promise<Response> {
    try {
        const promotions = await getAllPromotions();
        return res.status(200).json(promotions);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch promotions',
            details: (error as Error).message,
        });
    }
}

export async function getPromotionByIdController(req: Request, res: Response): Promise<Response> {
    try {
        const promotionId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(promotionId)) {
            return res.status(400).json({ error: 'Promotion ID must be a number' });
        }

        const promotion = await getPromotionById(promotionId);

        if (!promotion) {
            return res.status(404).json({ error: 'Promotion not found' });
        }

        return res.status(200).json(promotion);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch promotion',
            details: (error as Error).message,
        });
    }
}

export async function validatePromotionCodeController(req: Request, res: Response): Promise<Response> {
    try {
        const { code, price } = req.body;

        if (!code || typeof code !== 'string') {
            return res.status(400).json({ error: 'Promotion code is required' });
        }

        if (!price || typeof price !== 'number' || price < 0) {
            return res.status(400).json({ error: 'Valid price is required' });
        }

        const promotion = await getActivePromotionByCode(code);

        if (!promotion) {
            return res.status(404).json({ error: 'Invalid or expired promotion code' });
        }

        // Check user ownership if coupon is user-restricted
        const authReq = req as Request & { user?: AuthenticatedUser };
        const currentUserId = authReq.user?.userId;

        if (promotion.userId !== null && promotion.userId !== currentUserId) {
            return res.status(403).json({ error: 'This promotion code is not valid for your account' });
        }

        const { discountedPrice, discountAmount } = calculateDiscount(price, promotion);

        return res.status(200).json({
            promotion: {
                id: promotion.id,
                code: promotion.code,
                description: promotion.description,
                discountType: promotion.discountType,
                discountValue: promotion.discountValue,
            },
            originalPrice: price,
            discountedPrice,
            discountAmount,
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to validate promotion code',
            details: (error as Error).message,
        });
    }
}

export async function createPromotionController(req: Request, res: Response): Promise<Response> {
    try {
        const input = req.body as CreatePromotionInput;

        // Validate required fields
        if (!input.code || !input.discountType || !input.discountValue || !input.startDate || !input.endDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const promotion = await createPromotion({
            ...input,
            startDate: new Date(input.startDate),
            endDate: new Date(input.endDate),
        });

        await writeAdminAuditLog({
            adminId: getAdminId(req),
            action: 'CREATE',
            resource: 'PROMOTION',
            resourceId: promotion.id,
            description: `Created promotion ${promotion.code}`,
            after: {
                code: promotion.code,
                discountType: promotion.discountType,
                discountValue: promotion.discountValue,
                startDate: promotion.startDate.toISOString(),
                endDate: promotion.endDate.toISOString(),
            },
        });

        return res.status(201).json(promotion);
    } catch (error) {
        const message = (error as Error).message;

        if (message.includes('already exists')) {
            return res.status(409).json({ error: message });
        }

        if (message.includes('date') || message.includes('discount')) {
            return res.status(400).json({ error: message });
        }

        return res.status(500).json({
            error: 'Unable to create promotion',
            details: message,
        });
    }
}

export async function updatePromotionController(req: Request, res: Response): Promise<Response> {
    try {
        const promotionId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(promotionId)) {
            return res.status(400).json({ error: 'Promotion ID must be a number' });
        }

        const input = req.body as UpdatePromotionInput;
        const before = await getPromotionById(promotionId);

        const promotion = await updatePromotion(promotionId, {
            ...input,
            startDate: input.startDate ? new Date(input.startDate) : undefined,
            endDate: input.endDate ? new Date(input.endDate) : undefined,
        });

        await writeAdminAuditLog({
            adminId: getAdminId(req),
            action: 'UPDATE',
            resource: 'PROMOTION',
            resourceId: promotion.id,
            description: `Updated promotion ${promotion.code}`,
            before: before
                ? {
                      code: before.code,
                      discountType: before.discountType,
                      discountValue: before.discountValue,
                      isActive: before.isActive,
                  }
                : undefined,
            after: {
                code: promotion.code,
                discountType: promotion.discountType,
                discountValue: promotion.discountValue,
                isActive: promotion.isActive,
            },
        });

        return res.status(200).json(promotion);
    } catch (error) {
        const message = (error as Error).message;

        if (message.includes('not found')) {
            return res.status(404).json({ error: message });
        }

        if (message.includes('already exists') || message.includes('date') || message.includes('discount')) {
            return res.status(400).json({ error: message });
        }

        return res.status(500).json({
            error: 'Unable to update promotion',
            details: message,
        });
    }
}

export async function deletePromotionController(req: Request, res: Response): Promise<Response> {
    try {
        const promotionId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(promotionId)) {
            return res.status(400).json({ error: 'Promotion ID must be a number' });
        }

        const before = await getPromotionById(promotionId);
        await deletePromotion(promotionId);

        await writeAdminAuditLog({
            adminId: getAdminId(req),
            action: 'DELETE',
            resource: 'PROMOTION',
            resourceId: promotionId,
            description: `Deleted promotion ${before?.code ?? promotionId}`,
            before: before
                ? {
                      code: before.code,
                      discountType: before.discountType,
                      discountValue: before.discountValue,
                      isActive: before.isActive,
                  }
                : undefined,
        });

        return res.status(200).json({ message: 'Promotion deleted successfully' });
    } catch (error) {
        const message = (error as Error).message;

        if (message.includes('not found')) {
            return res.status(404).json({ error: message });
        }

        return res.status(500).json({
            error: 'Unable to delete promotion',
            details: message,
        });
    }
}

