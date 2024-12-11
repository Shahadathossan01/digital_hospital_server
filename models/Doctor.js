const mongoose=require('mongoose')
const {Schema,model}=mongoose;

const doctorSchema=new Schema({
    _id:String,
    profile:{
        firstName:String,
        lastName:String,
        avator:String,
        specialization:String,
        phone:Number,
        address:String,
        offlineChamber:String,
        designation:String
    },
    appointmentLimit:Number,
    applyForAppointments:[
        {
            type:Schema.Types.ObjectId,
            ref:'ApplyForAppointment'
        }
    ],
    appointments:[
        {
            type:Schema.Types.ObjectId,
            ref:'Appointment'
        }
    ],
})

const Doctor=model('Doctor',doctorSchema)

module.exports=Doctor