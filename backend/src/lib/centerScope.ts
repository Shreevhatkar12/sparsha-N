import type { AuthUser } from '../types/index.js';

export const centerScope = (user: AuthUser | undefined) => {
  if (user?.role === "super_admin") {
    return {};
  }

  return {
    centerId: {
      in: Array.isArray(user?.centerIds) ? user.centerIds : user?.allowedCenterIds || [],
    },
  };
};
