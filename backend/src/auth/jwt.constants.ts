// JWT signing secret + expiry shared by JwtModule (signing) and JwtStrategy (verifying).
// TODO (production): load from env / secrets manager — never commit a real signing secret.
export const jwtConstants = {
  secret: 'referrals-secret-key',
  expiresIn: '24h',
} as const;
