const jwt = require('jsonwebtoken');
const Auth = require("../models/auth.model.js");

// const fetchUser = async (req, res, next) => {

//     const token = req.headers.authorization;
//     //  
//     if (!token) {
//         return res.status(401).send({ errors: "Please authenticate" })
//     }
//     try {
//         const user = jwt.verify(token, process.env.JWT_SECRET);

//         //// 
//         console.log("user->>>",user);
//         if (user) {
//             const userRec = await Auth.findById(user.id);
//             console.log("userRec", userRec);
//             if (!userRec) {
//                 return res.status(400).json({ errors: "Invalid User" });
//             }
//             req["userinfo"] = user;
//             next();
//         } else {
//             return res.status(400).json({ errors: "Invalid User" });
//         }

//     } catch (error) {
//         return res.status(401).send({ errors: "Please authenticate" })
//     }



// }


const fetchUser = async (req, res, next) => {

    // const token = req.headers.authorization;
    var token = req.headers.authorization;
    // console.log(token);
    // console.log(req.headers)

    if (!token) {
        return res.status(401).send({ errors: "Please authenticate" })
    }


    try {
        token = token.includes('Bearer ') ? token.replace("Bearer ", "") : token;
        const user = jwt.verify(token, process.env.JWT_SECRET);
        if (user) {
            Auth.init(user.tenantcode);
            const userRec = await Auth.findById(user.id);
            console.log('');
            if (!userRec) {
                return res.status(400).json({ errors: "Invalid User" });
            }
            req["userinfo"] = user;
            // console.log("req, res", req.originalUrl ,req.baseUrl,  req.body);
            // Message limit check for Free plan



            next();
        } else {
            return res.status(400).json({ errors: "Invalid User" });
        }

    } catch (error) {
        return res.status(401).send({ errors: "Please authenticate" })
    }

}
const checkModuleAccess = (moduleName) => {
    return (req, res, next) => {
        // const formattedModuleName = moduleName.replace(/_/g, ' ').toLowerCase();

        // // Defensive check
        // const userModules = Array.isArray(req.userinfo?.modules)
        //     ? req.userinfo.modules.map(m => m.url.toLowerCase())
        //     : [];

        // if (!userModules.includes(moduleName.toLowerCase())) {
        //     return res.status(200).json({
        //         success: false,
        //         message: `Access to '${formattedModuleName}' module is not included in your plan.`,
        //     });
        // }

        next();
    };

};
module.exports = { fetchUser, checkModuleAccess }