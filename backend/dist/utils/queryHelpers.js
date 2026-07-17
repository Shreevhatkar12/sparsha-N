export function centerScopeWhere(role, allowedCenterIds) {
    if (role === 'super_admin')
        return {};
    return { centerId: { in: allowedCenterIds } };
}
export function buildCursorPagination(cursor, take = 50) {
    return {
        take,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'desc' },
    };
}
