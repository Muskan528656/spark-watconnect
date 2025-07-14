const sql = require("./db.js");

let schema = '';
function init(schema_name) {
    this.schema = schema_name;
}

//................ Create Incident ................
async function create(newIncident, userid) {
    delete newIncident.id;
    const result = await sql.query(`INSERT INTO ${this.schema}.incident (subject, description, priority, status, origin, contactid, productid, createdbyid, lastmodifiedbyid, ownerid)  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10) RETURNING *`,
        [newIncident.subject, newIncident.description, newIncident.priority, newIncident.status, newIncident.origin, newIncident.contactid, newIncident.productid,
            userid, userid, newIncident.ownerid,]);
    ////
    if (result.rows.length > 0) {
        ////
        return { id: result.rows[0].id, ...newIncident };
    }
    return null;
};

//.......... Fetch Incident By Id .............
async function findById(id) {
    let query = `SELECT inc.*, pd.productname as productname,concat(con.firstname, ' ' , con.lastname) contactname , concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname, concat(ow.firstname, ' ' , ow.lastname) ownername, ow.email owneremail FROM ${this.schema}.incident inc `;
    query += ` INNER JOIN ${this.schema}.user cu ON cu.id = inc.createdbyid `;
    query += ` INNER JOIN ${this.schema}.user mu ON mu.id = inc.lastmodifiedbyid `;
    query += ` LEFT JOIN ${this.schema}.user ow ON ow.id = inc.ownerid `;
    query += `LEFT JOIN ${this.schema}.product pd ON pd.id = inc.productid `;
    query += `LEFT JOIN ${this.schema}.contact con ON con.id = inc.contactid `;
    const result = await sql.query(query + ` WHERE inc.id = $1`, [id]);
    if (result.rows.length > 0)
        return result.rows[0];
    return null;

};

//...... Fetch All Incidents .........................
async function findAll(userinfo) {
    let query = `SELECT inc.*,pd.productname as productname,concat(con.firstname, ' ' , con.lastname) contactname ,concat(ow.firstname, ' ' , ow.lastname) ownername,concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname FROM ${this.schema}.incident inc`;
    query += ` INNER JOIN ${this.schema}.user cu ON cu.Id = inc.createdbyid `;
    query += ` INNER JOIN ${this.schema}.user mu ON mu.Id = inc.lastmodifiedbyid `;
    query += ` LEFT JOIN ${this.schema}.user ow ON ow.Id = inc.ownerid `;
    query += `LEFT JOIN ${this.schema}.product pd ON pd.id = inc.productid `;
    query += `LEFT JOIN ${this.schema}.contact con ON con.id = inc.contactid `;
    let result = null;
    if (userinfo.userrole === 'USER' || userinfo.userrole === 'ADMIN') {
        query += `WHERE ownerid = $1 OR  ownerid in (SELECT id FROM ${this.schema}.user team where managerid = $1)`
        query += " ORDER BY createddate DESC ";
        result = await sql.query(query, [userinfo.id]);
    } else {
        query += " ORDER BY createddate DESC ";
        result = await sql.query(query);

    }
    return result.rows;
};

//......... Update Incident .......................
async function updateById(id, newIncident, userid) {
    delete newIncident.id;
    newIncident['lastmodifiedbyid'] = userid;
    const query = buildUpdateQuery(id, newIncident, this.schema);
    // Turn req.body into an array of values
    var colValues = Object.keys(newIncident).map(function (key) {
        return newIncident[key];
    });
    try {
        const result = await sql.query(query, colValues);
        if (result.rowCount > 0) {
            return { "id": id, ...newIncident };
        }
    } catch (error) {
        ////
    }

    return null;
};

//.......... Delete Incident ..............................
async function deleteIncident(id) {
    const result = await sql.query(`DELETE FROM ${this.schema}.incident WHERE id = $1`, [id]);
    if (result.rowCount > 0)
        return "Success"
    return null;
};

function buildUpdateQuery(id, cols, schema) {
    var query = [`UPDATE ${schema}.incident`];
    query.push('SET');
    var set = [];
    Object.keys(cols).forEach(function (key, i) {
        set.push(key + ' = ($' + (i + 1) + ')');
    });
    query.push(set.join(', '));
    query.push('WHERE id = \'' + id + '\'');
    return query.join(' ');
}

module.exports = { findById, updateById, findAll, create, deleteIncident, init };
