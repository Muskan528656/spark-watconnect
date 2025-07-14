/* Start updated by Pooja Vaishnav */
const sql = require("./db.js");
let schema = '';
function init(schema_name) {
    this.schema = schema_name;
}
//................ Create Product ................
async function create(newPricebook, userid) {
    delete newPricebook.id;
    const result = await sql.query(`INSERT INTO ${this.schema}.pricebook (productid, amount, active, gst, createdbyid, lastmodifiedbyid)  VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [newPricebook.productid, newPricebook.amount, newPricebook.active, newPricebook.gst,userid, userid]);
    if (result.rows.length > 0) {
        //// 
        return { id: result.rows[0].id, ...newPricebook };
    }
    return null;
};

//.......... Fetch Product By Id .............
async function findById(id) {
    let query = `SELECT prc.*, CONCAT(cu.firstname, ' ', cu.lastname) AS createdbyname, CONCAT(mu.firstname, ' ', mu.lastname) AS lastmodifiedbyname FROM ${this.schema}.pricebook prc `;
    query += ` INNER JOIN ${this.schema}.user As cu ON cu.Id = prc.createdbyid `;
    query += ` INNER JOIN ${this.schema}.user As mu ON mu.Id = prc.lastmodifiedbyid `;
    const result = await sql.query(query + ` WHERE prc.id = $1`, [id]);
    if (result.rows.length > 0)
        return result.rows[0];
    return null;
};

//......... Update Product .......................
async function updateById(id, newPricebook, userid) {
    newPricebook['lastmodifiedbyid'] = userid;
    const query = buildUpdateQuery(id, newPricebook, this.schema);
    var colValues = Object.keys(newPricebook).map(function (key) {
        return newPricebook[key];
    });
    try {
        const result = await sql.query(query, colValues);
        if (result.rowCount > 0) {
            return { "id": id, ...newPricebook };
        }
    } catch (error) {
        //// 
    }
    return null;
};

//.......... Delete Lead ..............................
async function deletepricebook(id) {
    const result = await sql.query(`DELETE FROM ${this.schema}.pricebook WHERE id = $1`, [id]);
    if (result.rowCount > 0)
        return "Success"
    return null;
};

//buildUpdateQuery
function buildUpdateQuery(id, cols, schema) {
    var query = [`UPDATE ${schema}.pricebook`];
    query.push('SET');
    var set = [];
    Object.keys(cols).forEach(function (key, i) {
        set.push(key + ' = ($' + (i + 1) + ')');
    });
    query.push(set.join(', '));
    query.push('WHERE id = \'' + id + '\'');
    return query.join(' ');
};
//.....................................find property by ownerId....................................
async function findByPricebookActiveId(pid) {
    let query = `SELECT pribook.*, concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname FROM ${this.schema}.pricebook pribook`;
    query += ` INNER JOIN ${this.schema}.product pr on pr.id = pribook.productid `;
    query += ` INNER JOIN ${this.schema}.user cu ON cu.Id = pribook.createdbyid `;
    query += ` INNER JOIN ${this.schema}.user mu ON mu.Id = pribook.lastmodifiedbyid `;
    const result = await sql.query(query + ` WHERE pribook.active=true And pribook.productid = $1`, [pid]);
    if (result.rows.length > 0)
        return result.rows[0];
    return null; 
};
//.....................................find property by ownerId....................................
async function findByPricebookById(pid) {
    let query = `SELECT pribook.*, concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname FROM ${this.schema}.pricebook pribook`;
    query += ` INNER JOIN ${this.schema}.product pr on pr.id = pribook.productid `;
    query += ` INNER JOIN ${this.schema}.user cu ON cu.Id = pribook.createdbyid `;
    query += ` INNER JOIN ${this.schema}.user mu ON mu.Id = pribook.lastmodifiedbyid `;
    const result = await sql.query(query + ` WHERE pribook.productid = $1`, [pid]);
    if (result.rows.length > 0)
        return result.rows;
    return null;
};
module.exports = { create, deletepricebook, init, findById, updateById, findByPricebookById, findByPricebookActiveId };
/* End updated by Pooja Vaishnav */