const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_date DATE NOT NULL,
      delivery_date DATE NOT NULL,
      hours INTEGER NOT NULL,
      machine TEXT NOT NULL,
      sort_order BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

app.get("/api/jobs", async (req, res) => {
  const result = await pool.query(`
    SELECT
      id,
      name,
      TO_CHAR(start_date, 'YYYY-MM-DD') AS "startDate",
      TO_CHAR(delivery_date, 'YYYY-MM-DD') AS "deliveryDate",
      hours,
      machine,
      sort_order AS "order"
    FROM jobs
    ORDER BY sort_order ASC
  `);

  res.json(result.rows);
});

app.post("/api/jobs", async (req, res) => {
  const { id, name, startDate, deliveryDate, hours, machine, order } = req.body;

  await pool.query(`
    INSERT INTO jobs
    (id, name, start_date, delivery_date, hours, machine, sort_order)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
  `, [id, name, startDate, deliveryDate, hours, machine, order]);

  res.json({ ok: true });
});

app.put("/api/jobs/:id", async (req, res) => {
  const { name, startDate, deliveryDate, hours, machine, order } = req.body;

  await pool.query(`
    UPDATE jobs
    SET name=$1, start_date=$2, delivery_date=$3, hours=$4, machine=$5, sort_order=$6
    WHERE id=$7
  `, [name, startDate, deliveryDate, hours, machine, order, req.params.id]);

  res.json({ ok: true });
});

app.delete("/api/jobs/:id", async (req, res) => {
  await pool.query("DELETE FROM jobs WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

app.delete("/api/jobs", async (req, res) => {
  await pool.query("DELETE FROM jobs");
  res.json({ ok: true });
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log("Falsmaskin kör på port " + PORT);
  });
});
