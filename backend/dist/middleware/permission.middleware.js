import { ROLE_PERMISSIONS } from "../config/rbac.js";
export const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Authentication is required" });
        }
        const userRole = req.user.role;
        const allowedPermissions = ROLE_PERMISSIONS[userRole] || [];
        if (!allowedPermissions.includes(permission)) {
            return res.status(403).json({
                success: false,
                message: `Forbidden: requires ${permission} permission`,
            });
        }
        next();
    };
};
