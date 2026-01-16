import type { Repository, FindOneOptions, ObjectLiteral } from 'typeorm';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Find an entity or throw a 404 error
 * Reduces boilerplate of checking for null and throwing AppError
 */
export async function findOrThrow<T extends ObjectLiteral>(
  repo: Repository<T>,
  options: FindOneOptions<T>,
  errorMessage: string,
  errorCode: string = 'NOT_FOUND'
): Promise<T> {
  const entity = await repo.findOne(options);
  if (!entity) {
    throw new AppError(errorMessage, 404, errorCode);
  }
  return entity;
}

/**
 * Find an entity by ID or throw a 404 error
 * Convenience wrapper for the common case of finding by primary key
 */
export async function findByIdOrThrow<T extends ObjectLiteral>(
  repo: Repository<T>,
  id: string,
  errorMessage: string,
  errorCode: string = 'NOT_FOUND'
): Promise<T> {
  return findOrThrow(repo, { where: { id } as any }, errorMessage, errorCode);
}

interface RequireOwnershipOptions {
  /** Allow admins to bypass ownership check */
  allowAdmin?: boolean;
  /** Custom error message */
  errorMessage?: string;
  /** Custom error code */
  errorCode?: string;
}

/**
 * Verify that the current user owns a resource
 * Throws 403 if ownership check fails
 */
export function requireOwnership(
  resourceUserId: string,
  currentUserId: string,
  currentUserRole?: string,
  options: RequireOwnershipOptions = {}
): void {
  const {
    allowAdmin = false,
    errorMessage = 'You do not have permission to modify this resource',
    errorCode = 'FORBIDDEN',
  } = options;

  const isOwner = resourceUserId === currentUserId;
  const isAdmin = allowAdmin && currentUserRole === 'admin';

  if (!isOwner && !isAdmin) {
    throw new AppError(errorMessage, 403, errorCode);
  }
}
