/**
 * @author      Muskan Khan
 * @date        June,2025
 * @copyright   www.ibirdsservices.com
 */

const e = require("express");
const wh_Setting = require("../../models/watconnect/whatsappsetting.model.js");
const { fetchUser, checkModuleAccess } = require("../../middleware/fetchuser.js");

module.exports = app => {
    const { body, validationResult } = require('express-validator');
    var router = require("express").Router();

    // Get All Records
    router.get("/", fetchUser, checkModuleAccess("whatsapp_setting"), async (req, res) => {
        console.log("worrkrkr");
        wh_Setting.init(req.userinfo.tenantcode);
        console.log("req.userinfo.tenantcode", req.userinfo);
        const { environment } = req.query;

        const result = await wh_Setting.getAllWhatsAppSetting(req.userinfo, environment);

        if (result) {
            res.status(200).json({ 'success': true, 'record': result });
        } else {
            res.status(200).json({ 'success': false, errors: "No data" });
        }
    });

    // records create
    router.post("/", fetchUser, checkModuleAccess("whatsapp_setting"), async (req, res) => {


        const { name, app_id, access_token, business_number_id, whatsapp_business_account_id, end_point_url, phone, environment } = req.body;
        const errors = [];
        const wh_Record = {};

        if (req.body.hasOwnProperty("name")) {
            wh_Record.name = name
        }
        if (req.body.hasOwnProperty("app_id")) {
            wh_Record.app_id = app_id; if (!app_id) { errors.push('app_id is required') }
        };
        if (req.body.hasOwnProperty("access_token")) {
            wh_Record.access_token = access_token; if (!access_token) { errors.push('access_token is required') }
        };
        if (req.body.hasOwnProperty("business_number_id")) {
            wh_Record.business_number_id = business_number_id; if (!business_number_id) { errors.push('business_number_id is required') }
        };
        if (req.body.hasOwnProperty("whatsapp_business_account_id")) {
            wh_Record.whatsapp_business_account_id = whatsapp_business_account_id; if (!whatsapp_business_account_id) { whatsapp_business_account_id; errors.push('whatsapp_business_account_id is required') }
        };
        if (req.body.hasOwnProperty("end_point_url")) {
            wh_Record.end_point_url = end_point_url; if (!end_point_url) { end_point_url; errors.push('end_point_url is required') }
        };
        if (req.body.hasOwnProperty("phone")) {
            wh_Record.phone = phone; if (!phone) { phone; errors.push('Phone is required') }
        };
        if (req.body.hasOwnProperty("environment")) {
            wh_Record.environment = environment;
        }

        if (errors.length !== 0) {
            return res.status(400).json({ errors: errors });
        }
        wh_Setting.init(req.userinfo.tenantcode);

        // const currentWhatsAppSettingsCount = await wh_Setting.getCount();
        // const allowedWhatsAppSettings = req.userinfo.plan.number_of_whatsapp_setting;
        // if (currentWhatsAppSettingsCount >= allowedWhatsAppSettings) {
        //     return res.status(400).json({
        //         success: false,
        //         message: `You’ve reached the limit of ${allowedWhatsAppSettings} WhatsApp settings. Please upgrade your plan to add more.`
        //     });
        // }


        const company_id = req.userinfo?.companyid;

        const result = await wh_Setting.createRecord(req.body, req.userinfo.id, company_id);
        if (result) {
            res.status(200).json({ success: true, records: result });
        } else {
            res.status(400).json({ success: false, errors: "Bad request" });
        }
    });

    router.put("/:id", fetchUser, checkModuleAccess("whatsapp_setting"), async (req, res) => {
        try {
            const { name, app_id, access_token, business_number_id, whatsapp_business_account_id, end_point_url, phone, environment } = req.body;
            const errors = [];
            const wh_Record = {};

            if (req.body.hasOwnProperty("name")) {
                wh_Record.name = name
            }
            if (req.body.hasOwnProperty("app_id")) {
                wh_Record.app_id = app_id; if (!app_id) { errors.push('app_id is required') }
            };
            if (req.body.hasOwnProperty("access_token")) {
                wh_Record.access_token = access_token; if (!access_token) { errors.push('access_token is required') }
            };
            if (req.body.hasOwnProperty("business_number_id")) {
                wh_Record.business_number_id = business_number_id; if (!business_number_id) { errors.push('business_number_id is required') }
            };
            if (req.body.hasOwnProperty("whatsapp_business_account_id")) {
                wh_Record.whatsapp_business_account_id = whatsapp_business_account_id; if (!whatsapp_business_account_id) { whatsapp_business_account_id; errors.push('whatsapp_business_account_id is required') }
            };
            if (req.body.hasOwnProperty("end_point_url")) {
                wh_Record.end_point_url = end_point_url; if (!end_point_url) { end_point_url; errors.push('end_point_url is required') }
            };
            if (req.body.hasOwnProperty("phone")) {
                wh_Record.phone = phone; if (!phone) { phone; errors.push('Phone is required') }
            };

            if (req.body.hasOwnProperty("environment")) {
                wh_Record.environment = environment;
            }

            if (errors.length !== 0) {
                return res.status(400).json({ errors: errors });
            }


            wh_Setting.init(req.userinfo.tenantcode);
            let result = await wh_Setting.findById(req.params.id);
            if (result) {
                result = await wh_Setting.updateById(req.params.id, wh_Record, req.userinfo.id);
                if (result) {
                    return res.status(200).json({ "success": true, message: "Record updated successfully" });
                }
            } else {
                return res.status(200).json({ "success": false, "message": "No record found" });
            }
        } catch (error) {
            res.status(400).json({ errors: error });
        }
    });


    router.put('/activate/:setting_id', fetchUser, checkModuleAccess("whatsapp_setting"), async (req, res) => {
        const { setting_id } = req.params;
        try {

            wh_Setting.init(req.userinfo.tenantcode);
            const result = await wh_Setting.updateSettingStatus(setting_id, req.userinfo.id);
            if (result && result.rowCount > 0) {
                res.status(200).json({ success: true, message: 'updated successfully' });
            } else {
                res.status(404).json({ success: false, message: 'Setting not found' });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    });

    router.get("/billing-cost/:setting_number/:start/:end", fetchUser, checkModuleAccess("billing"), async (req, res) => {

        await wh_Setting.init(req.userinfo.tenantcode);
        const { setting_number, start, end } = req.params;

        try {
            const response = await wh_Setting.getWhatsupBillingCost(setting_number, start, end);
            let result = response?.conversation_analytics?.data[0]?.data_points || [];
            if (result.length) {
                return res.status(200).json({ success: true, result });
            } else {
                return res.status(200).json({ success: false, message: 'No Billing Data Found' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });

    // router.get("/templateprice/:template_id/:setting_number/:start/:end", fetchUser, checkModuleAccess("whatsapp_template"), async (req, res) => {

    //     await wh_Setting.init(req.userinfo.tenantcode);
    //     const { setting_number, start, end, template_id } = req.params;
    //      
    //      
    //      
    //      
    //     try {
    //         const response = await wh_Setting.getTemplateBillingCost(template_id, setting_number, start, end);
    //          
    //         //let result = response?.data[0]?.data_points || [];
    //         let result = response?.data?.flatMap(item => item.data_points) ?? [];
    //         if (result.length) {
    //             return res.status(200).json({ success: true, result });
    //         } else {

    //             return res.status(200).json({ success: false, message: 'Bad Request: Missing WhatsApp settings or data' });
    //         }
    //     } catch (error) {
    //         console.error('Error during message sending:', error);
    //         return res.status(500).json({ error: error.message });
    //     }
    // });

    router.get("/templateprice/:template_id/:setting_number/:start/:end", fetchUser, checkModuleAccess("whatsapp_template"), async (req, res) => {


        await wh_Setting.init(req.userinfo.tenantcode);
        const { setting_number, start, end, template_id } = req.params;

        try {
            const response = await wh_Setting.getTemplateBillingCost(template_id, setting_number, start, end);
            //let result = response?.data[0]?.data_points || [];
            let result = response?.data?.flatMap(item => item.data_points) ?? [];

            if (result.length) {
                return res.status(200).json({ success: true, result });
            } else {

                return res.status(200).json({ success: false, message: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });
    app.use(process.env.BASE_API_URL + '/api/whatsapp_setting', router);
};
