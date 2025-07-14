const sql = require("../db");
const global = require("../../constants/global");

let schema = '';
function init(schema_name) {
  this.schema = schema_name;
}


async function findCompanySetting(companyid, settingName) {
  let query = `SELECT * FROM public.companysetting where companyid =$1 AND name = $2`;


  const result = await sql.query(query, [companyid, settingName]);
  if (result.rows.length > 0)
    return result.rows[0];

  return null;
};

async function fetchCompanyInfo(companyid) {
  const result = await sql.query(`SELECT systememail, adminemail FROM public.company WHERE id = $1`, [companyid]);
  if (result.rows.length > 0)
    return result.rows[0];

  return null;
};


async function fetchSystemAdminId(tenantcode) {
  const result = await sql.query(`SELECT u.id from ${this.schema}.user u LEFT JOIN public.company c ON u.companyid = c.id WHERE tenantcode = $1 AND u.userrole ='SYS_ADMIN' AND u.isactive=true limit 1`, [tenantcode]);
  if (result.rows.length > 0)
    return result.rows[0].id;

  return null;

};




async function leadCount(userinfo) {
  let result = ''
  let query = `SELECT count(*) total FROM ${this.schema}.lead `;
  if(userinfo.userrole !== "SYS_ADMIN" ){
    query+= `where createdbyid = $1  OR createdbyid IN (  SELECT id FROM ${this.schema}.user team WHERE managerid = $1) OR ownerid = $1 `;
    result = await sql.query(query, [userinfo.id]);
  }else{
    result = await sql.query(query);
  }
   
  if (result.rows.length > 0)
    return result.rows[0].total;

  return null;
};


async function countActiveGroups(userinfo) {
  let result = ''
  let query = `SELECT count(*) total FROM ${this.schema}.groups WHERE status=true `;
  if(userinfo.userrole !== "SYS_ADMIN" ){
    query+= `AND createdbyid = $1  OR createdbyid IN (  SELECT id FROM ${this.schema}.user team WHERE managerid = $1)`;
    result = await sql.query(query, [userinfo.id]);
  }else{
    result = await sql.query(query);
  }

  if (result.rows.length > 0)
    return result.rows[0].total;

  return null;
};

async function autoResponseCount(userinfo) {
  let result = '';
  let query = `SELECT count(*) total FROM ${this.schema}.auto_response_message `;
  if(userinfo.userrole !== 'SYS_ADMIN'){
    query+= `WHERE createdbyid = $1 OR createdbyid in (SELECT id FROM ${this.schema}.user team where managerid = $1)`;
    result = await sql.query(query, [userinfo.id]);
  }else{
    result = await sql.query(query);
  }
    
  if (result.rows.length > 0)
    return result.rows[0].total;

  return null;
};

async function campaignStatusCount(userid, business_number) {
  let query = `SELECT status, COUNT(*) as total FROM  ${this.schema}.campaign WHERE status IN ('Pending', 'In Progress', 'Completed', 'Aborted') AND createdbyid = $1 AND business_number = $2 GROUP BY status`;
  const result = await sql.query(query, [userid, business_number]);

  const statusCount = {
    Pending: "0",
    'In Progress': "0",
    Completed: "0",
    Aborted: "0",
  };

  if (result.rows && result.rows.length > 0) {
    result.rows.forEach(row => {
      statusCount[row.status] = row.total;
    });
  }
  return statusCount;
};

async function getSetting(name) {
  let result = ''
  let query = `SELECT * FROM public.settings WHERE name = $1`;
  result = await sql.query(query,[name]);
   
  if (result.rows.length > 0)
    return result.rows[0];
  return null;
};

async function incrementMessageCount(business_number) {
  const query = `
      INSERT INTO ${this.schema}.message_count (
          business_number, date, sent_count
      )
      VALUES (
          $1, CURRENT_DATE, 1
      )
      ON CONFLICT (business_number, date)
      DO UPDATE SET sent_count = ${this.schema}.message_count.sent_count + 1
      RETURNING *;
  `;

  const values = [business_number];

  try {
      const result = await sql.query(query, values);
      
      if (result.rows.length > 0) {
          return result.rows[0];
      }
      return null;   
  } catch (error) {
      console.error("Error in incrementMessageCount:", error);
      throw new Error("Database error while incrementing message count.");
  }
};



module.exports = {
  fetchSystemAdminId, findCompanySetting, leadCount, campaignStatusCount, autoResponseCount, fetchCompanyInfo,
  countActiveGroups, getSetting, incrementMessageCount, init
};
