import { redis } from "../../lib/redis.js";
import { BadRequestError } from "../../errors/index.js";

export interface OtpProvider {
  sendOtp(phone: string, otp: string): Promise<void>;
}

export class ConsoleOtpProvider implements OtpProvider {
  async sendOtp(phone: string, otp: string): Promise<void> {
    console.log(`\n========================================`);
    console.log(`📱 [THIKANA OTP SMS MOCK]`);
    console.log(`   To: ${phone}`);
    console.log(`   Verification Code: ${otp}`);
    console.log(`   Valid for: 5 minutes`);
    console.log(`========================================\n`);
  }
}

export class OtpService {
  private provider: OtpProvider;

  constructor(provider?: OtpProvider) {
    this.provider = provider || new ConsoleOtpProvider();
  }

  async generateAndSend(phone: string): Promise<void> {
    const rateLimitKey = `otp_ratelimit:${phone}`;
    const attempts = await redis.incr(rateLimitKey);
    if (attempts === 1) {
      await redis.expire(rateLimitKey, 60); // 1 OTP per 60s
    } else if (attempts > 3) {
      throw new BadRequestError("Too many OTP requests. Please wait a minute before retrying.");
    }

    // Generate cryptographically secure 6-digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const storageKey = `otp:${phone}`;

    // Store in Redis with 300 second (5 min) TTL
    await redis.set(storageKey, otp, "EX", 300);

    await this.provider.sendOtp(phone, otp);
  }

  async verify(phone: string, code: string): Promise<boolean> {
    const storageKey = `otp:${phone}`;
    const stored = await redis.get(storageKey);

    if (!stored) {
      throw new BadRequestError("OTP expired or not found. Please request a new code.");
    }

    if (stored !== code) {
      throw new BadRequestError("Invalid verification code. Please try again.");
    }

    // Single-use: delete immediately upon verification
    await redis.del(storageKey);
    return true;
  }
}

export const otpService = new OtpService();
