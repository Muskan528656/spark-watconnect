/**
 * @author      shivam shrivastava
 * @date        May, 2025
 * @copyright   www.ibirdsservices.com
 */

const nodemailer = require("nodemailer");
const fs = require("fs");
const EmailTemplate = require("../../models/watconnect/emailTemplate.model");

async function sendEmail(
  to,            // 1. Email receiver (string)
  data,          // 2. Object with dynamic values like name, invoice_no etc.
  subject,       // 3. Subject (optional, overridden by template if used)
  templateName,  // 4. Email template name (optional, e.g. 'pending_invoice')
  attachment,    // 5. File path for PDF or other attachment
  body,          // 6. HTML body (optional, overridden by template if used)
  fromEmail = "contact@watconnect.com" // 7. Sender email (default)
) {

  console.log("bodyyy=>>>>>", body);
  console.log("subject=>>>>>", subject);
  console.log("data=>>>>>", data);
  try {
    let mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOSTT,
      port: process.env.SMTP_PORTT,
      secure: true,
      auth: {
        user: process.env.SMTP_EMAILL,
        pass: process.env.SMTP_EMAIL_PWDD,
      },
    });

    let tempSubject = subject;
    let tempBody = body;

    if (templateName) {
      const template = await EmailTemplate.findByName(templateName);
      console.log("Template name find->>", template);
      if (template) {
        tempSubject = template.subject;
        tempBody = template.body;

        // Replace template variables
        if (data) {
          Object.keys(data).forEach((key) => {
            const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
            const value = data[key] || "";
            tempSubject = tempSubject.replace(regex, value);
            tempBody = tempBody.replace(regex, value);
          });
        }
      }
    }


    let mailDetails = {
      from: fromEmail,
      to: to,
      bcc: "muskankhan83908@gmail.com",
      subject: tempSubject,
      text: tempBody ? tempBody.replace(/(?:<[^>]*>)/g, "") : '',
      html: tempBody,
    };
    console.log("mailDetails@@", mailDetails);
    if (attachment) {
      mailDetails.attachments = [
        {
          filename: "attachment.pdf",
          contentType: "application/pdf",
          content: fs.createReadStream(attachment),
        },
      ];
    }

    const res = await mailTransporter.sendMail(mailDetails);
    console.log("Rs=>>>>>>>>>", res);
    return "Email Sent Successfully";
  } catch (error) {
    console.log(error.message);
    return error.message;
  }
}

module.exports = { sendEmail };
