import mongoose, { Schema } from 'mongoose'

const SpeakerRefSchema = new Schema({ name: String, role: String }, { _id:false })

const AgendaItemSchema = new Schema({
  day: String, // e.g., "اليوم الأول"
  date: String,
  startTime: String,
  endTime: String,
  type: { type:String, enum:['opening','panel','lecture','workshop','break','other'], default:'lecture' },
  title: String,
  room: String,
  speakers: [SpeakerRefSchema]
}, { timestamps:true })

export default mongoose.models.AgendaItem || mongoose.model('AgendaItem', AgendaItemSchema)
