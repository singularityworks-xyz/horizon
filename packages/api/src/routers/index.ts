import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../index";
import { clientRouter } from "./client";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  adminData: adminProcedure.query(({ ctx }) => {
    return {
      message: "This is admin-only data",
      user: ctx.session.user,
    };
  }),
  client: clientRouter,
});
export type AppRouter = typeof appRouter;
