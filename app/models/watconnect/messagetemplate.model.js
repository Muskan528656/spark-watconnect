/**
 * @author      Muskan Khan
 * @date        9 june 2024
 * @copyright   www.ibirdsservices.com
 */

const { stat } = require("fs");
const sql = require("../db");
let schema = '';

function init(schema_name) {
    this.schema = schema_name;
}
// ----------------------Get Record In DB----------------------
async function getTemplateRecord() {
    let query = `
            SELECT * 
    FROM ${this.schema}.message_template 
    WHERE isdeleted = false 
    ORDER BY createddate DESC;  
        `;
    const result = await sql.query(query);
    console.log("Result->", result);
    return result.rows.length > 0 ? result.rows : null;
}
// ------------------Insert Record In DB Marketing And Utility Template-------------------------
// async function createRecords(body, userid) {
//      
//     try {
//         const {
//             header_body, template_id, name, language, category, components = [],
//             business_number, status, message_body,
//         } = body;

//         let header = null;
//         let header_bodyy = null;
//         let message_bodyy = null;
//         let example_body_text = null;
//         let footer = null;
//         let buttons = [];

//         components.forEach(component => {
//             if (component.type === "HEADER") {
//                 header = component.format || null;
//                 header_bodyy = component.example?.header_text || null;
//             } else if (component.type === "BODY") {
//                 message_bodyy = component.text || null;
//                 example_body_text = component.example?.body_text || null;
//             } else if (component.type === "FOOTER") {
//                 footer = component.text || null;
//             } else if (component.type === "BUTTONS") {
//                 buttons = component.buttons || [];
//             }
//         });
//          
//         const buttonsJson = JSON.stringify(buttons);
//          
//         const result = await sql.query(
//             `INSERT INTO ${this.schema}.message_template (
//                 template_id, template_name, language, category,
//                 header, header_body, message_body, example_body_text,
//                 footer, buttons, business_number,
//                 createdbyid, lastmodifiedbyid, status , isdeleted       
//             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,$15)
//             RETURNING *`,
//             [
//                 template_id, name, language, category,
//                 header, header_body, message_body, example_body_text,
//                 footer, buttonsJson, business_number,
//                 userid, userid, status, false
//             ]
//         );

//          
//         return result.rows.length > 0 ? result.rows[0] : null;

//     } catch (error) {
//          
//     }
//     return null;
// }

async function createRecords(body, userid) {

    const {
        template_id, name, language, category, components = [],
        business_number, status
    } = body;

    try {

        let header = null;
        let header_body = null;
        let message_body = null;
        let example_body_text = null;
        let footer = null;
        let buttons = [];

        components.forEach(component => {
            if (component.type === "HEADER") {
                header = component.format || null;
                header_body = component.example?.header_text?.[0] || null;
            } else if (component.type === "BODY") {
                message_body = component.text || null;
                example_body_text = component.example?.body_text?.[0] || null;
            } else if (component.type === "FOOTER") {
                footer = component.text || null;
            } else if (component.type === "BUTTONS") {
                buttons = component.buttons || [];
            }
        });

        const buttonsJson = JSON.stringify(buttons);


        const result = await sql.query(
            `INSERT INTO ${this.schema}.message_template (
                template_id, template_name, language, category,
                header, header_body, message_body, example_body_text,
                footer, buttons, business_number,
                createdbyid, lastmodifiedbyid, status , isdeleted
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *`,
            [
                template_id, name, language, category,
                header, header_body, message_body, example_body_text,
                footer, buttonsJson, business_number,
                userid, userid, status, false
            ]
        );


        return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {
        console.error('##ERROR', error);
        throw error;
    }
}


// async function createRecords(body, userid) {
//     try {
//         const { template_id, name, language, category, header, header_body, message_body, example_body_text, footer, buttons, business_number } = body;
//         const buttonsJson = JSON.stringify(buttons);
//          
//         const result = await sql.query(`INSERT INTO ${this.schema}.message_template ( template_id, template_name, language, category, header, header_body, message_body, example_body_text, footer, buttons,business_number, createdbyid, lastmodifiedbyid )  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
//             [template_id, name, language, category, header, header_body, message_body, example_body_text, footer, buttonsJson, business_number, userid, userid]);

//         return result.rows.length > 0 ? result.rows[0] : null;

//     } catch (error) {
//          
//     }
//     return null;
// }

const { v4: uuidv4 } = require('uuid');

// ------------------------Create Record In Db Authentication Template-----------------
async function createRecordsauthentication(body, userid) {
    try {
        const {
            name,
            language,
            category,
            business_number,
            template_id,
            status = '',
            otp_type
        } = body;

        let codeexpiration = null;
        let securityrecommendation = false;
        let footer = null;
        let buttons = [];

        const components = body.components || [];

        components.forEach(component => {
            if (component.type === 'FOOTER') {
                footer = component.text || null;
                codeexpiration = component.code_expiration_minutes || null;
            } else if (component.type === 'BODY') {
                securityrecommendation = component.add_security_recommendation || false;
            } else if (component.type === 'BUTTONS') {
                buttons = component.buttons || [];
            }
        });

        const buttonsJson = JSON.stringify(buttons);
        const now = new Date();
        const newId = uuidv4();

        const query = `
            INSERT INTO ${this.schema}.message_template (
                id,
                template_id,
                template_name,
                language,
                category,
                createddate,
                lastmodifieddate,
                createdbyid,
                lastmodifiedbyid,
                business_number,
                status,
                isdeleted,
                codeexpiration,
                securityrecommendation,
                otptype,
                footer,
                buttons
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15,
                $16, $17
            )
            RETURNING *;
        `;

        const values = [
            newId,
            template_id || null,
            name || null,
            language || null,
            category || null,
            now,
            now,
            userid,
            userid,
            business_number || null,
            status,
            false,
            codeexpiration || null,
            securityrecommendation,
            otp_type || null,
            footer,
            buttonsJson
        ];

        const result = await sql.query(query, values);

        return result.rows?.[0] || null;

    } catch (error) {
        console.error('##ERROR', error);
        return null;
    }
}


// ----------------------Update Template In DB Marketing And Utility----------------
async function updateTemplateRecord(body, userid) {
    try {
        const {
            name,
            language,
            category,
            components = [],
            template_id
        } = body;
        let header = null;
        let header_body = null;
        let message_body = null;
        let footer = null;
        components.forEach(component => {
            switch (component.type) {
                case 'HEADER':
                    header = component.format || null;
                    header_body = component.text || null;
                    break;
                case 'BODY':
                    message_body = component.text || null;
                    break;
                case 'FOOTER':
                    footer = component.text || null;
                    break;
                default:
                    break;
            }
        });
        const query = `
            UPDATE ${this.schema}.message_template
            SET
                template_name = $1,
                language = $2,
                category = $3,
                header = $4,
                header_body = $5,
                message_body = $6,
                footer = $7,
                lastmodifiedbyid = $8,
                lastmodifieddate = $9
            WHERE template_id = $10
            RETURNING *;
        `;
        const values = [
            name,
            language,
            category,
            header,
            header_body,
            message_body,
            footer,
            userid,
            new Date(),
            template_id
        ];
        const result = await sql.query(query, values);

        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error("##ERROR during updateTemplateRecord", error);
        return null;
    }
}

// ------------------Get By Name Record Find In DB-------------------------
async function findRecord(body) {
    try {
        const { id, name } = body;
        const query = `SELECT * FROM ${this.schema}.message_template WHERE template_id = '${id}' AND template_name = '${name}' `;

        let result = await sql.query(query);
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('##ERROR', error);
    }
}

// ------------------Get By Name Record Find In DB-------------------------

async function updateById(id, reqBody, userid) {
    reqBody['lastmodifiedbyid'] = userid;
    const query = buildUpdateQuery(id, reqBody, this.schema);
    var colValues = Object.keys(reqBody).map(function (key) {
        return reqBody[key];
    });
    const result = await sql.query(query, colValues);
    if (result.rowCount > 0) {
        return { "id": id, ...reqBody };
    }
    return null;
};


function buildUpdateQuery(id, cols, schema) {
    var query = [`UPDATE ${schema}.message_template`];
    query.push('SET');
    var set = [];
    Object.keys(cols).forEach(function (key, i) {
        set.push(key + ' = ($' + (i + 1) + ')');
    });
    query.push(set.join(', '));
    query.push('WHERE id = \'' + id + '\'');
    return query.join(' ');
}


// -------------------In Db IF Template Delete Then isdeleted false and showing only true value template------------
async function updateIsdelete(templateId,) {
    const query = `UPDATE ${this.schema}.message_template
    SET isdeleted = true
    WHERE template_id = $1`;

    const values = [templateId];
    try {
        const result = await sql.query(query, values);


        if (result.rowCount > 0) {
            return { template_id: templateId, isdeleted: true };
        }
        return null;
    } catch (err) {
        console.error("Error during template deletion:", err);
        return null;
    }
}






module.exports = { createRecords, createRecordsauthentication, updateById, findRecord, getTemplateRecord, updateIsdelete, updateTemplateRecord, init }; 