const mongoose=require('mongoose')
const {Schema,model}=mongoose;

const doctorSchema=new Schema({
    _id:String,
    profile:{
        firstName:String,
        lastName:String,
        specialization:String,
        phone:Number,
        address:String,
        offlineChamber:String,
        designation:String,
        email:String
    },
    appointmentLimit:Number,
    fee:Number,
    image:String,
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