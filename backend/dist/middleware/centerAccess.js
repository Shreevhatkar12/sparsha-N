/**
 * Attaches `allowedCenterIds` for non-admin users (from JWT — refreshed at login with active assignments).
 * Admins get `undefined` (no filter). Use with Prisma `centerId: { in: req.allowedCenterIds }` when not admin.
 */
export function attachAllowedCenters(req, _res, next) {
    const user = req.user;
    if (!user) {
        next();
        return;
    }
    req.allowedCenterIds =
        (user.role === "super_admin" || user.role === "center_admin") ? undefined : user.centerIds;
    next();
}
