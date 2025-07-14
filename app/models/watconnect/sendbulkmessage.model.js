/**
 * @author      Muskan Khan
 * @date        June,2025
 * @copyright   www.ibirdsservices.com
 */

const sql = require("../db");
const { execute } = require('@getvim/execute');
const dbConfig = require("../../config/db.config.js");
const fs = require('fs');
// const msgHistory = require("../models/messagehistory.model.js");
const wh_Setting = require("../../models/watconnect/whatsappsetting.model.js");
const campaignModel = require("../../models/watconnect/campaign.model.js")
const webTemplateModel = require("../../models/watconnect/webhooktemplate.model.js");
// const fileModel = require("../models/file.model.js");
const FormData = require('form-data');
// const fetch = require('node-fetch');

let schema = '';
// const XLSX = require('xlsx');
const path = require('path');
const { json } = require("body-parser");

function init(schema_name) {
  this.schema = schema_name;
}

const CAMPAIGN_STATUS_IN_PROGRESS = 'In Progress';
const CAMPAIGN_STATUS_PENDING = 'Pending';
const CAMPAIGN_STATUS_COMPLETED = 'Completed';
async function duplicateCampaignWithNextRun(campaign, nextRunDate, tenants) {
  try {


    const leadIdsJson = JSON.stringify(campaign.lead_ids || []);
    const groupIdsArray = Array.isArray(campaign.group_ids) ? campaign.group_ids : {};


    const insertCampaignQuery = `
      INSERT INTO ${tenants}.campaign 
      (name, type, template_name,  business_number, createdbyid, lastmodifiedbyid, start_date, recurrence, custom_recurrence_unit, recurrence_end_type, recurrence_end_date, selected_days, selected_date, lead_ids, group_ids, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, '${CAMPAIGN_STATUS_PENDING}')
      RETURNING id
    `;

    const campaignInsertResult = await sql.query(insertCampaignQuery, [
      `${campaign.name} - ${new Date(nextRunDate).toLocaleDateString('en-GB')}`,
      campaign.type,
      campaign.template_name,
      campaign.business_number,
      campaign.createdbyid,
      campaign.lastmodifiedbyid,
      nextRunDate,
      campaign.recurrence,
      campaign.custom_recurrence_unit,
      campaign.recurrence_end_type,
      campaign.recurrence_end_date,
      campaign.selected_days,
      campaign.selected_date,
      leadIdsJson,
      groupIdsArray
    ]);

    const newCampaignId = campaignInsertResult.rows[0].id;

    // Step 2: Insert into campaign_template_params only if any param exists
    const hasTemplateParams = campaign.body_text_params || campaign.params_file_id || campaign.whatsapp_number_admin;
    if (hasTemplateParams) {
      const insertParamsQuery = `
        INSERT INTO ${tenants}.campaign_template_params
        (campaign_id, body_text_params, file_id, whatsapp_number_admin)
        VALUES ($1, $2, $3, $4)
      `;
      await sql.query(insertParamsQuery, [
        newCampaignId,
        campaign.body_text_params || null,
        campaign.params_file_id || null,
        campaign.whatsapp_number_admin || null
      ]);
    }

    // Step 3: Insert into file table only if file data exists
    const hasFileData = campaign.file_title && campaign.filetype;
    if (hasFileData) {
      const insertFileQuery = `
        INSERT INTO ${tenants}.file
        (title, filetype, filesize, createdbyid, description, parentid, lastmodifiedbyid)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      await sql.query(insertFileQuery, [
        campaign.file_title,
        campaign.filetype,
        campaign.filesize || null,
        campaign.createdbyid,
        campaign.file_description || null,
        newCampaignId,
        campaign.lastmodifiedbyid
      ]);
    }


  } catch (error) {
    console.error('Error duplicating campaign with next run:', error);
    throw error;
  }
}



async function updateCampaignRecord(tenants) {
  // console.log("tenantstenants=>", tenants);
  try {
    const query = ` SELECT cg.*  FROM ${tenants}.campaign cg
                        INNER JOIN ${tenants}.user cu ON cu.id = cg.createdbyid
                        INNER JOIN ${tenants}.user mu ON mu.id = cg.lastmodifiedbyid
                        WHERE cg.status = '${CAMPAIGN_STATUS_PENDING}'
                        AND DATE(cg.start_date) = CURRENT_DATE
                AND cg.start_date <= CURRENT_TIMESTAMP
                        LIMIT 1 `;

    const result = await sql.query(query);
    // console.log("Result->", result);
    if (result.rows.length > 0) {
      const { id, createdbyid } = result.rows[0];

      await updateCampaignStatus(id, CAMPAIGN_STATUS_IN_PROGRESS, createdbyid, tenants);

      // return 'Updated record successfully.';
      return { message: 'Updated record successfully.', campaign_id: id };
    } else {
      return 'No records found for the given criteria.';
    }
  } catch (error) {
    console.error('Error in update campaign records:', error);
    return 'An error occurred while processing the request.';
  }
}


async function sendBulkMessage(tenants, campid) {
  try {
    const campaignData = await fetchActiveCampaign(tenants, campid);
    if (!campaignData) return 'Record does not exist.';

    let groupResultData = [];
    let leadResultData = [];
    let fileResultData = [];

    const countryList = [
      "971", "93", "355", "374", "244", "54", "43", "61", "994", "880", "32",
      "226", "359", "973", "257", "229", "673", "591", "55", "267", "375", "1",
      "242", "41", "225", "56", "237", "86", "57", "506", "420", "49", "45",
      "213", "593", "372", "20", "291", "34", "251", "358", "33", "241",
      "44", "995", "594", "233", "220", "30", "502", "245", "852", "504",
      "385", "509", "36", "62", "353", "972", "91", "964", "39", "962",
      "81", "254", "855", "82", "965", "856", "961", "94", "231", "266",
      "370", "352", "371", "218", "212", "377", "373", "261", "389", "223",
      "95", "976", "222", "356", "265", "52", "60", "258", "264", "227",
      "234", "505", "31", "47", "977", "64", "968", "507", "51", "675",
      "63", "92", "48", "351", "595", "974", "40", "381", "7", "250",
      "966", "249", "46", "65", "386", "421", "232", "221", "252", "211",
      "503", "268", "235", "228", "66", "992", "993", "216", "886", "255",
      "380", "256", "598", "998", "58", "84", "967", "27", "26"
    ];
    if (campaignData.lead_ids && Array.isArray(campaignData.lead_ids)) {
      leadResultData = campaignData.lead_ids.map(lead => {
        const fullNumber = lead.whatsapp_number.startsWith('+')
          ? lead.whatsapp_number.slice(1)
          : lead.whatsapp_number;

        const countryCode = countryList.find(code => fullNumber.startsWith(code)) || '';
        const numberWithoutCode = fullNumber.slice(countryCode.length);

        return {
          Name: lead.name,
          Number: numberWithoutCode,
          CountryCode: countryCode ? `+${countryCode}` : ''
        };
      });
    }
    if (campaignData.group_ids && campaignData.group_ids !== '{}') {
      groupResultData = await fetchGroupMembers(campaignData.group_ids, tenants);
    }


    if (campaignData.file_title) {
      const filePath = path.join(process.env.FILE_UPLOAD_PATH, tenants, 'campaign_files', campaignData.file_title);
      if (!fs.existsSync(filePath)) {
        console.error('File does not exist:', filePath);
        return 'File does not exist.';
      }

      fileResultData = await readXlsmFile(filePath);
    }



    const combinedData = [
      ...leadResultData,
      ...groupResultData,
      ...fileResultData
    ];

    // const arrayMerge = data && data.length > 0 ? data.concat(groupResultData) : groupResultData;
    // const uniqueNumbersSet = new Set();

    // const uniqueArray = arrayMerge.filter(item => {
    //   if (uniqueNumbersSet.has(item.Number)) {
    //     return false;
    //   }
    //   uniqueNumbersSet.add(item.Number);
    //   return true;
    // });

    const uniqueNumbersSet = new Set();
    const uniqueArray = combinedData.filter(item => {
      if (!item.Number) return false;
      if (uniqueNumbersSet.has(item.Number)) return false;
      uniqueNumbersSet.add(item.Number);
      return true;
    });


    if (uniqueArray.length > 0) {
      const sendResult = await sendTemplateMessage(uniqueArray, campaignData, tenants);
      if (sendResult === 'Success') {
        await updateCampaignStatus(campaignData.campaign_id, CAMPAIGN_STATUS_COMPLETED, campaignData.createdbyid, tenants);
        const { campaign_id, recurrence, custom_recurrence_unit, recurrence_end_date, recurrence_end_type, selected_days, selected_date, createdbyid } = campaignData;

        if (recurrence && recurrence !== '') {

          const toDateOnly = date => new Date(date).toLocaleDateString('en-CA'); // Format: YYYY-MM-DD

          const campaignStartDate = toDateOnly(campaignData.start_date);
          const endDate = recurrence_end_date ? toDateOnly(recurrence_end_date) : null;


          const shouldDuplicate =
            recurrence_end_type !== 'on' ||
            (endDate && endDate !== campaignStartDate);

          if (shouldDuplicate) {
            let nextRunDate = new Date(campaignData.start_date);

            if (recurrence === 'daily') {
              nextRunDate.setDate(nextRunDate.getDate() + 1);
            }

            else if (recurrence === 'weekly') {
              nextRunDate.setDate(nextRunDate.getDate() + 7);
            }
            else if (recurrence === 'monthly') {
              nextRunDate.setMonth(nextRunDate.getMonth() + 1);
            }
            else if (recurrence === 'fourthmonthly') {
              const targetDay = nextRunDate.getDay();

              nextRunDate.setMonth(nextRunDate.getMonth() + 1, 1);

              let count = 0;
              while (nextRunDate.getMonth() === (new Date(campaignData.start_date)).getMonth() + 1 ||
                (new Date(campaignData.start_date)).getMonth() === 11 && nextRunDate.getMonth() === 0) {
                if (nextRunDate.getDay() === targetDay) {
                  count++;
                  if (count === 4) break;
                }
                nextRunDate.setDate(nextRunDate.getDate() + 1);
              }
            }
            else if (recurrence === 'custom') {
              let selectedDaysArray = [];

              if (typeof selected_days === 'string') {
                try {
                  selectedDaysArray = JSON.parse(selected_days.replace(/{/g, '[').replace(/}/g, ']'));
                } catch (error) {
                  console.error('Error parsing selected_days:', error);
                }
              } else if (Array.isArray(selected_days)) {
                selectedDaysArray = selected_days;
              }

              if (selectedDaysArray && selectedDaysArray.length > 0) {
                const currentDay = nextRunDate.getDay();
                const dayMap = {
                  Sunday: 0,
                  Monday: 1,
                  Tuesday: 2,
                  Wednesday: 3,
                  Thursday: 4,
                  Friday: 5,
                  Saturday: 6
                };

                const selectedDayNumbers = selectedDaysArray
                  .map(day => dayMap[day])
                  .filter(num => num !== undefined);

                if (selectedDayNumbers.length > 0) {
                  const daysDiff = selectedDayNumbers
                    .map(dayNum => {
                      const diff = dayNum - currentDay;
                      return diff > 0 ? diff : diff + 7;
                    });

                  const minDiff = Math.min(...daysDiff);
                  nextRunDate.setDate(nextRunDate.getDate() + minDiff);
                }
              }
              else if (selected_date) {
                nextRunDate.setMonth(nextRunDate.getMonth() + 1);
                nextRunDate.setDate(selected_date);
              }
            }


            // Check if the campaign has an end date and if nextRunDate exceeds it
            // if (recurrence_end_date && new Date(nextRunDate) > new Date(recurrence_end_date)) {
            //    
            //   await updateCampaignStatus(id, CAMPAIGN_STATUS_COMPLETED, campaignData.createdbyid, tenants);
            //   return 'Campaign end reached.';
            // }


            await duplicateCampaignWithNextRun(campaignData, nextRunDate, tenants);

          }
        }

        return 'Success';
      } else {

        return 'Failed to send messages.';
      }


    }

    // await updateCampaignStatus(campaignData.campaign_id, CAMPAIGN_STATUS_COMPLETED, campaignData.createdbyid, tenants);
    // return arrayMerge.length > 0 ? 'Success' : 'failed to read data from file.';
    return 'testig send.';
  } catch (error) {
    console.error('Error in send Bulk Message:', error);
    return 'An error occurred while processing the request.';
  }
}


async function fetchActiveCampaign(tenants, campId) {
  const query = `
        SELECT 
            c.id AS campaign_id,  c.name,  c.type,
            c.recurrence, c.custom_recurrence_unit, c.selected_days, c.selected_date, c.recurrence_end_type, recurrence_end_date,
            par.body_text_params as body_text_params,
            par.file_id as params_file_id,
            par.whatsapp_number_admin as whatsapp_number_admin,
            c.business_number AS business_number,
            c.group_ids AS group_ids,
            c.lead_ids AS lead_ids,
            c.status AS campaign_status,
            c.start_date AS start_date,
            c.createdbyid AS createdbyid,
            c.lastmodifiedbyid AS lastmodifiedbyid,
            f.id AS file_id,
            f.title AS file_title,
            f.filetype,
            f.filesize,
            f.description AS file_description,
            mt.id AS message_template_id,
            mt.template_name,
            mt.template_id,
            mt.language AS language,
            mt.category AS category, 
            mt.header,
            mt.header_body,
            mt.message_body,
            mt.example_body_text,
            mt.footer,
            mt.buttons
        FROM 
            ${tenants}.campaign AS c
        LEFT JOIN 
            ${tenants}.file AS f ON c.id = f.parentid
        LEFT JOIN 
            ${tenants}.message_template AS mt ON c.template_name = mt.template_name
            LEFT JOIN 
            ${tenants}.campaign_template_params AS par ON c.id = par.campaign_id
        INNER JOIN ${tenants}.user cu ON cu.id = c.createdbyid
        INNER JOIN ${tenants}.user mu ON mu.id = c.lastmodifiedbyid 
          WHERE 
            c.id = $1
        LIMIT 1
    `;

  const result = await sql.query(query, [campId]);
  return result.rows[0] || null;
}

async function fetchGroupMembers(groupIdsArray, tenants) {
  let groupIdsString = Array.isArray(groupIdsArray) ? groupIdsArray.join(',') : groupIdsArray;

  const formattedString = groupIdsString.replace(/[{}"]/g, '');
  const groupIds = formattedString.split(',').map(id => id.trim());
  const groupQuery = `
        SELECT 
            gm.id,
            COALESCE(ur.firstname, ld.firstname) AS member_firstname,
            COALESCE(ur.lastname, ld.lastname) AS member_lastname,
            COALESCE(ur.whatsapp_number, ld.whatsapp_number) AS whatsapp_number,
            COALESCE(ur.country_code, ld.country_code) AS countrycode 
        FROM 
            ${tenants}.group_members gm
        LEFT JOIN 
            ${tenants}.groups grp ON gm.group_id = grp.id  
        LEFT JOIN 
            ${tenants}.user ur ON gm.member_id = ur.id  
        LEFT JOIN 
            ${tenants}.lead ld ON gm.member_id = ld.id
        WHERE 
            gm.group_id IN (${groupIds.map(id => `'${id}'`).join(',')}) 
            AND grp.status = true  
    `;

  try {
    const groupResult = await sql.query(groupQuery);
    return groupResult.rows?.filter(member => member.whatsapp_number)?.map(member => ({
      Name: `${member.member_firstname} ${member.member_lastname}`,
      Number: member.whatsapp_number,
      CountryCode: member.countrycode,
    }));
  } catch (error) {
    console.error('Error fetching group members:', error);
    throw error;
  }
}

async function readXlsmFile(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    const firstSheetName = sheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    let data = XLSX.utils.sheet_to_json(worksheet, { defval: '' }); // avoids undefined

    data = data
      .filter(row => row.Name && row.Number)
      .map(row => {
        row.Name = String(row.Name).trim();
        row.Number = String(row.Number).trim();
        row.CountryCode = row.CountryCode ? String(row.CountryCode).trim() : '+91';
        if (!row.CountryCode.startsWith('+')) {
          row.CountryCode = `+${row.CountryCode}`;
        }

        return row;
      });

    return data;
  } catch (error) {
    console.error('Error reading XLSM file:', error);
    return null;
  }
}

async function getFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if ([".jpeg", ".jpg", ".png"].includes(ext)) {
    return "IMAGE";
  } else if ([".3gp", ".mp4"].includes(ext)) {
    return "VIDEO";
  } else {
    return "DOCUMENT";
  }
}


async function sendTemplateMessage(data, campaignData, tenants) {
  try {

    const { template_name, message_template_id, campaign_id, file_id, createdbyid, business_number } = campaignData;
    let documentId = null;

    if (campaignData.header !== 'TEXT' && campaignData.header && campaignData.header_body) {
      if (campaignData.params_file_id) {
        fileModel.init(tenants);
        const fileresult = await fileModel.findById(campaignData.params_file_id);

        // const filePath = `http://localhost:3000/demo/attachment/${fileresult.title}`;

        const filePath = path.join(process.env.BASE_URL, 'public', tenants, 'attachment', fileresult.title);
        const fileType = await getFileType(filePath);

        campaignData.header_body = filePath
        documentId = await uploadWhatsAppMedia(fileType, campaignData.header_body, tenants, campaignData.business_number);


      } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(campaignData.header)) {
        documentId = await uploadWhatsAppMedia(campaignData.header, campaignData.header_body, tenants, campaignData.business_number);
      }
    }
    campaignData.documentId = documentId;

    let stopSending = false;
    let historyCount = 0;
    let messageApiCount = 0;

    // Loop through all data records and send messages
    let result;
    for (let record of data) {
      if (stopSending) {



        const failedMessage = {
          parent_id: campaign_id,
          name: record.Name || '',
          whatsapp_number: `${(record.CountryCode || '91').replace(/^\+?/, '+')}${record.Number?.replace(/^\+/, '')}`,
          message: '',
          status: 'Outgoing',
          recordtypename: 'campaign',
          message_template_id: message_template_id,
          file_id: campaignData.params_file_id || null,
          is_read: true,
          business_number: business_number,
          message_id: "",
          delivery_status: "failed",
          err_message: result?.error
        };

        await createMHistoryRecords(failedMessage, createdbyid, tenants);
        historyCount++;
        continue;
      }
      const payload = await createMessagePayload(record, campaignData, tenants);
      result = await sendMessage(payload, record, campaign_id, campaignData.params_file_id, createdbyid, template_name, message_template_id, tenants, business_number);
      messageApiCount++;

      if (result.status === 'failed') {

        stopSending = true;
      }
      historyCount++;

    }




    return 'Success';

  } catch (error) {
    console.error('Error in send Template Message:', error);
  }
}

async function createMessagePayload(record, campaignData, tenants) {
  const parsedBodyTextParams = campaignData.body_text_params
    ? JSON.parse(campaignData.body_text_params)
    : {};

  if (campaignData.category === "AUTHENTICATION") {
    campaignData.example_body_text = parsedBodyTextParams["1"] || "";
  } else {
    campaignData.example_body_text = campaignData.body_text_params || "";
  }

  const reqBody = {
    messaging_product: 'whatsapp',
    to: `${record.CountryCode || '+91'}${record.Number}`,
    type: 'template',
    recipient_type: "individual",
    // category: campaignData.category,
    template: {
      // name: campaignData,
      name: campaignData.template_name,
      language: { code: campaignData.language },
      components: [
        {
          type: "header",
          parameters: campaignData.documentId
            ? [
              {
                type: campaignData.header.toLowerCase(),
                [campaignData.header.toLowerCase()]: {
                  id: campaignData.documentId,
                },
              },
            ]
            : [],
        },
        {
          type: "body",
          parameters:
            campaignData.category !== "AUTHENTICATION"
              ? Object.keys(parsedBodyTextParams)
                .filter((key) =>
                  campaignData.message_body.includes(`{{${key}}}`)
                )
                .map((key) => ({ type: "text", text: parsedBodyTextParams[key] }))
              : [],
        },
      ],
    },
  };



  if (
    campaignData.example_body_text &&
    campaignData.category === "AUTHENTICATION"
  ) {

    reqBody.template.components[1].parameters.push({
      type: "text",
      text: campaignData.example_body_text,
    });
  }

  if (
    campaignData.example_body_text &&
    campaignData.category === "AUTHENTICATION"
  ) {
    reqBody.template.components.push({
      type: "button",
      sub_type: "url",
      index: 0,
      parameters: [
        { type: "text", text: campaignData.example_body_text },
      ],
    });
  }

  return reqBody;

}

async function sendMessage(payload, record, campaign_id, file_id, createdbyid, template_name, message_template_id, tenants, business_number) {
  try {


    //  
    const tokenAccess = await getWhatsAppSettingRecord(tenants, business_number);
    const endpointURL = `${tokenAccess.end_point_url}${tokenAccess.business_number_id}/messages`;

    const response = await fetch(endpointURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAccess.access_token}`
      },
      body: JSON.stringify(payload)
    });

    const responseBody = await response.json();
    const status = response.ok ? 'Outgoing' : 'failed';
    let message = '';
    let messageId = null;
    if (response.ok) {
      messageId = responseBody?.messages && responseBody?.messages[0] ? responseBody?.messages[0]?.id : null;
    } else {
      message = `failed to send message: ${responseBody.error ? responseBody.error?.message : 'Unknown error'}`;
    }

    if (status === 'failed') {
      // Return failure if sending failed
      return { status: 'failed', error: message || 'Unknown failure' };
    }

    const newMessage = {
      parent_id: campaign_id,
      name: record.Name || '',
      whatsapp_number: `${record.CountryCode || '+91'}${record.Number}`,
      message: message,
      status: status,
      recordtypename: 'campaign',
      message_template_id: message_template_id, //template_name,
      file_id: file_id || null,
      is_read: true,
      business_number: business_number,
      message_id: messageId,
      interactive_id: null
    };

    await createMHistoryRecords(newMessage, createdbyid, tenants);


    return newMessage;

  } catch (error) {
    console.error(`Error sending message to ${record.Number}:`, error);
    return { status: 'failed', error: error.message };
  }
}


async function uploadWhatsAppMedia(header, header_body, tenants, business_number) {

  if (!header) {
    console.error('Error during image upload: Missing URL');
    return;
  }

  try {
    const fileBlob = header === 'DOCUMENT' ? await fetchPdf(header_body) : await fetchFile(header_body);
    const fileName = header_body.split('/').pop().split('?')[0] || 'file.pdf';

    const buffer = header !== 'DOCUMENT' ? Buffer.from(await fileBlob.arrayBuffer()) : '';
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    // formData.append('file', fileBlob, fileName);
    header === 'DOCUMENT' ? formData.append('file', fileBlob, fileName) : formData.append('file', buffer, { filename: fileName, contentType: fileBlob.type });
    formData.append('description', 'Header Image Template');


    const tokenAccess = await getWhatsAppSettingRecord(tenants, business_number);
    if (!tokenAccess) {

      return;
    }

    const endpointURL = `${tokenAccess.end_point_url}${tokenAccess.business_number_id}/media`;

    const response = await fetch(endpointURL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Authorization': `Bearer ${tokenAccess.access_token}`,
        // 'Access-Control-Allow-Origin': '*',
        // 'Access-Control-Allow-Headers': '*',
        ...formData.getHeaders(),
      },
      body: formData,
      // redirect: 'follow',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`failed to upload media: ${response.statusText} - ${errorText}`);
    }

    const jsonData = await response.json();
    return jsonData.id;

  } catch (error) {
    console.error('Error during image upload:', error);
  }
}

async function fetchFile(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`failed to fetch file from ${url}`);
  }
  return await response.blob();
}



// async function fetchPdf(url) {
//   const response = await fetch(url);
//   if (!response.ok) {
//     throw new Error(`failed to fetch PDF from ${url}: ${response.statusText}`);
//   }

//   const arrayBuffer = await response.arrayBuffer();
//   return new Blob([arrayBuffer], { type: 'application/pdf' });
// }


async function fetchPdf(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`failed to fetch PDF from ${url}: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer); // Return buffer instead of Blob
}




// Function to create a message history record
async function createMHistoryRecords(historyRecord, createdbyid, tenants) {
  try {
    msgHistory.init(tenants);
    await msgHistory.createMessageHistoryRecord(historyRecord, createdbyid);
  } catch (dbError) {
    console.error('failed to create message history record:', dbError);
  }
}

async function updateCampaignStatus(campaignId, status, userid, tenants) {
  const obj = { id: campaignId, status: status };
  campaignModel.init(tenants);
  const updateCampaign = await campaignModel.updateById(campaignId, obj, userid)
  return updateCampaign;
}

async function getWhatsAppSettingRecord(tenants, business_number) {
  wh_Setting.init(tenants);
  const tokenAccess = await wh_Setting.getWhatsAppSettingData(business_number);

  return tokenAccess;
}


module.exports = { sendBulkMessage, updateCampaignRecord, uploadWhatsAppMedia, init };