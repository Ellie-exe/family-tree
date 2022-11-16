import mongoose from 'mongoose';
const { Schema } = mongoose;

const treeSchema = new Schema({
    name: String,
    numMembers: Number,
    generation: [[{ type: Schema.Types.ObjectId, ref: 'members' }]],
    users: { type: Map, of: Boolean }
});

export default mongoose.model('trees', treeSchema);
