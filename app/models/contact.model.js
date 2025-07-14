const sql = require("./db.js");

let schema = '';
function init(schema_name) {
  this.schema = schema_name;
}

async function create(newContact, userid) {
  delete newContact.id;
  const result = await sql.query(`INSERT INTO ${this.schema}.contact (salutation, title, firstname, lastname, email, phone, street, city, state, pincode, country, referredby, accountid, recordtypeid, createdbyid, lastmodifiedbyid)  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
    [newContact.salutation, newContact.title, newContact.firstname, newContact.lastname, newContact.email, newContact.phone, newContact.street, newContact.city, newContact.state, newContact.pincode, newContact.country, newContact.referredby, newContact.accountid, newContact.recordtypeid, userid, userid]);
  if (result.rows.length > 0) {
    return { id: result.rows[0].id, ...newContact };
  }
  return null;
};

async function findById(id) {
  //const result = await sql.query(`SELECT * FROM contact WHERE id = $1`,[id]);
  let query = `SELECT con.*, concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname, acc.name accountname FROM ${this.schema}.contact con`;

  query += ` INNER JOIN ${this.schema}.user cu ON cu.Id = con.createdbyid `;
  query += ` INNER JOIN  ${this.schema}.user mu ON mu.Id = con.lastmodifiedbyid `;
  query += ` LEFT JOIN ${this.schema}.account acc ON acc.Id = con.accountid `;
  //query += ` WHERE con.id = $1`,[id];


  const result = await sql.query(query + ` WHERE con.id = $1`, [id]);
 console.log("Resilt->lead converstuon",result);
  if (result.rows.length > 0)
    return result.rows[0];

  return null;
};

async function findAll(title) {
  //// 
  let query = `SELECT con.*, concat(con.firstname, ' ' , con.lastname) contactname, concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname, acc.name accountname FROM ${this.schema}.contact con `;


  query += ` INNER JOIN ${this.schema}.user cu ON cu.Id = con.createdbyid `;
  query += ` INNER JOIN ${this.schema}.user mu ON mu.Id = con.lastmodifiedbyid `;
  query += ` LEFT JOIN ${this.schema}.account acc ON acc.Id = con.accountid `;
  query += " ORDER BY createddate DESC ";

  if (title) {
    query += ` WHERE con.title LIKE '%${title}%'`;
  }

  const result = await sql.query(query);
  return result.rows;
};



// Find by Recordtype Id
async function findByRecordtype(rtype) {
  const result = await sql.query(`SELECT id, title, firstname, lastname, recordtypeid FROM ${this.schema}.contact WHERE recordtypeid = $1`, [rtype]);
  if (result.rows.length > 0)
    return result.rows;

  return null;
};

// Find by Patient by Contact Number
async function findByPhone(nbr) {
  ////// 
  const result = await sql.query(`SELECT * FROM ${this.schema}.contact WHERE phone = $1`, [nbr]);
  if (result.rows.length > 0)
    return result.rows;

  return null;
};




async function updateById(id, newContact, userid) {
  delete newContact.id;
  newContact['lastmodifiedbyid'] = userid;
  const query = buildUpdateQuery(id, newContact, this.schema);
  // Turn req.body into an array of values
  var colValues = Object.keys(newContact).map(function (key) {
    return newContact[key];
  });
  const result = await sql.query(query, colValues);
  if (result.rowCount > 0) {
    return { "id": id, ...newContact };
  }
  return null;



};


async function deleteContact(id) {
  const result = await sql.query(`DELETE FROM ${this.schema}.contact WHERE id = $1`, [id]);

  if (result.rowCount > 0)
    return "Success"
  return null;
};



function buildUpdateQuery(id, cols, schema) {
  // Setup static beginning of query
  var query = [`UPDATE ${schema}.contact`];
  query.push('SET');

  // Create another array storing each set command
  // and assigning a number value for parameterized query
  var set = [];
  Object.keys(cols).forEach(function (key, i) {
    set.push(key + ' = ($' + (i + 1) + ')');
  });
  query.push(set.join(', '));

  // Add the WHERE statement to look up by id
  query.push('WHERE id = \'' + id + '\'');

  // Return a complete query string
  return query.join(' ');
}

module.exports = { findById, updateById, findAll, findByRecordtype, findByPhone, create, deleteContact, init };
