const sql = require("../db");

let schema = '';
function init(schema_name) {
    this.schema = schema_name;
}

async function getRecords(recordType, textName, userinfo) {
    let query = '';
    let conditions = [];
    let params = [];
    let paramIndex = 1;

    switch (recordType) {
        case 'lead':
            // Base query
            query = `SELECT id, CONCAT(firstname, ' ', lastname) AS contactname, whatsapp_number, country_code, lastmodifiedbyid, CONCAT(country_code, whatsapp_number) AS full_number
             FROM ${this.schema}.lead 
             WHERE whatsapp_number IS NOT NULL 
             AND blocked = false 
             AND whatsapp_number != ''`;

            // Conditions array
            conditions = [];

            // User role-based filtering
            if (userinfo && userinfo.id && userinfo.userrole === "USER") {
                conditions.push(`(lastmodifiedbyid = $${paramIndex} OR ownerid = $${paramIndex})`);
                params.push(userinfo.id);
                paramIndex++;
            }

            // Name filter
            if (textName) {
                conditions.push(`(LOWER(firstname) LIKE LOWER($${paramIndex}) OR LOWER(lastname) LIKE LOWER($${paramIndex}))`);
                params.push(`%${textName}%`);
                paramIndex++;
            }

            // If there are additional conditions, append them to the query
            if (conditions.length > 0) {
                query += ` AND ` + conditions.join(' AND ');
            }

            break;

        case 'user':
            query = `SELECT id, concat(firstname, ' ' , lastname) AS contactname, country_code,whatsapp_number, managerid, CONCAT(country_code, whatsapp_number) AS full_number
                     FROM public.user 
                     WHERE whatsapp_number IS NOT NULL 
                     AND blocked = false 
                     AND whatsapp_number != '' `;

            if (userinfo && userinfo.id && userinfo.userrole === "USER") {
                conditions.push(`(managerid = $${paramIndex} OR id = $${paramIndex})`);
                params.push(userinfo.id);
                paramIndex++;
            }

            if (textName) {
                conditions.push(`(LOWER(firstname) LIKE LOWER($${paramIndex}) OR LOWER(lastname) LIKE LOWER($${paramIndex}))`);
                params.push(`%${textName}%`);
                paramIndex++;
            }

            break;

        case 'groups':
            query = `SELECT id, name AS contactname, lastmodifiedbyid
                     FROM ${this.schema}.groups 
                     WHERE status = true `;

            if (userinfo && userinfo.id && userinfo.userrole === "USER") {
                conditions.push(`(lastmodifiedbyid = $${paramIndex})`);
                params.push(userinfo.id);
                paramIndex++;
            }

            if (textName) {
                conditions.push(`LOWER(name) LIKE LOWER($${paramIndex})`);
                params.push(`%${textName}%`);
                paramIndex++;
            }

            break;

        case 'recentlyMessage':
            query = `
                SELECT 
                    mh.id, 
                    mh.parent_id,
                    mh.name AS contactname,
                    mh.whatsapp_number,  
                    mh.whatsapp_number AS full_number,
                    mh.createddate,
                    CASE 
                        WHEN f.title IS NOT NULL THEN CONCAT(f.title)
                        WHEN mh.message IS NOT NULL AND TRIM(mh.message) != '' THEN mh.message
                        ELSE mt.message_body
                    END AS message,
                    mt.example_body_text::json AS example_body_text,
                    CASE 
                        WHEN mh.file_id IS NOT NULL THEN true 
                        ELSE false 
                    END AS has_file
                FROM ${this.schema}.message_history mh
                LEFT JOIN ${this.schema}.message_template mt ON mh.message_template_id = mt.template_id
                LEFT JOIN ${this.schema}.file f ON mh.file_id = f.id
                INNER JOIN (
                    SELECT whatsapp_number, MAX(createddate) AS recent_createddate
                    FROM ${this.schema}.message_history
                    WHERE recordtypename NOT IN ('campaign', 'groups')
                    GROUP BY whatsapp_number
                ) recent_msgs 
                ON mh.whatsapp_number = recent_msgs.whatsapp_number 
                AND mh.createddate = recent_msgs.recent_createddate
                WHERE mh.whatsapp_number IS NOT NULL 
                AND mh.whatsapp_number != '' 
            `;

            if (userinfo && userinfo.id && userinfo.userrole === "USER") {
                conditions.push(`(mh.lastmodifiedbyid = $${paramIndex})`);
                params.push(userinfo.id);
                paramIndex++;
            }

            if (textName) {
                conditions.push(`LOWER(mh.name) LIKE LOWER($${paramIndex})`);
                params.push(`%${textName}%`);
                paramIndex++;
            }

            break;

        default:
            return [];
    }

    if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
    }

    if (recordType === 'recentlyMessage') {
        query += ` ORDER BY recent_msgs.recent_createddate DESC LIMIT 10`;
    } else if (recordType !== 'user') {
        query += ` ORDER BY lastmodifieddate DESC LIMIT 100`;
    }





    try {
        const result = await sql.query(query, params);

        return result.rows;
    } catch (error) {
        console.error('Error fetching records:', error);
        throw error;
    }
}



async function getUnreadMsgCounts(userid, business_number) {
    let query = ` SELECT parent_id, name, whatsapp_number, COUNT(id) AS unread_msg_count FROM ${this.schema}.message_history
            WHERE is_read = false  AND status = 'Incoming' AND createdbyid = $1 AND business_number = $2
            GROUP BY parent_id, name, whatsapp_number 
        `;

    try {
        const result = await sql.query(query, [userid, business_number]);
        return result.rows.length > 0 ? result.rows : null;

    } catch (error) {

        throw error;
    }
};

async function markAsRead(whatsapp_number, userid, business_number) {
    let query = `
       UPDATE ${this.schema}.message_history
        SET is_read = true, lastmodifiedbyid = $2
        WHERE whatsapp_number = $1  AND status = 'Incoming' AND is_read = false  AND createdbyid =  $2 AND business_number =$3
    `;

    try {
        const result = await sql.query(query, [whatsapp_number, userid, business_number]);
        return result.rowCount > 0;
    } catch (error) {

        throw error;
    }
}

module.exports = {
    getRecords,
    getUnreadMsgCounts, markAsRead,
    init
};
