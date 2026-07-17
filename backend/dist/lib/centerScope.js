export const centerScope = (user) => {
    if (user?.role === "super_admin" || user?.role === "tech_admin") {
        return {};
    }
    return {
        centerId: {
            in: user?.centerIds || [],
        },
    };
};
