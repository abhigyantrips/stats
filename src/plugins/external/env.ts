import env from "@fastify/env";

declare module "fastify" {
  export interface FastifyInstance {
    config: {
      PORT: number;
      GITHUB_PAT: string;
      RATE_LIMIT_MAX: number;
    };
  }
}

const schema = {
  type: "object",
  required: ["GITHUB_PAT"],
  properties: {
    GITHUB_PAT: {
      type: "string",
    },
    RATE_LIMIT_MAX: {
      type: "number",
      default: 100, // Put it to 4 in your .env file for tests
    },
  },
};

export const autoConfig = {
  confKey: "config",
  schema,
  dotenv: true,
  data: process.env,
};

/**
 * This plugins helps to check environment variables.
 *
 * @see {@link https://github.com/fastify/fastify-env}
 */
export default env;
