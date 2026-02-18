const path = require("path");
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 10000;
const isProduction = process.env.NODE_ENV === "production";

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const hasDiscreteConfig = Boolean(
  process.env.PGHOST &&
    process.env.PGPORT &&
    process.env.PGDATABASE &&
    process.env.PGUSER &&
    process.env.PGPASSWORD
);

if (!hasDatabaseUrl && !hasDiscreteConfig) {
  console.error(
    "Missing PostgreSQL config. Set DATABASE_URL or PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD."
  );
  process.exit(1);
}

const poolConfig = hasDatabaseUrl
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT) || 5432,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl:
        process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool(poolConfig);

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ ok: true, message: "Server and DB are healthy" });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

app.post("/api/onboarding/submit", async (req, res) => {
  try {
    const payload = req.body?.data;
    const filesCount = Number(req.body?.files || 0);

    if (!payload || typeof payload !== "object") {
      return res.status(400).json({
        ok: false,
        message: "Invalid request body. Expected { data, files }.",
      });
    }

    const fullName = payload?.personal?.fullName || null;
    const contactNumber = payload?.personal?.contactNumber || null;
    const personalEmail = payload?.address?.personalEmail || null;
    const companyEmail = payload?.address?.companyEmail || null;
    const aadharNumber = payload?.identification?.aadharNumber || null;
    const hasExperience = Array.isArray(payload?.experience)
      ? payload.experience.some(
          (item) => item && (item.organization || item.designation || item.fromDate)
        )
      : false;

    const insertQuery = `
      INSERT INTO onboarding_submissions
      (
        full_name,
        contact_number,
        personal_email,
        company_email,
        aadhar_number,
        has_experience,
        files_count,
        payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, created_at;
    `;

    const values = [
      fullName,
      contactNumber,
      personalEmail,
      companyEmail,
      aadharNumber,
      hasExperience,
      filesCount,
      payload,
    ];

    const result = await pool.query(insertQuery, values);

    return res.status(201).json({
      ok: true,
      message: "Application saved successfully",
      submission: result.rows[0],
    });
  } catch (error) {
    console.error("Submit error:", error);
    return res.status(500).json({
      ok: false,
      message: "Failed to save application",
      error: error.message,
    });
  }
});

app.get("/api/onboarding/submissions", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, full_name, contact_number, personal_email, company_email, created_at
      FROM onboarding_submissions
      ORDER BY created_at DESC
      LIMIT 100
    `);
    res.json({ ok: true, count: result.rowCount, rows: result.rows });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to fetch submissions",
      error: error.message,
    });
  }
});

app.use(express.static(path.join(__dirname)));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }
  return res.sendFile(path.join(__dirname, "index.html"));
});

async function initializeDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS onboarding_submissions (
      id BIGSERIAL PRIMARY KEY,
      full_name TEXT,
      contact_number TEXT,
      personal_email TEXT,
      company_email TEXT,
      aadhar_number TEXT,
      has_experience BOOLEAN DEFAULT FALSE,
      files_count INTEGER DEFAULT 0,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await pool.query(createTableQuery);
}

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
}

startServer();
