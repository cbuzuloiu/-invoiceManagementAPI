import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "SistemDeFacturare",
  password: "test1234",
  port: 5432,
  max: 10,
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log("Initializing database structure...");
    await client.query("BEGIN");

    // 🧱 1️⃣ ISSUERS TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS issuers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        cui TEXT NOT NULL UNIQUE,
        nr_reg_com TEXT,
        address TEXT,
        bank_name TEXT,
        bank_account TEXT,
        phone TEXT,
        email TEXT,
        website TEXT
      );
    `);

    // 🧱 2️⃣ CLIENTS TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        cui TEXT,
        nr_reg_com TEXT,
        address TEXT,
        bank_name TEXT,
        bank_account TEXT,
        phone TEXT,
        email TEXT,
        website TEXT
      );
    `);

    // 🧱 3️⃣ INVOICES TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id_invoice TEXT PRIMARY KEY,
        id_issuer INTEGER REFERENCES issuers(id) ON DELETE CASCADE,
        id_client INTEGER REFERENCES clients(id),
        issued_date DATE,
        due_date DATE,
        lead_time INTEGER,
        subtotal NUMERIC(10,2) DEFAULT 0 CHECK (subtotal >= 0),
        total_vat NUMERIC(10,2) DEFAULT 0 CHECK (total_vat >= 0),
        grand_total NUMERIC(10,2) DEFAULT 0 CHECK (grand_total >= 0)
      );
    `);

    // 🧱 4️⃣ INVOICE_ITEMS TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id_item TEXT PRIMARY KEY,
        id_invoice TEXT REFERENCES invoices(id_invoice) ON DELETE CASCADE,
        item_description TEXT NOT NULL,
        item_qt INTEGER NOT NULL CHECK (item_qt > 0),
        item_price_without_vat NUMERIC(10,2) NOT NULL CHECK (item_price_without_vat >= 0),
        item_value NUMERIC(10,2) NOT NULL CHECK (item_value >= 0),
        item_vat_value NUMERIC(10,2) NOT NULL CHECK (item_vat_value >= 0)
      );
    `);

    await client.query("COMMIT");
    console.log("✅ Database initialized successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error initializing database:", err);
  } finally {
    client.release();
  }
}

initDatabase()
  .then(() => {
    console.log("🏁 Database setup complete. You can now start the app.");
    pool.end();
  })
  .catch((err) => {
    console.error("Fatal DB init error:", err);
    pool.end();
  });
