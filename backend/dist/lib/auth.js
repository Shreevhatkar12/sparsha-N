import jwt from "jsonwebtoken";
import prisma from './prisma.js';
import { UnauthorizedError } from './errors.js';
function getJwtAccessSecret() {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        throw new Error("JWT_ACCESS_SECRET is not configured");
    }
    return secret;
}
const JWT_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN ?? "1d";
export async function buildJwtPayload(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            centerAssignments: {
                where: {
                    OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
                },
                select: { centerId: true, programId: true },
            },
        },
    });
    if (!user) {
        throw new UnauthorizedError("Invalid credentials");
    }
    return {
        userId: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        centerIds: user.centerAssignments.map((a) => a.centerId),
        programIds: user.centerAssignments
            .map((a) => a.programId)
            .filter((id) => id !== null && id !== undefined),
    };
}
export function signToken(payload) {
    return jwt.sign(payload, getJwtAccessSecret(), {
        expiresIn: JWT_EXPIRES_IN,
    });
}
export function verifyAccessToken(token) {
    try {
        const decoded = jwt.verify(token, getJwtAccessSecret());
        return decoded;
    }
    catch {
        throw new UnauthorizedError("Invalid or expired token");
    }
}
export const requireAuth = (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return next(new UnauthorizedError("Authorization token is required"));
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        return next();
    }
    catch (error) {
        return next(error);
    }
};
