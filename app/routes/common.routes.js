/**
 * Handles all incoming request for /api/contacts endpoint
 * DB table for this public.contact
 * Model used here is contact.model.js
 * SUPPORTED API ENDPOINTS
 *              GET     /api/contacts
 *              GET     /api/contacts/:id
 *              POST    /api/contacts
 *              PUT     /api/contacts/:id
 *              DELETE  /api/contacts/:id
 * 
 * @author      Aslam Bari
 * @date        Feb, 2023
 * @copyright   www.ibirdsservices.com  
 */

const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const Common = require("../models/common.model.js");
const permissions = require("../constants/permissions.js");

module.exports = app => {
  

  const { body, validationResult } = require('express-validator');

  var router = require("express").Router();

 

  // .....................................Get All Contacts........................................
  router.get("/newleads", fetchUser, async (req, res)=>{
    

    Common.init(req.userinfo.tenantcode);
    const total = await Common.countNewLeads();
    if(total){
      res.status(200).json({total : total});
    }else{
      res.status(400).json({total : 0});
    }

  });

  // .....................................Get All Contacts........................................
  router.get("/allcontacts", fetchUser, async (req, res)=>{
    

    Common.init(req.userinfo.tenantcode);
    const total = await Common.countAllContacts();
    if(total){
      res.status(200).json({total : total});
    }else{
      res.status(400).json({total : 0});
    }

  });

  

  // .....................................Get All Contacts........................................
  router.get("/activeusers", fetchUser, async (req, res)=>{
    

    Common.init(req.userinfo.tenantcode);
    const total = await Common.countActiveUsers(req.userinfo.companyid);
    if(total){
      res.status(200).json({total : total});
    }else{
      res.status(400).json({total : 0});
    }

  });

  // .....................................Get All Contacts........................................
  router.get("/totalbusiness", fetchUser, async (req, res)=>{
    

    Common.init(req.userinfo.tenantcode);
    const total = await Common.getTotalBusiness(req.userinfo.companyid);
    if(total){
      res.status(200).json({total : total});
    }else{
      res.status(400).json({total : 0});
    }

  });

  // .....................................Get All Contacts........................................
  router.get("/settings/:settingname", fetchUser, async (req, res)=>{
    

    
    let result = await Common.findCompanySetting(req.userinfo.companyid, req.params.settingname);
    if(result){
      res.status(200).json({success : true, setting : result});
    }else{
      res.status(400).json({success : false});
    }

  });


  // .....................................Get All Contacts........................................
  router.get("/notifications", fetchUser, async (req, res)=>{
    

    Common.init(req.userinfo.tenantcode);
    let result = await Common.fetchSystemNotifications(req.userinfo.companyid);
    if(result){
      res.status(200).json(result);
    }else{
      res.status(400).json(null);
    }

  });


  
  
  
  // Delete all Tutorials
  //router.delete("/", contacts.deleteAll);

  app.use(process.env.BASE_API_URL + '/api/common', router);
};
