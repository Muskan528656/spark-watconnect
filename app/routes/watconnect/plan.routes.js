/**
 * @author     Muskan Khan
 * @date        July, 2025
 * @copyright   www.ibirdsservices.com
 */

const e = require("express");
const planModel = require("../../models/watconnect/plan.model.js");
const { fetchUser } = require("../../middleware/fetchuser.js");

module.exports = (app) => {
  const { body, validationResult } = require("express-validator");
  var router = require("express").Router();

  // updated by yamini
  router.get("/", async (req, res) => {
    const { status } = req.query;
    try {
      const records = await planModel.getAllRecords(status);
      if (records && records.length > 0) {
        const formattedRecords = records.map((record) => {
          const priceFields = {};
          (record.prices || []).forEach((price) => {
            if (price.billing_cycle && price.price !== undefined) {
              // map billing_cycle values to your desired keys
              switch (price.billing_cycle) {
                case "monthly":
                  priceFields.price_per_month = price.price;
                  break;
                case "quarterly":
                  priceFields.price_per_quarterly = price.price;
                  break;
                case "half_yearly":
                  priceFields.price_per_half_yearly = price.price;
                  break;
                case "yearly":
                  priceFields.price_per_year = price.price;
                  break;
                default:
                  // optionally add any other cycles or ignore
                  break;
              }
            }
          });

          return {
            plan_info: {
              id: record.plan_id,
              name: record.plan_name,
              status: record.status,
              number_of_whatsapp_setting: record.number_of_whatsapp_setting,
              number_of_users: record.number_of_users,
              msg_limits: record.msg_limits,
              ...priceFields,
            },
            plan_modules: record.modules || [],
          };
        });

        res.status(200).json({ success: true, records: formattedRecords });
      } else {
        res.status(200).json({ success: false, message: "No plans found." });
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  });

  router.get("/active/", fetchUser, async (req, res) => {
    const plan = await planModel.fetchActiveRecords();
    if (plan) {
      res.status(200).json(plan);
    } else {
      res.status(200).json({ errors: "No data" });
    }
  });

  //   ---------------------Get By Id---------------------------
  router.get("/:id", fetchUser, async (req, res) => {
    try {
      const id = req.params.id;
      planModel.init(req.userinfo.tenantcode);
      const result = await planModel.findByPlanId(id);
      if (result) {
        res.status(200).json(result);
      } else {
        res.status(200).json({ errors: "Plan not found" });
      }
    } catch (error) {
      res.status(500).json({ errors: "Internal server error" });
    }
  });

  // updated by yamini
  router.post("/", fetchUser, async (req, res) => {
    const { plan_info, plan_modules } = req.body;
    if (!plan_info || typeof plan_info !== "object") {
      return res.status(400).json({ errors: ["plan_info object is required"] });
    }
    const {
      name,
      status,
      price_per_month,
      price_per_quarterly,
      price_per_half_yearly,
      price_per_year,
      number_of_whatsapp_setting,
      number_of_users,
      msg_limits,
    } = plan_info;

    const errors = [];
    if (!name) errors.push("Name is required.");
    if (!status) errors.push("Status is required.");
    if (!number_of_whatsapp_setting)
      errors.push("Number of WhatsApp settings is required.");
    if (!Array.isArray(plan_modules) || plan_modules.length === 0) {
      errors.push("At least one module must be selected.");
    }

    if (errors.length > 0) {
      return res.status(200).json({ errors });
    }

    try {
      planModel.init(req.userinfo.tenantcode);
      const result = await planModel.createRecord(plan_info, plan_modules);

      if (result) {
        res.status(200).json({ success: true, records: result });
      } else {
        res
          .status(400)
          .json({ success: false, errors: ["Failed to insert the plan."] });
      }
    } catch (error) {
      console.error("Error inserting plan:", error);
      res
        .status(500)
        .json({ success: false, errors: ["Internal Server Error"] });
    }
  });

  // updated by yamini
  router.put("/:id", fetchUser, async (req, res) => {
    const { plan_info, plan_modules } = req.body;
    if (!plan_info || typeof plan_info !== "object") {
      return res.status(200).json({ errors: ["plan_info object is required"] });
    }

    const {
      name,
      status,
      number_of_whatsapp_setting,
      price_per_month,
      price_per_quarterly,
      price_per_half_yearly,
      price_per_year,
    } = plan_info;

    const errors = [];
    if (!name) errors.push("Name is required.");
    if (!status) errors.push("Status is required.");
    if (!number_of_whatsapp_setting)
      errors.push("Number of WhatsApp settings is required.");
    if (!Array.isArray(plan_modules) || plan_modules.length === 0) {
      errors.push("At least one module must be selected.");
    }
    if (
      price_per_month == null &&
      price_per_quarterly == null &&
      price_per_half_yearly == null &&
      price_per_year == null
    ) {
      errors.push("Prices is required.");
    }

    if (errors.length > 0) {
      return res.status(200).json({ errors });
    }

    try {
      planModel.init(req.userinfo.tenantcode);

      const result = await planModel.updateRecord(
        req.params.id,
        plan_info,
        plan_modules
      );

      if (result) {
        res.status(200).json({ success: true, records: result });
      } else {
        res
          .status(400)
          .json({ success: false, errors: ["Failed to update the plan."] });
      }
    } catch (error) {
      console.error("Error updating plan:", error);
      res
        .status(500)
        .json({ success: false, errors: ["Internal Server Error"] });
    }
  });

  // delete record
  router.delete("/:id", fetchUser, async (req, res) => {
    planModel.init(req.userinfo.tenantcode);
    const result = await planModel.deleteRecord(req.params.id);
    if (result)
      return res
        .status(200)
        .json({ success: true, message: "Record Successfully Deleted." });

    res.status(400).json({ success: false, message: "Bad request." });
  });

  app.use(process.env.BASE_API_URL + "/api/whatsapp/plan", router);
};
