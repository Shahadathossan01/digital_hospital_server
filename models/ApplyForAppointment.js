const mongoose=require('mongoose');
const Patient = require('./Patient');
const {Schema,model}=mongoose;

const applyForAppointmentSchema=new Schema({
    date:Date,
    time:String,
    patientName:String,
    doctorID:String,
    appointmentID:String,
    status:{
        type:String,
        default:'Unpayed'
    }
})
const ApplyForAppointment=model('ApplyForAppointment',applyForAppointmentSchema)

module.exports=ApplyForAppointment