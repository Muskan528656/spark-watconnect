/**
 * Handles all incoming request for /api/files endpoint
 * DB table for this public.file
 * Model used here is file.model.js
 * SUPPORTED API ENDPOINTS
 *              GET     /api/files/:pid/*
 *              GET     /api/files/:id
 *              POST    /api/files/:pid
 *              PUT     /api/files/:id
 *              DELETE  /api/files/:id
 * 
 * @author      Aslam Bari
 * @date        Feb, 2023
 * @copyright   www.ibirdsservices.com
 */


const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const Backup = require("../models/backup.model.js");
const path = require('path');
const fs = require('fs');




module.exports = app => {


  const { body, validationResult } = require('express-validator');

  var router = require("express").Router();
  var newReq = {};



  // .......................................... get all file......................................
  router.post("/", fetchUser, async (req, res) => {

    let result = Backup.backup(req.userinfo.tenantcode);
    return res.status(200).json(result);

  });

  // .......................................... get all file......................................
  // router.get("/",  fetchUser, async (req, res) => {

  //   //let result = Backup.backup(req.userinfo.tenantcode);

  //   const files = fs.readdirSync(`${process.env.FILE_UPLOAD_PATH}backup/${req.userinfo.tenantcode}`, 'utf8');
  // const response = [];
  // for (let file of files) {
  //   const extension = path.extname(file);
  //   const fileStats = fs.statSync(`${process.env.FILE_UPLOAD_PATH}backup/${req.userinfo.tenantcode}/` + file);
  //   //// 
  //   response.push({ name: file, extension, fileStats });
  // }



  //       return res.status(200).json(response);



  //   });

  router.get("/", fetchUser, async (req, res) => {
    const dirPath = path.join(process.env.FILE_UPLOAD_PATH, 'backup', req.userinfo.tenantcode);

    // Check if directory exists
    if (!fs.existsSync(dirPath)) {
      return res.status(404).json({ error: `Directory not found: ${dirPath}` });
    }

    try {
      const files = fs.readdirSync(dirPath, 'utf8');
      const response = [];

      for (let file of files) {
        const extension = path.extname(file);
        const fileStats = fs.statSync(path.join(dirPath, file));
        response.push({ name: file, extension, fileStats });
      }

      return res.json(response);
    } catch (err) {
      console.error("Error reading backup files:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });


  // ................................................Download file .......................................
  router.get("/download/:filename", fetchUser, async (req, res) => {
    try {
      //// 


      const filename = req.params.filename;

      //const filePath = "D:/Files/" + parentId +"/"+ fileId + '.' + fileType;
      let filePath = `${process.env.FILE_UPLOAD_PATH}backup/${req.userinfo.tenantcode}/${filename}`;
      //// 
      res.attachment(filename);
      res.download(filePath, filename, function (err) {

        if (err) {
          return res.status(400).json({ "Error": false, "message": err });
        }
      });
    } catch (error) {
      //// 
      return res.status(400).json({ "Error": false, "message": error });
    }

    //return res.status(200).json({ success : true, "message" : "File downloaded successfully" });
  });

  // ................................................Download file .......................................
  router.get("/delete/:filename", fetchUser, async (req, res) => {
    try {
      //// 


      const filename = req.params.filename;

      //const filePath = "D:/Files/" + parentId +"/"+ fileId + '.' + fileType;
      let filePath = `${process.env.FILE_UPLOAD_PATH}backup/${req.userinfo.tenantcode}/${filename}`;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

    } catch (error) {
      //// 
      return res.status(400).json({ "Error": false, "message": error });
    }

    return res.status(200).json({ success: true, "message": "File deleted successfully" });
  });


  // Delete all Tutorials
  //router.delete("/", files.deleteAll);
  app.use(process.env.BASE_API_URL + '/api/backup', router);
};