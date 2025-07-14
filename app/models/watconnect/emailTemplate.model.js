/**
 * @author      shivam shrivastava
 * @date        May, 2025
 * @copyright   www.ibirdsservices.com
 */

const sql = require("../db");

let schema = "";

function init(schema_name) {
  this.schema = schema_name;
}

async function findAll() {
  const query = `SELECT * FROM public.email_templates ORDER BY name`;
  const result = await sql.query(query);
  return result.rows;
}

async function findByName(name) {
  const query = `SELECT * FROM public.email_templates WHERE name = $1`;
  const result = await sql.query(query, [name]);
  return result.rows[0];
}

async function create(template) {
  const { name, subject, body } = template;
  const query = `
    INSERT INTO public.email_templates (name, subject, body)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const result = await sql.query(query, [name, subject, body]);
  return result.rows[0];
}

async function update(name, template) {
  const { subject, body } = template;
  const query = `
    UPDATE public.email_templates
    SET subject = $1, body = $2
    WHERE name = $3
    RETURNING *
  `;
  const result = await sql.query(query, [subject, body, name]);
  return result.rows[0];
}

async function remove(name) {
  const query = `
    DELETE FROM public.email_templates
    WHERE name = $1
    RETURNING *
  `;
  const result = await sql.query(query, [name]);
  return result.rows[0];
}

module.exports = {
  init,
  findAll,
  findByName,
  create,
  update,
  remove,
};
