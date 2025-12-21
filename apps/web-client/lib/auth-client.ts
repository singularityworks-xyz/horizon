import { createAuthClient } from 'better-auth/client';

// Configure Better Auth client to point to web-admin (BFF)
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000', // web-admin URL
  fetchOptions: {
    onRequest: (context) => {
      return {
        ...context,
        credentials: 'include', // Include cookies in cross-origin requests
      };
    },
  },
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
      // Check that session exists AND has valid user and session data
      // Better Auth returns { data: { user, session } } or { error }
      const isValid = !!(session?.data?.user && session?.data?.session);
      return { valid: isValid, session: session?.data || null };
    } catch (error) {
      return { valid: false, session: null };
    }
  },
};
