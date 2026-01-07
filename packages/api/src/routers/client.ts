import {
  deleteClient,
  fetchClientById,
  fetchClientStats,
  fetchClients,
} from "@horizon/services";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, router } from "../index";

export const clientRouter = router({
  /**
   * Get all clients with pagination and search
   * Admin-only endpoint
   */
  getAll: adminProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
          cursor: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(({ input }) => {
      return fetchClients({
        limit: input?.limit ?? 50,
        cursor: input?.cursor,
        search: input?.search,
      });
    }),

  /**
   * Get a single client by ID
   * Admin-only endpoint
   */
  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const client = await fetchClientById(input.id);

      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client not found",
        });
      }

      return client;
    }),

  /**
   * Get client statistics
   * Admin-only endpoint
   */
  getStats: adminProcedure.query(() => {
    return fetchClientStats();
  }),

  /**
   * Delete a client by ID
   * Admin-only endpoint - cascades to delete sessions and accounts
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }): Promise<{ success: boolean }> => {
      await deleteClient(input.id);
      return { success: true };
    }),
});
