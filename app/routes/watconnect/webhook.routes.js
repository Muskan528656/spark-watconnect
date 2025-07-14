/**
 * @author      Muskan Khan
 * @date        June,2025
 * @copyright   www.ibirdsservices.com
 */

const express = require("express");
const webModel = require("../models/webhook.model");
const whModel = require("../models/whatsappsetting.model");
const msghistory = require("../models/messagehistory.model.js");

const chatBotMessage = require("../models/autochatbotmessage.model");
// const question_answer = require("../models/questionanswer.model");

const VERIFY_TOKEN = 'MYWHATSAPPTOKEN'; // Use a secure, random string
// https://api.indicrm.io/ibs/api/whatsapp/webhook
// const { fetchUser } = require("../middleware/fetchuser.js");

module.exports = (app, io) => {
    var router = express.Router();

    // Webhook verification endpoint
    router.get('/webhook', (req, res) => {
        try {
             
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];
             

            if (mode && token) {
                if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                     
                    res.type('text/plain').send(challenge);
                } else {
                    console.error('Verification failed: mode or token incorrect', { mode, token });
                    return res.sendStatus(403); // Forbidden
                }
            } else {
                console.error('Verification failed: Missing mode or token', { mode, token });
                return res.sendStatus(400); // Bad Request
            }
        } catch (error) {
            console.error('Error verifying webhook:', error);
            res.sendStatus(500); // Internal Server Error
        }
    });


    // Handle webhook received messages
    router.post('/webhook', async (req, res) => {
        const body = req.body;
        const WABA_ID = body.entry?.[0]?.id || null;
        const phoneNumber = body.entry?.[0]?.changes?.[0]?.value?.metadata?.display_phone_number || null;
        const settingResult = await whModel.getTenantCodeByPhoneNumber(WABA_ID);
        const tenant_code = settingResult?.tenantcode;
        const environment = settingResult?.environment;

        const platformData = await whModel.getPlatformData(tenant_code);
         
        let externalData = null;
        if (platformData && environment) {
            externalData = await whModel.getExternalApi(platformData?.id, environment);
        }
         
         

        if (body.object) {
             
            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
                const message = body.entry[0].changes[0].value.messages[0];
                const contactDetails = body.entry[0].changes[0].value.contacts[0];
              
                if (message && message.from && tenant_code && phoneNumber) {
                    webModel.init(tenant_code);
                    const responce = await webModel.insertReceivedMessageRecord(message, contactDetails, phoneNumber, tenant_code, externalData);
                
                    io.emit("receivedwhatsappmessage", message);
                    
                }
            }

            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.statuses) {
                const status = body.entry[0].changes[0].value.statuses[0];
                const messageId = status.id;
                const statusValue = status.status;
                const errorDetails = status.errors ? status.errors[0]?.error_data?.details : null;
                const timestamp = status.timestamp ? new Date(parseInt(status.timestamp) * 1000).toISOString() : null;
                if (messageId && statusValue  && tenant_code && phoneNumber) {

                    msghistory.init(tenant_code);
                    const response = await msghistory.updateMessageStatus(messageId, statusValue, errorDetails, timestamp);
                     
                    if (externalData) {
                        // const externalAPIUrl = platformData?.platform_api_endpoint?.["delivery_status"];
                        const externalAPIUrl = await buildExternalUrl(externalData, "delivery_status");
                         
                    // const externalAPIUrl = "https://orgfarm-b8778dd826-dev-ed.develop.my.site.com/services/apexrest/WatConnect/whatsapp/message/updatestatus";
                    if (externalAPIUrl) {
                    const requestBody = {
                        messageId: messageId,
                        status: statusValue,
                        error_msg : errorDetails,
                        clicked : "false"
                    };
                    webModel.init(tenant_code);
            
                   const externalResponse = await webModel.sendToExternalAPI(requestBody, externalAPIUrl);
                    
                }
                }

                    io.emit("receivedwhatsappmessage", status); // Emit status change to connected clients
                }
            }

    // Handle WhatsApp message template status updates
    if (body.entry?.[0]?.changes?.[0]?.field === "message_template_status_update") {
        const templateUpdate = body.entry[0].changes[0].value;
        
        const templateEvent = templateUpdate.event;  // e.g., "APPROVED"
        const templateId = templateUpdate.message_template_id;
        const templateName = templateUpdate.message_template_name;
        const templateLanguage = templateUpdate.message_template_language;
        const reason = templateUpdate.reason;
    if (templateId && templateName) {
     
     if(externalData){
        const externalAPIUrl = await buildExternalUrl(externalData, "template_status_update");

        // const externalAPIUrl = platformData?.platform_api_endpoint?.["template_status_update"];
        if(externalAPIUrl){
            const requestBody = {
                status: templateEvent,
                message_template_id: String(templateId),
                message_template_name: templateName,
                message_template_language: templateLanguage,
                reason: reason
            };

            const externalResponse = await webModel.sendToExternalAPI(requestBody, externalAPIUrl);
             
        }
       }
    }
    }

             res.status(200).json({ success: true, event: "success" }); // Return the full response
        } else {
            return res.sendStatus(404); // Not Found
        }
    });
async function buildExternalUrl(externalDataArray, endpointType) {
    const baseObj = externalDataArray.find(item => item.type === 'base_url');
    const pathObj = externalDataArray.find(item => item.type === endpointType);

    const base = baseObj?.value || '';
    const path = pathObj?.value || '';

    return base && path ? base + path : null;
}


    app.use(process.env.BASE_API_URL + '/api/whatsapp', router);
};
