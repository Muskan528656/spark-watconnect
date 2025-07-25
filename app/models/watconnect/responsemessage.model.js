/**
 * @author      Muskan Khan
 * @date        Oct, 2024
 * @copyright   www.ibirdsservices.com
 */

const sql = require("../db");

let schema = '';
function init(schema_name) {
    this.schema = schema_name;
}

async function getAllRecords(userinfo) {
    let query = `SELECT rm.* FROM ${this.schema}.auto_response_message rm `;
    query += ` INNER JOIN ${this.schema}.user cu ON cu.Id = rm.createdbyid `;
    query += ` INNER JOIN ${this.schema}.user mu ON mu.Id = rm.lastmodifiedbyid `;

    let result = null;
    if (userinfo.userrole === 'USER' || userinfo.userrole === 'ADMIN') {
        query += ` WHERE rm.createdbyid = $1 OR rm.createdbyid in (SELECT id FROM ${this.schema}.user team where managerid = $1)`
        query += " ORDER BY createddate DESC ";
        result = await sql.query(query, [userinfo.id]);
    }
    else {
        query += " ORDER BY rm.createddate DESC ";
        result = await sql.query(query);
    }

    return result.rows.length > 0 ? result.rows : null;
};


async function createRecord(reqBody, userid) {
    const result = await sql.query(`INSERT INTO ${this.schema}.auto_response_message (type, message, createdbyid, lastmodifiedbyid)  VALUES ($1, $2, $3, $4) RETURNING *`,
        [reqBody.type, reqBody.message, userid, userid]);

    return result.rows.length > 0 ? result.rows[0] : null;
};
async function updateById(id, reqBody, userid) {
    reqBody['lastmodifiedbyid'] = userid;
     

    const query = buildUpdateQuery(id, reqBody, this.schema);
    const colValues = [...Object.values(reqBody), id]; // Append ID as last parameter

    const result = await sql.query(query, colValues);

    if (result.rowCount > 0) {
        return { id, ...reqBody };
    }
    return null;
}

// async function updateById(id, reqBody, userid) {
//     reqBody['lastmodifiedbyid'] = userid;    
//     const query = buildUpdateQuery(id, reqBody, this.schema);
//     var colValues = Object.keys(reqBody).map(function (key) {
//         return reqBody[key];
//     });
//     const result = await sql.query(query, colValues);
//     if (result.rowCount > 0) {
//         return { "id": id, ...reqBody };
//     }
//     return null;
// };
function buildUpdateQuery(id, cols, schema) {
    const keys = Object.keys(cols);
    const set = keys.map((key, i) => `${key} = $${i + 1}`);
    const query = [
        `UPDATE ${schema}.auto_response_message`,
        'SET',
        set.join(', '),
        `WHERE id = $${keys.length + 1}` // Use parameter placeholder for ID
    ];
    return query.join(' ');
}


// function buildUpdateQuery(id, cols, schema) {
//     var query = [`UPDATE ${schema}.auto_response_message`];
//     query.push('SET');
//     var set = [];
//     Object.keys(cols).forEach(function (key, i) {
//         set.push(key + ' = ($' + (i + 1) + ')');
//     });
//     query.push(set.join(', '));
//     query.push('WHERE id = \'' + id + '\'');
//     return query.join(' ');
// }

async function deleteRecord(id) {
    const result = await sql.query(`DELETE FROM ${this.schema}.auto_response_message WHERE id = $1`, [id]);
    if (result.rowCount > 0)
        return "Success"
    return null;
};

async function checkDuplicateRecord(type, userid, id = null) {
    let query = `SELECT * FROM ${this.schema}.auto_response_message WHERE type = $1 AND createdbyid = $2`;
    const params = [type, userid];

    if (id) {
        query += " AND id != $3";
        params.push(id);
    }

    const result = await sql.query(query, params);
    return result.rows.length > 0;
}

module.exports = { getAllRecords, createRecord, updateById, deleteRecord, checkDuplicateRecord, init };
