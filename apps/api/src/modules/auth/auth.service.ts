import { prisma } from "../../lib/prisma.js";
import { hashPassword, verifyPassword } from "../../lib/hash.js";
import {
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  validateStoredRefreshToken,
  revokeRefreshToken,
  verifyRefreshToken
} from "../../lib/jwt.js";
import { ConflictError, UnauthorizedError, NotFoundError } from "../../errors/index.js";
import { SignupInput, LoginInput } from "./auth.schema.js";
import { Role } from "@prisma/client";
import { UserRole, UserProfile } from "@thikana/shared-types";

export class AuthService {
  async signup(input: SignupInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() }
    });

    if (existing) {
      throw new ConflictError("A user with this email already exists");
    }

    const passwordHash = await hashPassword(input.password);
    const roles: Role[] = [Role.USER];
    if (input.asOwner) roles.push(Role.OWNER);
    if (input.asBuddy) roles.push(Role.BUDDY);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        fullName: input.fullName,
        phone: input.phone,
        roles
      }
    });

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      roles: user.roles as UserRole[]
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    await storeRefreshToken(user.id, refreshToken);

    return {
      user: this.formatUserProfile(user),
      accessToken,
      refreshToken
    };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() }
    });

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      roles: user.roles as UserRole[]
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    await storeRefreshToken(user.id, refreshToken);

    return {
      user: this.formatUserProfile(user),
      accessToken,
      refreshToken
    };
  }

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    const isValid = await validateStoredRefreshToken(payload.userId, refreshToken);

    if (!isValid) {
      // Possible reuse attack detected: revoke all tokens for this user
      await revokeRefreshToken(payload.userId);
      throw new UnauthorizedError("Invalid refresh token (re-authentication required)");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user) {
      throw new UnauthorizedError("User no longer exists");
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      roles: user.roles as UserRole[]
    };

    // Rotate: generate a fresh pair and overwrite the stored token
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);
    await storeRefreshToken(user.id, newRefreshToken);

    return {
      user: this.formatUserProfile(user),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  async logout(userId: string) {
    await revokeRefreshToken(userId);
  }

  async getMe(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return this.formatUserProfile(user);
  }

  private formatUserProfile(user: any): UserProfile {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      roles: user.roles as UserRole[],
      createdAt: user.createdAt.toISOString()
    };
  }
}

export const authService = new AuthService();
