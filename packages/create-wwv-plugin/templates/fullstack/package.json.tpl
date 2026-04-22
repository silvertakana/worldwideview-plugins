{
  "name": "wwv-plugin-{{SLUG}}",
  "version": "1.0.0",
  "description": "WorldWideView plugin: {{NAME}}",
  "type": "module",
  "module": "dist/frontend.mjs",
  "files": ["dist"],
  "worldwideview": {
    "id": "{{SLUG}}"
  },
  "scripts": {
    "build": "vite build",
    "dev": "wwv sandbox",
    "validate": "wwv validate",
    "link": "wwv link",
    "deploy:backend": "node scripts/deploy-backend.js"
  },
  "devDependencies": {
    "@worldwideview/cli": "*",
    "@worldwideview/wwv-plugin-sdk": "*",
    "vite": "^6.0.0",
    "rollup-plugin-external-globals": "^0.12.0",
    "typescript": "^5.0.0"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
