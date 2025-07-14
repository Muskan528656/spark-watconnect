/**
 * @author      Muskan Khan
 * @date        July, 2024
 * @copyright   www.ibirdsservices.com
 */

const sql = require("../db");
let schema = '';

function init(schema_name) {
    this.schema = schema_name;
}

async function getMessageHistoryRecords(toNumber, business_number) {

    const query = `
            SELECT mh.id AS message_history_id, 
                mh.*,
                mh.message AS chatMsg, 
                temp.id AS message_template_id,
                temp.template_name,
                temp.template_id,
                temp.language,
                temp.category, 
                temp.header,
                temp.header_body,
                temp.message_body,
                temp.example_body_text,
                temp.footer,
                temp.buttons,
                fl.id AS file_id,
                fl.title,
                fl.filetype,
                fl.description,
               
                intmsg.id AS interactive_id,
                intmsg.header_type,
                intmsg.header_content,
                intmsg.body_text,
                intmsg.footer_text,
                intmsg.buttons AS interactive_buttons,
                intmsg.sections,
                intmsg.name AS interactive_name,
                intmsg.type AS interactive_type,
                intmsg.file_id AS interactive_file_id,

                intfl.title AS interactive_file_title,
                intfl.filetype AS interactive_file_type,
                msg_par.body_text_params::json as body_text_params,            
                msg_par.file_id AS params_file_id,

                camp_par.body_text_params::json AS campaign_body_text_params,
                camp_par.file_id AS campaign_params_file_id,


                urs.firstname, urs.lastname
            FROM 
            ${this.schema}.message_history mh
            LEFT JOIN 
                ${this.schema}.message_template temp ON mh.message_template_id = temp.template_id
            LEFT JOIN 
                ${this.schema}.interactive_messages intmsg ON mh.interactive_id = intmsg.id
            LEFT JOIN 
                ${this.schema}.file fl ON mh.file_id = fl.id
            LEFT JOIN 
                ${this.schema}.file intfl ON intmsg.file_id = intfl.id
            LEFT JOIN 
                 ${this.schema}.campaign_template_params AS msg_par ON mh.id = msg_par.msg_history_id
            LEFT JOIN 
                ${this.schema}.campaign_template_params AS camp_par 
                ON mh.parent_id = camp_par.campaign_id
            LEFT JOIN 
                ${this.schema}.user AS urs ON mh.createdbyid = urs.id
            WHERE 
                mh.whatsapp_number = $1 
                AND mh.business_number = $2
                AND (mh.status = 'Outgoing' OR mh.status = 'Incoming')
                AND mh.recordtypename != 'groups' 

            ORDER BY 
                mh.createddate ASC
        `;



    // ON CASE 
    // WHEN mh.file_id::text ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    // THEN mh.file_id::uuid 
    // ELSE NULL 
    // END = fl.id

    try {
        const result = await sql.query(query, [toNumber, business_number]);
        return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

async function createMessageHistoryRecord(body, userid) {
     
    try {
        const { parent_id, name, message_template_id, whatsapp_number, message, status, recordtypename, file_id, is_read, business_number, message_id, interactive_id } = body;
         
        const result = await sql.query(`INSERT INTO ${this.schema}.message_history (parent_id, name, message_template_id, whatsapp_number, message, status, recordtypename, file_id, is_read,business_number, message_id, interactive_id, createdbyid, lastmodifiedbyid )  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,$12, $13, $14) RETURNING *`,
            [parent_id, name, message_template_id, whatsapp_number, message, status, recordtypename, file_id, is_read, business_number, message_id, interactive_id, userid, userid]);

        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

// async function updateMessageStatus(messageId, status, errorDetails = null, timestamp = null) {
//     try {
//         const result = await sql.query(`
//            UPDATE ${this.schema}.message_history 
//             SET status = $1, delivery_status = $2, err_message = $3, received_time = $4
//             WHERE message_id = $5
//             RETURNING *;
//         `, ["Outgoing",status, errorDetails, timestamp, messageId]);

//         // return result.rows.length > 0 ? result.rows[0] : null; // Return the updated record
//         const updatedRow = result.rows.length > 0 ? result.rows[0] : null;
//         if (updatedRow?.parent_id && updatedRow?.recordtypename === 'campaign') {
//             const campaignId = updatedRow.parent_id;
//             const lowerStatus = status.toLowerCase();

//             let countFieldToUpdate = null;
//             if (lowerStatus === "read") countFieldToUpdate = "read";
//             else if (lowerStatus === "delivered") countFieldToUpdate = "delivered";
//             else if (lowerStatus === "sent") countFieldToUpdate = "sent";
//             else if (lowerStatus === "failed") countFieldToUpdate = "failed";

//             if (countFieldToUpdate) {
//                 await sql.query(`
//                     UPDATE ${this.schema}.campaign 
//                     SET ${countFieldToUpdate} = COALESCE(${countFieldToUpdate}, 0) + 1
//                     WHERE id = $1
//                 `, [campaignId]);
//             }
//         }

//         return updatedRow;
//     } catch (error) {
//         console.error('Error executing query:', error);
//         throw error;
//     }
// }

async function updateMessageStatus(messageId, status, errorDetails = null, timestamp = null) {
    try {
        const result = await sql.query(`
           UPDATE ${this.schema}.message_history 
            SET status = $1, delivery_status = $2, err_message = $3, received_time = $4
            WHERE message_id = $5
            RETURNING *;
        `, ["Outgoing", status, errorDetails, timestamp, messageId]);

        return result.rows.length > 0 ? result.rows[0] : null; // Return the updated record
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}



async function markMessageClicked(messageId) {
    try {
        const result = await sql.query(`
           UPDATE ${this.schema}.message_history 
           SET clicked = true
           WHERE message_id = $1
           RETURNING *;
        `, [messageId]);

        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error executing markMessageClicked:', error);
        throw error;
    }
}


async function getMessageHistoryStatsByCampaignId(id) {
    const query = `
        WITH stats AS (
            SELECT 
                COUNT(*) AS total,
                 COUNT(CASE 
                    WHEN LOWER(status) = 'outgoing' THEN 1 
                END) AS sent,
                COUNT(CASE 
                    WHEN LOWER(delivery_status) IN ('delivered', 'read') THEN 1 
                END) AS delivered,
                COUNT(CASE 
                    WHEN LOWER(delivery_status) = 'read' THEN 1 
                END) AS read,
                COUNT(CASE 
                    WHEN LOWER(delivery_status) = 'failed' THEN 1 
                END) AS failed,
                COUNT(CASE 
                        WHEN clicked = true THEN 1 
                    END) AS clicked
            FROM ${this.schema}.message_history
            WHERE recordtypename = 'campaign' AND parent_id = $1
        )
        SELECT 
            s.total,
            s.sent,
            s.delivered,
            s.read,
            s.failed,
            s.clicked,
            ROUND((s.sent::decimal / NULLIF(s.total, 0)) * 100, 2) AS sent_percentage,
            ROUND((s.delivered::decimal / NULLIF(s.total, 0)) * 100, 2) AS delivered_percentage,
            ROUND((s.read::decimal / NULLIF(s.total, 0)) * 100, 2) AS read_percentage,
            ROUND((s.failed::decimal / NULLIF(s.total, 0)) * 100, 2) AS failed_percentage,
            ROUND((s.clicked::decimal / NULLIF(s.total, 0)) * 100, 2) AS clicked_percentage
        FROM 
            ${this.schema}.message_history mh
        INNER JOIN 
            ${this.schema}.campaign cmp 
            ON mh.parent_id = cmp.id
        CROSS JOIN stats s
        WHERE 
            mh.recordtypename = 'campaign'
            AND cmp.id = $1
    `;

    try {
        const result = await sql.query(query, [id]);
        return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}
async function getMsgByStatus(campaignId, status) {
    const allowedStatuses = ['total', 'delivered', 'read', 'failed', 'clicked'];
    const normalizedStatus = status.toLowerCase();

    if (!allowedStatuses.includes(normalizedStatus)) {
         
        return null;
    }

    let statusCondition = '';
    switch (normalizedStatus) {
        case 'total':
            statusCondition = `LOWER(mh.status) = 'outgoing'`;
            break;
        case 'delivered':
            statusCondition = `LOWER(mh.delivery_status) IN ('delivered', 'read')`;
            break;
        case 'read':
            statusCondition = `LOWER(mh.delivery_status) = 'read'`;
            break;
        case 'clicked':
            statusCondition = `mh.clicked = true`;
            break;
        default:
            statusCondition = `LOWER(mh.delivery_status) = '${normalizedStatus}'`;
    }

    const query = `
        SELECT 
            mh.id, 
            mh.name,
            mh.clicked,
            mh.whatsapp_number AS number, 
            mh.status,
            CASE
                WHEN $2 = 'delivered' AND LOWER(mh.delivery_status) IN ('delivered', 'read') THEN 'delivered'
                WHEN $2 = 'read' AND LOWER(mh.delivery_status) = 'read' THEN 'read'
                WHEN $2 = 'clicked' AND mh.clicked = true THEN 'clicked'
                ELSE LOWER(mh.delivery_status)
            END AS delivery_status,
            mh.err_message, 
            mh.message, 
            mh.parent_id,
            mh.message_id
        FROM 
            ${this.schema}.message_history mh
        INNER JOIN 
            ${this.schema}.campaign cmp 
            ON mh.parent_id = cmp.id
        WHERE 
            mh.recordtypename = 'campaign'
            AND cmp.id = $1
            AND ${statusCondition};
    `;

    try {
        const result = await sql.query(query, [campaignId, normalizedStatus]);
        return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
        console.error('Error fetching message history by status:', error);
        return {
            success: false,
            error: 'Database query failed'
        };
    }
}


//// campaign message history download
async function getMHRecordsByCampaignId(id) {
    const query = `
        SELECT 
            mh.id, 
            mh.name,
            mh.whatsapp_number AS number, 
            mh.status, 
            mh.delivery_status, 
            mh.err_message, 
            mh.message, 
            mh.parent_id,
            mh.message_id,
            COUNT(*) OVER () AS total_records,
           COUNT(CASE WHEN LOWER(mh.delivery_status) = 'failed' THEN 1 END) OVER () AS failed_count,
        (COUNT(*) OVER () - COUNT(CASE WHEN LOWER(mh.delivery_status) = 'failed' THEN 1 END) OVER ()) AS success_count

        FROM 
            ${this.schema}.message_history mh
        INNER JOIN 
            ${this.schema}.campaign cmp 
        ON  
            mh.parent_id = cmp.id
        WHERE 
            mh.recordtypename = 'campaign'
            AND cmp.id = $1
    `;

    try {
        const result = await sql.query(query, [id]);
        return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

async function getGroupHistoryRecords(id, business_number) {// temp.message AS templateMsg,

    const query = `
            SELECT 
                mh.*,
                mh.message AS chatMsg, 
                temp.id AS message_template_id,
                temp.template_name,
                temp.template_id,
                temp.language,
                temp.category, 
                temp.header,
                temp.header_body,
                temp.message_body,
                temp.example_body_text,
                temp.footer,
                temp.buttons,
                fl.id AS file_id,
                fl.title,
                fl.filetype,
                fl.description,
                par.body_text_params as body_text_params,
                par.file_id as params_file_id
            FROM 
                ${this.schema}.message_history mh
            LEFT JOIN 
                ${this.schema}.message_template temp  
            ON 
                mh.message_template_id = temp.template_id
            LEFT JOIN 
                ${this.schema}.file fl  
            ON CASE 
                WHEN mh.file_id::text ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                THEN mh.file_id::uuid 
                ELSE NULL 
                END = fl.id
            LEFT JOIN 
                ${this.schema}.campaign_template_params AS par ON mh.id = par.msg_history_id

            WHERE 
                mh.parent_id = $1 AND mh.business_number = $2
                AND (mh.status = 'Outgoing')
                AND mh.recordtypename = 'groups' Order by mh.createddate asc  `;

    try {
        const result = await sql.query(query, [id, business_number]);
        return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

async function deleteMsgHistory(whatsapp_number, business_number) {
    try {
        const result = await sql.query(
            `DELETE FROM  ${this.schema}.message_history WHERE whatsapp_number = $1 AND business_number = $2 RETURNING *`,
            [whatsapp_number, business_number]
        );
        return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

async function deleteMsgHistoryByIds(ids) {
    try {
        const placeholders = ids.map((_, index) => `$${index + 1}`).join(",");
        const query = `DELETE FROM ${this.schema}.message_history WHERE id IN (${placeholders}) RETURNING *`;

        const result = await sql.query(query, ids);

        return result.rowCount > 0 ? result.rows : null;
    } catch (error) {
        console.error("Error executing query:", error);
        throw new Error("Database query failed");
    }
}

async function getUserMessageCount(business_number) {
    try {
        const query = `SELECT COUNT(*) AS messageCount FROM ${this.schema}.message_history WHERE business_number = $1`;
        const result = await sql.query(query, [business_number]);

        return result.rows[0].messagecount || 0;
    } catch (error) {
        console.error("Error executing query:", error);
        throw new Error("Database query failed");
    }
}


module.exports = {
    getMessageHistoryRecords, getGroupHistoryRecords, createMessageHistoryRecord, getMHRecordsByCampaignId, updateMessageStatus, deleteMsgHistory, deleteMsgHistoryByIds, getUserMessageCount, getMsgByStatus, markMessageClicked, getMessageHistoryStatsByCampaignId,
    init
};