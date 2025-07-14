/**
 * Handles all incoming request for /api/leads endpoint
 * DB table for this public.lead
 * Model used here is lead.model.js
 * SUPPORTED API ENDPOINTS
 *              GET     /api/leads
 *              GET     /api/leads/:id
 *              POST    /api/leads
 *              PUT     /api/leads/:id
 *              DELETE  /api/leads/:id
 * 
 * @author      Aslam Bari
 * @date        Feb, 2023
 * @copyright   www.ibirdsservices.com  
 */
/* Start updated by Pooja Vaishnav */
const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const Pricebook = require("../models/pricebook.model.js");
const permissions = require("../constants/permissions.js");

module.exports = app => {
  const { body, validationResult } = require('express-validator');
  var router = require("express").Router();
     
  //......................................Get Pricebook by ProductId.................................
  router.get("/:id", fetchUser, async (req, res) => {
    try {
      Pricebook.init(req.userinfo.tenantcode);
      let resultCon = await Pricebook.findByPricebookById(req.params.id);
      if (resultCon) {
        return res.status(200).json(resultCon);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      return res.status(400).json({ "success": false, "message": error });
    }
  });
  // Create a new pricebook
  router.post("/", fetchUser, [
  ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      Pricebook.init(req.userinfo.tenantcode);
      if (req.body.active == true) {
        let resultPriceBook = await Pricebook.findByPricebookActiveId(req.body.productid);
        if (resultPriceBook) {
          return res.status(400).json({ errors: "Already exists active pricebook" });
        }
      }
      const productRec = await Pricebook.create(req.body, req.userinfo.id);
      if (!productRec) {
        return res.status(400).json({ errors: "Bad Request" });
      }
      return res.status(201).json(productRec);
    });

  //......................................Get pricebook by Id.................................
  router.get("/:id", fetchUser, async (req, res) => {
    //// 
    try {
      Pricebook.init(req.userinfo.tenantcode);
      let resultCon = await Pricebook.findById(req.params.id);
      if (resultCon) {
        return res.status(200).json(resultCon);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      return res.status(400).json({ "success": false, "message": error });
    }
  });

  //......................................Update Pricebook.................................
  router.put("/:id", fetchUser, async (req, res) => {
    try {
      const { amount, gst,active } = req.body;
      const errors = [];
      const pribook = {};
      if (req.body.hasOwnProperty("amount")) { pribook.amount = amount };
      if (req.body.hasOwnProperty("gst")) { pribook.gst = gst; };
      if (req.body.hasOwnProperty("active")) { pribook.active = active; };
      Pricebook.init(req.userinfo.tenantcode);
      if (pribook.active == true) {
        let resultPriceBook = await Pricebook.findByPricebookActiveId(req.body.productid);
        if (resultPriceBook && resultPriceBook.id !== req.body.id) {
          return res.status(400).json({ errors: "Already exists active pricebook" });
        }
      }
      let resultCon = await Pricebook.findById(req.params.id);
      if (resultCon) {
        resultCon = await Pricebook.updateById(req.params.id, pribook, req.userinfo.id);
        if (resultCon) {
          return res.status(200).json({ "success": true, "message": "Record updated successfully" });
        }
        return res.status(200).json(resultCon);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      res.status(400).json({ errors: error });
    }
  });

  // Delete a Tutorial with id
  router.delete("/:id", fetchUser, async (req, res) => {
    Pricebook.init(req.userinfo.tenantcode);
    const result = await Pricebook.deletepricebook(req.params.id);
    if (!result)
      return res.status(200).json({ "success": false, "message": "No record found" });
    res.status(400).json({ "success": true, "message": "Successfully Deleted" });
  });

  app.use(process.env.BASE_API_URL + '/api/pricebooks', router);
};
/* End updated by Pooja Vaishnav */
