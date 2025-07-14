const { Query } = require("pg");
const sql = require("./db.js");

let schema = '';
function init(schema_name){
    this.schema = schema_name;
}

//................ Create Account ................
async function create(newPayment, userid) {
    //// 
    delete newPayment.id;
    const result = await sql.query(`INSERT INTO ibs_ibirds.payment (paymentdate, discription, amount, type, contactid, businessid,createdbyid, lastmodifiedbyid)  VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [newPayment.paymentdate,newPayment.discription,newPayment.amount,newPayment.type,newPayment.contactid,newPayment.businessid,userid,userid]);
    if (result.rows.length > 0) {
        return { id: result.rows[0].id, ...newPayment };
    }
    return null;
};


async function findContactByAccountId(id) {
    //// 
    let query = `SELECT con.*,concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname FROM ${this.schema}.contact con `;
    query += ` LEFT JOIN ${this.schema}.account acc ON acc.Id = con.accountid `;
    query += `INNER JOIN ${this.schema}.user cu ON cu.Id = con.createdbyid `;
    query += ` INNER JOIN ${this.schema}.user mu ON mu.Id = con.lastmodifiedbyid `;
    try {
        const result = await sql.query(query + ` WHERE con.accountid = $1`, [id]);
        if (result.rows.length > 0)
        return result.rows;
    } catch (error) {
        //// 
    }
   
    
  
    return null;
  }

//.......... Fetch Payment By findByBusinessId .............
async function findByBusinessId(id) {
    //// 
    let query = `SELECT id, paymentdate, discription, amount, type, contactid, businessid, createdbyid, lastmodifiedbyid, createddate, lastmodifieddate
      FROM ibs_ibirds.payment 
      WHERE businessid = $1
      ORDER BY paymentdate DESC`;
      
    const result = await sql.query(query, [id]);
    //// 
      
    if (result.rows.length > 0) {
      return result.rows;
    }
  
    return null;
  }
  

//.......... Fetch Payment By ID .............
async function findById(id) {
    //// 
 
    let query = `SELECT id, paymentdate, discription, amount, type, contactid, businessid, createdbyid, lastmodifiedbyid, createddate, lastmodifieddate
	FROM ibs_ibirds.payment`
    const result = await sql.query(query + ` WHERE id = $1`, [id]);
    //// 
    
    if (result.rows.length > 0)
        return result.rows;

    return null;
};




//...... Fetch All Accounts .........................
async function findAll(title) {
    let query = `SELECT acc.*, concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname FROM ${this.schema}.account acc`;

    query += `INNER JOIN ${this.schema}.user cu ON cu.Id = acc.createdbyid `;
    query += `INNER JOIN ${this.schema}.user mu ON mu.Id = acc.lastmodifiedbyid `;
    query += " ORDER BY createddate DESC ";

    if (title) {
        query += ` WHERE acc.title LIKE '%${title}%'`;
    }

    const result = await sql.query(query);
    return result.rows;
};

//......... Count of Accounts ...............
async function getTotalAccounts(){
    //// 
    let query = `SELECT count(id) totalaccounts FROM ${this.schema}.account`;
    const result = await sql.query(query);

    if (result.rows.length > 0)
        return result.rows;

    return null;
};

//......... Update payment .......................
async function updateById(id, newPayment, userid) {
    delete newPayment.id;
    newPayment['lastmodifiedbyid'] = userid;
    //// 
    const query = buildUpdateQuery(id, newPayment, 'ibs_ibirds');
    //// 
    var colValues = Object.keys(newPayment).map(function (key) {
        return newPayment[key];
    });

    //// 
    //// 

    const result = await sql.query(query, colValues);
    if (result.rowCount > 0) {
        return { "id": id, ...newPayment };
    }
    return null;
};

//.......... Delete Account ..............................
async function deletePayment(id) {
    const result = await sql.query(`DELETE FROM ibs_ibirds.payment WHERE id = $1`, [id]);

    if (result.rowCount > 0)
        return "Success"
    return null;
};


function buildUpdateQuery(id, cols, schema) {
    // Setup static beginning of query
    //// 
    var query = [`UPDATE ${schema}.payment`];
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

module.exports = { findByBusinessId, updateById,findById, findAll, create, deletePayment, getTotalAccounts, init, findContactByAccountId};
