import type { AuthUser } from "../types/index.ts";

export const centerScope = (user: AuthUser | undefined) => {
  if (user?.role === "admin") {
    return {};
  }

  return {
    centerId: {
      in: Array.isArray(user?.centerIds) ? user.centerIds : user?.allowedCenterIds || [],
    },
  };
};
