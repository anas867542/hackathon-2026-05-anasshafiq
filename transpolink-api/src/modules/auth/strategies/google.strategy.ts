import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

export interface GoogleProfile {
  googleId: string;
  email: string;
  fullName: string;
  profileImage?: string;
  role: string;
  next?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      // Fall back to empty strings so the server boots even without Google credentials.
      // Calls to GET /auth/google will fail with a Passport error if these are unset.
      clientID: config.get<string>('GOOGLE_CLIENT_ID', ''),
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET', ''),
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL', 'http://localhost:4000/api/v1/auth/google/callback'),
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  // state is decoded by passport-google-oauth20 automatically when passReqToCallback=true
  authenticate(req: Parameters<Strategy['authenticate']>[0], options?: object) {
    const role = (req as { query?: { role?: string } }).query?.role ?? 'customer';
    const next = (req as { query?: { next?: string } }).query?.next ?? '';
    const state = Buffer.from(JSON.stringify({ role, next })).toString('base64url');
    super.authenticate(req, { ...options, state });
  }

  validate(
    req: object,
    accessToken: string,
    refreshToken: string,
    profile: {
      id: string;
      displayName: string;
      emails?: { value: string }[];
      photos?: { value: string }[];
      _json?: { state?: string };
    },
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('No email from Google'), undefined);

    // Decode state for role + next redirect
    let role = 'customer';
    let next = '';
    try {
      const rawState =
        (req as { query?: { state?: string } }).query?.state ??
        profile._json?.state ??
        '';
      if (rawState) {
        const decoded = JSON.parse(Buffer.from(rawState, 'base64url').toString('utf8'));
        role = decoded.role ?? 'customer';
        next = decoded.next ?? '';
      }
    } catch {
      // keep defaults
    }

    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email,
      fullName: profile.displayName || email.split('@')[0],
      profileImage: profile.photos?.[0]?.value,
      role,
      next,
    };

    done(null, googleProfile);
  }
}
