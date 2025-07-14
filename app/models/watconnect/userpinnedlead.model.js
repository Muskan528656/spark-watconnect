const sql = require("../db");

let schema = "";
function init(schema_name) {
  this.schema = schema_name;
}

// Pin a lead for a user
async function pinLead(userId, leadId) {
  const result = await sql.query(
    `INSERT INTO ${this.schema}.user_pinned_leads (user_id, lead_id) VALUES ($1, $2)
         ON CONFLICT (user_id, lead_id) DO NOTHING RETURNING *`,
    [userId, leadId]
  );
  return result.rows.length > 0;
}

// Unpin a lead for a user
async function unpinLead(userId, leadId) {
  const result = await sql.query(
    `DELETE FROM ${this.schema}.user_pinned_leads WHERE user_id = $1 AND lead_id = $2`,
    [userId, leadId]
  );
  return result.rowCount > 0;
}

// Check if a lead is pinned by a user
async function isLeadPinned(userId, leadId) {
  const result = await sql.query(
    `SELECT 1 FROM ${this.schema}.user_pinned_leads WHERE user_id = $1 AND lead_id = $2`,
    [userId, leadId]
  );
  return result.rows.length > 0;
}

// Get all pinned lead IDs for a user
async function getPinnedLeadIds(userId) {
  const result = await sql.query(
    `SELECT lead_id FROM ${this.schema}.user_pinned_leads WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map((row) => row.lead_id);
}

module.exports = {
  init,
  pinLead,
  unpinLead,
  isLeadPinned,
  getPinnedLeadIds,
};
