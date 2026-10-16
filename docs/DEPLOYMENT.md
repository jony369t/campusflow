# CampusFlow AI — Production Deployment Guide

## 1. MongoDB Atlas Setup

1. Create a dedicated cluster in **MongoDB Atlas**.
2. Create a database user with `readWrite` permissions on the `campusflow_ai` database.
3. Whitelist your Render backend outbound IP addresses.
4. Set `MONGODB_URI` in your backend environment. Mongoose indexes are automatically built for `users`, `notices`, `routineEntries`, `events`, `notifications`, and `auditLogs`.

## 2. Backend Deployment (Render)

1. Create a new **Web Service** on Render pointing to the `server/` directory of the repository.
2. Configure build and start commands:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
3. Set the required production environment variables:
   - `NODE_ENV=production`
   - `PORT=4000`
   - `UNIVERSITY_TIMEZONE=Asia/Dhaka`
   - `MONGODB_URI=mongodb+srv://...`
   - `JWT_SECRET=<64-hex-char-random-secret>`
   - `COOKIE_SECRET=<64-hex-char-random-secret>`
   - `COOKIE_SECURE=true`
   - `CORS_ORIGIN=https://campusflow.your-university.edu`
   - `AI_PROVIDER=openai-compatible`
   - `AI_BASE_URL=https://api.openai.com/v1`
   - `AI_API_KEY=sk-...`
   - `AI_MODEL=gpt-4o-mini`

## 3. Frontend Deployment (Vercel)

1. Import the repository into **Vercel** and set the **Root Directory** to `client`.
2. Configure environment variables:
   - `VITE_API_BASE_URL=https://api.campusflow.your-university.edu/api`
   - `VITE_UNIVERSITY_TIMEZONE=Asia/Dhaka`
3. Deploy and verify CORS + HTTP-only cookie transmission over HTTPS.

## 4. Secure Initial Administrator Bootstrap

Never allow self-registration with elevated roles. To provision the initial administrator in production:
1. Set `INITIAL_ADMIN_EMAIL` and a strong `INITIAL_ADMIN_PASSWORD` in a one-off job environment.
2. Run the admin bootstrap command once to create the admin record, then rotate the password immediately upon first login and verify the entry in `/api/admin/audit-logs`.
