// const sql = require("../db");
// const global = require("../../constants/global.js");

// const Company = require("../../models/watconnect/company.model.js");
// let schema = '';

// function init(schema_name) {
//   this.schema = schema_name;
// }

// async function createUser(newUser) {

//   const { firstname, lastname, email, password, userrole, companyid, managerid, isactive, whatsapp_number, whatsapp_settings, country_code } = newUser;
//   const result = await sql.query(`INSERT into ${this.schema}.user (firstname, lastname, email, password, userrole, companyid, managerid,isactive, whatsapp_number,whatsapp_settings, country_code) VALUES ($1, $2, $3, $4, $5, $6,$7, $8,$9, $10, $11) RETURNING id, firstname, lastname, email, password, userrole, companyid,managerid,isactive, whatsapp_number, whatsapp_settings, country_code`, [firstname, lastname, email, password, userrole, companyid, managerid, isactive, whatsapp_number, whatsapp_settings, country_code]);
//   if (result.rowCount > 0) {
//     return result.rows[0];
//   }
//   return null;
// };



// async function checkLicenses(companyid, currentUserId) {
//   const company = await sql.query("SELECT userlicenses from company where id = $1 ",
//     [companyid]);
//   let allowedUserLicenses = 0;
//   if (company.rowCount > 0) {
//     allowedUserLicenses = company.rows[0].userlicenses;
//   }
//   let result = null;
//   if (currentUserId) {
//     result = await sql.query(`SELECT count(*) total from ${this.schema}.user where companyid = $1 AND isactive=true AND id != $2`,
//       [companyid, currentUserId]);
//   } else {
//     result = await sql.query(`SELECT count(*) total from ${this.schema}.user where companyid = $1 AND isactive=true`,
//       [companyid]);
//   }


//   let existingLicenses = 0;
//   if (result.rowCount > 0) {
//     existingLicenses = result.rows[0].total;
//   }

//   if (allowedUserLicenses > existingLicenses)
//     return true;
//   else
//     return false;


// };
// async function findPublicEmail(email) {
//   console.log("Scchchhc=", schema, email);
//   const result = await sql.query(`
//     SELECT *
//     FROM ${schema}.user
//     WHERE email = $1
//     AND isactive = true
//   `, [email]);
//   console.log("Result->", result);
//   return result.rows[0] || null;
// }

// async function findByEmail(email) {
//   const result = await sql.query(`SELECT
//   json_build_object(
//     'id', u.id,
//     'firstname', u.firstname,
//     'lastname', u.lastname,
//     'email', u.email,
//     'whatsapp_number', u.whatsapp_number,
//     'country_code', u.country_code,
//     'password', u.password,
//     'userrole', u.userrole,
//     'companyid', u.companyid,
//     'whatsapp_settings', u.whatsapp_settings,
//     'companyname', c.name,
//     'companystreet', c.street,
//     'companycity', c.city,
//     'companypincode', c.pincode,
//     'companystate', c.state,
//     'companycountry', c.country,
//     'tenantcode', c.tenantcode,
//     'logourl', c.logourl,
//     'has_wallet', c.has_wallet,
//     'subscription', json_build_object(
//         'id', s.id,
//         'validity', s.validity,
//         'end_date', CASE 
//                       WHEN i.status = 'Complete' THEN s.end_date 
//                       ELSE NULL 
//                     END
//       ),
//     'plan', json_build_object(
//       'id', p.id,
//       'name', p.name,
//       'msg_limits', p.msg_limits,
//       'number_of_whatsapp_setting', COALESCE(p.number_of_whatsapp_setting, 0),
//       'number_of_users', COALESCE(p.number_of_users, 0)
//     ),
//     'modules', COALESCE(
//       json_agg(
//          json_build_object(
//           'id', m.id,
//           'name', m.name,
//           'url', m.url,
//           'icon', m.icon,
//           'order_no', m.order_no,
//           'status', m.status,
//           'parent_module', m.parent_module
//         )
//       ) FILTER (WHERE pm.moduleid IS NOT NULL AND m.status = 'active' ), '[]'
//     )
//   ) AS userinfo
// FROM ${this.schema}.user u
// INNER JOIN public.company c ON u.companyid = c.id
// LEFT JOIN public.subscriptions s ON s.company_id = c.id
// LEFT JOIN public.invoices i ON s.id = i.subscription_id
// LEFT JOIN public.plans p ON s.plan_id = p.id
// LEFT JOIN public.plan_module pm ON pm.planid = p.id
// LEFT JOIN public.module m ON pm.moduleid = m.id
// WHERE u.email = $1 AND c.isactive = true AND  u.isactive = true
// GROUP BY 
//   u.id, u.firstname, u.lastname, u.email, u.password, u.userrole, u.companyid,
//   c.id, c.name, c.street, c.city, c.pincode, c.state, c.country, c.tenantcode,
//   s.id, s.validity,
//   p.id, p.name, p.number_of_whatsapp_setting, i.status`, [email]);
//   if (result.rows.length > 0)
//     return result.rows[0];
//   return null;
// };
// async function findById(id) {
//   try {

//     let query = `SELECT u.id, u.email, concat(u.firstname,' ', u.lastname) contactname, u.firstname, u.lastname, u.userrole, u.isactive, u.managerid, concat(mu.firstname,' ', mu.lastname) managername, u.whatsapp_number, u.country_code, u.whatsapp_settings  FROM ${this.schema}.user u`;
//     query += ` LEFT JOIN ${this.schema}.user mu ON mu.id = u.managerid `;
//     query += ` WHERE u.id = $1`;
//     const result = await sql.query(query, [id]);
//     if (result.rows.length > 0)
//       return result.rows[0];
//   } catch (error) {
//     console.log("error ", error);
//   }

//   return null;
// };

// async function updateRecById(id, userRec, userid) {
//   console.log("Thisisisisiis=>", this.schema);
//   try {
//     delete userRec.id;
//     const query = await buildUpdateQuery(id, userRec, this.schema);
//     var colValues = Object.keys(userRec).map(function (key) {
//       return userRec[key];
//     });
//     const result = await sql.query(query, colValues);
//     if (result.rowCount > 0) {
//       return { "id": id, ...userRec };
//     }
//   } catch (error) {
//     return { isError: true, errors: error }
//   }
//   return null;
// };

// async function updateById(id, userRec) {
//   try {
//     const result = await sql.query(`UPDATE ${this.schema}.user SET password = $1 WHERE id = $2`, [userRec.password, id]);
//     if (result.rowCount > 0)
//       return "Updated successfully";
//   } catch (error) {
//     console.log("error ", error);
//   }

//   return null;
// };

// async function findAll(userinfo) {
//   try {
//     let query = "SELECT u.id, concat(u.firstname, ' ' ,u.lastname) username, concat(mu.firstname,' ', mu.lastname) managername, u.managerid, u.firstname, u.lastname, u.email, u.userrole, u.isactive, u.whatsapp_number, u.whatsapp_settings, u.country_code, c.tenantcode, c.name";

//     let result = [];

//     if (userinfo.userrole === 'SUPER_ADMIN') {
//       let query1 = query + ` AS companyname FROM ${this.schema}.user u LEFT JOIN ${this.schema}.user mu ON mu.id = u.managerid LEFT JOIN public.company c ON c.id = u.companyid ORDER BY username`;
//       const result1 = await sql.query(query1);
//       result = result.concat(result1.rows);

//       let schemaQuery = `select s.nspname as schema_name
//         from pg_catalog.pg_namespace s
//         join pg_catalog.pg_user u on u.usesysid = s.nspowner
//         where nspname not in ('information_schema', 'pg_catalog', 'public', 'ibs_ibirds')
//               and nspname not like 'pg_toast%'
//               and nspname not like 'pg_temp_%'
//         order by schema_name`;
//       const schemaResult = await sql.query(schemaQuery);
//       if (schemaResult.rows.length > 0) {
//         const promises = schemaResult?.rows?.map(async (item) => {
//           let query2 = query + ` AS companyname FROM ${item.schema_name}.user u LEFT JOIN ${item.schema_name}.user mu ON mu.id = u.managerid LEFT JOIN public.company c ON c.id = u.companyid ORDER BY username`;
//           const result2 = await sql.query(query2);
//           return result2.rows;
//         });

//         const query2Results = await Promise.all(promises);
//         result = result.concat(...query2Results);
//       }
//       if (result.length > 0)
//         return result;
//     } else {
//       query += ` AS companyname FROM ${this.schema}.user u LEFT JOIN ${this.schema}.user mu ON mu.id = u.managerid LEFT JOIN public.company c ON c.id = u.companyid WHERE u.companyid = $1 AND (u.id = $2 OR u.managerid = $2)`;
//       const result = await sql.query(query, [userinfo.companyid, userinfo.id]);

//       if (result.rows.length > 0)
//         return result.rows;
//     }

//   } catch (error) {
//     console.log("error ", error);
//   }

//   return null;
// };


// async function buildUpdateQuery(id, cols, schema_name) {
//   console.log("schema_nameschema_nameschema_name", schema_name);
//   console.log("schema_nameschema_name", schema_name);
//   var query = [`UPDATE ${schema_name}.user `];
//   query.push('SET');

//   var set = [];
//   Object.keys(cols).forEach(function (key, i) {
//     set.push(key + ' = ($' + (i + 1) + ')');
//   });
//   query.push(set.join(', '));

//   query.push('WHERE id = \'' + id + '\'');

//   return query.join(' ');
// }

// async function getAllManager(role) {
//   try {
//     var query = `SELECT id, isactive, concat(firstname, ' ' ,lastname) username, userrole FROM ${this.schema}.user WHERE `;
//     query += " userrole = 'SUPER_ADMIN' OR  userrole = 'ADMIN' ";

//     result = await sql.query(query);
//     return result.rows;

//   } catch (errMsg) {
//     console.log('errMsg===>', errMsg);
//   }


// }

// async function checkForDuplicate(email, whatsappNumber, userId = null) {
//   const params = [email, whatsappNumber];
//   let query = `
//       SELECT id, email, whatsapp_number
//       FROM ${this.schema}.user
//       WHERE email = $1
//       ${userId ? `AND id != $3` : ''}
//       UNION ALL
//       SELECT id, email, whatsapp_number
//       FROM ${this.schema}.user
//       WHERE whatsapp_number = $2
//       ${userId ? `AND id != $3` : ''}
     
//   `;

//   if (userId) {
//     params.push(userId);
//   }

//   try {
//     const result = await sql.query(query, params);

//     if (result.rows.length > 0) {
//       return result.rows[0];
//     }
//   } catch (error) {
//     console.error("Error checking for duplicates:", error);
//     throw error;
//   }

//   return null;
// }

// async function checkCompanybyTcode(tcode) {
//   let query = `SELECT * FROM public.company WHERE LOWER(tenantcode) =  LOWER($1)`;

//   try {
//     const result = await sql.query(query, [tcode]);
//     if (result.rows.length > 0) {
//       return result.rows;
//     }
//   } catch (error) {
//     console.error("Error: ", error);
//     throw error;
//   }

//   return null;
// }

// async function getUserCount(companyId) {
//   try {
//     const query = `SELECT COUNT(*) FROM ${this.schema}.user WHERE companyid = $1 AND userrole = $2`;
//     const result = await sql.query(query, [companyId, 'USER']);
//     return parseInt(result.rows[0].count, 10);
//   } catch (error) {
//     console.error("Error fetching user count:", error);
//     throw new Error("Failed to fetch user count");
//   }
// }



// module.exports = {
//   createUser, updateRecById,
//   findByEmail, findById, findAll, updateById, getAllManager,
//   checkLicenses, checkForDuplicate, checkCompanybyTcode, getUserCount, findPublicEmail, init
// };
