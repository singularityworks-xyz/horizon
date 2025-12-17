import { auth } from "./auth"
import { headers } from "next/headers"

// Server-side auth helpers
export const authServer = {
  // Get session from server-side
  getSession: async () => {
    try {
      const headersList = await headers()
      // Convert Headers to plain object
      const headersObj: Record<string, string> = {}
      headersList.forEach((value, key) => {
        headersObj[key] = value
      })

      const session = await auth.api.getSession({
        headers: headersObj,
      })
      return session
    } catch (error) {
      return null
    }
  },

  // Verify session exists
  requireSession: async () => {
    const session = await authServer.getSession()
    if (!session) {
      throw new Error("Authentication required")
    }
    return session
  },
}
