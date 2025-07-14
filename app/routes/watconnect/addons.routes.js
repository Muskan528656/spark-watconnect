/**
 * @author      Yamini Mishra
 * @date        May, 2025
 * @copyright   www.ibirdsservices.com
 */

const e = require("express");
const { fetchUser, checkModuleAccess } = require("../../middleware/fetchuser.js");
const AddonModel = require("../../models/watconnect/addons.model.js");
const fileModel = require("../../models/watconnect/file.model.js");
const path = require("path");
const fs = require("fs");

module.exports = (app) => {
  const { body, validationResult } = require("express-validator");
  var router = require("express").Router();

  router.get("/:?", async (req, res) => {
    const { status } = req.query;
    try {
      const records = await AddonModel.getRecords(status);
      if (records) {
        res.status(200).json({ success: true, records: records });
      } else {
        res.status(200).json({ success: false, message: "No records found." });
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  });

  router.post("/", fetchUser, async (req, res) => {
    const { name, unit, features, pricing } = req.body;
    const errors = [];
    if (!name) {
      errors.push("Name is required.");
    }
    if (!unit) {
      errors.push("Unit is required.");
    }
    if (!Array.isArray(pricing) || pricing.length === 0) {
      errors.push("Pricing information is required and must be an array.");
    } else {
      pricing.forEach((price, index) => {
        if (!price.billing_cycle || !price.price_per_unit) {
          errors.push(
            `Pricing at index ${index} must contain both billing_cycle and price_per_unit.`
          );
        }
      });
    }
    if (errors.length > 0) {
      return res.status(400).json({ errors: errors });
    }
    const featureAddonsnRecord = {
      name,
      unit,
      features: JSON.stringify(features),
      pricing,
    };
    try {
      AddonModel.init(req.userinfo.tenantcode);
      const result = await AddonModel.createRecord(
        featureAddonsnRecord,
        req.userinfo.id
      );
      if (result) {
        res.status(200).json({ success: true, record: result });
      } else {
        res
          .status(400)
          .json({ success: false, errors: "Failed to create record." });
      }
    } catch (error) {
      console.log("##ERROR", error);
      res
        .status(500)
        .json({ success: false, errors: "Internal server error." });
    }
  });

  router.put("/:id", fetchUser, async (req, res) => {
    const { name, unit, features, pricing } = req.body;
    const { id } = req.params;
    const errors = [];
    if (!name) {
      errors.push("Name is required.");
    }
    if (!unit) {
      errors.push("Unit is required.");
    }
    if (!Array.isArray(pricing) || pricing.length === 0) {
      errors.push("Pricing information is required and must be an array.");
    } else {
      pricing.forEach((price, index) => {
        if (!price.billing_cycle || !price.price_per_unit) {
          errors.push(
            `Pricing at index ${index} must contain both billing_cycle and price_per_unit.`
          );
        }
      });
    }
    if (errors.length > 0) {
      return res.status(400).json({ errors: errors });
    }
    const featureAddon = {
      id,
      name,
      unit,
      features: JSON.stringify(features),
      pricing,
    };
    try {
      AddonModel.init(req.userinfo.tenantcode);
      const result = await AddonModel.updateRecord(
        featureAddon,
        req.userinfo.id
      );
      if (result) {
        res.status(200).json({ success: true, record: result });
      } else {
        res
          .status(400)
          .json({ success: false, errors: "Failed to update record." });
      }
    } catch (error) {
      console.error("Error updating addon:", error);
      res
        .status(500)
        .json({ success: false, errors: "Internal server error." });
    }
  });

  router.delete("/:id", fetchUser, async (req, res) => {
    AddonModel.init(req.userinfo.tenantcode);
    const result = await AddonModel.deleteRecord(req.params.id);
    if (result)
      return res
        .status(200)
        .json({ success: true, message: "Record Successfully Deleted." });

    res.status(400).json({ success: false, message: "Bad request." });
  });

  app.use(process.env.BASE_API_URL + "/api/whatsapp/addons", router);
};
