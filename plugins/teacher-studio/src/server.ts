import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createInMemoryPorts } from '../../../packages/contracts/src/index.js';
import { registerTeacherTools } from './tools.js';

const server = new McpServer({ name: 'hive-teacher-studio', version: '0.1.0' });
registerTeacherTools(server, createInMemoryPorts());
await server.connect(new StdioServerTransport());

