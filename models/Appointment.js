const mongoose=require('mongoose')
const {Schema,model}=mongoose;

const appointmentSchema=new Schema({
    date:Date,
    time:String,
    googleMeetLink:String,
    status:{
        type:String,
        default:'Panding'
    },
    patient:{
        type:Schema.Types.ObjectId,
        ref:'Patient'
    },
    doctor:{
        type:Schema.Types.ObjectId,
        ref:'Doctor'
    },
    testRecommendation:[
        {
            type:Schema.Types.ObjectId,
            ref:'TestRecommendation'
        }
    ],
    prescription:{
        type:Schema.Types.ObjectId,
        ref:'Prescription'
    }
})
const Appointment=model('Appointment',appointmentSchema)

module.exports=Appointment