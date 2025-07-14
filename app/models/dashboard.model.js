const sql = require("./db.js");

let schema = '';
function init(schema_name) {
  this.schema = schema_name;
}

async function create(newDashboard, userid) {
  delete newDashboard.id;
  const result = await sql.query(`INSERT INTO ${this.schema}.dashboard ( name, description, reportids, createdbyid, lastmodifiedbyid)  VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [newDashboard.name, newDashboard.description, newDashboard.queryResult, userid, userid]);
  if (result.rows.length > 0) {
    return { id: result.rows[0].id, ...newDashboard };
  }
  return null;
};

async function findAll() {
  const result = await sql.query(`SELECT * FROM ${this.schema}.dashboard ORDER BY createddate DESC `);
  if (result.rows.length > 0) {
    return result.rows;
  }
  return [];
}

async function findById(id) {
  const result = await sql.query(`SELECT * FROM ${this.schema}.dashboard WHERE id = $1`, [id]);
  if (result.rows.length > 0) {
    return result.rows[0];
  }
  return null;
}

async function fetchReportsData(reportDataAr) {
  let reports = [];
  for (const item of reportDataAr) {
    var obj = {};

    const result = await sql.query(`SELECT * FROM ${this.schema}.report WHERE id = $1`, [item.reportId]);
    obj["boxid"] = item.box,
      obj["reportdata"] = result.rows[0],

      reports.push(obj);

  }
  return reports;
}

//.......................................... Update Dashboard ..........................................

async function updateById(id, newDashboard, userid) {

  //// 

  delete newDashboard.id;
  newDashboard['lastmodifiedbyid'] = userid;
  const query = buildUpdateQuery(id, newDashboard, this.schema);
  //// 
  // Turn req.body into an array of values
  var colValues = Object.keys(newDashboard).map(function (key) {

    //// 
    return newDashboard[key];
  });
  const result = await sql.query(query, colValues);
  //// 
  if (result.rowCount > 0) {
    return { "id": id, ...newDashboard };
  }
  return 1;
};

function buildUpdateQuery(id, cols, schema) {
  // Setup static beginning of query
  var query = [`UPDATE ${schema}.dashboard`];
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





//.............................................. Delete Dashboard ..........................................
async function deleteDashboard(id) {
  const result = await sql.query(`DELETE FROM ${this.schema}.dashboard WHERE id = $1`, [id]);

  if (result.rowCount > 0)
    return "Success"
  return null;
};

module.exports = { create, init, findAll, findById, fetchReportsData, updateById, deleteDashboard };

//contact related
