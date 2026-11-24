import { FastifyInstance } from "fastify";
import { authService } from "./auth.service.js";
import { otpService } from "./otp.service.js";
import { signupSchema, loginSchema, sendOtpSchema, verifyOtpSchema } from "./auth.schema.js";
import { authenticate } from "../../middlewares/auth.js";
import { ApiResponse, AuthResponse, UserProfile } from "@thikana/shared-types";
import { prisma } from "../../lib/prisma.js";

export async function authRoutes(app: FastifyInstance) {
  // Signup
  app.post("/signup", async (request, reply) => {
    const input = signupSchema.parse(request.body);
    const result = await authService.signup(input);

    // Set httpOnly secure refresh token cookie
    reply.setCookie("refreshToken", result.refreshToken, {
      path: "/api/v1/auth",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    });

    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: {
        user: result.user,
        tokens: {
          accessToken: result.accessToken,
          expiresIn: 900 // 15 min
        }
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id
      }
    };
    return reply.status(201).send(response);
  });

  // Login
  app.post("/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const result = await authService.login(input);

    reply.setCookie("refreshToken", result.refreshToken, {
      path: "/api/v1/auth",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60
    });

    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: {
        user: result.user,
        tokens: {
          accessToken: result.accessToken,
          expiresIn: 900
        }
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id
      }
    };
    return reply.status(200).send(response);
  });

  // Refresh Token Rotation
  app.post("/refresh", async (request, reply) => {
    const cookies = request.cookies as Record<string, string>;
    const token = cookies.refreshToken || (request.body as any)?.refreshToken;

    if (!token) {
      return reply.status(401).send({
        success: false,
        data: null,
        error: { code: "UNAUTHORIZED", message: "Refresh token missing" },
        meta: { timestamp: new Date().toISOString(), requestId: request.id }
      });
    }

    const result = await authService.refresh(token);

    reply.setCookie("refreshToken", result.refreshToken, {
      path: "/api/v1/auth",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60
    });

    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: {
        user: result.user,
        tokens: {
          accessToken: result.accessToken,
          expiresIn: 900
        }
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id
      }
    };
    return reply.status(200).send(response);
  });

  // Logout
  app.post("/logout", { preHandler: [authenticate] }, async (request, reply) => {
    if (request.user) {
      await authService.logout(request.user.userId);
    }
    reply.clearCookie("refreshToken", { path: "/api/v1/auth" });

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: "Logged out successfully" },
      error: null,
      meta: { timestamp: new Date().toISOString(), requestId: request.id }
    };
    return reply.status(200).send(response);
  });

  // Current User Profile
  app.get("/me", { preHandler: [authenticate] }, async (request, reply) => {
    const user = await authService.getMe(request.user!.userId);
    const response: ApiResponse<UserProfile> = {
      success: true,
      data: user,
      error: null,
      meta: { timestamp: new Date().toISOString(), requestId: request.id }
    };
    return reply.status(200).send(response);
  });

  // Send Mobile OTP
  app.post("/otp/send", async (request, reply) => {
    const input = sendOtpSchema.parse(request.body);
    await otpService.generateAndSend(input.phone);

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: `Verification code sent to ${input.phone}` },
      error: null,
      meta: { timestamp: new Date().toISOString(), requestId: request.id }
    };
    return reply.status(200).send(response);
  });

  // Verify Mobile OTP
  app.post("/otp/verify", async (request, reply) => {
    const input = verifyOtpSchema.parse(request.body);
    await otpService.verify(input.phone, input.otp);

    // If request has authenticated user, update phoneVerified
    if (request.headers.authorization) {
      try {
        await authenticate(request, reply);
        if (request.user) {
          await prisma.user.update({
            where: { id: request.user.userId },
            data: { phone: input.phone, phoneVerified: true }
          });
        }
      } catch {
        // Unauthenticated verify is also valid
      }
    }

    const response: ApiResponse<{ verified: boolean; message: string }> = {
      success: true,
      data: { verified: true, message: "Phone number verified successfully" },
      error: null,
      meta: { timestamp: new Date().toISOString(), requestId: request.id }
    };
    return reply.status(200).send(response);
  });
}
