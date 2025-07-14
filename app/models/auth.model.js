const sql = require("./db.js");
const global = require("../constants/global.js");

let schema_name = ""
function init(schema_name) {
  this.schema = schema_name;
}

console.log("Thiss->>", this.schema_name);

async function createUser(newUser) {
  const {
    firstname,
    lastname,
    email,
    phone,
    password,
    userrole,
    companyid,
    country_code,
    whatsapp_number,
    blocked
  } = newUser;

  const result = await sql.query(
    `INSERT INTO ${this.schema}.user 
     (firstname, lastname, email, phone, password, userrole, companyid, country_code, whatsapp_number, blocked) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
     RETURNING id, firstname, lastname, email, phone, password, userrole, companyid, country_code, whatsapp_number, blocked`,
    [firstname, lastname, email, phone, password, userrole, companyid, country_code, whatsapp_number, blocked]
  );

  if (result.rowCount > 0) {
    return result.rows[0];
  }
  return null;
};



async function setRole(userrole, userRec) {

  let roleId = userrole == 'ADMIN' ? global.ADMIN_ROLE_ID : global.USER_ROLE_ID;
  const result = await sql.query("INSERT into public.userrole (roleid, userid) VALUES ($1, $2) RETURNING * ",
    [roleId, userRec.id]);


  if (result.rowCount > 0) {
    return result.rows[0];
  }
  return null;

};

async function checkLicenses(companyid, currentUserId) {
  const company = await sql.query("SELECT userlicenses from public.company  where id = $1 ",
    [companyid]);
  let allowedUserLicenses = 0;
  if (company.rowCount > 0) {
    allowedUserLicenses = company.rows[0].userlicenses;
  }

  let result = null;
  let query = `SELECT count(*) total FROM ${this.schema}.user WHERE companyid = $1 AND isactive = true`;
  let params = [companyid];

  if (currentUserId) {
    query += ` AND id != $2`;
    params.push(currentUserId);
  }

  result = await sql.query(query, params);

  // if (currentUserId) 
  //   result = await sql.query(`SELECT count(*) total from ${this.schema}.user where companyid = $1 AND isactive=true AND id != $2`,
  //     [companyid, currentUserId]);
  // } else {
  //   result = await sql.query(`SELECT count(*) total from ${this.schema}.user where companyid = $1 AND isactive=true`,
  //     [companyid]);
  // }


  let existingLicenses = 0;
  if (result.rowCount > 0) {
    existingLicenses = result.rows[0].total;
  }

  if (allowedUserLicenses > existingLicenses)
    return true;
  else
    return false;


};

// async function findByEmail(email) {
//   console.log("Email ->>>>>>>>>>>>>", email);
//   console.log("this.schema ->>>>>>>>>>>>>", this.schema);

//   const result = await sql.query(`
//     SELECT
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
//     'companyname', c.name,
//     'companystreet', c.street,
//     'companycity', c.city,
//     'companypincode', c.pincode,
//     'companystate', c.state,
//     'companycountry', c.country,
//     'tenantcode', c.tenantcode,
//     'logourl', c.logourl,
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
//           'parent_module', 
//             CASE 
//               WHEN m.parent_module IS NOT NULL THEN json_build_object(
//                 'id', pm_parent.id,
//                 'name', pm_parent.name,
//                 'url', pm_parent.url,
//                 'icon', pm_parent.icon
//               )
//               ELSE NULL
//             END
//         )
//       ) FILTER (
//         WHERE m.status = 'active'
//       ), '[]'
//     )
//   ) AS userinfo
// FROM ${this.schema}.user u
// INNER JOIN public.company c ON u.companyid = c.id
// LEFT JOIN public.subscriptions s ON s.company_id = c.id
// LEFT JOIN public.invoices i ON s.id = i.subscription_id
// LEFT JOIN public.plans p ON s.plan_id = p.id
// LEFT JOIN public.plan_module pm ON pm.planid = p.id
// LEFT JOIN public.module m ON pm.moduleid = m.id
// LEFT JOIN public.module pm_parent ON m.parent_module = pm_parent.id
// WHERE u.email = $1
//   AND c.isactive = true 
//   AND u.isactive = true
// GROUP BY 
//   u.id, u.firstname, u.lastname, u.email, u.password, u.userrole, u.companyid,
//   c.id, c.name, c.street, c.city, c.pincode, c.state, c.country, c.tenantcode,
//   s.id, s.validity,
//   p.id, p.name, p.number_of_whatsapp_setting, i.status;
// ;
//   `, [email]);

//   console.log("Result >>>>>>>>>>>>>>", result);

//   return result.rows[0] || null;
// }


// async function findByEmail(email) {
//   console.log("Email ->>>>>>>>>>>>>", email);
//   //   const result = await sql.query(`select
//   //   json_build_object(
//   //           'id', u.id,
//   //           'firstname', u.firstname,
//   //           'lastname', u.lastname,
//   //           'email', u.email,
//   //           'phone',u.phone,
//   //           'userrole', u.userrole,
//   //           'companyid', u.companyid,          
//   //           'password', u.password,
//   //           'companyname', c.name,
//   //           'tenantcode', c.tenantcode,
//   //           'logourl', c.logourl,
//   //           'sidebarbgurl', c.sidebarbgurl,
//   //           'permissions', json_agg(json_build_object(
//   //                   'name', PERMISSION.name
//   //           ))
//   // ) AS userinfo
//   // FROM ROLEPERMISSION
//   // INNER JOIN ROLE ON ROLEPERMISSION.roleid = ROLE.id
//   // INNER JOIN PERMISSION ON ROLEPERMISSION.permissionid =  PERMISSION.id 
//   // INNER JOIN USERROLE ON USERROLE.roleid = ROLEPERMISSION.roleid
//   // INNER JOIN public.USER u ON USERROLE.userid = u.id
//   // INNER JOIN public.COMPANY c ON u.companyid = c.id
//   // WHERE u.email = $1 AND c.isactive = true
//   // GROUP BY u.email, u.id, u.firstname, u.companyid, c.name, c.tenantcode, c.logourl, c.sidebarbgurl`, [email]);
//   const result = await sql.query(`SELECT
//   json_build_object(
//     'id', u.id,
//     'firstname', u.firstname,
//     'lastname', u.lastname,
//     'email', u.email,
//     'phone', u.phone,
//     'whatsapp_number', u.whatsapp_number,
//     'country_code', u.country_code,
//     'password', u.password,
//     'userrole', u.userrole,
//     'companyid', u.companyid,
//     -- 'whatsapp_settings', u.whatsapp_settings,
//     'companyname', c.name,
//     'companystreet', c.street,
//     'companycity', c.city,
//     'companypincode', c.pincode,
//     'companystate', c.state,
//     'companycountry', c.country,
//     'tenantcode', c.tenantcode,
//     'logourl', c.logourl,
//     'sidebarbgurl', c.sidebarbgurl,
//      -- 'has_wallet', c.has_wallet,

//     -- Subscription info
//     'subscription', json_build_object(
//         'id', s.id,
//         'validity', s.validity,
//         'end_date', CASE 
//                       WHEN i.status = 'Complete' THEN s.end_date 
//                       ELSE NULL 
//                     END
//     ),
//     -- Plan info
//     'plan', json_build_object(
//       'id', p.id,
//       'name', p.name,
//       'msg_limits', p.msg_limits,
//       'number_of_whatsapp_setting', COALESCE(p.number_of_whatsapp_setting, 0),
//       'number_of_users', COALESCE(p.number_of_users, 0)
//     ),
//     -- Modules
//        -- Modules
//     'modules', COALESCE(
//       json_agg(
//         DISTINCT jsonb_build_object(
//           'id', m.id,
//           'name', m.name,
//           'url', m.url,
//           'icon', m.icon,
//           'order_no', m.order_no,
//           'status', m.status,
//           'parent_module', m.parent_module
//         )
//       ) FILTER (WHERE pm.moduleid IS NOT NULL AND m.status = 'active'), '[]'
//     )

//   ) AS userinfo
// FROM newschema.user u
// INNER JOIN public.company c ON u.companyid = c.id

// -- Subscription joins
// LEFT JOIN public.subscriptions s ON s.company_id = c.id
// LEFT JOIN public.invoices i ON s.id = i.subscription_id
// LEFT JOIN public.plans p ON s.plan_id = p.id
// LEFT JOIN public.plan_module pm ON pm.planid = p.id
// LEFT JOIN public.module m ON pm.moduleid = m.id

// WHERE u.email = 'muskan.k@ibirdsservices.com' AND c.isactive = true AND u.isactive = true

// GROUP BY 
//   u.id, u.firstname, u.lastname, u.email, u.phone, u.password, u.userrole, 
//   u.companyid, u.whatsapp_number, u.country_code,
//   c.id, c.name, c.street, c.city, c.pincode, c.state, c.country, 
//   c.tenantcode, c.logourl, c.sidebarbgurl, 
//   s.id, s.validity, s.end_date,
//   p.id, p.name, p.msg_limits, p.number_of_whatsapp_setting, p.number_of_users,
//   i.status;
// `, [email]);
//   console.log("result@@@@@@@@@@", result);
//   if (result.rows.length > 0)
//     return result.rows[0];
//   return null;
// };



async function findPublicEmail(email) {
  console.log("emaillll=", email);
  const result = await sql.query(`
    SELECT *
    FROM public.user
    WHERE email = $1
    AND isactive = true
  `, [email]);
  console.log("Result->", result);
  return result.rows[0] || null;
}


async function findByEmail(email, companyid) {
  console.log("Email ->", email);
  console.log("schema ->", companyid);

  const result = await sql.query(`
    SELECT
      json_build_object(
        'id', u.id,
        'firstname', u.firstname,
        'lastname', u.lastname,
        'email', u.email,
        'whatsapp_number', u.whatsapp_number,
        'country_code', u.country_code,
        'password', u.password,
        'userrole', u.userrole,
        'companyid', u.companyid,
        'companyname', c.name,
        'tenantcode', c.tenantcode,
          'logourl', c.logourl,
        'sidebarbgurl', c.sidebarbgurl,
        'modules', COALESCE(
          json_agg(
            json_build_object(
              'id', m.id,
              'name', m.name,
              'url', m.url,
              'icon', m.icon,
              'order_no', m.order_no,
              'status', m.status,
              'parent_module', 
                CASE 
                  WHEN m.parent_module IS NOT NULL THEN json_build_object(
                    'id', pm_parent.id,
                    'name', pm_parent.name,
                    'url', pm_parent.url,
                    'icon', pm_parent.icon
                  )
                  ELSE NULL
                END
            )
          ) FILTER (WHERE m.status = 'active'), '[]'
        )
      ) AS userinfo
    FROM public.user u
    INNER JOIN public.company c ON u.companyid = c.id
    LEFT JOIN public.subscriptions s ON s.company_id = c.id
    LEFT JOIN public.invoices i ON s.id = i.subscription_id
    LEFT JOIN public.plans p ON s.plan_id = p.id
    LEFT JOIN public.plan_module pm ON pm.planid = p.id
    LEFT JOIN public.module m ON pm.moduleid = m.id
    LEFT JOIN public.module pm_parent ON m.parent_module = pm_parent.id
    WHERE u.companyid = $1 AND u.isactive = true AND c.isactive = true
    GROUP BY 
      u.id, c.id, s.id, p.id, i.status;
  `, [companyid]);

  return result.rows[0] || null;
}
async function findById(id) {
  // console.log("${this.schema}", this.schema);
  console.log("id->>>>>>>", id);
  try {
    let query = `SELECT u.id, u.email, u.firstname, u.lastname, u.userrole, u.phone, u.isactive, u.managerid, concat(mu.firstname,' ', mu.lastname) managername FROM ${this.schema}.user u`;
    query += ` LEFT JOIN ${this.schema}.user mu ON mu.id = u.managerid `;
    query += ` WHERE u.id = $1`;
    const result = await sql.query(query, [id]);
    console.log("query@@@@@", result);

    return result.rows[0];
  } catch (error) {
  }
  return null;
};

async function updateRecById(id, userRec, userid) {
  delete userRec.id;
  //userRec['lastmodifiedbyid'] = userid;
  //// 
  const query = buildUpdateQuery(id, userRec);
  // Turn req.body into an array of values
  var colValues = Object.keys(userRec).map(function (key) {
    return userRec[key];
  });

  //// 
  try {
    const result = await sql.query(query, colValues);
    if (result.rowCount > 0) {
      return { "id": id, ...userRec };
    }
  } catch (error) {
    return { isError: true, errors: error }
  }

  return null;
};

async function updateById(id, userRec) {
  try {
    const result = await sql.query(`UPDATE ${this.schema}.user SET password = $1 WHERE id = $2`, [userRec.password, id]);
    if (result.rowCount > 0)
      return "Updated successfully";
  } catch (error) {
    //// 
  }

  return null;
};



async function findAll(companyid) {
  try {
    let query = `SELECT u.id, concat(u.firstname, ' ' ,u.lastname) username, concat(mu.firstname,' ', mu.lastname) managername, u.managerid, u.firstname, u.lastname, u.email, u.userrole, u.phone, u.isactive FROM ${this.schema}.user u `;
    query += ` LEFT JOIN ${this.schema}.user mu ON mu.id = u.managerid `;
    query += " WHERE u.companyid = $1";
    const result = await sql.query(query, [companyid]);

    if (result.rows.length > 0)
      return result.rows;

  } catch (error) {
    //// 
  }

  return null;
};

function buildUpdateQuery(id, cols) {
  // Setup static beginning of query
  var query = [`UPDATE ${this.schema}.user `];
  query.push('SET');

  // Create another array storing each set command
  // and assigning a number value for parameterized query
  var set = [];
  Object.keys(cols).forEach(function (key, i) {
    set.push(key + ' = ($' + (i + 1) + ')');
  });
  query.push(set.join(', '));

  // Add the WHERE statement to look up by id
  query.push('WHERE id = \'' + id + '\'');

  // Return a complete query string
  return query.join(' ');
}

async function getAllManager(role) {
  //// 
  try {
    //ORDER BY createddate DESC
    var query = `SELECT id, isactive, concat(firstname, ' ' ,lastname) username, userrole FROM ${this.schema}.user WHERE ";
    query += " userrole = 'SUPER_ADMIN' OR  userrole = 'ADMIN' `;

    //// 
    result = await sql.query(query);
    return result.rows;

    // var query = "SELECT id, concat(firstname, ' ' ,lastname) username, firstname, lastname, email, phone, adharcard dob, gender, qualificatoin, street, city, userrole, servicecategory, servicearea FROM public.user WHERE userrole = 'ADMIN'";
    // result = await sql.query(query);
    // return result.rows;
  } catch (errMsg) {
    //// 
  }

}
async function checkCompanybyTcode(tcode) {
  let query = `SELECT * FROM public.company WHERE LOWER(tenantcode) =  LOWER($1)`;

  try {
    const result = await sql.query(query, [tcode]);
    if (result.rows.length > 0) {
      return result.rows;
    }
  } catch (error) {
    console.error("Error: ", error);
    throw error;
  }

  return null;
}

module.exports = { createUser, updateRecById, setRole, findByEmail, findById, findAll, updateById, getAllManager, checkLicenses, checkCompanybyTcode, findPublicEmail, init };
