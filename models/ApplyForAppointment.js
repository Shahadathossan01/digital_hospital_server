const mongoose=require('mongoose');
const Patient = require('./Patient');
const {Schema,model}=mongoose;

const applyForAppointmentSchema=new Schema({
    date:Date,
    time:String,
    doctorID:String,
    appointmentID:String,
    patientDetails:{
        fullName:String,
        dateOfBirth:Date,
        age:Number,
        gender:String,
        height:Number,
        weight:Number
    },
    status:{
        type:String,
        default:'Unpayed'
    }
})
const ApplyForAppointment=model('ApplyForAppointment',applyForAppointmentSchema)

module.exports=ApplyForAppointment