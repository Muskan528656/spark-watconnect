/**
 * @author      Shivani Mehra
 * @date        May, 2024
 * @copyright   www.ibirdsservices.com
 */

const sql = require("../db.js");

let schema = '';
function init(schema_name) {
    this.schema = schema_name;
}
async function getAllTags(status) {
    console.log("worii");
    try {
        if (typeof status === "string") {
            status = status.toLowerCase() === "true";
        }

        let query = `
            SELECT 
                t.*, 
                CASE 
                    WHEN COUNT(r.id) > 0 THEN json_agg(
                        json_build_object(
                            'id', r.id,
                            'tag_id', r.tag_id,
                            'keyword', r.keyword,
                            'match_type', r.match_type
                        )
                    ) 
                    ELSE '[]'::json 
                END as auto_tag_rules
            FROM ${this.schema}.tags t
            LEFT JOIN ${this.schema}.auto_tag_rules r ON t.id = r.tag_id
        `;

        const params = [];

        if (status === true || status === false) {
            query += ` WHERE t.status = $1`;
            params.push(status);
        }

        query += `
            GROUP BY t.id, t.name, t.status, t.createdbyid, t.lastmodifiedbyid, t.createddate, t.lastmodifieddate
            ORDER BY t.createddate DESC
        `;

        const result = await sql.query(query, params);
        console.log("Result GEt All Tag->>", result);
        return result.rows;
    } catch (err) {
        console.error("Error in getAllTags:", err);
        throw err;
    }
}


// Get a tag by ID with rules
async function getTagByIdWithRules(id) {
    const tagQuery = `SELECT * FROM ${this.schema}.tags WHERE id = $1`;
    const tagResult = await sql.query(tagQuery, [id]);

    if (tagResult.rows.length === 0) return null;

    const tag = tagResult.rows[0];

    const rulesQuery = `
        SELECT id, tag_id, keyword, match_type 
        FROM ${this.schema}.auto_tag_rules 
        WHERE tag_id = $1
    `;
    const rulesResult = await sql.query(rulesQuery, [id]);

    tag.auto_tag_rules = rulesResult.rows.length > 0 ? rulesResult.rows : [];
    return tag;
}

// Create tag with optional rules
async function createRecordWithRules(reqBody, userId) {
    let response = { success: false, message: "Unknown error" };

    try {
        await sql.query('BEGIN');

        const tagResult = await sql.query(
            `INSERT INTO ${this.schema}.tags 
                (name, status, first_message, createdbyid, lastmodifiedbyid) 
             VALUES ($1, $2, $3, $4, $4) 
             RETURNING *`,
            [reqBody.name, reqBody.status, reqBody.first_message || 'No', userId]
        );

        if (tagResult.rows.length === 0) {
            response.message = "Tag insertion failed";
            await sql.query("ROLLBACK");
            return response;
        }

        const tag = tagResult.rows[0];

        // Only add rules if first_message is Yes
        if (reqBody.first_message === 'Yes' && Array.isArray(reqBody.auto_tag_rules) && reqBody.auto_tag_rules.length > 0) {
            for (let rule of reqBody.auto_tag_rules) {
                await sql.query(
                    `INSERT INTO ${this.schema}.auto_tag_rules (tag_id, keyword, match_type) VALUES ($1, $2, $3)`,
                    [tag.id, rule.keyword, rule.match_type]
                );
            }
        }

        await sql.query("COMMIT");

        // Get the rules for the response
        const rulesRes = await sql.query(
            `SELECT id, tag_id, keyword, match_type FROM ${this.schema}.auto_tag_rules WHERE tag_id = $1`,
            [tag.id]
        );
        tag.auto_tag_rules = rulesRes.rows;

        return { success: true, data: tag };

    } catch (err) {
        await sql.query("ROLLBACK");
        console.error("Transaction error:", err);
        return { success: false, message: "Transaction failed during tag or rule insertion" };
    }
}


// Update tag and optionally its rules
async function updateTagWithRules(id, reqBody) {
    try {
        await sql.query("BEGIN");

        const tagUpdateResult = await sql.query(
            `UPDATE ${this.schema}.tags 
             SET name = $1, status = $2, first_message = $3 
             WHERE id = $4 RETURNING *`,
            [reqBody.name, reqBody.status, reqBody.first_message || 'No', id]
        );

        if (tagUpdateResult.rows.length === 0) throw new Error("Tag not found");
        const tag = tagUpdateResult.rows[0];

        // Always delete existing rules
        await sql.query(`DELETE FROM ${this.schema}.auto_tag_rules WHERE tag_id = $1`, [id]);

        // Only add rules if first_message is Yes
        if (reqBody.first_message === 'Yes' && Array.isArray(reqBody.auto_tag_rules) && reqBody.auto_tag_rules.length > 0) {
            for (let rule of reqBody.auto_tag_rules) {
                await sql.query(
                    `INSERT INTO ${this.schema}.auto_tag_rules (tag_id, keyword, match_type) VALUES ($1, $2, $3)`,
                    [id, rule.keyword, rule.match_type]
                );
            }
        }

        await sql.query("COMMIT");

        const rulesRes = await sql.query(
            `SELECT id, tag_id, keyword, match_type FROM ${this.schema}.auto_tag_rules WHERE tag_id = $1`,
            [id]
        );
        tag.auto_tag_rules = rulesRes.rows;

        return tag;
    } catch (err) {
        await sql.query("ROLLBACK");
        console.error("Update transaction failed:", err);
        return null;
    }
}

// Update only the tag status
async function updateTagStatus(id, status) {
    try {
        const result = await sql.query(
            `UPDATE ${this.schema}.tags SET status = $1 WHERE id = $2 RETURNING *`,
            [status, id]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
        console.error("Error updating tag status:", err);
        return null;
    }
}

// Check if a tag name already exists (optionally excluding a given ID)
async function checkDuplicateRecord(name, id = null) {
    let query = `SELECT * FROM ${this.schema}.tags WHERE LOWER(name) = LOWER($1)`;
    const params = [name];

    if (id) {
        query += " AND id != $2";
        params.push(id);
    }

    const result = await sql.query(query, params);
    if (result.rows.length > 0) {
        return result.rows[0];
    }

    return null;

}

async function autoTagLeadOnMessage(messageText, leadId) {
    try {
        console.log("Starting auto-tag for lead:", leadId, "Message:", messageText);

        // Step 1: Get all active tag rules where first_message = 'Yes'
        const ruleQuery = `
            SELECT r.tag_id, r.keyword, r.match_type, t.name
            FROM ${this.schema}.auto_tag_rules r
            JOIN ${this.schema}.tags t ON t.id = r.tag_id
            WHERE t.status = true AND t.first_message = 'Yes'
        `;
        const ruleResult = await sql.query(ruleQuery);
        const rules = ruleResult.rows;

        if (rules.length === 0) {
            console.log("No auto-tag rules found.");
            return;
        }

        // Step 2: Get lead data (existing tags + createddate)
        const leadQuery = `SELECT tag_names, createddate FROM ${this.schema}.lead WHERE id = $1`;
        const leadRes = await sql.query(leadQuery, [leadId]);
        if (leadRes.rows.length === 0) {
            console.log("Lead not found.");
            return;
        }

        const existingTags = leadRes.rows[0].tag_names || [];
        const createddate = leadRes.rows[0].createddate;

        // Normalize input
        const text = (messageText || '').toLowerCase();
        const matchedTags = [];

        // Step 3: Match rules
        for (const rule of rules) {
            const keyword = (rule.keyword || '').toLowerCase();
            const matchType = rule.match_type;
            let match = false;

            switch (matchType) {
                case 'contains':
                    match = text.includes(keyword);
                    break;
                case 'exact':
                    match = text === keyword;
                    break;
                case 'starts_with':
                    match = text.startsWith(keyword);
                    break;
                case 'ends_with':
                    match = text.endsWith(keyword);
                    break;
                case 'createddate':
                    if (createddate && keyword) {
                        const leadDate = new Date(createddate).toISOString().slice(0, 10); // "YYYY-MM-DD"
                        console.log(`Checking createddate match: Lead = ${leadDate}, Rule = ${keyword}`);
                        match = leadDate === keyword;
                    }
                    break;
            }

            if (match) {
                console.log("Matched rule:", rule.name);
                matchedTags.push({ id: rule.tag_id, name: rule.name });
            }
        }

        if (matchedTags.length === 0) {
            console.log("No matching tags found.");
            return;
        }

        // Step 4: Deduplicate and merge with existing tags
        const tagMap = new Map(existingTags.map(tag => [tag.id, tag]));
        for (const tag of matchedTags) {
            tagMap.set(tag.id, tag);
        }

        const updatedTags = Array.from(tagMap.values());

        // Step 5: Update tag_names in lead
        const updateQuery = `UPDATE ${this.schema}.lead SET tag_names = $1 WHERE id = $2`;
        await sql.query(updateQuery, [JSON.stringify(updatedTags), leadId]);

        console.log(`✅ Auto-tags applied to lead ${leadId}:`, updatedTags);

    } catch (err) {
        console.error("❌ Error in autoTagLeadOnMessage:", err);
    }
}



module.exports = {
    init,
    getAllTags,
    getTagByIdWithRules,
    createRecordWithRules,
    updateTagWithRules,
    updateTagStatus,
    checkDuplicateRecord,
    autoTagLeadOnMessage
};
