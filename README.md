# Shivoy Interior – Estimate Maker

Node + Express server, MongoDB Atlas database, single-page frontend (`public/index.html`).
Stored in MongoDB: previous estimates, saved rates, and your product size lists (including new sizes you add).

## 1. MongoDB Atlas (once)
1. Create a free cluster at https://cloud.mongodb.com.
2. **Database Access** → add a user (username + password).
3. **Network Access** → add IP `0.0.0.0/0` (Render's IP changes, so allow all).
4. **Connect → Drivers** → copy the connection string and put your password in it.

## 2. Test on your computer (optional)
```
npm install
cp .env.example .env      # then fill in MONGODB_URI
node --env-file=.env server.js     # Node 20+
```
Open http://localhost:3000. Without `MONGODB_URI` it runs with temporary memory storage.

## 3. Put it live on Render
1. Upload this folder to a GitHub repository.
2. Render → **New → Web Service** → pick the repo.
3. Build command: `npm install`  Start command: `npm start`
4. **Environment** → add `MONGODB_URI`, `DB_NAME` (shivoy) and, to lock the site, `APP_PASSWORD`.
5. Deploy. Free instances sleep after inactivity, so the first open can take ~30 seconds.

## Files
- `server.js` – API + MongoDB (collections: `estimates`, `settings`)
- `public/index.html` – the whole website
- `public/logo.png` – your Shivoy Interior logo
- Plywood brands and their benefits are near the top of the script in `index.html` (`const PLY=`).
