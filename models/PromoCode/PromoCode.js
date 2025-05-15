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
    }
})
const PromoCode=model("PromoCode",promoCodeSchema)

module.exports=PromoCode
