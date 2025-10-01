import mongoose, {Document, Schema} from 'mongoose';

// shape of user document
export interface IUser extends Document {
    email: string;
    password: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

// creating schema

const UserSchema = new Schema<IUser>(
    {
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: (email: string) => {
                // email verification
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            message: 'Please provide a valid email'

    }
},
password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
},
name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
}
},
{
    timestamps: true
}
);


// creating and exporting model
export default mongoose.model<IUser>('User', UserSchema);
