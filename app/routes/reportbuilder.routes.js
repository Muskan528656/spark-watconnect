const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");

const ReportBuilder = require("../models/reportbuilder.model.js");


module.exports = app => {
  const { body, validationResult } = require('express-validator');
  var router = require("express").Router();

  // .....................................Get All query result........................................
  router.get("/record/:query", fetchUser, async (req, res) => {
    //// 
    ReportBuilder.init(req.userinfo.tenantcode);
    const result = await ReportBuilder.findAllRecords(req.params.query); // Pass the query parameter
    //// 
    if (result) {
      res.status(200).json(result);
    } else {
      res.status(400).json({ errors: "No data" });
    }
  });



  // .....................................Get All  filter query result........................................
  router.get("/filter/:query", fetchUser, async (req, res) => {
    //// 
    ReportBuilder.init(req.userinfo.tenantcode);
    const result = await ReportBuilder.findAllFilterRecords(req.params.query);
    //// 
    if (result) {
      res.status(200).json(result);
    } else {
      res.status(400).json({ errors: "No data" });
    }
  });

  // group by fields
  router.get("/groupbydata/:query", fetchUser, async (req, res) => {
    //// 
    const result = await ReportBuilder.findGroupByRecords(req.params.query);
    //// 
    if (result) {
      res.status(200).json(result);
    } else {
      res.status(400).json({ errors: "No data" });
    }
  });


  // .....................................Get All tables........................................
  router.get("/", fetchUser, async (req, res) => {
    //Check permissions
    const result = await ReportBuilder.findAll();
    //// 
    if (result) {
      res.status(200).json(result);
    } else {
      res.status(400).json({ errors: "No data" });
    }
  });

  // ......................................Get fields by table.................................
  router.get("/:tablename", fetchUser, async (req, res) => {
    //// 
    try {
      let result = await ReportBuilder.findFieldsTableName(req.params.tablename);
      if (result) {
        return res.status(200).json(result);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      ////// 
      return res.status(400).json({ "success": false, "message": error });
    }
  });
  app.use(process.env.BASE_API_URL + '/api/reportbuilders', router);
};