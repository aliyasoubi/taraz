import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import type { Request, Response } from 'express';

import {
  ConflictError,
  DomainError,
  ErrorParams,
  InvalidInputError,
  NotFoundError,
} from './errors';

export interface FieldError {
  code: string;
  params: ErrorParams;
}

/** Per-field validation failures, as constraint codes rather than English prose. */
export class ValidationException extends Error {
  constructor(readonly fieldErrors: Record<string, FieldError[]>) {
    super('Request validation failed');
    Object.setPrototypeOf(this, ValidationException.prototype);
  }

  static from(errors: ValidationError[]): ValidationException {
    const fieldErrors: Record<string, FieldError[]> = {};
    const walk = (nodes: ValidationError[], prefix: string): void => {
      for (const node of nodes) {
        const path = prefix ? `${prefix}.${node.property}` : node.property;
        if (node.constraints) {
          fieldErrors[path] = Object.keys(node.constraints).map((code) => ({
            code,
            params: {},
          }));
        }
        if (node.children?.length) walk(node.children, path);
      }
    };
    walk(errors, '');
    return new ValidationException(fieldErrors);
  }
}

/** The one error shape every endpoint returns. */
export interface ErrorResponse {
  statusCode: number;
  code: string;
  params: ErrorParams;
  fieldErrors?: Record<string, FieldError[]>;
  path: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request>();
    const body = this.toBody(exception, req.originalUrl ?? req.url);
    if (body.statusCode >= 500) this.logger.error(exception);
    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown, path: string): ErrorResponse {
    if (exception instanceof ValidationException) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'validation_failed',
        params: {},
        fieldErrors: exception.fieldErrors,
        path,
      };
    }
    if (exception instanceof DomainError) {
      const statusCode =
        exception instanceof NotFoundError
          ? HttpStatus.NOT_FOUND
          : exception instanceof ConflictError
            ? HttpStatus.CONFLICT
            : exception instanceof InvalidInputError
              ? HttpStatus.BAD_REQUEST
              : HttpStatus.UNPROCESSABLE_ENTITY;
      return {
        statusCode,
        code: exception.code,
        params: exception.params,
        path,
      };
    }
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const code =
        statusCode === 401
          ? 'unauthorized'
          : statusCode === 404
            ? 'not_found'
            : statusCode === 429
              ? 'too_many_requests'
              : `http_${statusCode}`;
      return { statusCode, code, params: {}, path };
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'internal_error',
      params: {},
      path,
    };
  }
}
