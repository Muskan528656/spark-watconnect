/**
 * @author      Muskan Khan
 * @date       July, 2025
 * @copyright   www.ibirdsservices.com
 */

const sql = require("../db");

let schema = "";
function init(schema_name) {
  this.schema = schema_name;
}

// updated by yamini
async function getAllRecords(status = null) {
  try {
    let query = `SELECT * FROM vw_plans_with_modules_prices`;
    let params = [];

    if (status !== null) {
      query += ` WHERE status = $1`;
      params.push(status);
    }

    const result = await sql.query(query, params);
    return result.rows.length > 0 ? result.rows : null;
  } catch (error) {
    console.error("Error fetching plans:", error);
    throw error;
  }
}
// async function getAllRecords(status = null) {
//   try {
//     let params = [];

//     let query = `SELECT 
//                 p.id AS plan_id,
//                 p.name AS plan_name,
//                 p.status,
//                 p.number_of_whatsapp_setting,
//                 p.number_of_users,
//                 p.msg_limits,
//                    ARRAY_AGG(
//       DISTINCT jsonb_build_object(
//         'id', m.id,
//         'name', m.name
//       )
//     ) FILTER (WHERE m.id IS NOT NULL) AS modules,

//     JSON_AGG(
//       DISTINCT jsonb_build_object(
//         'billing_cycle', pp.billing_cycle,
//         'price', pp.price
//       )
//     ) FILTER (WHERE pp.id IS NOT NULL) AS prices

//   FROM public.plans p
//   LEFT JOIN public.plan_module pm ON p.id = pm.planid
//   LEFT JOIN public.module m ON pm.moduleid = m.id
//   LEFT JOIN public.plan_prices pp ON p.id = pp.plan_id
// `;

//     if (status !== null) {
//       query += ` WHERE p.status = $1`;
//       params.push(status);
//     }

//     query += `
//   GROUP BY p.id
//   ORDER BY p.name ASC
// `;

//     const result = await sql.query(query, params);
//     return result.rows.length > 0 ? result.rows : null;
//   } catch (error) {
//     console.error("Error fetching plans:", error);
//     throw error;
//   }
// }
// updated by yamini

async function createRecord(planInfo, planModules) {
  const {
    name,
    status,
    number_of_whatsapp_setting,
    number_of_users,
    msg_limits,
    price_per_month,
    price_per_quarterly,
    price_per_half_yearly,
    price_per_year,
  } = planInfo;

  const safeMsgLimits = msg_limits ? parseInt(msg_limits, 10) || null : null;

  try {
    await sql.query("BEGIN");

    // Insert into `plans` table
    const planResult = await sql.query(
      `INSERT INTO public.plans(name, status, number_of_whatsapp_setting, number_of_users, msg_limits) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, status, number_of_whatsapp_setting, number_of_users, safeMsgLimits]
    );

    if (planResult.rows.length === 0) {
      throw new Error("Failed to insert plan.");
    }

    const planId = planResult.rows[0].id;

    // Insert into `plan_prices`
    const prices = [
      { billing_cycle: "monthly", price: price_per_month },
      { billing_cycle: "quarterly", price: price_per_quarterly },
      { billing_cycle: "half_yearly", price: price_per_half_yearly },
      { billing_cycle: "yearly", price: price_per_year },
    ];

    for (const { billing_cycle, price } of prices) {
      if (price !== undefined && price !== null && price !== "") {
        await sql.query(
          `INSERT INTO public.plan_prices(plan_id, billing_cycle, price)
             VALUES ($1, $2, $3)`,
          [planId, billing_cycle, price]
        );
      }
    }

    // Insert into `plan_module`
    for (const module of planModules) {
      await sql.query(
        `INSERT INTO public.plan_module(planid, moduleid) VALUES ($1, $2)`,
        [planId, module.id]
      );
    }

    await sql.query("COMMIT");
    return planResult.rows[0];
  } catch (error) {
    await sql.query("ROLLBACK");
    console.error("Error during plan insert transaction:", error);
    throw error;
  }
}
// updated by yamini
async function updateRecord(planId, planInfo, planModules) {
  const {
    name,
    status,
    number_of_whatsapp_setting,
    number_of_users,
    msg_limits,
    price_per_month,
    price_per_quarterly,
    price_per_half_yearly,
    price_per_year,
  } = planInfo;

  try {
    await sql.query("BEGIN");

    const planResult = await sql.query(
      `UPDATE public.plans 
         SET name = $1, status = $2, number_of_whatsapp_setting = $3, number_of_users = $4, msg_limits = $5
         WHERE id = $6 RETURNING *`,
      [
        name,
        status,
        number_of_whatsapp_setting,
        number_of_users,
        msg_limits,
        planId,
      ]
    );

    if (planResult.rows.length === 0) {
      throw new Error("Failed to update plan.");
    }

    await sql.query(`DELETE FROM public.plan_prices WHERE plan_id = $1`, [
      planId,
    ]);

    const priceMap = {
      monthly: price_per_month,
      quarterly: price_per_quarterly,
      half_yearly: price_per_half_yearly,
      yearly: price_per_year,
    };

    for (const [billing_cycle, price] of Object.entries(priceMap)) {
      if (price != null) {
        await sql.query(
          `INSERT INTO public.plan_prices(plan_id, billing_cycle, price) VALUES ($1, $2, $3)`,
          [planId, billing_cycle, price]
        );
      }
    }

    await sql.query(`DELETE FROM public.plan_module WHERE planid = $1`, [
      planId,
    ]);

    for (const module of planModules) {
      await sql.query(
        `INSERT INTO public.plan_module(planid, moduleid) VALUES ($1, $2)`,
        [planId, module.id]
      );
    }

    await sql.query("COMMIT");
    return planResult.rows[0];
  } catch (error) {
    await sql.query("ROLLBACK");
    console.error("Error during plan update transaction:", error);
    return null;
  }
}
// updated by yamini
async function deleteRecord(id) {
  try {
    await sql.query("BEGIN");
    await sql.query(`DELETE FROM public.plan_prices WHERE plan_id = $1`, [id]);
    await sql.query(`DELETE FROM public.plan_module WHERE planid = $1`, [id]);
    const result = await sql.query(`DELETE FROM public.plans WHERE id = $1`, [
      id,
    ]);
    await sql.query("COMMIT");
    if (result.rowCount > 0) {
      return "Success";
    }
    return null;
  } catch (error) {
    await sql.query("ROLLBACK");
    console.error("Error deleting record:", error);
    throw error;
  }
}

async function fetchActiveRecords() {
  try {
    const result = await sql.query(
      `SELECT * FROM public.plans WHERE status='active'`
    );
    return result.rows;
  } catch (error) {
    throw error;
  }
}

// async function findByPlanId(id) {
//   const result = await sql.query(
//     `SELECT 
//     p.id AS plan_id,
//     p.name AS plan_name,
//     MAX(CASE WHEN pp.billing_cycle = 'monthly' THEN pp.price END) AS pricepermonth,
//     MAX(CASE WHEN pp.billing_cycle = 'quarterly' THEN pp.price END) AS priceperquarterly,
//     MAX(CASE WHEN pp.billing_cycle = 'half_yearly' THEN pp.price END) AS priceperhalfyear,
//     MAX(CASE WHEN pp.billing_cycle = 'yearly' THEN pp.price END) AS priceperyear,

//     p.number_of_users,
//     p.status AS plan_status,
//     p.number_of_whatsapp_setting,
//     p.msg_limits,

//     m.id AS module_id,
//     m.name AS module_name,
//     m.api_name,
//     m.icon,
//     m.url,
//     m.icon_type,
//     m.parent_module,
//     m.order_no

// FROM 
//     public.plans p
// LEFT JOIN 
//     public.plan_prices pp ON p.id = pp.plan_id
// LEFT JOIN 
//     public.plan_module pm ON p.id = pm.planid
// LEFT JOIN 
//     public.module m ON pm.moduleid = m.id
// WHERE 
//     p.id = $1
// GROUP BY
//     p.id, p.name, p.number_of_users, p.status, 
//     p.number_of_whatsapp_setting, p.msg_limits,
//     m.id, m.name, m.api_name, m.icon, m.url, 
//     m.icon_type, m.parent_module, m.order_no`,
//     [id]
//   );

//   if (result.rows.length === 0) return null;

//   const addonResult = await sql.query(
//     `SELECT * FROM public.invoice_items WHERE plan_id = $1 AND type = 'addon'`,
//     [id]
//   );

//   if (result.rows.length > 0) {
//     // Organize results into a structured format
//     const plan = {
//       id: result.rows[0].plan_id,
//       name: result.rows[0].plan_name,
//       pricepermonth: result.rows[0].pricepermonth,
//       priceperquarterly: result.rows[0].priceperquarterly,
//       priceperhalfyear: result.rows[0].priceperhalfyear,
//       priceperyear: result.rows[0].priceperyear,
//       number_of_users: result.rows[0].number_of_users,
//       status: result.rows[0].plan_status,
//       msg_limits: result.rows[0].msg_limits,
//       number_of_whatsapp_setting: result.rows[0].number_of_whatsapp_setting,
//       modules: result.rows
//         .filter((row) => row.module_id)
//         .map((row) => ({
//           id: row.module_id,
//           name: row.module_name,
//           api_name: row.api_name,
//           icon: row.icon,
//           url: row.url,
//           icon_type: row.icon_type,
//           parent_module: row.parent_module,
//           order_no: row.order_no,
//         })),
//       addons: addonResult.rows,
//     };

//     return plan;
//   }

//   return null;
// }
async function findByPlanId(id) {
  const result = await sql.query(
    `SELECT * FROM vw_plan_detail_with_modules_prices WHERE plan_id = $1`,
    [id]
  );

  const addonResult = await sql.query(
    `SELECT * FROM public.invoice_items WHERE plan_id = $1 AND type = 'addon'`,
    [id]
  );

  if (result.rows.length > 0) {
    const plan = {
      id: result.rows[0].plan_id,
      name: result.rows[0].plan_name,
      pricepermonth: result.rows[0].pricepermonth,
      priceperquarterly: result.rows[0].priceperquarterly,
      priceperhalfyear: result.rows[0].priceperhalfyear,
      priceperyear: result.rows[0].priceperyear,
      number_of_users: result.rows[0].number_of_users,
      status: result.rows[0].plan_status,
      msg_limits: result.rows[0].msg_limits,
      number_of_whatsapp_setting: result.rows[0].number_of_whatsapp_setting,
      modules: result.rows
        .filter((row) => row.module_id)
        .map((row) => ({
          id: row.module_id,
          name: row.module_name,
          api_name: row.api_name,
          icon: row.icon,
          url: row.url,
          icon_type: row.icon_type,
          parent_module: row.parent_module,
          order_no: row.order_no,
        })),
      addons: addonResult.rows,
    };

    return plan;
  }

  return null;
}


module.exports = {
  getAllRecords,
  createRecord,
  updateRecord,
  deleteRecord,
  fetchActiveRecords,
  findByPlanId,
  init,
};
