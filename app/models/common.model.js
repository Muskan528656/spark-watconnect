const sql = require("./db.js");
const global = require("../constants/global.js");

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

async function countNewLeads() {
  //const result = await sql.query(`SELECT * FROM contact WHERE id = $1`,[id]);
  let openLeadStatus = global.LEAD_STATUS_VALUES[0].label;
  let query = `SELECT count(*) total FROM ${this.schema}.lead where leadstatus = $1`;
  //// 

  const result = await sql.query(query, [openLeadStatus]);
  if (result.rows.length > 0)
    return result.rows[0].total;

  return null;
};

async function countAllContacts() {
  //const result = await sql.query(`SELECT * FROM contact WHERE id = $1`,[id]);
  let query = `SELECT count(*) total FROM ${this.schema}.contact`;


  const result = await sql.query(query);
  if (result.rows.length > 0)
    return result.rows[0].total;

  return null;
};

async function findCompanySetting(companyid, settingName) {
  //const result = await sql.query(`SELECT * FROM contact WHERE id = $1`,[id]);
  let query = `SELECT * FROM companysetting where companyid =$1 AND name = $2`;


  const result = await sql.query(query, [companyid, settingName]);
  if (result.rows.length > 0)
    return result.rows[0];

  return null;
};

async function fetchSystemNotifications(companyid) {
  //const result = await sql.query(`SELECT * FROM contact WHERE id = $1`,[id]);
  let query = `SELECT * FROM ${this.schema}.notification where parentid =$1 and isactive=true`;

  //// 
  const result = await sql.query(query, [companyid]);
  if (result.rows.length > 0)
    return result.rows;

  return null;
};

async function countActiveUsers(companyid) {
  //const result = await sql.query(`SELECT * FROM contact WHERE id = $1`,[id]);
  let query = `SELECT count(*) total FROM ${this.schema}.user WHERE companyid = $1 AND isactive=true`;


  const result = await sql.query(query, [companyid]);
  if (result.rows.length > 0)
    return result.rows[0].total;

  return null;
};

async function getTotalBusiness(companyid) {
  //const result = await sql.query(`SELECT * FROM contact WHERE id = $1`,[id]);
  let query = `SELECT sum(amount) total FROM  ${this.schema}.business`;


  const result = await sql.query(query);
  if (result.rows.length > 0)
    return result.rows[0].total;

  return null;
};


function formatMessage(mystr) {

  let oldStr = mystr;
  mystr = mystr.substring(1);
  var arry = mystr.split(" @");
  var returnArr = [];

  for (var a of arry) {
    var obj = {};
    var value = a.substring(a.lastIndexOf("[") + 1, a.lastIndexOf("]"));
    var key = a.substring(a.lastIndexOf("(") + 1, a.lastIndexOf(")"));
    obj[`username`] = value;
    obj[`id`] = key;
    if (key)
      returnArr.push(obj);
  }
  //// 
  return returnArr;
};


async function findAll(title) {
  //// 
  let query = `SELECT con.*, concat(con.firstname, ' ' , con.lastname) contactname, concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname FROM ${this.schema}.contact con `;


  query += `INNER JOIN ${this.schema}.user cu ON cu.Id = con.createdbyid `;
  query += `INNER JOIN ${this.schema}.user mu ON mu.Id = con.lastmodifiedbyid `;
  query += " ORDER BY createddate DESC ";

  if (title) {
    query += ` WHERE con.title LIKE '%${title}%'`;
  }

  const result = await sql.query(query);
  return result.rows;
};

async function findContactByAccountId(id) {
  //// 
  let query = `SELECT con.*,concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname FROM ${this.schema}.contact con `;
  query += ` INNER JOIN ${this.schema}.account acc ON acc.Id = con.accountid `;
  query += ` INNER JOIN ${this.schema}.user cu ON cu.Id = con.createdbyid `;
  query += ` INNER JOIN ${this.schema}.user mu ON mu.Id = con.lastmodifiedbyid `;
  const result = await sql.query(query + ` WHERE con.accountid = $1`, [id]);

  if (result.rows.length > 0)
    return result.rows;

  return null;
}

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

async function fetchCompanyInfo(companyid) {
  const result = await sql.query(`SELECT systememail, adminemail FROM public.company WHERE id = $1`, [companyid]);
  if (result.rows.length > 0)
    return result.rows[0];

  return null;



};


async function fetchSystemAdminId(tenantcode) {
  const result = await sql.query(`SELECT u.id from ${this.schema}.user u LEFT JOIN public.company c ON u.companyid = c.id WHERE tenantcode = $1 AND u.userrole ='SUPER_ADMIN' AND u.isactive=true limit 1`, [tenantcode]);
  if (result.rows.length > 0)
    return result.rows[0].id;

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

async function incrementMessageCount(business_number) {
  const query = `
      INSERT INTO ${this.schema}.message_count (
          business_number, date, sent_count
      )
      VALUES (
          $1, CURRENT_DATE, 1
      )
      ON CONFLICT (business_number, date)
      DO UPDATE SET sent_count = ${this.schema}.message_count.sent_count + 1
      RETURNING *;
  `;

  const values = [business_number];

  try {
    const result = await sql.query(query, values);

    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  } catch (error) {
    console.error("Error in incrementMessageCount:", error);
    throw new Error("Database error while incrementing message count.");
  }
};

module.exports = { incrementMessageCount, fetchSystemAdminId, formatMessage, findCompanySetting, countNewLeads, countAllContacts, countActiveUsers, fetchCompanyInfo, findAll, findByRecordtype, findByPhone, create, deleteContact, init, getTotalBusiness, fetchSystemNotifications };
