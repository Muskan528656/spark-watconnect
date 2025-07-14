/**
 * @author      Muskan Khan
 * @date        June,2025
 * @copyright   www.ibirdsservices.com
 */
const moment = require('moment-timezone');
const sql = require("../db");
const { start } = require('init');
// const moment = require("moment-timezone");
// const fetch = require('node-fetch'); // Ensure you have installed node-fetch || npm install node-fetch@2

let schema = '';

async function init(schema_name) {

    this.schema = schema_name;
}

async function findById(id) {
    console.log("schema-",);
    let query = `SELECT * FROM ${this.schema}.whatsapp_setting `;
    const result = await sql.query(query + ` WHERE id = $1`, [id]);

    return result.rows.length > 0 ? result.rows[0] : null;
}
// ADded by shivani 19 
// async function getAllWhatsAppSetting(userinfo, environment = null) {
//     let query = `SELECT wh.* FROM ${this.schema}.whatsapp_setting wh `;
//     query += `INNER JOIN ${this.schema}.user cu ON cu.Id = wh.createdbyid `;
//     query += `INNER JOIN ${this.schema}.user mu ON mu.Id = wh.lastmodifiedbyid `;

//     const values = [];

//     let conditions = [];

//     if (userinfo.userrole === 'ADMIN') {
//         conditions.push(`(wh.createdbyid = $${values.length + 1} OR wh.createdbyid IN (SELECT id FROM ${this.schema}.user team WHERE managerid = $${values.length + 1}))`);
//         values.push(userinfo.id);
//     } else if (userinfo.userrole === 'USER') {
//         conditions.push(`wh.phone = ANY($${values.length + 1}::text[])`);
//         values.push(userinfo.whatsapp_settings);
//     }

//     if (environment) {
//         conditions.push(`wh.environment = $${values.length + 1}`);
//         values.push(environment);
//     }

//     if (conditions.length > 0) {
//         query += ` WHERE ` + conditions.join(' AND ');
//     }

//     const result = await sql.query(query, values);

//     return result.rows.length > 0 ? result.rows : null;
// };

async function getAllWhatsAppSetting(userinfo, environment = null) {
    let query = `SELECT * FROM ${this.schema}.whatsapp_setting `;


    const values = [];



    const result = await sql.query(query, values);

    return result.rows.length > 0 ? result.rows : null;
};

async function createRecord(reqBody, userid, company_id) {
    try {
        const {
            name,
            app_id,
            access_token,
            business_number_id,
            whatsapp_business_account_id,
            end_point_url,
            phone,
            environment = null
        } = reqBody;

        // Step 1: Insert into whatsapp_setting
        const result = await sql.query(
            `INSERT INTO ${this.schema}.whatsapp_setting 
            (name, app_id, access_token, business_number_id, whatsapp_business_account_id, end_point_url, phone, createdbyid, lastmodifiedbyid, environment) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
            RETURNING *`,
            [name, app_id, access_token, business_number_id, whatsapp_business_account_id, end_point_url, phone, userid, userid, environment]
        );

        if (result.rows.length > 0) {
            const insertedRecord = result.rows[0];

            // Step 2: Insert into tenant_whatsapp_setting
            const tenantResult = await sql.query(
                `INSERT INTO public.tenant_whatsapp_setting 
                (whatsapp_setting_id, tenantcode, phone, whatsapp_business_account_id, createdbyid, lastmodifiedbyid, environment) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [insertedRecord.id, this.schema, phone, whatsapp_business_account_id, userid, userid, environment]
            );

            if (tenantResult.rows.length > 0) {
                // ✅ Step 3: Only if environment is not null/empty
                if (environment) {
                    const endpoints = [
                        { name: 'Base Url', type: 'base_url' },
                        { name: 'Delivery Status', type: 'delivery_status' },
                        { name: 'Incoming Message', type: 'incoming_msg' },
                        { name: 'Campaign History', type: 'campaign_history' },
                        { name: 'Template Update', type: 'template_status_update' },
                    ];

                    for (const endpoint of endpoints) {
                        const check = await sql.query(
                            `SELECT 1 FROM external_endpoints WHERE company_id = $1 AND environment = $2 AND type = $3`,
                            [company_id, environment, endpoint.type]
                        );

                        if (check.rows.length === 0) {
                            await sql.query(
                                `INSERT INTO external_endpoints 
                                (company_id, environment, type, name, createdbyid, lastmodifiedbyid) 
                                VALUES ($1, $2, $3, $4, $5, $5)`,
                                [company_id, environment, endpoint.type, endpoint.name, userid]
                            );
                        }
                    }
                }

                return insertedRecord; // Return the main record
            } else {

                return null;
            }
        }

    } catch (error) {

    }
    return null;
}

async function updateById(id, wh_Record, userid) {

    wh_Record['lastmodifiedbyid'] = userid;

    const query = buildUpdateQuery(id, wh_Record, this.schema);

    var colValues = Object.keys(wh_Record).map(function (key) {
        return wh_Record[key];
    });

    const result = await sql.query(query, colValues);
    return result.rowCount > 0 ? { "id": id, ...wh_Record } : null;
};

function buildUpdateQuery(id, cols, schema) {
    var query = [`UPDATE ${schema}.whatsapp_setting`];
    query.push('SET');

    var set = [];
    Object.keys(cols).forEach(function (key, i) {
        set.push(key + ' = ($' + (i + 1) + ')');
    });

    query.push(set.join(', '));
    query.push('WHERE id = \'' + id + '\'');
    return query.join(' ');
}


async function updateSettingStatus(settingid, userid) {
    try {

        await sql.query(
            `UPDATE ${this.schema}.whatsapp_setting 
             SET status = 'false' 
             WHERE lastmodifiedbyid = $1`,
            [userid]
        );

        const result = await sql.query(
            `UPDATE ${this.schema}.whatsapp_setting 
             SET status = 'true', lastmodifiedbyid = $2 
             WHERE id = $1`,
            [settingid, userid]
        );

        return { rowCount: result.rowCount };
    } catch (error) {
        throw new Error('Database query failed');
    }
}


async function getWhatsAppSettingData(whatsappNumber) {
    let query = `
        SELECT wh.* 
        FROM ibs_ibirds.whatsapp_setting wh
        WHERE wh.phone = $1 LIMIT 1
    `;

    const result = await sql.query(query, [whatsappNumber]);
    //  
    return result.rows.length > 0 ? result.rows[0] : null;
};

async function getTenantCodeByPhoneNumber(WABA_ID) {

    let query = `
        SELECT wh.* 
        FROM public.tenant_whatsapp_setting wh
        WHERE wh.whatsapp_business_account_id = $1 LIMIT 1
    `;

    const result = await sql.query(query, [WABA_ID]);
    return result.rows.length > 0 ? result.rows[0] : null;
};

async function getCount() {

    let query = `SELECT COUNT(*) FROM ${this.schema}.whatsapp_setting`;

    // Execute the query and get the result
    const result = await sql.query(query);

    // Return the count of records
    return parseInt(result.rows[0].count);
}


async function getPlatformData(tenantcode) {
    let query = `
        SELECT is_external, id , tenantcode
        FROM public.company 
        WHERE tenantcode = $1 AND is_external = true
        LIMIT 1
    `;

    const result = await sql.query(query, [tenantcode]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

async function getExternalApi(companyId, environment) {
    const query = `
        SELECT id, company_id, environment, type, value, createdbyid, lastmodifiedbyid
        FROM public.external_endpoints
        WHERE company_id = $1 AND environment = $2
    `;

    const result = await sql.query(query, [companyId, environment]);
    return result.rows.length > 0 ? result.rows : null;
}



async function getWhatsAppSettingRecord(schemaName, phoneNumber) {


    const name = schemaName;
    try {
        await init(name);
        const tokenAccess = await getWhatsAppSettingData(phoneNumber);

        return tokenAccess;
    } catch (error) {
        console.error('Error getting WhatsApp settings:', error.message);
        throw error;
    }
}


async function getWhatsupBillingCost(phoneNumber, startDate = null, endDate = null) {

    var sDate = '';
    var eDate = '';

    if (!(startDate && endDate)) {
        let firstdate = moment().tz("Asia/Kolkata").startOf('month');
        const lastdate = moment().tz("Asia/Kolkata").endOf('month');
        sDate = firstdate.unix();
        eDate = lastdate.unix();
    } else {
        sDate = startDate;
        eDate = endDate;
    }

    const { access_token, end_point_url, whatsapp_business_account_id } = await getWhatsAppSettingRecord(this.schema, phoneNumber);
    // const url = `${end_point_url}${whatsapp_business_account_id}/message_templates`;



    const url = `${end_point_url}${whatsapp_business_account_id}?fields=conversation_analytics.start(${sDate}).end(${eDate}).granularity(DAILY).phone_numbers([]).dimensions(["CONVERSATION_CATEGORY","CONVERSATION_TYPE","COUNTRY","PHONE"])&access_token=${access_token}`


    try {
        let response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;

            try {
                errorJson = JSON.parse(errorText);
            } catch (parseError) {
                errorJson = { message: "Unable to parse error response", raw: errorText };
            }
            // throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
            return {
                error: {
                    message: errorJson?.error?.message || "Unknown error",
                    title: errorJson?.error?.error_user_title || "No title",
                    body: errorJson?.error?.error_user_msg || "No body",
                }

            };
        }

        return await response.json();

    } catch (error) {
        console.error('Error during message sending:', error);
        return {
            error: {
                message: error.message || "An unexpected error occurred",
            }
        };
    }
}

async function getTemplateBillingCost(template_id, phoneNumber, startDate = null, endDate = null) {




    let sDate = '';
    let eDate = '';
    // 90 days limit ke liye timestamps nikalna
    const currentTime = moment().tz("Asia/Kolkata").unix(); // Current timestamp
    const ninetyDaysAgo = currentTime - (90 * 24 * 60 * 60); // 90 days ago

    if (!(startDate && endDate)) {

        let firstdate = moment().tz("Asia/Kolkata").startOf('month').unix();
        let lastdate = moment().tz("Asia/Kolkata").endOf('month').unix();

        // 90 days ka validation
        sDate = Math.max(firstdate, ninetyDaysAgo);
        eDate = Math.min(lastdate, currentTime);
    } else {

        sDate = Math.max(startDate, ninetyDaysAgo);
        eDate = Math.min(endDate, currentTime);
    }


    const { access_token: access_token, end_point_url, whatsapp_business_account_id } =
        await getWhatsAppSettingRecord(this.schema, phoneNumber);


    // const baseUrl = `${end_point_url}${whatsapp_business_account_id}/template_analytics?start=${sDate}&end=${eDate}&granularity=daily&metric_types=cost,clicked,delivered,read,sent&template_ids=${template_id}&access_token=${access_token}`;

    if (!template_id) {
        console.error("❌ Error: template_id is missing or null");
        return;
    }

    const baseUrl = `${end_point_url}${whatsapp_business_account_id}/template_analytics?start=${sDate}&end=${eDate}&granularity=daily&metric_types=cost,clicked,delivered,read,sent&template_ids=${template_id}&access_token=${access_token}`;



    let combinedData = [];

    // Recursive function to handle pagination
    const fetchData = async (url) => {
        try {

            let response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${access_token}`,
                },
            });


            if (!response.ok) {
                const errorText = await response.text();
                let errorJson;

                try {
                    errorJson = JSON.parse(errorText);
                } catch (parseError) {
                    errorJson = { message: "Unable to parse error response", raw: errorText };
                }

                throw new Error(errorJson?.error?.message || "Unknown error");
            }

            const result = await response.json();

            // Combine new data
            if (result.data) {
                combinedData = [...combinedData, ...result.data];
            }

            // Recursive call if next page exists
            if (result.paging?.next) {
                await fetchData(result.paging.next);
            }

        } catch (error) {
            console.error('Error during fetching data:', error);
            throw error;
        }
    };

    try {
        await fetchData(baseUrl);


        return {
            success: true,
            data: combinedData
        };

    } catch (error) {
        console.error("Error during fetching template data:", error);
        return {
            error: {
                message: error.message || "An unexpected error occurred",
            },
        };
    }
}

async function findBytenant() {
    let query = `SELECT * FROM ${this.schema}.whatsapp_setting `;
    const result = await sql.query(query);

    return result.rows.length > 0 ? result.rows : null;
}

async function deleteByPhone(phone) {
    const client = await sql.connect(); // Get a single client for the transaction

    try {
        await client.query('BEGIN');

        const deleteFromSetting = await client.query(
            `DELETE FROM ${this.schema}.whatsapp_setting WHERE phone = $1 RETURNING id`,
            [phone]
        );

        const deleteFromTenant = await client.query(
            `DELETE FROM public.tenant_whatsapp_setting WHERE phone = $1 RETURNING id`,
            [phone]
        );

        await client.query('COMMIT');
        return { success: true, message: "Deleted successfully" };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Rollback due to error:', error.message);
        return { success: false, message: error.message };
    } finally {
        client.release();
    }
}


module.exports = { getAllWhatsAppSetting, getWhatsAppSettingData, createRecord, updateById, findById, updateSettingStatus, getTenantCodeByPhoneNumber, getCount, getPlatformData, getExternalApi, getWhatsupBillingCost, getTemplateBillingCost, findBytenant, deleteByPhone, init };