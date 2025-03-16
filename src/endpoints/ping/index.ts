import { Context, Hono } from "hono";

const app = new Hono();

app.get("/", (context: Context) => {
  return context.json({ message: "Pong!" });
});

export default app;
