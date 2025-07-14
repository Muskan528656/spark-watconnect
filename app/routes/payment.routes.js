/**
 * Handles all incoming request for /api/payment endpoint
 * DB table for this public.payment
 * Model used here is account.model.js
 * SUPPORTED API ENDPOINTS
 *              GET     /api/payment
 *              GET     /api/payment/:id
 *              POST    /api/payment
 *              PUT     /api/payment/:id
 *              DELETE  /api/payment/:id
 * 
 * @author      Aslam Bari
 * @date        June, 2023
 * @copyright   www.ibirdsservices.com  
 */

const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const Payment = require("../models/payment.model.js");
const permissions = require("../constants/permissions.js");

module.exports = app => {
  

  const { body, validationResult } = require('express-validator');

  var router = require("express").Router();

  // ................................ Create a new Payment ................................
  router.post("/", fetchUser, [] ,  
  async (req, res)=>{
    //// 
    const paymentRec = await Payment.create(req.body, req.userinfo.id);
    if(!paymentRec){
      return res.status(400).json({errors : "Bad Request"});
    }
    return res.status(201).json(paymentRec);
  });

//   // .....................................Get All payments........................................
//   router.get("/", fetchUser, async (req, res)=>{
//     //Check permissions
//     const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_ACCOUNT
//       || el.name === permissions.MODIFY_ALL
//       || el.name === permissions.VIEW_ALL);

//     if (!permission) return res.status(401).json({errors : "Unauthorized"});

//     Account.init(req.userinfo.tenantcode);
//     const accounts = await Account.findAll();
//     if(accounts){
//       res.status(200).json(accounts);
//     }else{
//       res.status(400).json({errors : "No data"});
//     }

//   });

   //......................................Get payments by parentid .................................
  router.get("/parent/:id", fetchUser, async (req, res)=>{
    //// 
    try {
      let resultCon = await Payment.findByBusinessId(req.params.id);
      //// 
      if(resultCon){
        return res.status(200).json(resultCon);
      }else{
        return res.status(200).json({"success" : true, "message"  : "No record found"});
      }
    } catch (error) {
      return res.status(400).json({"error" : false, "message"  : error});
    }
  }); 



     //......................................Get payments by id .................................
     router.get("/:id", fetchUser, async (req, res)=>{
        //// 
        try {
          let resultCon = await Payment.findById(req.params.id);
          //// 
          if(resultCon){
            return res.status(200).json(resultCon);
          }else{
            return res.status(200).json({"success" : true, "message"  : "No record found"});
          }
        } catch (error) {
          return res.status(400).json({"error" : false, "message"  : error});
        }
      }); 
    



      
 
  //......................................Update payment.................................
  router.put("/:id", fetchUser,  async (req, res)=>{
    try {

    const {paymentdate, discription, amount, type} = req.body; 
    const errors = [];
    const paymentRec = {};
    if(req.body.hasOwnProperty("paymentdate")){paymentRec.paymentdate = paymentdate};
    if(req.body.hasOwnProperty("discription")){paymentRec.discription = discription};
    if(req.body.hasOwnProperty("amount")){paymentRec.amount = amount};
    if(req.body.hasOwnProperty("type")){paymentRec.type = type};
    
    if(errors.length !== 0){
      return res.status(400).json({errors : errors});
    }
    let resultCon = await Payment.findById(req.params.id);
    //// 
    if(resultCon){
      resultCon = await Payment.updateById(req.params.id, paymentRec, req.userinfo.id);
      if(resultCon){
        return res.status(200).json({"success" : true, "message" : "Record updated successfully"});
      }
      return res.status(200).json(resultCon);


    }else{
      return res.status(200).json({"success" : false, "message"  : "No record found"});
    }
    
    
    } catch (error) {
      res.status(400).json({errors : error});
    }
    
  });

  // Delete a Tutorial with id
  router.delete("/:id", fetchUser, async (req, res) => {
    const result = await Payment.deletePayment(req.params.id);
    if(!result)
      return res.status(200).json({"success" : false, "message"  : "No record found"});
    
      res.status(400).json({"success" : true, "message"  : "Successfully Deleted"});
  });




  app.use(process.env.BASE_API_URL + '/api/payments', router);
};
