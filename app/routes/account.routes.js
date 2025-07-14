/**
 * Handles all incoming request for /api/accounts endpoint
 * DB table for this public.account
 * Model used here is account.model.js
 * SUPPORTED API ENDPOINTS
 *              GET     /api/accounts
 *              GET     /api/accounts/:id
 *              POST    /api/accounts
 *              PUT     /api/accounts/:id
 *              DELETE  /api/accounts/:id
 * 
 * @author      Aslam Bari
 * @date        Feb, 2023
 * @copyright   www.ibirdsservices.com  
 */

const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const Account = require("../models/account.model.js");
const permissions = require("../constants/permissions.js");

module.exports = app => {


  const { body, validationResult } = require('express-validator');

  var router = require("express").Router();

  // ................................ Create a new Account ................................
  router.post("/", fetchUser, [
    body('name', 'Please enter Name').isLength({ min: 1 }),
    body('phone', 'Please enter valid phone (10 digit)').isLength({ min: 10 })
  ],

    async (req, res) => {
      //Check permissions
      // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_ACCOUNT
      //   || el.name === permissions.MODIFY_ALL
      //   || el.name === permissions.VIEW_ALL);

      // if (!permission) return res.status(401).json({ errors: "Unauthorized" });
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      Account.init(req.userinfo.tenantcode);
      const accountRec = await Account.create(req.body, req.userinfo.id);

      if (!accountRec) {
        return res.status(400).json({ errors: "Bad Request" });
      }

      return res.status(201).json(accountRec);

    });

  // .....................................Get All accounts........................................
  router.get("/", fetchUser, async (req, res) => {
    //Check permissions
    // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_ACCOUNT
    //   || el.name === permissions.MODIFY_ALL
    //   || el.name === permissions.VIEW_ALL);

    // if (!permission) return res.status(401).json({errors : "Unauthorized"});

    Account.init(req.userinfo.tenantcode);
    const accounts = await Account.findAll();
    if (accounts) {
      res.status(200).json(accounts);
    } else {
      res.status(400).json({ errors: "No data" });
    }

  });

  //......................................Get account by Id.................................
  router.get("/:id", fetchUser, async (req, res) => {
    try {
      // //Check permissions
      // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_ACCOUNT
      //   || el.name === permissions.MODIFY_ALL
      //   || el.name === permissions.VIEW_ALL);

      // if (!permission) return res.status(401).json({ errors: "Unauthorized" });
      Account.init(req.userinfo.tenantcode);
      let resultCon = await Account.findById(req.params.id);
      if (resultCon) {
        return res.status(200).json(resultCon);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      return res.status(400).json({ "success": false, "message": error });
    }
  });

  // .....................................Get Count of Accounts........................................
  router.get("/cnt", fetchUser, async (req, res) => {
    //Check permissions
    //// 
    // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_ACCOUNT
    //   || el.name === permissions.MODIFY_ALL
    //   || el.name === permissions.VIEW_ALL);

    // if (!permission) return res.status(401).json({ errors: "Unauthorized" });

    Account.init(req.userinfo.tenantcode);
    const accounts = await Account.getTotalAccounts();
    if (accounts) {
      res.status(200).json(accounts);
    } else {
      res.status(400).json({ errors: "No data" });
    }

  });

  //......................................Update Account.................................
  router.put("/:id", fetchUser, async (req, res) => {
    try {
      //Check permissions
      // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_ACCOUNT
      //   || el.name === permissions.MODIFY_ALL
      //   || el.name === permissions.VIEW_ALL);

      // if (!permission) return res.status(401).json({ errors: "Unauthorized" });

      const { name, website, street, city, state, country, pincode, phone, email, lastmodifiedbyid } = req.body;
      const errors = [];
      const accountRec = {};
      if (req.body.hasOwnProperty("name")) { accountRec.name = name; if (!name) { errors.push('Account Name is required') } };
      if (req.body.hasOwnProperty("website")) { accountRec.website = website; if (!website) { errors.push('Website is required') } };
      if (req.body.hasOwnProperty("street")) { accountRec.street = street };
      if (req.body.hasOwnProperty("city")) { accountRec.city = city };
      if (req.body.hasOwnProperty("state")) { accountRec.state = state };
      if (req.body.hasOwnProperty("country")) { accountRec.country = country };
      if (req.body.hasOwnProperty("pincode")) { accountRec.pincode = pincode };
      if (req.body.hasOwnProperty("phone")) { accountRec.phone = phone; if (!phone) { phone; errors.push('Phone is required') } };
      if (req.body.hasOwnProperty("email")) { accountRec.email = email };

      if (errors.length !== 0) {
        return res.status(400).json({ errors: errors });
      }
      Account.init(req.userinfo.tenantcode);
      let resultCon = await Account.findById(req.params.id);
      if (resultCon) {
        resultCon = await Account.updateById(req.params.id, accountRec, req.userinfo.id);
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
    // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_ACCOUNT
    //   || el.name === permissions.MODIFY_ALL
    //   || el.name === permissions.VIEW_ALL);

    // if (!permission) return res.status(401).json({ errors: "Unauthorized" });

    Account.init(req.userinfo.tenantcode);
    const result = await Account.deleteAccount(req.params.id);
    if (!result)
      return res.status(200).json({ "success": false, "message": "No record found" });

    res.status(400).json({ "success": true, "message": "Successfully Deleted" });
  });


  //......................................Get Contact by AccountId.................................
  router.get("/:id/contacts", fetchUser, async (req, res) => {
    try {
      //Check permissions
      // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_CONTACT
      //   || el.name === permissions.MODIFY_ALL
      //   || el.name === permissions.VIEW_ALL);

      // if (!permission) return res.status(401).json({ errors: "Unauthorized" });
      Account.init(req.userinfo.tenantcode);
      let resultCon = await Account.findContactByAccountId(req.params.id);
      if (resultCon) {
        return res.status(200).json(resultCon);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      return res.status(400).json({ "success": false, "message": error });
    }
  });

  // Delete all Tutorials
  //router.delete("/", Accounts.deleteAll);

  app.use(process.env.BASE_API_URL + '/api/accounts', router);
};
