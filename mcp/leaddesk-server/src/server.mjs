// LeadDesk MCP server over stdio (Task A, Workshop 5). Tools and resource live in leaddesk.mjs.
//
//   node src/server.mjs                                  offline on fixtures/leads.json
//   LEADDESK_FIXTURE=/path/to/leads.json node src/server.mjs
//
// stdout is the protocol channel: log only to stderr (console.error), without personal data.
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { factory } from "./leaddesk.mjs";

await serveStdio(factory);
