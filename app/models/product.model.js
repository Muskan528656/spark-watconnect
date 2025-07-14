/* Start updated by Pooja Vaishnav */
const sql = require("./db.js");
let schema = '';        
function init(schema_name) {
    this.schema = schema_name;
}
//................ Create Product ................
    async function create(newProduct, userid) {
        //// 
        delete newProduct.id;
        const result = await sql.query(`INSERT INTO ${this.schema}.product (productname, productcode, category, subcategory, description, unitcount, createdbyid, lastmodifiedbyid)  VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [newProduct.productname, newProduct.productcode, newProduct.category, newProduct.subcategory, newProduct.description, newProduct.instock, userid, userid]);
        //// 
        if (result.rows.length > 0) {   
            //// 
            return { id: result.rows[0].id, ...newProduct };
        }
        return null;
    };
//.......... Fetch Product By Id .............
async function findById(id) {
    //// 
    let query = `SELECT pro.*,productname, productcode, category, subcategory, description, unitcount, lastmodifieddate, createddate, createdbyid, lastmodifiedbyid FROM ${this.schema}.product pro`;
    const result = await sql.query(query + ` WHERE pro.id = $1`, [id]);
    if (result.rows.length > 0)
        return result.rows[0];
 
    return null;
};

//...... Fetch All Products .........................
async function findAll(userinfo) {
    //// 
    let query = `SELECT id,productname, productcode, category, subcategory, description, unitcount FROM ${this.schema}.product`;
    let result = null;
    
    query += " ORDER BY createddate DESC ";
    result = await sql.query(query);
    
    //// 
    return result.rows;
};

//......... Update Product .......................
async function updateById(id, newProduct, userid) {
    newProduct['lastmodifiedbyid'] = userid;
    const query = buildUpdateQuery(id, newProduct, this.schema);
    // Turn req.body into an array of values
    var colValues = Object.keys(newProduct).map(function (key) {
        return newProduct[key];
    });
    try {
        const result = await sql.query(query, colValues);
        if (result.rowCount > 0) {
            return { "id": id, ...newProduct };
        }
    } catch (error) {
        //// 
    }
    return null;
};

//.......... Delete Product ..............................
async function deleteProduct(id) {
    const result = await sql.query(`DELETE FROM ${this.schema}.product WHERE id = $1`, [id]);
    if (result.rowCount > 0)
        return "Success"
    return null;
};

//buildUpdateQuery
function buildUpdateQuery(id, cols, schema) {
    var query = [`UPDATE ${schema}.product`];
    query.push('SET');
    var set = [];
    Object.keys(cols).forEach(function (key, i) {
        set.push(key + ' = ($' + (i + 1) + ')');
    });
    query.push(set.join(', '));
    query.push('WHERE id = \'' + id + '\'');
    return query.join(' ');
};
module.exports = { findAll, create, deleteProduct, init, findById, updateById };
/* End updated by Pooja Vaishnav */