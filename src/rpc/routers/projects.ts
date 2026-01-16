import { z } from "zod";
import { protectedProcedure } from "../middleware";
import { pub } from "../os";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export const projectsRouter = pub.router({
    list: protectedProcedure.handler(async ({ context }) => {
        const result = await db.query.projects.findMany({
            where: eq(projects.userId, context.user.id),
            orderBy: [desc(projects.createdAt)],
        });
        return result;
    }),

    get: protectedProcedure
        .input(z.object({ id: z.string() }))
        .handler(async ({ context, input }) => {
            const project = await db.query.projects.findFirst({
                where: eq(projects.id, input.id),
                with: { flows: true },
            });

            if (!project || project.userId !== context.user.id) {
                throw new Error("Project not found");
            }

            return project;
        }),

    create: protectedProcedure
        .input(
            z.object({
                name: z.string().min(1).max(100),
                description: z.string().optional(),
            })
        )
        .handler(async ({ context, input }) => {
            const id = crypto.randomUUID();
            const [project] = await db
                .insert(projects)
                .values({
                    id,
                    userId: context.user.id,
                    name: input.name,
                    description: input.description,
                })
                .returning();

            return project;
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().min(1).max(100).optional(),
                description: z.string().optional(),
            })
        )
        .handler(async ({ context, input }) => {
            const existing = await db.query.projects.findFirst({
                where: eq(projects.id, input.id),
            });

            if (!existing || existing.userId !== context.user.id) {
                throw new Error("Project not found");
            }

            const [project] = await db
                .update(projects)
                .set({
                    name: input.name ?? existing.name,
                    description: input.description ?? existing.description,
                    updatedAt: new Date(),
                })
                .where(eq(projects.id, input.id))
                .returning();

            return project;
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .handler(async ({ context, input }) => {
            const existing = await db.query.projects.findFirst({
                where: eq(projects.id, input.id),
            });

            if (!existing || existing.userId !== context.user.id) {
                throw new Error("Project not found");
            }

            await db.delete(projects).where(eq(projects.id, input.id));
            return { success: true };
        }),
});
