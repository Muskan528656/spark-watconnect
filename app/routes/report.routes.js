const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const Report = require("../models/report.model.js");
const permissions = require("../constants/permissions.js");
const ReportBuilder = require("../models/reportbuilder.model.js")
module.exports = app => {


  const { body, validationResult } = require('express-validator');

  var router = require("express").Router();

  // ..............................Create Report..........................................
  router.post("/", fetchUser, [],

    async (req, res) => {
      //// 
      Report.init(req.userinfo.tenantcode);
      //// 
      const objRec = await Report.create(req.body, req.userinfo.id);

      //// 
      if (!objRec) {
        return res.status(400).json({ errors: "Bad Request" });
      }
      return res.status(201).json(objRec);
    });

  // ..............................Get All Report........................................
  router.get("/", fetchUser, async (req, res) => {
    Report.init(req.userinfo.tenantcode);
    const allRecords = await Report.findAll();
    //// 
    if (allRecords) {
      res.status(200).json(allRecords);
    } else {
      res.status(400).json({ errors: "No data" });
    }

  });

  // .....................................Get Report by Id........................................
  router.get("/:id", fetchUser, async (req, res) => {
    try {

      Report.init(req.userinfo.tenantcode);
      //// 
      let resultObj = await Report.findById(req.params.id);
      //// 
      if (resultObj) {
        return res.status(200).json(resultObj);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      return res.status(400).json({ "success": false, "message": error });
    }

  });

  // .....................................Get Report by Id........................................
  router.get("/byname/:name", fetchUser, async (req, res) => {
    try {
      //// 
      Report.init(req.userinfo.tenantcode);
      let resultObj = await Report.findByName(req.params.name);
      //// 
     
      if (resultObj) {
        return res.status(200).json(resultObj);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      return res.status(400).json({ "success": false, "message": error });
    }

  });

  // .....................................Get Report by Id........................................
  router.get("/run/:name", fetchUser, async (req, res) => {
    try {
      //// 
      Report.init(req.userinfo.tenantcode);
      let resultObj = await Report.runByName(req.params.name);
      //// 
     
      if (resultObj) {
        return res.status(200).json(resultObj);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      return res.status(400).json({ "success": false, "message": error });
    }

  });

  //.........................................Update Report .....................................
  router.put("/:id", fetchUser, async (req, res) => {
    //// 
    //// 
    try {
      const { query,groupbyquery,charttype} = req.body;
      const errors = [];
      const objRec = {}; // It seems like you want to update the fields of the document. Initialize an empty object for the fields that need to be updated.

      if (req.body.hasOwnProperty("query")) { objRec.query = query; }
      if (req.body.hasOwnProperty("groupbyquery")) { objRec.groupbyquery = groupbyquery; }
      if (req.body.hasOwnProperty("charttype")) { objRec.charttype = charttype; }

      if (errors.length !== 0) {
        return res.status(400).json({ errors: errors });
      }

      //// 
      let resultObj = await Report.findById(req.params.id);
      //// 

      if (resultObj) {
        //// 
        resultObj = await Report.updateById(req.params.id, objRec,req.userinfo.id );

        if (resultObj) {
          return res.status(200).json({ "success": true, "message": "Record updated successfully" });
        } else {
          return res.status(200).json({ "success": false, "message": "Record update failed" });
        }
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }

    } catch (error) {
      res.status(500).json({ errors: error }); // Changed status to 500 for server error
    }

  });

  // ...............................................Delete report......................................
  router.delete("/:id", fetchUser, async (req, res) => {
    const result = await Report.deleteReport(req.params.id);
    if (!result){
      res.status(400).json({ "success": false, "message": " No Record Found" });
    }else{
      return res.status(200).json({ "success": true, "message": "Successfully Deleted" });
    }
      

    
  });

  app.use(process.env.BASE_API_URL + '/api/reports', router);
};