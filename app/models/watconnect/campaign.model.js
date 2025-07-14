/**
 * @author      Muskan Khan
 * @date        June,2025
 * @copyright   www.ibirdsservices.com
 */

const sql = require("../db");
let schema = '';

function init(schema_name) {
    this.schema = schema_name;
}


async function findById(id) {
    let query = `
        SELECT 
            c.id AS campaign_id,
            c.name AS campaign_name,
            c.template_name AS template_name,
            c.type AS campaign_type,
            c.status AS campaign_status,
            c.start_date AS start_date,
            c.recurrence,
            c.lead_ids,
            c.custom_recurrence_unit,
            c.selected_days,
            c.selected_date,
            c.recurrence_end_type,
            c.recurrence_end_date,
            c.createdbyid,
            c.createddate,
            c.business_number,
            par.body_text_params::json as body_text_params,
            par.body_text_params as body_text_params,
            par.file_id as params_file_id,
            pf.title AS params_file_title,
            par.whatsapp_number_admin as whatsapp_number_admin,
            COALESCE(string_agg(gp.name, ', ') FILTER (WHERE gp.id IS NOT NULL), '') AS group_name,
            json_agg(
                CASE 
                    WHEN gp.id IS NOT NULL THEN json_build_object('id', gp.id, 'name', gp.name)
                    ELSE NULL
                END
            ) FILTER (WHERE gp.id IS NOT NULL) AS groups, 
            f.id AS file_id,
            f.title AS file_title,
            f.filetype AS file_type,
            f.filesize AS file_size,
            f.description AS file_description,
            t.id AS template_id,
            t.category AS template_category
        FROM 
            ${this.schema}.campaign AS c
        LEFT JOIN LATERAL (
            SELECT unnest(c.group_ids::uuid[]) AS group_idsss
        ) AS unnested_groups ON true
        LEFT JOIN ${this.schema}.groups AS gp ON unnested_groups.group_idsss = gp.id
        LEFT JOIN ${this.schema}.file AS f ON c.id = f.parentid
        LEFT JOIN ${this.schema}.campaign_template_params AS par ON c.id = par.campaign_id
        LEFT JOIN ${this.schema}.message_template AS t ON t.template_name = c.template_name
        LEFT JOIN ${this.schema}.file AS pf ON pf.id = par.file_id
            WHERE c.id = $1
            GROUP BY c.id, c.name, c.template_name, c.type, c.status, c.start_date, 
                     c.createdbyid, f.id, f.title, f.filetype, f.filesize, f.description, 
                     par.body_text_params, par.whatsapp_number_admin, par.file_id, t.id, t.category, pf.title
        `;
    const result = await sql.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;

}





async function getRecords(userinfo, business_number) {
    const query = `
    WITH stats AS (
      SELECT 
        mh.parent_id AS campaign_id,
        COUNT(*) AS total,
        COUNT(CASE WHEN LOWER(mh.status::text) = 'outgoing' THEN 1 END) AS sent,
        COUNT(CASE WHEN LOWER(mh.delivery_status::text) IN ('delivered', 'read') THEN 1 END) AS delivered,
        COUNT(CASE WHEN LOWER(mh.delivery_status::text) = 'read' THEN 1 END) AS read,
        COUNT(CASE WHEN LOWER(mh.delivery_status::text) = 'failed' THEN 1 END) AS failed,
        COUNT(CASE WHEN mh.clicked = true THEN 1 END) AS clicked
      FROM ${this.schema}.message_history mh
      WHERE mh.recordtypename = 'campaign'
      GROUP BY mh.parent_id
    )
    SELECT 
      c.id AS campaign_id,
      c.name AS campaign_name,
      c.template_name,
      c.type AS campaign_type,
      c.status AS campaign_status,
      c.start_date,
      c.recurrence,
      c.lead_ids,
      c.custom_recurrence_unit,
      c.selected_days,
      c.selected_date,
      c.recurrence_end_type,
      c.recurrence_end_date,
      c.createdbyid,
      c.createddate,
      c.business_number,
      COALESCE(stats.total, 0) AS total,
      COALESCE(stats.sent, 0) AS sent,
      COALESCE(stats.failed, 0) AS failed,
      COALESCE(stats.delivered, 0) AS delivered,
      COALESCE(stats.read, 0) AS read,
      COALESCE(stats.clicked, 0) AS clicked,
      ROUND(COALESCE(stats.sent, 0)::numeric / NULLIF(COALESCE(stats.total, 0), 0) * 100, 2) AS sent_percentage,
      ROUND(COALESCE(stats.failed, 0)::numeric / NULLIF(COALESCE(stats.total, 0), 0) * 100, 2) AS failed_percentage,
      ROUND(COALESCE(stats.delivered, 0)::numeric / NULLIF(COALESCE(stats.total, 0), 0) * 100, 2) AS delivered_percentage,
      ROUND(COALESCE(stats.read, 0)::numeric / NULLIF(COALESCE(stats.total, 0), 0) * 100, 2) AS read_percentage,
      ROUND(COALESCE(stats.clicked, 0)::numeric / NULLIF(COALESCE(stats.total, 0), 0) * 100, 2) AS clicked_percentage,
      ROUND(
        CASE 
          WHEN COALESCE(stats.delivered, 0) = 0 THEN 0
          ELSE (COALESCE(stats.read, 0)::double precision / stats.delivered::double precision * 100)::numeric
        END,
      2) AS response_rate,
      json_agg(
        CASE
          WHEN gp.id IS NOT NULL THEN json_build_object('id', gp.id, 'name', gp.name)
          ELSE NULL
        END
      ) FILTER (WHERE gp.id IS NOT NULL) AS groups,
      f.id AS file_id,
      f.title AS file_title,
      f.filetype AS file_type,
      f.filesize AS file_size,
      f.description AS file_description
    FROM ${this.schema}.campaign c
    LEFT JOIN LATERAL (
      SELECT unnest(c.group_ids::uuid[]) AS group_id
    ) unnested_groups ON true
    LEFT JOIN ${this.schema}.groups gp ON unnested_groups.group_id = gp.id
    LEFT JOIN ${this.schema}.file f ON c.id = f.parentid
    LEFT JOIN stats ON stats.campaign_id = c.id
    JOIN ${this.schema}."user" cu ON cu.id = c.createdbyid
    JOIN ${this.schema}."user" mu ON mu.id = c.lastmodifiedbyid
    WHERE (c.createdbyid = $1 OR c.createdbyid IN (
        SELECT id FROM ${this.schema}."user" team WHERE managerid = $1
    )) AND c.business_number = $2
    GROUP BY 
      c.id, c.name, c.template_name, c.type, c.status, c.start_date, 
      c.recurrence, c.lead_ids, c.custom_recurrence_unit, c.selected_days,
      c.selected_date, c.recurrence_end_type, c.recurrence_end_date,
      c.createdbyid, c.createddate, c.business_number, 
      f.id, f.title, f.filetype, f.filesize, f.description,
      stats.total, stats.sent, stats.failed, stats.delivered, stats.read, stats.clicked
    ORDER BY c.start_date DESC
  `;

    const result = await sql.query(query, [userinfo.id, business_number]);
    return result.rows.length > 0 ? result.rows : null;
}



async function createRecord(reqBody, userid) {

    try {
        const { name, type, status, template_name, startDate, group_ids, lead_ids, recurrence, custom_recurrence_unit, selected_date, selected_days, recurrence_end_date, recurrence_end_type, business_number } = reqBody;

        const result = await sql.query(
            `INSERT INTO ${this.schema}.campaign 
            (name, type, status, template_name, start_date, group_ids, lead_ids, recurrence, custom_recurrence_unit, selected_date, selected_days, recurrence_end_date, recurrence_end_type, business_number, createdbyid, lastmodifiedbyid)  
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
            RETURNING *`,
            [
                name,
                type,
                status,
                template_name,
                startDate,
                group_ids,
                JSON.stringify(lead_ids),
                recurrence,
                custom_recurrence_unit,
                selected_date,
                selected_days,
                recurrence_end_date,
                recurrence_end_type,
                business_number,
                userid,
                userid
            ]
        );



        return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {

    }
}


async function updateById(id, campaignRecord, userid) {

    campaignRecord['lastmodifiedbyid'] = userid;

    const query = buildUpdateQuery(id, campaignRecord, this.schema);
    var colValues = Object.keys(campaignRecord).map(function (key) {
        return campaignRecord[key];
    });

    const result = await sql.query(query, colValues);
    return result.rowCount > 0 ? { "id": id, ...campaignRecord } : null;
};

function buildUpdateQuery(id, cols, schema) {
    var query = [`UPDATE ${schema}.campaign`];
    query.push('SET');

    var set = [];
    Object.keys(cols).forEach(function (key, i) {
        set.push(key + ' = ($' + (i + 1) + ')');
    });

    query.push(set.join(', '));
    query.push('WHERE id = \'' + id + '\'');
    return query.join(' ');
}

async function createparamsRecord(reqBody, userid) {
    try {
        const { campaign_id, body_text_params, msg_history_id, file_id, whatsapp_number_admin } = reqBody;
        const result = await sql.query(`INSERT INTO ${this.schema}.campaign_template_params(
     campaign_id, body_text_params, msg_history_id, file_id, whatsapp_number_admin)
    VALUES ($1, $2, $3, $4, $5)  RETURNING *`, [campaign_id, body_text_params, msg_history_id, file_id, whatsapp_number_admin]);

        return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {

    }
}
async function getparamsRecord(id) {
    try {
        const result = await sql.query(`SELECT id, campaign_id, body_text_params, msg_history_id, file_id, whatsapp_number_admin
    FROM ${this.schema}.campaign_template_params where campaign_id = $1 or msg_history_id =$1`, [id]);

        return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {

    }
}

async function deleteCampaign(campaignId) {
    try {
        const campaignQuery = `
            SELECT id FROM ${this.schema}.campaign WHERE id = $1;
        `;
        const campaignResult = await sql.query(campaignQuery, [campaignId]);

        if (campaignResult.rows.length === 0) {
            return { success: false, error: "Campaign not found" };
        }

        const fileQuery = `
            SELECT id FROM ${this.schema}.file WHERE parentid = $1;
        `;
        const fileResult = await sql.query(fileQuery, [campaignId]);

        const campaignTemplateParamsQuery = `
            SELECT id FROM ${this.schema}.campaign_template_params WHERE campaign_id = $1;
        `;
        const campaignTemplateParamsResult = await sql.query(campaignTemplateParamsQuery, [campaignId]);

        await sql.query('BEGIN');

        if (fileResult.rows.length > 0) {
            const deleteFilesQuery = `
                DELETE FROM ${this.schema}.file WHERE parentid = $1;
            `;
            await sql.query(deleteFilesQuery, [campaignId]);
        }

        if (campaignTemplateParamsResult.rows.length > 0) {
            const deleteCampaignTemplateParamsQuery = `
                DELETE FROM ${this.schema}.campaign_template_params WHERE campaign_id = $1;
            `;
            await sql.query(deleteCampaignTemplateParamsQuery, [campaignId]);
        }

        const deleteCampaignQuery = `
            DELETE FROM ${this.schema}.campaign WHERE id = $1;
        `;
        await sql.query(deleteCampaignQuery, [campaignId]);

        await sql.query('COMMIT');
        return { success: true, message: "Campaign deleted successfully" };
    } catch (err) {
        await sql.query('ROLLBACK');
        console.error("Error in deleting campaign:", err);
        return { success: false, message: err.message };
    }
}



module.exports = { findById, getRecords, createRecord, updateById, init, createparamsRecord, getparamsRecord, deleteCampaign };