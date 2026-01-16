import { pub } from "./os";
import { projectsRouter } from "./routers/projects";
import { flowsRouter } from "./routers/flows";
import { logsRouter } from "./routers/logs";
import { streamsRouter } from "./routers/streams";
import { authRouter } from "./routers/auth";

export const router = pub.router({
    auth: authRouter,
    projects: projectsRouter,
    flows: flowsRouter,
    logs: logsRouter,
    streams: streamsRouter,
});

export type AppRouter = typeof router;
