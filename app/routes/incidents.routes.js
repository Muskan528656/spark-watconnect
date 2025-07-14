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
const Incident = require("../models/incident.model.js");
const permissions = require("../constants/permissions.js");

module.exports = app => {
  const { body, validationResult } = require('express-validator');
  var router = require("express").Router();
  // ................................ Create a new incident ................................
  router.post("/", fetchUser, [
  ],

    async (req, res) => {
      Incident.init(req.userinfo.tenantcode);
      const incidentRec = await Incident.create(req.body, req.userinfo.id);
      if (!incidentRec) {
        return res.status(400).json({ errors: "Bad Request" });
      }
      res.status(201).json(incidentRec);

      let newIncident = await Incident.findById(incidentRec.id);
    });

  // .....................................Get All incident........................................
  router.get("/", fetchUser, async (req, res) => {
    Incident.init(req.userinfo.tenantcode);
    ////
    console.log("incnnc->",req.userinfo.tenantcode);
    const incidents = await Incident.findAll(req.userinfo);

    if (incidents) {
      res.status(200).json(incidents);
    } else {
      res.status(400).json({ errors: "No data" });
    }

  });

  //......................................Get incident by Id.................................
  router.get("/:id", fetchUser, async (req, res) => {
    try {
      Incident.init(req.userinfo.tenantcode);
      let resultCon = await Incident.findById(req.params.id);
      if (resultCon) {
        return res.status(200).json(resultCon);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      return res.status(400).json({ "success": false, "message": error });
    }
  });

  //......................................Update Incident.................................
  router.put("/:id", fetchUser, async (req, res) => {
    ////
    try {
      ////
      Incident.init(req.userinfo.tenantcode);

      const { subject, description, priority, status, origin, contactid, productid, ownerid } = req.body;
      const errors = [];
      const incRec = {};
      if (req.body.hasOwnProperty("subject")) { incRec.subject = subject; };
      if (req.body.hasOwnProperty("priority")) { incRec.priority = priority; };
      if (req.body.hasOwnProperty("status")) { incRec.status = status; };
      if (req.body.hasOwnProperty("origin")) { incRec.origin = origin; };
      if (req.body.hasOwnProperty("contactid")) { incRec.contactid = contactid; };
      if (req.body.hasOwnProperty("productid")) { incRec.productid = productid; };
      if (req.body.hasOwnProperty("ownerid")) { incRec.ownerid = ownerid; };
      if (req.body.hasOwnProperty("description")) { incRec.description = description; };

      if (errors.length !== 0) {
        return res.status(400).json({ errors: errors });
      }
      ////
      let resultCon = await Incident.findById(req.params.id);
      ////
      if (resultCon) {
        ////
        resultCon = await Incident.updateById(req.params.id, incRec, req.userinfo.id);
        if (resultCon) {
          ////
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
    Incident.init(req.userinfo.tenantcode);
    const result = await Incident.deleteIncident(req.params.id);
    if (!result)
      return res.status(200).json({ "success": false, "message": "No record found" });
    res.status(400).json({ "success": true, "message": "Successfully Deleted" });
  });
  app.use(process.env.BASE_API_URL + '/api/incidents', router);
};

/* End updated by Pooja Vaishnav */
