// Shell: where a person was headed when they started signing in, kept for the round trip to Google.
export const destinationCookie = 'prova-next';

export const destinationCookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 600,
} as const;
