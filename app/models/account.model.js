const sql = require("./db.js");

let schema = '';
function init(schema_name) {
    this.schema = schema_name;
}

//................ Create Account ................
async function create(newAccount, userid) {
    delete newAccount.id;
    const result = await sql.query(`INSERT INTO ${this.schema}.account (name, website, street, city, state, country, pincode, phone, email, createdbyid, lastmodifiedbyid)  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [newAccount.name, newAccount.website, newAccount.street, newAccount.city, newAccount.state, newAccount.country, newAccount.pincode, newAccount.phone, newAccount.email, userid, userid]);
    if (result.rows.length > 0) {
        return { id: result.rows[0].id, ...newAccount };
    }
    return null;
};


async function findContactByAccountId(id) {
    //// 
    let query = `SELECT con.*,concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname FROM ${this.schema}.contact con `;
    query += ` LEFT JOIN ${this.schema}.account acc ON acc.Id = con.accountid `;
    query += ` INNER JOIN ${this.schema} cu ON cu.Id = con.createdbyid `;
    query += ` INNER JOIN ${this.schema} mu ON mu.Id = con.lastmodifiedbyid `;
    try {
        const result = await sql.query(query + ` WHERE con.accountid = $1`, [id]);
        if (result.rows.length > 0)
            return result.rows;
    } catch (error) {
        //// 
    }



    return null;
}

//.......... Fetch Account By Id .............
async function findById(id) {
    //const result = await sql.query(`SELECT * FROM account WHERE id = $1`,[id]);
    let query = `SELECT acc.*, concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname FROM ${this.schema}.account acc `;

    query += `INNER JOIN ${this.schema}.user cu ON cu.Id = acc.createdbyid `;
    query += `INNER JOIN ${this.schema}.user mu ON mu.Id = acc.lastmodifiedbyid `;
    const result = await sql.query(query + ` WHERE acc.id = $1`, [id]);


    if (result.rows.length > 0)
        return result.rows[0];

    return null;
};

//...... Fetch All Accounts .........................
async function findAll(title) {
    let query = `SELECT acc.*, concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname FROM ${this.schema}.account acc`;

    query += ` INNER JOIN ${this.schema}.user cu ON cu.Id = acc.createdbyid `;
    query += ` INNER JOIN ${this.schema}.user mu ON mu.Id = acc.lastmodifiedbyid `;
    query += ` ORDER BY createddate DESC `;

    if (title) {
        query += ` WHERE acc.title LIKE '%${title}%'`;
    }

    const result = await sql.query(query);
    return result.rows;
};

//......... Count of Accounts ...............
async function getTotalAccounts() {
    //// 
    let query = `SELECT count(id) totalaccounts FROM ${this.schema}.account`;
    const result = await sql.query(query);

    if (result.rows.length > 0)
        return result.rows;

    return null;
};

//......... Update Account .......................
async function updateById(id, newAccount, userid) {
    delete newAccount.id;
    newAccount['lastmodifiedbyid'] = userid;
    const query = buildUpdateQuery(id, newAccount, this.schema);
    // Turn req.body into an array of values
    var colValues = Object.keys(newAccount).map(function (key) {
        return newAccount[key];
    });
    const result = await sql.query(query, colValues);
    if (result.rowCount > 0) {
        return { "id": id, ...newAccount };
    }
    return null;
};

//.......... Delete Account ..............................
async function deleteAccount(id) {
    const result = await sql.query(`DELETE FROM ${this.schema}.account WHERE id = $1`, [id]);

    if (result.rowCount > 0)
        return "Success"
    return null;
};


function buildUpdateQuery(id, cols, schema) {
    // Setup static beginning of query
    var query = [`UPDATE ${schema}.account`];
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

module.exports = { findById, updateById, findAll, create, deleteAccount, getTotalAccounts, init, findContactByAccountId };
