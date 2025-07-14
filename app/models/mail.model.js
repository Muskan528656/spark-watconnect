const nodemailer = require('nodemailer');
function sendEmail(to, subject, body, fromEmail) {
    let mailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_EMAIL_PWD
        },
        tls: {
            rejectUnauthorized: false
        }
    });
    let mailDetails = {
        from: fromEmail,
        to: to,
        subject: subject,
        text: body.replace(/(?:<|(?<=\p{EPres}))[^>\p{EPres}]+(?:>|(?=\p{EPres}))/gu, ""),
        html: body

    };

    mailTransporter.sendMail(mailDetails, function (err, data) {
        if (err) {
            console.log('Error Occurs', err);
        } else {
            console.log('Email sent successfully');
        }
    });
}


module.exports = { sendEmail };