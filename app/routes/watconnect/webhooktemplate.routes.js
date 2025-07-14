/**
 * @author      Muskan Khan
 * @date        June, 2024
 * @copyright   www.ibirdsservices.com
 */

const e = require("express");
const wh_Setting = require("../../models/watconnect/whatsappsetting.model.js");
const { fetchUser, checkModuleAccess } = require("../../middleware/fetchuser.js");
const webTemplateModel = require("../../models/watconnect/webhooktemplate.model.js");
const FormData = require('form-data');
const fetch = require('node-fetch');
const { Blob } = require('buffer'); // Import Blob if you're using a Node version that supports it
const sendbulkmsg = require("../../models/watconnect/sendbulkmessage.model.js");
// const msgTemplate = require("../../models/watconnect/messagetemplate.model.js");
// const msgHistory = require("../models/messagehistory.model.js");
// const campaignModel = require("../models/campaign.model.js")
const commonModel = require("../../models/common.model.js");
// const webModel = require("../models/webhook.model");
// const moment = require("moment-timezone");
module.exports = app => {
    const { body, validationResult } = require('express-validator');
    var router = require("express").Router();

    // -------------Template By name get------------------
    router.get('/templatebyname', fetchUser, checkModuleAccess("whatsapp_template"), async (req, res) => {
        const { name, whatsapp_setting_number } = req.query;
        webTemplateModel.init(req.userinfo.tenantcode);
        try {
            const tempResult = await webTemplateModel.getTemplateByName(name, whatsapp_setting_number);
            if (tempResult) {
                return res.status(200).json(tempResult);
            } else {
                return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });


    router.get('/template', fetchUser, checkModuleAccess("whatsapp_template"), async (req, res) => {

        const { id, whatsapp_setting_number } = req.query;
        webTemplateModel.init(req.userinfo.tenantcode);
        try {
            const tempResult = await webTemplateModel.getTemplateById(id, whatsapp_setting_number);
             
            if (tempResult) {
                return res.status(200).json(tempResult);
            } else {
                return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });

    router.get('/approved/template:?', fetchUser, checkModuleAccess("whatsapp_template"), async (req, res) => {
        wh_Setting.init(req.userinfo.tenantcode);
        webTemplateModel.init(req.userinfo.tenantcode);
        const { whatsapp_setting_number } = req.query;
        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }


        try {
            const tempResult = await webTemplateModel.getAllApprovedTemplate(whatsapp_setting_number);

            if (tempResult) {
                return res.status(200).json(tempResult);
            } else {
                return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }

    });

    router.delete("/template:?", fetchUser, checkModuleAccess("whatsapp_template"), async (req, res) => {
        webTemplateModel.init(req.userinfo.tenantcode);

        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }

        const id = req.query.hsm_id;
        const name = req.query.name;

        try {
            const tempResult = await webTemplateModel.deleteTemplate(id, name, whatsapp_setting_number);

            if (tempResult) {
                return res.status(200).json(tempResult);
            } else {
                return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });


    // send whatsapp template
    router.post('/message:?', fetchUser, checkModuleAccess("whatsapp_template"), async (req, res) => {
        webTemplateModel.init(req.userinfo.tenantcode);
        commonModel.init(req.userinfo.tenantcode);
        const reqBody = req.body;

        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }



        try {
            const tempResult = await webTemplateModel.sendWhatsappTemplate(reqBody, whatsapp_setting_number);

            if (tempResult) {
                await commonModel.incrementMessageCount(whatsapp_setting_number);
                return res.status(200).json(tempResult);
            } else {
                return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });
    router.post('/single/message:?', fetchUser, checkModuleAccess("whatsapp_messenger"), async (req, res) => {
        webTemplateModel.init(req.userinfo.tenantcode);
        const reqBody = req.body;
        const { whatsapp_setting_number } = req.query;
        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }
        try {
            const tempResult = await webTemplateModel.singleMessageSend(reqBody, whatsapp_setting_number);
            if (tempResult) {
                return res.status(200).json(tempResult);
            } else {
                return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });

    // changes 
    router.post('/:?', fetchUser, checkModuleAccess("whatsapp_messenger"), async (req, res) => {
        webTemplateModel.init(req.userinfo.tenantcode);
        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }
        const fileData = req.files;
        try {
            if (fileData && fileData.files) {
                const { name, size, mimetype } = fileData.files;
                const tempResult = await webTemplateModel.uplodaedImage(name, size, mimetype, whatsapp_setting_number);
                if (tempResult) {
                    return res.status(200).json(tempResult);
                } else {
                    return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
                }
            } else {
                res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or file data' });
            }
        } catch (error) {
            console.error('Error during file upload:', error);
            res.status(500).json({ error: 'Internal Server Error', message: error.message });
        }
    });
    router.post('/uploadsessionid:?', fetchUser, checkModuleAccess("whatsapp_template"), async (req, res) => {
        webTemplateModel.init(req.userinfo.tenantcode);
        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }

        const fileData = req.files;
        const { uploadSessionId } = req.body;



        if (!uploadSessionId || !fileData || !fileData.files || !fileData.files.data) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        try {
            if (fileData && fileData.files) {
                const { data, name, size, mimetype } = fileData.files;

                const tempResult = await webTemplateModel.uplodaedImageSession(uploadSessionId, data, whatsapp_setting_number);
                if (tempResult) {
                    return res.status(200).json(tempResult);
                } else {
                    return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
                }
            } else {
                res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or file data' });
            }
        } catch (error) {
            console.error('Error during file upload:', error);
            res.status(500).json({ error: 'Internal Server Error', message: error.message });
        }
    });
    // template create
    router.post('/template:?', fetchUser, checkModuleAccess("whatsapp_template"), async (req, res) => {
         
        webTemplateModel.init(req.userinfo.tenantcode);
        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }
        const reqBody = req.body;
        try {
            const tempResult = await webTemplateModel.createTemplate(reqBody, whatsapp_setting_number);
             
            if (tempResult) {
                return res.status(200).json(tempResult);
            } else {
                return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });

    router.post('/template/:id:?', fetchUser, checkModuleAccess("whatsapp_template"), async (req, res) => {
        webTemplateModel.init(req.userinfo.tenantcode);
        const { whatsapp_setting_number } = req.query;
        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }

        const reqBody = req.body;


        try {
            const tempResult = await webTemplateModel.updateTemplate(req.params.id, reqBody, whatsapp_setting_number);
            if (tempResult) {
                return res.status(200).json(tempResult);
            } else {
                return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });

    router.post('/temp/auth:?', fetchUser, checkModuleAccess("whatsapp_template"), async (req, res) => {
         
        webTemplateModel.init(req.userinfo.tenantcode);
        const reqBody = req.body;
         



        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }


        try {
            const tempResult = await webTemplateModel.upsertAuthTemplate(reqBody, whatsapp_setting_number);
             
            if (tempResult) {
                return res.status(200).json(tempResult);
            } else {
                return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });


    router.get('/:?', fetchUser, checkModuleAccess("whatsapp_template"), async (req, res) => {
        wh_Setting.init(req.userinfo.tenantcode);
        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }



        const result = await wh_Setting.getWhatsAppSettingData(whatsapp_setting_number);

        if (result) {
            const { access_token, end_point_url } = result;
            const endpoint = `${end_point_url}${req.query.name}`

            try {
                const response = await fetch(endpoint, {
                    method: 'GET', // Use GET to fetch settings
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `OAuth ${access_token}`,
                    },
                });

                // Check for response status
                if (!response.ok) {
                    const errorText = await response.text();
                    let errorJson;

                    try {
                        errorJson = JSON.parse(errorText);
                    } catch (parseError) {
                        errorJson = { message: "Unable t    o parse error response", raw: errorText };
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

                const jsonData = await response.json();
                res.status(200).json(jsonData);

            } catch (error) {
                console.error('Error during API request:', error);
                res.status(500).json({ error: 'Internal Server Error', message: error.message });
            }

        } else {
            res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or file data' });
        }
    });


    // image,audio,video.. send 

    // router.post('/documentId', fetchUser, checkModuleAccess("whatsapp_template"), async (req, res) => {
    //     try {
    //         const { whatsapp_setting_number } = req.query;
    //         const fileData = req.files?.file;

    //         if (!whatsapp_setting_number || !fileData) {
    //             return res.status(400).json({ error: 'Missing WhatsApp setting number or file' });
    //         }

    //         const result = await wh_Setting.getWhatsAppSettingData(whatsapp_setting_number);
    //         if (!result) {
    //             return res.status(400).json({ error: 'WhatsApp setting not found' });
    //         }

    //         const { data, name, mimetype } = fileData;
    //         const form = new FormData();
    //         form.append('messaging_product', 'whatsapp');
    //         form.append('file', data, { filename: name, contentType: mimetype });

    //         const uploadUrl = `${result.end_point_url}${result.business_number_id}/media`;

    //         const response = await fetch(uploadUrl, {
    //             method: 'POST',
    //             headers: {
    //                 ...form.getHeaders(),
    //                 Authorization: `Bearer ${result.access_token}`,
    //             },
    //             body: form
    //         });

    //         const responseText = await response.text();
    //         const json = JSON.parse(responseText);

    //         if (!response.ok) {
    //             console.error("Facebook Upload Error:", json);
    //             return res.status(response.status).json({ error: json });
    //         }

    //         return res.status(200).json(json);
    //     } catch (error) {
    //         console.error("Upload failed:", error);
    //         res.status(500).json({ error: error.message });
    //     }
    // });
    // router.post(
    //     '/documentId',
    //     fetchUser,
    //     checkModuleAccess("whatsapp_template"),
    //     async (req, res) => {
    //         try {
    //             if (!req.files) {
    //                 return res.status(400).json({ errors: "No File selected" });
    //             }

    //             const { description } = req.body;
    //             const id = req.body.id || req.params.id;

    //             const arry = [];
    //             const uploadUrl = `${result.end_point_url}${result.business_number_id}/media`;
    //             for (const fileDetail of Object.values(req.files)) {

    //                 // const fileExtension =
    //                 //     MIMEType.get(fileDetail.mimetype) || path.extname(fileDetail.name);

    //                 const newFile = {
    //                     title: fileDetail.name,
    //                     // filetype: fileExtension,
    //                     filesize: fileDetail.size,
    //                     description: description,
    //                     parentid: id
    //                 };
    //                 const response = await fetch(uploadUrl, {
    //                     method: 'POST',
    //                     headers: {
    //                         ...form.getHeaders(),
    //                         Authorization: `Bearer ${result.access_token}`,
    //                     },
    //                     body: form
    //                 });

    //                  
    //                 arry.push(newFile);
    //             }

    //             return res.status(200).json({ success: true, data: arry });
    //         } catch (error) {
    //             console.error('An error occurred:', error);
    //             return res.status(500).json({ errors: 'Internal Server Error' });
    //         }
    //     }
    // );



    router.post('/documentId', fetchUser, checkModuleAccess("whatsapp_template"), async (req, res) => {
        try {
            const { whatsapp_setting_number } = req.query;
            const fileData = req.files?.file;

            if (!whatsapp_setting_number || !fileData) {
                return res.status(400).json({ error: 'Missing WhatsApp setting number or file' });
            }

            const result = await wh_Setting.getWhatsAppSettingData(whatsapp_setting_number);
            if (!result) {
                return res.status(400).json({ error: 'WhatsApp setting not found' });
            }

            const { data, name, mimetype } = fileData;
            const form = new FormData();
            form.append('messaging_product', 'whatsapp');
            form.append('file', data, { filename: name, contentType: mimetype });

            const uploadUrl = `${result.end_point_url}${result.business_number_id}/media`;

            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    ...form.getHeaders(),
                    Authorization: `Bearer ${result.access_token}`,
                },
                body: form
            });

            const responseText = await response.text(); // WhatsApp might return plain text sometimes
            const json = JSON.parse(responseText);

            if (!response.ok) {
                console.error("Facebook Upload Error:", json);
                return res.status(response.status).json({ error: json });
            }

            return res.status(200).json(json);
        } catch (error) {
            console.error("Upload failed:", error);
            res.status(500).json({ error: error.message });
        }
    });



    async function fetchPdf(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`failed to fetch PDF from ${url}: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer); // Return buffer instead of Blob
    }


    router.post('/proxy:?', fetchUser, checkModuleAccess("whatsapp_messenger"), async (req, res) => {
        wh_Setting.init(req.userinfo.tenantcode);
        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }



        const result = await wh_Setting.getWhatsAppSettingData(whatsapp_setting_number);
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const fileBlob = await fetchPdf(url);

        // Convert Blob to Buffer
        // const buffer = Buffer.from(await fileBlob.arrayBuffer()); // Convert Blob to Buffer
        const fileName = url.split('/').pop().split('?')[0] || 'application.pdf';

        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('file', fileBlob, { filename: fileName, contentType: 'application/pdf' }); // Use buffer directly
        formData.append('description', 'Header Image Template');

        const { access_token, end_point_url, business_number_id } = result;
        const endpointURL = `${end_point_url}${business_number_id}/media`;

        const response = await fetch(endpointURL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Authorization': `Bearer ${access_token}`,
            },
            body: formData,
            redirect: 'follow',
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

        const jsonData = await response.json();
        res.status(200).json(jsonData.id);
    });

    router.post('/bulkcampaign', fetchUser, checkModuleAccess("campaign"), async (req, res) => {
        try {
             
             
            const { campaign_id, campaign_name, template_name, template_id, business_number, members, document_id } = req.body;
            const currentdate = moment.tz("Asia/Kolkata").format("YYYY-MM-DDTHH:mm:ss.SSSZ");

            if (!campaign_name || !campaign_id || !template_name || !template_id || !business_number || !members || !Array.isArray(members)) {
                return res.status(400).json({ error: 'Missing required fields or incorrect data format' });
            }

            wh_Setting.init(req.userinfo.tenantcode);
            msgTemplate.init(req.userinfo.tenantcode);
            webTemplateModel.init(req.userinfo.tenantcode);
            msgHistory.init(req.userinfo.tenantcode);
            campaignModel.init(req.userinfo.tenantcode);

            const templateData = await webTemplateModel.getTemplateByName(template_name, business_number);
             
            if (!templateData || !templateData.data || templateData.data.length === 0) {
                return res.status(200).json({ success: 'false', message: 'Template not found or has no data' });
            }
            let documentId = document_id || null;

            if (!documentId) {
                const headerComponent = templateData.data[0].components.find(c => c.type === "HEADER");
                if (headerComponent && headerComponent.format && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComponent.format)) {
                    try {
                        documentId = await sendbulkmsg.uploadWhatsAppMedia(headerComponent.format, headerComponent.example.header_handle[0], req.userinfo.tenantcode, business_number);

                        if (documentId) {
                             
                        } else {
                            console.error("Media upload failed.");
                        }
                    } catch (error) {
                        console.error("Error uploading media:", error);
                    }
                }

            }
             

            const bodyComponent = templateData.data[0].components.find(c => c.type === "BODY");

            const hasPlaceholders = bodyComponent?.text.includes("{{");

            const expectedParamsCount = hasPlaceholders ? (bodyComponent.text.match(/{{\d+}}/g) || []).length : 0;

            for (const member of members) {
                const memberParamCount = Object.keys(member.body_param || {}).length;

                if (hasPlaceholders && memberParamCount !== expectedParamsCount) {
                    return res.status(200).json({
                        success: false,
                        message: `Parameter mismatch for ${member.Name}. Expected ${expectedParamsCount} values, got ${memberParamCount}.`
                    });
                }
            }


            const whatsappSettings = await wh_Setting.getWhatsAppSettingData(business_number);
            if (!whatsappSettings) {
                return res.status(200).json({ error: 'Failed to fetch WhatsApp settings' });
            }



            res.status(200).json({ success: true, message: "Success" });


            setImmediate(async () => {
                try {
                    const memberResults = await Promise.allSettled(
                        members.map(async (member) => {
                            let status = "Outgoing";
                            let messageId = "";
                            let deliveryStatus = "failed";
                            let errMsg = null;

                            try {

                                const payload = await createMessagePayload(member, templateData, req.userinfo.tenantcode, business_number, documentId);
                                 

                                const responseBody = await webTemplateModel.sendWhatsappTemplate(payload, business_number);
                                 

                                const isAccepted = responseBody?.messages?.[0]?.message_status === 'accepted';
                                messageId = responseBody?.messages?.[0]?.id || "";
                                deliveryStatus = isAccepted ? "sent" : "failed";
                                if (!isAccepted) throw new Error(`Message not accepted`);

                            } catch (error) {
                                errMsg = error.message || "Unknown error";
                            }

                            return {
                                name: member?.Name || '',
                                number: member.Number,
                                status,
                                message_id: messageId,
                                delivery_status: deliveryStatus,
                                err_msg: errMsg
                            };
                        })
                    );

                    // Build request body for external API
                    const externalRequestBody = {
                        campaign_id: campaign_id,
                        template_name,
                        template_id,
                        business_number,
                        members: memberResults.map(result => result.value || result.reason) // get settled value or reason
                    };
                    webModel.init(req.userinfo.tenantcode);
                     

                    // Get platform API endpoint
                    const platformData = await wh_Setting.getPlatformData(req.userinfo.tenantcode);
                    const environment = whatsappSettings?.environment;
                     
                    let externalData = null;
                    if (platformData && environment) {
                        externalData = await wh_Setting.getExternalApi(platformData?.id, environment);
                    }
                     

                    if (externalData) {
                        const externalAPIUrl = await buildExternalUrl(externalData, "campaign_history");


                        if (!externalAPIUrl) {
                            console.error("Platform API URL for campaign_history not found.");
                        } else {
                            const externalResponse = await webModel.sendToExternalAPI(externalRequestBody, externalAPIUrl);
                             
                        }
                    }

                } catch (err) {
                    console.error("Error in bulk message finalization:", err);
                }
            });


        } catch (error) {
            console.error("Error processing campaign:", error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    async function buildExternalUrl(externalData, endpointType) {
        const baseEntry = externalData.find(entry => entry.type === "base_url");
        const pathEntry = externalData.find(entry => entry.type === endpointType);

        const base = baseEntry?.value || "";
        const path = pathEntry?.value || "";

        return base && path ? base + path : null;
    }

    router.post('/sendtemplate', fetchUser, checkModuleAccess("whatsapp_messenger"), async (req, res) => {
        try {
            const { members_name, template_name, template_id, business_number, members_number } = req.body;
            const currentdate = moment.tz("Asia/Kolkata").format("YYYY-MM-DDTHH:mm:ss.SSSZ");

            // Validate request body
            if (!members_name || !template_name || !template_id || !business_number || !members_number) {
                return res.status(400).json({ error: 'Missing required fields or incorrect data format' });
            }

            let member = {
                Name: members_name,
                Number: members_number
            };

            // Initialize models with tenant-specific configurations (only once)
            wh_Setting.init(req.userinfo.tenantcode);
            msgTemplate.init(req.userinfo.tenantcode);
            webTemplateModel.init(req.userinfo.tenantcode);
            msgHistory.init(req.userinfo.tenantcode);

            // Fetch template data
            const templateData = await webTemplateModel.getTemplateByName(template_name, business_number);
            if (!templateData) {
                return res.status(404).json({ error: 'Template not found' });
            }

            const whatsappSettings = await wh_Setting.getWhatsAppSettingData(business_number);
            if (!whatsappSettings) {
                return res.status(500).json({ error: 'Failed to fetch WhatsApp settings' });
            }

            // Create payload for the member
            const payload = await createMessagePayload(member, templateData, req.userinfo.tenantcode, business_number);

            // Send message via WhatsApp API
            const responseBody = await webTemplateModel.sendWhatsappTemplate(payload, business_number);
            // const messageId = responseBody?.messages[0]?.id;
            // const newMessage = {
            //     parent_id: null, // Link to campaign
            //     name: member?.Name || '',
            //     message_template_id: templateData.id || null,
            //     whatsapp_number: member.Number,
            //     message: '',
            //     status: 'Outgoing',
            //     recordtypename: '',
            //     file_id: null,
            //     is_read: true,
            //     business_number: business_number,
            //     message_id: messageId
            // };

            // await msgHistory.createMessageHistoryRecord(newMessage, req.userinfo.id);
            res.status(200).json({ success: true, responseBody });

        } catch (error) {
            console.error("Error processing campaign:", error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });


    async function createMessagePayload(member, templateData, tenants, business_number, documentId) {

        const { name: templateName, language, components, category } = templateData.data[0];
         
        // const recipientId = member.Number;
        let recipientId = member.Number;
        if (recipientId.length === 10) {
            recipientId = `91${recipientId}`;
        }


        // Construct message payload
        let payload = {
            messaging_product: 'whatsapp',
            recipient_type: "individual",
            to: recipientId,
            type: "template",
            // category: templateData.data[0].category,
            template: {
                name: templateName,
                language: {
                    code: language
                },
                components: []
            }
        };

        // Check for HEADER component (image/video/document)
        const headerComponent = components.find(component => component.type === "HEADER");
        let headerData = { type: "HEADER", parameters: [] };
         
         

        if (headerComponent) {

            if (headerComponent.format && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComponent.format)) {
                if (documentId) {
                    headerData.parameters.push({
                        type: headerComponent.format.toLowerCase(),
                        [headerComponent.format.toLowerCase()]: { id: documentId }  // Add media document ID
                    });
                }
            }
        }
        payload.template.components.push(headerData);


        let bodyData = { type: "body", parameters: [] };

        const bodyComponent = components.find(component => component.type === "BODY");
        if (bodyComponent) {
            const bodyParams = member.body_param && typeof member.body_param === "object" ? member.body_param : {};
            const hasPlaceholders = bodyComponent.text && bodyComponent.text.includes("{{");
            if (category !== "AUTHENTICATION" && hasPlaceholders) {
                bodyData.parameters = Object.keys(bodyParams)
                    .sort((a, b) => a - b)  // Sort numerical keys for correct order
                    .map(key => ({ type: "text", text: bodyParams[key] })); // Use indexed parameters

            } else if (category === "AUTHENTICATION") {
                bodyData.parameters.push({
                    type: "text",
                    text: Object.values(bodyParams)[0]  // Get first value from body_param
                });
            }
            if (category === "AUTHENTICATION") {
                payload.template.components.push({
                    type: "button",
                    sub_type: "url",
                    index: 0,
                    parameters: [
                        { type: "text", text: Object.values(member.body_param)[0] } // Ensure correct text value
                    ]
                });
            }
        }
        payload.template.components.push(bodyData);


         

        return payload;
    }


    router.post('/upload_whatsapp_media', fetchUser, checkModuleAccess("whatsapp_messenger"), async (req, res) => {
        try {
            const { whatsapp_setting_number } = req.query;

            if (!whatsapp_setting_number) {
                return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
            }
            const { header, header_body } = req.body;

            if (!header || !header_body) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const mediaId = await sendbulkmsg.uploadWhatsAppMedia(header, header_body, req.userinfo.tenantcode, whatsapp_setting_number);

            if (!mediaId) {
                return res.status(500).json({ error: 'Failed to upload media' });
            }

            res.status(200).json({ documentId: mediaId });
        } catch (error) {
            console.error('Error in upload-whatsapp-media route:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });




    app.use(process.env.BASE_API_URL + '/api/webhook_template', router);
};
