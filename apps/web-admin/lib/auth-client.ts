import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
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
