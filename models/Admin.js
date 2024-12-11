const mongoose=require('mongoose')
const {Schema,model}=mongoose;

const adminSchema=new Schema({
    _id:String,
    firstName:String,
    lastName:String,
    avator:String
})
const Admin=model('Admin',adminSchema)

module.exports=Admin;