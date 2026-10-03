// Shivoy Interior - Estimate Maker server
const express = require("express");
const path = require("path");
const { MongoClient } = require("mongodb");

const app = express();
app.use(express.json({ limit: "5mb" }));

// Optional password (set APP_PASSWORD in env). Browser shows a login box.
if (process.env.APP_PASSWORD) {
  app.use((req, res, next) => {
    const h = req.headers.authorization || "";
    const pass = Buffer.from(h.split(" ")[1] || "", "base64").toString().split(":").slice(1).join(":");
    if (pass === process.env.APP_PASSWORD) return next();
    res.set("WWW-Authenticate", 'Basic realm="Shivoy Estimates"').status(401).send("Password required");
  });
}
app.use(express.static(path.join(__dirname, "public")));

// ---- storage: MongoDB Atlas (or temporary memory if MONGODB_URI is missing) ----
let estCol, kvCol;
const mem = { est: new Map(), kv: new Map() };
async function init() {
  if (!process.env.MONGODB_URI) {
    console.warn("!! No MONGODB_URI set - using temporary in-memory storage (data is lost on restart)");
    return;
  }
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db(process.env.DB_NAME || "shivoy");
  estCol = db.collection("estimates");
  kvCol = db.collection("settings");
  console.log("MongoDB connected");
}
// Data is stored as a JSON string inside each document, so keys such as "S.S L.P Screw" are always safe.
const pack = (o) => JSON.stringify(o);
const unpack = (s) => JSON.parse(s);

async function listEstimates() {
  if (!estCol) return [...mem.est.values()].map(unpack).sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const docs = await estCol.find({}).sort({ updated: -1 }).limit(300).toArray();
  return docs.map((d) => unpack(d.data));
}
async function saveEstimate(id, body) {
  body.id = id;
  body.updated = Date.now();
  if (!estCol) return void mem.est.set(id, pack(body));
  await estCol.replaceOne(
    { _id: id },
    { _id: id, client: body.client || "", date: body.date || "", ply: body.ply || "", grand: body.grand || 0, updated: body.updated, data: pack(body) },
    { upsert: true }
  );
}
async function deleteEstimate(id) {
  if (!estCol) return void mem.est.delete(id);
  await estCol.deleteOne({ _id: id });
}
async function getSetting(key) {
  if (!kvCol) return mem.kv.has(key) ? unpack(mem.kv.get(key)) : null;
  const d = await kvCol.findOne({ _id: key });
  return d ? unpack(d.data) : null;
}
async function setSetting(key, value) {
  if (!kvCol) return void mem.kv.set(key, pack(value));
  await kvCol.replaceOne({ _id: key }, { _id: key, data: pack(value), updated: Date.now() }, { upsert: true });
}

// ---- API ----
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error(e); res.status(500).json({ error: "server error" }); });
app.get("/api/health", (req, res) => res.json({ ok: true, mongo: !!estCol }));
app.get("/api/bootstrap", wrap(async (req, res) => {
  res.json({ estimates: await listEstimates(), rates: (await getSetting("rates")) || {}, config: await getSetting("config") });
}));
app.put("/api/estimates/:id", wrap(async (req, res) => { await saveEstimate(req.params.id, req.body); res.json({ ok: true }); }));
app.delete("/api/estimates/:id", wrap(async (req, res) => { await deleteEstimate(req.params.id); res.json({ ok: true }); }));
app.put("/api/rates", wrap(async (req, res) => { await setSetting("rates", req.body); res.json({ ok: true }); }));
app.put("/api/config", wrap(async (req, res) => { await setSetting("config", req.body); res.json({ ok: true }); }));

const port = process.env.PORT || 3000;
init().then(() => app.listen(port, () => console.log("Running on port " + port)))
      .catch((e) => { console.error("Startup failed:", e.message); process.exit(1); });
