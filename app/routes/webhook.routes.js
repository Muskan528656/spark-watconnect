const express = require("express");
const leadModal = require("../models/lead.model");
const VERIFY_TOKEN = 'MYTOKEN'; // Use a secure, random string
const { fetchUser } = require("../middleware/fetchuser.js");

const sendTextMessage = async (singleText) => {
    let response = await fetch(process.env.endPointURL, {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.whatsapptoken}`,
        },
        body: JSON.stringify(singleText),
    });
    return await response.json();
}


module.exports = (app) => {
    var router = express.Router();

    // Webhook verification endpoint
    router.get('/webhook', fetchUser, (req, res) => {
        try {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];
             

            if (mode && token) {
                if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                     
                    res.type('text/plain').send(challenge);
                } else {
                    console.error('Verification failed: mode or token incorrect', { mode, token });
                    return res.sendStatus(403); // Forbidden
                }
            } else {
                console.error('Verification failed: Missing mode or token', { mode, token });
                return res.sendStatus(400); // Bad Request
            }
        } catch (error) {
            console.error('Error verifying webhook:', error);
            res.sendStatus(500); // Internal Server Error
        }
    });


    // Handle webhook received messages
    router.post('/webhook', fetchUser, async (req, res) => {
        const body = req.body;
        if (body.object) {
            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
                const message = body.entry[0].changes[0].value.messages[0];
                const name = body.entry[0]?.changes[0].value?.contacts[0]?.profile?.name

                var firstName = '';
                var lastName = '';
                if (name?.includes(' ')) {
                    firstName = name.split(" ").slice(0, -1).join(" ");
                    lastName = name.split(" ").slice(-1).join(" ");
                } else {
                    firstName = name;
                }


                let revNo = message.from?.split("").reverse().join("");
                message.from = revNo.slice(0, 10).split("").reverse().join("");

                if (message && message.from && message.type == 'text') {
                    let record = {
                        firstname: firstName,
                        lastname: lastName,
                        ownerid: req.userinfo.id,
                        company: null,
                        leadsource: 'Whatsapp',
                        leadstatus: 'Open - Not Contacted',
                        rating: null,
                        salutation: null, phone: message.from,
                        email: null,
                        fax: null,
                        industry: null,
                        title: null,
                        street: null,
                        city: null,
                        state: null,
                        country: null,
                        zipcode: null,
                        description: message?.text?.body,
                        createdbyid: null,
                        lastmodifiedbyid: null,
                        lostreason: null,
                        amount: null,
                        paymentmodel: null,
                        paymentterms: null,
                        iswon: null,
                    }

                    leadModal.init(req.userinfo.tenantcode);

                    let previousRecord = await leadModal.findByNumber(message.from);

                    if (previousRecord?.id) {
                        if (previousRecord.firstname == null || previousRecord.firstname == '') {
                            let messages = message?.text?.body;
                            if (messages.indexOf(" ") > 0) {
                                messages = messages.slice(0, messages.indexOf(" ") + 1);
                                record.firstname = messages
                            } else {
                                record.firstname = messages
                            }
                            let result = await leadModal.updateById(previousRecord.id, record, req.userinfo.id)
                            if (result?.id) {
                                res.status(200).json({ success: false, event: "Success" }); // Return the full response    
                            }
                        } else {
                            res.status(200).json({ success: false, event: "Record already exist." }); // Return the full response
                        }
                    } else {
                        let result = await leadModal.create(record, req.userinfo.id);
                        if (result?.firstname == null || result?.firstname == '') {
                            const singleText = {
                                "messaging_product": "whatsapp",
                                "recipient_type": "individual",
                                "to": "91" + result?.phone,
                                "type": "text",
                                "text": {
                                    "preview_url": false,
                                    "body": "Please provide your name"
                                }
                            }
                            let response = await sendTextMessage(singleText);
                            res.status(200).json({ success: true, event: "Sent" })
                        } else {
                            res.status(200).json({ success: true, event: "success" });
                        }
                    }
                }
            }
        }
        else {
            return res.sendStatus(404); // Not Found
        }
    });

    app.use(process.env.BASE_API_URL + '/api/whatsapp', router);
};