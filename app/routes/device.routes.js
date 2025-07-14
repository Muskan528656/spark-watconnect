/**
 * Handles all incoming request for /api/tasks endpoint
 * DB table for this public.task
 * Model used here is task.model.js
 * SUPPORTED API ENDPOINTS
 *              GET     /api/tasks/:pid/*
 *              GET     /api/tasks/:id
 *              POST    /api/tasks/:pid
 *              PUT     /api/tasks/:id
 *              DELETE  /api/tasks/:id
 * 
 * @author      Aslam Bari
 * @date        Feb, 2023
 * @copyright   www.ibirdsservices.com
 */

const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const Device = require("../models/device.model.js");
const permissions = require("../constants/permissions.js");


module.exports = app => {
  

  const { body, validationResult } = require('express-validator');

  var router = require("express").Router();

  // Create a new Task
  router.post("/", fetchUser, [
    body('userid', 'Please enter userid').isLength({ min: 1 }),
    body('udid', 'Please enter udid').isLength({ min: 1 })
  ],

  async (req, res)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
      return res.status(400).json({errors : errors.array()});
    }

    let record = Device.findById(req.body.userid);
    if(record){
        return res.status(400).json({errors : "Record already exist"});
    }
    const deviceRec = await Device.create(req.body.userid, req.body.udid);

    if(!deviceRec){
      return res.status(400).json({errors : "Bad Request"});
    }

    return res.status(201).json(deviceRec);

  });

 




  // Retrieve a single Task with id
  router.get("/:id", fetchUser, async (req, res)=>{
    try {
      let resultTask = await Device.findById(req.params.id);
      if(resultTask){
        return res.status(200).json(resultTask);
      }else{
        return res.status(200).json({"success" : false, "message"  : "No record found"});
      }
    } catch (error) {
      //// 
      return res.status(400).json({"success" : false, "message"  : error});
    }
  });

  

  // Delete a Task with id
  router.delete("/:id", fetchUser, async (req, res) => {
    Task.init(req.userinfo.tenantcode);
    const result = await Task.deleteTask(req.params.id);
    if(!result)
      return res.status(200).json({"success" : false, "message"  : "No record found"});
    
      res.status(400).json({"success" : true, "message"  : "Successfully Deleted"});
  });

  // Delete all Tutorials
  //router.delete("/", contacts.deleteAll);


  app.use(process.env.BASE_API_URL + '/api/devices', router);
};