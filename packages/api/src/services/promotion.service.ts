import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type CreatePromotionInput = {
    code: string;
    description?: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    startDate: Date;
    endDate: Date;
    isActive?: boolean;
    courseId?: number;
    creatorId?: number;
};

export type UpdatePromotionInput = {
    code?: string;
    description?: string;
    discountType?: 'PERCENTAGE' | 'FIXED';
    discountValue?: number;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    startDate?: Date;
    endDate?: Date;
    isActive?: boolean;
    courseId?: number | null;
};

// Get all promotions (admin / teacher)
export async function getAllPromotions(creatorId?: number) {
    return prisma.promotion.findMany({
        where: creatorId ? { creatorId } : undefined,
        orderBy: { createdAt: 'desc' },
    });
}

// Get promotion by ID
export async function getPromotionById(promotionId: number) {
    return prisma.promotion.findUnique({
        where: { id: promotionId },
    });
}

// Get active promotion by code (for checkout)
export async function getActivePromotionByCode(code: string, courseId?: number) {
    const now = new Date();
    const promotion = await prisma.promotion.findFirst({
        where: {
            code: code.toUpperCase(),
            isActive: true,
            startDate: { lte: now },
            endDate: { gte: now },
        },
    });

    if (!promotion) {
        return null;
    }

    // Check usage limit
    if (promotion.usageLimit !== null && promotion.usedCount >= promotion.usageLimit) {
        return null;
    }

    // Verify course restriction if applicable
    if (promotion.courseId !== null && (courseId === undefined || promotion.courseId !== courseId)) {
        return null;
    }

    return promotion;
}

// Create promotion (admin / teacher)
export async function createPromotion(input: CreatePromotionInput) {
    // Check if code already exists
    const existing = await prisma.promotion.findUnique({
        where: { code: input.code.toUpperCase() },
    });

    if (existing) {
        throw new Error('Promotion code already exists');
    }

    // Validate dates
    if (input.startDate >= input.endDate) {
        throw new Error('End date must be after start date');
    }

    // Validate discount value
    if (input.discountType === 'PERCENTAGE' && (input.discountValue < 0 || input.discountValue > 100)) {
        throw new Error('Percentage discount must be between 0 and 100');
    }

    if (input.discountType === 'FIXED' && input.discountValue < 0) {
        throw new Error('Fixed discount must be positive');
    }

    return prisma.promotion.create({
        data: {
            code: input.code.toUpperCase(),
            description: input.description,
            discountType: input.discountType,
            discountValue: input.discountValue,
            minPurchaseAmount: input.minPurchaseAmount,
            maxDiscountAmount: input.maxDiscountAmount,
            usageLimit: input.usageLimit,
            startDate: input.startDate,
            endDate: input.endDate,
            isActive: input.isActive ?? true,
            courseId: input.courseId ? Number(input.courseId) : undefined,
            creatorId: input.creatorId ? Number(input.creatorId) : undefined,
        },
    });
}

// Update promotion (admin / teacher)
export async function updatePromotion(promotionId: number, input: UpdatePromotionInput) {
    const promotion = await prisma.promotion.findUnique({
        where: { id: promotionId },
    });

    if (!promotion) {
        throw new Error('Promotion not found');
    }

    // Check if code already exists (if changing code)
    if (input.code && input.code.toUpperCase() !== promotion.code) {
        const existing = await prisma.promotion.findUnique({
            where: { code: input.code.toUpperCase() },
        });

        if (existing) {
            throw new Error('Promotion code already exists');
        }
    }

    // Validate dates
    const startDate = input.startDate || promotion.startDate;
    const endDate = input.endDate || promotion.endDate;
    if (startDate >= endDate) {
        throw new Error('End date must be after start date');
    }

    // Validate discount value
    const discountValue = input.discountValue ?? promotion.discountValue;
    const discountType = input.discountType || promotion.discountType;

    if (discountType === 'PERCENTAGE' && (discountValue < 0 || discountValue > 100)) {
        throw new Error('Percentage discount must be between 0 and 100');
    }

    if (discountType === 'FIXED' && discountValue < 0) {
        throw new Error('Fixed discount must be positive');
    }

    return prisma.promotion.update({
        where: { id: promotionId },
        data: {
            code: input.code ? input.code.toUpperCase() : undefined,
            description: input.description,
            discountType: input.discountType,
            discountValue: input.discountValue,
            minPurchaseAmount: input.minPurchaseAmount,
            maxDiscountAmount: input.maxDiscountAmount,
            usageLimit: input.usageLimit,
            startDate: input.startDate,
            endDate: input.endDate,
            isActive: input.isActive,
            courseId: input.courseId !== undefined ? (input.courseId ? Number(input.courseId) : null) : undefined,
        },
    });
}

// Delete promotion (admin)
export async function deletePromotion(promotionId: number) {
    const promotion = await prisma.promotion.findUnique({
        where: { id: promotionId },
    });

    if (!promotion) {
        throw new Error('Promotion not found');
    }

    return prisma.promotion.delete({
        where: { id: promotionId },
    });
}

// Apply promotion to price (calculate discount)
export function calculateDiscount(
    originalPrice: number,
    promotion: { discountType: string; discountValue: number; maxDiscountAmount?: number | null; minPurchaseAmount?: number | null }
): { discountedPrice: number; discountAmount: number } {
    // Check minimum purchase
    if (promotion.minPurchaseAmount && originalPrice < promotion.minPurchaseAmount) {
        return { discountedPrice: originalPrice, discountAmount: 0 };
    }

    let discountAmount = 0;

    if (promotion.discountType === 'PERCENTAGE') {
        discountAmount = (originalPrice * promotion.discountValue) / 100;
        // Apply max discount if specified
        if (promotion.maxDiscountAmount && discountAmount > promotion.maxDiscountAmount) {
            discountAmount = promotion.maxDiscountAmount;
        }
    } else if (promotion.discountType === 'FIXED') {
        discountAmount = promotion.discountValue;
        // Don't discount more than the price
        if (discountAmount > originalPrice) {
            discountAmount = originalPrice;
        }
    }

    const discountedPrice = Math.max(0, originalPrice - discountAmount);

    return { discountedPrice, discountAmount };
}

// Increment usage count (called after successful payment)
export async function incrementPromotionUsage(code: string) {
    const promotion = await prisma.promotion.findFirst({
        where: { code: code.toUpperCase() },
    });

    if (!promotion) {
        return;
    }

    await prisma.promotion.update({
        where: { id: promotion.id },
        data: {
            usedCount: { increment: 1 },
        },
    });
}

