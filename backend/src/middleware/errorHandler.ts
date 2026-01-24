import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import logger from "../utils/logger.js";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR",
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Format Zod validation errors into user-friendly messages
 */
function formatZodErrors(error: ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join(".");
    const fieldName = path || "input";

    switch (issue.code) {
      case "invalid_type":
        if (issue.received === "undefined") {
          return `${fieldName} is required`;
        }
        return `${fieldName} must be a ${issue.expected}, but received ${issue.received}`;
      case "too_small":
        if (issue.type === "string") {
          if (issue.minimum === 1) {
            return `${fieldName} cannot be empty`;
          }
          return `${fieldName} must be at least ${issue.minimum} characters`;
        }
        if (issue.type === "array") {
          return `${fieldName} must have at least ${issue.minimum} item(s)`;
        }
        return `${fieldName} must be at least ${issue.minimum}`;
      case "too_big":
        if (issue.type === "string") {
          return `${fieldName} must be no more than ${issue.maximum} characters`;
        }
        return `${fieldName} must be no more than ${issue.maximum}`;
      case "invalid_string":
        if (issue.validation === "email") {
          return `${fieldName} must be a valid email address`;
        }
        if (issue.validation === "url") {
          return `${fieldName} must be a valid URL`;
        }
        if (issue.validation === "uuid") {
          return `${fieldName} must be a valid ID`;
        }
        return `${fieldName} has an invalid format`;
      case "invalid_enum_value":
        return `${fieldName} must be one of: ${issue.options.join(", ")}`;
      case "custom":
        return issue.message;
      default:
        return issue.message;
    }
  });

  return issues.join(". ");
}

/**
 * Format database errors into user-friendly messages
 */
function formatDatabaseError(
  err: Error & { code?: string; detail?: string },
): string {
  // PostgreSQL error codes
  if (err.code === "23505") {
    // Unique constraint violation
    if (err.detail?.includes("email")) {
      return "This email address is already registered";
    }
    if (err.detail?.includes("username")) {
      return "This username is already taken";
    }
    return "A record with this information already exists";
  }
  if (err.code === "23503") {
    // Foreign key violation
    return "The referenced item does not exist or has been deleted";
  }
  if (err.code === "23502") {
    // Not null violation
    return "A required field is missing";
  }
  if (err.code === "22P02") {
    // Invalid text representation (e.g., invalid UUID)
    return "Invalid ID format provided";
  }

  return env.isDev
    ? err.message
    : "A database error occurred. Please try again.";
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  logger.error(`${req.method} ${req.path}`, {
    name: err.name,
    message: err.message,
    stack: env.isDev ? err.stack : undefined,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        ...(env.isDev && err.details ? { details: err.details } : {}),
      },
    });
  }

  // Validation errors from Zod
  if (err instanceof ZodError || err.name === "ZodError") {
    const zodError = err as ZodError;
    const message = formatZodErrors(zodError);
    return res.status(400).json({
      error: {
        message,
        code: "VALIDATION_ERROR",
        ...(env.isDev ? { details: zodError.issues } : {}),
      },
    });
  }

  // Multer file upload errors
  if (err.name === "MulterError") {
    const multerErr = err as Error & { code?: string };
    let message = "File upload error";
    if (multerErr.code === "LIMIT_FILE_SIZE") {
      message = "File is too large. Maximum size is 5MB.";
    } else if (multerErr.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Unexpected file field in upload";
    }
    return res.status(400).json({
      error: {
        message,
        code: "UPLOAD_ERROR",
      },
    });
  }

  // TypeORM/database errors
  if (err.name === "QueryFailedError" || err.name === "EntityNotFoundError") {
    const dbErr = err as Error & { code?: string; detail?: string };
    const message = formatDatabaseError(dbErr);
    return res.status(err.name === "EntityNotFoundError" ? 404 : 500).json({
      error: {
        message,
        code:
          err.name === "EntityNotFoundError" ? "NOT_FOUND" : "DATABASE_ERROR",
      },
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: {
        message: "Invalid authentication token. Please log in again.",
        code: "INVALID_TOKEN",
      },
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      error: {
        message: "Your session has expired. Please log in again.",
        code: "TOKEN_EXPIRED",
      },
    });
  }

  // Default error
  return res.status(500).json({
    error: {
      message: env.isDev
        ? err.message
        : "An unexpected error occurred. Please try again later.",
      code: "INTERNAL_ERROR",
    },
  });
}
