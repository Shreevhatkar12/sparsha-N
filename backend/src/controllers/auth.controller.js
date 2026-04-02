import * as authService from "../services/auth.service.js";

// Cookie config for refresh token
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,          // not accessible via JS
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

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

    const { user, accessToken, refreshToken } = await authService.registerUser({
      phone,
      email,
      password,
    });

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: { user, accessToken },
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
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Identifier (phone or email) and password are required",
      });
    }

    const { user, accessToken, refreshToken } = await authService.loginUser({
      identifier,
      password,
    });

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: { user, accessToken },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/refresh
 * Reads refresh token from httpOnly cookie
 */
export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    const { accessToken, user } = await authService.refreshAccessToken(refreshToken);

    return res.status(200).json({
      success: true,
      message: "Token refreshed",
      data: { accessToken, user },
    });
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
      success: true,
      data: { user },
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

    const result = await authService.changePassword(req.user.userId, {
      currentPassword,
      newPassword,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};