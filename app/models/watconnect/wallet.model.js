/**
 * @author      Shivani Mehra
 * @date        June, 2024
 * @copyright   www.ibirdsservices.com
 */

const sql = require("../db");
const moment = require("moment");

let schema = '';
function init(schema_name) {
  this.schema = schema_name;
}


async function getWalletTransactions(tenantcode) {
  let response = { success: false, message: "Unknown error" };
  try {
    let query = `SELECT * FROM public.wallet_transactions`;
    const params = [];
    if (tenantcode) {
      query += ` WHERE tenantcode = $1`;
      params.push(tenantcode);
    }
    const result = await sql.query(query, params);
    response.success = result.rows.length > 0;
    response.data = result.rows;
    response.message = result.rows.length > 0 ? "Wallet transactions fetched successfully" : "No wallet transactions found";
  } catch (err) {
    console.error("Error fetching wallet transactions:", err);
    response.message = err.message || "Failed to fetch wallet transactions";
  }
  return response;
}

async function createWalletTransaction(reqBody) {
  let response = { success: false, message: "Unknown error" };
  try {
    await sql.query("BEGIN");

    const trxResult = await sql.query(
      `INSERT INTO public.wallet_transactions (amount, type, reason, status, tenantcode)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
      [
        reqBody.amount,
        reqBody.type,
        reqBody.reason || null,
        reqBody.status || null,
        reqBody.tenantcode
      ]
    );

    if (trxResult.rows.length === 0) {
      await sql.query("ROLLBACK");
      response.message = "Transaction insert failed";
      return response;
    }

    await sql.query("COMMIT");
    response = { success: true, data: trxResult.rows[0] };

  } catch (err) {
    await sql.query("ROLLBACK");
    console.error("Transaction error:", err);
    response.message = err.message || "Transaction failed";
  }

  return response;
}

async function getWalletBalance(tenantcode) {
  let response = { success: false, message: "Unknown error" };
  try {
    let query = `SELECT * FROM public.company_wallets`;
    const params = [];
    if (tenantcode) {
      query += ` WHERE tenantcode = $1`;
      params.push(tenantcode);
    }
    const result = await sql.query(query, params);
    response.success = result.rows.length > 0;
    response.data = result.rows[0] || null;
    response.message = result.rows.length > 0 ? "Wallet balance fetched successfully" : "No wallet balance found";
  } catch (err) {
    console.error("Error fetching wallet balance:", err);
    response.message = err.message || "Failed to fetch wallet balance";
  }
  return response;
}

async function hasSufficientBalance(tenantcode, amountToSpend) {
  let response = { success: false, message: "Unknown error", sufficient: false };

  try {
    const query = `SELECT available_credits FROM public.company_wallets WHERE tenantcode = $1`;
    const result = await sql.query(query, [tenantcode]);

    if (result.rows.length === 0) {
      response.message = "Please add money to your wallet to send messages";
      return response;
    }

    const available = parseFloat(result.rows[0].available_credits || 0);
    console.log("available", available, amountToSpend)
    if (available >= amountToSpend) {
      response.success = true;
      response.sufficient = true;
      response.message = "Sufficient balance";
    } else {
      response.success = true;
      response.sufficient = false;
      response.message = `Insufficient balance. Available: ₹${available}`;
    }
  } catch (err) {
    console.error("Error checking balance:", err);
    response.message = err.message || "Error checking wallet balance";
  }

  return response;
}


async function reconcileWhatsAppBilling() {
  try {
    const walletRes = await sql.query(`SELECT tenantcode, total_debited FROM public.company_wallets`);
    const companies = walletRes.rows;

    for (const company of companies) {
      const tenantcode = company.tenantcode;
      const prevDebited = parseFloat(company.total_debited || 0);
      const schema = tenantcode.replace(/[^a-zA-Z0-9_]/g, '');

      // Step 1: Get total cost from all billing summaries (e.g., current month)
      const { rows } = await sql.query(
        `SELECT COALESCE(SUM(total_cost), 0) AS total_cost
         FROM ${schema}.whatsapp_billing_daily_summary`
      );
      const metaTotalCost = parseFloat(rows[0].total_cost || 0);

      // Step 2: Compare and reconcile
      const difference = parseFloat((metaTotalCost - prevDebited).toFixed(2));

      if (difference === 0) {
        console.log(`✅ ${tenantcode}: Already balanced.`);
        continue;
      }

      const type = difference > 0 ? 'debit' : 'credit';

      const trxResult = await createWalletTransaction({
        amount: Math.abs(difference),
        type,
        reason: `Auto-reconciliation: ${type} ₹${Math.abs(difference)} to match Meta billing`,
        status: 'paid',
        tenantcode
      });

      if (trxResult.success) {
        await sql.query(
          `UPDATE public.company_wallets
           SET total_debited = $1, lastmodifieddate = NOW()
           WHERE tenantcode = $2`,
          [metaTotalCost, tenantcode]
        );

        console.log(`🔁 ${tenantcode}: ${type.toUpperCase()} ₹${Math.abs(difference)} | Updated total_debited → ₹${metaTotalCost}`);
      } else {
        console.warn(`❌ Failed to reconcile ${tenantcode}:`, trxResult.message);
      }
    }

  } catch (error) {
    console.error("❌ Wallet reconciliation error:", error);
  }
}

module.exports = {
  init,
  createWalletTransaction,
  getWalletTransactions,
  getWalletBalance,
  hasSufficientBalance,
  reconcileWhatsAppBilling
};