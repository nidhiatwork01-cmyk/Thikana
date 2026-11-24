import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../errors/index.js";
import { ApiResponse } from "@thikana/shared-types";
import { env } from "../config/index.js";

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const reqId = request.id || "req_unknown";

  // 1. Handle Zod validation errors
  if (error instanceof ZodError) {
    const formattedErrors = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code
    }));

    request.log.warn({ reqId, errors: formattedErrors }, "Validation failure");

    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload or query parameters",
        details: formattedErrors
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: reqId
      }
    };
    return reply.status(422).send(response);
  }

  // 2. Handle Known Operational Domain Errors
  if (error instanceof AppError) {
    request.log.warn(
      {
        reqId,
        code: error.code,
        statusCode: error.statusCode,
        message: error.message,
        details: error.details
      },
      "Handled operational error"
    );

    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: reqId
      }
    };
    return reply.status(error.statusCode).send(response);
  }

  // 3. Handle Unexpected Server Errors (500)
  request.log.error(
    {
      reqId,
      err: error.message,
      stack: error.stack
    },
    "Unhandled internal server error"
  );

  const response: ApiResponse<null> = {
    success: false,
    data: null,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        env.NODE_ENV === "production"
          ? "An unexpected internal server error occurred"
          : error.message
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: reqId
    }
  };

  return reply.status(500).send(response);
}
