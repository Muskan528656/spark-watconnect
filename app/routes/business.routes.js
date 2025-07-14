/**
 * Handles all incoming request for /api/businesss endpoint
 * DB table for this public.business
 * Model used here is business.model.js
 * SUPPORTED API ENDPOINTS
 *              GET     /api/businesss
 *              GET     /api/businesss/:id
 *              POST    /api/businesss
 *              PUT     /api/businesss/:id
 *              DELETE  /api/businesss/:id
 * 
 * @author      Aslam Bari
 * @date        Feb, 2023
 * @copyright   www.ibirdsservices.com  
 */

const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const Business = require("../models/business.model.js");
const permissions = require("../constants/permissions.js");
const Mailer = require("../models/mail.model.js");
const Common = require("../models/common.model.js");

module.exports = app => {


  const { body, validationResult } = require('express-validator');

  var router = require("express").Router();

  // ................................ Create a new business ................................
  router.post("/", fetchUser, [
    body('firstname', 'Please enter First Name').isLength({ min: 1 }),
    body('lastname', 'Please enter Last Name ').isLength({ min: 1 }),
  ],

    async (req, res) => {
      //Check permissions
      // #swagger.tags = ['Businesss']
      // #swagger.path = ['/api/businesss']
      // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_LEAD
      //   || el.name === permissions.MODIFY_ALL
      //   || el.name === permissions.VIEW_ALL);

      // if (!permission) return res.status(401).json({ errors: "Unauthorized" });
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      Business.init(req.userinfo.tenantcode);
      const businessRec = await Business.create(req.body, req.userinfo.id);

      if (!businessRec) {
        return res.status(400).json({ errors: "Bad Request" });
      }
      //// 
      res.status(201).json(businessRec);

      let newBusiness = await Business.findById(businessRec.id);
      //// 

      if (newBusiness.owneremail) {
        let email = Business.prepareMailForNewBusiness(newBusiness);
        //// 
        let companyInfo = await Common.fetchCompanyInfo(req.userinfo.companyid);
        //// 
        Mailer.sendEmail(newBusiness.owneremail, email.subject, email.body, companyInfo.systememail);

        email = Business.prepareAdminMailForNewBusiness(newBusiness);
        //// 
        //// 
        Mailer.sendEmail(companyInfo.adminemail, email.subject, email.body, companyInfo.systememail);
      }



    });



  // .....................................Get All businesss........................................
  router.get("/", fetchUser, async (req, res) => {
  try {
    // 1️⃣ Get tenant schema from token
    const schema = req.userinfo.tenantcode;
    if (!schema) {
      return res.status(400).json({ error: "Tenant schema not found in token" });
    }

    console.log("✅ Using schema:", schema);

    // 2️⃣ Set schema in model
    Business.init(schema); // dynamically assign schema
    
    // 3️⃣ Fetch data from correct schema
    const businesss = await Business.findAll(req.userinfo);

    // 4️⃣ Respond
    if (businesss && businesss.length > 0) {
      res.status(200).json(businesss);
    } else {
      res.status(404).json({ error: "No business data found" });
    }
  } catch (error) {
    console.error("❌ Error in GET /business:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

  //......................................Get business by Id.................................
  router.get("/:id", fetchUser, async (req, res) => {
    try {
      //Check permissions
      // #swagger.tags = ['Businesss']
      // #swagger.path = ['/api/businesss/:id']
      // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_LEAD
      //   || el.name === permissions.MODIFY_ALL
      //   || el.name === permissions.VIEW_ALL);
      // if (!permission) return res.status(401).json({ errors: "Unauthorized" });

      Business.init(req.userinfo.tenantcode);
      let resultCon = await Business.findById(req.params.id);
      if (resultCon) {
        return res.status(200).json(resultCon);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      return res.status(400).json({ "success": false, "message": error });
    }
  });

  //......................................Get Medicaltestitem by OwnerId.................................
  router.get("/ld/:id", fetchUser, async (req, res) => {
    try {
      //Check permissions
      // #swagger.tags = ['Businesss']
      // #swagger.path = ['/api/businesss/ld/:id']
      // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_LEAD
      //   || el.name === permissions.MODIFY_ALL
      //   || el.name === permissions.VIEW_ALL);

      // if (!permission) return res.status(401).json({ errors: "Unauthorized" });
      Business.init(req.userinfo.tenantcode);
      let resultCon = await Business.findBusinessByOwnerId(req.params.id);
      if (resultCon) {
        return res.status(200).json(resultCon);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      return res.status(400).json({ "success": false, "message": error });
    }
  });


  //......................................Get Business by Account / Contact.................................
  router.get("/:id/*", fetchUser, async (req, res) => {
    try {
      //Check permissions
      // #swagger.tags = ['Businesss']
      // #swagger.path = ['/api/businesss/ld/:id']
      // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_LEAD
      //   || el.name === permissions.MODIFY_ALL
      //   || el.name === permissions.VIEW_ALL);

      // if (!permission) return res.status(401).json({ errors: "Unauthorized" });
      Business.init(req.userinfo.tenantcode);
      //// 
      let resultCon = await Business.findAllByParentId(req.params.id, req.userinfo);
      if (resultCon) {
        return res.status(200).json(resultCon);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      return res.status(400).json({ "success": false, "message": error });
    }
  });




  //......................................Update Business.................................
  router.put("/:id", fetchUser, async (req, res) => {
    try {
      //Check permissions
      // #swagger.tags = ['Businesss']
      // #swagger.path = ['/api/businesss/:id']
      // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_LEAD
      //   || el.name === permissions.MODIFY_ALL
      //   || el.name === permissions.VIEW_ALL);

      // if (!permission) return res.status(401).json({ errors: "Unauthorized" });

      //// 
      Business.init(req.userinfo.tenantcode);

      const { name, leadsource, paymentmodel, paymentterms, industry, description, ownerid, amount } = req.body;
      const errors = [];
      const businessRec = {};
      if (req.body.hasOwnProperty("name")) { businessRec.name = name; if (!name) { errors.push('Business name is required') } };
      if (req.body.hasOwnProperty("amount")) { businessRec.amount = amount; if (!amount) { errors.push('Amount is required') } };
      if (req.body.hasOwnProperty("ownerid")) { businessRec.ownerid = ownerid; if (!ownerid) { errors.push('Owner is required') } };
      if (req.body.hasOwnProperty("paymentmodel")) { businessRec.paymentmodel = paymentmodel };
      if (req.body.hasOwnProperty("paymentterms")) { businessRec.paymentterms = paymentterms };
      if (req.body.hasOwnProperty("leadsource")) { businessRec.leadsource = leadsource };
      if (req.body.hasOwnProperty("industry")) { businessRec.industry = industry };
      if (req.body.hasOwnProperty("description")) { businessRec.description = description };
      if (req.body.hasOwnProperty("amount")) { businessRec.amount = amount };
      // if(req.body.hasOwnProperty("pincode")){businessRec.pincode = pincode};
      // if(req.body.hasOwnProperty("pincode")){businessRec.pincode = pincode};

      if (errors.length !== 0) {
        return res.status(400).json({ errors: errors });
      }

      let resultCon = await Business.findById(req.params.id);
      if (resultCon) {
        //// 
        resultCon = await Business.updateById(req.params.id, businessRec, req.userinfo.id);
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
    //Check permissions
    // #swagger.tags = ['Businesss']
    // #swagger.path = ['/api/businesss/:id']
    const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_LEAD
      || el.name === permissions.MODIFY_ALL
      || el.name === permissions.VIEW_ALL);

    if (!permission) return res.status(401).json({ errors: "Unauthorized" });

    Business.init(req.userinfo.tenantcode);
    const result = await Business.deleteBusiness(req.params.id);
    if (!result)
      return res.status(200).json({ "success": false, "message": "No record found" });

    res.status(400).json({ "success": true, "message": "Successfully Deleted" });
  });

  // Delete all Tutorials
  //router.delete("/", Businesss.deleteAll);

  app.use(process.env.BASE_API_URL + '/api/businesses', router);
};
