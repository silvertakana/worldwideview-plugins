{
  "name": "{{SLUG}}",
  "version": "1.0.0",
  "description": "WorldWideView Shared Backend Host",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "start": "tsx src/server.ts"
  },
  "dependencies": {
    "fastify": "^5.0.0",
    "tsx": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
