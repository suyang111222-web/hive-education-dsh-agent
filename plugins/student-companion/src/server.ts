import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createInMemoryPorts } from '../../../packages/contracts/src/index.js';
import { registerStudentTools } from './tools.js';

const server = new McpServer({ name: 'hive-student-companion', version: '0.1.0' });
registerStudentTools(server, createInMemoryPorts());
await server.connect(new StdioServerTransport());

