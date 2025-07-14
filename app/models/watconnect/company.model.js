/**
 * @author      Abdul Pathan
 * @date        Aug, 2024
 * @copyright   www.ibirdsservices.com
 */

const sql = require("../db.js");
const pgSchema = require("../../models/watconnect/pgschema.model.js");
// const pgSchema = require("../../models/p");
const nodeMailer = require("nodemailer");
const moment = require("moment");
let schema = "";

function init(schema_name) {
  this.schema = schema_name;
}

// Helper function to format schema name
function formatSchemaName(schemaName) {
  if (!schemaName) return schemaName;

  // Convert to lowercase and replace spaces with underscores
  const formatted = schemaName.toLowerCase().replace(/\s+/g, "_");
  console.log(`Schema name formatting: "${schemaName}" -> "${formatted}"`);
  return formatted;
}

async function findAllCompany(is_active) {
  let query = `SELECT * FROM public.vw_active_companies`;
  const params = [];

  if (is_active !== undefined) {
    query += ` WHERE company_active = $1`;
    params.push(is_active);
  }

  query += ` ORDER BY name`;

  const result = await sql.query(query, params);
  return result.rows.length > 0 ? result.rows : null;
}

// async function createCompanyWithUser(newCompanyWithUser, cryptPassword) {
//   await sql.connect();
//   try {
//     await sql.query("BEGIN");
//     let companyInfo = newCompanyWithUser["company_info"];
//     let sourceschema = newCompanyWithUser["schema"].source_schemaname;
//     let targetSchema = formatSchemaName(
//       newCompanyWithUser["schema"].target_schemaname
//     );
//     let tenantcode = targetSchema;

//     let invoice = newCompanyWithUser["invoice"];
//     let addons = newCompanyWithUser["addons"]; //Added by Yamini

//     const result = await sql.query(
//       `INSERT INTO public.company (name, tenantcode, isactive, systememail, adminemail, street, city, state, pincode, country, sourceschema, logourl)  
//        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
//       [
//         companyInfo.name,
//         tenantcode,
//         companyInfo.isactive,
//         companyInfo.systememail,
//         companyInfo.adminemail,
//         companyInfo.street,
//         companyInfo.city,
//         companyInfo.state,
//         companyInfo.pincode,
//         companyInfo.country,
//         sourceschema,
//         companyInfo.logourl,
//       ]
//     );

//     if (result.rows.length > 0) {
//       let company_id = result.rows[0].id;

//       let start_date = moment(invoice.date);
//       let end_date,
//         due_date,
//         validity = 14,
//         invoiceStatus;

//       if (invoice.planname.toLowerCase() === "free") {
//         end_date = start_date.add(14, "days").format("YYYY-MM-DD");
//         invoiceStatus = "Complete";
//         invoice.amount = 0;
//       } else {
//         end_date = start_date
//           .add(invoice.validity, "months")
//           .format("YYYY-MM-DD");
//         validity = invoice.validity;
//         due_date = moment(invoice.date).add(10, "days").format("YYYY-MM-DD");
//         invoiceStatus = "Pending";
//       }

//       const subscriptionData = [
//         company_id,
//         invoice.plan,
//         invoice.date,
//         end_date,
//         validity,
//         invoice.billing_cycle,
//       ];

//       const subscriptionResult = await sql.query(
//         `INSERT INTO public.subscriptions(company_id, plan_id, start_date, end_date, validity, billing_cycle) 
//          VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
//         subscriptionData
//       );
//       const subscriptionId = subscriptionResult?.rows[0]?.id;

//       if (Array.isArray(addons) && addons.length > 0) {
//         const addonInsertQuery = `
//           INSERT INTO public.subscription_addons 
//           (subscription_id, addon_id, start_date, end_date, billing_cycle, quantity)
//           VALUES ($1, $2, $3, $4, $5, $6)
//         `;

//         for (const addon of addons) {
//           await sql.query(addonInsertQuery, [
//             subscriptionId,
//             addon.addon_id,
//             invoice.date,
//             end_date,
//             invoice.billing_cycle,
//             addon.quantity,
//           ]);
//         }
//         var invoiceTotalAmount = invoice.total_amount || invoice.amount;
//       } else {
//         var invoiceTotalAmount = invoice.amount;
//       }

//       const invoiceData = [
//         subscriptionId,
//         invoice.date,
//         invoiceTotalAmount,
//         invoiceStatus,
//         due_date,
//       ];

//       const invoiceResult = await sql.query(
//         `INSERT INTO public.invoices(subscription_id, invoice_date, total_amount, status, payment_due_date) 
//          VALUES ($1, $2, $3, $4, $5) RETURNING *`,
//         invoiceData
//       );

//       const invoiceId = invoiceResult?.rows[0]?.id;

//       await sql.query(
//         `INSERT INTO public.invoice_items
//       (invoice_id, type, plan_id, subscription_id, addon_id, unit_price, quantity, amount)
//       VALUES ($1, $2, $3, $4, NULL, $5, 1, $5)`,
//         [invoiceId, "plan", invoice.plan, subscriptionId, invoice.amount]
//       );

//       if (Array.isArray(addons) && addons.length > 0) {
//         const invoiceItemQuery = `
//         INSERT INTO public.invoice_items
//         (invoice_id, type, plan_id, subscription_id, addon_id, unit_price, quantity, amount)
//         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
//       `;

//         for (const addon of addons) {
//           await sql.query(invoiceItemQuery, [
//             invoiceId,
//             "addon",
//             invoice.plan,
//             subscriptionId,
//             addon.addon_id,
//             addon.unit_price,
//             addon.quantity,
//             addon.invoice_amount,
//           ]);
//         }
//       }

//       try {
//         await pgSchema.cloneSchemaWithoutData(sourceschema, targetSchema);
//         let userInfo = newCompanyWithUser["user_info"];
//         const userResult = await sql.query(
//           `INSERT INTO ${targetSchema}.user (firstname, lastname, password, email,  whatsapp_number, country_code, userrole, companyid)  
//            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
//           [
//             userInfo.firstname,
//             userInfo.lastname,
//             cryptPassword,
//             userInfo.email,
//             userInfo.whatsapp_number,
//             userInfo.country_code,
//             "ADMIN",
//             company_id,
//           ]
//         );
//         await sql.query("COMMIT");
//         return {
//           id: userResult.rows[0].id,
//           company_id: company_id,
//           invoice_id: invoiceResult.rows[0].id,
//         };
//       } catch (error) {
//         await sql.query("ROLLBACK");
//         console.error("Schema cloning or user insertion failed:", error);
//         throw error;
//       }
//     }
//   } catch (error) {
//     await sql.query("ROLLBACK");
//     console.error("Transaction failed:", error);
//     throw error;
//   }
//   return null;
// }

async function createCompanyWithUser(newCompanyWithUser, cryptPassword) {
  await sql.connect();
  try {
    await sql.query("BEGIN");

    let companyInfo = newCompanyWithUser["company_info"];
    let sourceschema = newCompanyWithUser["schema"].source_schemaname;
    let targetSchema = formatSchemaName(newCompanyWithUser["schema"].target_schemaname);
    let tenantcode = targetSchema;

    let invoice = newCompanyWithUser["invoice"];
    let addons = newCompanyWithUser["addons"]; // Added by Yamini

    const result = await sql.query(
      `INSERT INTO public.company (name, tenantcode, isactive, systememail, adminemail, street, city, state, pincode, country, sourceschema, logourl)  
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        companyInfo.name,
        tenantcode,
        companyInfo.isactive,
        companyInfo.systememail,
        companyInfo.adminemail,
        companyInfo.street,
        companyInfo.city,
        companyInfo.state,
        companyInfo.pincode,
        companyInfo.country,
        sourceschema,
        companyInfo.logourl,
      ]
    );

    if (result.rows.length > 0) {
      let company_id = result.rows[0].id;

      let start_date = moment(invoice.date);
      let end_date,
        due_date,
        validity = 14,
        invoiceStatus;

      if (invoice.planname.toLowerCase() === "free") {
        end_date = start_date.add(14, "days").format("YYYY-MM-DD");
        invoiceStatus = "Complete";
        invoice.amount = 0;
      } else {
        end_date = start_date.add(invoice.validity, "months").format("YYYY-MM-DD");
        validity = invoice.validity;
        due_date = moment(invoice.date).add(10, "days").format("YYYY-MM-DD");
        invoiceStatus = "Pending";
      }

      const subscriptionResult = await sql.query(
        `INSERT INTO public.subscriptions(company_id, plan_id, start_date, end_date, validity, billing_cycle) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          company_id,
          invoice.plan,
          invoice.date,
          end_date,
          validity,
          invoice.billing_cycle,
        ]
      );
      const subscriptionId = subscriptionResult?.rows[0]?.id;

      if (Array.isArray(addons) && addons.length > 0) {
        const addonInsertQuery = `
          INSERT INTO public.subscription_addons 
          (subscription_id, addon_id, start_date, end_date, billing_cycle, quantity)
          VALUES ($1, $2, $3, $4, $5, $6)
        `;

        for (const addon of addons) {
          await sql.query(addonInsertQuery, [
            subscriptionId,
            addon.addon_id,
            invoice.date,
            end_date,
            invoice.billing_cycle,
            addon.quantity,
          ]);
        }

        var invoiceTotalAmount = invoice.total_amount || invoice.amount;
      } else {
        var invoiceTotalAmount = invoice.amount;
      }

      const invoiceResult = await sql.query(
        `INSERT INTO public.invoices(subscription_id, invoice_date, total_amount, status, payment_due_date) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          subscriptionId,
          invoice.date,
          invoiceTotalAmount,
          invoiceStatus,
          due_date,
        ]
      );

      const invoiceId = invoiceResult?.rows[0]?.id;

      await sql.query(
        `INSERT INTO public.invoice_items
         (invoice_id, type, plan_id, subscription_id, addon_id, unit_price, quantity, amount)
         VALUES ($1, $2, $3, $4, NULL, $5, 1, $5)`,
        [invoiceId, "plan", invoice.plan, subscriptionId, invoice.amount]
      );

      if (Array.isArray(addons) && addons.length > 0) {
        const invoiceItemQuery = `
          INSERT INTO public.invoice_items
          (invoice_id, type, plan_id, subscription_id, addon_id, unit_price, quantity, amount)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        for (const addon of addons) {
          await sql.query(invoiceItemQuery, [
            invoiceId,
            "addon",
            invoice.plan,
            subscriptionId,
            addon.addon_id,
            addon.unit_price,
            addon.quantity,
            addon.invoice_amount,
          ]);
        }
      }

      try {
        await pgSchema.cloneSchemaWithoutData(sourceschema, targetSchema);

        let userInfo = newCompanyWithUser["user_info"];
        const userValues = [
          userInfo.firstname,
          userInfo.lastname,
          cryptPassword,
          userInfo.email,
          userInfo.whatsapp_number,
          userInfo.country_code,
          "ADMIN",
          company_id,

        ];

        // Insert into tenant schema user table
        const userResult = await sql.query(
          `INSERT INTO ${targetSchema}.user (firstname, lastname, password, email, whatsapp_number, country_code, userrole, companyid)  
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          userValues
        );

        // Insert into public.user table as well
        await sql.query(
          `INSERT INTO public.user (firstname, lastname, password, email, whatsapp_number, country_code, userrole, companyid)  
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8 )`,
          userValues
        );

        await sql.query("COMMIT");
        console.log("userResultuserResult", userResult);
        return {
          id: userResult.rows[0].id,
          company_id: company_id,
          invoice_id: invoiceResult.rows[0].id,
        };

      } catch (error) {
        await sql.query("ROLLBACK");
        console.error("Schema cloning or user insertion failed:", error);
        throw error;
      }
    }
  } catch (error) {
    await sql.query("ROLLBACK");
    console.error("Transaction failed:", error);
    throw error;
  }

  return null;
}


async function getSourceSchemas() {
  console.log("workin model query shema");
  let query = `select s.nspname as schema_name
    from pg_catalog.pg_namespace s
    join pg_catalog.pg_user u on u.usesysid = s.nspowner
    where nspname not in ('information_schema', 'pg_catalog', 'public')
          and nspname not like 'pg_toast%'
          and nspname not like 'pg_temp_%'
    order by schema_name`;
  const result = await sql.query(query);
  let schemanames = [];
  if (result.rows.length > 0) {
    result.rows.forEach((item) => {
      schemanames.push(item.schema_name);
    });
    return schemanames;
  }
}
// Company Update By Company Id
async function updateById(updateCompanyInfo) {
  try {
    const result = await sql.query(
      `UPDATE public.company SET name=$2, tenantcode=$3, isactive=$4, systememail=$5, adminemail=$6, street=$7, city=$8, state=$9, pincode=$10, country=$11, sourceschema=$12, logourl=$13 WHERE id=$1`,
      [
        updateCompanyInfo.id,
        updateCompanyInfo.name,
        updateCompanyInfo.tenantcode,
        updateCompanyInfo.company_active,
        updateCompanyInfo.systememail,
        updateCompanyInfo.adminemail,
        updateCompanyInfo.street,
        updateCompanyInfo.city,
        updateCompanyInfo.state,
        updateCompanyInfo.pincode,
        updateCompanyInfo.country,
        updateCompanyInfo.sourceschema,
        updateCompanyInfo.logourl,
      ]
    );
    if (result.rowCount > 0) return "Updated successfully";
  } catch (error) {
    console.log("error ", error);
  }

  return null;
}

async function findById(company_id) {
  const query = `SELECT * FROM public.company `;
  const result = await sql.query(query + ` WHERE id = $1`, [company_id]);
  if (result.rows.length > 0) return result.rows[0];
  return null;
}

// Added By Yamini
async function findCompanyWithUser(company_id) {
  // Fetch the tenantcode dynamically
  const companyQuery = `SELECT tenantcode FROM public.company WHERE id = $1`;
  const companyResult = await sql.query(companyQuery, [company_id]);
  // console.log(companyResult);
  if (companyResult.rows.length === 0) {
    throw new Error("Company not found.");
  }

  const tenantcode = companyResult.rows[0].tenantcode;

  // Main query with tenantcode dynamically included
  const query = `
   SELECT 
  comp.id AS company_id,
  comp.name AS company_name,
  comp.tenantcode,
  comp.sourceschema,
  comp.isactive,
  comp.systememail,
  comp.adminemail,
  comp.city,
  comp.street,
  comp.pincode,
  comp.state,
  comp.logourl,
  comp.country,
  usr.id AS user_id,
  usr.firstname,
  usr.lastname,
  usr.password,
  usr.email,
  usr.whatsapp_number,
  usr.country_code,
  plans.id AS plan_id,
  plans.name AS plan_name,
  plans.number_of_whatsapp_setting,
  plans.number_of_users,
  subscriptions.id AS subscription_id,
  subscriptions.validity,
  invoices.id AS invoice_id,
  invoices.total_amount AS amount,
  invoices.invoice_date,
  invoices.status AS plan_status,
  subscriptions.start_date,
  subscriptions.end_date,

  -- Aggregate plan modules
  json_agg(DISTINCT jsonb_build_object(
    'id', pm.moduleid
  )) AS modules,

  jsonb_agg(DISTINCT jsonb_build_object(
  'addon_id', ia.addon_id,
  'amount', ia.amount,
  'id', ia.id,
  'invoice_id', ia.invoice_id,
  'plan_id', ia.plan_id,
  'quantity', ia.quantity,
  'subscription_id', ia.subscription_id,
  'type', ia.type,
  'unit_price', ia.unit_price,
  'status', ia.status
)) FILTER (WHERE ia.addon_id IS NOT NULL) AS addons


FROM public.company comp

INNER JOIN ${tenantcode}.user usr ON comp.id = usr.companyid
INNER JOIN public.subscriptions ON subscriptions.company_id = comp.id
INNER JOIN public.plans ON plans.id = subscriptions.plan_id
INNER JOIN public.invoices ON invoices.subscription_id = subscriptions.id
LEFT JOIN public.invoice_items ia ON ia.subscription_id = subscriptions.id
LEFT JOIN public.plan_module pm ON plans.id = pm.planid
LEFT JOIN public.subscription_addons sa ON sa.subscription_id = subscriptions.id

WHERE comp.id = $1 AND usr.userrole = 'ADMIN'

GROUP BY comp.id, usr.id, plans.id, subscriptions.id, invoices.id

ORDER BY invoices.invoice_date DESC
LIMIT 1;

  `;

  // Execute the main query
  const result = await sql.query(query, [company_id]);

  if (result.rows.length > 0) {
    return result.rows;
  }

  return null;
}

async function updateCompanyWithUser(newCompanyWithUser) {
  await sql.connect();
  try {
    await sql.query("BEGIN");
    let companyInfo = newCompanyWithUser["company_info"];
    let sourceschema = newCompanyWithUser["schema"].source_schemaname;
    let targetSchema = formatSchemaName(
      newCompanyWithUser["schema"].target_schemaname
    );
    let tenantcode = targetSchema;
    let modules = newCompanyWithUser["modules"];

    // Update company details
    const result = await sql.query(
      `UPDATE public.company 
       SET name=$2, tenantcode=$3, isactive=$4, systememail=$5, adminemail=$6, 
           street=$7, city=$8, state=$9, pincode=$10, country=$11, sourceschema=$12, logourl=$13 
       WHERE id=$1`,
      [
        companyInfo.companyId,
        companyInfo.name,
        tenantcode,
        companyInfo.isactive,
        companyInfo.systememail,
        companyInfo.adminemail,
        companyInfo.street,
        companyInfo.city,
        companyInfo.state,
        companyInfo.pincode,
        companyInfo.country,
        sourceschema,
        companyInfo.logourl,
      ]
    );

    if (result.rowCount > 0) {
      let company_id = companyInfo.companyId;

      // Update subscription details
      let invoice = newCompanyWithUser["invoice"];
      let start_date = moment(invoice.date);
      let end_date,
        due_date,
        validity = 14;
      //  invoiceStatus;

      if (invoice.planname.toLowerCase() === "free") {
        end_date = start_date.add(14, "days").format("YYYY-MM-DD");
        // invoiceStatus = "Complete";
        invoice.amount = 0;
      } else {
        end_date = start_date
          .add(invoice.validity, "months")
          .format("YYYY-MM-DD");
        validity = invoice.validity;
        due_date = moment(invoice.date).add(10, "days").format("YYYY-MM-DD");
        // invoiceStatus = "Pending";
      }

      const subscriptionData = [
        invoice.plan,
        moment(invoice.date).format("YYYY-MM-DD"),
        end_date,
        validity,
        invoice.subscriptionId,
      ];

      await sql.query(
        `UPDATE public.subscriptions 
         SET plan_id=$1, start_date=$2, end_date=$3, validity=$4 
         WHERE id=$5`,
        subscriptionData
      );

      const invoiceData = [
        invoice.invoiceId,
        moment(invoice.date).format("YYYY-MM-DD"),
        invoice.amount,
        // invoiceStatus,
        due_date,
      ];

      await sql.query(
        `UPDATE public.invoices 
         SET invoice_date=$2, total_amount=$3,  payment_due_date=$4
         WHERE id=$1`,
        invoiceData
      );

      // Update schema without data
      try {
        await pgSchema.updateSchemaWithoutData(sourceschema, targetSchema);

        // Update user in the correct schema
        let userInfo = newCompanyWithUser["user_info"];
        const userResult = await sql.query(
          `UPDATE ${targetSchema}.user 
           SET firstname=$2, lastname=$3, email=$4, whatsapp_number=$5, companyid=$6, isactive=$7 , country_code=$8
           WHERE id=$1`,
          [
            userInfo.userId,
            userInfo.firstname,
            userInfo.lastname,
            userInfo.email,
            userInfo.whatsapp_number,
            company_id,
            companyInfo.isactive,
            userInfo.country_code,
          ]
        );

        if (userResult.rowCount > 0) {
          await sql.query("COMMIT");
          return "Successfully Updated";
        }
      } catch (error) {
        await sql.query("ROLLBACK");
        console.error("Schema update or user update failed:", error);
        throw error;
      }
    }
  } catch (error) {
    await sql.query("ROLLBACK");
    console.error("Transaction failed:", error);
    throw error;
  }
  return null;
}

async function sendeMail(username, password) {
  // let mailTransporter = nodeMailer.createTransport({
  //   service: 'gmail',
  //   auth: {
  //     user: 'contact@watconnect.com',
  //     pass: 'iBirds@@2025'
  //   }
  // });

  let mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_EMAIL_PWD,
    },
  });

  let mailDetail = {
    from: "no-reply@blackbox.com",
    to: username,
    subject: "Registration Mail",
    text: "",
    html: `<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:Helvetica,Arial,sans-serif;margin:0;padding:0;background-color:#fff"><table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;font-family:Arial,Helvetica,sans-serif;background-color:#efefef"><tbody><tr><td align="center" style="padding:1rem 2rem;vertical-align:top;width:100%"><table role="presentation" style="max-width:600px;min-width:600px;border-collapse:collapse;border:0;border-spacing:0;text-align:left"><tbody><tr><td style="padding:40px 0 0"><div style="text-align:center"></div><div style="padding:20px;min-height:300px;background-color:#fff"><div style="color:#000;text-align:left"><p style="padding-bottom:16px">Dear Admin,</p><p>I hope this email finds you well. We would like to inform you about the status of your recent Whatsapp Business api registration application.</p><p>Congratulations! Your application has met all the necessary requirements, and the registration process has been successfully completed. This means that your whatsapp business api is now officially registered.</p><p>Please find the credentials below:</p><table style="width:100%;background:#efefef;border-top:2px solid #31373f;margin-bottom:1rem"><tbody><tr style="vertical-align:top"><td style="width:100%;padding:16px 8px"><div><b>Username:</b> ${username}<br><b>Password:</b> ${password}<br></div></td></tr></tbody></table><p>If you have any questions or concerns regarding your whatsapp business api registration, feel free to reach out to <a href="https://ibirdsservices.com/" target="_blank" style="color:inherit;text-decoration:underline">ibirdsservices.com</a>. They will be happy to assist you and provide any necessary clarification.</p><p>Thank you for your attention to this matter.</p></div></div><div style="padding-top:20px;color:#999;text-align:center"><p style="padding-bottom:16px"><a href="https://sadabharat.com/" target="_blank" style="color:inherit;text-decoration:underline">iBirds Software Services Pvt. Ltd.</a></p></div></td></tr></tbody></table></td></tr></tbody></table></body></html>`,
  };

  mailTransporter.sendMail(mailDetail, function (err, data) {
    if (err) {
      return err;
    } else {
      console.log("emial sent");
      return "Email Sent Successfully";
    }
  });
}

async function duplicateEmailCheck(email, id) {
  const query = id
    ? `SELECT 1 FROM public.company WHERE adminemail = $1 AND id != $2 LIMIT 1`
    : `SELECT 1 FROM public.company WHERE adminemail = $1 LIMIT 1`;

  const queryParams = id ? [email, id] : [email];

  try {
    const result = await sql.query(query, queryParams);
    return result.rows.length > 0 ? true : null;
  } catch (error) {
    console.error("Error checking email:", error);
    throw error;
  }
}

async function findByEmail(email) {
  const query = `SELECT * FROM public.company `;
  const result = await sql.query(query + ` WHERE adminemail = $1`, [email]);
  if (result.rows.length > 0) return result.rows[0];
  return null;
}

module.exports = {
  init,
  findAllCompany,
  createCompanyWithUser,
  getSourceSchemas,
  updateById,
  findById,
  findCompanyWithUser,
  updateCompanyWithUser,
  sendeMail,
  duplicateEmailCheck,
  findByEmail,
  formatSchemaName,
};
