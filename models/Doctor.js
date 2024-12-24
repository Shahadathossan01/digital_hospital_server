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
    profile:{
        firstName:String,
        lastName:String,
        phone:Number,
        address:String,
        offlineChamber:String,
        designation:String,
        email:String
    },
    fee:Number,
    image:String,
    category:String,
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
})

const Doctor=model('Doctor',doctorSchema)

module.exports=Doctor