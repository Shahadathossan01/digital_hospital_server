const mongoose=require('mongoose')
const {Schema,model}=mongoose;

const doctorSchema=new Schema({
    firstName:String,
    lastName:String,
    avator:String,
    specialization:String,
    phone:Number,
    address:String,
    offlineChamber:String,
    designation:String
})

const DoctorProfile=model('DoctorProfile',doctorSchema)

module.exports=DoctorProfile;