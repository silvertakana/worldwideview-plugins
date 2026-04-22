# {{NAME}} - Shared Backend Host

This is your Bring Your Own Backend (BYOB) host for WorldWideView plugins.

## How it works
1. Build your Fullstack plugins using `pnpm run build`.
2. Copy the compiled `dist/backend.mjs` into `plugins/<your-plugin-name>/backend.mjs`.
3. Start this server. It will dynamically load and mount all plugins.

## Run Locally
```bash
npm install
npm run dev
```

## Deploying to Vercel/Railway
Simply push this repository to GitHub and connect it to your hosting provider. The `npm start` script will automatically execute the bootloader.
