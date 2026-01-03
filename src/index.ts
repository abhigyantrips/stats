import streak from "@/endpoints/github/streak";
import stats from "@/endpoints/github/stats";
import ping from "@/endpoints/ping";
import { Hono } from "hono";

type Bindings = {
  GITHUB_PAT: string;
  GITHUB_USERNAME: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.route("/ping", ping);
app.route("/github/stats", stats);
app.route("/github/streak", streak);

export default {
  fetch: app.fetch,
};
