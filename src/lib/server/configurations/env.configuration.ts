import {v} from "@sourceregistry/node-validator";
import {env as _env} from "@sourceregistry/node-env";

const schema = v.object({
    DATABASE_URL: v.withDefault(v.string(), 'postgresql://postgres:postgres@localhost:5432/mikrotik_network_controller'),
    CONTROLLER_SECRET: v.withDefault(v.string(), 'change-this-local-development-secret'),
    SESSION_COOKIE_NAME: v.withDefault(v.string(), 'mnc_session'),
    SESSION_DURATION_DAYS: v.withDefault(v.number(), 14),
    PUBLIC_DISCOVERY_HOST: v.withDefault(v.string(), '0.0.0.0'),
    PUBLIC_DISCOVERY_PORT: v.withDefault(v.number(), 5678)
}, {unknownKeys: "strip"})(_env.raw)

if (!schema.success){
    throw new Error("Unable to parse environment schema",{cause: schema.errors});
}

export const env = schema.data;

export default env
