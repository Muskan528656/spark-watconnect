/**
 * @author      Muskan Khan
 * @date        9 June 2024
 * @copyright   www.ibirdsservices.com
 */

const e = require("express");
const { fetchUser, checkModuleAccess } = require("../../middleware/fetchuser.js");
const msgTemplate = require("../../models/watconnect/messagetemplate.model.js");

module.exports = app => {
    const { body, validationResult } = require('express-validator');
    var router = require("express").Router();
    // ------------------Insert Record In DB Marketing And Utility Template-------------------------
    router.post(
        "/message/template",
        fetchUser,
        checkModuleAccess("whatsapp_template"),
        async (req, res) => {
            try {
                msgTemplate.init(req.userinfo.tenantcode);


                const findRecs = await msgTemplate.findRecord(req.body);

                if (findRecs) {

                    const {
                        id,
                        name,
                        language,
                        category,
                        header,
                        header_body,
                        message_body,
                        example_body_text,
                        footer,
                        buttons,
                        business_number,
                    } = req.body;

                    const obj = {
                        template_id: id,
                        template_name: name,
                        language,
                        category,
                        header,
                        header_body,
                        message_body,
                        example_body_text,
                        footer,
                        buttons: JSON.stringify(buttons),
                        business_number,
                    };




                    const updatedRecord = await msgTemplate.updateById(
                        findRecs.id,
                        obj,
                        req.userinfo.id
                    );


                    return res.status(200).json(updatedRecord);
                } else {


                    const result = await msgTemplate.createRecords(
                        req.body,
                        req.userinfo.id
                    );



                    if (result) {
                        return res.status(200).json(result);
                    } else {
                        return res.status(400).json({ error: "Bad request" });
                    }
                }
            } catch (error) {
                console.error("Error in /message/template:", error);
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    );

    // router.post("/message/template", fetchUser, checkModuleAccess("whatsapp_template"), async (req, res) => {
    //     msgTemplate.init(req.userinfo.tenantcode);
    //     const findRecs = await msgTemplate.findRecord(req.body);
    //     if (findRecs) {
    //         const { id, name, language, category, header, header_body, message_body, example_body_text, footer, buttons, business_number } = req.body;
    //         const obj = {
    //             template_id: id,
    //             template_name: name,
    //             language: language,
    //             category: category,
    //             header: header,
    //             header_body: header_body,
    //             message_body: message_body,
    //             example_body_text: example_body_text,
    //             footer: footer,
    //             buttons: JSON.stringify(buttons),
    //             business_number: business_number
    //         }
    //         const updatedRecord = await msgTemplate.updateById(findRecs.id, obj, req.userinfo.id);
    //         res.status(200).json(updatedRecord);
    //     }
    //     else {
    //          
    //         const result = await msgTemplate.createRecords(req.body, req.userinfo.id);
    //          
    //         if (result) {
    //             res.status(200).json(result);
    //         } else {
    //             res.status(400).json({ error: "Bad request" });
    //         }
    //     }
    // });
    // ------------------------Create Record In Db Authentication Template-----------------
    router.post("/message/template/auth", fetchUser, checkModuleAccess("whatsapp_template"), async (req, res) => {
        msgTemplate.init(req.userinfo.tenantcode);
        const findRecs = await msgTemplate.findRecord(req.body);
        if (findRecs) {
            const { id, name, language, category, header, header_body, message_body, example_body_text, footer, buttons, business_number, template_id, codeexpiration, securityrecommendation, otptype } = req.body;
            const obj = {
                id: id,
                template_id: template_id,
                template_name: name,
                language: language,
                category: category,
                header: header,
                header_body: header_body,
                message_body: message_body,
                example_body_text: example_body_text,
                footer: footer,
                buttons: JSON.stringify(buttons),
                business_number: business_number,
                otptype: otptype,
                securityrecommendation: securityrecommendation,
                codeexpiration: codeexpiration,
            }

            const updatedRecord = await msgTemplate.updateById(findRecs.id, obj, req.userinfo.id);
            res.status(200).json(updatedRecord);
        }
        else {
            const result = await msgTemplate.createRecordsauthentication(req.body, req.userinfo.id);
            console.log("Result auth=>>", result);
            if (result) {
                res.status(200).json(result);
            } else {
                res.status(400).json({ error: "Bad request" });
            }
        }
    });
    // ----------------------Get Record In DB----------------------
    router.get('/alltemplate', fetchUser, async (req, res) => {

        console.log("working this api", req.userinfo.tenantcode);
        msgTemplate.init(req.userinfo.tenantcode);
        try {
            const tempResult = await msgTemplate.getTemplateRecord();
            if (tempResult) {
                return res.status(200).json(tempResult);
            } else {
                return res.status(400).json({ error: 'Bad Request' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });
    // -------------------In Db IF Template Delete Then isdeleted false and showing only true value template------------
    router.put('/delete', fetchUser, async (req, res) => {
        const { template_id } = req.body;

        if (!template_id) {
            return res.status(400).json({ error: "Template ID is required" });
        }

        try {
            msgTemplate.init(req.userinfo.tenantcode);

            const result = await msgTemplate.updateIsdelete(template_id);
            if (result) {
                return res.status(200).json({ success: true, message: "Template marked as deleted" });
            } else {
                return res.status(404).json({ error: 'Template not found' });
            }
        } catch (error) {
            console.error('Error during template deletion:', error);
            return res.status(500).json({ error: error.message });
        }
    });

    // ----------------------Update Template In DB Marketing And Utility----------------
    router.put('/updatetemplate', fetchUser, async (req, res) => {
        const { template_id } = req.body;

        if (!template_id) {
            return res.status(400).json({ error: "Template ID is required" });
        }

        try {
            msgTemplate.init(req.userinfo.tenantcode);

            const updated = await msgTemplate.updateTemplateRecord(req.body, req.userinfo.id);

            if (updated) {
                return res.status(200).json({ success: true, data: updated });
            } else {
                return res.status(404).json({ error: "Template not found or not updated" });
            }

        } catch (error) {
            console.error("Update Error:", error);
            return res.status(500).json({ error: error.message || "Internal Server Error" });
        }
    });


    app.use(process.env.BASE_API_URL + '/api/whatsapp', router);
};