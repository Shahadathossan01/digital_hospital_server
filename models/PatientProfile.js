const mongoose=require('mongoose')
const {Schema,model}=mongoose;

const patientSchema=new Schema({
    firstName:String,
    lastName:String,
    avator:String,
    phone:Number,
    address:String,
    dateOfBirth:String,
    gender:String,
    blood:String,
    age:Number,
    height:Number,
    Weight:Number
})

const PatientProfile=model('PatientProfile',patientSchema)

module.exports=PatientProfile;