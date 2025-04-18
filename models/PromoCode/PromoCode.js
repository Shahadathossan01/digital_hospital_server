const mongoose=require("mongoose")
const {Schema,model}=mongoose

const promoCodeSchema=new Schema({
    creatorId:{
        type:Schema.Types.ObjectId,
        ref:'User'
    },
    code:{
        type:String,
        require:true,
        unique:true
    },
    percentage:{
        type:Number,
        require:true
    },
    expiryDate:{
        type:Date,
    },
    usageLimit:{
        type:Number,
        default:1
    },
    users: [
        {
            type: Schema.Types.ObjectId,
            ref: "User" // Assuming your user model is named "User"
        }
    ]
})
const PromoCode=model("PromoCode",promoCodeSchema)

module.exports=PromoCode
