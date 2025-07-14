/**
 * @author      Muskan Khan
 * @date        July, 2025
 * @copyright   www.ibirdsservices.com
 */

const sql = require("../db");
let schema = "";

function init(schema_name) {
  this.schema = schema_name;
}

async function getRecords() {
  const result = await sql.query(`
      SELECT 
        a.id as addon_id,
        a.name,
        a.unit,
        a.features,
        ap.billing_cycle,
        ap.price_per_unit
      FROM 
        public.addons a
      LEFT JOIN 
        addon_prices ap 
      ON 
        a.id = ap.addon_id;
    `);
  if (result.rows.length === 0) return null;
  const grouped = {};
  result.rows.forEach((row) => {
    if (typeof row.features === "string") {
      try {
        row.features = JSON.parse(row.features);
      } catch (e) {
        row.features = {};
      }
    }
    const id = row.addon_id;
    if (!grouped[id]) {
      grouped[id] = {
        id: id,
        name: row.name,
        unit: row.unit,
        monthly: null,
        quarterly: null,
        half_yearly: null,
        yearly: null,
        features: Object.values(row.features || {}),
      };
    }
    grouped[id][row.billing_cycle] = row.price_per_unit;
  });
  return Object.values(grouped);
}

async function createRecord(reqBody, userid) {
  const client = await sql.connect();
  try {
    const { name, unit, features, pricing } = reqBody;
    const featuresJSON = JSON.stringify(features);
    await client.query("BEGIN");
    const addonResult = await client.query(
      `INSERT INTO public.addons (name, unit, features) 
        VALUES ($1, $2, $3) 
        RETURNING id`,
      [name, unit, featuresJSON]
    );
    const addon_id = addonResult.rows[0].id;
    for (const price of pricing) {
      const { billing_cycle, price_per_unit } = price;
      await client.query(
        `INSERT INTO public.addon_prices (addon_id, billing_cycle, price_per_unit)
          VALUES ($1, $2, $3)`,
        [addon_id, billing_cycle, price_per_unit]
      );
    }
    await client.query("COMMIT");
    return { addon_id, name, unit, features, pricing };
  } catch (error) {
    await client.query("ROLLBACK");
    console.log("##ERROR", error);
    throw new Error("Failed to create record");
  } finally {
    client.release();
  }
}

async function updateRecord(reqBody, userid) {
  const client = await sql.connect();
  try {
    const { id, name, unit, features, pricing } = reqBody;
    const featuresJSON = JSON.stringify(features);
    await client.query("BEGIN");
    await client.query(
      `UPDATE public.addons 
             SET name = $1, unit = $2, features = $3 
             WHERE id = $4`,
      [name, unit, featuresJSON, id]
    );
    await client.query(`DELETE FROM public.addon_prices WHERE addon_id = $1`, [
      id,
    ]);
    for (const price of pricing) {
      const { billing_cycle, price_per_unit } = price;
      await client.query(
        `INSERT INTO public.addon_prices (addon_id, billing_cycle, price_per_unit)
                 VALUES ($1, $2, $3)`,
        [id, billing_cycle, price_per_unit]
      );
    }
    await client.query("COMMIT");
    return { addon_id: id, name, unit, features, pricing };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("##ERROR", error);
    throw new Error("Failed to update record");
  } finally {
    client.release();
  }
}

async function deleteRecord(id) {
  console.log("id ==>>>>> ", id);
  try {
    await sql.query("BEGIN");
    await sql.query(`DELETE FROM public.addon_prices WHERE addon_id = $1`, [
      id,
    ]);
    const result = await sql.query(`DELETE FROM public.addons WHERE id = $1`, [
      id,
    ]);
    await sql.query("COMMIT");
    if (result.rowCount > 0) {
      return "Success";
    }
    return null;
  } catch (error) {
    await sql.query("ROLLBACK");
    console.error("Error deleting record:", error);
    throw error;
  }
}

module.exports = { getRecords, createRecord, init, updateRecord, deleteRecord };
