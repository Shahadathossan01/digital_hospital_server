const error = require("../utils/error");

const authorize=(roles=['admin'])=>(req,_res,next)=>{
    
    if(roles.includes(req.user.role)){
        return next()
    }

    throw error('Permission Denied',403)

}

module.exports=authorize;