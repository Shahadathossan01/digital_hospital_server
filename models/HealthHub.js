const mongoose=require('mongoose')
const {Schema,model}=mongoose;

const healthHubSchema= new Schema({
      _id:String,
      nid:{
        type: String,
        required: true,
        unique: true,
      },
      pharmacyName: {
        type: String,
        required: true,
      },
      phanmacyReg: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
      },
      division: {
        type: String,
        required: true,
      },
      district: {
        type: String,
        required: true,
      },
      upazila: {
        type: String,
        required: true,
      },
      category: {
        type: String,
        enum: ['No Model', 'Model'],
        required: true,
      },
      description: {
        type: String,
      },
      image: {
        type: String,
        required: true
      },
      payment: {
        service: {
          type: String,
          enum: ['bKash', 'Nagad', 'Rocket'],
          required: true,
        },
        number: {
          type: String,
          required: true,
        },
      },
      phone: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'approved', 'disabled', 'suspended'],
        default: 'pending',
      },
      facilities: String



},{timestamps:true})

const HealthHub=mongoose.model('HealthHub',healthHubSchema)

module.exports=HealthHub;