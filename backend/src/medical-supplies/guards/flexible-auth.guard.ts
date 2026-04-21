import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiKeyStrategy } from '../../auth/strategies/api-key.strategy';
import { ClientCredentialStrategy } from '../../auth/strategies/client-credential.strategy';

/** ต่อ request หลังผ่าน guard สำหรับ POST /medical-supplies */
export interface MedicalSuppliesAuthRequest {
  user?: { id: number };
  /** true เมื่อ JWT มาจาก staff login (payload.staff) */
  staffJwt?: boolean;
  clientCredential?: { user: { id: number }; userType?: string };
  /** มีแค่ client_id — service จะเช็ค staff */
  clientIdForStaffCheck?: string;
}

@Injectable()
export class FlexibleAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly apiKeyStrategy: ApiKeyStrategy,
    private readonly clientCredentialStrategy: ClientCredentialStrategy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const h = req.headers as Record<string, string | string[] | undefined>;
    const authHeader = this.headerString(h['authorization']);
    const xApiKey = this.headerString(h['x-api-key']);
    const clientId = this.headerString(h['client_id'])?.trim() || '';
    const clientSecret = this.headerString(h['client_secret'])?.trim() || '';

    delete req.user;
    delete req.staffJwt;
    delete req.clientCredential;
    delete req.clientIdForStaffCheck;

    const bearerToken = this.extractBearerToken(authHeader);

    if (bearerToken) {
      if (this.apiKeyStrategy.isValidApiKeyFormat(bearerToken)) {
        const uid = await this.userIdFromApiKey(bearerToken);
        if (uid != null) {
          req.user = { id: uid };
          return true;
        }
      }
      try {
        const payload = this.jwt.verify<{ sub?: number | string; staff?: boolean }>(
          bearerToken,
        );
        const sub =
          typeof payload.sub === 'string'
            ? parseInt(payload.sub, 10)
            : Number(payload.sub);
        if (Number.isFinite(sub) && sub >= 1) {
          if (payload.staff === true) {
            const staffRow = await this.prisma.user.findFirst({
              where: { id: sub, is_active: true, role_id: { not: null } },
              select: { id: true },
            });
            if (staffRow) {
              req.user = { id: staffRow.id };
              req.staffJwt = true;
              return true;
            }
          }
          const user = await this.prisma.user.findFirst({
            where: { id: sub, is_active: true },
            select: { id: true },
          });
          if (user) {
            req.user = { id: user.id };
            return true;
          }
        }
      } catch {
        /* ไม่ใช่ JWT ที่อ่านได้ */
      }
    }

    if (xApiKey) {
      const uid = await this.userIdFromApiKey(xApiKey.trim());
      if (uid != null) {
        req.user = { id: uid };
        return true;
      }
    }

    if (clientId && clientSecret) {
      const cc = await this.prisma.clientCredential.findFirst({
        where: { client_id: clientId, is_active: true },
        include: { user: { select: { id: true, is_active: true } } },
      });
      if (
        cc?.user?.is_active &&
        !this.clientCredentialStrategy.isExpired(cc.expires_at)
      ) {
        const ok = await this.clientCredentialStrategy.verifyClientSecret(
          clientSecret,
          cc.client_secret_hash,
        );
        if (ok) {
          await this.prisma.clientCredential.update({
            where: { id: cc.id },
            data: { last_used_at: new Date() },
          });
          req.clientCredential = {
            user: { id: cc.user.id },
            userType: 'admin',
          };
          return true;
        }
      }
    }

    if (clientId) {
      req.clientIdForStaffCheck = clientId;
      return true;
    }

    throw new UnauthorizedException(
      'ต้องยืนยันตัวตน: ส่ง Bearer JWT, หรือ x-api-key (ak_...), หรือ client_id + client_secret, หรือ client_id (staff)',
    );
  }

  private headerString(v: string | string[] | undefined): string | undefined {
    if (v == null) return undefined;
    return Array.isArray(v) ? v[0] : v;
  }

  private extractBearerToken(authHeader?: string): string {
    if (!authHeader?.trim()) return '';
    const s = authHeader.trim();
    const m = /^Bearer\s+(.+)$/i.exec(s);
    if (m) return m[1].trim();
    if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_.+/=-]+\./i.test(s)) return s;
    return '';
  }

  private async userIdFromApiKey(key: string): Promise<number | null> {
    try {
      if (!this.apiKeyStrategy.isValidApiKeyFormat(key)) return null;
      const prefix = this.apiKeyStrategy.getApiKeyPrefix(key);
      const rec = await this.prisma.apiKey.findFirst({
        where: { prefix, is_active: true },
        include: { user: { select: { id: true, is_active: true } } },
      });
      if (!rec?.user?.is_active) return null;
      if (rec.expires_at && this.apiKeyStrategy.isApiKeyExpired(rec.expires_at)) {
        return null;
      }
      const valid = await this.apiKeyStrategy.verifyApiKey(key, rec.key_hash);
      if (!valid) return null;
      await this.prisma.apiKey.update({
        where: { id: rec.id },
        data: { last_used_at: new Date() },
      });
      return rec.user.id;
    } catch {
      return null;
    }
  }
}
