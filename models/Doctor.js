const mongoose=require('mongoose')
const {Schema,model}=mongoose;

const slotSchema = new Schema({
    status: { type: String, enum: ['available', 'booked', 'unavailable'], default: 'available' },
    time: { type: String, required: true },
  });
  
  const dayScheduleSchema = new Schema({
    date: { type: Date, required: true },
    status:{type:String, enum:['available','busy']},
    slots: [slotSchema], 
  });


const doctorSchema=new Schema({
    _id:String,
    firstName:String,
    lastName:String,
    dateOfBirth:String,
    mobile:Number,
    nidOrPassport:Number,
    nationality:String,
    gender:String,
    fee:Number,
    organization:String,
    biography:String,
    address:String,
    title:String,
    bmdcNumber:String,
    bmdcExpiryDate:String,
    degrees:String,
    speciality:String,
    yearOfExperience:Number,
    document:String,
    profile:String,
    designation:String,
    isValid:{
        type:Boolean,
        default:false
    },
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
    schedule: [dayScheduleSchema],
},{ timestamps: true })

const Doctor=model('Doctor',doctorSchema)

module.exports=Doctor