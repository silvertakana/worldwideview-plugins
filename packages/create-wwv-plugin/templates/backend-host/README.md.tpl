# {{NAME}} - Shared Backend Host

This is your Bring Your Own Backend (BYOB) host for WorldWideView plugins.

Because WorldWideView plugins often require continuous background polling (like fetching live ISS coordinates every 5 seconds) and persistent WebSockets, **this host cannot run on Serverless platforms like Vercel**. It must run as a persistent container.

## How it works
1. Build your Fullstack plugins using `npm run build`.
2. Deploy the backend using `wwv deploy-backend ../<your-host-folder>`.
3. Start this server. It will dynamically load and mount all plugins in the `plugins/` directory.

## Run Locally (Node)
```bash
npm install
npm run dev
```

## Run Locally (Docker)
```bash
docker compose up --build
```

## Deploying to Coolify, Railway, or Render
This repository includes a `Dockerfile` and `docker-compose.yml`. 
Simply push this repository to GitHub and connect it to your hosting provider (like Coolify or Railway). The platform will automatically build the Docker image and run your persistent plugin host.
