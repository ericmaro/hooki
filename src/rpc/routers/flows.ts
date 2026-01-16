import { z } from "zod";
import { protectedProcedure } from "../middleware";
import { pub } from "../os";
import { db } from "@/lib/db";
import { flows, projects, destinations } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateSigningSecret } from "@/lib/security/hmac";
import { validateDestinationUrl } from "@/lib/security/ssrf";

const flowConfigSchema = z.object({
    nodes: z.array(
        z.object({
            id: z.string(),
            type: z.string(),
            position: z.object({ x: z.number(), y: z.number() }),
            data: z.record(z.string(), z.unknown()),
        })
    ),
    edges: z.array(
        z.object({
            id: z.string(),
            source: z.string(),
            target: z.string(),
        })
    ),
});

// Helper to extract inbound route paths from config
function extractInboundRoutes(config: z.infer<typeof flowConfigSchema> | null | undefined): string[] {
    if (!config?.nodes) return [];
    return config.nodes
        .filter(n => n.type === 'inbound')
        .map(n => (n.data?.path as string) || (n.data?.route as string) || '')
        .filter(Boolean);
}

// Check if any inbound routes conflict with existing flows
async function checkRouteConflicts(
    routes: string[],
    excludeFlowId?: string
): Promise<{ hasConflict: boolean; conflictingRoute?: string; existingFlowName?: string }> {
    if (routes.length === 0) return { hasConflict: false };

    // Get all flows with their configs
    const allFlows = await db.query.flows.findMany({
        columns: { id: true, name: true, config: true },
    });

    for (const route of routes) {
        for (const flow of allFlows) {
            // Skip the current flow when updating
            if (excludeFlowId && flow.id === excludeFlowId) continue;

            const existingRoutes = extractInboundRoutes(flow.config as any);
            if (existingRoutes.includes(route)) {
                return {
                    hasConflict: true,
                    conflictingRoute: route,
                    existingFlowName: flow.name,
                };
            }
        }
    }

    return { hasConflict: false };
}

export const flowsRouter = pub.router({
    list: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .handler(async ({ context, input }) => {
            // Verify user owns the project
            const project = await db.query.projects.findFirst({
                where: eq(projects.id, input.projectId),
            });

            if (!project || project.userId !== context.user.id) {
                throw new Error("Project not found");
            }

            const result = await db.query.flows.findMany({
                where: eq(flows.projectId, input.projectId),
                orderBy: [desc(flows.createdAt)],
                with: { destinations: true },
            });

            return result;
        }),

    get: protectedProcedure
        .input(z.object({ id: z.string() }))
        .handler(async ({ context, input }) => {
            const flow = await db.query.flows.findFirst({
                where: eq(flows.id, input.id),
                with: { destinations: true, project: true },
            });

            if (!flow || flow.project.userId !== context.user.id) {
                throw new Error("Flow not found");
            }

            return flow;
        }),

    create: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
                name: z.string().min(1).max(100),
                description: z.string().optional(),
                config: flowConfigSchema.nullable().optional(),
            })
        )
        .handler(async ({ context, input }) => {
            // Verify user owns the project
            const project = await db.query.projects.findFirst({
                where: eq(projects.id, input.projectId),
            });

            if (!project || project.userId !== context.user.id) {
                throw new Error("Project not found");
            }

            // Check for conflicting inbound routes
            const inboundRoutes = extractInboundRoutes(input.config);
            const conflict = await checkRouteConflicts(inboundRoutes);
            if (conflict.hasConflict) {
                throw new Error(
                    `Route "${conflict.conflictingRoute}" is already used by flow "${conflict.existingFlowName}"`
                );
            }

            const id = crypto.randomUUID();
            const signingSecret = generateSigningSecret();

            const [flow] = await db
                .insert(flows)
                .values({
                    id,
                    projectId: input.projectId,
                    name: input.name,
                    description: input.description,
                    config: input.config,
                    signingSecret,
                })
                .returning();

            return flow;
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().min(1).max(100).optional(),
                description: z.string().optional(),
                isActive: z.boolean().optional(),
                config: flowConfigSchema.nullable().optional(),
                rateLimitPerMinute: z.number().min(1).max(100000).optional(),
                requireSignature: z.boolean().optional(),
                asyncMode: z.boolean().optional(),
            })
        )
        .handler(async ({ context, input }) => {
            const existing = await db.query.flows.findFirst({
                where: eq(flows.id, input.id),
                with: { project: true },
            });

            if (!existing || existing.project.userId !== context.user.id) {
                throw new Error("Flow not found");
            }

            // Check for conflicting inbound routes (exclude current flow)
            if (input.config) {
                const inboundRoutes = extractInboundRoutes(input.config);
                const conflict = await checkRouteConflicts(inboundRoutes, input.id);
                if (conflict.hasConflict) {
                    throw new Error(
                        `Route "${conflict.conflictingRoute}" is already used by flow "${conflict.existingFlowName}"`
                    );
                }
            }

            const [flow] = await db
                .update(flows)
                .set({
                    name: input.name ?? existing.name,
                    description: input.description ?? existing.description,
                    isActive: input.isActive ?? existing.isActive,
                    config: input.config ?? existing.config,
                    rateLimitPerMinute: input.rateLimitPerMinute ?? existing.rateLimitPerMinute,
                    requireSignature: input.requireSignature ?? existing.requireSignature,
                    asyncMode: input.asyncMode ?? existing.asyncMode,
                    updatedAt: new Date(),
                })
                .where(eq(flows.id, input.id))
                .returning();

            return flow;
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .handler(async ({ context, input }) => {
            const existing = await db.query.flows.findFirst({
                where: eq(flows.id, input.id),
                with: { project: true },
            });

            if (!existing || existing.project.userId !== context.user.id) {
                throw new Error("Flow not found");
            }

            await db.delete(flows).where(eq(flows.id, input.id));
            return { success: true };
        }),

    // Regenerate signing secret
    regenerateSecret: protectedProcedure
        .input(z.object({ id: z.string() }))
        .handler(async ({ context, input }) => {
            const existing = await db.query.flows.findFirst({
                where: eq(flows.id, input.id),
                with: { project: true },
            });

            if (!existing || existing.project.userId !== context.user.id) {
                throw new Error("Flow not found");
            }

            const newSecret = generateSigningSecret();

            await db
                .update(flows)
                .set({ signingSecret: newSecret, updatedAt: new Date() })
                .where(eq(flows.id, input.id));

            return { signingSecret: newSecret };
        }),

    // Add destination
    addDestination: protectedProcedure
        .input(
            z.object({
                flowId: z.string(),
                name: z.string().min(1).max(100),
                url: z.string().url(),
                headers: z.record(z.string(), z.string()).optional(),
                maxRetries: z.number().min(0).max(10).optional(),
                timeoutMs: z.number().min(1000).max(120000).optional(),
            })
        )
        .handler(async ({ context, input }) => {
            // Verify ownership
            const flow = await db.query.flows.findFirst({
                where: eq(flows.id, input.flowId),
                with: { project: true },
            });

            if (!flow || flow.project.userId !== context.user.id) {
                throw new Error("Flow not found");
            }

            // Validate URL for SSRF
            const validation = validateDestinationUrl(input.url);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            const id = crypto.randomUUID();

            const [destination] = await db
                .insert(destinations)
                .values({
                    id,
                    flowId: input.flowId,
                    name: input.name,
                    url: input.url,
                    headers: input.headers as Record<string, string> | undefined,
                    maxRetries: input.maxRetries ?? 3,
                    timeoutMs: input.timeoutMs ?? 30000,
                })
                .returning();

            return destination;
        }),
});
