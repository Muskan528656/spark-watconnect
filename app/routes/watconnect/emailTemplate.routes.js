/**
 * @author      shivam shrivastava
 * @date        May, 2025
 * @copyright   www.ibirdsservices.com
 */

const { fetchUser } = require("../../middleware/fetchuser.js");
const EmailTemplate = require("../../models/watconnect/emailTemplate.model.js");

module.exports = (app) => {
  const { body, validationResult } = require("express-validator");
  var router = require("express").Router();

  // Get all email templates
  router.get("/", fetchUser, async (req, res) => {
    try {
      await EmailTemplate.init(req.userinfo.tenantcode);
      const templates = await EmailTemplate.findAll();
      res.status(200).json(templates);
    } catch (error) {
      res.status(400).json({ errors: error.message });
    }
  });

  // Get template by name
  router.get("/:name", fetchUser, async (req, res) => {
    try {
      await EmailTemplate.init(req.userinfo.tenantcode);
      const template = await EmailTemplate.findByName(req.params.name);
      if (!template) {
        return res.status(404).json({ errors: "Template not found" });
      }
      res.status(200).json(template);
    } catch (error) {
      res.status(400).json({ errors: error.message });
    }
  });

  // Create new template
  router.post(
    "/",
    fetchUser,
    [
      body("name", "Template name is required").exists(),
      body("subject", "Subject is required").exists(),
      body("body", "Body is required").exists(),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        await EmailTemplate.init(req.userinfo.tenantcode);
        const template = await EmailTemplate.create(req.body);
        res.status(201).json(template);
      } catch (error) {
        res.status(400).json({ errors: error.message });
      }
    }
  );

  // Update template
  router.put(
    "/:name",
    fetchUser,
    [
      body("subject", "Subject is required").exists(),
      body("body", "Body is required").exists(),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        await EmailTemplate.init(req.userinfo.tenantcode);
        const template = await EmailTemplate.update(req.params.name, req.body);
        if (!template) {
          return res.status(404).json({ errors: "Template not found" });
        }
        res.status(200).json(template);
      } catch (error) {
        res.status(400).json({ errors: error.message });
      }
    }
  );

  // Delete template
  router.delete("/:name", fetchUser, async (req, res) => {
    try {
      await EmailTemplate.init(req.userinfo.tenantcode);
      const template = await EmailTemplate.remove(req.params.name);
      if (!template) {
        return res.status(404).json({ errors: "Template not found" });
      }
      res.status(200).json({ message: "Template deleted successfully" });
    } catch (error) {
      res.status(400).json({ errors: error.message });
    }
  });

  app.use(process.env.BASE_API_URL + "/api/email-templates", router);
};
