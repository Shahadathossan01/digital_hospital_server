const mongoose=require('mongoose')
const {Schema,model}=mongoose;

const healthHubSchema= new Schema({
      _id:String,
      profile:{
        type: String,
      },
      nid:{
        type: String,
      },
      pharmacyName: {
        type: String,
      },
      phanmacyReg: {
        type: String,
      },
      country: {
        type: String,
      },
      division: {
        type: String,
      },
      district: {
        type: String,
      },
      upazila: {
        type: String,
      },
      category: {
        type: String,
      },
      description: {
        type: String,
      },
      pharmacyImage: {
        type: String,
      },
      payment: {
        service: {
          type: String,
          enum: ['bKash', 'Nagad', 'Rocket'],
        },
        number: {
          type: String,
        },
      },
      phone: {
        type: String,
      },
      status: {
        type: String,
        enum: ['pending', 'approved', 'disabled', 'suspended'],
        default: 'pending',
      },
      facilities: {
        type: String,
      },
      



},{timestamps:true})

const HealthHub=mongoose.model('HealthHub',healthHubSchema)

module.exports=HealthHub;