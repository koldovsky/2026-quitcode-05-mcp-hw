// LeadDesk MCP server over Streamable HTTP (Task E1). Same factory as the stdio server.
//
//   node src/http.mjs                                    http://127.0.0.1:3333/mcp
//
// Listens on 127.0.0.1 only. The Host and Origin guards are called here, in the request handler:
// passed as an option to toNodeHandler they are silently ignored and a forged Host gets 200.
import { createServer } from "node:http";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler, localhostHostValidation, localhostOriginValidation } from "@modelcontextprotocol/node";
import { factory } from "./leaddesk.mjs";

const HOST = "127.0.0.1";
const PORT = 3333;

const mcp = toNodeHandler(createMcpHandler(factory));
const checkHost = localhostHostValidation();
const checkOrigin = localhostOriginValidation();

createServer(async (req, res) => {
  if (!checkHost(req, res)) return; // the guard has already answered 403
  if (!checkOrigin(req, res)) return;
  await mcp(req, res);
}).listen(PORT, HOST, () => console.error(`[leaddesk] http://${HOST}:${PORT}/mcp`));
