import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import pg from "pg";
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

const app = express();
const port = 8000;

// db.connect();

app.use(bodyParser.urlencoded({ extended: true }));

//That allows you to send JSON from the frontend (like fetch(..., { method: 'POST', body: JSON.stringify(data) })).
app.use(bodyParser.json());

// Allow requests from any origin
app.use(cors());

// Or restrict to frontend only
// app.use(cors({ origin: "http://127.0.0.1:5500/1.Sistem_de_facturare/" }));

app.get("/", (req, res) => {
  res.send("Hello");
});

// ISSUERS ROUTES
app.get("/allissuers", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM issuers");
    res.json(result.rows);
  } catch (err) {
    console.error("Query error", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Define a POST route at /addissuer — this route handles adding a new issuer to the database
app.post("/addissuer", async (req, res) => {
  // 1️⃣ Destructure properties from the request body
  // The client sends JSON data (via Postman or a frontend form),
  // and express.json() parses it into req.body.
  // Here, we extract each property into its own variable for convenience.
  const {
    name,
    cui,
    nr_reg_com,
    address,
    bank_name,
    bank_account,
    phone,
    email,
    website,
  } = req.body;

  // 2️⃣ Basic validation
  // We check that mandatory fields (name and CUI) are provided.
  // If not, we return a 400 Bad Request response and stop execution.
  if (!name || !cui) {
    return res.status(400).json({ error: "Name and CUI are required." });
  }

  try {
    // 3️⃣ Define the SQL query for inserting a new issuer
    // This uses parameterized placeholders ($1, $2, etc.) to prevent SQL injection.
    const query = `
      INSERT INTO issuers 
        (name, cui, nr_reg_com, address, bank_name, bank_account, phone, email, website)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    // 4️⃣ Prepare the array of actual values to substitute into the placeholders.
    // The order of items here matches the order of columns in the SQL query above.
    // Using "|| null" ensures missing fields are stored as NULL in the database.
    const values = [
      name,
      cui,
      nr_reg_com || null,
      address || null,
      bank_name || null,
      bank_account || null,
      phone || null,
      email || null,
      website || null,
    ];

    // 5️⃣ Execute the query against the PostgreSQL database
    // pool.query() sends the SQL command with the provided values.
    // "await" pauses execution until the database responds.
    const result = await pool.query(query, values);

    // 6️⃣ On success, send a 201 Created response
    // We return a success message and the data of the newly inserted issuer (from result.rows[0]).
    res.status(201).json({
      message: "Issuer added successfully!",
      issuer: result.rows[0],
    });
  } catch (err) {
    // 7️⃣ Handle any errors that occur during the process
    console.error("Error inserting issuer:", err);

    // 8️⃣ Check if the error code is PostgreSQL’s "23505" — unique constraint violation
    // This happens if an issuer with the same name or CUI already exists.
    if (err.code === "23505") {
      res
        .status(409)
        .json({ error: "Issuer with this name or CUI already exists." });
    } else {
      // 9️⃣ For all other database-related errors, return a generic 500 Internal Server Error
      res.status(500).json({ error: "Database error while adding issuer." });
    }
  }
});

// 🗑️ DELETE route — Delete a specific issuer by ID
app.delete("/deleteissuer/:id", async (req, res) => {
  const { id } = req.params; // Extract the "id" parameter from the request URL

  try {
    // Check if issuer with the given ID exists
    const checkResult = await pool.query(
      "SELECT * FROM issuers WHERE id = $1",
      [id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Issuer not found." });
    }

    // Delete the issuer from the database
    const deleteResult = await pool.query(
      "DELETE FROM issuers WHERE id = $1 RETURNING *",
      [id]
    );

    // Respond with the deleted issuer data
    res.status(200).json({
      message: "Issuer deleted successfully.",
      deletedIssuer: deleteResult.rows[0],
    });
  } catch (err) {
    console.error("Error deleting issuer:", err);
    res.status(500).json({ error: "Database error while deleting issuer." });
  }
});

// ✏️ PUT route — Edit (update) a specific issuer by ID
app.put("/editissuer/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name,
    cui,
    nr_reg_com,
    address,
    bank_name,
    bank_account,
    phone,
    email,
    website,
  } = req.body;

  try {
    // 1️⃣ Check if the issuer exists
    const checkResult = await pool.query(
      "SELECT * FROM issuers WHERE id = $1",
      [id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Issuer not found." });
    }

    // 2️⃣ Update the issuer in the database
    const query = `
      UPDATE issuers
      SET 
        name = COALESCE($1, name),
        cui = COALESCE($2, cui),
        nr_reg_com = COALESCE($3, nr_reg_com),
        address = COALESCE($4, address),
        bank_name = COALESCE($5, bank_name),
        bank_account = COALESCE($6, bank_account),
        phone = COALESCE($7, phone),
        email = COALESCE($8, email),
        website = COALESCE($9, website)
      WHERE id = $10
      RETURNING *;
    `;

    const values = [
      name || null,
      cui || null,
      nr_reg_com || null,
      address || null,
      bank_name || null,
      bank_account || null,
      phone || null,
      email || null,
      website || null,
      id,
    ];

    const result = await pool.query(query, values);

    // 3️⃣ Respond with the updated issuer
    res.status(200).json({
      message: "Issuer updated successfully!",
      updatedIssuer: result.rows[0],
    });
  } catch (err) {
    console.error("Error updating issuer:", err);
    res.status(500).json({ error: "Database error while updating issuer." });
  }
});

// CLIENTS ROUTES
app.get("/allclients", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM clients");
    res.json(result.rows);
  } catch (err) {
    console.error("Query error", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Define a POST route at /addcleint — this route handles adding a new issuer to the database
app.post("/addcleint", async (req, res) => {
  // 1️⃣ Destructure properties from the request body
  // The client sends JSON data (via Postman or a frontend form),
  // and express.json() parses it into req.body.
  // Here, we extract each property into its own variable for convenience.
  const {
    name,
    cui,
    nr_reg_com,
    address,
    bank_name,
    bank_account,
    phone,
    email,
    website,
  } = req.body;

  // 2️⃣ Basic validation
  // We check that mandatory fields (name and CUI) are provided.
  // If not, we return a 400 Bad Request response and stop execution.
  if (!name || !cui) {
    return res.status(400).json({ error: "Name and CUI are required." });
  }

  try {
    // 3️⃣ Define the SQL query for inserting a new issuer
    // This uses parameterized placeholders ($1, $2, etc.) to prevent SQL injection.
    const query = `
      INSERT INTO clients 
        (name, cui, nr_reg_com, address, bank_name, bank_account, phone, email, website)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    // 4️⃣ Prepare the array of actual values to substitute into the placeholders.
    // The order of items here matches the order of columns in the SQL query above.
    // Using "|| null" ensures missing fields are stored as NULL in the database.
    const values = [
      name,
      cui,
      nr_reg_com || null,
      address || null,
      bank_name || null,
      bank_account || null,
      phone || null,
      email || null,
      website || null,
    ];

    // 5️⃣ Execute the query against the PostgreSQL database
    // pool.query() sends the SQL command with the provided values.
    // "await" pauses execution until the database responds.
    const result = await pool.query(query, values);

    // 6️⃣ On success, send a 201 Created response
    // We return a success message and the data of the newly inserted issuer (from result.rows[0]).
    res.status(201).json({
      message: "Client added successfully!",
      client: result.rows[0],
    });
  } catch (err) {
    // 7️⃣ Handle any errors that occur during the process
    console.error("Error inserting client:", err);

    // 8️⃣ Check if the error code is PostgreSQL’s "23505" — unique constraint violation
    // This happens if an issuer with the same name or CUI already exists.
    if (err.code === "23505") {
      res
        .status(409)
        .json({ error: "Client with this name or CUI already exists." });
    } else {
      // 9️⃣ For all other database-related errors, return a generic 500 Internal Server Error
      res.status(500).json({ error: "Database error while adding issuer." });
    }
  }
});

// 🗑️ DELETE route — Delete a specific issuer by ID
app.delete("/deleteclient/:id", async (req, res) => {
  const { id } = req.params; // Extract the "id" parameter from the request URL

  try {
    // Check if issuer with the given ID exists
    const checkResult = await pool.query(
      "SELECT * FROM clients WHERE id = $1",
      [id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Issuer not found." });
    }

    // Delete the issuer from the database
    const deleteResult = await pool.query(
      "DELETE FROM clients WHERE id = $1 RETURNING *",
      [id]
    );

    // Respond with the deleted issuer data
    res.status(200).json({
      message: "Client deleted successfully.",
      deletedClient: deleteResult.rows[0],
    });
  } catch (err) {
    console.error("Error deleting Client:", err);
    res.status(500).json({ error: "Database error while deleting Client." });
  }
});

app.put("/editclient/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name,
    cui,
    nr_reg_com,
    address,
    bank_name,
    bank_account,
    phone,
    email,
    website,
  } = req.body;

  try {
    // 1️⃣ Check if the issuer exists
    const checkResult = await pool.query(
      "SELECT * FROM clients WHERE id = $1",
      [id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Client not found." });
    }

    // 2️⃣ Update the issuer in the database
    const query = `
      UPDATE clients
      SET 
        name = COALESCE($1, name),
        cui = COALESCE($2, cui),
        nr_reg_com = COALESCE($3, nr_reg_com),
        address = COALESCE($4, address),
        bank_name = COALESCE($5, bank_name),
        bank_account = COALESCE($6, bank_account),
        phone = COALESCE($7, phone),
        email = COALESCE($8, email),
        website = COALESCE($9, website)
      WHERE id = $10
      RETURNING *;
    `;

    const values = [
      name || null,
      cui || null,
      nr_reg_com || null,
      address || null,
      bank_name || null,
      bank_account || null,
      phone || null,
      email || null,
      website || null,
      id,
    ];

    const result = await pool.query(query, values);

    // 3️⃣ Respond with the updated issuer
    res.status(200).json({
      message: "Client updated successfully!",
      updatedClient: result.rows[0],
    });
  } catch (err) {
    console.error("Error updating client:", err);
    res.status(500).json({ error: "Database error while updating issuer." });
  }
});

// INVOICES ROUTES
app.get("/allinvoices", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM invoices");
    res.json(result.rows);
  } catch (err) {
    console.error("Query error", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.listen(port, () => {
  console.log(`Successfully started server on port ${port}.`);
});
