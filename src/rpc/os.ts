import { os } from "@orpc/server";

export interface BaseContext {
    headers: Record<string, string>;
    queryParams: Record<string, string>;
}

export interface AuthContext extends BaseContext {
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
    session: {
        id: string;
        token: string;
    };
}

// Base typed builder
export const pub = os.$context<BaseContext>();
