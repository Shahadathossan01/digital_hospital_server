const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const prescriptionSchema = new Schema(
  {
    ref: {
      type: String,
      default: "",
    },
    problem: {
      type: String,
      default: "",
    },
    temperature: {
      type: String,
      default: "",
    },
    blood_presure: {
      type: String,
      default: "",
    },
    palse:{
      type:String,
      default:""
    },
    r_r: {
      type: String,
      default: "",
    },
    lungs: {
      type: String,
      default: "",
    },
    others:{
      type:String,
      default:""
    },
    comments: {
      type: String,
      default: "",
    },
    advice: {
      type: String,
      default: "",
    },
    followUp:{
      type:String,
      default:""
    },
    medicinInstructions: [
      {
        type: Schema.Types.ObjectId,
        ref: "MedicinInstruction",
      },
    ],
  },
  { timestamps: true }
);

prescriptionSchema.pre("save", function (next) {
    if (!this.ref) {
      this.ref = this._id.toString().slice(0, 5);
    }
    next();
  });


const Prescription = model("Prescription", prescriptionSchema);

module.exports = Prescription;
