import path from "path";
import { createServer, initializeStore } from "./index";
import * as express from "express";

async function main() {
  const app = createServer();
  const port = process.env.PORT || 3000;

  // Initialize DB store before accepting requests
  await initializeStore();

  const __dirname = import.meta.dirname;
  const distPath = path.join(__dirname, "../spa");

  app.use(express.static(distPath));

  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(port, () => {
    console.log(`Luster Dental Lab ERP running on port ${port}`);
    console.log(`Frontend: http://localhost:${port}`);
    console.log(`API: http://localhost:${port}/api`);
  });
}

main().catch(console.error);

process.on("SIGTERM", () => { process.exit(0); });
process.on("SIGINT", () => { process.exit(0); });
