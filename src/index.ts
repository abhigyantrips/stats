import stats from "@/endpoints/github/stats";
import ping from "@/endpoints/ping";
import { Hono } from "hono";

type Bindings = {
  GITHUB_PAT: string;
  GITHUB_USERNAME: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.route("/api/ping", ping);
app.route("/api/github/stats", stats);

export default {
  fetch: app.fetch,
};
