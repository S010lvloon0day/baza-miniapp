# Miniapp deploy

1. Create a GitHub repository, for example `baza-miniapp`.
2. Build the miniapp. The output goes to `docs/`.
3. Push this `miniapp` folder as the repository root.
4. In GitHub: `Settings` -> `Pages` -> `Build and deployment` -> `Deploy from a branch`.
5. Select branch `main` and folder `/docs`.
6. Put the GitHub Pages URL into bot `.env` as `WEBAPP_URL`.
7. Restart the bot and set the same URL in BotFather menu button if needed.

Example bot value:

```env
WEBAPP_URL=https://YOUR_GITHUB_USERNAME.github.io/baza-miniapp/
```

Important: GitHub Pages hosts only the frontend. The miniapp needs a separate public HTTPS API for `/api/sections`, `/api/profile`, `/api/config`, and the other endpoints used by `src/api/client.ts`.
