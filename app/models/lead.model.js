
const sql = require("./db.js");
const Sharing = require("./sharing.model.js");

let schema = '';
function init(schema_name) {
    this.schema = schema_name;
}
//................ Create Lead ................
async function create(newLead, userid) {
    console.log("newLeadnewLead", newLead);
    delete newLead.id;
    // Prepare the SQL query
    const query = `
        INSERT INTO ${this.schema}.lead (
            firstname, lastname, ownerid, company, leadsource, leadstatus, rating, salutation,
            phone, email, fax, industry, title, street, city, state, country, zipcode,
            description, createdbyid, lastmodifiedbyid, lostreason, amount, paymentmodel,
            paymentterms, iswon, country_code , whatsapp_number , blocked , tag_names
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19,
            $20, $21, $22, $23, $24, $25, $26, $27 , $28 , $29 , $30
        )
        RETURNING *
    `;
    // Prepare the values in the same order as the query
    const values = [
        newLead.firstname, newLead.lastname, newLead.ownerid, newLead.company, newLead.leadsource,
        newLead.leadstatus, newLead.rating, newLead.salutation, newLead.phone, newLead.email,
        newLead.fax, newLead.industry, newLead.title, newLead.street, newLead.city, newLead.state,
        newLead.country, newLead.zipcode, newLead.description, userid, userid,
        newLead.lostreason, newLead.amount, newLead.paymentmodel, newLead.paymentterms,
        newLead.iswon, newLead.country_code, newLead.whatsapp_number, false, newLead.tag_names
    ];
    // Optional: log for debugging


    // Execute the query
    const result = await sql.query(query, values);

    // Return the inserted lead with its new ID
    if (result.rows.length > 0) {
        return { id: result.rows[0].id, ...newLead };
    }

    return null;
}


//................ Create Lead ................
async function convertLead(newLead, userid) {

    delete newLead.id;
    try {


        let accountid = null;
        //// 
        if (newLead.company) {

            let query = `SELECT id FROM ${this.schema}.account acc where name = $1`;
            let result = await sql.query(query, [newLead.company]);
            //// 
            if (result.rows.length > 0) {
                accountid = result.rows[0].id;
            } else {
                result = await sql.query(`INSERT INTO ${this.schema}.account (name, createdbyid, lastmodifiedbyid) VALUES ($1, $2, $2) RETURNING *`, [newLead.company, userid]);
                //// 
                if (result.rows.length > 0) {
                    accountid = result.rows[0].id;
                }
            }




        }

        const conResult = await sql.query(`INSERT INTO ${this.schema}.contact (firstname, lastname, email, phone, street, city, state, pincode, country, accountid, createdbyid, lastmodifiedbyid)  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [newLead.firstname, newLead.lastname, newLead.email, newLead.phone, newLead.street, newLead.city, newLead.state, newLead.pincode, newLead.country, accountid, userid, userid]);
        let contactid = null;
        if (conResult.rows.length > 0) {
            contactid = conResult.rows[0].id;
            // return contactid;
        }

        let busname = newLead.company ? (newLead.company + '-' + newLead.firstname + ' ' + newLead.lastname) : newLead.firstname + ' ' + newLead.lastname;
        const busResult = await sql.query(`INSERT INTO ${this.schema}.business (name, contactid, accountid, leadsource, industry, description, ownerid, amount, paymentmodel, paymentterms, createdbyid, lastmodifiedbyid)  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [busname, contactid, accountid, newLead.leadsource, newLead.industry, newLead.description, newLead.ownerid, newLead.amount, newLead.paymentmodel, newLead.paymentterms, userid, userid]);
        let businessid = null;
        if (busResult.rows.length > 0) {
            businessid = busResult.rows[0].id;
            // return contactid;
        }

        let result = { contactid, businessid }
        return result;
    } catch (error) {
        //// 
        return null;
    }

};

//.......... Fetch Lead By Id .............
async function findById(id) {
    //const result = await sql.query(`SELECT * FROM lead WHERE id = $1`,[id]);
    let query = `SELECT acc.*, concat(con.firstname, ' ' , con.lastname) contactname, concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname, concat(ow.firstname, ' ' , ow.lastname) ownername, ow.email owneremail FROM ${this.schema}.lead acc `;
    query += ` INNER JOIN ${this.schema}.user cu ON cu.id = acc.createdbyid `;
    query += ` INNER JOIN ${this.schema}.user mu ON mu.id = acc.lastmodifiedbyid `;
    query += ` LEFT JOIN ${this.schema}.user ow ON ow.id = acc.ownerid `;
    query += ` LEFT JOIN ${this.schema}.contact con ON con.id = acc.convertedcontactid `;
    const result = await sql.query(query + ` WHERE acc.id = $1`, [id]);
    console.log("Resususu=", result);

    if (result.rows.length > 0)
        return result.rows[0];

    return null;
};


// ...................................... create lead from other soucre ............................................
async function createLeadFromOthers(newLead) {
    try {
        const { legacyid, pageid, formid, adid, status, FULL_NAME, EMAIL, PHONE, userid, leadsource, leadstatus } =
            newLead;

        var firstName = '';
        var lastName = '';
        if (FULL_NAME?.includes(' ')) {
            firstName = FULL_NAME.split(" ").slice(0, -1).join(" ");
            var lastName = FULL_NAME.split(" ").slice(-1).join(" ");
        } else {
            firstName = FULL_NAME;
        }

        const result = await sql.query(`INSERT INTO ${this.schema}.lead(firstname, lastname, email, phone, pageid, formid, adid, legacyid, leadsource, ownerid, createdbyid, lastmodifiedbyid, leadstatus)  VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [firstName, lastName, EMAIL, PHONE, pageid, formid, adid, legacyid, leadsource, userid, userid, userid, leadstatus]
        );


        if (result.rows.length > 0) {
            return { id: result.rows[0].id, ...newLead };
        }
    } catch (error) {

    }
    return null;
}

//....................................... create lead from the FB Ads............................................
async function createLeadFromFB(newLead, userid) {
    //delete newLead.id;
    //// 
    try {
        const { legacyid, pageid, formid, adid, ownerid, leadstatus, source, FULL_NAME, EMAIL, PHONE } = newLead;

        var firstName = FULL_NAME.split(' ').slice(0, -1).join(' ');
        var lastName = FULL_NAME.split(' ').slice(-1).join(' ');

        const result = await sql.query(`INSERT INTO ${this.schema}.lead (firstname, lastname, email, phone, pageid, formid, adid, legacyid, leadsource,leadstatus, ownerid, createdbyid, lastmodifiedbyid)  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,$13) RETURNING *`,
            [firstName, lastName, EMAIL, PHONE, pageid, formid, adid, legacyid, (source ? source : 'Facebook'), leadstatus, ownerid, ownerid, ownerid]);
        if (result.rows.length > 0) {
            return { id: result.rows[0].id, ...newLead };
        }

    } catch (error) {


    }
    return null;

}


//.......... Fetch Lead Test By Id .............
// async function findConLeadById (pid) {
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
async function findLeadByOwnerId(id) {
    //// 
    let query = `SELECT acc.*, concat(con.firstname, ' ' , con.lastname) fullname, concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname FROM ${this.schema}.lead acc `;
    query += ` INNER JOIN ${this.schema}.contact con ON con.Id = acc.conid `;
    query += ` INNER JOIN ${this.schema} cu ON cu.Id = acc.createdbyid `;
    query += ` INNER JOIN ${this.schema} mu ON mu.Id = acc.lastmodifiedbyid `;
    const result = await sql.query(query + ` WHERE acc.conid = $1`, [id]);

    if (result.rows.length > 0)
        return result.rows;

    return null;
}
//...... Fetch All Leads .........................
async function findAll(userinfo) {

    let query = `SELECT acc.*, concat(acc.firstname, ' ', acc.lastname) leadname, concat(ow.firstname, ' ' , ow.lastname) ownername, concat(cu.firstname, ' ' , cu.lastname) createdbyname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname FROM ${this.schema}.lead acc`;
    query += ` INNER JOIN ${this.schema}.user cu ON cu.Id = acc.createdbyid `;
    query += ` INNER JOIN ${this.schema}.user mu ON mu.Id = acc.lastmodifiedbyid `;
    query += ` LEFT JOIN ${this.schema}.user ow ON ow.Id = acc.ownerid `;

    let result = null;
    if (userinfo.userrole === 'USER' || userinfo.userrole === 'ADMIN') {
        query += ` WHERE ownerid = $1 OR  ownerid in (SELECT id FROM ${this.schema}.user team where managerid = $1)`
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


    return result.rows;
};
// ...... Find by phone number ........
async function findByNumber(phonenumber) {
    let query = `Select id, firstname, lastname, phone FROM ${this.schema}.lead where phone = '${phonenumber}'`;
    const result = await sql.query(query);
    if (result.rows.length > 0)
        return result.rows[0];
    return null;
};
//......... Count of Leads ...............
// async function getTotalLeads(){
//     //// 
//     let query = "SELECT count(id) totalleads FROM lead";
//     const result = await sql.query(query);

//     if (result.rows.length > 0)
//         return result.rows;

//     return null;
// };

//......... Update Lead .......................
async function updateById(id, newLead, userid) {
    //// 
    delete newLead.id;
    newLead['lastmodifiedbyid'] = userid;
    const query = buildUpdateQuery(id, newLead, this.schema);
    // Turn req.body into an array of values
    var colValues = Object.keys(newLead).map(function (key) {
        return newLead[key];
    });
    try {
        //// 
        const result = await sql.query(query, colValues);
        if (result.rowCount > 0) {
            return { "id": id, ...newLead };
        }
    } catch (error) {
        //// 
    }

    return null;
};


//.......... Delete Lead ..............................
async function deleteLead(id) {
    const result = await sql.query(`DELETE FROM ${this.schema}.lead WHERE id = $1`, [id]);

    if (result.rowCount > 0)
        return "Success"
    return null;
};


function buildUpdateQuery(id, cols, schema) {
    //// 
    // Setup static beginning of query
    var query = [`UPDATE ${schema}.lead`];
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


function prepareMailForNewLead(newLead) {
    let email = {
        subject: 'New Lead Assigned to you',
        body: `Hi ${newLead.ownername} <br/><br/>
  A new lead <a href="https://spark.indicrm.io/leads/${newLead.id}" target="_blank">${newLead.firstname} ${newLead.lastname}</a> is created for you. <br/>
  Please contact asap <br/><br/>
  Thanks<br/>
  Admin`
    }
    return email;
}

function prepareAdminMailForNewLead(newLead) {
    let email = {
        subject: 'New Lead Created in system',
        body: `Hi Admin <br/><br/>
  A new lead <a href="https://spark.indicrm.io/leads/${newLead.id}" target="_blank">${newLead.firstname} ${newLead.lastname}</a> is created in the system. <br/>
  Please check <br/><br/>
  Thanks<br/>
  System`
    }
    return email;
}

// added by muskan khan
async function checkWhatsAppNumberExists(whatsapp_number, userid, leadId = null) {
    let query = `
        SELECT COUNT(*) FROM (
            SELECT whatsapp_number FROM ${this.schema}.user WHERE whatsapp_number = $1
            UNION ALL
            SELECT whatsapp_number FROM ${this.schema}.lead WHERE whatsapp_number = $1 AND createdbyid = $2
            ${leadId ? `AND id != $3` : ''}
        ) AS combined
    `;

    const values = leadId ? [whatsapp_number, userid, leadId] : [whatsapp_number, userid];

    try {
        const result = await sql.query(query, values);
        return result.rows[0].count > 0;
    } catch (error) {
        console.error("Error checking WhatsApp number existence:", error);
        throw error;
    }
}

module.exports = { checkWhatsAppNumberExists, createLeadFromOthers, createLeadFromFB, findById, updateById, findLeadByOwnerId, findAll, create, deleteLead, init, convertLead, prepareMailForNewLead, prepareAdminMailForNewLead, findByNumber };
