import {v} from "@sourceregistry/node-validator";
import {env as _env} from "@sourceregistry/node-env";

const schema = v.object({
    PUBLIC_DISCOVERY_HOST: v.withDefault(v.string(), '0.0.0.0'),
    PUBLIC_DISCOVERY_PORT: v.withDefault(v.number(), 5678)
}, {unknownKeys: "strip"})(_env.raw)

if (!schema.success){
    throw new Error("Unable to parse environment schema",{cause: schema.errors});
}

export const env = schema.data;

export default env

