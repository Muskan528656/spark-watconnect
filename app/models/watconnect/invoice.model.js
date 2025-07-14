/**
 * @author      Muskan Khan
 * @date        June,2025
 * @copyright   www.ibirdsservices.com
 */

const sql = require("../db");
let schema = "";
const moment = require("moment");
const Company = require("../../models/watconnect/company.model");

function init(schema_name) {
  this.schema = schema_name;
}


async function findAll(status) {
  try {
    let query = `SELECT * FROM vw_invoice_details`;
    if (status !== "none") {
      query += ` WHERE status = '${status}'`;
    }

    const result = await sql.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
}


// Added by yamini
async function fetchByCompanyId(id) {
  try {
    const result = await sql.query(
      `SELECT * FROM vw_invoices_by_company WHERE company_id = $1`,
      [id]
    );
    return result.rows;
  } catch (error) {
    throw error;
  }
}

async function getPlanPriceByValidity(planId, validity) {
  const query = `
    SELECT plans.name, plan_prices.price, plan_prices.billing_cycle
    FROM public.plans
    JOIN public.plan_prices ON plan_prices.plan_id = plans.id
    WHERE plans.id = $1
      AND plan_prices.billing_cycle = 
        CASE $2::int
          WHEN 1 THEN 'monthly'
          WHEN 3 THEN 'quarterly'
          WHEN 6 THEN 'half_yearly'
          WHEN 12 THEN 'yearly'
        END
  `;
  const values = [planId, validity];
  const result = await sql.query(query, values);
  return result.rows;
}

// async function fetchInvoiceById(id) {
//   try {
//     const result = await sql.query(
//       `
//    SELECT 
//     inc.*, 
//     sub.company_id, sub.plan_id, sub.validity, sub.start_date, sub.end_date,
//     plans.name AS plan_name,
//     trans.id AS transaction_id, trans.transaction_date,
//     trans.amount AS transaction_amount, trans.payment_method, trans.transaction_cheque_no,
//     inv_items.id AS inv_items_id, inv_items.quantity AS inv_items_quantity,
//     inv_items.unit_price AS inv_items_unit_price, inv_items.type AS inv_items_type,
//     inv_items.amount AS inv_items_amount,inv_items.createddate AS inv_items_createddate,
//     add.name AS addon_name, add.unit AS addon_unit

// FROM public.invoices inc

// LEFT JOIN (
//     SELECT DISTINCT ON (invoice_id) * 
//     FROM public.transactions 
//     ORDER BY invoice_id, transaction_date DESC
// ) trans ON inc.id = trans.invoice_id

// JOIN public.subscriptions sub ON inc.subscription_id = sub.id
// JOIN public.plans ON sub.plan_id = plans.id
// JOIN public.invoice_items inv_items ON inc.id = inv_items.invoice_id
// LEFT JOIN public.addons add ON inv_items.addon_id = add.id

// WHERE inc.id = 
// $1`,
//       [id]
//     );

//     return result.rows;
//   } catch (error) {
//     throw error;
//   }
// }
async function fetchInvoiceById(id) {
  try {
    const result = await sql.query(
      `SELECT * FROM vw_invoice_full_details WHERE id = $1`,
      [id]
    );
    return result.rows;
  } catch (error) {
    throw error;
  }
}


async function addInvoiceWithTransaction(record) {
  try {
    await sql.query("BEGIN");
    let start_date = moment(record.date);
    var end_date;
    var validity = 14;
    if (record.plan_name.toLowerCase() === "free") {
      end_date = start_date.add(14, "days").format("YYYY-MM-DD");
    } else {
      end_date = start_date.add(record.validity, "months").format("YYYY-MM-DD");
      validity = record.validity;
    }

    const plaResult = await sql.query(
      `SELECT * FROM public.plans WHERE id='${record.plan_id}'`
    );
    var plan = {};
    if (plaResult.rows.length > 0) {
      plan = plaResult.rows[0];
    }

    const subResult = await sql.query(
      `SELECT * FROM public.subscriptions WHERE company_id='${record.company_id}' ORDER BY end_date LIMIT 1`
    );
    var lastStartDate, lastEndDate;
    if (subResult.rows.length > 0) {
      let last_subscription = subResult.rows[0];
      lastStartDate = moment(last_subscription.start_date).format("YYYY-MM-DD");
      lastEndDate = moment(last_subscription.end_date).format("YYYY-MM-DD");
    }

    subscriptionData = [
      record.company_id,
      record.plan_id,
      record.date,
      end_date,
      validity,
    ];

    const subscriptionResult = await sql.query(
      `INSERT INTO public.subscriptions(company_id, plan_id, start_date, end_date, validity) VALUES($1,$2,$3,$4,$5) RETURNING *`,
      subscriptionData
    );

    if (subscriptionResult.rows.length > 0) {
      let invoiceData = [
        subscriptionResult.rows[0].id,
        record.date,
        record.amount,
        "Complete",
        record.new_name,
      ];

      const invoiceResult = await sql.query(
        `INSERT INTO public.invoices(subscription_id, invoice_date, total_amount, status, other_name) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        invoiceData
      );
      if (invoiceResult.rows.length > 0) {
        let invoice_id = invoiceResult.rows[0].id;

        let transactionData = [
          invoice_id,
          record.date,
          record.amount,
          record.payment_method,
          "Complete",
          record.transaction_cheque_no,
          record.order_id,
        ];

        const transactionResult = await sql.query(
          `INSERT INTO public.transactions(invoice_id, transaction_date, amount, payment_method, status, transaction_cheque_no, order_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          transactionData
        );

        if (transactionResult.rows.length > 0) {
          let transaction_id = transactionResult.rows[0].id;
          await sql.query("COMMIT");
          return invoiceResult.rows;
        } else {
          await sql.query("ROLLBACK");
        }
      } else {
        await sql.query("ROLLBACK");
      }
    } else {
      await sql.query("ROLLBACK");
    }
  } catch (error) {
    await sql.query("ROLLBACK");
    console.error("eror", error); // or throw error;
    throw error;
  }
  return null;
}

async function updateInvoiceAddTrans(invoice_id, record) {
  try {
    var start_date = moment(record.start_date).format("YYYY-MM-DD");
    var end_date = moment(record.end_date).format("YYYY-MM-DD");

    var validity;
    // if (record.subscription === '86a3b58b-99c4-4c48-bb47-eb3c6d048668') {
    if (record.plan_name.toLowerCase() === "free") {
      end_date = moment(record.start_date).add(14, "days").format("YYYY-MM-DD");
    } else {
      end_date = moment(record.start_date)
        .add(record.validity, "months")
        .format("YYYY-MM-DD");
      validity = record.validity;
    }

    let subscriptionData = [
      record.subscription_id,
      record.company_id,
      record.plan_id,
      start_date,
      end_date,
      validity,
    ];

    const subscriptionResult = await sql.query(
      `UPDATE public.subscriptions set company_id=$2, plan_id=$3, start_date=$4, end_date=$5, validity=$6 WHERE id=$1 RETURNING *`,
      subscriptionData
    );

    if (subscriptionResult.rows.length > 0) {
      let invoiceData = [
        invoice_id,
        record.subscription_id,
        moment(record.invoice_date).format("YYYY-MM-DD"),
        record.amount,
        "Complete",
        record.new_name,
      ];

      const invoiceResult = await sql.query(
        `UPDATE public.invoices set subscription_id=$2, invoice_date=$3, total_amount=$4, status=$5, other_name=$6 WHERE id=$1 RETURNING *`,
        invoiceData
      );

      await sql.query(
        `UPDATE public.invoice_items SET status = $1 WHERE invoice_id = $2`,
        ["Complete", invoice_id]
      );

      if (invoiceResult.rows.length > 0) {
        let invoice_id = invoiceResult.rows[0].id;

        let transactionData = [
          invoice_id,
          moment().format("YYYY-MM-DD"),
          record.amount,
          record.payment_method,
          "Complete",
          record.transaction_cheque_no,
          record.order_id,
        ];
        const transactionResult = await sql.query(
          `INSERT INTO public.transactions(invoice_id, transaction_date, amount, payment_method, status, transaction_cheque_no, order_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          transactionData
        );

        if (transactionResult.rows.length > 0) {
          let transaction_id = transactionResult.rows[0].id;
          await sql.query("COMMIT");
          return invoiceResult.rows;
        } else {
          await sql.query("ROLLBACK");
        }
      } else {
        await sql.query("ROLLBACK");
      }
    } else {
      await sql.query("ROLLBACK");
    }
  } catch (error) {
    await sql.query("ROLLBACK");
    console.error("eror", error); // or throw error;
    throw error;
  }
  return null;
}

async function fetchCompanyAndUserByInvoice(id) {
  try {
    const res = await sql.query(
      `SELECT COMP.TENANTCODE FROM PUBLIC.INVOICES INC JOIN PUBLIC.SUBSCRIPTIONS ON SUBSCRIPTIONS.ID = INC.SUBSCRIPTION_ID JOIN PUBLIC.COMPANY COMP ON SUBSCRIPTIONS.COMPANY_ID = COMP.ID WHERE INC.ID = '${id}'`
    );
    let tCode = res.rows[0].tenantcode;

    const result = await sql.query(`SELECT INC.*,
                                      COMP.ID AS COMPANY_ID,
                                      COMP.NAME AS COMPANY_NAME,
                                      COMP.TENANTCODE,
                                      COMP.SOURCESCHEMA,
                                      COMP.ISACTIVE,
                                      COMP.SYSTEMEMAIL,
                                      COMP.ADMINEMAIL,
                                      COMP.CITY,
                                      COMP.STREET,
                                      COMP.PINCODE,
                                      COMP.STATE,
                                      COMP.COUNTRY,
                                      USR.ID AS USER_ID,
                                      USR.FIRSTNAME,
                                      USR.LASTNAME,
                                      USR.PASSWORD,
                                      USR.EMAIL,
                                      USR.WHATSAPP_NUMBER,
                                      USR.COUNTRY_CODE,
                                      SUBSCRIPTIONS.PLAN_ID,
                                      SUBSCRIPTIONS.START_DATE,
                                      SUBSCRIPTIONS.END_DATE,
                                      SUBSCRIPTIONS.VALIDITY,
                                      PLANS.NAME AS PLAN_NAME
                                    FROM PUBLIC.INVOICES INC
                                    JOIN PUBLIC.SUBSCRIPTIONS ON SUBSCRIPTIONS.ID = INC.SUBSCRIPTION_ID 
                                    JOIN PUBLIC.COMPANY COMP ON SUBSCRIPTIONS.COMPANY_ID = COMP.ID
                                    JOIN ${tCode}.USER USR ON USR.COMPANYID = COMP.ID
                                    JOIN PUBLIC.PLANS ON PLANS.ID = SUBSCRIPTIONS.PLAN_ID
                                    WHERE INC.ID = '${id}'`);
    return result.rows;
  } catch (error) {
    throw error;
  }
}

async function updateInvoice(invoice_id, record) {
  try {
    let invoiceData = [record.status, invoice_id];

    const invoiceResult = await sql.query(
      `UPDATE public.invoices set status=$1 WHERE id=$2 RETURNING *`,
      invoiceData
    );
    if (invoiceResult.rows.length > 0) {
      return invoiceResult.rows;
    }
    return null;
  } catch (error) {
    throw error;
  }
}

async function findSubscriptionsForRenewal(end_date) {
  try {
    let tenantcodes = await Company.getSourceSchemas(); // Fetch tenant schema names
    let queries = [];

    for (let tenantcode of tenantcodes) {
      let query = `
              SELECT 
                  subscriptions.*,
                  users.firstname,
                  users.lastname,
                  users.email,
                  invoices.total_amount,
                  invoices.other_name,
                  company.tenantcode,
                  plans.name AS plan_name,
                  plans.number_of_whatsapp_setting,
                  plans.number_of_users,
                  CASE
                      WHEN subscriptions.validity = 1 THEN plans.pricepermonth
                      ELSE plans.priceperyear
                  END AS plan_price
              FROM public.subscriptions 
              JOIN public.invoices ON invoices.subscription_id = subscriptions.id
              JOIN public.plans ON plans.id = subscriptions.plan_id
              JOIN public.company ON company.id = subscriptions.company_id
              JOIN ${tenantcode}.user AS users ON users.companyid = company.id
              LEFT JOIN public.subscriptions next_sub 
                  ON subscriptions.end_date = next_sub.start_date - INTERVAL '1 DAY'
              WHERE subscriptions.end_date = $1 
                AND users.userrole = 'ADMIN'
                AND next_sub.start_date IS NULL
          `;
      queries.push(sql.query(query, [end_date])); // Add query promise to array
    }

    // Execute all queries
    let results = await Promise.all(queries);

    // Flatten and return results
    return results.flatMap((result) => result.rows);
  } catch (error) {
    throw error;
  }
}

async function hasExistingInvoices(companyId) {
  try {
    const query = `
          SELECT COUNT(*) as count 
          FROM public.invoices 
          WHERE subscription_id IN (
              SELECT id FROM public.subscriptions 
              WHERE company_id = $1
          ) AND status = 'Complete'
      `;

    const result = await sql.query(query, [companyId]);
    // Check if the count is greater than zero
    return result.rows[0].count > 0;
  } catch (error) {
    console.error("Error checking existing invoices:", error);
    throw new Error("Unable to determine if invoices exist for the company.");
  }
}

async function generateInvoiceAddTrans(invoice_id, record) {
  try {
    await sql.query("BEGIN");

    let start_date = moment(record.start_date).format("YYYY-MM-DD");
    let end_date;
    let validity;

    if (record.plan_name.toLowerCase() === "free") {
      end_date = moment(record.start_date).add(14, "days").format("YYYY-MM-DD");
    } else {
      end_date = moment(record.start_date)
        .add(record.validity, "months")
        .format("YYYY-MM-DD");
      validity = record.validity;
    }

    // 1. Insert into subscription_addons
    if (record.addons && Array.isArray(record.addons)) {
      for (const addon of record.addons) {
        const addonData = [
          addon.subscription_id,
          addon.addon_id,
          addon.quantity,
          addon.start_date,
          addon.end_date,
        ];

        await sql.query(
          `
          INSERT INTO public.subscription_addons 
          (subscription_id, addon_id, quantity, start_date, end_date)
          VALUES ($1, $2, $3, $4, $5)
        `,
          addonData
        );
      }
    }

    let invoiceData = [
      record.subscription_id,
      moment().format("YYYY-MM-DD"),
      record.billing_amount,
      "Complete",
      "",
    ];
    // 2. Create invoice total amount and status
    const invoiceResult = await sql.query(
      `INSERT INTO public.invoices(subscription_id, invoice_date, total_amount, status, other_name) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      invoiceData
    );

    const newInvoiceId = invoiceResult.rows[0].id;

    // 3. Insert into invoice_items
    if (record.addons && Array.isArray(record.addons)) {
      for (const addon of record.addons) {
        const invoiceItemData = [
          newInvoiceId,
          addon.plan_id,
          "addon",
          addon.subscription_id,
          addon.unit_price,
          addon.total_price,
          addon.addon_id,
          addon.quantity,
          "Complete",
        ];

        await sql.query(
          `
          INSERT INTO public.invoice_items 
          (invoice_id, plan_id, type, subscription_id, unit_price, amount, addon_id, quantity, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
          invoiceItemData
        );
      }
    }

    // 4. Create transaction entry
    const transactionData = [
      newInvoiceId,
      moment().format("YYYY-MM-DD"),
      record.addonTotal,
      record.payment_method,
      "Complete",
      record.transaction_cheque_no,
      record.order_id,
    ];

    const transactionResult = await sql.query(
      `INSERT INTO public.transactions
       (invoice_id, transaction_date, amount, payment_method, status, transaction_cheque_no, order_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      transactionData
    );

    if (transactionResult.rows.length > 0) {
      await sql.query("COMMIT");
      return transactionResult.rows;
    } else {
      await sql.query("ROLLBACK");
      return null;
    }
  } catch (error) {
    await sql.query("ROLLBACK");
    console.error("Error in generateInvoiceAddTrans:", error);
    throw error;
  }
}

module.exports = {
  findAll,
  fetchByCompanyId,
  fetchInvoiceById,
  addInvoiceWithTransaction,
  updateInvoiceAddTrans,
  updateInvoice,
  fetchCompanyAndUserByInvoice,
  findSubscriptionsForRenewal,
  hasExistingInvoices,
  init,
  generateInvoiceAddTrans,
  getPlanPriceByValidity,
};
