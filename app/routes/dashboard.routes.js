const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const Dashboard = require("../models/dashboard.model.js");
const permissions = require("../constants/permissions.js");
const ReportBuilder = require("../models/reportbuilder.model.js");

module.exports = (app) => {
  const { body, validationResult } = require("express-validator");

  var router = require("express").Router();

  // ................................ Create a new Dashboard ................................
  router.post(
    "/",
    fetchUser,
    [body("name", "Please enter name").isLength({ min: 1 })],

    async (req, res) => {
      //Check permissions
      // const permission = req.userinfo.permissions.find(
      //   (el) =>
      //     el.name === permissions.VIEW_CONTACT ||
      //     el.name === permissions.MODIFY_ALL ||
      //     el.name === permissions.VIEW_ALL
      // );

      // if (!permission) return res.status(401).json({ errors: "Unauthorized" });
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      Dashboard.init(req.userinfo.tenantcode);

      const result = await Dashboard.create(req.body, req.userinfo.id);

      if (!result) {
        return res.status(400).json({ errors: "Bad Request" });
      }

      return res.status(201).json(result);
    }
  );

  // .....................................Get All Dashboards........................................
  router.get("/", fetchUser, async (req, res) => {
    //Check permissions
    // const permission = req.userinfo.permissions.find(
    //   (el) =>
    //     el.name === permissions.VIEW_CONTACT ||
    //     el.name === permissions.MODIFY_ALL ||
    //     el.name === permissions.VIEW_ALL
    // );

    // if (!permission) return res.status(401).json({ errors: "Unauthorized" });

    Dashboard.init(req.userinfo.tenantcode);
    //// 
    const result = await Dashboard.findAll();

    let fetchrecords = [];
    result.map((item) => {
      var obj = {};
      obj["id"] = item.id,
        obj["name"] = item.name,
        obj["description"] = item.description,
        (obj["queryResult"] = item.reportids),
        fetchrecords.push(obj);
    });

    //// 

    if (result) {
      //// 
      res.status(200).json(fetchrecords);
    } else {
      res.status(400).json({ errors: "No data" });
    }
  });

  //......................................Get Dashboard by Id.................................
  router.get("/:id", fetchUser, async (req, res) => {
  
    try {
      //Check permissions
      // const permission = req.userinfo.permissions.find(
      //   (el) =>
      //     el.name === permissions.VIEW_CONTACT ||
      //     el.name === permissions.MODIFY_ALL ||
      //     el.name === permissions.VIEW_ALL
      // );

      // if (!permission) return res.status(401).json({ errors: "Unauthorized" });

      Dashboard.init(req.userinfo.tenantcode);
      let result = await Dashboard.findById(req.params.id);
   
      //// 
      //====Report data=====
      let reportDataAr = result.reportids; 

      //// 

      
      
      let fetchReports = await Dashboard.fetchReportsData(reportDataAr);  


      //// 

      //// 
      const reportQueriesData = await Promise.all(
        fetchReports.map(async (item, index) => {
          const obj = {};
          const data = await ReportBuilder.findGroupByRecords(item.reportdata.groupbyquery.query);
          obj["boxid"] = item.boxid;
          obj["querydata"] = data;
          return obj;
        })
      );
      
      //// 
      

      if (result) {
        return res.status(200).json({
          name : result.name,
          fetchReports: fetchReports,
          reportQueriesData: reportQueriesData,
        });
      }
       else {
        return res.status(200).json({ success: false, message: "No record found" });
      }
    } catch (error) {
      return res.status(400).json({ success: false, message: error });
    }
  });

//......................................Update Dashboard .................................
//......................................Update Dashboard .................................
router.put("/:id", fetchUser, async (req, res) => {
  try {
    

    const uniqueBoxValues = new Set();
    const filteredData = req.body.filter((item) => {
      if (!uniqueBoxValues.has(item.box)) {
        uniqueBoxValues.add(item.box);
        return true;
      }
      return false;
    });

    const { name, description, reportids } = req.body;
    const errors = [];
    const dashboardRec = {};

    dashboardRec.reportids = filteredData;
   
    if(errors.length !== 0){
      return res.status(400).json({errors : errors});
    }

    Dashboard.init(req.userinfo.tenantcode);

    let resultCon = await Dashboard.findById(req.params.id);

    //// 

    if(resultCon){
      resultCon = await Dashboard.updateById(req.params.id, dashboardRec, req.userinfo.id);

      if(resultCon){
        return res.status(200).json({"success" : true, "message" : "Record updated successfully"});
      }
      return res.status(200).json(resultCon);

    }else{
      return res.status(200).json({"success" : false, "message"  : "No record found"});
    }
  } catch (error) {
    res.status(400).json({ errors: error });
  }
});

  app.use(process.env.BASE_API_URL + "/api/dashboards", router);
};

