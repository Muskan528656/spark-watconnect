/**
 * @author      Shivani Mehra
 * @date        May, 2024
 * @copyright   www.ibirdsservices.com
 */

const express = require("express");
const { body, validationResult } = require("express-validator");
const tagModel = require("../../models/watconnect/tag.model.js");
const { fetchUser } = require("../../middleware/fetchuser.js");

module.exports = app => {
    const router = express.Router();

    // GET all tags with optional status filter
    router.get("/", fetchUser, async (req, res) => {
        const { status } = req.query;
        tagModel.init(req.userinfo.tenantcode);

        try {
            const tags = await tagModel.getAllTags(status);

            if (!tags || tags.length === 0) {
                return res.status(200).json({ success: false, message: "No records found" });
            }

            res.status(200).json({ success: true, records: tags });
        } catch (err) {
            console.error("Error fetching tags:", err);
            res.status(500).json({ success: false, message: "Failed to fetch tags" });
        }
    });

    // GET tag by ID with associated rules
    router.get("/:id", fetchUser, async (req, res) => {
        const { id } = req.params;
        tagModel.init(req.userinfo.tenantcode);

        try {
            const tag = await tagModel.getTagByIdWithRules(id);

            if (!tag) {
                return res.status(200).json({ success: false, message: "Tag not found" });
            }

            res.status(200).json({ success: true, record: tag });
        } catch (err) {
            console.error("Error fetching tag by ID:", err);
            res.status(500).json({ success: false, message: "Server error" });
        }
    });

    // POST create tag with rules
    router.post(
        "/",
        fetchUser,
        [
            body("name").notEmpty().withMessage("name is required"),
            body("status").not().isEmpty().withMessage("status is required"),
            body("first_message").isIn(['Yes', 'No']).withMessage("first_message must be 'Yes' or 'No'"),
            body("auto_tag_rules").optional().isArray().withMessage("auto_tag_rules must be an array"),
            body("auto_tag_rules.*.keyword").notEmpty().withMessage("keyword is required in rule"),
            body("auto_tag_rules.*.match_type").notEmpty().withMessage("match_type is required in rule")
        ],
        async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            tagModel.init(req.userinfo.tenantcode);

            const { name } = req.body;
            const isDuplicate = await tagModel.checkDuplicateRecord(name);

            if (isDuplicate) {
                return res.status(200).json({ success: false, message: "This tag name already exists. Please choose a different name" });
            }

            const result = await tagModel.createRecordWithRules(req.body, req.userinfo.id);

            if (result.success) {
                res.status(200).json({ success: true, record: result.data });
            } else {
                res.status(200).json({ success: false, message: result.message });
            }
        }
    );

    // PUT update tag with rules
    router.put(
        "/:id",
        fetchUser,
        [
            body("name").notEmpty().withMessage("name is required"),
            body("status").not().isEmpty().withMessage("status is required"),
            body("first_message").isIn(['Yes', 'No']).withMessage("first_message must be 'Yes' or 'No'"),
            body("auto_tag_rules").optional().isArray().withMessage("auto_tag_rules must be an array"),
            body("auto_tag_rules.*.keyword").notEmpty().withMessage("keyword is required in rule"),
            body("auto_tag_rules.*.match_type").notEmpty().withMessage("match_type is required in rule")
        ],
        async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(200).json({ success: false, errors: errors.array() });
            }

            tagModel.init(req.userinfo.tenantcode);
            const { id } = req.params;

            try {
                  const { name } = req.body;
            const isDuplicate = await tagModel.checkDuplicateRecord(name, id);

            if (isDuplicate) {
                return res.status(200).json({ success: false, message: "This tag name already exists. Please choose a different name" });
            }
                const updatedTag = await tagModel.updateTagWithRules(id, req.body);

                if (updatedTag) {
                    res.status(200).json({ success: true, record: updatedTag });
                } else {
                    res.status(200).json({ success: false, message: "Tag not found or update failed" });
                }
            } catch (err) {
                console.error("Update error:", err);
                res.status(500).json({ success: false, message: "Server error" });
            }
        }
    );

    // PUT update only status of a tag
    router.put("/status/:id", fetchUser, async (req, res) => {
        const { status } = req.body;
        const tagId = req.params.id;

        if (typeof status !== "boolean") {
            return res.status(200).json({ success: false, message: "Status must be true or false" });
        }

        tagModel.init(req.userinfo.tenantcode);

        try {
            const updatedTag = await tagModel.updateTagStatus(tagId, status);

            if (updatedTag) {
                return res.status(200).json({ success: true, record: updatedTag });
            } else {
                return res.status(200).json({ success: false, message: "Tag not found or update failed" });
            }
        } catch (err) {
            console.error("Status update error:", err);
            res.status(500).json({ success: false, message: "Server error" });
        }
    });

    // Register all routes under base URL
    app.use(process.env.BASE_API_URL + "/api/whatsapp/tag", router);
};
