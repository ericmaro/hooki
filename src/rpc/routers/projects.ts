import { z } from "zod";
import { protectedProcedure } from "../middleware";
import { pub } from "../os";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { env } from "@/lib/env";

export const projectsRouter = pub.router({
    list: protectedProcedure.handler(async ({ context }) => {
        const isCloud = env.HOOKI_MODE === 'cloud';

        if (isCloud && !context.session.activeOrganizationId) {
            console.error("RPC Error: projects.list called without an active organization context");
            return []; // Return empty list instead of crashing, or throw an error
        }

        const result = await db.query.projects.findMany({
            where: isCloud
                ? and(
                    eq(projects.userId, context.user.id),
                    eq(projects.organizationId, context.session.activeOrganizationId as string)
                )
                : eq(projects.userId, context.user.id),
            orderBy: [desc(projects.createdAt)],
        });
        return result;
    }),

    get: protectedProcedure
        .input(z.object({ id: z.string() }))
        .handler(async ({ context, input }) => {
            const isCloud = env.HOOKI_MODE === 'cloud';
            const project = await db.query.projects.findFirst({
                where: eq(projects.id, input.id),
                with: { flows: true },
            });

            if (!project || project.userId !== context.user.id) {
                throw new Error("Project not found");
            }

            if (isCloud && project.organizationId !== context.session.activeOrganizationId) {
                throw new Error("Project not found in this organization");
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
            const isCloud = env.HOOKI_MODE === 'cloud';
            const id = crypto.randomUUID();

            if (isCloud && !context.session.activeOrganizationId) {
                throw new Error("No active organization selected");
            }

            const [project] = await db
                .insert(projects)
                .values({
                    id,
                    userId: context.user.id,
                    organizationId: isCloud ? context.session.activeOrganizationId as string : null,
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
            const isCloud = env.HOOKI_MODE === 'cloud';
            const existing = await db.query.projects.findFirst({
                where: eq(projects.id, input.id),
            });

            if (!existing || existing.userId !== context.user.id) {
                throw new Error("Project not found");
            }

            if (isCloud && existing.organizationId !== context.session.activeOrganizationId) {
                throw new Error("Project not found in this organization");
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
            const isCloud = env.HOOKI_MODE === 'cloud';
            const existing = await db.query.projects.findFirst({
                where: eq(projects.id, input.id),
            });

            if (!existing || existing.userId !== context.user.id) {
                throw new Error("Project not found");
            }

            if (isCloud && existing.organizationId !== context.session.activeOrganizationId) {
                throw new Error("Project not found in this organization");
            }

            await db.delete(projects).where(eq(projects.id, input.id));
            return { success: true };
        }),
});
