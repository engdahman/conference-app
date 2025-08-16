import mongoose, { Schema } from 'mongoose'

const UserSchema = new Schema({
  username: { type:String, unique:true, required:true },
  passwordHash: { type:String, required:true },
  role: { type:String, enum:['admin','staff'], default:'staff' }
}, { timestamps:true })

export default mongoose.models.User || mongoose.model('User', UserSchema)
