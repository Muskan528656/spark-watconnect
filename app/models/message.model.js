const sql = require("./db.js");

let schema = '';
function init(schema_name){
    this.schema = schema_name;
}

async function create(newMessage, userid){
  delete newMessage.id;
  const result = await sql.query(`INSERT INTO ${this.schema}.message (description, msgtype, parentid, parenttype, createdbyid, lastmodifiedbyid)  VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, 
  [newMessage.description, newMessage.msgtype, newMessage.parentid, 'Lead',  userid, userid]);
  if(result.rows.length > 0){
    return { id: result.rows[0].id, ...newMessage};
  }

  return null;
     
    
  
};

async function createPushNotification(messageid, users, userid, io){
  
  try {
    users.forEach(async (touser) => {
      let touserid = touser.id;
      //// 
      // //// 
      const result = await sql.query(`INSERT INTO ${this.schema}.pushnotification (status, "to", "from", messageid, createdbyid, lastmodifiedbyid)  VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, 
    ['New', touserid, userid,  messageid, userid, userid]);
    
    io.to(touserid).emit("greetings", "IBS_NEW_MESSAGE");

    // 

    });
  } catch (error) {
    // 
  }
  
  

  return null;
     
    
  
};

async function findById (id) {
    //// 
    const result = await sql.query(`SELECT * FROM ${this.schema}.message WHERE id = $1`,[id]);
    //// 
    if(result.rows.length > 0)
      return result.rows[0];
  
  return null;
};

async function findAll(title){
  let query = `SELECT *, concat(ow.firstname, ' ' , ow.lastname) ownername FROM ${this.schema}.message`;
      query += `INNER JOIN ${this.schema}.user ow ON ow.id = ownerid `;

  if (title) {
    query += ` WHERE title LIKE '%${title}%'`;
  }

  query += " ORDER BY createddate DESC ";

  const result = await sql.query(query);
  //// 
  return result.rows;    
};

async function findAllMeetings(userinfo, today){
  let query = `SELECT *, concat(ow.firstname, ' ' , ow.lastname) ownername FROM ${this.schema}.message`;
      query += `INNER JOIN ${this.schema}.user ow ON ow.id = ownerid `;

  if (today) {
    query += ` WHERE type = 'Meeting' AND startdatetime::date = now()::date AND ownerid = $1`;
  }else{
    query += ` WHERE type = 'Meeting' AND ownerid = $1`;
  }

  query += " ORDER BY createddate DESC ";

  const result = await sql.query(query, [userinfo.id]);
  //// 
  return result.rows;    
};


async function findAllToday(){
  let query = `SELECT *, concat(ow.firstname, ' ' , ow.lastname) ownername FROM ${this.schema}.message`;
      query += `INNER JOIN ${this.schema}.user ow ON ow.id = ownerid`;

  //if (title) {
    query += ` WHERE createddate::date = now()::date`;
 // }

  query += " ORDER BY createddate DESC ";

  const result = await sql.query(query);
  //// 
  return result.rows;    
};

async function findAllUnread(userid){
  ////// 
  //const result = await sql.query(`SELECT * FROM message WHERE parentid = $1`,[pid]);
  //// 
  // let query = `SELECT tsk.*, TO_CHAR(tsk.createddate, 'DD Mon, YYYY') date,`;
  // query += " concat(cu.firstname, ' ' , cu.lastname) createdbyname ";
  // query += ` FROM ${this.schema}.message tsk `;
  // query += " INNER JOIN public.user cu ON cu.Id = tsk.createdbyid ";

  let query = `SELECT pu.id, pu.status, msg.parentid, msg.parenttype, msg.description, concat(u.firstname, ' ' , u.lastname) createdbyname, TO_CHAR(msg.createddate, 'DD Mon, YYYY') date  from ${this.schema}.pushnotification pu INNER JOIN ${this.schema}.message msg ON msg.id = pu.messageid INNER JOIN ${this.schema}.user u ON u.id = pu.from WHERE "to" = $1 ORDER BY msg.createddate desc LIMIT 10`

  try {
    //// 
    const result = await sql.query(query, [userid]);
    
    if(result.rows.length > 0)
      return result.rows;
  } catch (error) {
    // 
  }
  

return null;
};

async function findAllOpen(userinfo){
  let query = `SELECT t.*, concat(ow.firstname, ' ' , ow.lastname) ownername FROM ${this.schema}.message t `;
      query += `INNER JOIN ${this.schema}.user ow ON ow.id = ownerid `;

 
    query += ` WHERE status in ('Not Started', 'In Progress' , 'Waiting') AND extract (month from createddate) >= extract(month from now()) - 1 AND     extract (year from createddate) >= extract(year from now())`;

    if(userinfo.userrole === 'USER'){
      query += ` AND ownerid = $1 `;
      query += " ORDER BY createddate DESC ";
      const result = await sql.query(query, [userinfo.id]);
      //// 
      return result.rows; 
    }else{
      query += " ORDER BY createddate DESC ";
      //// 
      const result = await sql.query(query);
      ////// 
      return result.rows; 
    }
      
};




async function updateById (id, newtMessage, userid){
  delete newtMessage.id;
  newtMessage['lastmodifiedbyid'] = userid;
  const query = buildUpdateQuery(id, newtMessage, this.schema);
  // Turn req.body into an array of values
  var colValues = Object.keys(newtMessage).map(function (key) {
    return newtMessage[key];
  });

  //// 
  const result = await sql.query(query,colValues);
  if(result.rowCount > 0){
    return {"id" : id, ...newtMessage};
  }
  return null;
     
    
  
};


async function deleteMessage(id){
  const result = await sql.query(`DELETE FROM ${this.schema}.message WHERE id = $1`, [id]);
  
  if(result.rowCount > 0)
    return "Success"
  return null;
};


async function deletePushNotification(id){
  const result = await sql.query(`DELETE FROM ${this.schema}.pushnotification WHERE id = $1`, [id]);
  
  if(result.rowCount > 0)
    return "Success"
  return null;
};

async function markReadNotification(id){
  try {
    const result = await sql.query(`UPDATE ${this.schema}.pushnotification SET status='Read' WHERE id = $1`, [id]);
  
  if(result.rowCount > 0)
    return "Success"
  } catch (error) {
    // 
  }
  
  return null;
};


function buildUpdateQuery (id, cols, schema) {
  // Setup static beginning of query
  var query = [`UPDATE ${schema}.message`];
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

async function findByParentId (pid) {
  ////// 
  //const result = await sql.query(`SELECT * FROM message WHERE parentid = $1`,[pid]);
  //// 
  let query = `SELECT tsk.*, TO_CHAR(tsk.createddate, 'DD Mon, YYYY') date,`;
  query += " concat(cu.firstname, ' ' , cu.lastname) createdbyname ";
  query += ` FROM ${this.schema}.message tsk `;
  query += `INNER JOIN ${this.schema}.user cu ON cu.Id = tsk.createdbyid `;
  try {
    const result = await sql.query(query + " WHERE tsk.parentid = $1 ORDER BY CREATEDDATE DESC",[pid]);
    //// 
    if(result.rows.length > 0)
      return result.rows;
  } catch (error) {
    //// 
  }
  

return null;
};

module.exports = {findById, updateById, deletePushNotification, markReadNotification, findAll, createPushNotification, create, deleteMessage, init, findByParentId, findAllOpen, findAllToday, findAllMeetings, findAllUnread};