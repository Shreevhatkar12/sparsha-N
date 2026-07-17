import { UserRole } from "@prisma/client";
import prisma from '../lib/prisma.js';
import { createUser, getMyCenters, getUserById, listUsers, resetUserPassword, softDeleteUser, updateUser, updateUserCenters, } from '../services/userService.js';
export async function listUsersController(req, res, next) {
    try {
        const requester = req.user;
        const result = await listUsers({
            role: req.query.role,
            centerId: req.query.centerId,
            isActive: typeof req.query.isActive === "string"
                ? req.query.isActive.toLowerCase() === "true"
                : undefined,
            search: req.query.search,
            page: req.query.page ? Number(req.query.page) : 1,
            limit: req.query.limit ? Number(req.query.limit) : 50,
            createdBy: (requester?.role === 'super_admin' || requester?.role === 'center_admin')
                ? undefined
                : requester?.userId
        });
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function getUserController(req, res, next) {
    try {
        const user = await getUserById(req.params.userId);
        return res.status(200).json(user);
    }
    catch (error) {
        return next(error);
    }
}
export async function createUserController(req, res, next) {
    try {
        const requester = req.user;
        const { role: targetRole, centerIds } = req.body;
        if (!requester || !requester.role) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }
        const requesterRole = requester.role;
        if (requesterRole === "super_admin") {
            const allowedForSuper = ["super_admin", "center_admin", "tech_admin", "teacher", "staff", "volunteer"];
            if (!allowedForSuper.includes(targetRole)) {
                return res.status(403).json({ success: false, error: "Invalid role assignment for Super Admin." });
            }
        }
        else if (requesterRole === "center_admin") {
            const allowedForAdmin = ["teacher", "staff", "volunteer"];
            if (!allowedForAdmin.includes(targetRole)) {
                return res.status(403).json({ success: false, error: "Center Admins can only create Teachers, Staff, or Volunteers." });
            }
        }
        else {
            return res.status(403).json({ success: false, error: "Access Denied." });
        }
        const userData = {
            ...req.body,
            centerIds: centerIds || [],
            createdBy: requester?.userId
        };
        const user = await createUser(userData);
        return res.status(201).json(user);
    }
    catch (error) {
        console.log("CREATE USER ERROR =>", error);
        return next(error);
    }
}
export async function updateUserController(req, res, next) {
    try {
        if ("email" in req.body) {
            return res.status(400).json({ success: false, error: "User ID (Email field) cannot be changed once created." });
        }
        if ("password" in req.body || "passwordHash" in req.body) {
            return res.status(400).json({ success: false, error: "Use the Reset Password option to change passwords." });
        }
        const user = await updateUser(req.params.userId, req.body);
        return res.status(200).json(user);
    }
    catch (error) {
        return next(error);
    }
}
export async function resetPasswordController(req, res, next) {
    try {
        const { newPassword } = req.body;
        const result = await resetUserPassword(req.params.userId, newPassword);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function deleteUserController(req, res, next) {
    try {
        const requester = req.user;
        const targetUser = await getUserById(req.params.userId);
        const hierarchy = {
            [UserRole.super_admin]: 3,
            [UserRole.center_admin]: 2,
            [UserRole.teacher]: 1,
            [UserRole.staff]: 0
        };
        const requesterLevel = hierarchy[requester.role] || 0;
        const targetLevel = hierarchy[targetUser.role] || 0;
        if (requesterLevel <= targetLevel && requester.role !== UserRole.super_admin) {
            return res.status(403).json({ success: false, error: "You do not have permission to delete this user." });
        }
        const result = await softDeleteUser(req.params.userId, requester);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function permanentDeleteUserController(req, res, next) {
    try {
        const requester = req.user;
        if (requester.role !== 'super_admin' && requester.role !== 'tech_admin') {
            return res.status(403).json({ success: false, error: "Only Super Admin or Tech Admin can permanently delete users." });
        }
        const userId = req.params.userId;
        if (requester.userId === userId) {
            return res.status(400).json({ success: false, error: "You cannot delete your own account." });
        }
        await prisma.userCenterAssignment.deleteMany({ where: { userId: userId } });
        await prisma.user.delete({ where: { id: userId } });
        return res.status(200).json({ success: true, message: "User permanently deleted." });
    }
    catch (error) {
        return next(error);
    }
}
export async function myCentersController(req, res, next) {
    try {
        const result = await getMyCenters(req.user);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function updateUserCentersController(req, res, next) {
    try {
        const requester = req.user;
        const { assignments } = req.body;
        if (!Array.isArray(assignments)) {
            return res.status(400).json({
                success: false,
                error: "assignments must be an array",
            });
        }
        const result = await updateUserCenters(requester.userId || requester.id, req.params.userId, assignments);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
