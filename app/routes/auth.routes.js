/**
 * Handles all incoming request for /api/auth endpoint
 * DB table for this public.user
 * Model used here is auth.model.js
 * SUPPORTED API ENDPOINTS
 *              GET     /api/auth/getuser
 *              POST    /api/createuser
 *              POST     /api/login
 * 
 * @author      Aslam Bari
 * @date        Feb, 2023
 * @copyright   www.ibirdsservices.com
 */

const e = require("express");
const Auth = require("../models/auth.model.js");
const { fetchUser } = require("../middleware/fetchuser.js");
const File = require("../models/file.model.js");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const gm = require('gm');

module.exports = app => {

  const { body, validationResult } = require('express-validator');

  var router = require("express").Router();

  // Create a new Tutorial
  router.post("/createuser", fetchUser, [
    body('email', 'Please enter email').isEmail(),
    body('password', 'Please enter password').isLength({ min: 6 }),
    body('firstname', 'Please enter firstname').isLength({ min: 2 }),
    body('lastname', 'Please enter lastname').isLength({ min: 2 })
  ],


    async (req, res) => {
      // #swagger.tags = ['Users']
      // #swagger.path = ['/api/auth/createuser']
      const { firstname, lastname, email, password, userrole, country_code, whatsapp_number, blocked } = req.body;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const salt = bcrypt.genSaltSync(10);
      const secPass = bcrypt.hashSync(req.body.password, salt);
      console.log("req.userinfo.tenantcode", req.userinfo.tenantcode);
      Auth.init(req.userinfo.tenantcode);
      const userRec = await Auth.findByEmail(email);
      if (userRec) {
        return res.status(400).json({ errors: "User already exist with given email." });
      }

      const allowedLicenses = await Auth.checkLicenses(req.userinfo.companyid);
      if (!allowedLicenses) {
        return res.status(400).json({ errors: "Licenses limit exceeded" });
      }

      const newUser = await Auth.createUser({
        firstname: firstname,
        lastname: lastname,
        email: email,
        password: secPass,
        userrole: userrole,
        companyid: req.userinfo.companyid,
        country_code: country_code,
        whatsapp_number: whatsapp_number,
        blocked: blocked,
      });

      if (newUser) {
        const data = {
          id: newUser.id
        };

        const authToken = jwt.sign(data, process.env.JWT_SECRET);

        const newRole = await Auth.setRole(userrole, newUser);
        //// 

        return res.status(201).json({ success: true, id: newUser.id, authToken: authToken });
      }
      else
        return res.status(400).json({ errors: "Bad request" });

      // contacts.create(req, res);

    });

  router.post("/login", [
    body('email', 'Please enter a valid email').isEmail(),
    body('password', 'Please enter password').isLength({ min: 1 })
  ], async (req, res) => {
    let success = false;
    try {
      const { email, password } = req.body;
      console.log("Login attempt ->", email, password);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success, errors: errors.array() });
      }

      // Step 1: Check user from public.user table
      let dataGet;
      try {
        dataGet = await Auth.findPublicEmail(email);
        console.log("User found in public.user:", dataGet);

        if (!dataGet) {
          return res.status(400).json({
            success,
            message: "Email not found in public.user"
          });
        }
      } catch (err) {
        console.error("Error during findPublicEmail:", err);
        return res.status(500).json({ success, error: "Server Error (public lookup)" });
      }

      // Step 2: Get the schema (targetschema) from public.user
      const companyid = dataGet.companyid;
      if (!companyid) {
        return res.status(400).json({
          success,
          message: "Schema not found for this user."
        });
      }

      // Step 3: Initialize schema
      // await Auth.init(targetSchema);

      // Step 4: Find user in tenant schema
      const userRec = await Auth.findByEmail(email, companyid);
      if (!userRec) {
        return res.status(400).json({
          success,
          errors: "Try to login with correct credentials"
        });
      }

      const userInfo = userRec.userinfo;

      // Step 5: Password check
      const passwordCompare = await bcrypt.compare(password, userInfo.password);
      if (!passwordCompare) {
        return res.status(400).json({
          success,
          errors: "Try to login with correct credentials"
        });
      }

      // Step 6: Prepare response payload
      delete userInfo.password;
      const username = `${userInfo.firstname} ${userInfo.lastname}`;
      delete userInfo.firstname;
      delete userInfo.lastname;
      userInfo.username = username;

      const authToken = jwt.sign(userInfo, process.env.JWT_SECRET, { expiresIn: '8h' });

      success = true;
      return res.status(201).json({ success, authToken });

    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  });



  // Create a new Tutorial
  //   router.post("/login", [
  //     body('email', 'Please enter firstname').isEmail(),
  //     body('password', 'Please enter password').isLength({ min: 1 })
  //   ],


  //     async (req, res) => {
  //       // #swagger.tags = ['Users']
  //       // #swagger.path = ['/api/auth/login']
  //       let success = false;
  //       try {


  //         const { email, password } = req.body;
  //         const errors = validationResult(req);
  //         if (!errors.isEmpty()) {
  //           return res.status(400).json({ success, errors: errors.array() });
  //         }

  //         const userRec = await Auth.findByEmail(email);
  //         console.log("USERRECCCCCCC",userRec);
  //         if (!userRec) {
  //           return res.status(400).json({ success, errors: "Try to login with correct credentials" });
  //         }
  //         const userInfo = userRec.userinfo;
  //         const passwordCompare = await bcrypt.compare(password, userInfo.password);

  //         if (!passwordCompare) {
  //           return res.status(400).json({ success, errors: "Try to login with correct credentials" });
  //         }
  // console.log("userinf",userInfo);
  //         //removing sensitive data from token
  //         delete userInfo.password;
  //         delete userInfo.email;
  //         let username = userInfo.firstname + ' ' + userInfo.lastname;
  //         let userrole = userInfo.userrole;
  //         let companyname = userInfo.companyname;
  //         let logourl = userInfo.logourl;
  //         let sidebarbgurl = userInfo.sidebarbgurl;
  //         let tenantcode = userInfo.tenantcode;
  //         delete userInfo.firstname;
  //         delete userInfo.lastname;
  //         userInfo.username = username;

  //         const authToken = jwt.sign(userInfo, process.env.JWT_SECRET, { expiresIn: '8h' });
  //         console.log("authhh=>",authToken);
  //         success = true;
  //         //const permissions = userInfo.permissions;



  //         return res.status(201).json({ success, authToken });

  //       } catch (error) {
  //         //// 
  //         res.status(400).json({ success, errors: error });
  //       }
  //       // contacts.create(req, res);

  //     });


  router.post("/social_login", [
    body('email', 'Please enter firstname').isEmail(),
    body('name', 'Please enter name').isLength({ min: 1 })
  ],


    async (req, res) => {
      // #swagger.tags = ['Users']
      // #swagger.path = ['/api/auth/login']
      let success = false;
      try {


        const { email, name, picture, sub, password } = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ success, errors: errors.array() });
        }

        const userRec = await Auth.findByEmail(email);
        if (!userRec) {
          // const allowedLicenses = await Auth.checkLicenses('7d55a1fd-3dfc-4e3d-aa26-304ababb6f9c');
          // if (!allowedLicenses) {
          //   return res.status(400).json({ errors: "Licenses limit exceeded" });
          // }
          // const regex = /\w+\s\w+(?=\s)|\w+/g;

          // const [firstname, lastname] = name.trim().match(regex);
          // let newUser = await Auth.createUser({
          //   firstname: firstname,
          //   lastname: lastname,
          //   email: email,
          //   password: password,
          //   userrole: 'USER',
          //   companyid: '7d55a1fd-3dfc-4e3d-aa26-304ababb6f9c',
          //   managerid: '59b02983-536c-4899-9c2e-86c7145b29b9'
          // });

          // if (newUser) {
          //   const newRole = await Auth.setRole('USER', newUser);
          //   newUser = await Auth.findByEmail(email);
          //   const data = {
          //     id: newUser.id,
          //     picture: picture
          //   };

          //   //removing sensitive data from token
          //   delete newUser.password;
          //   delete newUser.email;
          //   let username = newUser.firstname + ' ' + newUser.lastname;
          //   let userrole = newUser.userrole;
          //   let companyname = newUser.companyname;
          //   let logourl = newUser.logourl;
          //   let sidebarbgurl = newUser.sidebarbgurl;
          //   let tenantcode = newUser.tenantcode;
          //   delete newUser.firstname;
          //   delete newUser.lastname;
          //   newUser.username = username;
          //   newUser.picture = picture;


          //   //// 
          //   const authToken = jwt.sign(newUser, process.env.JWT_SECRET, { expiresIn: '8h' });
          //   return res.status(201).json({ success: true, id: newUser.id, authToken: authToken });
          //   // return res.status(400).json({success, errors : "Try to login with correct credentials"});
          // }
          return res.status(400).json({ success, errors: "Try to login with correct credentials" });
        } else {


          const userInfo = userRec.userinfo;


          //removing sensitive data from token
          delete userInfo.password;
          delete userInfo.email;
          let username = userInfo.firstname + ' ' + userInfo.lastname;
          let userrole = userInfo.userrole;
          let companyname = userInfo.companyname;
          let logourl = userInfo.logourl;
          let sidebarbgurl = userInfo.sidebarbgurl;
          let tenantcode = userInfo.tenantcode;
          delete userInfo.firstname;
          delete userInfo.lastname;
          userInfo.username = username;
          userInfo.picture = picture;

          const authToken = jwt.sign(userInfo, process.env.JWT_SECRET, { expiresIn: '8h' });
          success = true;
          //const permissions = userInfo.permissions;



          return res.status(201).json({ success, authToken });
        }

      } catch (error) {

        res.status(400).json({ success, errors: error });
      }
      // contacts.create(req, res);

    });

  router.put("/updatepassword", fetchUser, async (req, res) => {
    try {
      //Check permissions
      // #swagger.tags = ['Users']
      // #swagger.path = ['/api/auth/updatepassword']
      const { password } = req.body;
      const errors = [];
      const userRec = {};
      const salt = bcrypt.genSaltSync(10);
      const secPass = bcrypt.hashSync(req.body.password, salt);
      if (req.body.hasOwnProperty("password")) { userRec.password = secPass };
      //if(req.body.hasOwnProperty("id")){userRec.id = id};

      if (errors.length !== 0) {
        return res.status(400).json({ errors: errors });
      }

      let resultUser = await Auth.findById(req.userinfo.id);

      if (resultUser) {
        resultLead = await Auth.updateById(req.userinfo.id, userRec);
        if (resultLead) {
          return res.status(200).json({ "success": true, "message": "Record updated successfully" });
        }
        // return res.status(200).json(resultLead);


      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }


    } catch (error) {
      //// 
      res.status(400).json({ errors: error });
    }

  });

  // Get user by Id
  router.get("/users/:id", fetchUser,

    async (req, res) => {
      // #swagger.tags = ['Users']
      // #swagger.path = ['/api/auth/users/:id']
      try {
        //// 

        const userRec = await Auth.findById(req.params.id);

        if (!userRec) {
          return res.status(400).json({ errors: "User not found" });
        }

        return res.status(201).json(userRec);

      } catch (error) {
        res.status(400).json({ errors: error });
      }
      // contacts.create(req, res);

    });


  // Update profile

  router.put("/:id/profile", fetchUser, async (req, res) => {

    const MIMEType = new Map([
      ["text/csv", "csv"],
      ["application/msword", "doc"],
      ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
      ["image/gif", "gif"],
      ["text/html", "html"],
      ["image/jpeg", "jpg"],
      ["image/jpg", "jpg"],
      ["application/json", "json"],
      ["audio/mpeg", "mp3"],
      ["video/mp4", "mp4"],
      ["image/png", "png"],
      ["application/pdf", "pdf"],
      ["application/vnd.ms-powerpoint", "ppt"],
      ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
      ["image/svg+xml", "svg"],
      ["text/plain", "txt"],
      ["application/vnd.ms-excel", "xls"],
      ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
      ["text/xm", "xml"],
      ["application/xml", "xml"],
      ["application/atom+xml", "xml"],
      ["application/zip", "zip"],
    ]);
    File.init(req.userinfo.tenantcode);
    console.log("reqparamma=>>", req.params.id);
    const resultFile = await File.findByParentId(req.params.id);
    //// 

    if (resultFile) {
      //// 
      for (const value of resultFile) {
        const fileId = value.id;
        const fileTitle = value.title;
        const fileType = value.filetype;
        const parentId = value.parentid;
        const filePath = `${process.env.FILE_UPLOAD_PATH}${req.userinfo.tenantcode}/users/${parentId}`;


        if (fs.existsSync(filePath)) {
          //// 
          const result = await File.deleteFile(fileId);
          //// 
          if (!result) {
            return res.status(200).json({ "success": false, "message": "No record found" });
          } else {
            fs.unlinkSync(filePath);
            //// 
            const pdfreference = req.files.file;
            //// 
            const newVersiorecord = JSON.parse(JSON.parse(req.body.staffRecord));
            //// 
            const resultObj = await Auth.findById(req.userinfo.id);
            //// 

            if (resultObj) {
              const result = await Auth.updateRecById(resultObj.id, newVersiorecord, req.userinfo.id);
              //// 
              if (!result) {
                return res.status(400).json({ errors: "Bad Request" });
              }

              const newReq = {
                "title": pdfreference.name,
                "filetype": MIMEType.get(pdfreference.mimetype) || pdfreference.mimetype,
                "parentid": resultObj.id,
                "filesize": pdfreference.size
              };

              const fileRec = await File.create(newReq, req.userinfo.id);
              const uploadPath = `${process.env.FILE_UPLOAD_PATH}${req.userinfo.tenantcode}/users`;

              const filePath = `${uploadPath}/${fileRec.parentid}`;


              try {
                if (fs.existsSync(uploadPath)) {
                  pdfreference.mv(filePath, (err) => {
                    if (err) {
                      return res.send(err);
                    }
                  });
                } else {
                  fs.mkdirSync(uploadPath, { recursive: true });
                  pdfreference.mv(filePath, (err) => {
                    if (err) {
                      return res.send(err);
                    }
                  });
                }

                gm(filePath).thumbnail(50, 50).write(`${uploadPath}/${fileRec.parentid}.thumbnail`, function (err) {
                  if (!err)
                    if (err) {

                    }
                });;

              } catch (e) {

              }

              return res.status(201).json(result);
            }
            return res.status(200).json({ "success": true, "message": "Successfully Deleted" });
          }
        }
      }
    }

    const pdfreference = req?.files?.file;
    //// 
    const newVersiorecord = JSON.parse(JSON.parse(req.body.staffRecord));
    //// 
    const resultObj = await Auth.findById(req.userinfo.id);
    //// 

    if (resultObj) {
      const result = await Auth.updateRecById(resultObj.id, newVersiorecord, req.userinfo.id);
      //// 
      if (!result) {
        return res.status(400).json({ errors: "Bad Request" });
      }
      if (pdfreference) {
        const newReq = {
          "title": pdfreference.name,
          "filetype": MIMEType.get(pdfreference.mimetype) || pdfreference.mimetype,
          "parentid": resultObj.id,
          "filesize": pdfreference.size
        };

        const fileRec = await File.create(newReq, req.userinfo.id);
        const uploadPath = `${process.env.FILE_UPLOAD_PATH}${req.userinfo.tenantcode}/users`;

        const filePath = `${uploadPath}/${fileRec.parentid}`;

        //// 

        try {
          if (fs.existsSync(uploadPath)) {
            pdfreference.mv(filePath, (err) => {
              if (err) {
                return res.send(err);
              }
            });
          } else {
            fs.mkdirSync(uploadPath, { recursive: true });
            pdfreference.mv(filePath, (err) => {
              if (err) {
                return res.send(err);
              }
            });
          }
        } catch (e) {
          //// 
        }
        return res.status(201).json(result);
      }
    }
  });




  //......................................Update User.................................
  router.put("/:id", fetchUser, async (req, res) => {
    try {
      console.log("req.params.idreq.params.id");
      //Check permissions

      // #swagger.tags = ['Users']
      // #swagger.path = ['/api/auth/:id']
      const { firstname, lastname, email, phone, userrole, password, isactive, managerid, whatsapp_number } = req.body;
      const errors = [];
      const userRec = {};

      ////// 
      if (req.body.hasOwnProperty("firstname")) { userRec.firstname = firstname; if (!firstname) { errors.push('Firstname is required') } };
      if (req.body.hasOwnProperty("lastname")) { userRec.lastname = lastname; if (!lastname) { errors.push('Lastname is required') } };
      if (req.body.hasOwnProperty("email")) { userRec.email = email; if (!email) { errors.push('Email is required') } };
      if (req.body.hasOwnProperty("password")) { userRec.password = password; if (!password) { errors.push('Password is required') } };
      if (req.body.hasOwnProperty("phone")) { userRec.phone = phone };

      if (req.body.hasOwnProperty("userrole")) { userRec.userrole = userrole };
      if (req.body.hasOwnProperty("isactive")) { userRec.isactive = isactive };
      if (req.body.hasOwnProperty("managerid")) { userRec.managerid = managerid };
      if (req.body.hasOwnProperty("whatsapp_number")) { userRec.whatsapp_number = whatsapp_number };

      if (errors.length !== 0) {
        return res.status(400).json({ errors: errors });
      }

      let resultUser = await Auth.findById(req.params.id);
      console.log("result user =>>", resultUser);

      if (resultUser.userrole === 'SUPER_ADMIN' && req.params.id !== req.userinfo.id) {
        return res.status(400).json({ errors: "You cannot edit system admin" });
      }

      if (resultUser) {
        console.log("working");
        if (req.body.hasOwnProperty("isactive") && isactive === true) {
          const allowedLicenses = await Auth.checkLicenses(req.userinfo.companyid, resultUser.id);
          if (!allowedLicenses) {
            return res.status(400).json({ errors: "Licenses limit exceeded" });
          }
        } else if (req.body.hasOwnProperty("isactive") && isactive === false
          && req.params.id === req.userinfo.id) {

          return res.status(400).json({ errors: "You cannot deactivate yourself" });

        }
        ////// 
        if (req.body.hasOwnProperty("password")) {
          const salt = bcrypt.genSaltSync(10);
          const secPass = bcrypt.hashSync(req.body.password, salt);
          userRec.password = secPass;
        }


        resultUser = await Auth.updateRecById(req.params.id, userRec, req.userinfo.id);
        if (resultUser) {
          if (resultUser.isError)
            return res.status(400).json({ "success": false, errors: resultUser.errors });
          else
            return res.status(200).json({ "success": true, "message": "Record updated successfully" });
        }
        return res.status(200).json(resultUser);


      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }


    } catch (error) {
      //// 
      res.status(400).json({ errors: error });
    }

  });

  // Create a new Tutorial
  router.get("/getuser", fetchUser,

    async (req, res) => {

      try {
        console.log("USER@@", req.userInfo.id);
        const userid = req.userinfo.id;
        const userRec = await Auth.findById(userid);
        console.log("UsaaaaaaaaaaaarRE", userRec);
        if (!userRec) {
          return res.status(400).json({ errors: "User not found" });
        }
        console.log("response->", userRec);

        return res.status(201).json(userRec);

      } catch (error) {
        res.status(400).json({ errors: error });
      }
      // contacts.create(req, res);

    });


  // Fetch all Users
  router.get("/users", fetchUser,

    async (req, res) => {
      // #swagger.tags = ['Users']
      // #swagger.path = ['/api/auth/users']
      try {

        const userRec = await Auth.findAll(req.userinfo.companyid);
        if (!userRec) {
          return res.status(400).json({ errors: "User not found" });
        }
        return res.status(201).json(userRec);

      } catch (error) {
        res.status(400).json({ errors: error });
      }
      // contacts.create(req, res);

    });

  // ................................................Download file .......................................
  router.get("/myimage", fetchUser, async (req, res) => {
    try {
      //// 
      //const filePath = "D:/Files/" + parentId +"/"+ fileId + '.' + fileType;
      let filePath = process.env.FILE_UPLOAD_PATH + req.userinfo.tenantcode + "/users/" + req.userinfo.id;
      //// 
      res.download(filePath, "myprofileimage", function (err) {

        if (err) {
          return res.status(400).json({ "Error": false, "message": err });
        }
      });
    } catch (error) {
      //// 
      return res.status(400).json({ "Error": false, "message": error });
    }
  });

  // ................................................Download file .......................................
  router.get("/userimage/:id", async (req, res) => {
    try {

      //const filePath = "D:/Files/" + parentId +"/"+ fileId + '.' + fileType;
      let filePath = process.env.FILE_UPLOAD_PATH + "/" + req.params.id;
      res.download(filePath, req.params.id, function (err) {
        //// 
        if (err) {
          return res.status(400).json({ "Error": false, "message": err });
        }
      });
    } catch (error) {
      //// 
      return res.status(400).json({ "Error": false, "message": error });
    }
  });

  // Get user by Id
  router.get("/managers", fetchUser,

    async (req, res) => {
      // #swagger.tags = ['Users']
      // #swagger.path = ['/api/auth/managers']
      try {
        //// 
        const userRecList = await Auth.getAllManager();
        //// 
        if (!userRecList) {
          return res.status(400).json({ errors: "User not found" });
        }

        return res.status(201).json(userRecList);

      } catch (error) {
        res.status(400).json({ errors: error });
      }

    });

  app.get("/", (req, res) => {
    res.json({ message: "Hello" });
  });

  app.use(process.env.BASE_API_URL + '/api/auth', router);
};
