import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler.js";
import { UserRole } from "../entities/User.js";

/**
 * Middleware to require specific roles
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(
        new AppError(
          "You must be logged in to access this feature. Please log in and try again.",
          401,
          "UNAUTHORIZED",
        ),
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      const roleDescription = allowedRoles.includes("admin")
        ? "administrator"
        : allowedRoles.includes("moderator")
          ? "moderator or administrator"
          : allowedRoles.join(" or ");
      return next(
        new AppError(
          `This action requires ${roleDescription} privileges. Your current role does not have access.`,
          403,
          "INSUFFICIENT_PERMISSIONS",
        ),
      );
    }

    next();
  };
}

/**
 * Require moderator or admin role
 */
export const requireModerator = requireRole("moderator", "admin");

/**
 * Require admin role
 */
export const requireAdmin = requireRole("admin");
