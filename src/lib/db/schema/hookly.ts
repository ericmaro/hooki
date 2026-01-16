import {
    pgTable,
    text,
    timestamp,
    boolean,
    integer,
    jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./auth";

// Projects - User's webhook projects
export const projects = pgTable("projects", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
    user: one(users, { fields: [projects.userId], references: [users.id] }),
    flows: many(flows),
}));

// Flows - Flow configurations
export const flows = pgTable("flows", {
    id: text("id").primaryKey(),
    projectId: text("project_id")
        .notNull()
        .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    // JSON config for inbound routes, stored as React Flow compatible format
    config: jsonb("config").$type<FlowConfig>(),
    // Signing secret for HMAC verification
    signingSecret: text("signing_secret").notNull(),
    // Whether signature verification is required (default true for security)
    requireSignature: boolean("require_signature").notNull().default(true),
    // Async mode: false = sync (returns outbound response), true = async (returns immediately)
    asyncMode: boolean("async_mode").notNull().default(false),
    // Rate limiting
    rateLimitPerMinute: integer("rate_limit_per_minute").default(1000),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const flowsRelations = relations(flows, ({ one, many }) => ({
    project: one(projects, {
        fields: [flows.projectId],
        references: [projects.id],
    }),
    destinations: many(destinations),
    webhookLogs: many(webhookLogs),
}));

// Destinations - Outbound webhook endpoints
export const destinations = pgTable("destinations", {
    id: text("id").primaryKey(),
    flowId: text("flow_id")
        .notNull()
        .references(() => flows.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    // Custom headers to send with webhook
    headers: jsonb("headers").$type<Record<string, string>>(),
    // Retry configuration
    maxRetries: integer("max_retries").notNull().default(3),
    retryDelayMs: integer("retry_delay_ms").notNull().default(1000),
    timeoutMs: integer("timeout_ms").notNull().default(30000),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const destinationsRelations = relations(destinations, ({ one }) => ({
    flow: one(flows, { fields: [destinations.flowId], references: [flows.id] }),
}));

// Webhook Logs - Request/response audit trail
export const webhookLogs = pgTable("webhook_logs", {
    id: text("id").primaryKey(),
    flowId: text("flow_id")
        .notNull()
        .references(() => flows.id, { onDelete: "cascade" }),
    // Inbound request details
    method: text("method").notNull(),
    path: text("path").notNull(),
    headers: jsonb("headers").$type<Record<string, string>>(),
    body: text("body"),
    sourceIp: text("source_ip"),
    // Processing status
    status: text("status")
        .notNull()
        .$type<"pending" | "processing" | "completed" | "failed">()
        .default("pending"),
    // Timestamps
    receivedAt: timestamp("received_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
});

export const webhookLogsRelations = relations(webhookLogs, ({ one, many }) => ({
    flow: one(flows, { fields: [webhookLogs.flowId], references: [flows.id] }),
    deliveryAttempts: many(deliveryAttempts),
}));

// Delivery Attempts - Per-destination delivery status
export const deliveryAttempts = pgTable("delivery_attempts", {
    id: text("id").primaryKey(),
    webhookLogId: text("webhook_log_id")
        .notNull()
        .references(() => webhookLogs.id, { onDelete: "cascade" }),
    // Optional FK to destinations table (may be null for config-based destinations)
    destinationId: text("destination_id")
        .references(() => destinations.id, { onDelete: "cascade" }),
    // Store destination URL directly for display purposes
    destinationUrl: text("destination_url"),
    // Attempt details
    attemptNumber: integer("attempt_number").notNull().default(1),
    status: text("status")
        .notNull()
        .$type<"pending" | "success" | "failed" | "retrying">()
        .default("pending"),
    // Response details
    responseStatus: integer("response_status"),
    responseBody: text("response_body"),
    responseTimeMs: integer("response_time_ms"),
    errorMessage: text("error_message"),
    // Timestamps
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
});

export const deliveryAttemptsRelations = relations(
    deliveryAttempts,
    ({ one }) => ({
        webhookLog: one(webhookLogs, {
            fields: [deliveryAttempts.webhookLogId],
            references: [webhookLogs.id],
        }),
        destination: one(destinations, {
            fields: [deliveryAttempts.destinationId],
            references: [destinations.id],
        }),
    })
);

// Type definitions
export interface FlowConfig {
    nodes: Array<{
        id: string;
        type: string;
        position: { x: number; y: number };
        data: Record<string, unknown>;
    }>;
    edges: Array<{
        id: string;
        source: string;
        target: string;
    }>;
}
