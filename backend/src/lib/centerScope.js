export const centerScope = (user) => {
  if (user?.role === "admin") {
    return {};
  }

  return {
    centerId: {
      in: Array.isArray(user?.centerIds) ? user.centerIds : [],
    },
  };
};
