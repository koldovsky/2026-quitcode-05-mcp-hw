// LeadDesk over Streamable HTTP — Task E1. Same factory and the same in-memory store as src/server.mjs.
//
//   node src/http.mjs          listens on http://127.0.0.1:3333/mcp (LEADDESK_HTTP_PORT to change)
//
// The Host and Origin guards are called by hand in the request handler: toNodeHandler has no option
// for them, and an unknown option is silently ignored — the server would answer 200 to a forged Host.
import { createServer } from "node:http";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler, localhostHostValidation, localhostOriginValidation } from "@modelcontextprotocol/node";
import { factory } from "./server.mjs";

const PORT = Number(process.env.LEADDESK_HTTP_PORT ?? 3333);

const mcp = toNodeHandler(createMcpHandler(factory));
const checkHost = localhostHostValidation();
const checkOrigin = localhostOriginValidation();

createServer(async (req, res) => {
  if (!checkHost(req, res)) return; // the guard has already answered 403
  if (!checkOrigin(req, res)) return;
  await mcp(req, res);
}).listen(PORT, "127.0.0.1", () => {
  console.error(`[leaddesk] MCP over HTTP on http://127.0.0.1:${PORT}/mcp`);
});
