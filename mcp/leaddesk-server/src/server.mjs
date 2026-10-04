// LeadDesk MCP server over stdio — the entry point for Claude Code and the Inspector.
//   node src/server.mjs                                  fixture next to the module
//   LEADDESK_FIXTURE=/abs/path/leads.json node src/server.mjs
// stdout is the protocol channel: nothing here writes to it; the log goes to stderr.
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createLeadDeskServer } from "./leaddesk.mjs";

await serveStdio(createLeadDeskServer);
