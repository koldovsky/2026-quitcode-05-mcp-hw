// LeadDesk MCP server over Streamable HTTP (bonus E1): the same factory and the same in-memory
// store as src/server.mjs, served on 127.0.0.1 only.
//   node src/http.mjs                      http://127.0.0.1:3333/mcp
//   LEADDESK_HTTP_PORT=4444 node src/http.mjs
//
// DNS-rebinding protection: the Host and Origin guards are CALLED here, in the request handler,
// before the MCP handler. toNodeHandler has no such option — passing the guards to it is silently
// ignored and a forged Host gets 200 (measured: docs/mcp/verification.md, Task E).
import { createServer } from "node:http";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { localhostHostValidation, localhostOriginValidation, toNodeHandler } from "@modelcontextprotocol/node";
import { createLeadDeskServer } from "./leaddesk.mjs";

const PORT = Number(process.env.LEADDESK_HTTP_PORT ?? 3333);
const mcp = toNodeHandler(createMcpHandler(createLeadDeskServer));
const checkHost = localhostHostValidation();
const checkOrigin = localhostOriginValidation();

createServer(async (req, res) => {
  if (!checkHost(req, res)) return; // the guard has already answered 403
  if (!checkOrigin(req, res)) return;
  await mcp(req, res);
}).listen(PORT, "127.0.0.1", () => console.error(`leaddesk: MCP over HTTP on http://127.0.0.1:${PORT}/mcp`));
