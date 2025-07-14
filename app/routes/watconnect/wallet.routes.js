/**
 * @author     Muskan Khan
 * @date        July, 2025
 * @copyright   www.ibirdsservices.com
 */
const express = require("express");
const { body, validationResult } = require("express-validator");
const walletModel = require("../../models/watconnect/wallet.model.js");
const { fetchUser } = require("../../middleware/fetchuser.js");

module.exports = app => {
    const router = express.Router();

    router.post(
        "/",
        fetchUser,
        [
            body("amount").isNumeric().withMessage("Amount must be a number"),
            body("type").isIn(["credit", "debit"]).withMessage("Type must be 'credit' or 'debit'"),
            body("reason").optional().isString().withMessage("Reason must be a string"),
            body("status").optional().isIn(["paid", "unpaid"]).withMessage("Status must be 'paid' or 'unpaid'"),
            body("tenantcode").notEmpty().withMessage("Company code is required")
        ],
        async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }


            const result = await walletModel.createWalletTransaction(req.body);
            if (result.success) {
                return res.status(200).json({ success: true, transaction: result.data });
            } else {
                return res.status(200).json({ success: false, message: result.message });
            }
        }
    );

    router.get("/transactions", fetchUser, async (req, res) => {
        const tenantcode = req.userinfo.userrole === 'ADMIN' ? req.userinfo.tenantcode : null;
        const result = await walletModel.getWalletTransactions(tenantcode);
        return res.status(200).json(result);
    });

    router.get("/balance", fetchUser, async (req, res) => {
        const tenantcode = req.userinfo.userrole === 'ADMIN' ? req.userinfo.tenantcode : null;
        const result = await walletModel.getWalletBalance(tenantcode);
        return res.status(200).json(result);
    });

    router.post("/check_balance", fetchUser, async (req, res) => {
        const { amount, tenantcode } = req.body;
        if (!amount || !tenantcode) {
            return res.status(400).json({
            success: false,
            message: "Amount and tenantcode are required",
            });
        }
         const result = await walletModel.hasSufficientBalance(tenantcode, amount);
        return res.status(200).json(result);
    });


    app.use(process.env.BASE_API_URL + "/api/whatsapp/wallet", router);
};
