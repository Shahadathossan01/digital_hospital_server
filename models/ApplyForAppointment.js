const mongoose=require('mongoose');
const Patient = require('./Patient');
const {Schema,model}=mongoose;

const applyForAppointmentSchema=new Schema({
    date:Date,
    patientName:String,
    doctorID:String,
    status:{
        type:String,
        default:'Unpayed'
    }
})
const ApplyForAppointment=model('ApplyForAppointment',applyForAppointmentSchema)

module.exports=ApplyForAppointment