const sql = require("./db.js");


async function create(userid, udid){
 
  const result = await sql.query(`INSERT INTO public.device (userid, udid)  VALUES ($1, $2) RETURNING *`, 
  [userid, udid]);
  if(result.rows.length > 0){
    return true;
  }

  return null;
     
    
  
};

async function findById (userid) {
    const result = await sql.query(`SELECT * FROM public.device WHERE userid = $1`,[userid]);
    //// 
    if(result.rows.length > 0)
      return result.rows[0];
  
  return null;
};

/*async function findAll(title){
  let query = `SELECT *, concat(ow.firstname, ' ' , ow.lastname) ownername FROM ${this.schema}.task`;
      query += " INNER JOIN public.user ow ON ow.id = ownerid ";

  if (title) {
    query += ` WHERE title LIKE '%${title}%'`;
  }

  query += " ORDER BY createddate DESC ";

  const result = await sql.query(query);
  //// 
  return result.rows;    
};*/

/*async function findAllToday(){
  let query = `SELECT *, concat(ow.firstname, ' ' , ow.lastname) ownername FROM ${this.schema}.task`;
      query += " INNER JOIN public.user ow ON ow.id = ownerid ";

  //if (title) {
    query += ` WHERE createddate::date = now()::date`;
 // }

  query += " ORDER BY createddate DESC ";

  const result = await sql.query(query);
  //// 
  return result.rows;    
};

async function findAllOpen(userinfo){
  let query = `SELECT t.*, concat(ow.firstname, ' ' , ow.lastname) ownername FROM ${this.schema}.task t `;
      query += " INNER JOIN public.user ow ON ow.id = ownerid ";

 
    query += ` WHERE status in ('Not Started', 'In Progress' , 'Waiting') `;

    if(userinfo.userrole === 'USER' || userinfo.userrole === 'ADMIN'){
      query += ` AND ownerid = $1 `;
      query += " ORDER BY createddate DESC ";
      const result = await sql.query(query, [userinfo.id]);
      //// 
      return result.rows; 
    }else{
      query += " ORDER BY createddate DESC ";
      const result = await sql.query(query);
      //// 
      return result.rows; 
    }
      
};*/





async function deleteRec(userid){
  const result = await sql.query(`DELETE FROM public.task WHERE userid = $1`, [userid]);
  
  if(result.rowCount > 0)
    return "Success"
  return null;
};






module.exports = {findById, create, deleteRec};