const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 10000;
const isProduction = process.env.NODE_ENV === "production";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin@108";
const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || "replace-this-secret-in-production";
const SESSION_COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

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

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || "";
  return cookieHeader.split(";").reduce((acc, part) => {
    const [rawKey, ...rawVal] = part.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rawVal.join("="));
    return acc;
  }, {});
}

function encodeBase64Url(text) {
  return Buffer.from(text, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(text) {
  const normalized = text.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + "=".repeat(padLength), "base64").toString(
    "utf8"
  );
}

function signSegment(segment) {
  return crypto
    .createHmac("sha256", ADMIN_SESSION_SECRET)
    .update(segment)
    .digest("hex");
}

function createAdminSessionToken(username) {
  const payload = JSON.stringify({
    username,
    exp: Date.now() + SESSION_TTL_MS,
  });
  const payloadSegment = encodeBase64Url(payload);
  const signature = signSegment(payloadSegment);
  return `${payloadSegment}.${signature}`;
}

function verifyAdminSessionToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;

  const [payloadSegment, signature] = token.split(".");
  if (!payloadSegment || !signature) return null;

  const expectedSignature = signSegment(payloadSegment);
  const validSignature =
    expectedSignature.length === signature.length &&
    crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );

  if (!validSignature) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(payloadSegment));
    if (!payload || payload.exp < Date.now()) return null;
    return payload;
  } catch (_err) {
    return null;
  }
}

function requireAdminApi(req, res, next) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  const session = verifyAdminSessionToken(token);

  if (!session) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  req.adminSession = session;
  return next();
}

function requireAdminPage(req, res, next) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  const session = verifyAdminSessionToken(token);

  if (!session) {
    return res.redirect("/admin/login");
  }

  req.adminSession = session;
  return next();
}

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

app.get("/admin/login", (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  const session = verifyAdminSessionToken(token);
  if (session) {
    return res.redirect("/admin");
  }
  return res.sendFile(path.join(__dirname, "views", "admin-login.html"));
});

app.get("/admin", requireAdminPage, (_req, res) => {
  return res.sendFile(path.join(__dirname, "views", "admin-dashboard.html"));
});

app.get("/admin/submissions/:id", requireAdminPage, (_req, res) => {
  return res.sendFile(
    path.join(__dirname, "views", "admin-submission-details.html")
  );
});

app.post("/api/admin/login", (req, res) => {
  const username = String(req.body?.username || "");
  const password = String(req.body?.password || "");

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      ok: false,
      message: "Invalid username or password",
    });
  }

  const token = createAdminSessionToken(username);
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS,
  });

  return res.json({
    ok: true,
    message: "Login successful",
  });
});

app.post("/api/admin/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });
  return res.json({ ok: true, message: "Logged out" });
});

app.get("/api/admin/me", requireAdminApi, (req, res) => {
  return res.json({
    ok: true,
    admin: { username: req.adminSession.username },
  });
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
    const employeeId = payload?.personal?.employeeId || null;
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
        employee_id,
        contact_number,
        personal_email,
        company_email,
        aadhar_number,
        status,
        has_experience,
        files_count,
        payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, created_at;
    `;

    const values = [
      fullName,
      employeeId,
      contactNumber,
      personalEmail,
      companyEmail,
      aadharNumber,
      "Pending",
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
      SELECT id, employee_id, full_name, contact_number, personal_email, company_email, status, created_at
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

app.get("/api/admin/submissions", requireAdminApi, async (req, res) => {
  try {
    const statusFilter = String(req.query.status || "all").toLowerCase();
    const allowedFilters = new Set(["all", "pending", "verified", "rejected"]);
    const safeFilter = allowedFilters.has(statusFilter) ? statusFilter : "all";

    let query = `
      SELECT id, employee_id, full_name, personal_email, status, created_at
      FROM onboarding_submissions
    `;
    const params = [];

    if (safeFilter !== "all") {
      query += " WHERE LOWER(status) = $1";
      params.push(safeFilter);
    }

    query += " ORDER BY created_at DESC LIMIT 500";
    const result = await pool.query(query, params);

    return res.json({
      ok: true,
      count: result.rowCount,
      rows: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch admin submissions",
      error: error.message,
    });
  }
});

app.get("/api/admin/submissions/:id", requireAdminApi, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: "Invalid submission id" });
    }

    const result = await pool.query(
      `
      SELECT id, employee_id, full_name, personal_email, status, payload, reviewer_name, reviewed_at, rejection_reason, created_at
      FROM onboarding_submissions
      WHERE id = $1
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: "Submission not found" });
    }

    return res.json({ ok: true, row: result.rows[0] });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch submission details",
      error: error.message,
    });
  }
});

app.post("/api/admin/submissions/:id/verify", requireAdminApi, async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    const reviewerName = String(req.body?.reviewerName || "").trim();
    const allChecked = Boolean(req.body?.allChecked);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: "Invalid submission id" });
    }
    if (!reviewerName) {
      return res.status(400).json({ ok: false, message: "Reviewer name is required" });
    }
    if (!allChecked) {
      return res.status(400).json({
        ok: false,
        message: "Please confirm all informations are checked properly",
      });
    }

    await client.query("BEGIN");

    const submissionResult = await client.query(
      `
      UPDATE onboarding_submissions
      SET status = 'Verified',
          reviewer_name = $1,
          reviewed_at = NOW(),
          rejection_reason = NULL
      WHERE id = $2
      RETURNING id, employee_id, full_name, personal_email, payload, reviewer_name, reviewed_at, status
      `,
      [reviewerName, id]
    );

    if (submissionResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "Submission not found" });
    }

    const row = submissionResult.rows[0];

    await client.query(
      `
      INSERT INTO verified_employees
      (submission_id, employee_id, full_name, personal_email, payload, reviewer_name, reviewed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (submission_id)
      DO UPDATE SET
        employee_id = EXCLUDED.employee_id,
        full_name = EXCLUDED.full_name,
        personal_email = EXCLUDED.personal_email,
        payload = EXCLUDED.payload,
        reviewer_name = EXCLUDED.reviewer_name,
        reviewed_at = EXCLUDED.reviewed_at
      `,
      [
        row.id,
        row.employee_id,
        row.full_name,
        row.personal_email,
        row.payload,
        row.reviewer_name,
        row.reviewed_at,
      ]
    );

    await client.query("DELETE FROM rejected_employees WHERE submission_id = $1", [
      row.id,
    ]);

    await client.query("COMMIT");
    return res.json({ ok: true, message: "Employee verified successfully", row });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({
      ok: false,
      message: "Failed to verify submission",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

app.post("/api/admin/submissions/:id/reject", requireAdminApi, async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    const reviewerName = String(req.body?.reviewerName || "").trim();
    const allChecked = Boolean(req.body?.allChecked);
    const rejectionReason = String(req.body?.rejectionReason || "").trim();

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: "Invalid submission id" });
    }
    if (!reviewerName) {
      return res.status(400).json({ ok: false, message: "Reviewer name is required" });
    }
    if (!allChecked) {
      return res.status(400).json({
        ok: false,
        message: "Please confirm all informations are checked properly",
      });
    }
    if (!rejectionReason) {
      return res.status(400).json({ ok: false, message: "Rejection reason is required" });
    }

    await client.query("BEGIN");

    const submissionResult = await client.query(
      `
      UPDATE onboarding_submissions
      SET status = 'Rejected',
          reviewer_name = $1,
          reviewed_at = NOW(),
          rejection_reason = $2
      WHERE id = $3
      RETURNING id, employee_id, full_name, personal_email, payload, reviewer_name, reviewed_at, rejection_reason, status
      `,
      [reviewerName, rejectionReason, id]
    );

    if (submissionResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "Submission not found" });
    }

    const row = submissionResult.rows[0];

    await client.query(
      `
      INSERT INTO rejected_employees
      (submission_id, employee_id, full_name, personal_email, payload, reviewer_name, reviewed_at, rejection_reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (submission_id)
      DO UPDATE SET
        employee_id = EXCLUDED.employee_id,
        full_name = EXCLUDED.full_name,
        personal_email = EXCLUDED.personal_email,
        payload = EXCLUDED.payload,
        reviewer_name = EXCLUDED.reviewer_name,
        reviewed_at = EXCLUDED.reviewed_at,
        rejection_reason = EXCLUDED.rejection_reason
      `,
      [
        row.id,
        row.employee_id,
        row.full_name,
        row.personal_email,
        row.payload,
        row.reviewer_name,
        row.reviewed_at,
        row.rejection_reason,
      ]
    );

    await client.query("DELETE FROM verified_employees WHERE submission_id = $1", [
      row.id,
    ]);

    await client.query("COMMIT");
    return res.json({ ok: true, message: "Employee rejected successfully", row });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({
      ok: false,
      message: "Failed to reject submission",
      error: error.message,
    });
  } finally {
    client.release();
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
      employee_id TEXT,
      contact_number TEXT,
      personal_email TEXT,
      company_email TEXT,
      aadhar_number TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      reviewer_name TEXT,
      reviewed_at TIMESTAMPTZ,
      rejection_reason TEXT,
      has_experience BOOLEAN DEFAULT FALSE,
      files_count INTEGER DEFAULT 0,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await pool.query(createTableQuery);
  await pool.query(`
    ALTER TABLE onboarding_submissions
    ADD COLUMN IF NOT EXISTS employee_id TEXT
  `);
  await pool.query(`
    ALTER TABLE onboarding_submissions
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Pending'
  `);
  await pool.query(`
    ALTER TABLE onboarding_submissions
    ADD COLUMN IF NOT EXISTS reviewer_name TEXT
  `);
  await pool.query(`
    ALTER TABLE onboarding_submissions
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ
  `);
  await pool.query(`
    ALTER TABLE onboarding_submissions
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS verified_employees (
      id BIGSERIAL PRIMARY KEY,
      submission_id BIGINT UNIQUE REFERENCES onboarding_submissions(id) ON DELETE CASCADE,
      employee_id TEXT,
      full_name TEXT,
      personal_email TEXT,
      payload JSONB NOT NULL,
      reviewer_name TEXT NOT NULL,
      reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rejected_employees (
      id BIGSERIAL PRIMARY KEY,
      submission_id BIGINT UNIQUE REFERENCES onboarding_submissions(id) ON DELETE CASCADE,
      employee_id TEXT,
      full_name TEXT,
      personal_email TEXT,
      payload JSONB NOT NULL,
      reviewer_name TEXT NOT NULL,
      reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      rejection_reason TEXT NOT NULL
    )
  `);
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
