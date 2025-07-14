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

const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const Lead = require("../models/lead.model.js");
const permissions = require("../constants/permissions.js");
const Mailer = require("../models/mail.model.js");
const Common = require("../models/common.model.js");
const Message = require("../models/message.model.js");
const UserPinnedLead = require("../models/watconnect/userpinnedlead.model.js");
var io;
module.exports = (app, importIO) => {

  io = importIO;
  const { body, validationResult } = require('express-validator');

  var router = require("express").Router();

  // ................................ Create a new lead ................................
  router.post("/", fetchUser, [
    body('firstname', 'Please enter First Name').isLength({ min: 1 }),
    body('lastname', 'Please enter Last Name ').isLength({ min: 1 }),
  ],

    async (req, res) => {
      console.log("wowowowowowo");
      //Check permissions
      // #swagger.tags = ['Leads']
      // #swagger.path = ['/api/leads']
      // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_LEAD
      //   || el.name === permissions.MODIFY_ALL
      //   || el.name === permissions.VIEW_ALL);

      // if (!permission) return res.status(401).json({ errors: "Unauthorized" });
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      console.log("req.bodyreq.bodyreq.body", req.body);
      Lead.init(req.userinfo.tenantcode);
      const leadRec = await Lead.create(req.body, req.userinfo.id);
      console.log("LEa", leadRec);
      if (!leadRec) {
        return res.status(400).json({ errors: "Bad Request" });
      }
      ////
      res.status(201).json(leadRec);

      // let newLead = await Lead.findById(leadRec.id);
      ////

      // if (newLead.owneremail) {
      //   let email = Lead.prepareMailForNewLead(newLead);
      //   ////
      //   let companyInfo = await Common.fetchCompanyInfo(req.userinfo.companyid);
      //   ////
      //   Mailer.sendEmail(newLead.owneremail, email.subject, email.body, companyInfo.systememail);

      //   email = Lead.prepareAdminMailForNewLead(newLead);
      //   ////
      //   ////
      //   Mailer.sendEmail(companyInfo.adminemail, email.subject, email.body, companyInfo.systememail);
      // }

      // if (newLead.ownerid !== req.userinfo.id) {
      //   Message.init(req.userinfo.tenantcode);
      //   const messageRec = await Message.create({ description: 'New Lead Assigned to you', msgtype: 'SYSTEM', parentid: newLead.id }, req.userinfo.id);

      //   ////
      //   if (!messageRec) {
      //     return res.status(400).json({ errors: "Bad Request" });
      //   }

      //   let users = [{ username: '', id: newLead.ownerid }];
      //   const pushRecs = await Message.createPushNotification(messageRec.id, users, req.userinfo.id, io);

      // }



    });


  // ..........................................Create lead from facebook..........................................
  router.post("/:tenant/fb", [],
    async (req, res) => {

      if (!req.body)
        res.status(400).json({ errors: "Bad Request" });

      try {
        Lead.init(req.params.tenant);
        ////
        // let defaultuserid = await Common.fetchSystemAdminId(req.params.tenant);
        // ////

        const leadRec = await Lead.createLeadFromFB(req.body);


        if (!leadRec) {
          return res.status(400).json({ errors: "Bad Request" });
        }

        return res.status(201).json(leadRec);
      } catch (error) {
        ////
        return res.status(400).json({ errors: error });
      }


    });



  //......................................Get lead by Id.................................
  router.post("/convert/:id", fetchUser, async (req, res) => {
    try {
      //Check permissions
      // #swagger.tags = ['Leads']
      // #swagger.path = ['/api/leads/convert/:id']
      // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_LEAD
      //   || el.name === permissions.MODIFY_ALL
      //   || el.name === permissions.VIEW_ALL);
      // if (!permission) return res.status(401).json({ errors: "Unauthorized" });

      Lead.init(req.userinfo.tenantcode);

      let leadRecord = await Lead.findById(req.params.id);

      if (leadRecord) {

        let resConvert = await Lead.convertLead(leadRecord, req.userinfo.id);
        ////
        if (resConvert && resConvert.contactid) {
          const leadRec = {
            leadstatus: req.body.status,
            convertedcontactid: resConvert.contactid,
            iswon: true
          };
          let resultCon = await Lead.updateById(req.params.id, leadRec, req.userinfo.id);

          if (resultCon) {
            resultCon.businessid = resConvert.businessid;
            return res.status(200).json(resultCon);
          } else {
            return res.status(200).json({ "success": false, "message": "No record found" });
          }
        } else {
          return res.status(200).json({ "success": false, "message": "No record found" });
        }

      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }




    } catch (error) {
      return res.status(400).json({ "success": false, "message": error });
    }
  });

  // .....................................Get All leads........................................
  // router.get("/", fetchUser, async (req, res) => {

  //   // const permission = req.userinfo.permissions.find(el => el.name === permissions.MODIFY_ALL
  //   //   || el.name === permissions.VIEW_ALL
  //   //   || el.name === permissions.VIEW_LEAD
  //   // );

  //   // if (!permission) return res.status(401).json({ errors: "Unauthorized" });

  //   Lead.init(req.userinfo.tenantcode);

  //   const leads = await Lead.findAll(req.userinfo);

  //   if (leads) {
  //     res.status(200).json(leads);
  //   } else {
  //     res.status(400).json({ errors: "No data" });
  //   }

  // });
  router.get("/", fetchUser, async (req, res) => {
    try {
      Lead.init(req.userinfo.tenantcode);
      UserPinnedLead.init(req.userinfo.tenantcode);
      const leads = await Lead.findAll(req.userinfo);
      const pinnedLeadIds = await UserPinnedLead.getPinnedLeadIds(
        req.userinfo.id
      );
      // Sort: pinned leads first, then others
      const sortedLeads = [
        ...leads.filter((l) => pinnedLeadIds.includes(l.id)),
        ...leads.filter((l) => !pinnedLeadIds.includes(l.id)),
      ];
      // Add pinned property to each lead
      const leadsWithPinned = sortedLeads.map((lead) => ({
        ...lead,
        pinned: pinnedLeadIds.includes(lead.id),
      }));
      if (leads) {
        res.status(200).json(leadsWithPinned);
      } else {
        res.status(400).json({ success: false, message: "No record found" });
      }
    } catch (error) {
      res.status(500).json({ success: false, errors: "Server error" });
    }
  });
  //......................................Get lead by Id.................................
  router.get("/:id", fetchUser, async (req, res) => {
    try {
      //Check permissions
      // #swagger.tags = ['Leads']
      // #swagger.path = ['/api/leads/:id']
      // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_LEAD
      //   || el.name === permissions.MODIFY_ALL
      //   || el.name === permissions.VIEW_ALL);
      // if (!permission) return res.status(401).json({ errors: "Unauthorized" });

      Lead.init(req.userinfo.tenantcode);
      let resultCon = await Lead.findById(req.params.id);
      if (resultCon) {
        return res.status(200).json(resultCon);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      return res.status(400).json({ "success": false, "message": error });
    }
  });

  //......................................Get Medicaltestitem by OwnerId.................................
  router.get("/ld/:id", fetchUser, async (req, res) => {
    try {
      //Check permissions
      // #swagger.tags = ['Leads']
      // #swagger.path = ['/api/leads/ld/:id']
      // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_LEAD
      //   || el.name === permissions.MODIFY_ALL
      //   || el.name === permissions.VIEW_ALL);

      // if (!permission) return res.status(401).json({ errors: "Unauthorized" });
      Lead.init(req.userinfo.tenantcode);
      let resultCon = await Lead.findLeadByOwnerId(req.params.id);
      if (resultCon) {
        return res.status(200).json(resultCon);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      return res.status(400).json({ "success": false, "message": error });
    }
  });



  //......................................Update Lead.................................
  router.put("/:id", fetchUser, async (req, res) => {
    console.log("wwwwwwwwwwwwwwwwwwwwwwww");
    try {
      //Check permissions
      // #swagger.tags = ['Leads']
      // #swagger.path = ['/api/leads/:id']
      // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_LEAD
      //   || el.name === permissions.MODIFY_ALL
      //   || el.name === permissions.VIEW_ALL);
      // if (!permission) return res.status(401).json({ errors: "Unauthorized" });

      Lead.init(req.userinfo.tenantcode);
      const { firstname, lastname, company, leadsource, leadstatus, rating, conid, salutation, phone, email, fax,
        websit, industry, title, annualrevenu, street, city, state, country, zipcode, assignrole, description, lastmodifiedbyid, ownerid, lostreason, amount, paymentmodel, paymentterms, iswon, country_code, tag_names } = req.body;
      const errors = [];
      const leadRec = {};
      if (req.body.hasOwnProperty("firstname")) { leadRec.firstname = firstname; if (!firstname) { errors.push('Lead firstname is required') } };
      if (req.body.hasOwnProperty("lastname")) { leadRec.lastname = lastname; if (!lastname) { errors.push('lastname is required') } };
      if (req.body.hasOwnProperty("ownerid")) { leadRec.ownerid = ownerid; if (!ownerid) { errors.push('Owner is required') } };
      if (req.body.hasOwnProperty("company")) { leadRec.company = company };
      if (req.body.hasOwnProperty("leadsource")) { leadRec.leadsource = leadsource };
      if (req.body.hasOwnProperty("leadstatus")) { leadRec.leadstatus = leadstatus };
      if (req.body.hasOwnProperty("rating")) { leadRec.rating = rating };
      if (req.body.hasOwnProperty("conid")) { leadRec.conid = conid };
      if (req.body.hasOwnProperty("salutation")) { leadRec.salutation = salutation };
      if (req.body.hasOwnProperty("phone")) { leadRec.phone = phone; if (!phone) { phone; errors.push('Phone is required') } };
      if (req.body.hasOwnProperty("email")) { leadRec.email = email };
      if (req.body.hasOwnProperty("fax")) { leadRec.fax = fax };
      if (req.body.hasOwnProperty("websit")) { leadRec.websit = websit };
      if (req.body.hasOwnProperty("industry")) { leadRec.industry = industry };
      if (req.body.hasOwnProperty("title")) { leadRec.title = title };
      if (req.body.hasOwnProperty("annualrevenu")) { leadRec.annualrevenu = annualrevenu };
      if (req.body.hasOwnProperty("street")) { leadRec.street = street };
      if (req.body.hasOwnProperty("city")) { leadRec.city = city };
      if (req.body.hasOwnProperty("state")) { leadRec.state = state };
      if (req.body.hasOwnProperty("country")) { leadRec.country = country };
      if (req.body.hasOwnProperty("zipcode")) { leadRec.zipcode = zipcode };
      if (req.body.hasOwnProperty("description")) { leadRec.description = description };
      if (req.body.hasOwnProperty("assignrole")) { leadRec.assignrole = assignrole };
      if (req.body.hasOwnProperty("lastmodifiedbyid")) { leadRec.lastmodifiedbyid = lastmodifiedbyid };
      if (req.body.hasOwnProperty("lostreason")) { leadRec.lostreason = lostreason };
      if (req.body.hasOwnProperty("amount")) { leadRec.amount = amount };
      if (req.body.hasOwnProperty("paymentmodel")) { leadRec.paymentmodel = paymentmodel };
      if (req.body.hasOwnProperty("paymentterms")) { leadRec.paymentterms = paymentterms };
      if (req.body.hasOwnProperty("iswon")) { leadRec.iswon = iswon };
      if (req.body.hasOwnProperty("country_code")) { leadRec.country_code = country_code };
      if (req.body.hasOwnProperty("tag_names")) { leadRec.tag_names = tag_names };

      if (errors.length !== 0) {
        return res.status(400).json({ errors: errors });
      }

      let resultConOld = await Lead.findById(req.params.id);
      console.log("Result->>>", resultConOld);
      if (resultConOld) {

        let resultCon = await Lead.updateById(req.params.id, leadRec, req.userinfo.id);
        if (resultCon) {
          res.status(200).json({ "success": true, "message": "Record updated successfully", res: resultCon });

          if (leadRec.ownerid !== resultConOld.ownerid) {
            Message.init(req.userinfo.tenantcode);
            const messageRec = await Message.create({ description: 'New Lead Assigned to you', msgtype: 'SYSTEM', parentid: req.params.id }, req.userinfo.id);
            let users = [{ username: '', id: leadRec.ownerid }];
            const pushRecs = await Message.createPushNotification(messageRec.id, users, req.userinfo.id, io);
          }
        }
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
    // #swagger.tags = ['Leads']
    // #swagger.path = ['/api/leads/:id']
    // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_LEAD
    //   || el.name === permissions.MODIFY_ALL
    //   || el.name === permissions.VIEW_ALL);

    // if (!permission) return res.status(401).json({ errors: "Unauthorized" });

    Lead.init(req.userinfo.tenantcode);
    const result = await Lead.deleteLead(req.params.id);
    if (!result)
      return res.status(200).json({ "success": false, "message": "No record found" });

    res.status(400).json({ "success": true, "message": "Successfully Deleted" });
  });
  // Collection lead from other sources
  router.post("/public/enquires", async (req, res) => {
    // 
    if (!req.body) res.status(400).json({ errors: "Bad Request" });
    let revNo = req.body.PHONE?.split("").reverse().join("");
    req.body.PHONE = revNo.slice(0, 10).split("").reverse().join("");
    try {
      Lead.init(req.body.tenantcode);
      const leadRec = await Lead.createLeadFromOthers(req.body);
      if (!leadRec) {
        return res.status(400).json({ errors: "Bad Request" });
      }

      return res.status(201).json(leadRec);
    } catch (error) {
      return res.status(400).json({ errors: error });
    }
  });
  // added by muskan khan

  router.post(
    "/import",
    fetchUser,
    [body("leads").isArray().withMessage("Leads must be an array.")],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(", ");
        return res.status(400).json({ success: false, errors: errorMessages });
      }
      console.log(" req.userinfo.id", req.userinfo);
      const { leads } = req.body;
      if (!Array.isArray(leads) || leads.length === 0) {
        return res.status(400).json({ success: false, error: "No leads provided." });
      }

      const userId = req.userinfo.id;
      const createdLeads = [];
      const skippedLeads = [];

      Lead.init(req.userinfo.tenantcode);
      // Tag.init(req.userinfo.tenantcode);

      try {

        for (const lead of leads) {
          const nameExists = lead.firstname || lead.lastname;
          const whatsapp = lead.whatsapp_number?.toString().trim();
          console.log(lead)
          if (!nameExists || !whatsapp || !/^\d+$/.test(whatsapp)) {
            skippedLeads.push(lead);
            continue;
          }

          let countryCode = lead.country_code ? lead.country_code.toString() : "91";
          if (!countryCode.startsWith("+")) {
            countryCode = `+${countryCode}`;
          }
          lead.country_code = countryCode;

          // Process tags
          let tagArray = [];
          let rawTags = lead.tag_names;

          // Normalize to array from comma-separated string
          if (typeof rawTags === "string") {
            rawTags = rawTags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0);
          } else if (Array.isArray(rawTags)) {
            rawTags = rawTags.map(tag => (typeof tag === "string" ? tag.trim() : tag?.name?.trim()))
              .filter(tag => tag?.length > 0);
          } else {
            rawTags = [];
          }

          for (const tagName of rawTags) {
            if (!tagName) continue;

            console.log("Processing tag:", tagName);

            // let tagRes = await Tag.checkDuplicateRecord(tagName);

            // if (!tagRes) {
            //   const tagCreated = await Tag.createRecordWithRules(
            //     { name: tagName, status: true, first_message: "No" },
            //     userId
            //   );
            //   console.log("Tag created:", tagCreated);

            //   if (tagCreated.success) {
            //     tagRes = {
            //       id: tagCreated.data.id,
            //       name: tagCreated.data.name,
            //     };
            //   } else {
            //     console.error("Failed to create tag:", tagCreated.message);
            //   }
            // }

            // if (tagRes) tagArray.push(tagRes);
          }


          const isDuplicate = await Lead.checkWhatsAppNumberExists(whatsapp, userId);
          if (isDuplicate) {
            skippedLeads.push(lead);
            continue;
          }

          const newLead = {
            ...lead,
            whatsapp_number: whatsapp,
            blocked: false,
            createdById: userId,
            lastModifiedById: userId,
            ownerid: userId,
            leadstatus: "Open - Not Contacted",
            tag_names: tagArray, // array of objects with id and name
          };

          console.log("Creating lead with tags:", newLead.tag_names);

          const createdLead = await Lead.create(newLead, userId);
          if (createdLead) {
            createdLeads.push(createdLead);
          } else {
            skippedLeads.push(lead);
          }
        }

        return res.status(200).json({
          success: true,
          message: "Lead import completed.",
          createdLeads,
          skippedLeads,
        });
      } catch (error) {
        console.error("Error during bulk lead import:", error);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
      }
    }
  );
  // Pin a lead for the logged-in user
  router.post(
    "/:id/pin",
    fetchUser,

    async (req, res) => {
      try {
        UserPinnedLead.init(req.userinfo.tenantcode);
        const success = await UserPinnedLead.pinLead(
          req.userinfo.id,
          req.params.id
        );
        if (success) {
          res
            .status(200)
            .json({ success: true, message: "Lead pinned successfully" });
        } else {
          res
            .status(400)
            .json({ success: false, message: "Lead already pinned " });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
      }
    }
  );

  // Unpin a lead for the logged-in user
  router.post(
    "/:id/unpin",
    fetchUser,

    async (req, res) => {
      try {
        UserPinnedLead.init(req.userinfo.tenantcode);
        const success = await UserPinnedLead.unpinLead(
          req.userinfo.id,
          req.params.id
        );
        if (success) {
          res
            .status(200)
            .json({ success: true, message: "Lead unpinned successfully" });
        } else {
          res
            .status(400)
            .json({ success: false, message: "Lead was not pinned" });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
      }
    }
  );

  app.use(process.env.BASE_API_URL + '/api/leads', router);
};
