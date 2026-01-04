import { createAuthClient } from "better-auth/react";

const signIn = async () => {
  const data = await authClient.signIn.social({
    provider: "google",
  });
  return data;
};

export const authClient = createAuthClient({});
export { signIn };
