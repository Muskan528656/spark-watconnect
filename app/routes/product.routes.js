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
const Product = require("../models/product.model.js");
const permissions = require("../constants/permissions.js");

module.exports = app => {
  const { body, validationResult } = require('express-validator');
  var router = require("express").Router();

  // .....................................Get All products........................................
  router.get("/", fetchUser, async (req, res) => {
    Product.init(req.userinfo.tenantcode);
    const products = await Product.findAll(req.userinfo);

    if (products) {
      res.status(200).json(products);
    } else {
      res.status(400).json({ errors: "No data" });
    }

  });

  // Create a new Product
  router.post("/", fetchUser, [
  ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      Product.init(req.userinfo.tenantcode);
      const productRec = await Product.create(req.body, req.userinfo.id);
      if (!productRec) {
        return res.status(400).json({ errors: "Bad Request" });
      }
      return res.status(201).json(productRec);
    });

  //......................................Get product by Id.................................
  router.get("/:id", fetchUser, async (req, res) => {
    try {
      Product.init(req.userinfo.tenantcode);
      let resultCon = await Product.findById(req.params.id);
      //// 
      if (resultCon) {
        return res.status(200).json(resultCon);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      } 
    } catch (error) {
      return res.status(400).json({ "success": false, "message": error });
    }
  });

  //......................................Update Product.................................
  router.put("/:id", fetchUser, async (req, res) => {
    try {
      const { productname, productcode, category, subcategory, description, gst, isdeleted, unitcount } = req.body;
      const errors = [];
      const prodRec = {};
      if (req.body.hasOwnProperty("productname")) { prodRec.productname = productname; }; if (!productname) { errors.push('productname is required') }
      if (req.body.hasOwnProperty("productcode")) { prodRec.productcode = productcode; }; if (!productname) { errors.push('productname is required') }
      if (req.body.hasOwnProperty("category")) { prodRec.category = category; };
      if (req.body.hasOwnProperty("subcategory")) { prodRec.subcategory = subcategory };
      if (req.body.hasOwnProperty("description")) { prodRec.description = description };
      if (req.body.hasOwnProperty("gst")) { prodRec.gst = gst };
      if (req.body.hasOwnProperty("isdeleted")) { prodRec.isdeleted = isdeleted };
      if (req.body.hasOwnProperty("unitcount")) { prodRec.unitcount = unitcount };

      if (errors.length !== 0) {
        return res.status(400).json({ errors: errors });
      }
      Product.init(req.userinfo.tenantcode);
      let resultCon = await Product.findById(req.params.id);
      if (resultCon) {
        resultCon = await Product.updateById(req.params.id, prodRec, req.userinfo.id);
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
    Product.init(req.userinfo.tenantcode);
    const result = await Product.deleteProduct(req.params.id);
    if (!result)
      return res.status(200).json({ "success": false, "message": "No record found" });
    res.status(400).json({ "success": true, "message": "Successfully Deleted" });
  });
  app.use(process.env.BASE_API_URL + '/api/products', router);
};
/* End updated by Pooja Vaishnav */ 