
const sql = require("./db.js");
const Sharing = require("./sharing.model.js");

let schema = '';
function init(schema_name) {
    this.schema = schema_name;
}
//................ Create Business ................
async function create(newBusiness, userid) {

    delete newBusiness.id;
    const result = await sql.query(`INSERT INTO ${this.schema}.business (name, contactid, accountid, ownerid, leadsource, industry, description, createdbyid, lastmodifiedbyid, amount)  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [newBusiness.name, newBusiness.contactid, newBusiness.accountid, newBusiness.ownerid, newBusiness.leadsource, newBusiness.industry, newBusiness.description,
            userid, userid, newBusiness.amount]);

    if (result.rows.length > 0) {
        return { id: result.rows[0].id, ...newBusiness };
    }
    return null;
};



//.......... Fetch Business By Id .............
async function findById(id) {
    //const result = await sql.query(`SELECT * FROM business WHERE id = $1`,[id]);
    let query = `SELECT acc.*, act.name accountname, concat(con.firstname, ' ' , con.lastname) contactname, concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname, concat(ow.firstname, ' ' , ow.lastname) ownername, ow.email owneremail FROM ${this.schema}.business acc `;
    query += `INNER JOIN ${this.schema}.user cu ON cu.id = acc.createdbyid `;
    query += ` INNER JOIN ${this.schema}.user mu ON mu.id = acc.lastmodifiedbyid `;
    query += ` LEFT JOIN ${this.schema}.user ow ON ow.id = acc.ownerid `;
    query += ` LEFT JOIN ${this.schema}.account act ON act.Id = acc.accountid `;
    query += ` LEFT JOIN ${this.schema}.contact con ON con.Id = acc.contactid `;
    const result = await sql.query(query + ` WHERE acc.id = $1`, [id]);

    //// 
    if (result.rows.length > 0)
        return result.rows[0];

    return null;
};
//.......... Fetch Business Test By Id .............
// async function findConBusinessById (pid) {
//     ////// 
//     //const result = await sql.query(`SELECT * FROM property WHERE ownerid = $1`,[id]);
//     let query = "SELECT mti.*, concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname, ";
//    // query += " pr.name, pr.productcode FROM medicaltestitem mti";
//     //query += " INNER JOIN product pr on pr.id = mti.productid "
//     query += " INNER JOIN contact mt on mt.id = mti.conid "
//     query += " INNER JOIN public.user cu ON cu.Id = mti.createdbyid ";
//     query += " INNER JOIN public.user mu ON mu.Id = mti.lastmodifiedbyid ";

//     const result = await sql.query(query + ` WHERE mti.conid = $1`, [pid]);
//     if(result.rows.length > 0)
//       return result.rows;

//   return null;
//   };
async function findBusinessByOwnerId(id) {
    //// 
    let query = `SELECT acc.*, act.name accountname, concat(con.firstname, ' ' , con.lastname) fullname, concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname FROM ${this.schema}.business acc `;
    query += ` INNER JOIN ${this.schema}.contact con ON con.Id = acc.conid `;
    query += ` INNER JOIN ${this.schema}.account act ON act.Id = acc.accountid `;
    query += `INNER JOIN ${this.schema}.user mu ON mu.Id = acc.lastmodifiedbyid`;
    const result = await sql.query(query + ` WHERE acc.conid = $1`, [id]);

    if (result.rows.length > 0)
        return result.rows;

    return null;
}
//...... Fetch All Businesss .........................
async function findAll(userinfo) {

    let query = `SELECT acc.*, act.name accountname, concat(con.firstname, ' ' , con.lastname) contactname, concat(ow.firstname, ' ' , ow.lastname) ownername, concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname FROM ${this.schema}.business acc`;
    query += ` INNER JOIN ${this.schema}.user cu ON cu.Id = acc.createdbyid `;
    query += ` INNER JOIN ${this.schema}.user mu ON mu.Id = acc.lastmodifiedbyid `;
    query += ` LEFT JOIN ${this.schema}.account act ON act.Id = acc.accountid `;
    query += ` LEFT JOIN ${this.schema}.contact con ON con.Id = acc.contactid `;
    query += ` LEFT JOIN ${this.schema}.user ow ON ow.Id = acc.ownerid `;

    let result = null;
    if (userinfo.userrole === 'USER' || userinfo.userrole === 'ADMIN') {
        query += ` WHERE ownerid = $1 OR  ownerid in (SELECT id FROM  ${this.schema}.user team where managerid = $1)`
        query += " ORDER BY createddate DESC ";
        result = await sql.query(query, [userinfo.id]);
    } else {
        query += " ORDER BY createddate DESC ";
        result = await sql.query(query);

    }

    // let arr = [];
    // for(let i=1; i < 100; i++){
    //     result.rows.forEach(function(val, index){
    //         arr.push(val);
    //     });
    // }

    //// 
    return result.rows;



};

//...... Fetch All Businesss .........................
async function findAllByParentId(parentid, userinfo) {

    let query = `SELECT acc.*, act.name accountname, concat(con.firstname, ' ' , con.lastname) contactname, concat(ow.firstname, ' ' , ow.lastname) ownername, concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname FROM ${this.schema}.business acc`;
    query += `INNER JOIN ${this.schema}.user cu ON cu.Id = acc.createdbyid `;
    query += ` INNER JOIN ${this.schema}.user mu ON mu.Id = acc.lastmodifiedbyid `;
    query += ` LEFT JOIN ${this.schema}.account act ON act.Id = acc.accountid `;
    query += ` LEFT JOIN ${this.schema}.contact con ON con.Id = acc.contactid `;
    query += `LEFT JOIN ${this.schema}.user ow ON ow.Id = acc.ownerid `;

    let result = null;
    if (userinfo.userrole === 'USER' || userinfo.userrole === 'ADMIN') {
        query += ` WHERE (acc.accountid = $1 OR acc.contactid = $1) AND (ownerid = $2 OR  ownerid in (SELECT id FROM ${this.schema}.user team where managerid = $2))`
        query += " ORDER BY createddate DESC ";
        result = await sql.query(query, [parentid, userinfo.id]);
    } else {
        query += " WHERE (acc.accountid = $1 OR acc.contactid = $1)  ORDER BY createddate DESC ";
        //// 
        result = await sql.query(query, [parentid]);

    }

    // let arr = [];
    // for(let i=1; i < 100; i++){
    //     result.rows.forEach(function(val, index){
    //         arr.push(val);
    //     });
    // }

    //// 
    return result.rows;



};

//......... Count of Businesss ...............
// async function getTotalBusinesss(){
//     //// 
//     let query = "SELECT count(id) totalbusinesss FROM business";
//     const result = await sql.query(query);

//     if (result.rows.length > 0)
//         return result.rows;

//     return null;
// };

//......... Update Business .......................
async function updateById(id, newBusiness, userid) {
    //// 
    delete newBusiness.id;
    newBusiness['lastmodifiedbyid'] = userid;
    const query = buildUpdateQuery(id, newBusiness, this.schema);
    // Turn req.body into an array of values
    var colValues = Object.keys(newBusiness).map(function (key) {
        return newBusiness[key];
    });
    try {
        //// 
        const result = await sql.query(query, colValues);
        if (result.rowCount > 0) {
            return { "id": id, ...newBusiness };
        }
    } catch (error) {
        //// 
    }

    return null;
};

//.......... Delete Business ..............................
async function deleteBusiness(id) {
    const result = await sql.query(`DELETE FROM ${this.schema}.business WHERE id = $1`, [id]);

    if (result.rowCount > 0)
        return "Success"
    return null;
};


function buildUpdateQuery(id, cols, schema) {
    //// 
    // Setup static beginning of query
    var query = [`UPDATE ${schema}.business`];
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


function prepareMailForNewBusiness(newBusiness) {
    let email = {
        subject: 'New Business Assigned to you',
        body: `Hi ${newBusiness.ownername} <br/><br/>
  A new business <a href="https://spark.indicrm.io/businesss/${newBusiness.id}" target="_blank">${newBusiness.firstname} ${newBusiness.lastname}</a> is created for you. <br/>
  Please contact asap <br/><br/>
  Thanks<br/>
  Admin`
    }
    return email;
}

function prepareAdminMailForNewBusiness(newBusiness) {
    let email = {
        subject: 'New Business Created in system',
        body: `Hi Admin <br/><br/>
  A new business <a href="https://spark.indicrm.io/businesss/${newBusiness.id}" target="_blank">${newBusiness.firstname} ${newBusiness.lastname}</a> is created in the system. <br/>
  Please check <br/><br/>
  Thanks<br/>
  System`
    }
    return email;
}

module.exports = { findById, updateById, findBusinessByOwnerId, findAll, create, deleteBusiness, init, prepareMailForNewBusiness, prepareAdminMailForNewBusiness, findAllByParentId };
