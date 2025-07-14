/**
 * @author      Muskan Khan
 * @date        9 June 2024
 * @copyright   www.ibirdsservices.com
 */

const sql = require("./db.js");
const { execute } = require('@getvim/execute');
const dbConfig = require("../config/db.config.js");
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const wh_Setting = require("../models/whatsappsetting.model.js");
const fileModel = require("../models/file.model.js");
const msghistory = require("../models/messagehistory.model.js");
const webTemplateModel = require("../models/webhooktemplate.model.js");
const chatBot = require("../models/chatbotflow.model.js");
const sendBulk = require("../models/sendbulkmessage.model.js");
const userdevice = require("../models/userdevice.model.js");

let schema = '';
function init(schema_name) {
    this.schema = schema_name;
}
const MIMEType = new Map([
    ["text/csv", "csv"],
    ["application/msword", "doc"],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
    ["image/gif", "gif"],
    ["text/html", "html"],
    ["image/jpeg", "jpeg"],
    ["image/jpg", "jpg"],
    ["image/webp", "webp"],
    ["application/json", "json"],
    ["audio/mpeg", "mp3"],
    ["audio/ogg", "ogg"],
    ["video/mp4", "mp4"],
    ["image/png", "png"],
    ["application/pdf", "pdf"],
    ["application/vnd.ms-powerpoint", "ppt"],
    ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
    ["image/svg+xml", "svg"],
    ["text/plain", "txt"],
    ["application/vnd.ms-excel", "xls"],
    ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
    ["text/xm", "xml"],
    ["application/xml", "xml"],
    ["application/atom+xml", "xml"],
    ["application/zip", "zip"],
]);

async function insertReceivedMessageRecord(message, contactDetails, phoneNumber, tenant_code, externalData) {
    try {
        if (!message) return;

        const { access_token: whatsapptoken, end_point_url, business_number_id, createdbyid } = await getWhatsAppSettingRecord(phoneNumber, tenant_code);

        const leadResponse = await insertLeadRecord(message, contactDetails, createdbyid, tenant_code);
        const leadId = leadResponse?.record?.id;

        if (message.type === 'text' || message.type === 'button' || message.type === 'interactive') {
            if (message.type === 'button' && message.context?.id) {
                msghistory.init(tenant_code);
                await msghistory.markMessageClicked(message.context?.id);
                if (externalData) {
                    const externalAPIUrl = await buildExternalUrl(externalData, "delivery_status");
                    if (externalAPIUrl) {
                        const requestBody = {
                            messageId: message.context?.id,
                            status: "read",
                            error_msg: "",
                            clicked: "true"
                        };
                         
                        const externalResponse = await sendToExternalAPI(requestBody, externalAPIUrl);
                         
                    }
                }
            }
            await handleTextMessage(message, contactDetails, createdbyid, tenant_code, phoneNumber, externalData, leadId);
        } else {
            await handleMediaMessage(message, contactDetails, whatsapptoken, end_point_url, business_number_id, createdbyid, tenant_code, phoneNumber, externalData, leadId);
        }
    } catch (error) {
        console.error('Error downloading media:', error.message);
    }
}


// handle text message
async function handleTextMessage(message, contactDetails, userid, tenant_code, phoneNumber, externalData, leadId) {
    const textValue = message?.text?.body ||
        message?.button?.text?.trim() ||
        message?.interactive?.button_reply?.title?.trim() ||
        message?.interactive?.list_reply?.title?.trim();

    if (!textValue) {
        console.error("No text value found in message");
        return;
    }
    const newMessage = {
        parent_id: leadId,
        name: contactDetails?.profile?.name || '',
        message_template_id: null,
        whatsapp_number: message?.from?.startsWith('+') ? message.from : `+${message.from}`,
        message: textValue,
        status: 'Incoming',
        recordtypename: '',
        file_id: null,
        is_read: false,
        business_number: phoneNumber,
        message_id: message?.id,
        interactive_id: null
    };
     
    msghistory.init(tenant_code);
    userdevice.init(tenant_code);
    const response = await msghistory.createMessageHistoryRecord(newMessage, userid);
    const notificationResponse = await userdevice.sendNotification(userid, leadId, contactDetails?.profile?.name, textValue);
    if (externalData) {
        const externalAPIUrl = await buildExternalUrl(externalData, "incoming_msg");

        // if (externalData?.is_external) {
        //     const externalAPIUrl = externalData?.platform_api_endpoint?.["incoming_msg"];
        if (externalAPIUrl) {
            const externalData = {
                name: contactDetails?.profile?.name || "",
                whatsapp_number: message.from,
                message: textValue,
                status: "Incoming",
                business_number: phoneNumber,
                url: null,
                content_type: "text"
            };
            const externalResponse = await sendToExternalAPI(externalData, externalAPIUrl);
             
        }

    }

     
    if (response) {
        sendResponseMessage(response, userid, tenant_code, phoneNumber);
        sendChatbotResponse(response, tenant_code, phoneNumber, userid)
    }
}

async function handleMediaMessage(message, contactDetails, whatsapptoken, end_point_url, business_number_id, userid, tenant_code, phoneNumber, externalData, leadId) {//userid
    let fileId;
    let fileName;

    switch (message.type) {
        case 'document':
            fileName = message.document.filename || '';
            fileId = message.document.id;
            break;
        case 'image':
            // fileName = message.timestamp || '';
            fileId = message.image.id;
            break;
        case 'video':
            // fileName = message.timestamp || '';
            fileId = message.video.id;
            break;
        case 'audio':
            // fileName = message.timestamp || '';
            fileId = message.audio.id;
            break;
        case 'sticker':
            // fileName = message.timestamp || '';
            fileId = message.sticker.id;
            break;
        default:
             
            return;
    }

    if (fileId?.trim()) {
        const apiUrl = `${end_point_url}${fileId.trim()}?phone_number_id=${business_number_id}`;

        try {
            const createURLResponse = await fetch(apiUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${whatsapptoken}` }
            });

            if (!createURLResponse.ok) {
                throw new Error(`Failed to fetch media URL: ${createURLResponse.statusText}`);
            }

            const result = await createURLResponse.json();

            if (result.url && result.id) {
                await processMedia(result, contactDetails, message.from, userid, whatsapptoken, fileName, tenant_code, phoneNumber, externalData, message, leadId);//createdbyid
            } else {
                 
            }
        } catch (error) {
            console.error('Error fetching media:', error.message);
        }
    }
}

async function processMedia(result, contactDetails, fromNumber, userid, whatsapptoken, fileName, tenant_code, phoneNumber, externalData, message, leadId) {
    try {
        const imageResponse = await fetch(result.url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${whatsapptoken}` }
        });

        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch media file: ${imageResponse.statusText}`);
        }

        const buffer = await imageResponse.buffer();
        const base64String = buffer.toString('base64');
        const fileExtension = MIMEType.has(result.mime_type) ? MIMEType.get(result.mime_type) : result.mime_type;
        const caption = message.image?.caption || message.video?.caption || '';
        const newFile = {
            title: fileName ? fileName : `${result.id}.${fileExtension}`,
            filetype: fileExtension,
            filesize: result.file_size,
            description: caption,
            parentid: leadId
        };
         



        fileModel.init(tenant_code);
        const fileInsert = await fileModel.insertFileRecords(newFile, userid);
        if (fileInsert) {
            const savedFileResponse = await saveFile(buffer, fileInsert.title, tenant_code);

            if (savedFileResponse) {
                const fileUrl = `${process.env.BASE_URL}public/${tenant_code}/attachment/${fileInsert.title}`;
                userdevice.init(tenant_code);
                const notificationResponse = await userdevice.sendNotification(userid, leadId, contactDetails?.profile?.name, caption, newFile.fileType, fileUrl);
                //  

                if (externalData) {
                    const externalAPIUrl = await buildExternalUrl(externalData, "incoming_msg");

                    // if (externalData?.is_external) {
                    //     const externalAPIUrl = externalData?.platform_api_endpoint?.["incoming_msg"];
                    if (externalAPIUrl) {
                        // const caption = message.image?.caption || message.video?.caption || ''; 
                        const externalData = {
                            name: contactDetails?.profile?.name || "",
                            whatsapp_number: fromNumber,
                            message: caption,
                            status: "Incoming",
                            business_number: phoneNumber,
                            url: fileUrl,
                            content_type: fileExtension,
                            full_content_type: result?.mime_type
                        };
                        const externalResponse = await sendToExternalAPI(externalData, externalAPIUrl);
                         
                    }


                }
            }
            await logMessageHistory(contactDetails, fromNumber, userid, fileInsert.id, tenant_code, phoneNumber, message, leadId);
        }
    } catch (error) {
        console.error('Error processing media:', error.message);
    }
}

async function saveFile(buffer, title, tenant_code) {
    const uploadPath = process.env.FILE_UPLOAD_PATH + '/' + tenant_code + '/attachment' || path.resolve(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }

    const filePath = path.join(uploadPath, title);
    fs.writeFileSync(filePath, buffer);
    return true;

}

async function logMessageHistory(contactDetails, fromNumber, userid, fileId, tenant_code, phoneNumber, message, leadId) {
    const newMessage = {
        parent_id: leadId,
        name: contactDetails?.profile?.name || '',
        message_template_id: null,
        whatsapp_number: fromNumber.startsWith('+') ? fromNumber : `+${fromNumber}`,
        message: '',
        status: 'Incoming',
        recordtypename: '',
        file_id: fileId,
        is_read: false,
        business_number: phoneNumber,
        message_id: message?.id,
        interactive_id: null
    };

    msghistory.init(tenant_code);
    const historyRecordResponse = await msghistory.createMessageHistoryRecord(newMessage, userid);
    if (historyRecordResponse) {
        sendResponseMessage(historyRecordResponse, userid, tenant_code, phoneNumber);
    }
}

// async function sendChatbotResponse(msg, tenant_code, phoneNumber, userid) {
//     if (!msg.whatsapp_number) {
//          
//         return;
//     }

//     const keyword = msg.message || '';
//     console.debug("Processing keyword:", keyword);

//     try {
//         chatBot.init(tenant_code);
//         const chatbotData = await chatBot.getChatbotWithRelatedInfo(keyword, phoneNumber);
//          
//         if (!chatbotData) {
//             console.warn("No chatbot data found for keyword:", keyword);
//             return;
//         }

//         let messagePayload = { messaging_product: 'whatsapp', recipient_type: "individual", to: msg.whatsapp_number };

//         if (["image", "video", "document"].includes(chatbotData.action_type)) {
//             const documentId = await getMediaId(chatbotData, tenant_code);
//             if (!documentId) return;
//             messagePayload = { ...messagePayload, type: chatbotData.action_type, [chatbotData.action_type]: { id: documentId } };
//         } else if (chatbotData.action_type === "text") {
//             messagePayload = { ...messagePayload, type: "text", text: { body: chatbotData.response } };
//         } else if (chatbotData.action_type === "interactive") {
//             const headerPayload = await getHeaderPayload(chatbotData, tenant_code);

//             messagePayload = {
//                 ...messagePayload,
//                 type: "interactive",
//                 interactive: chatbotData.interactive_type === "list" ? 
//                 {
//                     type: "list",
//                     ...(headerPayload && { header: headerPayload } ),
//                     body: { text: chatbotData.caption || chatbotData.body_text },
//                     ...(chatbotData.footer_text && { footer: { text: chatbotData.footer_text } } ),
//                     action: {
//                         button: "View Options",
//                         sections: (chatbotData.sections || []).map(section => ({
//                             title: section.title,
//                             rows: (section.rows || []).map(row => ({
//                                 id: row.id,
//                                 title: row.title,
//                                 description: row.description || ""
//                             }))
//                         }))
//                     }
//                 } : {
//                     type: "button",
//                     ...(headerPayload && { header: headerPayload } ),
//                     body: { text: chatbotData.caption || chatbotData.body_text },
//                     ...(chatbotData.footer_text && { footer: { text: chatbotData.footer_text } } ),
//                     action: {
//                         buttons: (chatbotData.interactive_buttons || []).map(button => ({
//                             type: "reply",
//                             reply: { id: button.id, title: button.text }
//                         }))        
//                     }
//                 }
//             };
//         } else {
//             console.warn("Unsupported action type:", chatbotData.action_type);
//             return;
//         }

//         console.debug("Sending message payload:", JSON.stringify(messagePayload, null, 2));
//         webTemplateModel.init(tenant_code);
//         const response = await webTemplateModel.singleMessageSend(messagePayload, phoneNumber);
//         console.debug("Message send response:", response);

//         if (response?.messaging_product === 'whatsapp') {
//             const newMessage = {
//                 parent_id: msg.id || null,
//                 name: msg.name || '',
//                 template_name: '',
//                 whatsapp_number: msg.whatsapp_number?.startsWith('+') ? msg.whatsapp_number : `+${msg.whatsapp_number}`,
//                 message: ["image", "video", "document"].includes(chatbotData.action_type) ? chatbotData.description : chatbotData.response,
//                 status: 'Outgoing',
//                 recordtypename: '',
//                 file_id: ["image", "video", "document"].includes(chatbotData.action_type) ? chatbotData.file_id : null,
//                 is_read: true,
//                 business_number: phoneNumber,
//                 message_id: response.messages[0]?.id,
//                 interactive_id: chatbotData.interactive_message_id
//             };
//      
//             msghistory.init(tenant_code);
//             await msghistory.createMessageHistoryRecord(newMessage, userid);
//         }
//     } catch (error) {
//         console.error("Error processing message:", error);
//     }
// }
async function sendChatbotResponse(msg, tenant_code, phoneNumber, userid) {
    if (!msg.whatsapp_number) {
         
        return;
    }

    const keyword = msg.message || '';
     

    try {
        chatBot.init(tenant_code);
        const chatbotData = await chatBot.getChatbotFlowByKeyword(keyword, phoneNumber);
         

        if (!chatbotData) {
            console.warn("No chatbot data found for keyword:", keyword);
            return;
        }

        const toNumber = msg.whatsapp_number.startsWith('+') ? msg.whatsapp_number : `+${msg.whatsapp_number}`;

        let messagePayload = {
            messaging_product: 'whatsapp',
            recipient_type: "individual",
            to: toNumber
        };

        // Upload media if applicable
        let mediaId = null;
        if (["image", "video", "document"].includes(chatbotData.type)) {
            mediaId = await sendBulk.uploadWhatsAppMedia(chatbotData.type, chatbotData.file_url, tenant_code, phoneNumber);
            if (!mediaId) return;
        }

        // Prepare header
        let headerPayload = null;
        if (chatbotData.header) {
            headerPayload = { type: "text", text: chatbotData.header };
        } else if (mediaId) {
            headerPayload = {
                type: chatbotData.type,
                [chatbotData.type]: { id: mediaId }
            };
        }

        // ----------------------------
        // Handle INTERACTIVE: LIST
        // ----------------------------
        if (chatbotData.interactive_type === "list") {
            const validSections = (chatbotData.sections || []).map(section => ({
                title: section.title || "Options",
                rows: (section.rows || []).filter(row => row.keywords?.trim()).map(row => ({
                    id: row.id,
                    title: row.keywords,
                    description: row.description || ""
                }))
            })).filter(section => section.rows.length > 0);

            const isEmptyList = validSections.length === 0;

            if (isEmptyList) {
                console.warn("List interactive type selected, but no valid list rows found. Sending fallback message.");
                messagePayload = {
                    ...messagePayload,
                    type: "text",
                    text: { body: chatbotData.caption || chatbotData.body_text || "No options available." }
                };
            } else {
                messagePayload = {
                    ...messagePayload,
                    type: "interactive",
                    interactive: {
                        type: "list",
                        ...(headerPayload && { header: headerPayload }),
                        body: { text: chatbotData.caption || chatbotData.body_text || "" },
                        ...(chatbotData.footer_text && { footer: { text: chatbotData.footer_text } }),
                        action: {
                            button: "Choose",
                            sections: validSections
                        }
                    }
                };
            }
        }

        // ----------------------------
        // Handle INTERACTIVE: BUTTON
        // ----------------------------
        else if (chatbotData.interactive_type === "button") {
            const validButtons = (chatbotData.interactive_buttons || []).filter(btn => btn.keywords?.trim());
            const isEmptyButtons = validButtons.length === 0;

            if (isEmptyButtons) {
                console.warn("Button interactive type selected, but no valid buttons found. Sending fallback media or text.");
                if (["image", "video", "document"].includes(chatbotData.type)) {
                    messagePayload = {
                        ...messagePayload,
                        type: chatbotData.type,
                        [chatbotData.type]: {
                            id: mediaId,
                            ...(chatbotData.caption && { caption: chatbotData.caption })
                        }
                    };
                } else {
                    messagePayload = {
                        ...messagePayload,
                        type: "text",
                        text: { body: chatbotData.caption || chatbotData.body_text || "No content available." }
                    };
                }
            } else {
                messagePayload = {
                    ...messagePayload,
                    type: "interactive",
                    interactive: {
                        type: "button",
                        ...(headerPayload && { header: headerPayload }),
                        body: { text: chatbotData.caption || chatbotData.body_text || "" },
                        ...(chatbotData.footer_text && { footer: { text: chatbotData.footer_text } }),
                        action: {
                            buttons: validButtons.map(button => ({
                                type: "reply",
                                reply: {
                                    id: button.id,
                                    title: button.keywords
                                }
                            }))
                        }
                    }
                };
            }
        }

        // ----------------------------
        // Handle TEXT message only
        // ----------------------------
        else if (chatbotData.type === "text") {
            messagePayload = {
                ...messagePayload,
                type: "text",
                text: { body: chatbotData.header || chatbotData.caption || chatbotData.body_text || "No content." }
            };
        }

        // ----------------------------
        // Handle IMAGE / VIDEO / DOCUMENT
        // ----------------------------
        else if (["image", "video", "document"].includes(chatbotData.type)) {
            messagePayload = {
                ...messagePayload,
                type: chatbotData.type,
                [chatbotData.type]: {
                    id: mediaId,
                    ...(chatbotData.caption && { caption: chatbotData.caption })
                }
            };
        }

        // ----------------------------
        // Fallback
        // ----------------------------
        else {
            console.warn("Unsupported message type or missing configuration. Sending default fallback text.");
            messagePayload = {
                ...messagePayload,
                type: "text",
                text: { body: "Sorry, no valid chatbot response available." }
            };
        }

        // ----------------------------
        // Send Message
        // ----------------------------
        console.debug("Sending message payload:", JSON.stringify(messagePayload, null, 2));
        webTemplateModel.init(tenant_code);
        const response = await webTemplateModel.singleMessageSend(messagePayload, phoneNumber);
        console.debug("Message send response:", response);

        // ----------------------------
        // Save Message History
        // ----------------------------
        if (response?.messaging_product === 'whatsapp') {
            const newMessage = {
                parent_id: msg.id || null,
                name: msg.name || '',
                template_name: '',
                whatsapp_number: toNumber,
                message: chatbotData.caption || chatbotData.body_text || chatbotData.description || chatbotData.header || "Sent",
                status: 'Outgoing',
                recordtypename: '',
                file_id: null,
                is_read: true,
                business_number: phoneNumber,
                message_id: response.messages?.[0]?.id,
                interactive_id: null
            };

            msghistory.init(tenant_code);
            await msghistory.createMessageHistoryRecord(newMessage, userid);
        }

    } catch (error) {
        console.error("Error processing message:", error);
    }
}


async function getMediaId(chatbotData, tenant_code) {
    try {
        const fileTitle = chatbotData.file_title || chatbotData.interactive_file_title;

        if (!fileTitle) {
            console.error("Error: file_title is missing in chatbotData");
            return null;
        }
        const filePath = path.join(process.env.BASE_URL, "public", tenant_code, "attachment", fileTitle);
        return await sendBulk.uploadWhatsAppMedia(chatbotData.action_type || chatbotData.header_type, filePath, tenant_code, chatbotData.business_number);
    } catch (error) {
        console.error("Error uploading media:", error);
        return null;
    }
}

async function getHeaderPayload(chatbotData, tenant_code) {
    if (["image", "video", "document"].includes(chatbotData.header_type)) {
        const documentId = await getMediaId(chatbotData, tenant_code);
        return documentId ? { type: chatbotData.header_type, [chatbotData.header_type]: { id: documentId } } : null;
    }
    return chatbotData.header_type === "text" && chatbotData.header_content
        ? { type: "text", text: chatbotData.header_content }
        : null;
}



// Response message send
async function sendResponseMessage(msg, userid, tenant_code, phoneNumber) {

    if (!msg.whatsapp_number) {
         
        return;
    }


    const findIncomingQuery = `SELECT id, name, whatsapp_number FROM ${tenant_code}.message_history 
                                WHERE status = 'Incoming' AND whatsapp_number = $1 AND createdbyid = $2 LIMIT 2`;

    const findIncomingRecord = await sql.query(findIncomingQuery, [msg.whatsapp_number, userid]);
     

    if (findIncomingRecord.rows.length !== 1) {
         
        return;
    }


    const findOutgoingQuery = `SELECT id, name, recordtypename FROM ${tenant_code}.message_history 
                WHERE (recordtypename = 'campaign' OR recordtypename = 'contact' OR recordtypename = 'lead' OR recordtypename = 'user') AND whatsapp_number = $1 AND createdbyid = $2
                LIMIT 1`;


    const findOutgoingRecord = await sql.query(findOutgoingQuery, [msg.whatsapp_number, userid]);  // Correct query variable
     
    // if (findOutgoingRecord.rows.length === 0) {
    //      
    //     return;
    // }

    const recordType = findOutgoingRecord.rows[0]?.recordtypename || 'common_message';

    const textMessageMap = {
        'Campaign': 'Campaign',
        'Lead': 'Lead',
        'User': 'User',
        'common_message': 'common_message'
    };

    let textMessage = textMessageMap[recordType];

    const findResponseMessageQuery = `SELECT message FROM ${tenant_code}.auto_response_message WHERE type = $1 AND createdbyid = $2  LIMIT 1 `;
    let findResponseMessageRecord = await sql.query(findResponseMessageQuery, [textMessage, userid]);  // Correct query variable

    if (findResponseMessageRecord.rows.length === 0) {
        findResponseMessageRecord = await sql.query(findResponseMessageQuery, ['common_message', userid]);
        if (findResponseMessageRecord.rows.length === 0) {
             
            return;
        }
    }

    const responseMessage = findResponseMessageRecord.rows[0].message;

    const singleText = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: msg.whatsapp_number,
        type: "text",
        text: {
            preview_url: false,
            body: responseMessage
        }
    };

    try {
        webTemplateModel.init(tenant_code);
        const response = await webTemplateModel.singleMessageSend(singleText, phoneNumber);
        const messageId = response?.messages[0]?.id;
         
        if (response.messaging_product === 'whatsapp') {
            const newMessage = {
                parent_id: msg.id || null,
                name: msg?.name || '',
                template_name: '',
                whatsapp_number: msg.whatsapp_number?.startsWith('+') ? msg.whatsapp_number : `+${msg.whatsapp_number}`,
                message: responseMessage,
                status: 'Outgoing',
                recordtypename: (textMessage === 'campaign' || textMessage === 'common_message') ? '' : textMessage,
                file_id: null,
                is_read: true,
                business_number: phoneNumber,
                message_id: messageId,
                interactive_id: null
            };

            msghistory.init(tenant_code);
            const historyRecordResponse = await msghistory.createMessageHistoryRecord(newMessage, userid);
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// inser lead record
async function insertLeadRecord(message, contactDetails, userid, tenant_code) {
    const number = message?.from;
    const name = contactDetails?.profile?.name;
    let [firstName, lastName] = name ? name.split(" ") : [null, null];
    let leadstatus = 'Open - Not Contacted';
    let leadsource = 'Web';
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

    const response = await extractCountryCodeAndNumber(number, countryList);
    try {

        const findQuery = `SELECT id, whatsapp_number, createdbyid FROM ${tenant_code}.lead WHERE whatsapp_number = $1 AND createdbyId = $2 `;
        const findRecord = await sql.query(findQuery, [response?.phone_number, userid]);

        if (findRecord.rows.length > 0) {
             
            return { record: findRecord.rows[0], existing: true };
        }

        const insertQuery = `INSERT INTO ${tenant_code}.lead (firstname, lastname, whatsapp_number, country_code, leadstatus, leadsource, ownerid, createdbyid, lastmodifiedbyid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;
        const result = await sql.query(insertQuery, [firstName, lastName, response?.phone_number, response?.country_code, leadstatus, leadsource, userid, userid, userid]);

        if (result.rows.length > 0) {
             
            return { record: result.rows[0], existing: false };
        }
         
        return null;

    } catch (error) {
        console.error('Error during database operation:', error);
        throw new Error('Database operation failed');
    }
}

async function extractCountryCodeAndNumber(fullNumber, countryList) {
    const fullStr = fullNumber.toString();

    const sortedCodes = countryList.map(String).sort((a, b) => b.length - a.length);

    for (let code of sortedCodes) {
        if (fullStr.startsWith(code)) {
            const phone_number = fullStr.slice(code.length);
            return {
                country_code: `+${code}`,
                phone_number
            };
        }
    }

    return {
        country_code: '+91',
        phone_number: fullStr
    };
}



// fetch whatsapp setting
async function getWhatsAppSettingRecord(whatsappNumber, tenant_code) {
    wh_Setting.init(tenant_code);
     
    const tokenAccess = await wh_Setting.getWhatsAppSettingData(whatsappNumber);
    return tokenAccess;
}

async function sendToExternalAPI(data, url) {
    try {
        // const url = "https://ibirdssoftwareservicespvt57-dev-ed.develop.my.site.com/whatsapp/services/apexrest/WhatsAppiB/incoming";
         
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
         
        const responseBody = await response.json();
         
    } catch (error) {
        console.error("Error sending data to external API:", error);
    }
}

async function buildExternalUrl(externalData, endpointType) {
    const base = externalData.find(e => e.type === "base_url")?.value || "";
    const path = externalData.find(e => e.type === endpointType)?.value || "";
    return base && path ? base + path : null;
}



module.exports = { insertReceivedMessageRecord, sendToExternalAPI, init };
