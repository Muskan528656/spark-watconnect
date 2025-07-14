const express = require("express");
const cron = require("node-cron");
const Backup = require("./app/models/backup.model.js");
// const bodyParser = require("body-parser"); /* deprecated */
const cors = require("cors");
const http = require("http");
const dotenv = require('dotenv').config();

const fileUpload = require('express-fileupload');
const fs = require('fs');
const app = express();




var corsOptions = {
  origin: "*"
};

app.use(cors(corsOptions));

app.use(fileUpload());

// parse requests of content-type - application/json
app.use(express.json({ limit: '50mb' })); /* bodyParser.json() is deprecated */

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true, limit: '50mb' })); /* bodyParser.urlencoded() is deprecated */

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to bezkoder application." });
});

require("./app/routes/payment.routes.js")(app);

require("./app/routes/account.routes.js")(app);
require("./app/routes/contact.routes.js")(app);


require("./app/routes/auth.routes.js")(app);

require("./app/routes/file.routes.js")(app);
require("./app/routes/task.routes.js")(app);


require("./app/routes/common.routes.js")(app);
require("./app/routes/usertracking.routes.js")(app);
require("./app/routes/device.routes.js")(app);
require("./app/routes/business.routes.js")(app);
require("./app/routes/backup.routes.js")(app);
require("./app/routes/report.routes.js")(app);
require("./app/routes/reportbuilder.routes.js")(app);

require("./app/routes/product.routes.js")(app);
require("./app/routes/pricebook.routes.js")(app);
require("./app/routes/incidents.routes.js")(app);
require("./app/routes/dashboard.routes.js")(app);

require("./app/routes/webhook.routes.js")(app);
require("./app/routes/watconnect/whatsappsetting.routes.js")(app);
// require("./app/routes/watconnect/whatsappmessage.routes.js")(app);
require("./app/routes/watconnect/messagetemplate.routes.js")(app);
require("./app/routes/watconnect/webhooktemplate.routes.js")(app);
require("./app/routes/watconnect/whatsappmessage.routes.js")(app);
require("./app/routes/watconnect/messagehistory.routes.js")(app);
require("./app/routes/watconnect/common.routes.js")(app);
require("./app/routes/watconnect/campaign.routes.js")(app);
require("./app/routes/watconnect/groups.routes.js")(app);
require("./app/routes/watconnect/responsemessage.routes.js")(app);
require("./app/routes/watconnect/file.routes.js")(app);
require("./app/routes/watconnect/module.routes.js")(app);
require("./app/routes/watconnect/plan.routes.js")(app);
require("./app/routes/watconnect/addons.routes.js")(app);
require("./app/routes/watconnect/company.routes.js")(app);
require("./app/routes/watconnect/invoice.routes.js")(app);
require("./app/routes/watconnect/wallet.routes.js")(app);
// require("./app/routes/watconnect/auth.routes.js")(app);
require("./app/routes/watconnect/emailtemplate.routes.js")(app);
require("./app/routes/watconnect/mail.routes.js")(app);
require("./app/routes/watconnect/tag.routes.js")(app);
const sendbulkmsg = require("./app/models/watconnect/sendbulkmessage.model.js");
const Mailer = require("./app/models/watconnect/mail.model.js");
const Company = require("./app/models/watconnect/company.model.js");
const WhatsappSetting = require("./app/models/watconnect/whatsappsetting.model.js");
const walletModel = require("./app/models/watconnect/wallet.model.js");

const Publicleads = require("./app/models/watconnect/publicleads.model.js");

// set port, listen for requests
const PORT = process.env.PORT || 3003;
const server = http.createServer(app);



// const io = require("socket.io")(server, { path: '/socket.io' });

// io.on("connection", (socket) => {


//   socket.on("setup", (userData) => {

//     socket.join(userData.id);

//     socket.emit("connected");

//   })
// })

// require("./app/routes/message.routes.js")(app, io);
// require("./app/routes/lead.routes.js")(app, io);
server.listen(PORT);
//runs the scheduler every friday 11 pm
//delete old backups and take new backups
cron.schedule("0 23 * * 5", function () {


  ////
  let tenants = ['ibs_ibirds', 'ibs_jollyw', 'ibs_dipsa'];

  for (let idx = 0; idx < tenants.length; idx++) {
    let tenant = tenants[idx];
    const files = fs.readdirSync(`${process.env.FILE_UPLOAD_PATH}backup/${tenant}`, 'utf8');
    const response = [];
    for (let file of files) {
      ////
      let filePath = `${process.env.FILE_UPLOAD_PATH}backup/${tenant}/${file}`;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }



    ////
    try {
      let result = Backup.backup(tenant);
      ////
    } catch (error) {
      ////
    }


  }

});


cron.schedule("*/1 * * * *", async () => {
  const currentTime = new Date().toLocaleString();
  // console.log(`Running task at: ${currentTime}`);
  try {
    let tenantcodes = await Company.getSourceSchemas();
    for (const tenant of tenantcodes) {
      const campaignResult = await sendbulkmsg.updateCampaignRecord(tenant);
      // console.log("Campaign update result:", tenant, campaignResult);
      if (campaignResult.campaign_id) {
        const bulkResponse = await sendbulkmsg.sendBulkMessage(
          tenant,
          campaignResult.campaign_id
        );
        // console.log("Bulk message sent. Response:", tenant, bulkResponse);
      } else {
        // console.log(`No campaign ID found for tenant: ${tenant}`);
      }
    }
  } catch (error) {
    console.error("Error running scheduled task:", error);
  }
});

cron.schedule("0 */20 * * *", async function () {
  console.log("Public Leads");
  try {
    const res = await Publicleads.getOpenLeads();

    res.map((data, idx) => {
      let subject = "Unlock the Power of WhatsApp Business for Your Business";
      Mailer.sendEmail(data.email, data, subject, "public_lead");
    });
  } catch (error) {
    console.error("Error running scheduled task:", error);
  }
});


cron.schedule('0 */2 * * *', async () => {
  // console.log("Starting WhatsApp billing sync:", new Date());

  try {
    const phoneNumbers = await WhatsappSetting.getAllPhoneNumbers();
    console.log("phoneNumbers", phoneNumbers)
    for (const record of phoneNumbers) {
      const { phone, tenantcode } = record;

      const start = moment().tz("Asia/Kolkata").startOf('day').unix();
      const end = moment().tz("Asia/Kolkata").endOf('day').unix();
      WhatsappSetting.init(tenantcode);
      const billingData = await WhatsappSetting.getWhatsupBillingCost(phone, start, end);
      // console.log("billingData?.conversation_analytics?.data", billingData?.conversation_analytics?.data)
      const summaries = await WhatsappSetting.buildDailySummaries(
        billingData?.conversation_analytics?.data || [],
        phone,
        tenantcode
      );

      await WhatsappSetting.storeDailyBillingSummaries(summaries);
    }

    console.log("Billing sync completed.");
  } catch (err) {
    console.error("Billing sync failed:", err);
  }
});
cron.schedule('0 23 * * *', async () => {
  console.log("⏰ Running WhatsApp billing reconciliation cron job....");
  walletModel.reconcileWhatsAppBilling();
});
