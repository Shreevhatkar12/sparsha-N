import { Request, Response, NextFunction } from "express";
import * as authService from "@/services/auth.service.ts"
// Extend Request to include user (from auth middleware)

/**
 * POST /api/auth/register
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { phone, email, password } = req.body as {
      phone?: string;
      email?: string;
      password?: string;
    };

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
    console.error("Register Error:", err);
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

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
    console.error("Login Error:", err);
    next(err);
  }
};

/**
 * POST /api/auth/refresh
 * Accepts token in request body
 */
export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { token } = req.body as { token?: string };

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "token is required",
      });
    }

    const refreshed = await authService.refreshAccessToken(token);

    return res.status(200).json(refreshed);
  } catch (err) {
    console.error("Refresh Token Error:", err);
    next(err);
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = (
  _req: Request,
  res: Response
): Response => {
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
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await authService.getMe(req.user.id);

    return res.status(200).json({
      user,
    });
  } catch (err) {
    console.error("GetMe Error:", err);
    next(err);
  }
};

/**
 * PUT /api/auth/change-password  (protected)
 */
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

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

    await authService.changePassword(req.user.id, {
      currentPassword,
      newPassword,
    });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("Change Password Error:", err);
    next(err);
  }
};