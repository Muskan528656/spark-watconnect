/**
 * @author      Muskan Khan
 * @date        June,2025
 * @copyright   www.ibirdsservices.com
 */

const e = require("express");
const { fetchUser } = require("../../middleware/fetchuser.js");
const msgHistory = require("../../models/watconnect/messagehistory.model.js");

module.exports = app => {
    const { body, validationResult } = require('express-validator');
    var router = require("express").Router();

    router.get("/message/history/:id", fetchUser, async (req, res) => {

        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }

        msgHistory.init(req.userinfo.tenantcode);

        const result = await msgHistory.getMessageHistoryRecords(req.params.id, whatsapp_setting_number);

        if (result) {
            res.status(200).json({ success: true, records: result });
        } else {
            res.status(200).json({ success: false, errors: "Record does not exist." });
        }
    });

    router.post("/message/history", fetchUser, async (req, res) => {

        msgHistory.init(req.userinfo.tenantcode);
        const result = await msgHistory.createMessageHistoryRecord(req.body, req.userinfo.id);
        if (result) {
            res.status(200).json(result);
        } else {
            res.status(400).json({ errors: "Bad request" });
        }
    });

    router.get("/message/percentage/:id", fetchUser, async (req, res) => {
        msgHistory.init(req.userinfo.tenantcode);

        const result = await msgHistory.getMessageHistoryStatsByCampaignId(req.params.id);
        if (result) {
            res.status(200).json({ success: true, records: result });
        } else {
            res.status(200).json({ success: false, errors: "Record does not exist." });
        }
    });

    //  message history records by delevery status
    router.get("/message/status", fetchUser, async (req, res) => {
        const { id, status } = req.query;
        msgHistory.init(req.userinfo.tenantcode);

        const result = await msgHistory.getMsgByStatus(id, status);
        if (result) {
            res.status(200).json({ success: true, records: result });
        } else {
            res.status(200).json({ success: false, errors: "Record does not exist." });
        }
    });


    // campaign message history download
    router.get("/message/history/download/:id", fetchUser, async (req, res) => {
        msgHistory.init(req.userinfo.tenantcode);

        const result = await msgHistory.getMHRecordsByCampaignId(req.params.id);
        if (result) {
            res.status(200).json({ success: true, records: result });
        } else {
            res.status(200).json({ success: false, errors: "Record does not exist." });
        }
    });

    router.get("/group/message/history/:id", fetchUser, async (req, res) => {


        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }

        msgHistory.init(req.userinfo.tenantcode);

        const result = await msgHistory.getGroupHistoryRecords(req.params.id, whatsapp_setting_number);

        if (result) {
            res.status(200).json({ success: true, records: result });
        } else {
            res.status(200).json({ success: false, errors: "Record does not exist." });
        }
    });


    // ................................ Delete Msg History ................................
    router.delete("/history/:number", fetchUser, async (req, res) => {

        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }
        msgHistory.init(req.userinfo.tenantcode);
        const result = await msgHistory.deleteMsgHistory(req.params.number, whatsapp_setting_number);

        if (!result)
            return res.status(200).json({ "success": false, "message": "No record found" });
        res.status(200).json({ "success": true, "message": "Successfully Deleted" });
    });

    router.delete("/historydeletebyid", fetchUser, async (req, res) => {
        try {
            const { ids } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ success: false, message: "Provide an array of valid IDs" });
            }

            msgHistory.init(req.userinfo.tenantcode);
            const result = await msgHistory.deleteMsgHistoryByIds(ids);

            if (!result) {
                return res.status(200).json({ success: false, message: "No records found for the given IDs" });
            }

            res.status(200).json({ success: true, message: "Successfully Deleted" });

        } catch (error) {
            console.error("Error deleting message history:", error);
            res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    });


    app.use(process.env.BASE_API_URL + '/api/whatsapp', router);
};
