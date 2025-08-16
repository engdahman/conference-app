import mongoose, { Schema } from 'mongoose'

const AdminSchema = new Schema({
  username: { type:String, unique:true, required:true, trim:true },
  passwordHash: { type:String, required:true },
  role: { type:String, default:'admin' }
}, { timestamps:true })

export default mongoose.models.Admin || mongoose.model('Admin', AdminSchema)
