import type { Prisma } from "@prisma/client";
import type { JwtPayload } from "./auth.js";

export function centerScope(user: JwtPayload): Prisma.StudentWhereInput {
  if (user.role === "admin") {
    return {};
  }

  return {
    centerId: {
      in: user.centerIds,
    },
  };
}
