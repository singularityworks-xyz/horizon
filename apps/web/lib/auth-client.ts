import { createAuthClient } from 'better-auth/react';

const rawAuthBaseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000';

// Normalize auth base URL to avoid mixed-content issues when the page is served over HTTPS.
// If we're in the browser on an HTTPS origin and the configured base URL is http://, upgrade it to https://.
const normalizedAuthBaseUrl =
  typeof window !== 'undefined' && window.location.protocol === 'https:'
    ? rawAuthBaseUrl.replace(/^http:\/\//, 'https://')
    : rawAuthBaseUrl;

export const authClient = createAuthClient({
  baseURL: normalizedAuthBaseUrl,
});

// Auth helper functions
export const authHelpers = {
  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    return await authClient.signIn.email({
      email,
      password,
    });
  },

  // Sign up with email and password
  signUp: async (email: string, password: string, name: string = email) => {
    return await authClient.signUp.email({
      email,
      password,
      name,
    });
  },

  // Sign out
  signOut: async () => {
    return await authClient.signOut();
  },

  // Get current session
  getSession: async () => {
    return await authClient.getSession();
  },

  // Verify session (refresh if needed)
  verifySession: async () => {
    try {
      const session = await authClient.getSession();
      return { valid: !!session, session };
    } catch (error) {
      return { valid: false, session: null };
    }
  },
};
