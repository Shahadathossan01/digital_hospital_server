const mongoose=require('mongoose');
const {Schema,model}=mongoose;

const appointmentSchema=new Schema({
    date:Date,
    time:String,
    googleMeetLink:String,
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
        default:'panding'
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
    },
    referenceHealhtHubID:{
        type: Schema.Types.ObjectId,
        ref:'HealthHub'
    },
    referredPayment: {
        type: Boolean,
        default: false
      },
    transactionId:String,
    totalFee:Number
},{ timestamps: true })
const Appointment=model('Appointment',appointmentSchema)

module.exports=Appointment