import * as authService from "../services/auth.service.js";

/**
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { phone, email, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const { user, token } = await authService.registerUser({
      phone,
      email,
      password,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: { user, token },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    const { user, token } = await authService.loginUser({
      email,
      password,
    });

    return res.status(200).json({
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/refresh
 * Accepts token in request body
 */
export const refresh = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "token is required",
      });
    }

    const refreshed = await authService.refreshAccessToken(token);

    return res.status(200).json(refreshed);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = (_req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

/**
 * GET /api/auth/me  (protected)
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.userId);

    return res.status(200).json({
      user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/auth/change-password  (protected)
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "currentPassword and newPassword are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters",
      });
    }

    await authService.changePassword(req.user.userId, {
      currentPassword,
      newPassword,
    });

    return res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
};